# AI-Powered Smart Waste Segregation & Recycling Assistant

An AI + Sustainability internship prototype that helps people decide what to do with everyday household and campus waste. The assistant retrieves relevant guidance from a 45-entry CSV knowledge base first, then uses an optional configured AI provider to write a grounded response. When no provider is configured, the retrieval step still works and the app clearly labels the response as retrieval-only.

## Problem statement

Waste is often placed in the wrong bin because disposal instructions are difficult to find or vary by material. This project makes the first decision easier: identify the likely category, explain the disposal route, surface safety precautions, and show the evidence used to reach the recommendation.

## SDG 12 alignment

The project supports UN Sustainable Development Goal 12, Responsible Consumption and Production, by encouraging reuse, recycling, composting, safe hazardous-waste handling, and better-informed disposal decisions.

## Target users

- Students and campus communities
- Households sorting common waste
- Sustainability clubs and internship demonstrations
- Anyone who needs a quick, evidence-backed disposal starting point

## AI usage

The generation step uses IBM Granite through watsonx when configured. The backend exchanges `WATSONX_API_KEY` for a short-lived IBM Cloud IAM access token, then sends the user's question and the retrieved CSV context to the watsonx text-generation endpoint. No API key is committed to the repository and no OpenAI key is required.

Add these variables in Replit Secrets or the environment-variable panel:

- `WATSONX_API_KEY` — the IBM Cloud API key; store this as a Secret.
- `WATSONX_PROJECT_ID` — the watsonx project ID.
- `WATSONX_REGION` — for example `us-south`.
- `WATSONX_MODEL_ID` — for example `ibm/granite-3-8b-instruct`.

`WATSONX_API_URL` is optional; by default it is built from the region. After adding the values, restart the API workflow. If the variables are empty or incomplete, the application does not pretend that a model ran. It returns the retrieved knowledge-base recommendation directly and explains exactly which variables are missing.

## RAG workflow

1. The user submits a waste question.
2. The backend reads `artifacts/api-server/src/data/waste_knowledge_base.csv`.
3. A lightweight token-and-alias retriever scores the CSV rows and selects the most relevant entries.
4. The selected rows are formatted as context.
5. If an AI provider is configured, that context is sent to the provider before generation.
6. The final recommendation and the exact retrieved rows are returned to the interface.

The retrieval result is never hard-coded for the example questions. The same search logic handles new questions.

## Technical architecture

```text
User
  ↓
Waste Question
  ↓
Retriever
  ↓
Waste Knowledge Base (CSV)
  ↓
Relevant Context
  ↓
AI / Granite Model (optional)
  ↓
Final Disposal Recommendation + RAG Evidence
```

### Project structure

- `artifacts/smart-waste-rag/` — React + Vite frontend
- `artifacts/api-server/src/routes/waste.ts` — analyze and examples endpoints
- `artifacts/api-server/src/lib/waste-retrieval.ts` — CSV loading and retrieval logic
- `artifacts/api-server/src/data/waste_knowledge_base.csv` — waste knowledge base
- `lib/api-spec/openapi.yaml` — source of truth for the API contract
- `lib/api-client-react/` — generated React Query client
- `lib/api-zod/` — generated server validation schemas

## Installation and running

This repository uses pnpm.

```bash
pnpm install
pnpm --filter @workspace/api-spec run codegen
```

Copy `.env.example` to your local environment if you want model generation. Keep secrets in environment variables or Replit Secrets; do not put them in source files.

Run the backend and frontend through the configured project workflows, or use:

```bash
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/smart-waste-rag run dev
```

The frontend calls the shared `/api/waste/analyze` route. Both workflows must be running for a live analysis.

## Responsible AI

- **Fairness:** The tool uses the same retrieval process for every user and does not infer identity or sensitive traits.
- **Transparency:** Each answer shows whether AI generation ran and displays the actual retrieved evidence.
- **Privacy:** The app does not request accounts, names, contact details, or unnecessary personal information. Do not submit personal data in a waste question.
- **Accuracy:** Guidance is grounded in the CSV and should be checked against local waste rules, which can vary by location.
- **Safety:** Batteries, medicines, chemicals, sharps, and electronics are directed to authorized or specialized channels where appropriate. Do not burn, dismantle, mix, or flush these materials.

## Expected impact

The prototype demonstrates a simple, explainable way to improve sorting decisions while reducing contamination, unsafe handling, and unnecessary landfill disposal. It is intentionally small enough for a student to explain in a presentation and extend later with local authority sources or embeddings.