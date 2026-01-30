import * as cheerio from "cheerio";
import Parser from "rss-parser";
import prisma from "./db";
import { loadSourcesConfig, SourceConfig, loadCompetitorsConfig } from "./config";
import { computeChecksum, stripHtml, normalizeUrl, sleep } from "./utils";
import { analyzeCluster, AnalysisResult } from "./ai";
import { TrustTier, SourceType, JobStatus, Priority, VerificationStatus } from "@prisma/client";

const parser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent": "CompetitorRadar/1.0 (compatible)",
  },
});

interface FetchResult {
  url: string;
  title: string;
  content: string;
  publishedAt?: Date;
}

// Rate limiting
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 2000;

async function respectRateLimit(domain: string): Promise<void> {
  const lastFetch = rateLimitMap.get(domain);
  if (lastFetch) {
    const elapsed = Date.now() - lastFetch;
    if (elapsed < RATE_LIMIT_MS) {
      await sleep(RATE_LIMIT_MS - elapsed);
    }
  }
  rateLimitMap.set(domain, Date.now());
}

async function fetchRssFeed(url: string): Promise<FetchResult[]> {
  try {
    const domain = new URL(url).hostname;
    await respectRateLimit(domain);

    const feed = await parser.parseURL(url);
    return feed.items.map((item) => ({
      url: item.link || url,
      title: item.title || "Untitled",
      content: stripHtml(item.content || item.contentSnippet || item.title || ""),
      publishedAt: item.pubDate ? new Date(item.pubDate) : undefined,
    }));
  } catch (error) {
    console.error(`Failed to fetch RSS feed ${url}:`, error);
    return [];
  }
}

