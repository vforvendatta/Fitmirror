# Task 2-A · full-stack-developer · Work Record

## Scope
Built the entire FitMirror backend: 4 lib modules + 5 API route handlers. API contract is FIXED and implemented exactly per task spec.

## Files created (all under `/home/z/my-project`)
| Path | Purpose |
|---|---|
| `src/lib/session.ts` | `getSession()` — anonymous cookie session, creates+sets `fm_session` httpOnly cookie, bumps lastActive |
| `src/lib/usage.ts` | `todayUTC()`, `getTodayUsage(sessionId) → UsageDTO`, `incrementUsage(sessionId)` — free tier = 3/day |
| `src/lib/images.ts` | `saveDataUrl()`, `saveBase64Image()`, `resolveGarmentImage()` — writes to `public/uploads/`, handles data URLs AND `/discover/*.png` paths |
| `src/lib/ai-tryon.ts` | `runTryOn({personBuffer, garmentBuffer}) → {report, resultImageBase64}` — VLM person analysis + VLM garment analysis (parallel) + LLM reasoning → StyleReport + image gen 768x1344 with one retry. `extractJson()` helper strips ```json fences and never crashes. |
| `src/app/api/tryon/route.ts` | POST: session → usage check (402 if exceeded) → save person data URL → resolve garment → runTryOn → save result → DB TryOn row → incrementUsage → `{tryOnId, resultImageUrl, report}` (200). AI failure → 500 `{error}`. |
| `src/app/api/usage/route.ts` | GET → `UsageDTO` (200) |
| `src/app/api/wardrobe/route.ts` | GET (list, newest first) · POST `{tryOnId,name,notes?}` (404 if not owned) · DELETE `?id=` (404 if not owned) |
| `src/app/api/history/route.ts` | GET → `HistoryDTO[]` newest first, limit 30, `report` parsed back to object |
| `src/app/api/discover/route.ts` | GET → static 6-item `DiscoverItem[]` |

## API contract (verbatim implemented)
- `POST /api/tryon` body `{personImage:dataURL, garmentImage:dataURL|/discover/...path, garmentName?}` → 200 `{tryOnId, resultImageUrl, report:StyleReport}` · 402 `{error:'Free limit reached', usage:UsageDTO}` · 500 `{error}`
- `GET /api/usage` → 200 `UsageDTO {used, limit, remaining, plan}`
- `GET /api/wardrobe` → 200 `WardrobeItemDTO[]`
- `POST /api/wardrobe` body `{tryOnId, name, notes?}` → 200 `WardrobeItemDTO` · 404 `{error:'Try-on not found'}`
- `DELETE /api/wardrobe?id=` → 200 `{ok:true}` · 404 `{error:'Wardrobe item not found'}`
- `GET /api/history` → 200 `HistoryDTO[]` (limit 30, report parsed)
- `GET /api/discover` → 200 `DiscoverItem[]` (6 static items, ids d1..d6)

## Verification
- `bun run lint` → 0 errors, 0 warnings (clean).
- curl smoke tests against dev server (port 3000) all passed:
  - `/api/discover` → 200, 6 items.
  - `/api/usage` → 200 `{used:0,limit:3,remaining:3,plan:'free'}`, httpOnly `fm_session` cookie set.
  - `/api/history` + `/api/wardrobe` (with cookie) → 200 `[]`, session resume confirmed.
  - `POST /api/wardrobe {tryOnId:'nonexistent',name:'Test'}` → 404 `{"error":"Try-on not found"}`.
  - `POST /api/tryon {personImage:'not-a-data-url',...}` → 400 `{"error":"personImage must be a data URL"}`.
- dev.log shows Prisma queries executing correctly (Session insert/lookup, UsageLog lookup, TryOn/WardrobeItem queries).

## Constraints honored
- Did NOT modify `src/app/page.tsx`, `src/app/layout.tsx`, `prisma/schema.prisma`, `src/lib/types.ts`.
- No tests written.
- `z-ai-web-dev-sdk` used server-side only (only inside `ai-tryon.ts` and `api/tryon/route.ts`).
- `await cookies()` (Next 16 async pattern) used in `session.ts`.
- No `'use server'` directives — these are route handlers, not server actions.

## Notes for downstream agents (Task 3 — Studio UI)
- `runTryOn` can take 10–30s end-to-end (2 VLM + 1 LLM + 1 image gen). UI should show a clear loading state and the request should NOT be aborted early.
- Free tier limit is enforced server-side (`402` status). Show upgrade CTA when `usage.remaining === 0`.
- All image URLs returned are relative paths under `/uploads/` (or `/discover/` for the static gallery) — safe to use directly in `<img src>`.
- `POST /api/wardrobe` requires a real `tryOnId` from a prior successful `/api/tryon` call.
- Cookie `fm_session` is httpOnly so it can't be read client-side — that's intentional; client just makes requests and the cookie travels automatically.
