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

const watsonxConfigurationHint =
  "Granite generation is not configured. Add WATSONX_API_KEY, WATSONX_PROJECT_ID, WATSONX_REGION, and WATSONX_MODEL_ID in Replit Secrets, then restart the API workflow.";

function getPrimaryEvidence(evidence: WasteEvidence) {
  return {
    category: evidence.category,
    recommendedDisposal: evidence.disposalMethod,
    why: evidence.reason,
    safetyGuidance: evidence.safetyGuidance,
    sustainabilityImpact: evidence.sustainabilityImpact,
  };
}

function getWatsonxConfig() {
  const apiKey = process.env.WATSONX_API_KEY;
  const projectId = process.env.WATSONX_PROJECT_ID;
  const region = process.env.WATSONX_REGION;
  const modelId = process.env.WATSONX_MODEL_ID ?? process.env.WATSONX_MODEL;

  if (!apiKey && !projectId && !region && !modelId) return null;
  if (!apiKey || !projectId || !region || !modelId) {
    throw new Error(watsonxConfigurationHint);
  }

  return {
    apiKey,
    projectId,
    region,
    modelId,
    generationUrl:
      process.env.WATSONX_API_URL ??
      `https://${region}.ml.cloud.ibm.com/ml/v1/text/generation?version=2024-05-31`,
  };
}

async function getWatsonxAccessToken(apiKey: string): Promise<string> {
  const response = await fetch(
    process.env.WATSONX_IAM_TOKEN_URL ?? "https://iam.cloud.ibm.com/identity/token",
    {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ibm:params:oauth:grant-type:apikey",
      apikey: apiKey,
    }),
    signal: AbortSignal.timeout(12_000),
    },
  );

  if (!response.ok) {
    throw new Error(`IBM Cloud IAM token exchange failed with status ${response.status}`);
  }

  const payload = (await response.json()) as { access_token?: unknown };
  if (typeof payload.access_token !== "string" || payload.access_token.length === 0) {
    throw new Error("IBM Cloud IAM did not return an access token");
  }

  return payload.access_token;
}

async function generateWithWatsonx(
  question: string,
  evidence: WasteEvidence[],
): Promise<GeneratedGuidance | null> {
  const config = getWatsonxConfig();
  if (!config) return null;

  const context = formatEvidenceContext(evidence);
  const prompt = [
    "You are a careful waste-management assistant using retrieved evidence.",
    "The retrieved evidence is authoritative for this answer. Do not invent facts, collection locations, or disposal services.",
    "If waste-management rules can vary by location, tell the user to verify local guidance.",
    "Answer the user's question in natural language and include exactly these labeled sections:",
    "Waste Category:",
    "Recommended Disposal Method:",
    "Why:",
    "Safety / Handling Guidance:",
    "Sustainability Impact:",
    `User question:\n${question}`,
    `Retrieved knowledge-base context:\n${context}`,
  ].join("\n\n");

  const accessToken = await getWatsonxAccessToken(config.apiKey);
  const response = await fetch(config.generationUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model_id: config.modelId,
      input: prompt,
      project_id: config.projectId,
      parameters: {
        decoding_method: "sample",
        max_new_tokens: 300,
        min_new_tokens: 80,
        temperature: 0.2,
        repetition_penalty: 1.05,
      },
    }),
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    throw new Error(`AI provider returned ${response.status}`);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const generations = payload.results as Array<Record<string, unknown>> | undefined;
  const generatedText = generations?.[0]?.generated_text;

  if (typeof generatedText !== "string" || generatedText.trim().length === 0) {
    throw new Error("AI provider returned no generated text");
  }

  return { response: generatedText.trim(), provider: "IBM Granite (watsonx)" };
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
    watsonxConfigurationHint,
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
      generated = await generateWithWatsonx(question, evidence);
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