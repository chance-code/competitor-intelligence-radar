import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [verticals, competitors] = await Promise.all([
      prisma.vertical.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.competitor.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    return NextResponse.json({ verticals, competitors });
  } catch (error) {
    console.error("Failed to load search options:", error);
    return NextResponse.json(
      { error: "Failed to load options" },
      { status: 500 }
    );
  }
}
