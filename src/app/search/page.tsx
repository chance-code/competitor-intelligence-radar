"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  timeAgo,
  getPriorityColor,
  getPriorityLabel,
  formatAICapability,
} from "@/lib/utils";
import { Search, Filter, X, Building2, AlertCircle } from "lucide-react";

interface SearchResult {
  id: string;
  summary: string;
  priority: string;
  verificationStatus: string;
  aiCapabilities: string[];
  createdAt: string;
  cluster: {
    canonicalTitle: string;
  };
  competitor: {
    id: string;
    name: string;
  } | null;
  vertical: {
    id: string;
    name: string;
  } | null;
}

interface FilterOptions {
  verticals: { id: string; name: string }[];
  competitors: { id: string; name: string }[];
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [vertical, setVertical] = useState<string>("all");
  const [competitor, setCompetitor] = useState<string>("all");
  const [priority, setPriority] = useState<string>("all");
  const [aiCapability, setAiCapability] = useState<string>("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    verticals: [],
    competitors: [],
  });
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Load filter options
  useEffect(() => {
    async function loadOptions() {
      try {
        const response = await fetch("/api/search/options");
        if (response.ok) {
          const data = await response.json();
          setFilterOptions(data);
        }
      } catch (error) {
        console.error("Failed to load filter options:", error);
      }
    }
    loadOptions();
  }, []);

  // Perform search
  async function handleSearch(e?: React.FormEvent) {
    if (e) e.preventDefault();

    setLoading(true);
    setSearched(true);

    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (vertical !== "all") params.set("vertical", vertical);
      if (competitor !== "all") params.set("competitor", competitor);
      if (priority !== "all") params.set("priority", priority);
      if (aiCapability !== "all") params.set("aiCapability", aiCapability);

      const response = await fetch(`/api/search?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setResults(data.results);
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  }

  // Clear filters
  function clearFilters() {
    setQuery("");
    setVertical("all");
    setCompetitor("all");
    setPriority("all");
    setAiCapability("all");
    setResults([]);
    setSearched(false);
  }

  const aiCapabilities = [
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

  const hasActiveFilters =
    query ||
    vertical !== "all" ||
    competitor !== "all" ||
    priority !== "all" ||
    aiCapability !== "all";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Search</h1>
        <p className="text-muted-foreground">
          Search and filter competitive intelligence stories
        </p>
      </div>

      {/* Search Form */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="space-y-4">
            {/* Search Input */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search stories, competitors, AI capabilities..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? "Searching..." : "Search"}
              </Button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filters:</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>Vertical</Label>
                <Select value={vertical} onValueChange={setVertical}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Verticals" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Verticals</SelectItem>
                    {filterOptions.verticals.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Competitor</Label>
                <Select value={competitor} onValueChange={setCompetitor}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Competitors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Competitors</SelectItem>
                    {filterOptions.competitors.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="P0">P0 - Critical</SelectItem>
                    <SelectItem value="P1">P1 - Important</SelectItem>
                    <SelectItem value="P2">P2 - Monitor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>AI Capability</Label>
                <Select value={aiCapability} onValueChange={setAiCapability}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Capabilities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Capabilities</SelectItem>
                    {aiCapabilities.map((cap) => (
                      <SelectItem key={cap} value={cap}>
                        {formatAICapability(cap)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                >
                  <X className="mr-1 h-4 w-4" />
                  Clear all filters
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      {searched && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {results.length} {results.length === 1 ? "result" : "results"}{" "}
              found
            </p>
          </div>

          {results.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">No results found</h3>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your search terms or filters
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {results.map((result) => (
                <Card
                  key={result.id}
                  className="hover:border-foreground/20 transition-colors"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={getPriorityColor(result.priority)}>
                            {getPriorityLabel(result.priority)}
                          </Badge>
                          {result.competitor && (
                            <Badge variant="secondary">
                              {result.competitor.name}
                            </Badge>
                          )}
                          {result.vertical && (
                            <Badge variant="outline">
                              {result.vertical.name}
                            </Badge>
                          )}
                        </div>

                        <Link
                          href={`/stories/${result.id}`}
                          className="block group"
                        >
                          <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                            {result.cluster.canonicalTitle}
                          </h3>
                        </Link>

                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {result.summary}
                        </p>

                        {result.aiCapabilities.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {result.aiCapabilities.map((cap) => (
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

                      <div className="text-sm text-muted-foreground">
                        {timeAgo(result.createdAt)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {!searched && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">
              Search competitive intelligence
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Enter keywords or use filters to find relevant stories about
              competitors, AI capabilities, and market developments.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
