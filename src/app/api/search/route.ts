import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { Priority, AICapability } from "@prisma/client";

export const dynamic = "force-dynamic";

const PRIORITY_VALUES: string[] = ["P0", "P1", "P2"];
const AI_CAPABILITY_VALUES: string[] = [
  "AI_VOICE_AGENT",
  "AI_CHAT_AGENT",
  "AI_LEAD_RESPONSE",
  "AI_SCHEDULING_BOOKING",
  "AI_DISPATCH_ROUTING",
  "AI_MARKETING_AUTOMATION",
  "AI_REPUTATION_REVIEWS",
  "AI_ANALYTICS_INSIGHTS",
  "AI_PAYMENTS_COLLECTIONS",
  "AI_WORKFLOW_AUTOMATION",
];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");
    const verticalId = searchParams.get("vertical");
    const competitorId = searchParams.get("competitor");
    const priorityParam = searchParams.get("priority");
    const aiCapabilityParam = searchParams.get("aiCapability");

    // Build where clause
    const where: Record<string, unknown> = {};

    if (verticalId && verticalId !== "all") {
      where.verticalId = verticalId;
    }

    if (competitorId && competitorId !== "all") {
      where.competitorId = competitorId;
    }

    if (priorityParam && priorityParam !== "all" && PRIORITY_VALUES.includes(priorityParam)) {
      where.priority = priorityParam as Priority;
    }

    if (aiCapabilityParam && aiCapabilityParam !== "all" && AI_CAPABILITY_VALUES.includes(aiCapabilityParam)) {
      where.aiCapabilities = {
        has: aiCapabilityParam as AICapability,
      };
    }

    if (query) {
      where.OR = [
        { summary: { contains: query, mode: "insensitive" } },
        { cluster: { canonicalTitle: { contains: query, mode: "insensitive" } } },
        { competitor: { name: { contains: query, mode: "insensitive" } } },
      ];
    }

    const results = await prisma.storySummary.findMany({
      where,
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
      take: 50,
      include: {
        cluster: {
          select: {
            canonicalTitle: true,
          },
        },
        competitor: {
          select: {
            id: true,
            name: true,
          },
        },
        vertical: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
