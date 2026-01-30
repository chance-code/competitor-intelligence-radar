import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const logs = await prisma.jobRunLog.findMany({
      orderBy: { startedAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Failed to load job logs:", error);
    return NextResponse.json(
      { error: "Failed to load job logs" },
      { status: 500 }
    );
  }
}
