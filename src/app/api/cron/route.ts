import { NextRequest, NextResponse } from "next/server";
import { runAllJobs } from "@/lib/ingestion";

// This endpoint can be called by external cron services (Vercel Cron, GitHub Actions, etc.)
// For security, you can add a secret token check

export async function GET(request: NextRequest) {
  // Optional: Verify cron secret for security
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[Cron] Starting scheduled pipeline run...");

    // Run asynchronously so we don't timeout
    runAllJobs()
      .then(() => console.log("[Cron] Pipeline completed successfully"))
      .catch((err) => console.error("[Cron] Pipeline failed:", err));

    return NextResponse.json({
      success: true,
      message: "Pipeline started",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Failed to start pipeline:", error);
    return NextResponse.json(
      { error: "Failed to start pipeline" },
      { status: 500 }
    );
  }
}

// Also support POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request);
}
