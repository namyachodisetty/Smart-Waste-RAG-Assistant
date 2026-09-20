import { Router, type IRouter } from "express";
import { AnalyzeWasteBody } from "@workspace/api-zod";
import {
  formatEvidenceContext,
  retrieveWasteEvidence,
  type WasteEvidence,
} from "../lib/waste-retrieval";

const router: IRouter = Router();

const examples = [
  "I have a broken mobile charger. What should I do?",
  "Where should I dispose of a banana peel?",
  "Can a cardboard box be recycled?",
  "What should I do with an old battery?",
  "How should I dispose of an expired medicine?",
];

type GeneratedGuidance = {
  response: string;
  provider: string;
};

function getPrimaryEvidence(evidence: WasteEvidence) {
  return {
    category: evidence.category,
    recommendedDisposal: evidence.disposalMethod,
    why: evidence.reason,
    safetyGuidance: evidence.safetyGuidance,
    sustainabilityImpact: evidence.sustainabilityImpact,
  };
}

async function generateWithConfiguredProvider(
  question: string,
  evidence: WasteEvidence[],
): Promise<GeneratedGuidance | null> {
  const apiUrl = process.env.AI_API_URL ?? process.env.WATSONX_API_URL;
  const apiKey = process.env.AI_API_KEY ?? process.env.WATSONX_API_KEY;
  if (!apiUrl || !apiKey) return null;

  const provider = process.env.AI_PROVIDER ?? "configured AI provider";
  const context = formatEvidenceContext(evidence);
  const prompt = [
    "You are a careful waste-management assistant.",
    "Answer only from the retrieved evidence below. If local rules may differ, say so.",
    "Do not invent collection services, addresses, or claims that are not supported.",
    `User question: ${question}`,
    `Retrieved evidence:\n${context}`,
    "Write a concise recommendation with these labels: Category, Recommended disposal, Why, Safety, Sustainability impact.",
  ].join("\n\n");

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL ?? process.env.WATSONX_MODEL ?? "granite",
      messages: [{ role: "user", content: prompt }],
      prompt,
      input: prompt,
      project_id: process.env.WATSONX_PROJECT_ID,
      parameters: { max_new_tokens: 300, temperature: 0.2 },
    }),
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    throw new Error(`AI provider returned ${response.status}`);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const choices = payload.choices as Array<Record<string, unknown>> | undefined;
  const firstChoice = choices?.[0];
  const message = firstChoice?.message as Record<string, unknown> | undefined;
  const generations = payload.results as Array<Record<string, unknown>> | undefined;
  const generatedText =
    (typeof message?.content === "string" && message.content) ||
    (typeof firstChoice?.text === "string" && firstChoice.text) ||
    (typeof generations?.[0]?.generated_text === "string" &&
      generations[0].generated_text);

  if (!generatedText) {
    throw new Error("AI provider returned no generated text");
  }

  return { response: generatedText, provider };
}

function buildRetrievalOnlyResponse(question: string, evidence: WasteEvidence[]): string {
  const primary = evidence[0];
  return [
    `Based on the retrieved guidance for “${question}”:`,
    `Category: ${primary.category}`,
    `Recommended disposal: ${primary.disposalMethod}`,
    `Why: ${primary.reason}`,
    `Safety: ${primary.safetyGuidance}`,
    `Sustainability impact: ${primary.sustainabilityImpact}`,
    "AI generation is not configured, so this recommendation is shown directly from the retrieved knowledge base.",
  ].join("\n\n");
}

router.get("/waste/examples", (_req, res) => {
  res.json({ examples });
});

router.post("/waste/analyze", async (req, res) => {
  const parsed = AnalyzeWasteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please enter a waste question between 3 and 500 characters." });
    return;
  }

  try {
    const { question } = parsed.data;
    const evidence = retrieveWasteEvidence(question);
    const primary = getPrimaryEvidence(evidence[0]);
    let generated: GeneratedGuidance | null = null;

    try {
      generated = await generateWithConfiguredProvider(question, evidence);
    } catch (error) {
      req.log.warn({ err: error }, "AI generation failed; returning retrieval-only guidance");
    }

    res.json({
      question,
      ...primary,
      response: generated?.response ?? buildRetrievalOnlyResponse(question, evidence),
      aiGenerated: Boolean(generated),
      aiProvider: generated?.provider ?? "retrieval-only",
      retrievalCount: evidence.length,
      evidence,
    });
  } catch (error) {
    req.log.error({ err: error }, "Waste analysis failed");
    res.status(500).json({ error: "The waste knowledge base could not be read. Please try again." });
  }
});

export default router;