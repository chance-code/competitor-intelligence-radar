import { NextRequest, NextResponse } from "next/server";
import {
  fetchSourcesJob,
  normalizeJob,
  dedupeAndClusterJob,
  summarizeAndAnalyzeJob,
  alertsJob,
  runAllJobs,
  createJobLog,
  updateJobLog,
} from "@/lib/ingestion";

type JobType =
  | "fetch_sources"
  | "normalize"
  | "dedupe_and_cluster"
  | "summarize_and_analyze"
  | "alerts"
  | "full_pipeline";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const jobName = body.jobName as JobType;

    if (!jobName) {
      return NextResponse.json(
        { error: "Job name is required" },
        { status: 400 }
      );
    }

    // Run job asynchronously
    runJobAsync(jobName).catch(console.error);

    return NextResponse.json({
      success: true,
      message: `Job ${jobName} started`,
    });
  } catch (error) {
    console.error("Failed to trigger job:", error);
    return NextResponse.json(
      { error: "Failed to trigger job" },
      { status: 500 }
    );
  }
}

async function runJobAsync(jobName: JobType): Promise<void> {
  const jobLogId = await createJobLog(jobName);

  try {
    let itemsProcessed = 0;

    switch (jobName) {
      case "fetch_sources": {
        const result = await fetchSourcesJob();
        itemsProcessed = result.itemsFetched;
        break;
      }
      case "normalize": {
        const result = await normalizeJob();
        itemsProcessed = result.itemsProcessed;
        break;
      }
      case "dedupe_and_cluster": {
        const result = await dedupeAndClusterJob();
        itemsProcessed = result.clustersCreated + result.itemsLinked;
        break;
      }
      case "summarize_and_analyze": {
        const result = await summarizeAndAnalyzeJob();
        itemsProcessed = result.summariesCreated;
        break;
      }
      case "alerts": {
        const result = await alertsJob();
        itemsProcessed = result.alertsSent;
        break;
      }
      case "full_pipeline": {
        const fetchResult = await fetchSourcesJob();
        const normalizeResult = await normalizeJob();
        const clusterResult = await dedupeAndClusterJob();
        const summaryResult = await summarizeAndAnalyzeJob();
        const alertsResult = await alertsJob();
        itemsProcessed =
          fetchResult.itemsFetched +
          normalizeResult.itemsProcessed +
          clusterResult.itemsLinked +
          summaryResult.summariesCreated +
          alertsResult.alertsSent;
        break;
      }
    }

    await updateJobLog(jobLogId, "COMPLETED", itemsProcessed);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    await updateJobLog(jobLogId, "FAILED", 0, errorMsg);
    throw error;
  }
}
