import { AICapability, Priority, VerificationStatus, TrustTier } from "@prisma/client";
import { loadCompetitorsConfig, CompetitorConfig } from "./config";
import { truncateText } from "./utils";

interface RawItemWithSource {
  id: string;
  url: string;
  title: string | null;
  rawText: string | null;
  source: {
    trustTier: TrustTier;
    name: string;
  };
}

export interface AnalysisResult {
  competitorName: string | null;
  verticals: string[];
  aiCapabilities: AICapability[];
  summary: string;
  keyPoints: string[];
  whyItMatters: string;
  recommendedActions: string[];
  priority: Priority;
  confidenceScore: number;
  verificationStatus: VerificationStatus;
  citations: { url: string; title: string; retrievedAt: string }[];
}

// AI capability detection patterns
const AI_CAPABILITY_PATTERNS: Record<AICapability, RegExp[]> = {
  AI_VOICE_AGENT: [
    /voice\s*(ai|agent|assistant|bot)/i,
    /ai\s*voice/i,
    /conversational\s*ai.*voice/i,
    /phone\s*(ai|bot|agent)/i,
    /virtual\s*receptionist/i,
    /ai\s*calling/i,
    /voice\s*automation/i,
  ],
  AI_CHAT_AGENT: [
    /chat\s*(ai|bot|agent)/i,
    /ai\s*chat/i,
    /conversational\s*ai/i,
    /live\s*chat.*ai/i,
    /messaging\s*ai/i,
    /ai\s*messaging/i,
  ],
  AI_LEAD_RESPONSE: [
    /lead\s*response.*ai/i,
    /ai.*lead\s*(response|follow|nurtur)/i,
    /instant\s*lead/i,
    /automated\s*lead/i,
    /lead\s*engagement/i,
  ],
  AI_SCHEDULING_BOOKING: [
    /ai\s*schedul/i,
    /schedul.*ai/i,
    /ai\s*book/i,
    /book.*ai/i,
    /automated\s*schedul/i,
    /smart\s*schedul/i,
    /intelligent\s*schedul/i,
  ],
  AI_DISPATCH_ROUTING: [
    /ai\s*dispatch/i,
    /dispatch.*ai/i,
    /intelligent\s*routing/i,
    /ai\s*rout/i,
    /smart\s*dispatch/i,
    /automated\s*dispatch/i,
  ],
  AI_MARKETING_AUTOMATION: [
    /ai\s*market/i,
    /market.*ai/i,
    /ai\s*campaign/i,
    /automated\s*market/i,
    /intelligent\s*market/i,
    /ai\s*email/i,
    /ai\s*sms/i,
  ],
  AI_REPUTATION_REVIEWS: [
    /ai\s*review/i,
    /review.*ai/i,
    /reputation.*ai/i,
    /ai\s*reputation/i,
    /sentiment\s*analysis/i,
    /review\s*management.*ai/i,
  ],
  AI_ANALYTICS_INSIGHTS: [
    /ai\s*analytic/i,
    /analytic.*ai/i,
    /ai\s*insight/i,
    /predictive\s*analytic/i,
    /ai\s*reporting/i,
    /intelligent\s*analytic/i,
    /data\s*ai/i,
  ],
  AI_PAYMENTS_COLLECTIONS: [
    /ai\s*payment/i,
    /payment.*ai/i,
    /ai\s*collection/i,
    /collection.*ai/i,
    /automated\s*billing/i,
    /smart\s*payment/i,
  ],
  AI_WORKFLOW_AUTOMATION: [
    /ai\s*workflow/i,
    /workflow.*ai/i,
    /process\s*automation.*ai/i,
    /ai\s*automation/i,
    /intelligent\s*workflow/i,
    /ai\s*process/i,
  ],
};

// Priority detection patterns
const P0_PATTERNS = [
  /launch/i,
  /announc/i,
  /acqui/i,
  /merger/i,
  /pricing\s*(change|update|new)/i,
  /major\s*(update|release|feature)/i,
  /revolutionary/i,
  /game\s*chang/i,
  /industry\s*first/i,
  /raises?\s*\$?\d+\s*(million|m|billion|b)/i,
  /funding\s*round/i,
  /series\s*[a-z]/i,
];

const P1_PATTERNS = [
  /new\s*feature/i,
  /improvement/i,
  /enhanc/i,
  /updat/i,
  /integrat/i,
  /partner/i,
  /expand/i,
  /add.*capabilit/i,
  /beta/i,
  /early\s*access/i,
];

