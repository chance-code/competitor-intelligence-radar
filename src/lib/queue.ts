import { Queue, Worker, Job } from "bullmq";
import IORedis from "ioredis";
import {
  fetchSourcesJob,
  normalizeJob,
  dedupeAndClusterJob,
  summarizeAndAnalyzeJob,
  alertsJob,
  createJobLog,
  updateJobLog,
} from "./ingestion";

// Redis connection
let connection: IORedis | null = null;

function getRedisConnection(): IORedis | null {
  if (connection) return connection;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.warn("REDIS_URL not set, queue system unavailable");
    return null;
  }

  try {
    connection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
    });
    return connection;
  } catch (error) {
    console.error("Failed to connect to Redis:", error);
    return null;
  }
}

// Job types
type JobType =
  | "fetch_sources"
  | "normalize"
  | "dedupe_and_cluster"
  | "summarize_and_analyze"
  | "alerts"
  | "full_pipeline";

interface JobData {
  type: JobType;
  triggeredBy?: string;
}

// Queue setup
let ingestQueue: Queue<JobData> | null = null;

export function getQueue(): Queue<JobData> | null {
  if (ingestQueue) return ingestQueue;

  const conn = getRedisConnection();
  if (!conn) return null;

  ingestQueue = new Queue<JobData>("competitor-ingest", {
    connection: conn,
  });

  return ingestQueue;
}

// Job processor
async function processJob(job: Job<JobData>): Promise<void> {
  const { type, triggeredBy } = job.data;
  const jobLogId = await createJobLog(type);

  console.log(`Processing job: ${type}`);

  try {
    let itemsProcessed = 0;

    switch (type) {
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
    console.log(`Job ${type} completed: ${itemsProcessed} items processed`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    await updateJobLog(jobLogId, "FAILED", 0, errorMsg);
    console.error(`Job ${type} failed:`, error);
    throw error;
  }
}

// Worker setup
let worker: Worker<JobData> | null = null;

export function startWorker(): Worker<JobData> | null {
  if (worker) return worker;

  const conn = getRedisConnection();
  if (!conn) {
    console.warn("Cannot start worker: Redis not available");
    return null;
  }

  worker = new Worker<JobData>("competitor-ingest", processJob, {
    connection: conn,
    concurrency: 1, // Process one job at a time
  });

  worker.on("completed", (job) => {
    console.log(`Job ${job.id} completed`);
  });

  worker.on("failed", (job, error) => {
    console.error(`Job ${job?.id} failed:`, error);
  });

  return worker;
}

export function stopWorker(): void {
  if (worker) {
    worker.close();
    worker = null;
  }
}

// Schedule recurring jobs
export async function scheduleRecurringJobs(): Promise<void> {
  const queue = getQueue();
  if (!queue) {
    console.warn("Cannot schedule jobs: Queue not available");
    return;
  }

  // Remove existing repeatable jobs
  const repeatableJobs = await queue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    await queue.removeRepeatableByKey(job.key);
  }

  // Schedule full pipeline every 6 hours
  await queue.add(
    "full_pipeline",
    { type: "full_pipeline" },
    {
      repeat: {
        every: 6 * 60 * 60 * 1000, // 6 hours
      },
      jobId: "scheduled_full_pipeline",
    }
  );

  console.log("Scheduled recurring jobs");
}

// Add a job to the queue
export async function addJob(
  type: JobType,
  triggeredBy?: string
): Promise<string | null> {
  const queue = getQueue();
  if (!queue) {
    console.warn("Cannot add job: Queue not available");
    return null;
  }

  const job = await queue.add(type, { type, triggeredBy });
  return job.id || null;
}

// Fallback cron-like scheduler for environments without Redis
let cronInterval: NodeJS.Timeout | null = null;

export function startCronFallback(): void {
  if (cronInterval) return;

  console.log("Starting cron fallback scheduler (Redis not available)");

  // Run full pipeline every 6 hours
  cronInterval = setInterval(
    async () => {
      console.log("Running scheduled full pipeline (cron fallback)");
      try {
        const { runAllJobs } = await import("./ingestion");
        await runAllJobs();
      } catch (error) {
        console.error("Scheduled pipeline failed:", error);
      }
    },
    6 * 60 * 60 * 1000
  );
}

export function stopCronFallback(): void {
  if (cronInterval) {
    clearInterval(cronInterval);
    cronInterval = null;
  }
}