async function fetchWebPage(url: string): Promise<FetchResult | null> {
  try {
    const domain = new URL(url).hostname;
    await respectRateLimit(domain);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "CompetitorRadar/1.0 (compatible)",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${url}: ${response.status}`);
      return null;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove unwanted elements
    $("script, style, nav, header, footer, aside, .ads, .sidebar").remove();

    // Extract title
    const title =
      $('meta[property="og:title"]').attr("content") ||
      $("title").text() ||
      $("h1").first().text() ||
      "Untitled";

    // Extract main content
    const contentSelectors = [
      "article",
      ".post-content",
      ".entry-content",
      ".article-content",
      ".blog-content",
      "main",
      ".content",
    ];

    let content = "";
    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length) {
        content = stripHtml(element.html() || "");
        if (content.length > 100) break;
      }
    }

    // Fallback to body if no content found
    if (content.length < 100) {
      content = stripHtml($("body").html() || "");
    }

    // Extract published date
    const dateSelectors = [
      'meta[property="article:published_time"]',
      'meta[name="date"]',
      'time[datetime]',
      ".published-date",
      ".post-date",
    ];

    let publishedAt: Date | undefined;
    for (const selector of dateSelectors) {
      const element = $(selector);
      const dateStr = element.attr("content") || element.attr("datetime") || element.text();
      if (dateStr) {
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
          publishedAt = parsed;
          break;
        }
      }
    }

    return {
      url,
      title: title.trim(),
      content: content.substring(0, 50000), // Limit content size
      publishedAt,
    };
  } catch (error) {
    console.error(`Failed to fetch web page ${url}:`, error);
    return null;
  }
}

export async function createJobLog(jobName: string): Promise<string> {
  const log = await prisma.jobRunLog.create({
    data: {
      jobName,
      status: "RUNNING",
    },
  });
  return log.id;
}

export async function updateJobLog(
  id: string,
  status: JobStatus,
  itemsProcessed: number,
  errorMessage?: string
): Promise<void> {
  await prisma.jobRunLog.update({
    where: { id },
    data: {
      status,
      finishedAt: new Date(),
      itemsProcessed,
      errorMessage,
    },
  });
}

// Job 1: Fetch sources
export async function fetchSourcesJob(): Promise<{
  itemsFetched: number;
  errors: string[];
}> {
  const sources = loadSourcesConfig();
  let itemsFetched = 0;
  const errors: string[] = [];

  // Ensure sources exist in DB
  for (const sourceConfig of sources) {
    await prisma.source.upsert({
      where: {
        id: sourceConfig.name.toLowerCase().replace(/\s+/g, "-"),
      },
      create: {
        id: sourceConfig.name.toLowerCase().replace(/\s+/g, "-"),
        name: sourceConfig.name,
        baseUrl: sourceConfig.base_url,
        sourceType: sourceConfig.source_type as SourceType,
        trustTier: sourceConfig.trust_tier as TrustTier,
      },
      update: {
        baseUrl: sourceConfig.base_url,
        sourceType: sourceConfig.source_type as SourceType,
        trustTier: sourceConfig.trust_tier as TrustTier,
      },
    });
  }

  // Fetch from each source
  for (const sourceConfig of sources) {
    try {
      const sourceId = sourceConfig.name.toLowerCase().replace(/\s+/g, "-");
      let results: FetchResult[] = [];

      // Try RSS first for blogs
      if (sourceConfig.source_type === "official" || sourceConfig.source_type === "industry") {
        const rssUrls = [
          `${sourceConfig.base_url}/feed`,
          `${sourceConfig.base_url}/rss`,
          `${sourceConfig.base_url}/feed.xml`,
          `${sourceConfig.base_url}/rss.xml`,
        ];

        for (const rssUrl of rssUrls) {
          results = await fetchRssFeed(rssUrl);
          if (results.length > 0) break;
        }
      }

      // Fallback to web scraping
      if (results.length === 0) {
        const page = await fetchWebPage(sourceConfig.base_url);
        if (page) {
          results = [page];
        }
      }

      // Store results
      for (const result of results) {
        const normalizedUrl = normalizeUrl(result.url);
        const existing = await prisma.rawItem.findFirst({
          where: { url: result.url },
        });

        if (!existing) {
          await prisma.rawItem.create({
            data: {
              url: result.url,
              title: result.title,
              rawText: result.content,
              publishedAt: result.publishedAt,
              sourceId,
              checksum: computeChecksum(result.content),
            },
          });
          itemsFetched++;
        }
      }
    } catch (error) {
      const errorMsg = `Error fetching ${sourceConfig.name}: ${error}`;
      errors.push(errorMsg);
      console.error(errorMsg);
    }
  }

  return { itemsFetched, errors };
}

// Job 2: Normalize items (already done during fetch, but can re-process)
export async function normalizeJob(): Promise<{ itemsProcessed: number }> {
  const items = await prisma.rawItem.findMany({
    where: {
      checksum: null,
    },
    take: 100,
  });

  for (const item of items) {
    if (item.rawText) {
      const normalizedText = stripHtml(item.rawText);
      await prisma.rawItem.update({
        where: { id: item.id },
        data: {
          rawText: normalizedText,
          checksum: computeChecksum(normalizedText),
        },
      });
    }
  }

  return { itemsProcessed: items.length };
}

// Job 3: Dedupe and cluster
export async function dedupeAndClusterJob(): Promise<{
  clustersCreated: number;
  itemsLinked: number;
}> {
  const unprocessedItems = await prisma.rawItem.findMany({
    where: {
      processed: false,
      rawText: { not: null },
    },
    include: {
      source: true,
    },
    take: 100,
  });

  let clustersCreated = 0;
  let itemsLinked = 0;
  const competitors = loadCompetitorsConfig();

  // Group items by detected competitor
  const competitorGroups = new Map<string, typeof unprocessedItems>();

  for (const item of unprocessedItems) {
    const text = `${item.title || ""} ${item.rawText || ""}`.toLowerCase();
    let competitorKey = "unknown";

    for (const comp of competitors) {
      if (
        text.includes(comp.name.toLowerCase()) ||
        comp.keywords.some((k) => text.includes(k.toLowerCase()))
      ) {
        competitorKey = comp.name;
        break;
      }
    }

    if (!competitorGroups.has(competitorKey)) {
      competitorGroups.set(competitorKey, []);
    }
    competitorGroups.get(competitorKey)!.push(item);
  }

  // Create clusters for each competitor group
  for (const [competitorName, items] of competitorGroups) {
    if (items.length === 0) continue;

    // Find or create cluster
    const canonicalTitle =
      items[0].title || `${competitorName} Updates - ${new Date().toISOString().split("T")[0]}`;

    // Check for existing recent cluster for same competitor
    const existingCluster = await prisma.storyCluster.findFirst({
      where: {
        canonicalTitle: {
          contains: competitorName,
        },
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Within 24 hours
        },
      },
    });

    let clusterId: string;

    if (existingCluster) {
      clusterId = existingCluster.id;
      await prisma.storyCluster.update({
        where: { id: clusterId },
        data: { updatedAt: new Date() },
      });
    } else {
      const newCluster = await prisma.storyCluster.create({
        data: {
          canonicalTitle,
        },
      });
      clusterId = newCluster.id;
      clustersCreated++;
    }

    // Link items to cluster
    for (const item of items) {
      // Check if link already exists
      const existingLink = await prisma.storyItemLink.findFirst({
        where: {
          clusterId,
          rawItemId: item.id,
        },
      });

      if (!existingLink) {
        await prisma.storyItemLink.create({
          data: {
            clusterId,
            rawItemId: item.id,
          },
        });
        itemsLinked++;
      }

      // Mark item as processed
      await prisma.rawItem.update({
        where: { id: item.id },
        data: { processed: true },
      });
    }
  }

  return { clustersCreated, itemsLinked };
}

// Job 4: Summarize and analyze
export async function summarizeAndAnalyzeJob(): Promise<{
  summariesCreated: number;
}> {
  // Find clusters without summaries
  const clustersWithoutSummaries = await prisma.storyCluster.findMany({
    where: {
      summaries: {
        none: {},
      },
    },
    include: {
      storyLinks: {
        include: {
          rawItem: {
            include: {
              source: true,
            },
          },
        },
      },
    },
    take: 50,
  });

  let summariesCreated = 0;

  for (const cluster of clustersWithoutSummaries) {
    const items = cluster.storyLinks.map((link) => ({
      id: link.rawItem.id,
      url: link.rawItem.url,
      title: link.rawItem.title,
      rawText: link.rawItem.rawText,
      source: {
        trustTier: link.rawItem.source.trustTier,
        name: link.rawItem.source.name,
      },
    }));

    if (items.length === 0) continue;

    // Analyze cluster
    const analysis = await analyzeCluster(items);

    // Find competitor and vertical IDs
    let competitorId: string | null = null;
    let verticalId: string | null = null;

    if (analysis.competitorName) {
      const competitor = await prisma.competitor.findFirst({
        where: { name: analysis.competitorName },
      });
      competitorId = competitor?.id || null;
    }

    if (analysis.verticals.length > 0) {
      const vertical = await prisma.vertical.findFirst({
        where: { name: analysis.verticals[0] },
      });
      verticalId = vertical?.id || null;
    }

    // Create summary
    await prisma.storySummary.create({
      data: {
        clusterId: cluster.id,
        competitorId,
        verticalId,
        aiCapabilities: analysis.aiCapabilities,
        summary: analysis.summary,
        keyPoints: analysis.keyPoints,
        whyItMatters: analysis.whyItMatters,
        recommendedActions: analysis.recommendedActions,
        priority: analysis.priority as Priority,
        confidenceScore: analysis.confidenceScore,
        verificationStatus: analysis.verificationStatus as VerificationStatus,
        citations: analysis.citations,
      },
    });

    summariesCreated++;
  }

  return { summariesCreated };
}

// Job 5: Process alerts
export async function alertsJob(): Promise<{ alertsSent: number }> {
  // Get recent high-priority summaries not yet notified
  const recentSummaries = await prisma.storySummary.findMany({
    where: {
      priority: { in: ["P0", "P1"] },
      createdAt: {
        gte: new Date(Date.now() - 6 * 60 * 60 * 1000), // Last 6 hours
      },
    },
    include: {
      cluster: true,
      competitor: true,
      vertical: true,
    },
  });

  // Get active alerts
  const alerts = await prisma.userAlert.findMany({
    where: { isActive: true },
    include: {
      verticals: true,
      competitors: true,
    },
  });

  let alertsSent = 0;

  for (const summary of recentSummaries) {
    for (const alert of alerts) {
      // Check if alert matches summary
      const matchesVertical =
        alert.verticals.length === 0 ||
        alert.verticals.some((v) => v.verticalId === summary.verticalId);

      const matchesCompetitor =
        alert.competitors.length === 0 ||
        alert.competitors.some((c) => c.competitorId === summary.competitorId);

      const matchesPriority =
        summary.priority === "P0" ||
        (summary.priority === "P1" && alert.minPriority !== "P0");

      const matchesCapability =
        alert.aiCapabilities.length === 0 ||
        summary.aiCapabilities.some((c) => alert.aiCapabilities.includes(c));

      if (matchesVertical && matchesCompetitor && matchesPriority && matchesCapability) {
        // Check if notification already exists
        const existingNotification = await prisma.notification.findFirst({
          where: {
            userId: alert.userId,
            storyId: summary.id,
          },
        });

        if (!existingNotification) {
          await prisma.notification.create({
            data: {
              userId: alert.userId,
              title: `${summary.priority}: ${summary.competitor?.name || "Competitor"} Update`,
              message: summary.summary.substring(0, 200),
              storyId: summary.id,
            },
          });
          alertsSent++;
        }
      }
    }
  }

  return { alertsSent };
}

// Run all jobs in sequence
export async function runAllJobs(): Promise<void> {
  const jobLogId = await createJobLog("full_pipeline");

  try {
    console.log("Starting fetch_sources_job...");
    const fetchResult = await fetchSourcesJob();
    console.log(`Fetched ${fetchResult.itemsFetched} items`);

    console.log("Starting normalize_job...");
    const normalizeResult = await normalizeJob();
    console.log(`Normalized ${normalizeResult.itemsProcessed} items`);

    console.log("Starting dedupe_and_cluster_job...");
    const clusterResult = await dedupeAndClusterJob();
    console.log(`Created ${clusterResult.clustersCreated} clusters, linked ${clusterResult.itemsLinked} items`);

    console.log("Starting summarize_and_analyze_job...");
    const summaryResult = await summarizeAndAnalyzeJob();
    console.log(`Created ${summaryResult.summariesCreated} summaries`);

    console.log("Starting alerts_job...");
    const alertsResult = await alertsJob();
    console.log(`Sent ${alertsResult.alertsSent} alerts`);

    const totalProcessed =
      fetchResult.itemsFetched +
      normalizeResult.itemsProcessed +
      clusterResult.itemsLinked +
      summaryResult.summariesCreated +
      alertsResult.alertsSent;

    await updateJobLog(jobLogId, "COMPLETED", totalProcessed);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    await updateJobLog(jobLogId, "FAILED", 0, errorMsg);
    throw error;
  }
}