function detectAICapabilities(text: string): AICapability[] {
  const capabilities: Set<AICapability> = new Set();

  for (const [capability, patterns] of Object.entries(AI_CAPABILITY_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        capabilities.add(capability as AICapability);
        break;
      }
    }
  }

  // If no specific AI capability found but text mentions AI generally
  if (capabilities.size === 0 && /\bai\b/i.test(text)) {
    capabilities.add("AI_WORKFLOW_AUTOMATION");
  }

  return Array.from(capabilities);
}

function detectPriority(text: string, aiCapabilities: AICapability[]): Priority {
  // Check for P0 patterns
  for (const pattern of P0_PATTERNS) {
    if (pattern.test(text)) {
      return "P0";
    }
  }

  // Check for P1 patterns
  for (const pattern of P1_PATTERNS) {
    if (pattern.test(text)) {
      return "P1";
    }
  }

  // If significant AI capability, at least P1
  if (aiCapabilities.includes("AI_VOICE_AGENT")) {
    return "P1";
  }

  return "P2";
}

function detectCompetitor(
  text: string,
  competitors: CompetitorConfig[]
): CompetitorConfig | null {
  const textLower = text.toLowerCase();

  for (const competitor of competitors) {
    // Check name
    if (textLower.includes(competitor.name.toLowerCase())) {
      return competitor;
    }

    // Check keywords
    for (const keyword of competitor.keywords) {
      if (textLower.includes(keyword.toLowerCase())) {
        return competitor;
      }
    }
  }

  return null;
}

function calculateConfidence(
  items: RawItemWithSource[],
  verificationStatus: VerificationStatus
): number {
  let score = 3; // Base score

  // Adjust based on source trust
  const highTrustCount = items.filter((i) => i.source.trustTier === "HIGH").length;
  const mediumTrustCount = items.filter((i) => i.source.trustTier === "MEDIUM").length;

  if (highTrustCount >= 2) score += 1;
  if (highTrustCount >= 1) score += 0.5;
  if (mediumTrustCount >= 2) score += 0.5;

  // Adjust based on verification
  if (verificationStatus === "VERIFIED") score += 1;
  if (verificationStatus === "CLAIM_UNVERIFIED") score -= 0.5;

  // Adjust based on corroboration
  if (items.length >= 3) score += 0.5;

  return Math.min(5, Math.max(1, Math.round(score)));
}

function determineVerificationStatus(
  items: RawItemWithSource[],
  hasAIClaims: boolean
): VerificationStatus {
  if (!hasAIClaims) {
    return "VERIFIED";
  }

  // AI claims need official docs or 2+ independent sources
  const hasOfficialSource = items.some((i) => i.source.trustTier === "HIGH");
  const uniqueSources = new Set(items.map((i) => i.source.name)).size;

  if (hasOfficialSource || uniqueSources >= 2) {
    return "VERIFIED";
  }

  return "CLAIM_UNVERIFIED";
}

function generateExtractiveSummary(items: RawItemWithSource[]): string {
  // Combine all text
  const allText = items
    .map((item) => item.rawText || item.title || "")
    .join(" ");

  // Split into sentences
  const sentences = allText.match(/[^.!?]+[.!?]+/g) || [];

  if (sentences.length === 0) {
    return items[0]?.title || "No summary available";
  }

  // Score sentences by keyword relevance
  const importantKeywords = [
    "ai",
    "voice",
    "launch",
    "announce",
    "new",
    "feature",
    "update",
    "release",
    "integration",
    "platform",
    "automat",
    "intelligen",
  ];

  const scoredSentences = sentences.map((sentence) => {
    const lowerSentence = sentence.toLowerCase();
    let score = 0;
    for (const keyword of importantKeywords) {
      if (lowerSentence.includes(keyword)) score++;
    }
    return { sentence: sentence.trim(), score };
  });

  // Sort by score and take top sentences
  scoredSentences.sort((a, b) => b.score - a.score);
  const topSentences = scoredSentences.slice(0, 3).map((s) => s.sentence);

  return truncateText(topSentences.join(" "), 500);
}

