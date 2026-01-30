import { PrismaClient, CompetitorCategory, SourceType, TrustTier } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";
import { parse } from "yaml";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

interface CompetitorConfig {
  name: string;
  website?: string;
  verticals: string[];
  keywords: string[];
  category: string;
}

interface SourceConfig {
  name: string;
  base_url: string;
  source_type: string;
  trust_tier: string;
}

async function main() {
  console.log("Starting database seed...");

  // Create verticals
  console.log("Creating verticals...");
  const verticals = ["Auto", "Home Services", "Med Spa"];
  const verticalRecords: Record<string, string> = {};

  for (const name of verticals) {
    const vertical = await prisma.vertical.upsert({
      where: { name },
      create: { name },
      update: {},
    });
    verticalRecords[name] = vertical.id;
    console.log(`  Created vertical: ${name}`);
  }

  // Load and create competitors from YAML
  console.log("Loading competitors from config...");
  const competitorsPath = join(process.cwd(), "config", "competitors.yaml");
  const competitorsYaml = readFileSync(competitorsPath, "utf-8");
  const competitorsConfig = parse(competitorsYaml) as { competitors: CompetitorConfig[] };

  for (const comp of competitorsConfig.competitors) {
    const competitor = await prisma.competitor.upsert({
      where: { name: comp.name },
      create: {
        name: comp.name,
        website: comp.website || null,
        keywords: comp.keywords,
        category: comp.category as CompetitorCategory,
      },
      update: {
        website: comp.website || null,
        keywords: comp.keywords,
        category: comp.category as CompetitorCategory,
      },
    });

    // Link to verticals
    for (const verticalName of comp.verticals) {
      const verticalId = verticalRecords[verticalName];
      if (verticalId) {
        await prisma.competitorVertical.upsert({
          where: {
            competitorId_verticalId: {
              competitorId: competitor.id,
              verticalId,
            },
          },
          create: {
            competitorId: competitor.id,
            verticalId,
          },
          update: {},
        });
      }
    }

    console.log(`  Created competitor: ${comp.name}`);
  }

  // Load and create sources from YAML
  console.log("Loading sources from config...");
  const sourcesPath = join(process.cwd(), "config", "sources.yaml");
  const sourcesYaml = readFileSync(sourcesPath, "utf-8");
  const sourcesConfig = parse(sourcesYaml) as { sources: SourceConfig[] };

  for (const src of sourcesConfig.sources) {
    const sourceId = src.name.toLowerCase().replace(/\s+/g, "-");
    await prisma.source.upsert({
      where: { id: sourceId },
      create: {
        id: sourceId,
        name: src.name,
        baseUrl: src.base_url,
        sourceType: src.source_type as SourceType,
        trustTier: src.trust_tier as TrustTier,
      },
      update: {
        name: src.name,
        baseUrl: src.base_url,
        sourceType: src.source_type as SourceType,
        trustTier: src.trust_tier as TrustTier,
      },
    });
    console.log(`  Created source: ${src.name}`);
  }

  // Create default admin user
  console.log("Creating default admin user...");
  const passwordHash = await bcrypt.hash("admin123", 12);
  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    create: {
      email: "admin@example.com",
      passwordHash,
      name: "Admin",
      isAdmin: true,
    },
    update: {},
  });
  console.log("  Created admin user: admin@example.com / admin123");

  console.log("\nSeed completed successfully!");
  console.log(`  - ${verticals.length} verticals`);
  console.log(`  - ${competitorsConfig.competitors.length} competitors`);
  console.log(`  - ${sourcesConfig.sources.length} sources`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
