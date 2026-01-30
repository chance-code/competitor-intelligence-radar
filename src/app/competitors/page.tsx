import Link from "next/link";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatAICapability } from "@/lib/utils";
import { Building2, ExternalLink, TrendingUp } from "lucide-react";

async function getCompetitors() {
  const competitors = await prisma.competitor.findMany({
    include: {
      verticals: {
        include: {
          vertical: true,
        },
      },
      storySummaries: {
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          aiCapabilities: true,
          createdAt: true,
          priority: true,
        },
      },
      _count: {
        select: {
          storySummaries: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return competitors;
}

export default async function CompetitorsPage() {
  const competitors = await getCompetitors();

  // Group by vertical
  const byVertical: Record<string, typeof competitors> = {
    Auto: [],
    "Home Services": [],
    "Med Spa": [],
    Multiple: [],
  };

  for (const competitor of competitors) {
    const verticals = competitor.verticals.map((v) => v.vertical.name);
    if (verticals.length > 1) {
      byVertical["Multiple"].push(competitor);
    } else if (verticals.length === 1) {
      const vertical = verticals[0];
      if (byVertical[vertical]) {
        byVertical[vertical].push(competitor);
      }
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Competitors</h1>
        <p className="text-muted-foreground">
          Track AI capabilities and activity across {competitors.length}{" "}
          competitors
        </p>
      </div>

      {Object.entries(byVertical).map(([vertical, competitorList]) => {
        if (competitorList.length === 0) return null;

        return (
          <div key={vertical} className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {vertical}
              <Badge variant="secondary">{competitorList.length}</Badge>
            </h2>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {competitorList.map((competitor) => (
                <CompetitorCard key={competitor.id} competitor={competitor} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface CompetitorCardProps {
  competitor: {
    id: string;
    name: string;
    website: string | null;
    category: string;
    verticals: { vertical: { id: string; name: string } }[];
    storySummaries: {
      id: string;
      aiCapabilities: string[];
      createdAt: Date;
      priority: string;
    }[];
    _count: { storySummaries: number };
  };
}

function CompetitorCard({ competitor }: CompetitorCardProps) {
  // Collect unique AI capabilities from recent stories
  const aiCapabilities = new Set<string>();
  for (const story of competitor.storySummaries) {
    for (const cap of story.aiCapabilities) {
      aiCapabilities.add(cap);
    }
  }

  // Get most recent activity
  const lastActivity =
    competitor.storySummaries.length > 0
      ? competitor.storySummaries[0].createdAt
      : null;

  // Count high priority stories
  const highPriorityCount = competitor.storySummaries.filter(
    (s) => s.priority === "P0" || s.priority === "P1"
  ).length;

  return (
    <Link href={`/competitors/${competitor.id}`}>
      <Card className="h-full hover:border-foreground/20 transition-colors cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">{competitor.name}</CardTitle>
            {highPriorityCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {highPriorityCount} alerts
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">{competitor.category}</Badge>
            {competitor.website && (
              <span className="flex items-center gap-1">
                <ExternalLink className="h-3 w-3" />
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Verticals */}
          <div className="flex flex-wrap gap-1">
            {competitor.verticals.map((v) => (
              <Badge key={v.vertical.id} variant="secondary" className="text-xs">
                {v.vertical.name}
              </Badge>
            ))}
          </div>

          {/* AI Capabilities */}
          {aiCapabilities.size > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">AI Capabilities</p>
              <div className="flex flex-wrap gap-1">
                {Array.from(aiCapabilities)
                  .slice(0, 4)
                  .map((cap) => (
                    <Badge
                      key={cap}
                      variant="outline"
                      className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                    >
                      {formatAICapability(cap)}
                    </Badge>
                  ))}
                {aiCapabilities.size > 4 && (
                  <Badge variant="outline" className="text-xs">
                    +{aiCapabilities.size - 4} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Activity */}
          <div className="flex items-center justify-between pt-2 border-t text-sm">
            <div className="flex items-center gap-1 text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              {competitor._count.storySummaries} stories
            </div>
            {lastActivity && (
              <span className="text-xs text-muted-foreground">
                Last: {formatDate(lastActivity)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