function generateKeyPoints(items: RawItemWithSource[]): string[] {
  const points: string[] = [];
  const allText = items
    .map((item) => item.rawText || item.title || "")
    .join(" ");
  const sentences = allText.match(/[^.!?]+[.!?]+/g) || [];

  // Find sentences with key indicators
  const indicators = [
    { pattern: /now\s+(offer|support|include|feature)/i, prefix: "Now offers" },
    { pattern: /new\s+(feature|capability|function)/i, prefix: "New capability" },
    { pattern: /integrat/i, prefix: "Integration" },
    { pattern: /launch/i, prefix: "Launch" },
    { pattern: /announc/i, prefix: "Announcement" },
  ];

  for (const sentence of sentences.slice(0, 20)) {
    for (const indicator of indicators) {
      if (indicator.pattern.test(sentence) && points.length < 5) {
        points.push(truncateText(sentence.trim(), 150));
        break;
      }
    }
  }

  // Ensure at least one key point
  if (points.length === 0 && sentences.length > 0 && sentences[0]) {
    points.push(truncateText(sentences[0].trim(), 150));
  }

  return points;
}

function generateWhyItMatters(
  competitor: CompetitorConfig | null,
  aiCapabilities: AICapability[],
  priority: Priority
): string {
  const parts: string[] = [];

  if (priority === "P0") {
    parts.push("This is a significant development that could shift competitive dynamics.");
  } else if (priority === "P1") {
    parts.push("This represents meaningful progress in competitive capabilities.");
  }

  if (competitor) {
    parts.push(`${competitor.name} is active in ${competitor.verticals.join(", ")}.`);
  }

  if (aiCapabilities.includes("AI_VOICE_AGENT")) {
    parts.push("Voice AI capabilities are a key differentiator in the market.");
  }

  if (aiCapabilities.length > 0) {
    const capList = aiCapabilities
      .map((c) => c.replace("AI_", "").replace(/_/g, " ").toLowerCase())
      .join(", ");
    parts.push(`AI capabilities involved: ${capList}.`);
  }

  return parts.join(" ") || "Monitor for potential competitive impact.";
}

function generateRecommendedActions(
  priority: Priority,
  aiCapabilities: AICapability[]
): string[] {
  const actions: string[] = [];

  if (priority === "P0") {
    actions.push("Schedule executive briefing to discuss implications");
    actions.push("Assess competitive response options");
    actions.push("Monitor customer sentiment and reactions");
  } else if (priority === "P1") {
    actions.push("Add to next competitive review agenda");
    actions.push("Evaluate feature for potential roadmap consideration");
  }

  if (aiCapabilities.includes("AI_VOICE_AGENT")) {
    actions.push("Benchmark voice AI capabilities");
  }

  if (actions.length === 0) {
    actions.push("Continue monitoring for developments");
  }

  return actions;
}

export async function analyzeCluster(
  items: RawItemWithSource[]
): Promise<AnalysisResult> {
  const competitors = loadCompetitorsConfig();

  // Combine text for analysis
  const combinedText = items
    .map((item) => `${item.title || ""} ${item.rawText || ""}`)
    .join(" ");

  // Detect competitor
  const competitor = detectCompetitor(combinedText, competitors);

  // Detect AI capabilities
  const aiCapabilities = detectAICapabilities(combinedText);

  // Determine if there are AI claims
  const hasAIClaims = aiCapabilities.length > 0;

  // Determine verification status
  const verificationStatus = determineVerificationStatus(items, hasAIClaims);

  // Detect priority
  const priority = detectPriority(combinedText, aiCapabilities);

  // Calculate confidence
  const confidenceScore = calculateConfidence(items, verificationStatus);

  // Generate summary (extractive without LLM)
  const summary = generateExtractiveSummary(items);

  // Generate key points
  const keyPoints = generateKeyPoints(items);

  // Generate why it matters
  const whyItMatters = generateWhyItMatters(competitor, aiCapabilities, priority);

  // Generate recommended actions
  const recommendedActions = generateRecommendedActions(priority, aiCapabilities);

  // Build citations
  const citations = items.map((item) => ({
    url: item.url,
    title: item.title || item.source.name,
    retrievedAt: new Date().toISOString(),
  }));

  return {
    competitorName: competitor?.name || null,
    verticals: competitor?.verticals || [],
    aiCapabilities,
    summary,
    keyPoints,
    whyItMatters,
    recommendedActions,
    priority,
    confidenceScore,
    verificationStatus,
    citations,
  };
}

// Optional: LLM-powered analysis when API key is available
export async function analyzeClusterWithLLM(
  items: RawItemWithSource[]
): Promise<AnalysisResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  // TODO: Implement OpenAI-powered analysis
  // For now, fall back to extractive analysis
  return null;
}
