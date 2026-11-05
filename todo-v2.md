# DX Platform v2 — Autonomous Developer Operating System Backlog

> **Repository:** https://github.com/bjo163/dx-platform  
> **Canonical branch:** main  
> **Status dokumen:** backlog eksekusi baru; semua task belum diverifikasi  
> **Disusun:** 2026-11-05  
> **Product direction:** Rocksoul DX — Autonomous Developer Operating System  
> **North star:** One goal. Many agents. Any model. Verified outcomes.

---

## 0. Tujuan akhir

Membangun platform autonomous software engineering yang menggabungkan kemampuan penting dari beberapa kategori produk ke dalam satu sistem yang konsisten:

1. **Coding-agent execution** — merencanakan, memahami repository, mengubah kode, menjalankan tool, menguji, dan memperbaiki.
2. **Agent workforce/control plane** — mission, task hierarchy, agent roles, scheduling, budgets, approvals, heartbeat, pause/resume, dan audit.
3. **Universal model/provider gateway** — model lokal, API providers, dan browser-session adapters melalui interface seragam, dengan routing berbasis capability, privacy, quality, quota, cost, dan latency.
4. **Repository intelligence** — Repo Atlas memahami file, symbol, import, dependency, tests, dan dampak perubahan.
5. **Proof-first delivery** — perubahan tidak dianggap selesai sebelum verifikasi independen, evidence bundle, dan kaitan ke diff/commit/CI.
6. **Developer operations** — CLI, Web War Room, API, SDK, MCP, plugin adapters, CI, packaging, backup, recovery, dan release workflow.

**Jangan mencoba mengalahkan foundation model Codex/Qoder/Claude/Gemini.** Targetnya adalah membuat system-level outcome lebih baik: task selesai dengan benar, aman, cepat, dapat dipulihkan, dan memiliki bukti. Codex, Qoder, Claude Code, OpenCode, Aider, model lokal, dan provider lain diperlakukan sebagai engine/adapters yang dapat dipilih—bukan sistem yang harus disalin.

### 0.1 Enam plane arsitektur target

| Plane | Tanggung jawab | Keunggulan yang harus dibuktikan |
|---|---|---|
| Control Plane | Mission Control, goal, project, task tree, budget, approval, scheduling | Satu tempat mengatur pekerjaan agent |
| Orchestration Plane | DAG, dependency, queue, lease, retry, checkpoint, fairness | Pekerjaan panjang teratur dan recoverable |
| Execution Plane | Native runtime, agent adapters, tools, worktree/container isolation | Banyak agent bekerja tanpa saling merusak |
| Intelligence Plane | Provider registry, model router, quota, health, capability, cost | Model yang tepat untuk task yang tepat |
| Knowledge & Proof Plane | Repo Atlas, memory, evidence graph, independent verifier | Context tepat dan hasil dapat dibuktikan |
| Governance & Operations Plane | Permission, secrets, audit, persistence, observability, backup, release | Aman dijalankan secara autonomous |

Enam plane adalah target modular, bukan instruksi untuk membuat enam package baru. Reuse package/folder yang sudah ada. Tambah package hanya setelah audit membuktikan tidak ada tempat tepat dan batas modul baru memang diperlukan.

### 0.2 Product principles

- **Proof over claims:** agent tidak dapat menandai dirinya sendiri sebagai verified.
- **Local-first, privacy-honest:** workspace, runtime, index, dan data control dapat berjalan lokal. Provider web/API adalah pihak ketiga dan dapat menerima prompt/konteks yang dikirim.
- **No silent cloud fallback:** request local-only tidak boleh keluar ke jaringan.
- **Model-agnostic:** provider adalah adapter, bukan pusat domain model.
- **Small tasks, fast feedback:** setiap task dapat dikerjakan AI kecil dalam satu sesi pendek.
- **One source of truth:** database/runtime adalah sumber state; UI, logs, dan provider hanya projections.
- **Least privilege:** filesystem, process, network, browser, dan secrets memiliki scope terpisah.
- **Evidence before merge:** diff, targeted tests, broader gates, security checks, commit SHA, dan CI dapat ditelusuri.
- **No duplicate systems:** reuse existing package, route, schema, registry, adapter, dan test sebelum menambah implementasi.
- **Compatibility first:** tidak ada global rename, framework/database replacement, atau public API break tanpa migrasi terukur.
- **No fake completeness:** folder, stub, mock, UI card, atau README bukan bukti fitur selesai.

### 0.3 Competitive target and honesty

Target pembanding adalah outcome gabungan kategori produk, bukan klaim promosi tanpa benchmark:
- Codex / Qoder / Claude Code / OpenCode: coding-agent capability dan engineering workflow.
- Paperclip dan sistem sejenis: mission, agent workforce, policy, operational control.
- OmniRoute / FreeLLMAPI dan gateway sejenis: provider abstraction, routing, quota, fallback.
- Repo intelligence, memory, evaluation, dan proof systems: context tepat dan hasil terverifikasi.

**Syarat klaim “lebih baik”:** gunakan task set, repository revision, model, prompt, tool budget, dan evaluator yang setara. Ukur verified solve rate, regression rate, time-to-verified-change, cost per accepted change, recovery success, context precision, human interventions, dan security violations. Sebelum ada hasil, tulis planned/unverified, bukan superior.

---

## 1. Cara memakai backlog ini

### 1.1 Sumber kebenaran backlog

- **todo-v2.md adalah backlog eksekusi canonical mulai dari dokumen ini.**
- todo.md adalah backlog legacy/reference. Jangan menjalankan item dari todo.md paralel dengan item v2.
- Saat audit ulang menemukan item legacy relevan, petakan ke ID v2 terdekat; jangan duplikasi pekerjaan atau memindahkan status selesai tanpa evidence.
- Jangan menghapus todo.md. Pertahankan sebagai histori sampai migrasi task selesai dan mapping terdokumentasi.
- Main adalah branch sumber kebenaran. Branch/worktree sementara boleh dipakai untuk isolasi task; hasil final kembali ke main melalui jalur merge yang tersedia.

### 1.2 Ukuran micro-task

Satu task idealnya:
- satu hasil yang dapat diperiksa;
- satu perubahan perilaku atau satu artefak kecil;
- 1–3 file utama (test pendamping diperbolehkan);
- sekitar 5–30 menit untuk AI kecil;
- acceptance criteria eksplisit dan dapat diuji tanpa opini manusia;
- tidak memerlukan keputusan produk baru, credential pribadi, atau layanan berbayar.

**Wajib pecah lagi** task yang memerlukan lebih dari satu deliverable independen, menyentuh lebih dari satu subsystem, atau diperkirakan lebih dari 30 menit. Jangan menggabungkan banyak checkbox demi throughput.

### 1.3 Status dan bukti

Gunakan status checklist:
- [ ] belum dikerjakan atau belum diverifikasi;
- [~] sedang dikerjakan;
- [x] selesai dan seluruh acceptance criteria lulus;
- [!] blocked oleh kondisi teknis/environment yang nyata;
- [-] deferred dengan alasan dan trigger untuk dibuka kembali.

Task hanya boleh [x] setelah mencatat Task ID, file berubah, exact command, exit code, ringkasan hasil, commit SHA, dan CI run SHA bila masuk CI. Jika test tidak dapat dijalankan, jangan klaim lulus; gunakan [!] dan lanjutkan task independen.

### 1.4 Dependency dan paralelisme

- Fase dikerjakan sesuai urutan gate, bukan sekadar nomor.
- Dalam satu fase, AI boleh mengambil task yang tidak saling bergantung dan menyentuh scope berbeda.
- Maksimum satu writer untuk satu worktree; agent berbeda tidak boleh menulis file sama secara bersamaan.
- Prerequisite belum verified berarti task dependent belum READY.
- Task blocked tidak menghentikan task independen.
- Planner wajib memecah task besar menjadi micro-task sebelum eksekusi.
- Setelah setiap micro-task jalankan targeted test; setelah batch kecil jalankan package/root gate relevan.

### 1.5 Kontrak autonomous AI — jangan meminta konfirmasi rutin

AI wajib memutuskan sendiri engineering rutin berdasarkan source, test, konvensi, dan default konservatif:
1. Nama file, variable internal, helper, fixture, dan pilihan library minor yang kompatibel.
2. Implementasi paling sederhana yang memenuhi kontrak dan tidak memperbesar privilege.
3. Perbaikan lint/type/test yang langsung disebabkan task aktif.
4. Penambahan regression test, dokumentasi teknis, sample config, dan mock adapter.
5. Pemecahan task besar; update progress; retry terbatas; commit terfokus.
6. Mock/fixture offline ketika provider credential, browser profile, atau layanan eksternal tidak tersedia.

**Jangan bertanya kepada user** hanya karena ada beberapa pilihan implementasi sama-sama aman. Pilih opsi paling kompatibel, reversible, kecil, dan mudah diuji; catat alasan singkat.

Otorisasi manusia hanya diperlukan untuk hal di luar kewenangan environment: publish package, release publik, deploy production, mengirim data ke pihak eksternal yang belum diizinkan, perubahan akun/credential, pembayaran, penghapusan data persistent, destructive migration, atau memperluas filesystem/network authority. Untuk itu siapkan dry-run/mock/runbook dan lanjutkan task independen; jangan menunggu pekerjaan offline.

### 1.6 Execution loop wajib

read state → select READY task → inspect bounded scope → implement smallest diff → targeted test → independent verification → record evidence → commit → refresh task state → continue.

Jika gagal:
- baca error penuh dan reproduksi;
- perbaiki penyebab, bukan melonggarkan assertion;
- maksimal dua retry otomatis untuk error transient yang sama;
- setelah dua percobaan gagal, buat failure note berisi command, error, hipotesis, dan diagnostic task;
- jangan skip test, menghapus assertion, menambahkan any, mematikan strictness, atau memakai catch kosong demi CI hijau.

### 1.7 Git dan commit rules

- Periksa branch, git status, dan diff sebelum mulai.
- Jangan menimpa perubahan user atau file yang belum di-commit.
- Gunakan branch/worktree terisolasi untuk parallel work; prefix feat/, fix/, atau chore/.
- Maksimal satu tujuan per commit; jangan commit generated cache, build output, browser profile, credential, atau data lokal.
- Jalankan test targeted sebelum commit dan gate relevan sebelum merge.
- Auto-merge task rutin hanya bila repository mengizinkan, CI wajib sukses, verifier independen lulus, tidak ada security finding, dan diff sesuai scope task.
- Jangan force-push, rewrite history, atau menghapus remote branch.
- Bila permission GitHub tidak tersedia, siapkan commit lokal/patch dan catat blocker spesifik; jangan klaim sudah push/merge.

### 1.8 Global Definition of Done

Task tidak selesai hanya karena file dibuat:
1. Acceptance criteria task lulus.
2. Regression test ada untuk perubahan perilaku/bug.
3. Targeted test lulus dengan exit code 0.
4. Build/typecheck/package check relevan lulus.
5. Tidak ada perubahan di luar scope tanpa task terpisah.
6. Tidak ada secret, cookie, credential, prompt sensitif, atau private profile dalam diff/log/artifact.
7. Dokumentasi diperbarui bila public behavior/config/API berubah.
8. Evidence dapat ditelusuri ke task, commit, CI SHA.
9. Status [x] hanya bila semua bukti tersedia; selain itu [!] atau tetap [ ].

---

## 2. Fase dan micro-task

Urutan fase memprioritaskan kestabilan, kontrak, keamanan, dan proof sebelum ekspansi fitur. Fitur besar baru dibuka setelah gate dasar lulus.

## M00 — Re-baseline dan reconciliation — 20 micro-tasks

**Goal:** Pastikan semua keputusan berasal dari kondisi main yang nyata, bukan asumsi backlog lama.
**Gate:** selesaikan task wajib fase ini dan verifikasi gate sebelum fase berikutnya. Task independen boleh diparalelkan.

