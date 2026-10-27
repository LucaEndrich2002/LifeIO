# LifeOS repository rules

Read `README.md`, `docs/product/PRD.md` and `docs/product/ROADMAP.md` for product scope. Architecture lives in `docs/architecture/`; local setup lives in `docs/DEVELOPMENT.md`.

- Work in small, reviewable increments on a task branch. Follow the user's authorized scope; do not start later product phases automatically.
- Use Next.js App Router, React, TypeScript strict mode, pnpm, Tailwind, shadcn/ui, Supabase/PostgreSQL and Zod. Keep the modular monolith; no microservices.
- Keep routes thin, feature UI in `src/features`, reusable UI in `src/components`, pure rules in `src/domain` and privileged code in `src/server`. Add folders only when they contain useful code. Domain code must not import React, Next.js or Supabase.
- Server Components are the default. Use client components only for browser interaction. Mark server modules with `server-only`. Do not introduce unused dependencies or speculative abstractions.
- Validate external input server-side. Verify identity and ownership for each data operation; require RLS and cross-user integration tests with the first user-owned table. Never use a service-role client for ordinary user requests.
- Keep secrets out of Git, public environment variables, logs and client code. `.env.example` contains placeholders only. Never log raw financial data or tokens.
- Persist money as integer minor units with explicit currency and bounds; never perform monetary arithmetic on decimal JavaScript numbers. Define date/zone boundaries and test them.
- AI gets explicit, authorized application tools, never arbitrary SQL. Future writes/deletes need validated arguments, server-side authorization and visible user confirmation.
- Implement relevant Acceptance Criteria; include loading, empty and error states, keyboard access and responsive behavior. Do not present mock values as real user data.
- Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` and `pnpm format:check`; run `pnpm test:e2e` for affected user flows. Document any external blocker accurately. Do not weaken checks to hide failures.
- Review the diff for scope, security, types, duplication, dependencies and configuration. Update documentation when behavior or architecture changes.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
