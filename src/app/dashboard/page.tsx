import { Suspense } from "react";
import prisma from "@/lib/db";
import { DashboardContent } from "./dashboard-content";

export const dynamic = "force-dynamic";

async function getDashboardData() {
  const [verticals, recentStories, stats] = await Promise.all([
    // Get verticals
    prisma.vertical.findMany({
      orderBy: { name: "asc" },
    }),

    // Get recent stories with summaries
    prisma.storySummary.findMany({
      take: 50,
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
      include: {
        cluster: true,
        competitor: true,
        vertical: true,
      },
    }),

    // Get stats
    Promise.all([
      // New stories in last 24h
      prisma.storySummary.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
      // P0 count
      prisma.storySummary.count({
        where: {
          priority: "P0",
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      // P1 count
      prisma.storySummary.count({
        where: {
          priority: "P1",
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      // Most active competitors
      prisma.storySummary.groupBy({
        by: ["competitorId"],
        _count: true,
        where: {
          competitorId: { not: null },
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { _count: { competitorId: "desc" } },
        take: 5,
      }),
    ]),
  ]);

  // Get competitor names for the most active
  const activeCompetitorIds = stats[3]
    .filter((s) => s.competitorId)
    .map((s) => s.competitorId as string);

  const activeCompetitors = await prisma.competitor.findMany({
    where: { id: { in: activeCompetitorIds } },
  });

  const mostActiveCompetitors = stats[3].map((s) => ({
    competitor: activeCompetitors.find((c) => c.id === s.competitorId),
    count: s._count,
  }));

  return {
    verticals,
    stories: recentStories,
    stats: {
      newStories24h: stats[0],
      p0Count: stats[1],
      p1Count: stats[2],
      mostActiveCompetitors,
    },
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent
        verticals={data.verticals}
        stories={data.stories}
        stats={data.stats}
      />
    </Suspense>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-lg border bg-card"
          />
        ))}
      </div>
      <div className="h-10 w-64 animate-pulse rounded-lg bg-muted" />
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-lg border bg-card"
          />
        ))}
      </div>
    </div>
  );
}