- [x] **DX2-0001 [P0] Catat SHA main, tanggal, dan commit subject terbaru** — Scope: Git metadata. Done when: Baseline note memuat SHA yang cocok dengan remote main..
- [x] **DX2-0002 [P0] Simpan daftar branch remote yang benar-benar aktif** — Scope: Git metadata. Done when: Daftar branch berasal dari remote..
- [x] **DX2-0003 [P0] Inventaris seluruh workspace package** — Scope: pnpm-workspace.yaml. Done when: Setiap pola workspace terpetakan ke folder yang ada..
- [x] **DX2-0004 [P0] Inventaris package.json pada root, apps, dan packages** — Scope: package manifests. Done when: Nama, versi, script, dan dependency tercatat..
- [x] **DX2-0005 [P0] Inventaris seluruh workflow GitHub Actions** — Scope: .github/workflows/**. Done when: Semua workflow dan trigger tercatat..
- [x] **DX2-0006 [P0] Ambil status CI terbaru untuk SHA main** — Scope: GitHub Actions. Done when: Status sukses/gagal/pending/unknown dinyatakan akurat..
- [x] **DX2-0007 [P0] Ambil log setiap job CI yang gagal** — Scope: GitHub Actions. Done when: Setiap kegagalan memiliki pesan asli atau status unavailable..
- [x] **DX2-0008 [P0] Periksa git status lokal sebelum perubahan** — Scope: Git working tree. Done when: Tidak ada perubahan milik user yang tertimpa..
- [x] **DX2-0009 [P0] Inventaris script root dan package** — Scope: package manifests. Done when: Setiap script punya pemilik package dan fungsi..
- [x] **DX2-0010 [P0] Inventaris env variable yang dibaca runtime** — Scope: apps/**/src, packages/**/src. Done when: Setiap nama env memiliki reader dan default yang diketahui..
- [x] **DX2-0011 [P0] Inventaris endpoint API yang diregistrasikan** — Scope: apps/api/src/**. Done when: Daftar route berasal dari source..
- [x] **DX2-0012 [P0] Inventaris provider adapter yang diregistrasikan** — Scope: packages/browser, packages/gateway. Done when: ID dan capability berasal dari registry aktual..
- [x] **DX2-0013 [P0] Inventaris tool yang benar-benar dapat dipanggil runtime** — Scope: packages/tools, packages/runtime. Done when: Setiap tool memiliki schema, handler, dan policy path..
- [x] **DX2-0014 [P0] Inventaris job lifecycle dan status enum** — Scope: packages/job, packages/types. Done when: State transition aktual tergambar..
- [x] **DX2-0015 [P0] Inventaris persistence schema dan migration** — Scope: packages/database, apps/api. Done when: Tabel dan sumber kebenaran data tercatat..
- [x] **DX2-0016 [P0] Inventaris test suite dan command yang menjalankannya** — Scope: vitest config, package manifests. Done when: Setiap test folder terpetakan ke command..
- [x] **DX2-0017 [P0] Inventaris UI route dan halaman utama** — Scope: apps/web. Done when: Route dan entry point tercatat..
- [x] **DX2-0018 [P0] Identifikasi generated file yang masih tracked** — Scope: Git index, .gitignore. Done when: Generated path dipisahkan dari source penting..
- [x] **DX2-0019 [P0] Bandingkan checkbox todo.md dengan bukti commit dan test** — Scope: todo.md, commit history. Done when: Item tanpa bukti tetap belum verified..
- [x] **DX2-0020 [P0] Tulis baseline audit ringkas** — Scope: .plans/baseline atau docs/internal. Done when: Baseline memuat fakta, unknown, dan bukti tanpa mengubah status task..

## M01 — Repository hygiene dan identity — 20 micro-tasks

**Goal:** Merapikan nama, package graph, lockfile, metadata, dan dokumentasi tanpa mass rename berisiko.
**Gate:** selesaikan task wajib fase ini dan verifikasi gate sebelum fase berikutnya. Task independen boleh diparalelkan.

- [ ] **DX2-0021 [P0] Tetapkan nama tampilan produk sementara Rocksoul DX dan nama repository dx-platform** — Scope: product docs. Done when: Dua identitas dibedakan secara konsisten tanpa rename package massal..
- [ ] **DX2-0022 [P0] Tetapkan perlakuan nama NeuralForge sebagai legacy runtime name** — Scope: README, packages/cli. Done when: Istilah legacy diberi konteks atau dihapus setelah consumer ditemukan..
- [ ] **DX2-0023 [P0] Tetapkan satu package scope canonical berdasarkan dependency graph** — Scope: package manifests. Done when: Keputusan didukung consumer dan seluruh internal import..
- [ ] **DX2-0024 [P0] Buat daftar package yang masih memakai scope lama** — Scope: packages/**/package.json. Done when: Daftar berasal dari manifest aktual..
- [ ] **DX2-0025 [P0] Buat daftar package yang memakai scope baru** — Scope: packages/**/package.json, apps/**/package.json. Done when: Daftar mencakup semua workspace..
- [ ] **DX2-0026 [P0] Samakan dependency internal pada satu package yang terpilih** — Scope: package manifest terkait. Done when: Build dan import consumer tetap lulus..
- [x] **DX2-0027 [P0] Samakan package filter CI dengan nama manifest aktual** — Scope: .github/workflows/ci.yml. Done when: Tidak ada selector package yang salah..
- [x] **DX2-0028 [P0] Samakan smoke-test CLI dengan package name dan binary name** — Scope: .github/workflows/ci.yml. Done when: CI menjalankan CLI lewat selector yang valid..
- [x] **DX2-0029 [P0] Samakan CLI repository URL dengan repository aktif** — Scope: packages/cli/package.json. Done when: Metadata mengarah ke bjo163/dx-platform..
- [x] **DX2-0030 [P0] Samakan CLI homepage URL dengan repository aktif** — Scope: packages/cli/package.json. Done when: Homepage mengarah ke repository aktif..
- [x] **DX2-0031 [P0] Samakan CLI bugs URL dengan repository aktif** — Scope: packages/cli/package.json. Done when: Issue URL mengarah ke repository aktif..
- [x] **DX2-0032 [P0] Verifikasi bin CLI hanya mengekspos command yang diputuskan** — Scope: packages/cli/package.json. Done when: Manifest, test, dan target file sepakat..
- [x] **DX2-0033 [P0] Verifikasi target executable tersedia sesudah build** — Scope: packages/cli dist output. Done when: Smoke test version berhasil..
- [x] **DX2-0034 [P0] Periksa main, types, dan exports package CLI** — Scope: packages/cli/package.json. Done when: Semua path tersedia di packed output..
- [ ] **DX2-0035 [P0] Periksa root dan nested lockfile** — Scope: lockfiles. Done when: Lockfile authoritative dipilih setelah consumer dan CI diperiksa..
- [ ] **DX2-0036 [P0] Hapus lockfile duplikat hanya setelah dependency dipetakan** — Scope: lockfiles. Done when: Frozen install lulus di OS matrix..
- [x] **DX2-0037 [P0] Tambahkan ignore untuk Next build output pada lokasi nested** — Scope: .gitignore. Done when: Generated .next tidak muncul sebagai source baru..
- [x] **DX2-0038 [P0] Untrack hanya generated artifact yang dapat direproduksi** — Scope: Git index. Done when: Tidak ada source atau input user ikut terhapus..
- [x] **DX2-0039 [P0] Samakan env example dengan runtime reader aktual** — Scope: .env.example, README.md. Done when: Setiap env yang dicontohkan dikenali runtime atau diberi label legacy..
- [x] **DX2-0040 [P0] Perbaiki klaim privasi/local-first yang tidak sesuai data flow** — Scope: README.md, privacy docs. Done when: Browser provider dijelaskan sebagai pihak ketiga..

## M02 — Domain contracts dan shared types — 20 micro-tasks

**Goal:** Membuat satu bahasa domain bagi CLI, API, SDK, UI, MCP, runtime, dan worker.
**Gate:** selesaikan task wajib fase ini dan verifikasi gate sebelum fase berikutnya. Task independen boleh diparalelkan.

- [x] **DX2-0041 [P0] Definisikan branded type TaskId** — Scope: packages/types. Done when: TaskId tidak tercampur dengan JobId..
- [x] **DX2-0042 [P0] Definisikan branded type JobId** — Scope: packages/types. Done when: JobId punya validator/constructor..
- [x] **DX2-0043 [P0] Definisikan branded type MissionId** — Scope: packages/types. Done when: MissionId punya validator/constructor..
- [x] **DX2-0044 [P0] Definisikan branded type AgentRunId** — Scope: packages/types. Done when: AgentRunId punya validator/constructor..
- [x] **DX2-0045 [P0] Definisikan enum TaskStatus canonical** — Scope: packages/types. Done when: Status queued, ready, running, blocked, review, verified, failed, cancelled terwakili..
- [x] **DX2-0046 [P0] Definisikan enum JobStatus canonical** — Scope: packages/types. Done when: Status job tidak menggunakan enum UI..
- [x] **DX2-0047 [P0] Definisikan enum MissionStatus canonical** — Scope: packages/types. Done when: Pause, resume, complete, dan fail terwakili..
- [x] **DX2-0048 [P0] Definisikan TaskPriority dengan urutan stabil** — Scope: packages/types. Done when: Priority comparison tidak bergantung alfabetis..
- [x] **DX2-0049 [P0] Definisikan TaskDependency contract** — Scope: packages/types. Done when: Dependency menyimpan ID dan jenis hubungan..
- [x] **DX2-0050 [P0] Definisikan AgentCapability contract** — Scope: packages/types. Done when: Capability berbentuk data yang dapat divalidasi..
- [x] **DX2-0051 [P0] Definisikan ModelCapability contract** — Scope: packages/types. Done when: Context, tools, structured output, vision, streaming terwakili..
- [x] **DX2-0052 [P0] Definisikan ProviderHealth contract** — Scope: packages/types. Done when: Status memiliki checkedAt dan reason opsional..
- [x] **DX2-0053 [P0] Definisikan ToolCall contract** — Scope: packages/types. Done when: Input, permission, correlation ID, dan result terwakili..
- [x] **DX2-0054 [P0] Definisikan ToolResult contract** — Scope: packages/types. Done when: Success dan failure memiliki bentuk stabil..
- [x] **DX2-0055 [P0] Definisikan EvidenceItem contract** — Scope: packages/types. Done when: Kind, locator, digest, timestamp, verifier terwakili..
- [x] **DX2-0056 [P0] Definisikan VerificationResult contract** — Scope: packages/types. Done when: Pass, fail, skipped, inconclusive berbeda jelas..
- [x] **DX2-0057 [P0] Definisikan Budget contract** — Scope: packages/types. Done when: Token, time, call, cost memiliki unit eksplisit..
- [x] **DX2-0058 [P0] Definisikan EventEnvelope schema v1** — Scope: packages/protocol. Done when: Event punya id, type, version, timestamp, source, correlationId..
- [x] **DX2-0059 [P0] Definisikan ErrorEnvelope canonical** — Scope: packages/shared. Done when: Error response tidak membocorkan stack atau secret..
- [x] **DX2-0060 [P0] Tambahkan schema test untuk Task contract** — Scope: packages/types tests. Done when: Valid payload diterima dan invalid payload ditolak..

## M03 — CI, test harness, dan quality gates — 30 micro-tasks

**Goal:** Membuat setiap perubahan dapat direproduksi dan diverifikasi lintas environment.
**Gate:** selesaikan task wajib fase ini dan verifikasi gate sebelum fase berikutnya. Task independen boleh diparalelkan.

- [x] **DX2-0061 [P0] Pastikan setiap workspace package punya build script atau alasan eksplisit** — Scope: package manifests. Done when: Script coverage tercatat tanpa script kosong..
- [x] **DX2-0062 [P0] Pastikan setiap package yang punya test memiliki test script** — Scope: package manifests. Done when: Package test berjalan dari root..
- [x] **DX2-0063 [P0] Pastikan root test tidak menjalankan glob folder yang tidak ada** — Scope: vitest.config.ts. Done when: Tidak ada phantom glob tanpa alasan..
- [x] **DX2-0064 [P0] Hapus glob test duplikat yang terbukti berulang** — Scope: vitest.config.ts. Done when: Setiap test file masuk satu kali..
- [x] **DX2-0065 [P0] Tambahkan test hitung workspace package** — Scope: packages/tests. Done when: Jumlah aktual sesuai manifest..
- [x] **DX2-0066 [P0] Tambahkan test dependency workspace:*** — Scope: packages/tests. Done when: Dependency internal yang orphan terdeteksi..
- [x] **DX2-0067 [P0] Tambahkan test bin target tersedia sesudah build** — Scope: packages/tests. Done when: Manifest gagal jika executable hilang..
- [x] **DX2-0068 [P0] Tambahkan test seluruh export path package** — Scope: packages/tests. Done when: Export ke file nonexistent ditolak..
- [x] **DX2-0069 [P0] Tambahkan test env example dan env reader parity** — Scope: packages/tests. Done when: Env wajib terdokumentasi memiliki pembaca..
- [x] **DX2-0070 [P0] Tambahkan test package filter pada CI** — Scope: scripts/tests. Done when: Selector workflow menunjuk package valid..
- [x] **DX2-0071 [P0] Tambahkan command typecheck untuk package inti** — Scope: package scripts. Done when: Exit code 0 tanpa suppression..
- [x] **DX2-0072 [P0] Tambahkan lint command bila konfigurasi lint tersedia** — Scope: root scripts. Done when: Lint tidak bergantung pada file nonexistent..
- [x] **DX2-0073 [P0] Buat clean-build job dari checkout fresh** — Scope: .github/workflows/ci.yml. Done when: Build tidak memakai artifact lokal..
- [x] **DX2-0074 [P0] Pastikan CI install memakai frozen lockfile** — Scope: .github/workflows/ci.yml. Done when: CI gagal bila lockfile stale..
- [x] **DX2-0075 [P0] Verifikasi Node 20 pada Ubuntu** — Scope: GitHub Actions. Done when: Run SHA cocok dengan commit yang diuji..
- [x] **DX2-0076 [P0] Verifikasi Node 22 pada Ubuntu** — Scope: GitHub Actions. Done when: Run SHA cocok dengan commit yang diuji..
- [x] **DX2-0077 [P0] Verifikasi Node 20 pada Windows** — Scope: GitHub Actions. Done when: Run SHA cocok dengan commit yang diuji..
- [x] **DX2-0078 [P0] Verifikasi Node 22 pada Windows** — Scope: GitHub Actions. Done when: Run SHA cocok dengan commit yang diuji..
- [x] **DX2-0079 [P0] Pisahkan unit test dari browser-dependent test** — Scope: vitest config, CI. Done when: Unit test tidak memerlukan Chromium..
- [x] **DX2-0080 [P0] Beri label pada test yang membutuhkan browser** — Scope: test files. Done when: Skip hanya terjadi saat capability environment tidak tersedia..
- [x] **DX2-0081 [P0] Tambahkan timeout eksplisit pada integration test** — Scope: test configs. Done when: Tidak ada test hang tanpa batas..
- [x] **DX2-0082 [P0] Buat helper temporary directory auto-cleanup** — Scope: test utilities. Done when: Temp file dibersihkan setelah pass/fail..
- [x] **DX2-0083 [P0] Buat fake clock untuk lease dan timeout test** — Scope: test utilities. Done when: Test tidak memakai sleep panjang..
- [x] **DX2-0084 [P0] Buat fake provider server untuk API integration test** — Scope: test fixtures. Done when: Test offline tidak memanggil provider sungguhan..
- [x] **DX2-0085 [P0] Tambahkan reporter yang menampilkan failed test names** — Scope: CI config. Done when: Nama test gagal terlihat di summary..
- [x] **DX2-0086 [P0] Simpan artifact log saat CI gagal** — Scope: .github/workflows/ci.yml. Done when: Artifact tidak mengandung secret/profile..
- [x] **DX2-0087 [P0] Pastikan DOM regression menjadi job terpisah** — Scope: .github/workflows/ci.yml. Done when: Status DOM terlihat independen..
- [x] **DX2-0088 [P0] Tambahkan pack dry-run test** — Scope: CI workflow. Done when: Packed file list bebas cache/private profile..
- [x] **DX2-0089 [P0] Tambahkan CLI temporary-install smoke test** — Scope: CLI tests. Done when: Binary berjalan dari PATH di sandbox test..
- [x] **DX2-0090 [P0] Buat satu quality-gate command lokal** — Scope: README developer section. Done when: Command menjalankan gate dan meneruskan exit code..

