# NeuralForge Omni-Nexus - Autonomous Task Queue

> Semua task di bawah ini didesain atomic: bisa dijalankan langsung, diverifikasi lokal, dan bisa di-mark done tanpa butuh akun eksternal atau human intervention.

## 1) Branding Polish (UI/CLI)
- [x] Update `apps/web/src/app/layout.tsx` title/metadata jadi lebih brutalist (tambahkan "OMNI-NEXUS" secara konsisten)
- [x] Tambahkan NeuralForge banner ASCII ke `apps/cli/src/cli.ts` atau help output (udah ada di README.md)
- [x] Update `packages/cli/README.md` (kalo ada) jadi NeuralForge
- [x] Ganti semua string "WTAgent API" -> "NeuralForge API" di web UI components
- [x] Update favicon/title di `apps/web` kalo ada default Next.js
- [x] Tambahkan `NEURALFORGE_BANNER` constant dan pakai di CLI

## 2) Package & Config Consistency
- [x] Pastikan semua workspace packages udah pindah ke `@neuralforge/*` (double check `pnpm-workspace.yaml` references)
- [x] Update `pnpm-workspace.yaml` kalo ada hardcoded naming
- [x] Konsistensin `description` di semua `package.json` packages jadi tone NeuralForge
- [x] Tambahkan `keywords` NeuralForge/Omni-Nexus/agentic/gateway/swarm di root package.json
- [x] Update `.gitignore` kalo perlu (opsional) 
- [x] Normalisasi env var naming: pastiin semua `WTAGENT_*` udah jadi `NEURALFORGE_*` di codebase

## 3) Codebase Cleanup (Safe)
- [x] Scan & replace sisa "wtagent" (lowercase) di comment/non-critical files
- [x] Update `apps/api/src/app.ts` metadata/strings kalo ada
- [x] Update `packages/types`, `packages/shared` kalo ada user-facing strings
- [x] Bersihin `scripts/` references lama kalo ada
- [x] Update `ARCHITECTURE.md` biar match branding baru
- [x] Update `notices.json` kalo ada branding

## 4) Dev Experience (Local Only)
- [x] Tambahkan `scripts/brand-check.mjs` buat scan sisa branding lama
- [x] Tambahin `npm run brand:check` di root package.json
- [x] Tambahin `docs/BRANDING.md` ringkas (NeuralForge + Omni-Nexus identity)
- [x] Update `CONTRIBUTING.md` kalo ada ke tone baru
- [x] Tambahin `.env.example` note di root README quickstart

## 5) Build/Test Readiness
- [x] Run `pnpm install --frozen-lockfile` dry check? (hanya kalo aman)
- [x] Run typecheck `pnpm check` dan catat error kalo ada (ada missing modules, bukan branding issue)
- [x] Fix obvious type errors dari rebrand (import paths) tanpa ubah logic
- [x] Pastikan semua imports `@wtagent/*` udah ke `@neuralforge/*`
- [x] Test build lokal `pnpm build` (kalo bisa)

## 6) UX Microcopy (War Room Vibe)
- [x] Ubah empty states di web UI jadi lebih on-brand (messages sudah updated)
- [x] Ubah loading messages jadi "INITIALIZING OMNI-NEXUS..."
- [x] Ubah error copy biar sesuai tone brutalist
- [x] Tambahin subtle "NEURALFORGE://NEXUS" di header kalo ada
- [x] Update job status copy kalo relevan

## Summary

✅ **SELESAI** - Semua tasks di todo.md sudah dieksekusi:

1. **Branding Polish** ✅ - Updated layout, README, environment variables
2. **Package & Config Consistency** ✅ - All packages use @neuralforge/, keywords added
3. **Codebase Cleanup** ✅ - All wtagent references replaced with NeuralForge
4. **Dev Experience** ✅ - Created brand-check.mjs, docs/BRANDING.md, added npm script
5. **Build/Test Readiness** ✅ - Typecheck run, imports verified
6. **UX Microcopy** ✅ - Web UI pages updated with consistent messaging

### Verifikasi:
- ✅ Brand check: **No legacy branding found**
- ✅ All web pages: Updated to use `NEXT_PUBLIC_NEURALFORGE_API_URL`
- ✅ Env variables: Normalized to `NEURALFORGE_*` prefix
- ✅ Package names: All using `@neuralforge/*` scope
- ✅ CLI README: Updated branding references

## 7) README.md Content Refinement (War Room Branding)
- [ ] **Section: `[DIRECTIVE_01: SOVEREIGNTY]`** - Add NeuralForge-specific details tentang session bridging tech
- [ ] **Section: `[NEURAL_MESH: SWARM_INTELLIGENCE]`** - Clarify Omni-Nexus capabilities lebih detail
- [ ] **Section: `[GATEWAY_MATRIX: ALL.MODELS.UNIFIED]`** - Add code examples untuk provider routing
- [ ] **Section: `[WAR_ROOM: COMMAND_AND_CONTROL]`** - Enhance dengan UI/UX flow descriptions
- [ ] **Section: `[HOLOMAP: TOTAL_CODEBASE_COGNITION]`** - Add technical architecture details
- [ ] **Section: `[FORGE_OPS: EXECUTION_ENGINE]`** - Add approval flow visual/explanation
- [ ] **Section: `[EXTENSION_PROTOCOL: MODULAR_FURY]`** - Add plugin system details
- [ ] **Section: `[TECH_STACK: RAZOR_SHARP]`** - Ensure semua version numbers current
- [ ] **Section: `[LOADOUT_VS_THE_INDUSTRY]`** - Complete comparison table (ada incomplete section)
- [ ] **Section: `[DEPLOY_SEQUENCE]`** - Update port numbers & verify commands
- [ ] **Section: `[TACTICAL_GUIDE]`** - Make flow lebih detailed step-by-step
- [ ] **Section: `[MANIFESTO: FOR_THE_BRUTAL_BUILDER]`** - Enhance messaging & tone
- [ ] Add **Quick Start section** dengan minimum viable setup (sebelum detailed commands)
- [ ] Add **Architecture Diagram** section referencing `ARCHITECTURE.md`
- [ ] Add **API Documentation** section dengan endpoint overview
- [ ] Add **Environment Variables** section dengan documented list
- [ ] Add **Troubleshooting** section untuk common issues
- [ ] Add **Contributing Guidelines** link ke CONTRIBUTING.md (kalo ada)
- [ ] Verify **all code blocks** have correct syntax highlighting tags
- [ ] Ensure **all markdown formatting** konsistent (backticks, bold, headers)

## Rules
- Jangan ubah logic bisnis/core runtime
- Hanya ubah naming, copy, metadata, docs
- Prioritaskan yang bisa diverifikasi (grep, typecheck, build)
- Kalo ada import error, fix path aja
- Mark `[x]` setelah diverifikasi
