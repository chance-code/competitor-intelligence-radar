"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import {
  RefreshCw,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Database,
  Settings,
  FileText,
  Loader2,
} from "lucide-react";

interface JobLog {
  id: string;
  jobName: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  itemsProcessed: number;
  errorMessage: string | null;
}

interface SystemStats {
  totalCompetitors: number;
  totalSources: number;
  totalRawItems: number;
  totalClusters: number;
  totalSummaries: number;
  lastJobRun: string | null;
}

export default function AdminPage() {
  const [jobLogs, setJobLogs] = useState<JobLog[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningJob, setRunningJob] = useState<string | null>(null);

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [logsRes, statsRes] = await Promise.all([
        fetch("/api/jobs"),
        fetch("/api/jobs/stats"),
      ]);

      if (logsRes.ok) {
        const data = await logsRes.json();
        setJobLogs(data.logs);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to load admin data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function triggerJob(jobName: string) {
    setRunningJob(jobName);
    try {
      const response = await fetch("/api/jobs/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobName }),
      });

      if (response.ok) {
        // Reload data after job is triggered
        setTimeout(loadData, 1000);
      }
    } catch (error) {
      console.error("Failed to trigger job:", error);
    } finally {
      setRunningJob(null);
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "FAILED":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "RUNNING":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "COMPLETED":
        return <Badge className="bg-green-500">Completed</Badge>;
      case "FAILED":
        return <Badge variant="destructive">Failed</Badge>;
      case "RUNNING":
        return <Badge className="bg-blue-500">Running</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
          <p className="text-muted-foreground">
            Manage ingestion jobs and system configuration
          </p>
        </div>
        <Button onClick={loadData} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* System Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Database className="h-4 w-4" />
                Competitors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCompetitors}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Sources
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSources}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Raw Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRawItems}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Clusters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalClusters}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Summaries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSummaries}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Manual Job Triggers */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Job Triggers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Button
              onClick={() => triggerJob("full_pipeline")}
              disabled={runningJob !== null}
              className="gap-2"
            >
              {runningJob === "full_pipeline" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Run Full Pipeline
            </Button>

            <Button
              onClick={() => triggerJob("fetch_sources")}
              disabled={runningJob !== null}
              variant="outline"
              className="gap-2"
            >
              {runningJob === "fetch_sources" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Fetch Sources Only
            </Button>

            <Button
              onClick={() => triggerJob("summarize_and_analyze")}
              disabled={runningJob !== null}
              variant="outline"
              className="gap-2"
            >
              {runningJob === "summarize_and_analyze" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Analyze & Summarize
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Jobs run automatically every 6 hours. Use these buttons to trigger
            manual runs.
          </p>
        </CardContent>
      </Card>

      {/* Job History */}
      <Card>
        <CardHeader>
          <CardTitle>Job History</CardTitle>
        </CardHeader>
        <CardContent>
          {jobLogs.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No job runs recorded yet
            </p>
          ) : (
            <div className="space-y-4">
              {jobLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-4 p-4 border rounded-lg"
                >
                  <div className="mt-1">{getStatusIcon(log.status)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{log.jobName}</span>
                      {getStatusBadge(log.status)}
                      <Badge variant="outline">
                        {log.itemsProcessed} items
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Started: {formatDateTime(log.startedAt)}
                      {log.finishedAt && (
                        <> | Finished: {formatDateTime(log.finishedAt)}</>
                      )}
                    </div>
                    {log.errorMessage && (
                      <div className="mt-2 p-2 bg-red-50 text-red-700 rounded text-sm">
                        {log.errorMessage}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration Files */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">competitors.yaml</h4>
                  <p className="text-sm text-muted-foreground">
                    Competitor definitions and keywords
                  </p>
                </div>
                <Badge variant="outline">config/competitors.yaml</Badge>
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">sources.yaml</h4>
                  <p className="text-sm text-muted-foreground">
                    Data sources and trust tiers
                  </p>
                </div>
                <Badge variant="outline">config/sources.yaml</Badge>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Edit these YAML files to add or modify competitors and sources.
              Changes take effect on the next job run.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