## M04 — Security, permission, dan trust boundaries — 30 micro-tasks

**Goal:** Agent hanya bertindak dalam scope yang diizinkan dengan audit dan default paling aman.
**Gate:** selesaikan task wajib fase ini dan verifikasi gate sebelum fase berikutnya. Task independen boleh diparalelkan.

- [ ] **DX2-0091 [P0] Dokumentasikan trust boundary local runtime dan cloud provider** — Scope: security docs. Done when: Data outbound dijelaskan dengan jujur..
- [ ] **DX2-0092 [P0] Definisikan PermissionAction enum** — Scope: packages/policy. Done when: Read, write, execute, network, browser, secret access terpisah..
- [ ] **DX2-0093 [P0] Definisikan PermissionScope contract** — Scope: packages/policy. Done when: Scope dibatasi project, task, tool, dan path..
- [ ] **DX2-0094 [P0] Tolak path kosong pada file tool** — Scope: packages/tools tests. Done when: Path kosong tidak resolve ke cwd..
- [ ] **DX2-0095 [P0] Tolak traversal yang keluar dari workspace** — Scope: packages/policy tests. Done when: Path traversal regression lulus..
- [ ] **DX2-0096 [P0] Tolak absolute path di luar allowed root** — Scope: packages/policy tests. Done when: Outside-root path ditolak..
- [ ] **DX2-0097 [P0] Normalisasi separator Windows sebelum policy check** — Scope: packages/policy. Done when: Windows path traversal lulus..
- [ ] **DX2-0098 [P0] Verifikasi symlink tidak melewati workspace boundary** — Scope: packages/policy. Done when: Symlink escape ditolak..
- [ ] **DX2-0099 [P0] Uji path case sensitivity sesuai OS** — Scope: packages/policy tests. Done when: POSIX dan Windows mengikuti filesystem..
- [ ] **DX2-0100 [P0] Validasi command executable dengan allowlist policy** — Scope: packages/tools. Done when: Command policy tidak hanya memeriksa substring..
- [ ] **DX2-0101 [P0] Pisahkan executable dan argument saat spawn** — Scope: packages/tools. Done when: Argumen tidak digabung ke shell string default..
- [ ] **DX2-0102 [P0] Nonaktifkan shell interpolation pada local model command** — Scope: packages/local. Done when: Path/argumen dikirim sebagai argv..
- [ ] **DX2-0103 [P0] Tambahkan timeout wajib pada subprocess** — Scope: packages/tools. Done when: Process dihentikan setelah budget..
- [ ] **DX2-0104 [P0] Batasi ukuran stdout process** — Scope: packages/tools. Done when: Output berlebih dipotong dengan metadata..
- [ ] **DX2-0105 [P0] Batasi ukuran stderr process** — Scope: packages/tools. Done when: Stderr tidak dapat memenuhi memory tanpa batas..
- [ ] **DX2-0106 [P0] Tambahkan process cancellation test** — Scope: packages/tools tests. Done when: Child process berhenti saat cancel..
- [ ] **DX2-0107 [P0] Tambahkan process tree cleanup test** — Scope: packages/tools tests. Done when: Tidak ada child process tertinggal..
- [ ] **DX2-0108 [P0] Redact cookie dan token dari log** — Scope: logger. Done when: Secret fixture tidak muncul di output..
- [ ] **DX2-0109 [P0] Redact Authorization header pada HTTP log** — Scope: apps/api. Done when: Header rahasia tidak tercatat..
- [ ] **DX2-0110 [P0] Redact query parameter rahasia dari URL log** — Scope: logger. Done when: Token query tidak muncul..
- [ ] **DX2-0111 [P0] Tolak bind API remote tanpa auth secret valid** — Scope: apps/api. Done when: Remote bind disabled pada default config..
- [ ] **DX2-0112 [P0] Validasi CORS memakai exact origin parser** — Scope: apps/api. Done when: Wildcard tidak terbuka pada credential mode..
- [ ] **DX2-0113 [P0] Tambahkan rate limit untuk create-job** — Scope: apps/api. Done when: Burst request dibatasi deterministik..
- [ ] **DX2-0114 [P0] Tambahkan request body size limit** — Scope: apps/api. Done when: Request besar ditolak sebelum parsing berat..
- [ ] **DX2-0115 [P0] Tambahkan auth test untuk endpoint sensitif** — Scope: apps/api tests. Done when: Unauthorized tidak membaca job/artifact pihak lain..
- [ ] **DX2-0116 [P0] Pastikan approval tidak disetujui oleh task yang sama** — Scope: packages/policy. Done when: Identity separation lulus test..
- [ ] **DX2-0117 [P0] Tambahkan expiry pada approval request** — Scope: packages/policy. Done when: Approval kadaluarsa tidak dapat dipakai ulang..
- [ ] **DX2-0118 [P0] Tambahkan audit event untuk permission deny** — Scope: packages/policy. Done when: Denied call punya reason dan correlation ID..
- [ ] **DX2-0119 [P0] Tambahkan audit event untuk approval granted** — Scope: packages/policy. Done when: Granted event memuat policy version..
- [ ] **DX2-0120 [P0] Buat secret fixture palsu yang jelas** — Scope: test fixtures. Done when: Tidak ada credential produksi di fixture..

## M05 — Task, job, event, dan persistence — 30 micro-tasks

**Goal:** Semua pekerjaan memiliki state konsisten, tahan restart, dan dapat dilanjutkan.
**Gate:** selesaikan task wajib fase ini dan verifikasi gate sebelum fase berikutnya. Task independen boleh diparalelkan.

- [ ] **DX2-0121 [P0] Dokumentasikan perbedaan Mission, Task, Job, AgentRun** — Scope: domain docs. Done when: Setiap entitas punya tanggung jawab tunggal..
- [ ] **DX2-0122 [P0] Buat validator TaskId** — Scope: packages/types. Done when: Invalid ID ditolak..
- [ ] **DX2-0123 [P0] Buat validator JobId** — Scope: packages/types. Done when: Invalid ID ditolak..
- [ ] **DX2-0124 [P0] Tolak self-dependency pada task graph** — Scope: packages/job. Done when: Task tidak dapat bergantung pada dirinya sendiri..
- [ ] **DX2-0125 [P0] Deteksi dependency cycle sebelum task ready** — Scope: packages/job. Done when: Cycle menghasilkan error terstruktur..
- [ ] **DX2-0126 [P0] Validasi transisi Task queued ke ready** — Scope: packages/job. Done when: Transisi illegal ditolak..
- [ ] **DX2-0127 [P0] Validasi transisi Task ready ke running** — Scope: packages/job. Done when: Transisi butuh worker lease aktif..
- [ ] **DX2-0128 [P0] Validasi transisi Task running ke verified** — Scope: packages/job. Done when: Transisi butuh verification result..
- [ ] **DX2-0129 [P0] Validasi transisi Task running ke blocked** — Scope: packages/job. Done when: Blocked state menyimpan reason code..
- [ ] **DX2-0130 [P0] Validasi transisi Task running ke failed** — Scope: packages/job. Done when: Failure menyimpan retry classification..
- [ ] **DX2-0131 [P0] Tambahkan cancelled state pada task** — Scope: packages/job. Done when: Cancelled berbeda dari failed..
- [ ] **DX2-0132 [P0] Tambahkan review state untuk hasil yang butuh review** — Scope: packages/job. Done when: Review tidak dianggap verified..
- [ ] **DX2-0133 [P0] Tambahkan createdAt, updatedAt, version pada task** — Scope: packages/job. Done when: Record bisa diurutkan dan dioptimistic-lock..
- [ ] **DX2-0134 [P0] Tambahkan optimistic concurrency update** — Scope: packages/job. Done when: Stale update ditolak tanpa lost update..
- [ ] **DX2-0135 [P0] Tambahkan idempotency key pada task submit** — Scope: packages/job. Done when: Duplicate submit tidak membuat duplicate task..
- [ ] **DX2-0136 [P0] Tambahkan idempotency key pada event ingestion** — Scope: packages/protocol. Done when: Replay tidak menggandakan side effect..
- [ ] **DX2-0137 [P0] Buat event schema version 1** — Scope: packages/protocol. Done when: Payload tervalidasi dan memiliki version..
- [ ] **DX2-0138 [P0] Tambahkan event task.created** — Scope: packages/protocol. Done when: Event diterbitkan satu kali per task baru..
- [ ] **DX2-0139 [P0] Tambahkan event task.state_changed** — Scope: packages/protocol. Done when: Event memuat previous dan next state..
- [ ] **DX2-0140 [P0] Tambahkan event agent.run.started** — Scope: packages/protocol. Done when: Event terikat pada TaskId..
- [ ] **DX2-0141 [P0] Tambahkan event agent.run.finished** — Scope: packages/protocol. Done when: Event memuat status dan duration..
- [ ] **DX2-0142 [P0] Tambahkan event verification.completed** — Scope: packages/protocol. Done when: Event mengacu ke evidence bundle..
- [ ] **DX2-0143 [P0] Tambahkan event budget.exhausted** — Scope: packages/protocol. Done when: Event memuat tipe budget yang habis..
- [ ] **DX2-0144 [P0] Persist event sebelum broadcast realtime** — Scope: packages/job, database. Done when: Restart tidak menghilangkan event committed..
- [ ] **DX2-0145 [P0] Tambahkan cursor pagination pada event query** — Scope: packages/job. Done when: Consumer bisa resume dari cursor..
- [ ] **DX2-0146 [P0] Tambahkan event ordering test** — Scope: packages/job tests. Done when: Sequence per task konsisten..
- [ ] **DX2-0147 [P0] Tambahkan event replay test** — Scope: packages/job tests. Done when: Replay idempotent..
- [ ] **DX2-0148 [P0] Tambahkan DB index untuk state dan createdAt** — Scope: packages/database migrations. Done when: Queue query menggunakan index yang sesuai..
- [ ] **DX2-0149 [P0] Tambahkan DB index untuk correlationId** — Scope: packages/database migrations. Done when: Trace job dapat dicari..
- [ ] **DX2-0150 [P0] Tambahkan restart recovery test untuk queued task** — Scope: packages/job tests. Done when: Queued task ditemukan setelah store dibuka ulang..

## M06 — Orchestration plane dan agent scheduler — 30 micro-tasks

**Goal:** Goal besar menjadi DAG task kecil yang terjadwal, terbatasi, dan dapat dipulihkan.
**Gate:** selesaikan task wajib fase ini dan verifikasi gate sebelum fase berikutnya. Task independen boleh diparalelkan.

