import Link from "next/link";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  timeAgo,
  getPriorityColor,
  getPriorityLabel,
  getVerificationColor,
  formatAICapability,
} from "@/lib/utils";
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Building2,
  FileText,
  Filter,
} from "lucide-react";

interface StoriesPageProps {
  searchParams: Promise<{ priority?: string; recent?: string }>;
}

async function getStories(priority?: string, recent?: string) {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const where: {
    priority?: { in: string[] };
    createdAt?: { gte: Date };
  } = {};

  if (priority === "P0") {
    where.priority = { in: ["P0"] };
  } else if (priority === "P1") {
    where.priority = { in: ["P1"] };
  } else if (priority === "P0,P1" || priority === "high") {
    where.priority = { in: ["P0", "P1"] };
  }

  if (recent === "24h") {
    where.createdAt = { gte: twentyFourHoursAgo };
  }

  const stories = await prisma.storySummary.findMany({
    where,
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    include: {
      cluster: true,
      competitor: true,
      vertical: true,
    },
    take: 100,
  });

  return stories;
}

function getPageTitle(priority?: string, recent?: string) {
  if (recent === "24h") {
    return "New Stories (Last 24h)";
  }
  if (priority === "P0") {
    return "Critical Stories (P0)";
  }
  if (priority === "P1") {
    return "Important Stories (P1)";
  }
  if (priority === "P0,P1" || priority === "high") {
    return "High Priority Stories";
  }
  return "All Stories";
}

function getPageDescription(priority?: string, recent?: string) {
  if (recent === "24h") {
    return "Stories discovered in the last 24 hours";
  }
  if (priority === "P0") {
    return "Critical intelligence requiring immediate attention";
  }
  if (priority === "P1") {
    return "Important updates to review this week";
  }
  if (priority === "P0,P1" || priority === "high") {
    return "High priority items requiring attention";
  }
  return "All competitive intelligence stories";
}

export default async function StoriesPage({ searchParams }: StoriesPageProps) {
  const { priority, recent } = await searchParams;
  const stories = await getStories(priority, recent);

  const title = getPageTitle(priority, recent);
  const description = getPageDescription(priority, recent);

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link href="/dashboard">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <Badge variant="secondary" className="text-lg px-3 py-1">
          {stories.length} {stories.length === 1 ? "story" : "stories"}
        </Badge>
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap gap-2">
        <Link href="/stories">
          <Badge
            variant={!priority && !recent ? "default" : "outline"}
            className="cursor-pointer"
          >
            All
          </Badge>
        </Link>
        <Link href="/stories?recent=24h">
          <Badge
            variant={recent === "24h" ? "default" : "outline"}
            className="cursor-pointer"
          >
            Last 24h
          </Badge>
        </Link>
        <Link href="/stories?priority=P0">
          <Badge
            variant={priority === "P0" ? "default" : "outline"}
            className="cursor-pointer bg-red-100 text-red-700 border-red-200 hover:bg-red-200"
          >
            Critical (P0)
          </Badge>
        </Link>
        <Link href="/stories?priority=P1">
          <Badge
            variant={priority === "P1" ? "default" : "outline"}
            className="cursor-pointer bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200"
          >
            Important (P1)
          </Badge>
        </Link>
      </div>

      {/* Stories List */}
      {stories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No stories found</h3>
            <p className="text-sm text-muted-foreground">
              {recent === "24h"
                ? "No new stories in the last 24 hours."
                : "No stories match the current filter."}
            </p>
            <Link href="/stories" className="mt-4">
              <Button variant="outline">View All Stories</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {stories.map((story) => (
            <Link key={story.id} href={`/stories/${story.id}`} className="block group">
              <Card className="hover:border-foreground/20 transition-colors cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      {/* Header */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={getPriorityColor(story.priority)}>
                          {getPriorityLabel(story.priority)}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={getVerificationColor(story.verificationStatus)}
                        >
                          {story.verificationStatus === "VERIFIED" ? (
                            <CheckCircle className="mr-1 h-3 w-3" />
                          ) : (
                            <AlertCircle className="mr-1 h-3 w-3" />
                          )}
                          {story.verificationStatus === "VERIFIED"
                            ? "Verified"
                            : "Claim Unverified"}
                        </Badge>
                        {story.competitor && (
                          <Badge variant="secondary">{story.competitor.name}</Badge>
                        )}
                        {story.vertical && (
                          <Badge variant="outline">{story.vertical.name}</Badge>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                        {story.cluster.canonicalTitle}
                      </h3>

                      {/* Summary */}
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {story.summary}
                      </p>

                      {/* AI Capabilities */}
                      {story.aiCapabilities.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {story.aiCapabilities.slice(0, 4).map((cap) => (
                            <Badge
                              key={cap}
                              variant="outline"
                              className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                            >
                              {formatAICapability(cap)}
                            </Badge>
                          ))}
                          {story.aiCapabilities.length > 4 && (
                            <Badge variant="outline" className="text-xs">
                              +{story.aiCapabilities.length - 4} more
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Why it matters */}
                      {story.whyItMatters && (
                        <div className="text-sm bg-muted/50 rounded-md p-3">
                          <span className="font-medium">Why it matters: </span>
                          {story.whyItMatters}
                        </div>
                      )}
                    </div>

                    {/* Right side */}
                    <div className="flex flex-col items-end gap-2 text-sm text-muted-foreground">
                      <span>{timeAgo(story.createdAt)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
