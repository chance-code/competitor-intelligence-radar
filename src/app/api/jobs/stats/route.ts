import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [
      totalCompetitors,
      totalSources,
      totalRawItems,
      totalClusters,
      totalSummaries,
      lastJob,
    ] = await Promise.all([
      prisma.competitor.count(),
      prisma.source.count(),
      prisma.rawItem.count(),
      prisma.storyCluster.count(),
      prisma.storySummary.count(),
      prisma.jobRunLog.findFirst({
        where: { status: "COMPLETED" },
        orderBy: { finishedAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      totalCompetitors,
      totalSources,
      totalRawItems,
      totalClusters,
      totalSummaries,
      lastJobRun: lastJob?.finishedAt?.toISOString() || null,
    });
  } catch (error) {
    console.error("Failed to load stats:", error);
    return NextResponse.json(
      { error: "Failed to load stats" },
      { status: 500 }
    );
  }
}