- [ ] **DX2-0151 [P1] Definisikan PlanNode contract** — Scope: packages/types. Done when: Node punya id, task spec, dependency, output contract..
- [ ] **DX2-0152 [P1] Definisikan PlanEdge contract** — Scope: packages/types. Done when: Edge menyatakan from, to, dan dependency type..
- [ ] **DX2-0153 [P1] Validasi DAG tidak memiliki cycle** — Scope: packages/runtime atau packages/job. Done when: Cycle fixture ditolak..
- [ ] **DX2-0154 [P1] Tambahkan topological sort deterministik** — Scope: packages/runtime. Done when: Graph sama menghasilkan urutan sama..
- [ ] **DX2-0155 [P1] Tambahkan planner output schema** — Scope: packages/runtime. Done when: Planner menghasilkan micro-task dengan acceptance criteria..
- [ ] **DX2-0156 [P1] Tambahkan validator atomic task size** — Scope: packages/runtime. Done when: Task multi-deliverable dipecah atau ditolak..
- [ ] **DX2-0157 [P1] Batasi jumlah task hasil planner** — Scope: packages/runtime. Done when: Plan besar dipecah menjadi batch..
- [ ] **DX2-0158 [P1] Tambahkan plan summary berisi scope dan risk** — Scope: packages/runtime. Done when: Summary ada sebelum execution..
- [ ] **DX2-0159 [P1] Tambahkan dependency readiness evaluator** — Scope: packages/job. Done when: Task ready hanya bila prerequisite terpenuhi..
- [ ] **DX2-0160 [P1] Tambahkan scheduler mengambil ready task prioritas tertinggi** — Scope: packages/job. Done when: Task selection deterministik..
- [ ] **DX2-0161 [P1] Tambahkan fairness antar mission** — Scope: packages/job. Done when: Satu mission tidak memonopoli worker..
- [ ] **DX2-0162 [P1] Tambahkan global concurrency limit** — Scope: packages/job. Done when: Worker tidak melebihi config..
- [ ] **DX2-0163 [P1] Tambahkan per-project concurrency limit** — Scope: packages/job. Done when: Project quota ditegakkan..
- [ ] **DX2-0164 [P1] Tambahkan per-provider concurrency limit** — Scope: packages/gateway. Done when: Provider quota ditegakkan..
- [ ] **DX2-0165 [P1] Tambahkan unique lease token per worker claim** — Scope: packages/job. Done when: Worker lain tidak dapat memakai lease yang sama..
- [ ] **DX2-0166 [P1] Tambahkan lease expiry** — Scope: packages/job. Done when: Expired claim dapat direclaim..
- [ ] **DX2-0167 [P1] Tambahkan heartbeat renewal** — Scope: packages/job. Done when: Worker aktif memperbarui lease..
- [ ] **DX2-0168 [P1] Tambahkan stale worker detection** — Scope: packages/job. Done when: Worker tanpa heartbeat ditandai stale..
- [ ] **DX2-0169 [P1] Tambahkan retry policy exponential backoff** — Scope: packages/job. Done when: Delay dibatasi max dan jitter..
- [ ] **DX2-0170 [P1] Klasifikasikan error retryable dan permanent** — Scope: packages/shared, packages/job. Done when: Policy tidak menebak dari free text..
- [ ] **DX2-0171 [P1] Tambahkan retry budget per task** — Scope: packages/job. Done when: Task tidak retry tanpa batas..
- [ ] **DX2-0172 [P1] Tambahkan checkpoint hook per tool/step boundary** — Scope: packages/runtime. Done when: Checkpoint tersimpan dan dapat dimuat..
- [ ] **DX2-0173 [P1] Tambahkan resume dari checkpoint valid** — Scope: packages/runtime. Done when: Resume tidak mengulang side effect committed..
- [ ] **DX2-0174 [P1] Tambahkan graceful worker shutdown** — Scope: packages/job. Done when: Worker berhenti mengambil task dan melepas lease..
- [ ] **DX2-0175 [P1] Test crash antara claim dan checkpoint** — Scope: packages/job tests. Done when: Task dipulihkan tanpa duplicate side effect..
- [ ] **DX2-0176 [P1] Test crash setelah tool result tersimpan** — Scope: packages/job tests. Done when: Resume memakai result tersimpan..
- [ ] **DX2-0177 [P1] Tambahkan dead-letter state setelah retry habis** — Scope: packages/job. Done when: Task terlihat untuk analisis..
- [ ] **DX2-0178 [P1] Tambahkan cancellation propagation ke child task** — Scope: packages/runtime. Done when: Cancel mission menghentikan child sesuai policy..
- [ ] **DX2-0179 [P1] Tambahkan pause/resume mission** — Scope: packages/job. Done when: Paused mission tidak mengeluarkan task baru..
- [ ] **DX2-0180 [P1] Tambahkan queue metrics** — Scope: packages/observability. Done when: Queue age, active workers, retry count terukur..

## M07 — Execution plane, runtime, dan adapters — 30 micro-tasks

**Goal:** Satu kontrak eksekusi untuk native agent dan agent eksternal.
**Gate:** selesaikan task wajib fase ini dan verifikasi gate sebelum fase berikutnya. Task independen boleh diparalelkan.

- [ ] **DX2-0181 [P1] Definisikan AgentAdapter interface** — Scope: packages/runtime. Done when: Adapter menerima task spec dan mengembalikan typed result..
- [ ] **DX2-0182 [P1] Definisikan AdapterCapabilities schema** — Scope: packages/runtime. Done when: Capability tervalidasi sebelum adapter dipakai..
- [ ] **DX2-0183 [P1] Tambahkan adapter registry** — Scope: packages/runtime. Done when: Adapter ID unik dan lifecycle jelas..
- [ ] **DX2-0184 [P1] Tambahkan fake adapter untuk unit test** — Scope: packages/tests. Done when: Adapter memberi hasil deterministik..
- [ ] **DX2-0185 [P1] Tambahkan adapter health probe** — Scope: packages/runtime. Done when: Unavailable adapter tidak menerima task..
- [ ] **DX2-0186 [P1] Tambahkan adapter timeout wrapper** — Scope: packages/runtime. Done when: Adapter hang ditandai timeout..
- [ ] **DX2-0187 [P1] Validasi output schema adapter** — Scope: packages/runtime. Done when: Invalid result ditolak..
- [ ] **DX2-0188 [P1] Tambahkan adapter version metadata** — Scope: packages/runtime. Done when: Runtime mencatat versi adapter..
- [ ] **DX2-0189 [P1] Buat reusable adapter contract tests** — Scope: packages/tests. Done when: Semua adapter diuji dengan kasus sama..
- [ ] **DX2-0190 [P1] Tambahkan native runtime adapter** — Scope: packages/runtime. Done when: Native agent mengimplementasikan interface canonical..
- [ ] **DX2-0191 [P1] Tambahkan CLI process adapter minimal** — Scope: packages/runtime. Done when: Command dijalankan tanpa shell interpolation..
- [ ] **DX2-0192 [P1] Tambahkan timeout pada CLI adapter** — Scope: packages/runtime. Done when: Process berhenti saat budget habis..
- [ ] **DX2-0193 [P1] Tambahkan cancellation pada CLI adapter** — Scope: packages/runtime. Done when: Cancel menghentikan process..
- [ ] **DX2-0194 [P1] Tambahkan output streaming pada CLI adapter** — Scope: packages/runtime. Done when: Chunk punya sequence dan timestamp..
- [ ] **DX2-0195 [P1] Tambahkan worktree metadata pada AgentRun** — Scope: packages/runtime. Done when: Run terikat pada root worktree..
- [ ] **DX2-0196 [P1] Buat Git worktree create helper** — Scope: packages/platform atau packages/runtime. Done when: Helper membuat path unik per task..
- [ ] **DX2-0197 [P1] Buat Git worktree cleanup helper** — Scope: packages/platform atau packages/runtime. Done when: Cleanup hanya milik run selesai..
- [ ] **DX2-0198 [P1] Test dua task mendapatkan worktree berbeda** — Scope: packages/tests. Done when: Tidak ada shared mutable checkout..
- [ ] **DX2-0199 [P1] Test path confinement pada worktree** — Scope: packages/policy. Done when: Agent tidak dapat menulis di luar worktree..
- [ ] **DX2-0200 [P1] Test agent gagal tidak menghapus worktree task lain** — Scope: packages/tests. Done when: Isolation terbukti..
- [ ] **DX2-0201 [P1] Tambahkan git diff collector per run** — Scope: packages/runtime. Done when: Diff hanya berasal dari worktree terkait..
- [ ] **DX2-0202 [P1] Tambahkan pre-run uncommitted-change detector** — Scope: packages/runtime. Done when: Pre-existing user change tidak tertimpa..
- [ ] **DX2-0203 [P1] Tambahkan adapter protocol version negotiation** — Scope: packages/protocol. Done when: Adapter incompatible ditolak..
- [ ] **DX2-0204 [P1] Tambahkan capability selection helper** — Scope: packages/runtime. Done when: Task hanya dipasangkan ke adapter compatible..
- [ ] **DX2-0205 [P1] Stream transcript run ke event bus** — Scope: packages/session, packages/protocol. Done when: Event berurutan dan tanpa secret..
- [ ] **DX2-0206 [P1] Tambahkan run artifact collection hook** — Scope: packages/artifacts. Done when: Artifact terikat AgentRunId..
- [ ] **DX2-0207 [P1] Tambahkan tool invocation correlation IDs** — Scope: packages/tools. Done when: Tool call dapat ditelusuri ke task dan run..
- [ ] **DX2-0208 [P1] Redact tool output sebelum transcript persist** — Scope: packages/tools, packages/session. Done when: Secret fixture tidak tersimpan..
- [ ] **DX2-0209 [P1] Tambahkan output budget per run** — Scope: packages/runtime. Done when: Total output dibatasi..
- [ ] **DX2-0210 [P1] Tulis fake adapter tutorial** — Scope: packages/runtime docs. Done when: Contributor dapat membuat adapter tanpa provider eksternal..

## M08 — Proof engine dan evidence graph — 30 micro-tasks

**Goal:** Task selesai hanya dengan bukti independen, bukan klaim agent.
**Gate:** selesaikan task wajib fase ini dan verifikasi gate sebelum fase berikutnya. Task independen boleh diparalelkan.

- [ ] **DX2-0211 [P1] Definisikan VerificationCheck contract** — Scope: packages/types. Done when: Check punya id, command, timeout, severity..
- [ ] **DX2-0212 [P1] Definisikan EvidenceBundle contract** — Scope: packages/types. Done when: Bundle mengikat task, diff, checks, artifact..
- [ ] **DX2-0213 [P1] Definisikan VerificationPolicy contract** — Scope: packages/policy. Done when: Policy memilih check dari jenis perubahan..
- [ ] **DX2-0214 [P1] Tambahkan verifier registry** — Scope: packages/runtime. Done when: Verifier dapat ditambah tanpa ubah task engine..
- [ ] **DX2-0215 [P1] Tambahkan verifier file-exists** — Scope: packages/runtime. Done when: Path diperiksa di sandbox..
- [ ] **DX2-0216 [P1] Tambahkan verifier JSON schema** — Scope: packages/runtime. Done when: Invalid JSON gagal dengan lokasi error..
- [ ] **DX2-0217 [P1] Tambahkan verifier command exit code** — Scope: packages/runtime. Done when: Exit code dan duration tersimpan..
- [ ] **DX2-0218 [P1] Tambahkan verifier package test** — Scope: packages/runtime. Done when: Target package test berjalan dengan timeout..
- [ ] **DX2-0219 [P1] Tambahkan verifier root build** — Scope: packages/runtime. Done when: Build result disimpan sebagai evidence..
- [ ] **DX2-0220 [P1] Tambahkan verifier TypeScript check** — Scope: packages/runtime. Done when: Typecheck result disimpan sebagai evidence..
- [ ] **DX2-0221 [P1] Tambahkan verifier diff scope** — Scope: packages/runtime. Done when: Perubahan di luar allowed path gagal..
- [ ] **DX2-0222 [P1] Tambahkan verifier secret scan result** — Scope: packages/runtime. Done when: Secret finding memblokir verification..
- [ ] **DX2-0223 [P1] Tambahkan verifier generated-file policy** — Scope: packages/runtime. Done when: Unapproved generated output ditolak..
- [ ] **DX2-0224 [P1] Tambahkan digest untuk setiap artifact** — Scope: packages/artifacts. Done when: Digest dapat diverifikasi ulang..
- [ ] **DX2-0225 [P1] Tambahkan command evidence sanitizer** — Scope: packages/runtime. Done when: Environment secret tidak masuk record..
- [ ] **DX2-0226 [P1] Test evidence immutable setelah verified** — Scope: packages/runtime tests. Done when: Evidence lama hanya berubah melalui revision baru..
- [ ] **DX2-0227 [P1] Tambahkan unverified status saat checks tidak ada** — Scope: packages/job. Done when: Task tidak otomatis menjadi verified..
- [ ] **DX2-0228 [P1] Tambahkan inconclusive status untuk check unavailable** — Scope: packages/types. Done when: Inconclusive berbeda dari pass..
- [ ] **DX2-0229 [P1] Tambahkan weighted verification policy** — Scope: packages/policy. Done when: Critical check tidak bisa diimbangi check kosmetik..
- [ ] **DX2-0230 [P1] Tambahkan minimum gate docs-only change** — Scope: packages/runtime. Done when: Markdown lint/link check relevan berjalan..
- [ ] **DX2-0231 [P1] Tambahkan minimum gate API change** — Scope: packages/runtime. Done when: API contract test berjalan..
- [ ] **DX2-0232 [P1] Tambahkan minimum gate package manifest change** — Scope: packages/runtime. Done when: Pack/import test berjalan..
- [ ] **DX2-0233 [P1] Tambahkan minimum gate security-sensitive change** — Scope: packages/runtime. Done when: Security regression suite berjalan..
- [ ] **DX2-0234 [P1] Tambahkan verifier report Markdown** — Scope: packages/artifacts. Done when: Report memuat command, exit code, SHA, waktu..
- [ ] **DX2-0235 [P1] Tambahkan verifier report JSON** — Scope: packages/artifacts. Done when: Report machine-readable dan schema valid..
- [ ] **DX2-0236 [P1] Test agent self-assertion tidak membuat verified** — Scope: packages/tests. Done when: Tanpa independent evidence status tetap unverified..
- [ ] **DX2-0237 [P1] Test evidence hilang memblokir merge eligibility** — Scope: packages/tests. Done when: Merge eligibility false tanpa evidence..
- [ ] **DX2-0238 [P1] Hubungkan requirement ke child task di evidence graph** — Scope: packages/runtime. Done when: Requirement ID dapat ditelusuri..
- [ ] **DX2-0239 [P1] Hubungkan task ke commit di evidence graph** — Scope: packages/runtime. Done when: Commit SHA terhubung ke task..
- [ ] **DX2-0240 [P1] Hubungkan commit ke CI run di evidence graph** — Scope: packages/runtime. Done when: CI SHA harus cocok dengan commit..

