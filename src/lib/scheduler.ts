// Simple in-process scheduler for development
// In production, use Vercel Cron, GitHub Actions, or a proper job scheduler

import { runAllJobs } from "./ingestion";

let schedulerStarted = false;
let intervalId: NodeJS.Timeout | null = null;

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

export function startScheduler() {
  if (schedulerStarted) {
    return;
  }

  // Only run in development or if explicitly enabled
  if (process.env.NODE_ENV !== "development" && !process.env.ENABLE_SCHEDULER) {
    console.log("[Scheduler] Disabled in production. Use external cron instead.");
    return;
  }

  schedulerStarted = true;
  console.log("[Scheduler] Started - will run pipeline every 6 hours");

  // Run immediately on startup (optional - uncomment if desired)
  // runPipeline();

  // Schedule recurring runs
  intervalId = setInterval(runPipeline, SIX_HOURS_MS);
}

export function stopScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    schedulerStarted = false;
    console.log("[Scheduler] Stopped");
  }
}

async function runPipeline() {
  console.log("[Scheduler] Running scheduled pipeline at", new Date().toISOString());

  try {
    await runAllJobs();
    console.log("[Scheduler] Pipeline completed successfully");
  } catch (error) {
    console.error("[Scheduler] Pipeline failed:", error);
  }
}

// For manual triggering in dev
export async function runNow() {
  return runPipeline();
}
