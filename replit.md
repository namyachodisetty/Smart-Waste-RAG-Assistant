# AI-Powered Smart Waste Segregation & Recycling Assistant

A CSV-grounded waste disposal assistant that retrieves relevant guidance before optionally generating an AI response.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Optional env: `WATSONX_API_KEY`, `WATSONX_PROJECT_ID`, `WATSONX_REGION`, and `WATSONX_MODEL_ID` as documented in `.env.example`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- Frontend: `artifacts/smart-waste-rag/`
- Waste API: `artifacts/api-server/src/routes/waste.ts`
- Retrieval logic: `artifacts/api-server/src/lib/waste-retrieval.ts`
- Knowledge base: `artifacts/api-server/src/data/waste_knowledge_base.csv`
- API source of truth: `lib/api-spec/openapi.yaml`

## Architecture decisions

- Retrieval uses a transparent token-and-alias scorer over CSV rows so a student can explain the RAG step without a vector database.
- AI generation is optional and receives the retrieved rows as explicit context; retrieval-only mode remains honest when no provider is configured.
- The UI exposes the selected evidence so recommendations can be inspected rather than treated as opaque chatbot output.

## Product

Users submit a waste question, receive a category and disposal recommendation, and can inspect the retrieved waste knowledge-base rows behind the answer.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