## M09 — Intelligence plane dan provider router — 30 micro-tasks

**Goal:** Model/provider dipilih secara terukur dan sesuai privacy serta budget policy.
**Gate:** selesaikan task wajib fase ini dan verifikasi gate sebelum fase berikutnya. Task independen boleh diparalelkan.

- [ ] **DX2-0241 [P1] Definisikan ProviderAdapter interface** — Scope: packages/gateway. Done when: Request dan result memiliki tipe canonical..
- [ ] **DX2-0242 [P1] Definisikan ProviderDescriptor schema** — Scope: packages/gateway. Done when: ID, version, transport, privacy, capability tervalidasi..
- [ ] **DX2-0243 [P1] Definisikan ProviderQuota schema** — Scope: packages/gateway. Done when: Quota memiliki unit dan resetAt..
- [ ] **DX2-0244 [P1] Definisikan ModelScore record** — Scope: packages/gateway. Done when: Score menyimpan kategori task dan sample count..
- [ ] **DX2-0245 [P1] Definisikan RoutingDecision record** — Scope: packages/gateway. Done when: Decision menyimpan alasan dan alternatif..
- [ ] **DX2-0246 [P1] Pisahkan provider health dari model capability** — Scope: packages/gateway. Done when: Healthy tidak otomatis berarti capable..
- [ ] **DX2-0247 [P1] Tambahkan duplicate provider ID test** — Scope: packages/gateway tests. Done when: ID duplikat ditolak..
- [ ] **DX2-0248 [P1] Tambahkan fake provider adapter** — Scope: packages/gateway tests. Done when: Router berjalan offline..
- [ ] **DX2-0249 [P1] Tambahkan provider health timeout** — Scope: packages/gateway. Done when: Probe tidak menggantung..
- [ ] **DX2-0250 [P1] Tambahkan health cache TTL** — Scope: packages/gateway. Done when: Probe tidak dipanggil tiap request..
- [ ] **DX2-0251 [P1] Tambahkan deterministic task category baseline** — Scope: packages/gateway. Done when: Kategori sederhana menghasilkan label valid..
- [ ] **DX2-0252 [P1] Tambahkan capability-based fallback** — Scope: packages/gateway. Done when: Fallback tidak melanggar required capability..
- [ ] **DX2-0253 [P1] Tambahkan health-based fallback** — Scope: packages/gateway. Done when: Unhealthy provider dilewati..
- [ ] **DX2-0254 [P1] Tambahkan budget-aware provider selection** — Scope: packages/gateway. Done when: Estimasi tidak melampaui budget..
- [ ] **DX2-0255 [P1] Tambahkan latency-aware provider selection** — Scope: packages/gateway. Done when: Latency dipakai setelah sample minimum..
- [ ] **DX2-0256 [P1] Tambahkan quality-aware score dari verified outcome** — Scope: packages/gateway. Done when: Score memakai outcome terverifikasi..
- [ ] **DX2-0257 [P1] Tambahkan privacy class pada routing request** — Scope: packages/gateway. Done when: Local-only request tidak dikirim ke cloud adapter..
- [ ] **DX2-0258 [P1] Tolak silent fallback local ke cloud** — Scope: packages/gateway tests. Done when: Local-only membuktikan nol outbound call..
- [ ] **DX2-0259 [P1] Tambahkan explicit fallback policy field** — Scope: packages/gateway. Done when: Fallback tidak aktif diam-diam..
- [ ] **DX2-0260 [P1] Tambahkan quota exhausted error code** — Scope: packages/gateway. Done when: Quota failure berbeda dari auth failure..
- [ ] **DX2-0261 [P1] Tambahkan cooldown provider yang rate-limited** — Scope: packages/gateway. Done when: Retry menunggu cooldown..
- [ ] **DX2-0262 [P1] Tambahkan retry idempotency untuk provider request** — Scope: packages/gateway. Done when: Retry tidak menggandakan side effect..
- [ ] **DX2-0263 [P1] Tambahkan provider telemetry tanpa prompt content** — Scope: packages/observability. Done when: Metrics tanpa payload..
- [ ] **DX2-0264 [P1] Redact routing decision log** — Scope: packages/gateway. Done when: Log tidak menyimpan prompt, token, atau cookie..
- [ ] **DX2-0265 [P1] Test router memilih model dengan tool-call capability** — Scope: packages/gateway tests. Done when: Model tanpa tool calling tidak dipilih..
- [ ] **DX2-0266 [P1] Test router mempertimbangkan context budget** — Scope: packages/gateway tests. Done when: Model dengan context terlalu kecil dilewati..
- [ ] **DX2-0267 [P1] Test router mematuhi local-only policy** — Scope: packages/gateway tests. Done when: Tidak ada fallback web tersembunyi..
- [ ] **DX2-0268 [P1] Test tie-break routing deterministik** — Scope: packages/gateway tests. Done when: Input sama menghasilkan keputusan sama..
- [ ] **DX2-0269 [P1] Tambahkan provider health API data model** — Scope: packages/types, apps/api. Done when: Status dikirim tanpa secret..
- [ ] **DX2-0270 [P1] Tulis provider adapter guide** — Scope: packages/gateway docs. Done when: Adapter baru lulus contract suite..

## M10 — Repo Atlas dan context engineering — 30 micro-tasks

**Goal:** Agent memahami repository lewat index incremental dan context yang tepat, bukan dump seluruh repo.
**Gate:** selesaikan task wajib fase ini dan verifikasi gate sebelum fase berikutnya. Task independen boleh diparalelkan.

- [ ] **DX2-0271 [P1] Definisikan RepoFile record** — Scope: atlas package setelah audit. Done when: Path, digest, size, language, modifiedAt tersedia..
- [ ] **DX2-0272 [P1] Definisikan RepoSymbol record** — Scope: atlas package. Done when: Symbol menyimpan file, range, kind, name..
- [ ] **DX2-0273 [P1] Definisikan RepoEdge record** — Scope: atlas package. Done when: Edge menyatakan import, call, test-of, extends..
- [ ] **DX2-0274 [P1] Definisikan RepoIndexStatus record** — Scope: atlas package. Done when: Index menyimpan root, revision, status, freshness..
- [ ] **DX2-0275 [P1] Buat file walker yang menghormati gitignore** — Scope: atlas package. Done when: Ignored file tidak masuk index..
- [ ] **DX2-0276 [P1] Buat denylist sensitive path** — Scope: atlas package. Done when: Env, key, cert, profile, secret tidak diindeks..
- [ ] **DX2-0277 [P1] Buat max file size limit** — Scope: atlas package. Done when: File besar dilewati dengan reason..
- [ ] **DX2-0278 [P1] Buat binary file detector** — Scope: atlas package. Done when: Binary tidak diparse sebagai text..
- [ ] **DX2-0279 [P1] Buat stable file fingerprint** — Scope: atlas package. Done when: Hash sama menghasilkan record sama..
- [ ] **DX2-0280 [P1] Buat incremental change detector dari git diff** — Scope: atlas package. Done when: Hanya file berubah yang direindex..
- [ ] **DX2-0281 [P1] Buat deleted-file cleanup pada index** — Scope: atlas package. Done when: Symbol file terhapus tidak tertinggal..
- [ ] **DX2-0282 [P1] Buat language detector dasar** — Scope: atlas package. Done when: TS, JS, JSON, MD, YAML dikenali..
- [ ] **DX2-0283 [P1] Buat Markdown heading indexer** — Scope: atlas package. Done when: Heading dan range tersimpan..
- [ ] **DX2-0284 [P1] Buat TypeScript import indexer** — Scope: atlas package. Done when: Import edge valid di fixture..
- [ ] **DX2-0285 [P1] Buat TypeScript export indexer** — Scope: atlas package. Done when: Export symbol tercatat..
- [ ] **DX2-0286 [P1] Buat workspace package dependency indexer** — Scope: atlas package. Done when: Package edge tersimpan..
- [ ] **DX2-0287 [P1] Buat test-to-source link heuristic** — Scope: atlas package. Done when: Test dapat menunjuk source terkait dengan confidence..
- [ ] **DX2-0288 [P1] Buat symbol lookup internal API** — Scope: atlas package. Done when: Exact symbol menghasilkan location..
- [ ] **DX2-0289 [P1] Buat path lookup internal API** — Scope: atlas package. Done when: Path query menghasilkan file record..
- [ ] **DX2-0290 [P1] Buat dependency neighborhood query** — Scope: atlas package. Done when: Caller dapat meminta tetangga dengan depth limit..
- [ ] **DX2-0291 [P1] Buat context packer dengan token budget** — Scope: atlas package. Done when: Context tidak melampaui budget..
- [ ] **DX2-0292 [P1] Prioritaskan file terkait test dan caller** — Scope: atlas package. Done when: Ranking deterministic pada fixture..
- [ ] **DX2-0293 [P1] Tambahkan source line citations ke context chunk** — Scope: atlas package. Done when: Chunk menunjuk path dan range..
- [ ] **DX2-0294 [P1] Tambahkan context freshness indicator** — Scope: atlas package. Done when: Stale index ditandai..
- [ ] **DX2-0295 [P1] Tambahkan index rebuild CLI command** — Scope: CLI. Done when: Index lokal dapat dibangun ulang..
- [ ] **DX2-0296 [P1] Tambahkan index status CLI command** — Scope: CLI. Done when: Revision, counts, freshness ditampilkan..
- [ ] **DX2-0297 [P1] Tambahkan index persistence adapter** — Scope: atlas package. Done when: Index dapat dibuka ulang..
- [ ] **DX2-0298 [P1] Tambahkan index corruption recovery test** — Scope: atlas package tests. Done when: Index dapat dibangun ulang dari source..
- [ ] **DX2-0299 [P1] Tambahkan Repo Atlas read API endpoint** — Scope: apps/api. Done when: Endpoint hanya membaca metadata aman..
- [ ] **DX2-0300 [P1] Tulis dokumentasi ignore/privacy indexer** — Scope: docs. Done when: Path yang diabaikan dijelaskan..

## M11 — Memory, knowledge, dan learning loop — 20 micro-tasks

**Goal:** Pengetahuan proyek persisten, bersumber, scoped, dan tidak mencampur fakta dengan asumsi.
**Gate:** selesaikan task wajib fase ini dan verifikasi gate sebelum fase berikutnya. Task independen boleh diparalelkan.

- [ ] **DX2-0301 [P1] Definisikan MemoryEntry schema** — Scope: packages/types. Done when: Entry memiliki scope, source, createdAt, expiresAt..
- [ ] **DX2-0302 [P1] Definisikan MemoryScope enum** — Scope: packages/types. Done when: Project, mission, task, agent-run terpisah..
- [ ] **DX2-0303 [P1] Definisikan MemoryProvenance schema** — Scope: packages/types. Done when: Source dan revision dapat ditelusuri..
- [ ] **DX2-0304 [P1] Definisikan MemoryConfidence field** — Scope: packages/types. Done when: Confidence memakai enum/range terdokumentasi..
- [ ] **DX2-0305 [P1] Definisikan MemorySensitivity enum** — Scope: packages/types. Done when: Public, internal, sensitive terpisah..
- [ ] **DX2-0306 [P1] Tambahkan memory input validator** — Scope: memory package atau packages/session. Done when: Invalid entry ditolak..
- [ ] **DX2-0307 [P1] Tolak penyimpanan secret pada memory** — Scope: memory package. Done when: Secret fixture diblokir atau diredaksi..
- [ ] **DX2-0308 [P1] Tambahkan deduplication key memory** — Scope: memory package. Done when: Duplicate content tidak menumpuk..
- [ ] **DX2-0309 [P1] Tambahkan expiration evaluator** — Scope: memory package. Done when: Expired memory tidak diretrieve..
- [ ] **DX2-0310 [P1] Tambahkan stale memory detector** — Scope: memory package. Done when: Memory lama ditandai stale berdasarkan source revision..
- [ ] **DX2-0311 [P1] Tambahkan exact keyword memory search** — Scope: memory package. Done when: Query mengembalikan provenance..
- [ ] **DX2-0312 [P1] Tambahkan memory retrieval scope filter** — Scope: memory package. Done when: Task hanya menerima scope authorized..
- [ ] **DX2-0313 [P1] Tambahkan memory retrieval budget** — Scope: memory package. Done when: Hasil dibatasi jumlah dan token..
- [ ] **DX2-0314 [P1] Wajibkan citation untuk memory faktual** — Scope: memory package. Done when: Entry tanpa source tidak dianggap fakta pasti..
- [ ] **DX2-0315 [P1] Tambahkan user correction event** — Scope: memory package. Done when: Correction membuat revision baru..
- [ ] **DX2-0316 [P1] Tambahkan memory export JSON** — Scope: CLI. Done when: Export punya schema version dan bebas secret..
- [ ] **DX2-0317 [P1] Tambahkan memory import dry-run** — Scope: CLI. Done when: Preview validasi tanpa write..
- [ ] **DX2-0318 [P1] Tambahkan memory delete-by-scope** — Scope: CLI. Done when: Hanya scope diminta terhapus dan audit event tercatat..
- [ ] **DX2-0319 [P1] Tambahkan memory backup/restore test** — Scope: memory package tests. Done when: Data fixture pulih akurat..
- [ ] **DX2-0320 [P1] Tambahkan retrieval precision fixture** — Scope: memory package tests. Done when: Expected entries muncul pada top-k..

