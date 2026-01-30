import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatDate,
  timeAgo,
  getPriorityColor,
  getPriorityLabel,
  formatAICapability,
} from "@/lib/utils";
import {
  ArrowLeft,
  ExternalLink,
  Building2,
  TrendingUp,
  FileText,
  Target,
} from "lucide-react";

async function getCompetitor(id: string) {
  const competitor = await prisma.competitor.findUnique({
    where: { id },
    include: {
      verticals: {
        include: {
          vertical: true,
        },
      },
      storySummaries: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          cluster: true,
          vertical: true,
        },
      },
    },
  });

  return competitor;
}

export default async function CompetitorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const competitor = await getCompetitor(id);

  if (!competitor) {
    notFound();
  }

  // Collect AI capabilities from stories
  const aiCapabilityCounts: Record<string, number> = {};
  for (const story of competitor.storySummaries) {
    for (const cap of story.aiCapabilities) {
      aiCapabilityCounts[cap] = (aiCapabilityCounts[cap] || 0) + 1;
    }
  }

  const sortedCapabilities = Object.entries(aiCapabilityCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([cap, count]) => ({ capability: cap, count }));

  // Count by priority
  const priorityCounts = {
    P0: competitor.storySummaries.filter((s) => s.priority === "P0").length,
    P1: competitor.storySummaries.filter((s) => s.priority === "P1").length,
    P2: competitor.storySummaries.filter((s) => s.priority === "P2").length,
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link href="/competitors">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Competitors
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {competitor.name}
              </h1>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Badge variant="outline">{competitor.category}</Badge>
                {competitor.website && (
                  <a
                    href={competitor.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm hover:text-foreground"
                  >
                    {competitor.website}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Stories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {competitor.storySummaries.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Critical (P0)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {priorityCounts.P0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Important (P1)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {priorityCounts.P1}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Verticals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {competitor.verticals.map((v) => (
                <Badge key={v.vertical.id} variant="secondary">
                  {v.vertical.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content - Activity Timeline */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {competitor.storySummaries.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No activity recorded yet
                </p>
              ) : (
                <div className="space-y-4">
                  {competitor.storySummaries.map((story) => (
                    <div
                      key={story.id}
                      className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div
                        className={`w-2 h-2 rounded-full mt-2 ${
                          story.priority === "P0"
                            ? "bg-red-500"
                            : story.priority === "P1"
                            ? "bg-orange-500"
                            : "bg-blue-500"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            className={`text-xs ${getPriorityColor(
                              story.priority
                            )}`}
                          >
                            {getPriorityLabel(story.priority)}
                          </Badge>
                          {story.vertical && (
                            <Badge variant="outline" className="text-xs">
                              {story.vertical.name}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground ml-auto">
                            {timeAgo(story.createdAt)}
                          </span>
                        </div>
                        <Link
                          href={`/stories/${story.id}`}
                          className="font-medium hover:text-primary"
                        >
                          {story.cluster.canonicalTitle}
                        </Link>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {story.summary}
                        </p>
                        {story.aiCapabilities.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {story.aiCapabilities.slice(0, 3).map((cap) => (
                              <Badge
                                key={cap}
                                variant="outline"
                                className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                              >
                                {formatAICapability(cap)}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* AI Capability Coverage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                AI Capability Map
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sortedCapabilities.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No AI capabilities tracked yet
                </p>
              ) : (
                <div className="space-y-2">
                  {sortedCapabilities.map(({ capability, count }) => (
                    <div
                      key={capability}
                      className="flex items-center justify-between"
                    >
                      <Badge
                        variant="outline"
                        className="bg-blue-50 text-blue-700 border-blue-200"
                      >
                        {formatAICapability(capability)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {count} {count === 1 ? "mention" : "mentions"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Keywords */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Tracking Keywords
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {competitor.keywords.map((keyword, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
