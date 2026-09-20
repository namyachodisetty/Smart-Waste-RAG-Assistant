import fs from "node:fs";
import path from "node:path";

export type WasteRecord = {
  wasteItem: string;
  category: string;
  disposalMethod: string;
  reason: string;
  safetyGuidance: string;
  sustainabilityImpact: string;
};

export type WasteEvidence = WasteRecord & {
  relevanceScore: number;
};

const csvPathCandidates = [
  path.resolve(process.cwd(), "src/data/waste_knowledge_base.csv"),
  path.resolve(process.cwd(), "dist/data/waste_knowledge_base.csv"),
  path.resolve(process.cwd(), "artifacts/api-server/src/data/waste_knowledge_base.csv"),
  path.resolve(process.cwd(), "artifacts/api-server/dist/data/waste_knowledge_base.csv"),
  path.resolve(import.meta.dirname, "../data/waste_knowledge_base.csv"),
];

const stopWords = new Set([
  "a",
  "an",
  "and",
  "are",
  "be",
  "can",
  "do",
  "for",
  "how",
  "i",
  "in",
  "is",
  "it",
  "me",
  "of",
  "old",
  "the",
  "to",
  "what",
  "where",
  "with",
  "would",
]);

const aliases: Record<string, string[]> = {
  charger: ["chargers", "cable", "electronic", "e-waste"],
  battery: ["batteries", "lithium-ion", "electronic"],
  phone: ["mobile", "mobile phones", "electronic"],
  medicine: ["medicines", "pharmaceutical", "expired"],
  box: ["cardboard"],
  peel: ["banana", "fruit", "organic"],
  bottle: ["bottles", "glass", "plastic"],
  can: ["cans", "metal", "aluminum"],
  clothes: ["clothing", "textile", "shoes"],
  tissue: ["tissues", "paper towel"],
  garbage: ["waste", "mixed waste"],
};

function findCsvPath(): string {
  const csvPath = csvPathCandidates.find((candidate) => fs.existsSync(candidate));
  if (!csvPath) {
    throw new Error("Waste knowledge base CSV could not be found.");
  }
  return csvPath;
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && inQuotes && nextCharacter === '"') {
      current += '"';
      index += 1;
    } else if (character === '"') {
      inQuotes = !inQuotes;
    } else if (character === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }

  cells.push(current.trim());
  return cells;
}

function loadKnowledgeBase(): WasteRecord[] {
  const [headerLine, ...dataLines] = fs
    .readFileSync(findCsvPath(), "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
  const headers = parseCsvLine(headerLine);
  const indexOf = (name: string) => headers.findIndex((header) => header === name);

  return dataLines.map((line) => {
    const cells = parseCsvLine(line);
    return {
      wasteItem: cells[indexOf("Waste Item")] ?? "",
      category: cells[indexOf("Category")] ?? "",
      disposalMethod: cells[indexOf("Disposal Method")] ?? "",
      reason: cells[indexOf("Reason")]?.trim() ?? "",
      safetyGuidance: cells[indexOf("Safety Guidance")] ?? "",
      sustainabilityImpact: cells[indexOf("Sustainability Impact")] ?? "",
    };
  });
}

function normalizeTokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !stopWords.has(token));
}

function scoreRecord(question: string, record: WasteRecord): number {
  const questionTokens = normalizeTokens(question);
  const searchableText = Object.values(record).join(" ").toLowerCase();
  const itemText = record.wasteItem.toLowerCase();
  let score = 0;

  for (const token of questionTokens) {
    if (itemText.includes(token)) score += 5;
    else if (searchableText.includes(token)) score += 2;

    for (const alias of aliases[token] ?? []) {
      if (searchableText.includes(alias)) score += 2;
    }
  }

  if (question.toLowerCase().includes(record.wasteItem.toLowerCase())) {
    score += 8;
  }

  return score;
}

export function retrieveWasteEvidence(question: string, limit = 3): WasteEvidence[] {
  const records = loadKnowledgeBase();
  const scored = records
    .map((record) => ({ record, score: scoreRecord(question, record) }))
    .sort((left, right) => right.score - left.score);
  const topScore = scored[0]?.score ?? 0;
  const selected = scored.filter(({ score }) => score > 0).slice(0, limit);
  const fallback = selected.length > 0 ? selected : scored.slice(0, 1);

  return fallback.map(({ record, score }) => ({
    ...record,
    relevanceScore: topScore > 0 ? Number((score / topScore).toFixed(2)) : 0,
  }));
}

export function formatEvidenceContext(evidence: WasteEvidence[]): string {
  return evidence
    .map(
      (entry, index) =>
        `Evidence ${index + 1}\nWaste Item: ${entry.wasteItem}\nCategory: ${entry.category}\nDisposal Method: ${entry.disposalMethod}\nReason: ${entry.reason}\nSafety Guidance: ${entry.safetyGuidance}\nSustainability Impact: ${entry.sustainabilityImpact}`,
    )
    .join("\n\n");
}