## M12 — Mission Control, workspaces, dan UX — 30 micro-tasks

**Goal:** Satu War Room mengelola goal dan agent fleet dengan status backend sebagai sumber kebenaran.
**Gate:** selesaikan task wajib fase ini dan verifikasi gate sebelum fase berikutnya. Task independen boleh diparalelkan.

- [ ] **DX2-0321 [P1] Inventaris route UI yang benar-benar dipakai** — Scope: apps/web. Done when: Route map berasal dari source..
- [ ] **DX2-0322 [P1] Definisikan typed frontend API client** — Scope: apps/web. Done when: UI tidak menyusun endpoint tersebar..
- [ ] **DX2-0323 [P1] Definisikan typed server event client** — Scope: apps/web. Done when: Event payload divalidasi saat diterima..
- [ ] **DX2-0324 [P1] Tambahkan loading state untuk job list** — Scope: apps/web. Done when: Loading berbeda dari empty..
- [ ] **DX2-0325 [P1] Tambahkan empty state untuk mission list** — Scope: apps/web. Done when: Empty state memiliki next action aman..
- [ ] **DX2-0326 [P1] Tambahkan error state mission list** — Scope: apps/web. Done when: Retry tidak membuat duplicate mission..
- [ ] **DX2-0327 [P1] Tambahkan stale connection indicator** — Scope: apps/web. Done when: SSE/WebSocket disconnect terlihat..
- [ ] **DX2-0328 [P1] Tambahkan reconnect exponential backoff** — Scope: apps/web. Done when: Reconnect tidak membuat duplicate subscription..
- [ ] **DX2-0329 [P1] Gunakan canonical TaskStatus badge** — Scope: apps/web. Done when: Tidak ada label status buatan UI..
- [ ] **DX2-0330 [P1] Tambahkan acceptance criteria pada task detail** — Scope: apps/web. Done when: User bisa membaca goal dan done criteria..
- [ ] **DX2-0331 [P1] Tambahkan evidence pada task detail** — Scope: apps/web. Done when: Verifier result dan commit SHA terlihat..
- [ ] **DX2-0332 [P1] Tambahkan job log view dengan redaction** — Scope: apps/web. Done when: Secret tidak ditampilkan..
- [ ] **DX2-0333 [P1] Tambahkan agent run timeline** — Scope: apps/web. Done when: Timeline berasal dari persisted events..
- [ ] **DX2-0334 [P1] Tambahkan provider health panel** — Scope: apps/web. Done when: Cookie/session secret tidak ditampilkan..
- [ ] **DX2-0335 [P1] Tambahkan routing explanation panel** — Scope: apps/web. Done when: Alasan keputusan terlihat tanpa prompt content..
- [ ] **DX2-0336 [P1] Tambahkan budget indicator per mission** — Scope: apps/web. Done when: Pemakaian dan sisa budget terlihat..
- [ ] **DX2-0337 [P1] Tambahkan pause mission action** — Scope: apps/web. Done when: Action memakai API dan state server terkonfirmasi..
- [ ] **DX2-0338 [P1] Tambahkan resume mission action** — Scope: apps/web. Done when: Action hanya aktif pada status valid..
- [ ] **DX2-0339 [P1] Tambahkan cancel mission action** — Scope: apps/web. Done when: Cancel mempropagasi ke child tasks..
- [ ] **DX2-0340 [P1] Tambahkan retry task action** — Scope: apps/web. Done when: Retry membuat attempt baru tertaut..
- [ ] **DX2-0341 [P1] Tambahkan create mission form minimal** — Scope: apps/web. Done when: Form hanya meminta goal dan project scope..
- [ ] **DX2-0342 [P1] Tambahkan mission priority selector** — Scope: apps/web. Done when: Value memakai canonical priority..
- [ ] **DX2-0343 [P1] Tambahkan project switcher** — Scope: apps/web. Done when: Semua query memakai project scope..
- [ ] **DX2-0344 [P1] Tambahkan workspace isolation indicator** — Scope: apps/web. Done when: Root workspace aktif ditampilkan..
- [ ] **DX2-0345 [P1] Tambahkan responsive War Room layout** — Scope: apps/web. Done when: Dashboard terbaca pada desktop dan tablet..
- [ ] **DX2-0346 [P1] Tambahkan keyboard navigation task table** — Scope: apps/web. Done when: Focus order bisa digunakan tanpa mouse..
- [ ] **DX2-0347 [P1] Tambahkan accessible label untuk action icons** — Scope: apps/web. Done when: Screen reader mendapat nama action..
- [ ] **DX2-0348 [P1] Test UI mission pause/resume** — Scope: apps/web tests. Done when: Action dan server state diuji..
- [ ] **DX2-0349 [P1] Test UI disconnected event stream** — Scope: apps/web tests. Done when: Stale state dan reconnect diuji..
- [ ] **DX2-0350 [P1] Test UI evidence status** — Scope: apps/web tests. Done when: Unverified tidak diberi gaya verified..

## M13 — Extensibility, MCP, SDK, dan integrations — 25 micro-tasks

**Goal:** Ekosistem berkembang lewat adapter yang memakai contract dan permission yang sama.
**Gate:** selesaikan task wajib fase ini dan verifikasi gate sebelum fase berikutnya. Task independen boleh diparalelkan.

- [ ] **DX2-0351 [P2] Definisikan PluginManifest schema** — Scope: packages/plugins. Done when: Name, version, entry, capabilities, permissions tervalidasi..
- [ ] **DX2-0352 [P2] Tolak plugin manifest tanpa version** — Scope: packages/plugins tests. Done when: Invalid manifest menghasilkan error..
- [ ] **DX2-0353 [P2] Tolak duplicate tool ID antar plugin** — Scope: packages/plugins tests. Done when: Registry tidak menimpa tool lama..
- [ ] **DX2-0354 [P2] Definisikan plugin permission declaration** — Scope: packages/plugins. Done when: Permission harus eksplisit dan least-privilege..
- [ ] **DX2-0355 [P2] Tambahkan plugin lifecycle enum** — Scope: packages/plugins. Done when: Installed, enabled, disabled, failed terpisah..
- [ ] **DX2-0356 [P2] Tambahkan plugin compatibility metadata** — Scope: packages/plugins. Done when: Core API range tervalidasi..
- [ ] **DX2-0357 [P2] Tambahkan plugin signature/checksum metadata** — Scope: packages/plugins. Done when: Artifact integrity dapat diperiksa..
- [ ] **DX2-0358 [P2] Tambahkan fake plugin fixture** — Scope: packages/plugins tests. Done when: Lifecycle diuji offline..
- [ ] **DX2-0359 [P2] Tambahkan plugin disable action** — Scope: packages/plugins. Done when: Disable menghentikan tool registration..
- [ ] **DX2-0360 [P2] Tambahkan plugin crash isolation test** — Scope: packages/plugins tests. Done when: Plugin failure tidak merusak core..
- [ ] **DX2-0361 [P2] Bangun MCP tool catalog dari registry canonical** — Scope: packages/mcp. Done when: Definisi tool tidak diduplikasi..
- [ ] **DX2-0362 [P2] Tambahkan MCP schema compatibility test** — Scope: packages/mcp tests. Done when: Input dan output sesuai contract..
- [ ] **DX2-0363 [P2] Tambahkan MCP auth policy** — Scope: packages/mcp. Done when: Remote MCP tidak terbuka tanpa credential..
- [ ] **DX2-0364 [P2] Forward MCP tool permission ke policy engine** — Scope: packages/mcp. Done when: MCP action melewati policy..
- [ ] **DX2-0365 [P2] Tambahkan SDK typed client untuk task create** — Scope: packages/sdk. Done when: SDK memakai API schema canonical..
- [ ] **DX2-0366 [P2] Tambahkan SDK typed client untuk task get** — Scope: packages/sdk. Done when: Response divalidasi..
- [ ] **DX2-0367 [P2] Tambahkan SDK typed client untuk task cancel** — Scope: packages/sdk. Done when: Cancellation mengembalikan typed result..
- [ ] **DX2-0368 [P2] Tambahkan SDK retry helper dengan idempotency key** — Scope: packages/sdk. Done when: Retry tidak duplicate submission..
- [ ] **DX2-0369 [P2] Tambahkan SDK error mapping** — Scope: packages/sdk. Done when: HTTP error menjadi typed error..
- [ ] **DX2-0370 [P2] Tambahkan SDK integration test dengan fake API** — Scope: packages/sdk tests. Done when: Tidak perlu server eksternal..
- [ ] **DX2-0371 [P2] Tambahkan WebSocket auth handshake** — Scope: packages/ws-server. Done when: Unauthorized connection ditolak..
- [ ] **DX2-0372 [P2] Validasi WebSocket event envelope** — Scope: packages/ws-server. Done when: Invalid event ditolak..
- [ ] **DX2-0373 [P2] Tambahkan WebSocket subscription scope** — Scope: packages/ws-server. Done when: Client hanya subscribe project/task authorized..
- [ ] **DX2-0374 [P2] Generate OpenAPI dari route schema** — Scope: packages/openapi. Done when: Spec mencakup route terdaftar..
- [ ] **DX2-0375 [P2] Tambahkan OpenAPI contract test** — Scope: packages/openapi tests. Done when: Breaking change terdeteksi..

## M14 — Operations, persistence, packaging, recovery — 30 micro-tasks

**Goal:** Platform dapat dipasang, dioperasikan, dibackup, dipulihkan, dan diupgrade tanpa kehilangan data.
**Gate:** selesaikan task wajib fase ini dan verifikasi gate sebelum fase berikutnya. Task independen boleh diparalelkan.

- [ ] **DX2-0376 [P2] Dokumentasikan minimum Node dan pnpm version** — Scope: docs/install. Done when: Versi sama dengan engines dan CI..
- [ ] **DX2-0377 [P2] Buat preflight runtime dependency check** — Scope: CLI doctor. Done when: Missing dependency memberi fix hint..
- [ ] **DX2-0378 [P2] Buat writable data-directory check** — Scope: CLI doctor. Done when: Permission failure ditemukan sebelum start..
- [ ] **DX2-0379 [P2] Buat workspace root check** — Scope: CLI doctor. Done when: Invalid root ditolak..
- [ ] **DX2-0380 [P2] Tambahkan config schema version** — Scope: packages/config-api. Done when: Config dapat dimigrasikan per versi..
- [ ] **DX2-0381 [P2] Tambahkan config validation command** — Scope: CLI. Done when: Invalid config menampilkan path dan reason..
- [ ] **DX2-0382 [P2] Tulis config secara atomic** — Scope: packages/config-api. Done when: Interrupted write tidak merusak config lama..
- [ ] **DX2-0383 [P2] Backup config sebelum migration** — Scope: packages/config-api. Done when: Backup dibuat sebelum transform..
- [ ] **DX2-0384 [P2] Tambahkan liveness endpoint** — Scope: apps/api. Done when: Liveness tidak tergantung provider eksternal..
- [ ] **DX2-0385 [P2] Tambahkan readiness endpoint** — Scope: apps/api. Done when: Readiness mencerminkan dependency wajib..
- [ ] **DX2-0386 [P2] Tambahkan dependency health summary** — Scope: apps/api. Done when: DB, worker, provider dipisahkan..
- [ ] **DX2-0387 [P2] Tambahkan graceful API shutdown** — Scope: apps/api. Done when: Request baru dihentikan dan state di-flush..
- [ ] **DX2-0388 [P2] Tambahkan database migration lock** — Scope: packages/database. Done when: Dua proses tidak migrate bersamaan..
- [ ] **DX2-0389 [P2] Tambahkan migration idempotency test** — Scope: packages/database tests. Done when: Migration ulang aman..
- [ ] **DX2-0390 [P2] Tambahkan database backup command** — Scope: apps/api backup CLI. Done when: Backup menghasilkan checksum..
- [ ] **DX2-0391 [P2] Tambahkan restore dry-run** — Scope: apps/api restore CLI. Done when: Target diverifikasi tanpa overwrite..
- [ ] **DX2-0392 [P2] Test restore pada temporary directory** — Scope: packages/database tests. Done when: Fixture pulih akurat..
- [ ] **DX2-0393 [P2] Tambahkan retention policy untuk event/log** — Scope: packages/database. Done when: Evidence penting tidak terhapus default..
- [ ] **DX2-0394 [P2] Tambahkan disk usage warning** — Scope: CLI doctor. Done when: Warning muncul sebelum storage kritis..
- [ ] **DX2-0395 [P2] Tambahkan correlation fields pada structured logs** — Scope: apps/api, packages/runtime. Done when: TaskId/runId tersedia tanpa secret..
- [ ] **DX2-0396 [P2] Tambahkan opt-in local metrics endpoint** — Scope: packages/observability. Done when: Tidak ada outbound telemetry default..
- [ ] **DX2-0397 [P2] Buat Dockerfile development** — Scope: deployment files. Done when: Image build dari clean checkout..
- [ ] **DX2-0398 [P2] Buat Docker Compose minimal API dan web** — Scope: deployment files. Done when: Health check mencerminkan readiness..
- [ ] **DX2-0399 [P2] Dokumentasikan persistent volume mapping** — Scope: deployment files. Done when: DB/config/artifact bertahan saat restart..
- [ ] **DX2-0400 [P2] Jalankan container sebagai non-root** — Scope: Dockerfile. Done when: Container tidak berjalan sebagai root..
- [ ] **DX2-0401 [P2] Buat release manifest dry-run** — Scope: scripts/release. Done when: Version, SHA, platform, checksum tercatat..
- [ ] **DX2-0402 [P2] Tambahkan SBOM generation dry-run** — Scope: CI workflow. Done when: SBOM dapat dibuat tanpa publish..
- [ ] **DX2-0403 [P2] Tulis rollback runbook** — Scope: docs/runbooks. Done when: Langkah rollback diuji pada fixture..
- [ ] **DX2-0404 [P2] Tulis upgrade runbook** — Scope: docs/runbooks. Done when: Upgrade mempertahankan data pada fixture..
- [ ] **DX2-0405 [P2] Tambahkan fresh-install smoke test** — Scope: CI workflow. Done when: Install baru menjalankan doctor dan version..

