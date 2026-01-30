import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatDate,
  getPriorityColor,
  getPriorityLabel,
  getVerificationColor,
  formatAICapability,
  getConfidenceLabel,
} from "@/lib/utils";
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Building2,
  Target,
  Lightbulb,
  Shield,
} from "lucide-react";

interface Citation {
  url: string;
  title: string;
  retrievedAt: string;
}

async function getStory(id: string) {
  const story = await prisma.storySummary.findUnique({
    where: { id },
    include: {
      cluster: {
        include: {
          storyLinks: {
            include: {
              rawItem: {
                include: {
                  source: true,
                },
              },
            },
          },
        },
      },
      competitor: {
        include: {
          verticals: {
            include: {
              vertical: true,
            },
          },
        },
      },
      vertical: true,
    },
  });

  return story;
}

export default async function StoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const story = await getStory(id);

  if (!story) {
    notFound();
  }

  const citations = (story.citations as unknown as Citation[]) || [];

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link href="/dashboard">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div className="space-y-4">
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
          <Badge variant="secondary">
            Confidence: {getConfidenceLabel(story.confidenceScore)} (
            {story.confidenceScore}/5)
          </Badge>
        </div>

        <h1 className="text-3xl font-bold tracking-tight">
          {story.cluster.canonicalTitle}
        </h1>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {story.competitor && (
            <Link
              href={`/competitors/${story.competitor.id}`}
              className="flex items-center gap-1 hover:text-foreground"
            >
              <Building2 className="h-4 w-4" />
              {story.competitor.name}
            </Link>
          )}
          {story.vertical && (
            <span className="flex items-center gap-1">
              <Target className="h-4 w-4" />
              {story.vertical.name}
            </span>
          )}
          <span>Published: {formatDate(story.createdAt)}</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{story.summary}</p>
            </CardContent>
          </Card>

          {/* Key Points */}
          {story.keyPoints.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Key Points</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {story.keyPoints.map((point, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Why It Matters */}
          {story.whyItMatters && (
            <Card className="border-orange-200 bg-orange-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-orange-500" />
                  Why This Matters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>{story.whyItMatters}</p>
              </CardContent>
            </Card>
          )}

          {/* Recommended Actions */}
          {story.recommendedActions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recommended Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {story.recommendedActions.map((action, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 p-2 bg-muted/50 rounded-md"
                    >
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-medium flex-shrink-0">
                        {index + 1}
                      </span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Citations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Evidence & Sources
              </CardTitle>
            </CardHeader>
            <CardContent>
              {citations.length > 0 ? (
                <ul className="space-y-3">
                  {citations.map((citation, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-3 p-3 border rounded-md"
                    >
                      <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                      <div className="flex-1 min-w-0">
                        <a
                          href={citation.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline font-medium"
                        >
                          {citation.title}
                        </a>
                        <p className="text-xs text-muted-foreground mt-1">
                          Retrieved: {formatDate(citation.retrievedAt)}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {citation.url}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">
                  No citations available for this story.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* AI Capabilities */}
          <Card>
            <CardHeader>
              <CardTitle>AI Capabilities</CardTitle>
            </CardHeader>
            <CardContent>
              {story.aiCapabilities.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {story.aiCapabilities.map((cap) => (
                    <Badge
                      key={cap}
                      variant="outline"
                      className="bg-blue-50 text-blue-700 border-blue-200"
                    >
                      {formatAICapability(cap)}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No AI capabilities identified
                </p>
              )}
            </CardContent>
          </Card>

          {/* Competitor Info */}
          {story.competitor && (
            <Card>
              <CardHeader>
                <CardTitle>Competitor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Link
                    href={`/competitors/${story.competitor.id}`}
                    className="text-lg font-medium hover:text-primary"
                  >
                    {story.competitor.name}
                  </Link>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Verticals
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {story.competitor.verticals.map((v) => (
                      <Badge key={v.vertical.id} variant="secondary">
                        {v.vertical.name}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Link href={`/competitors/${story.competitor.id}`}>
                  <Button variant="outline" className="w-full">
                    View Competitor Profile
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Raw Sources */}
          <Card>
            <CardHeader>
              <CardTitle>Source Materials</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {story.cluster.storyLinks.map((link) => (
                  <li
                    key={link.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="truncate text-muted-foreground">
                      {link.rawItem.source.name}
                    </span>
                    <Badge
                      variant={
                        link.rawItem.source.trustTier === "HIGH"
                          ? "default"
                          : link.rawItem.source.trustTier === "MEDIUM"
                          ? "secondary"
                          : "outline"
                      }
                      className="flex-shrink-0"
                    >
                      {link.rawItem.source.trustTier}
                    </Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
