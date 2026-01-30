import {
  startWorker,
  stopWorker,
  scheduleRecurringJobs,
  startCronFallback,
  stopCronFallback,
  getQueue,
} from "../lib/queue";

async function main() {
  console.log("Starting Competitor Intelligence Radar Worker");
  console.log("=".repeat(50));

  // Try to start BullMQ worker
  const worker = startWorker();

  if (worker) {
    console.log("BullMQ worker started");

    // Schedule recurring jobs
    await scheduleRecurringJobs();

    // Handle shutdown
    const shutdown = async () => {
      console.log("\nShutting down worker...");
      stopWorker();
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    console.log("Worker is ready and listening for jobs");
  } else {
    console.log("Redis not available, using cron fallback");
    startCronFallback();

    // Handle shutdown
    const shutdown = () => {
      console.log("\nShutting down cron fallback...");
      stopCronFallback();
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    console.log("Cron fallback scheduler started");
  }

  // Keep process running
  console.log("\nPress Ctrl+C to stop");
}

main().catch((error) => {
  console.error("Worker failed to start:", error);
  process.exit(1);
});