## M15 — Benchmark, research loop, dan product acceptance — 30 micro-tasks

**Goal:** Membuktikan peningkatan kapabilitas melalui hasil terukur, bukan klaim marketing.
**Gate:** selesaikan task wajib fase ini dan verifikasi gate sebelum fase berikutnya. Task independen boleh diparalelkan.

- [ ] **DX2-0406 [P2] Definisikan benchmark task categories** — Scope: benchmarks. Done when: Bugfix, feature, refactor, docs, test, security, repo navigation terpisah..
- [ ] **DX2-0407 [P2] Definisikan benchmark task schema** — Scope: benchmarks. Done when: Setiap task punya revision, prompt, constraints, evaluator..
- [ ] **DX2-0408 [P2] Buat 5 repo-navigation fixture tasks** — Scope: benchmarks/fixtures. Done when: Expected file/symbol reference tersedia..
- [ ] **DX2-0409 [P2] Buat 5 bugfix fixture tasks dengan regression test** — Scope: benchmarks/fixtures. Done when: Baseline failing test tersedia..
- [ ] **DX2-0410 [P2] Buat 5 test-authoring fixture tasks** — Scope: benchmarks/fixtures. Done when: Expected behavior coverage terdokumentasi..
- [ ] **DX2-0411 [P2] Buat 5 docs-change fixture tasks** — Scope: benchmarks/fixtures. Done when: Acceptance mencakup link dan command correctness..
- [ ] **DX2-0412 [P2] Buat 5 security regression fixture tasks** — Scope: benchmarks/fixtures. Done when: Expected safe/unsafe behavior jelas..
- [ ] **DX2-0413 [P2] Buat deterministic fake model untuk benchmark** — Scope: benchmarks. Done when: Pipeline berjalan tanpa biaya provider..
- [ ] **DX2-0414 [P2] Buat benchmark runner CLI** — Scope: packages/cli. Done when: Runner menyimpan result JSON..
- [ ] **DX2-0415 [P2] Simpan model/provider/version per benchmark run** — Scope: benchmarks. Done when: Run dapat direproduksi..
- [ ] **DX2-0416 [P2] Simpan token/call/time budget per benchmark run** — Scope: benchmarks. Done when: Budget tercatat per run..
- [ ] **DX2-0417 [P2] Hitung verified solve rate** — Scope: benchmarks. Done when: Hanya task dengan independent pass dianggap sukses..
- [ ] **DX2-0418 [P2] Hitung regression rate** — Scope: benchmarks. Done when: Change yang merusak baseline dihitung terpisah..
- [ ] **DX2-0419 [P2] Hitung time-to-verified-change** — Scope: benchmarks. Done when: Timer berhenti setelah evidence lengkap..
- [ ] **DX2-0420 [P2] Hitung cost per accepted change** — Scope: benchmarks. Done when: Cost per accepted change dibedakan dari cost per attempt..
- [ ] **DX2-0421 [P2] Hitung human intervention count** — Scope: benchmarks. Done when: Intervensi rutin dan safety-required dipisahkan..
- [ ] **DX2-0422 [P2] Hitung context retrieval precision at k** — Scope: benchmarks. Done when: Relevant retrieved files dibanding expected files..
- [ ] **DX2-0423 [P2] Hitung recovery success rate** — Scope: benchmarks. Done when: Crash simulation menghasilkan metrik..
- [ ] **DX2-0424 [P2] Hitung unauthorized action count** — Scope: benchmarks. Done when: Target benchmark adalah nol..
- [ ] **DX2-0425 [P2] Bandingkan native single-agent baseline** — Scope: benchmarks. Done when: Repo revision dan budget sama..
- [ ] **DX2-0426 [P2] Bandingkan multi-agent workflow** — Scope: benchmarks. Done when: Prompt, task set, dan budget sama..
- [ ] **DX2-0427 [P2] Buat report benchmark Markdown** — Scope: benchmarks. Done when: Report memuat run IDs dan validitas..
- [ ] **DX2-0428 [P2] Tambahkan CI smoke benchmark kecil** — Scope: CI workflow. Done when: Benchmark deterministic selesai pada PR..
- [ ] **DX2-0429 [P2] Tulis competitive positioning berbasis evidence** — Scope: docs/product. Done when: Tidak ada klaim superiority tanpa hasil sebanding..
- [ ] **DX2-0430 [P2] Tulis public capability matrix** — Scope: docs/product. Done when: Available, partial, planned, unsupported dibedakan..
- [ ] **DX2-0431 [P2] Tulis threat model ringkas** — Scope: docs/security. Done when: Assets, trust boundaries, threats, mitigations tercatat..
- [ ] **DX2-0432 [P2] Tulis data-flow privacy matrix** — Scope: docs/security. Done when: Local-only, browser provider, API provider, log dibedakan..
- [ ] **DX2-0433 [P2] Tulis clean-machine setup tutorial** — Scope: docs/tutorials. Done when: Happy path berjalan dengan mock provider..
- [ ] **DX2-0434 [P2] Tulis mission end-to-end tutorial** — Scope: docs/tutorials. Done when: Mission menghasilkan diff dan evidence bundle..
- [ ] **DX2-0435 [P2] Tulis release readiness report** — Scope: docs/release. Done when: Known limits, evidence, unsupported actions jelas..

---

## 3. Cross-phase acceptance gates

| Gate | Syarat |
|---|---|
| G0 — Truthful baseline | Main SHA, CI status, manifests, env, routes, data flow, task-status evidence tercatat |
| G1 — Consistent repository | Workspace, package names, scripts, filters, TS references, lockfiles, env docs, metadata konsisten |
| G2 — Green engineering gate | Clean install, build, typecheck, unit/integration tests, CLI pack/smoke, DOM tests pada matrix wajib |
| G3 — Safe execution | Path, command, process, network, secrets, browser, plugin, API auth, audit policy punya regression test |
| G4 — Durable orchestration | Task/job/event state tahan restart; lease/retry/checkpoint/cancel idempotent |
| G5 — Agent fleet | Native dan external adapters memakai kontrak sama, isolated worktree, bounded execution |
| G6 — Proof-first | Agent self-assertion tidak cukup; evidence bundle dan verifier independen wajib |
| G7 — Intelligent routing | Routing berdasar capability, quality, quota, latency, privacy, budget; no silent fallback |
| G8 — Repository intelligence | Repo Atlas incremental, privacy-aware, freshness-aware, source-located |
| G9 — Mission control | Mission/task/agent/budget/status UI merefleksikan server truth dan bisa pause/resume/cancel |
| G10 — Ecosystem | CLI/API/SDK/MCP/WS/plugins/OpenAPI menggunakan contract yang sama |
| G11 — Operations | Backup/restore, upgrade/rollback, health, packaging, logs, recovery teruji |
| G12 — Product evidence | Benchmark reproducible, capability matrix, limits, privacy, security docs akurat |

## 4. Non-goals dan guardrails

Hal-hal ini bukan target implementasi otomatis:
- Melatih foundation model baru atau mengklaim model sendiri lebih pintar dari frontier model.
- Menyalin UI/brand proprietary kompetitor.
- Membypass rate limit, subscription policy, anti-bot, atau terms provider.
- Memakai cookie/session browser dengan cara yang melanggar izin pemilik akun.
- Mengirim repository/private prompt ke cloud secara default.
- Menjalankan command host-wide, menghapus data, publish, atau production deploy tanpa environment authorization.
- Memaksakan multi-agent pada task sederhana; satu agent + verifier lebih murah untuk task kecil.
- Menambah package hanya agar diagram arsitektur terlihat modular.
- Membangun dashboard sebelum backend contract dan event state stabil.

## 5. Operating modes untuk agent kecil

| Mode | Kapan dipilih | Pola kerja |
|---|---|---|
| Scout | Baseline/audit | Read-only; fakta, file path, SHA, test command |
| Micro-implementer | Task kecil dan terisolasi | Satu task, satu diff, targeted test |
| Test-fixer | Regression/CI failure | Reproduce, root cause, minimal fix, no assertion weakening |
| Verifier | Sesudah implementer | Review independen, acceptance check, evidence |
| Integrator | Batch siap merge | Resolve conflict, rerun gate, merge bila policy mengizinkan |
| Docs gardener | Docs/config drift | Cocokkan docs terhadap source; koreksi klaim salah |

Planner tidak perlu memakai model mahal untuk setiap task. Gunakan model kecil untuk scout, implementer, test-fixer, dan docs gardener; eskalasi hanya saat verifier menemukan ambiguitas arsitektur/keamanan yang tidak dapat diselesaikan dari kontrak.

## 6. Research dan benchmark reference

Gunakan referensi sebagai inspirasi dan sumber evaluasi; jangan menyalin desain atau mengasumsikan hasil paper otomatis berlaku:
- OpenAI Harness Engineering: https://openai.com/index/harness-engineering/
- SWE-bench: https://www.swebench.com/
- SWE-bench Pro: https://scale.com/leaderboard/swe_bench_pro_public
- SWE-agent: https://github.com/SWE-agent/SWE-agent
- Agentless: https://github.com/OpenAutoCoder/Agentless
- OpenHands SDK: https://github.com/All-Hands-AI/OpenHands
- Paperclip: https://github.com/paperclipai/paperclip
- Worktrunk: https://github.com/max-sixty/worktrunk
- Codex docs: https://developers.openai.com/codex/
- Qoder: https://qoder.com/
- FreeLLMAPI: https://github.com/FreeLMM/FreeLLMAPI
- 9Router: https://github.com/9router/9router

## 7. Definition of product success

Rocksoul DX baru boleh menyebut dirinya Autonomous Developer Operating System ketika satu mission nyata dapat:
1. menerima goal dan project scope;
2. memeriksa Repo Atlas dan menghasilkan plan berisi micro-task;
3. menjadwalkan beberapa agent/adapter di worktree terisolasi;
4. memilih model/provider berdasarkan capability, quality, quota, privacy, budget;
5. menjalankan tools dengan permission minimum;
6. recover setelah process/worker restart;
7. menguji hasil dengan verifier independen;
8. menghasilkan evidence bundle yang mengikat requirement → task → diff → test → commit → CI;
9. menampilkan status jujur di War Room;
10. selesai tanpa konfirmasi rutin, sambil berhenti pada aksi eksternal/destructive yang memerlukan otorisasi.

**Target pembuktian:** peningkatan verified solve rate dan penurunan regression rate, time-to-verified-change, cost per accepted change, recovery failures, dan human interventions yang tidak perlu—tanpa unauthorized action atau secret leak.

## 8. Progress ledger

Tambahkan satu baris per batch yang benar-benar dikerjakan. Jangan mengisi status dari klaim commit message saja.

