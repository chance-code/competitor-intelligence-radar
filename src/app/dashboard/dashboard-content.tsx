"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  timeAgo,
  getPriorityColor,
  getPriorityLabel,
  getVerificationColor,
  formatAICapability,
} from "@/lib/utils";
import {
  AlertTriangle,
  TrendingUp,
  Building2,
  Clock,
  ExternalLink,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface Vertical {
  id: string;
  name: string;
}

interface Competitor {
  id: string;
  name: string;
}

interface StorySummary {
  id: string;
  summary: string;
  keyPoints: string[];
  whyItMatters: string | null;
  priority: string;
  confidenceScore: number;
  verificationStatus: string;
  aiCapabilities: string[];
  createdAt: Date;
  cluster: {
    id: string;
    canonicalTitle: string;
  };
  competitor: Competitor | null;
  vertical: Vertical | null;
}

interface MostActiveCompetitor {
  competitor: Competitor | undefined;
  count: number;
}

interface Stats {
  newStories24h: number;
  p0Count: number;
  p1Count: number;
  mostActiveCompetitors: MostActiveCompetitor[];
}

interface DashboardContentProps {
  verticals: Vertical[];
  stories: StorySummary[];
  stats: Stats;
}

export function DashboardContent({
  verticals,
  stories,
  stats,
}: DashboardContentProps) {
  const [activeTab, setActiveTab] = useState("all");

  const filteredStories =
    activeTab === "all"
      ? stories
      : stories.filter((s) => s.vertical?.name === activeTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Competitor Intelligence
          </h1>
          <p className="text-muted-foreground">
            AI-powered competitive insights across Voice AI markets
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          <Clock className="mr-1 inline h-4 w-4" />
          Last updated: {timeAgo(new Date())}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              New Stories (24h)
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.newStories24h}</div>
            <p className="text-xs text-muted-foreground">
              Across all verticals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Critical (P0)
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {stats.p0Count}
            </div>
            <p className="text-xs text-muted-foreground">
              Requires immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Important (P1)
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {stats.p1Count}
            </div>
            <p className="text-xs text-muted-foreground">
              Review this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Most Active
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {stats.mostActiveCompetitors.slice(0, 3).map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="truncate">
                    {item.competitor?.name || "Unknown"}
                  </span>
                  <Badge variant="secondary" className="ml-2">
                    {item.count}
                  </Badge>
                </div>
              ))}
              {stats.mostActiveCompetitors.length === 0 && (
                <p className="text-xs text-muted-foreground">No activity yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vertical Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Verticals</TabsTrigger>
          {verticals.map((vertical) => (
            <TabsTrigger key={vertical.id} value={vertical.name}>
              {vertical.name}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {filteredStories.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">No stories yet</h3>
                <p className="text-sm text-muted-foreground">
                  Stories will appear here as they are discovered and analyzed.
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredStories.map((story) => (
              <StoryCard key={story.id} story={story} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StoryCard({ story }: { story: StorySummary }) {
  return (
    <Link href={`/stories/${story.id}`} className="block group">
      <Card className="hover:border-foreground/20 transition-colors cursor-pointer">
        <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            {/* Header */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={getPriorityColor(story.priority)}>
                {getPriorityLabel(story.priority)}
              </Badge>
              <Badge
                variant="outline"
                className={getVerificationColor(story.verificationStatus)}
              >
                {story.verificationStatus === "VERIFIED" ? (
                  <CheckCircle className="mr-1 h-3 w-3" />
                ) : (
                  <AlertCircle className="mr-1 h-3 w-3" />
                )}
                {story.verificationStatus === "VERIFIED"
                  ? "Verified"
                  : "Claim Unverified"}
              </Badge>
              {story.competitor && (
                <Badge variant="secondary">{story.competitor.name}</Badge>
              )}
              {story.vertical && (
                <Badge variant="outline">{story.vertical.name}</Badge>
              )}
            </div>

            {/* Title */}
            <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
              {story.cluster.canonicalTitle}
            </h3>

            {/* Summary */}
            <p className="text-sm text-muted-foreground line-clamp-2">
              {story.summary}
            </p>

            {/* AI Capabilities */}
            {story.aiCapabilities.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {story.aiCapabilities.map((cap) => (
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

            {/* Why it matters */}
            {story.whyItMatters && (
              <div className="text-sm bg-muted/50 rounded-md p-3">
                <span className="font-medium">Why it matters: </span>
                {story.whyItMatters}
              </div>
            )}
          </div>

          {/* Right side */}
          <div className="flex flex-col items-end gap-2 text-sm text-muted-foreground">
            <span>{timeAgo(story.createdAt)}</span>
            <span className="flex items-center gap-1 text-primary">
              View details
              <ExternalLink className="h-3 w-3" />
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
    </Link>
  );
}
