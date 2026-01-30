import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { parse } from "yaml";
import { z } from "zod";

// Schema definitions
const CompetitorCategoryEnum = z.enum([
  "PLATFORM",
  "AI_VOICE",
  "AI_CHAT",
  "AI_ANALYTICS",
  "RECEPTIONIST",
  "CRM",
  "FSM",
]);

const SourceTypeEnum = z.enum(["official", "industry", "reviews", "jobs"]);

const TrustTierEnum = z.enum(["HIGH", "MEDIUM", "LOW"]);

const CompetitorSchema = z.object({
  name: z.string(),
  website: z.string().url().optional(),
  verticals: z.array(z.string()),
  keywords: z.array(z.string()),
  category: CompetitorCategoryEnum,
});

const SourceSchema = z.object({
  name: z.string(),
  base_url: z.string(),
  source_type: SourceTypeEnum,
  trust_tier: TrustTierEnum,
});

const CompetitorsConfigSchema = z.object({
  competitors: z.array(CompetitorSchema),
});

const SourcesConfigSchema = z.object({
  sources: z.array(SourceSchema),
});

export type CompetitorConfig = z.infer<typeof CompetitorSchema>;
export type SourceConfig = z.infer<typeof SourceSchema>;

function getConfigPath(filename: string): string {
  // Try multiple paths for different environments
  const paths = [
    join(process.cwd(), "config", filename),
    join(process.cwd(), "..", "config", filename),
    join(__dirname, "..", "..", "..", "config", filename),
  ];

  for (const path of paths) {
    if (existsSync(path)) {
      return path;
    }
  }

  throw new Error(
    `Config file not found: ${filename}. Searched: ${paths.join(", ")}`
  );
}

function loadYamlConfig<T>(filename: string, schema: z.ZodSchema<T>): T {
  const configPath = getConfigPath(filename);
  const fileContent = readFileSync(configPath, "utf-8");
  const parsed = parse(fileContent);
  return schema.parse(parsed);
}

let competitorsCache: CompetitorConfig[] | null = null;
let sourcesCache: SourceConfig[] | null = null;

export function loadCompetitorsConfig(): CompetitorConfig[] {
  if (competitorsCache) return competitorsCache;

  const config = loadYamlConfig("competitors.yaml", CompetitorsConfigSchema);
  competitorsCache = config.competitors;
  return competitorsCache;
}

export function loadSourcesConfig(): SourceConfig[] {
  if (sourcesCache) return sourcesCache;

  const config = loadYamlConfig("sources.yaml", SourcesConfigSchema);
  sourcesCache = config.sources;
  return sourcesCache;
}

export function reloadConfigs(): void {
  competitorsCache = null;
  sourcesCache = null;
}

export function getCompetitorsByVertical(vertical: string): CompetitorConfig[] {
  return loadCompetitorsConfig().filter((c) => c.verticals.includes(vertical));
}

export function getCompetitorByName(
  name: string
): CompetitorConfig | undefined {
  return loadCompetitorsConfig().find(
    (c) => c.name.toLowerCase() === name.toLowerCase()
  );
}

export function getSourcesByType(type: string): SourceConfig[] {
  return loadSourcesConfig().filter((s) => s.source_type === type);
}

export function getSourcesByTrustTier(tier: string): SourceConfig[] {
  return loadSourcesConfig().filter((s) => s.trust_tier === tier);
}