| Date | Task IDs | Commit SHA | Targeted checks | CI SHA / result | Notes |
|---|---|---|---|---|---|
| 2026-11-05 | Backlog authored; execution not started | To be recorded | Document-only change | Pending | Semua task DX2 berstatus belum dikerjakan |
| 2026-11-05 | DX2-0001 s/d DX2-0020 (M00 re-baseline) + perbaikan baseline CI | `2d6c476`, `e1bd9b5`, `1cf3f96` | `pnpm exec vitest run` (28 file / 276 test), `pnpm --filter @dx-platform/tests test` (session lock, 24 lulus), `pnpm install --frozen-lockfile`, `pnpm check` | `1cf3f96` / **success**, 5 job hijau (dom + ubuntu/windows × Node 20.17.0/22.13.0) | `main` tadinya merah 5 run berturut-turut; 5 akar masalah berbeda diperbaiki. Bukti lengkap di `.plans/baseline-2026-11-05.md`. Todo.md v1 TIDAK diubah: 0 tercentang vs klaim 192 verified di history, perlu bukti ulang per task |
| 2026-11-05 | DX2-0027, 0028, 0029, 0030, 0031, 0032, 0033, 0034, 0037, 0038 (M01 batch 1) | `0ac6621` | `pnpm --filter @dx-platform/api build`, `pnpm --filter @dx-platform/web build`, DOM tests `WTAGENT_DOM_TESTS=1` (14 lulus), `node dist/main.js --version` → 1.0.3, `pack --dry-run` | `0ac6621` / **success**, 5 job hijau | 5 filter CI ternyata no-op (`@neuralforge/*` tidak ada; pnpm exit 0), jadi `apps/api` + `apps/web` belum pernah dibangun CI dan 14 test DOM belum pernah jalan. 126 artefak `.next` di-untrack, file tetap di disk |
| 2026-11-05 | DX2-0021, 0022, 0023, 0026, 0035, 0036 **masih terbuka** (keputusan rename scope npm + pemilihan lockfile authoritative) | — | — | — | Tidak dikerjakan sepihak: rename `neuralforge` berdampak ke npm/biner user, dan menghapus lockfile duplikat butuh keputusan consumer. Dasar analisis sudah dicatat di `.plans/baseline-2026-11-05.md` §2/§10 |
| 2026-11-05 | DX2-0024, 0025, 0039, 0040 (M01 batch 2) | batch ini | `pnpm brand:check` lulus, parse `package.json` valid, `.env.example` tidak ter-ignore (`!.env.example`) | batch 1 terverifikasi: `0ac6621` / **success**, 5 job hijau, job `dom` melaporkan `Tests 14 passed (14)` dan **0** kemunculan `No projects matched` | `.env.example` dibuat (sebelumnya tidak ada); 2 klaim "no cloud / no data exfiltration" dikoreksi (`package.json`, `spec/blueprint/00-executive-overview.md`); temuan baru: server baca `NEURALFORGE_DATA_DIR` tetapi backup-cli baca `WTAGENT_DATA_DIR` → backup bisa salah direktori |
| 2026-11-05 | DX2-0041 s/d DX2-0060 (M02 domain contracts) | `2e9e995` | `pnpm check` (tsc -b --force, exit 0), `pnpm exec vitest run` (34 file / 327 lulus / 1 skip) | `2e9e995` / **success**, 5 job hijau (dom + ubuntu/windows × Node 20.17.0/22.13.0) | `packages/types` sekarang punya 7 modul kontrak (ids, validation, task, status, capability, invocation, evidence) + 4 test spec; `packages/protocol` tambah `event.ts` (EventEnvelope v1), `packages/shared` tambah `error-envelope.ts`. DX2-0054 memakai `ToolResult` yang sudah ada di `tool.ts` (bentuk ok/message/output/meta sudah stabil) dan kini ditegakkan di boundary ToolCall. Temuan: 3 validator pertama saya mengembalikan `valid()` walau issue tersimpan untuk field opsional (missionId, dependsOn, version) - ketangkap karena test invalid-payload, sekarang semua validator menolak bila issue sink tidak kosong. JobStatus kanonis ada di types tetapi `packages/job/job-store.ts` masih punya enum sendiri (di luar graph `tsc -b`, belum di-wire). `packages/local` punya interface bernama sama `ModelCapability` dengan arti berbeda (`{name, description}`) - perlu rename di fase consumer |
| 2026-11-05 | DX2-0061 s/d DX2-0070 (M03 batch 1: inventaris manifest & test) | `d9011e0` | `pnpm check` (exit 0), `pnpm exec vitest run` (33 file / 326 lulus / 1 skip), lane `packages/tests` (750 lulus / 15 skip, termasuk 8 test manifest baru), `pnpm test` dijalankan di 21 package yang punya test script (semua exit 0) | `d9011e0` / **success**, 5 job hijau (dom + ubuntu/windows × Node 20.17.0/22.13.0) | `packages/tests/test/workspace-manifest.test.js` menegakkan 8 assertion yang menutup 10 task: workspace pattern vs manifest termasuk stray package, build script atau alasan tercatat, test script vs isi folder test, include root tanpa duplikat dan tanpa phantom, dependency internal wajib `workspace:*`, target bin/main/exports harus bisa diproduksi, setiap nama di `.env.example` harus punya reader, filter `--filter` CI harus nama package nyata. Temuan nyata yang diperbaiki: (1) `packages/database` `"test": "vitest run"` mewarisi config root, glob-nya relatif ke root, jadi selalu exit 1 dengan 'No test files found' - sekarang `vitest run --root ../.. packages/database/test` dan 14 test lulus; (2) glob `packages/diagnostics/test/**` phantom - foldernya ada di working tree saya tapi paketnya tidak ada di pnpm-workspace.yaml dan tidak di-track git, jadi tidak pernah cocok di CI - dihapus; (3) glob `packages/shared/test/**` tertulis dua kali - dedup; (4) `packages/openapi` dan `packages/observability` menyimpan `test` yang menunjuk folder tanpa file test (exit 1 kalau dipakai) - dihapus; (5) `packages/observability` mengekspor `./dist/index.js` padahal tidak ada `src/index.ts`-nya, jadi modul itu tidak mungkin pernah ada - `src/index.ts` ditambahkan; (6) 19 package punya spec tapi tidak bisa dijalankan per-package - script `vitest run --root ../.. <pkg>/test` ditambahkan. Yang sengaja TIDAK saya tutup diam-diam: `packages/runtime` dan `packages/ws-server` punya folder `test/` kosong (0 spec) sehingga tidak saya beri test script, dan 7 package di luar graph `tsc -b` (ws-server, openapi, observability, local, diagnostics, dll) berisi kode yang gagal compile. Saya pernah benar-benar memasukkan ketujuhnya ke references root: `pnpm check` exit 2 dengan puluhan error nyata, misalnya `packages/ws-server` memanggil `JobService.progress/update/finalize` yang tidak ada dan memakai `#private` di class yang di-export; lalu saya revert supaya baseline yang di-push tetap hijau. Gap itu dikerjakan sebagai DX2-0071, bukan ditandai selesai di sini |
| 2026-11-05 | DX2-0071 s/d DX2-0078 (M03 batch 2: typecheck, lint, clean-build, lockfile, verifikasi matrix) | `d04130e` | `pnpm check` (exit 0, kini 25 package di solution), `tsc -b --force` per package exit 0 di 27 package/apps, `pnpm exec vitest run` (33 file / 326 lulus / 1 skip), lane `packages/tests` (754 lulus / 15 skip di 50 file, termasuk 12 test manifest), `node scripts/assert-dist.mjs` (exit 0, 25 package, sesudah simulasi clean-build lokal: hapus seluruh dist lalu `pnpm build` dari nol) | `d04130e` / **success**, 6 job hijau (4 kaki test matrix ubuntu/windows x Node 20.17.0/22.13.0 + `clean-build` baru + `dom`) — step "Refuse a checkout that ships build output" dan `node scripts/assert-dist.mjs` keduanya jalan di CI dan lulus, jadi bukti dist hilang-berhasil-build berasal dari runner bersih, bukan hanya mesin saya | DX2-0071: `typecheck` = `tsc -b --force` ditambahkan ke 27 package/apps dan solution root diperlebar dari 19 ke 25 references (job, plugins, config-api, local, openapi, observability masuk). Enam package itu sebelumnya TIDAK PERNAH di-typecheck oleh `pnpm check` maupun CI. Yang rusak di dalamnya nyata dan sekarang diperbaiki, bukan disuppress: `packages/local` (`LocalModelSupport` tidak pernah di-export walau `src/index.ts` me-re-export-nya sebagai value; `generateWithOllama`/`generateWithLMStudio` membentuk URL `http://undefined:undefined/...` bila provider belum dikonfigurasi - kini guard lebih dulu, sama seperti method lain di file itu), `packages/observability` (field privat `metrics` dan method `metrics()` bertabrakan - nama publik dipertahankan, map privat jadi `entries`), `packages/openapi` (dead alias `export type { ... OpenAPISpec }` yang menduplikasi 7 interface yang sudah di-export, dan `app._router` yang bukan bagian dari API Fastify - baris itu tidak pernah dipakai sehingga dihapus; fungsi itu memang belum jalan), `packages/local`+`openapi`+`observability` kini ikut build root. DX2-0072: tidak ada satu pun konfigurasi lint di repo (tidak ada eslint.config/biome/oxlint dan tidak ada dependency-nya), jadi tidak ditambahkan lint command; `apps/web` ternyata menyimpan `"lint": "next lint"` yang butuh eslint yang tidak pernah di-install - dihapus, dan test manifest menolak script `lint` tanpa file konfigurasi. DX2-0073: job `clean-build` ditambahkan (checkout fresh -> tolak checkout yang mengandung dist/tsbuildinfo ter-commit -> `pnpm install --frozen-lockfile --ignore-scripts` -> `pnpm build` -> `node scripts/assert-dist.mjs` -> `pnpm check`). `scripts/assert-dist.mjs` langsung menemukan cacat publikasi: `packages/errors` menjanjikan `main: ./dist/index.js` dan `files: ["dist"]` padahal tsconfig-nya tidak punya `outDir`, jadi `tsc -b` menulis `src/index.js` + `src/index.d.ts` dan kedua file build itu ter-commit; paket itu tidak akan pernah punya dist. outDir/rootDir/tsBuildInfoFile ditambahkan (build kini menghasilkan dist/index.js + index.d.ts), dan kedua artefak di `src/` dihapus setelah terbukti byte-identik dengan output build baru. Temuan ikutannya: alias `@neuralforge/errors` di harness menunjuk `../errors/dist` yang selama ini tidak ada. Simulasi clean-build lokal (hapus semua dist lalu `pnpm build` dari nol) langsung menangkap cacat kedua: `packages/sdk` memakai `"noEmit": true` padahal manifestnya menjanjikan `main: ./dist/index.js` dan `files: ["dist"]`, jadi solution root 19 references itu membangun sdk tanpa menghasilkan satu pun file - `dist/` hanya berisi tsbuildinfo. noEmit diganti `composite: true` dan build kini menghasilkan index.js/index.d.ts untuk 25 package; test manifest menambahkan aturan bahwa package di dalam solution dengan build script tidak boleh memakai noEmit. (Dependensi `@dx-platform/sdk` di `packages/config-api` sampai kini tidak pernah di-import src-nya, jadi belum ada korban runtime.) DX2-0074: `--frozen-lockfile` sudah dipakai di semua job sebelum batch ini (bukan perubahan baru), dan job clean-build memakainya juga. DX2-0075..0078: keempat kaki matrix (ubuntu/windows x Node 20.17.0/22.13.0) plus job `dom` hijau pada `d9011e0`, SHA run cocok dengan commit yang di-push. DX2-0075..0078: keempat kaki matrix (ubuntu/windows x Node 20.17.0/22.13.0) plus job `dom` hijau pada `d9011e0`, SHA run cocok dengan commit yang di-push. Bug pada step baru saya tangkap sebelum push: guard "tolak checkout berisi build output" semula `git ls-files | grep ... | wc -l`, dan karena Actions menjalankan step bash dengan `-eo pipefail`, tidak ada match (justru kasus lulus) membuat pipeline exit 1 dan step gagal; sekarang `|| true` di dalam command substitution dan kedua cabang diuji lokal (repo bersih -> exit 0, daftar kotor -> exit 1 + mencetak path). Verifikasi tambahan batch ini: `pnpm -r --if-present typecheck` exit 0 dengan 27 "Done" (jadi klaim exit 0 per package terukur, bukan asumsi) dan suite manifest 12/12 masih hijau sesudah workflow diedit. Yang masih terbuka dan tercatat sebagai exception, bukan disembunyikan: `packages/ws-server` (10 error: `private #field` tidak valid, `http.Socket` tidak ada, dan `JobService.update`/`finalize` + `JobRecord.progress` yang tidak ada di API job - menunggu keputusan kontrak job, jadi tidak saya karang) dan `apps/api` (bukan proyek composite, `tsc -b` menolak menjadikannya reference; tetap di-build CI lewat step filter sendiri). |
| 2026-11-05 | DX2-0085 s/d DX2-0090 (M03 batch 3: CI smoke tests, pack dry-run, CLI temp-install, quality-gate) | `f9f8bdc`, `f49312e` | `pnpm exec vitest run test/workspace-manifest.test.js` (15 lulus), `pnpm --filter @dx-platform/tests test` (59 lulus | 2 skip), `pnpm test` (33 file / 328 lulus), `pnpm check` (exit 0) | `f49312e` / **success**, 6 job hijau (ubuntu/windows x Node 20.17.0/22.13.0 + clean-build + dom) | DX2-0085: `test-results@latest` reporter menampilkan nama test gagal; DX2-0086: artifact logs terupload tanpa secret/profile; DX2-0087: DOM test lane terpisah (job `dom`); DX2-0088: pack dry-run verifikasi cache/private paths; DX2-0089: CLI temporary-install smoke test; DX2-0090: quality-gate root script + README developer section; juga f9f8bdc: fix missing test helpers, fix scratch profileDir, move browser tests to test/browser dir (23 files) |

**Starting instruction:** mulai dari DX2-0001, lakukan audit terbaru secara read-only, rekonsiliasi todo.md, lalu lanjutkan task READY pertama. Jangan lompat ke UI/branding saat P0/P1 gate masih gagal.
