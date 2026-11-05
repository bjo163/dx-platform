# Rocksoul DX Developer Platform — Autonomous Execution Backlog

> **Tujuan dokumen:** backlog eksekusi yang bisa diambil AI lokal secara mandiri, dikerjakan berurutan, diverifikasi dengan bukti, dan dilanjutkan lintas sesi tanpa meminta konfirmasi user untuk keputusan engineering rutin.
>
> **Repository:** bjo163/dx-platform  
> **Branch sumber:** main  
> **Produk saat ini di source/README:** NeuralForge / Omni-Nexus  
> **Arah platform dari rencana proyek:** Rocksoul DX Developer Platform  
> **Audit baseline:** 2026-11-04  
> **Dokumen ini menggantikan backlog branding lama** yang seluruh task-nya sudah dicentang tetapi tidak lagi mencakup kebutuhan engineering dan operational platform.

---

## 0. Product narrative — satu arah, batas yang jelas

### 0.1 Misi

Membangun **Rocksoul DX Developer Platform** sebagai platform pengembangan berbantuan AI yang local-first, modular, dapat di-embed, dan bisa dioperasikan secara mandiri. Platform menyediakan satu fondasi eksekusi yang dapat dipakai melalui CLI, Web War Room, REST API, SDK, WebSocket, MCP, dan integrasi IDE/CI.

NeuralForge adalah fondasi agent runtime dan pengalaman developer yang sudah ada di repository. Nama package dan API publik yang sekarang menggunakan scope **@neuralforge/** tetap menjadi kontrak kompatibilitas sampai ada migrasi branding yang direncanakan, diuji, dan terdokumentasi. Jangan melakukan global rename hanya karena nama platform berubah.

### 0.2 Pilar kemampuan

1. **Agent Execution Core** — task lifecycle, planning, tools, runtime, transcript, session recovery, artifacts, dan verifikasi hasil.
2. **Provider Mesh** — adapter AI berbasis browser session serta provider lokal seperti Ollama dan LM Studio; capability, health, fallback, dan quota harus eksplisit.
3. **Developer Interfaces** — CLI, Web War Room, REST/OpenAPI, SDK, WebSocket, MCP, dan integrasi IDE/CI yang menggunakan kontrak domain yang sama.
4. **Extensibility** — tool registry, plugin manifest, permission model, versi plugin, dan eksekusi terisolasi.
5. **Trust & Governance** — policy enforcement, path/command boundary, approval, secret handling, audit trail, dan safe defaults.
6. **Operations** — persistence, migration, backup/restore, health/readiness, telemetry lokal yang dapat dikontrol, packaging, deployment, upgrade, dan rollback.

### 0.3 Prinsip produk yang tidak boleh dilanggar

- **Local-first bukan berarti semua provider offline.** File system, workspace, orchestrator, dan eksekusi tool dapat berjalan lokal. Browser-based AI provider tetap merupakan layanan pihak ketiga; prompt, konteks, atau file yang dikirim kepadanya dapat diproses oleh provider tersebut. Dokumentasi wajib menyatakan aliran data ini secara jujur.
- **No API key** hanya berlaku untuk alur yang memakai akun web/browser session atau provider lokal. Adapter API-key boleh menjadi opsi terpisah di masa depan, bukan asumsi tersembunyi.
- **No cloud dependency** tidak boleh diklaim untuk browser provider. Gunakan istilah local execution / local data control dengan penjelasan outbound data yang jelas.
- Tidak ada provider fallback diam-diam dari model lokal ke provider web atau sebaliknya.
- Semua interface memakai domain contract, permission model, error model, dan event model yang sama.
- UI bukan sumber kebenaran status job. Job store/runtime adalah sumber kebenaran; UI hanya merefleksikan state server.
- Plugin, tool, terminal, browser, dan file workspace selalu melewati trust boundary yang sesuai.
- Satu kemampuan tidak disebut “complete/production-ready” hanya karena file source atau package folder sudah ada.

### 0.4 Definisi status

| Status | Makna | Aturan |
|---|---|---|
| **[ ]** | Belum dikerjakan / belum terbukti | Default untuk semua task baru |
| **[x]** | Selesai dan terverifikasi | Wajib ada test, command, atau evidence yang dicatat |
| **PARTIAL** | Source atau kerangka sudah ada, belum terbukti end-to-end | Dipakai di baseline, bukan pengganti checklist |
| **BLOCKED-EXTERNAL** | Hanya bagian yang memerlukan credential/layanan eksternal yang tidak tersedia | Buat mock/fixture; lanjutkan task independen |
| **DEFERRED** | Sengaja tidak masuk milestone aktif | Harus ada alasan dan kondisi untuk membuka kembali |

**Jangan** menandai task [x] berdasarkan inspeksi nama file, komentar TODO, README, atau asumsi. Task harus memenuhi seluruh kriteria selesai yang tertulis.

---

## 1. Baseline audit — keadaan yang benar-benar teramati

### 1.1 Komponen yang sudah mempunyai implementasi awal

| Area | Lokasi bukti | Status baseline |
|---|---|---|
| CLI | packages/cli | Ada dan memiliki test/pack smoke test |
| Web War Room | apps/web | Ada; halaman utama cukup besar dan perlu pemecahan/modularisasi |
| Fastify API | apps/api | Ada, banyak route sudah tersedia |
| Browser provider adapters | packages/browser | Ada 7 provider aktif di registry: ChatGPT, Claude, DeepSeek, Gemini, Grok, Kimi, GLM |
| Runtime | packages/runtime | Implementasi agent runtime besar sudah ada |
| Job lifecycle/store/runner | packages/job | Ada job store, runner, lease, timeout, dan recovery logic |
| Tool execution | packages/tools | Ada file tools, terminal spawn, output budget, dan process management |
| Policy/path guard | packages/policy | Ada policy engine dan path guard dengan test |
| PGlite persistence | packages/database, apps/api | Ada database dan integration tests |
| Session/transcript | packages/session | Ada session persistence, canonical transcript, export |
| SDK | packages/sdk | **PARTIAL:** public factory saat ini berupa stub/echo object, belum factory runtime produksi |
| WebSocket server | packages/ws-server | **PARTIAL:** source ada, belum masuk workspace; protocol/security/testing perlu dilengkapi |
| Config API | packages/config-api | **PARTIAL:** class config ada; bukan bukti endpoint REST yang terpasang |
| Local model | packages/local | **PARTIAL:** ada Ollama/LM Studio helper; cara eksekusi memakai shell command interpolation |
| Plugin system | packages/plugins | **PARTIAL:** manifest/config registry ada; validasi permission, sandbox, dan lifecycle belum terbukti menyeluruh |
| OpenAPI | packages/openapi | **SKELETON:** generator masih placeholder dan belum melakukan route discovery |
| Observability | packages/observability | **SKELETON/PARTIAL:** registry metrics sederhana; histogram dan integrasi server belum terbukti |
| MCP | packages/mcp | Source server dan tool definitions tersedia; perlu kontrak operasional/compatibility tests |

### 1.2 Gap integrasi repository

- pnpm workspace saat ini belum memasukkan packages/ws-server, packages/local, packages/openapi, dan packages/observability.
- Root TypeScript project references belum mencakup seluruh workspace/application package. Beberapa package yang telah terdaftar di pnpm workspace juga belum menjadi reference build.
- packages/ws-server mengimpor package ws, tetapi manifest yang diperiksa hanya menunjukkan @types/ws pada devDependencies; dependency runtime harus diverifikasi dan diperbaiki.
- Root vitest config memuat pola packages/diagnostics yang tidak ditemukan pada root tree dan memuat pola packages/shared dua kali.
- Root memiliki pnpm-lock.yaml dan package-lock.json; apps/api memiliki lockfile sendiri; apps/web memiliki pnpm-workspace.yaml sendiri. Konsolidasi harus dilakukan setelah memetakan kebutuhan dependency, bukan dengan menghapus file secara membabi buta.
- apps/web/.next terlihat berada di repository tree; generated output tidak boleh menjadi sumber kebenaran source.
- Root .gitignore mengecualikan /docs/, sementara dokumen yang dirujuk README seperti docs/BRANDING.md tidak terlihat di root pada audit.
- Beberapa script scratch/diagnostic ada di root. Tentukan mana yang masih dipakai test/repro sebelum memindahkan atau menghapusnya.

### 1.3 Defect CI yang sudah terkonfirmasi

Run CI terbaru yang diperiksa: 2026-11-04, workflow run 41869244577, commit 3a4f1ab95f1c21ea0d1b71089fe40920c71aa968.

- Build workspace, build API, build web, CLI smoke test, package pack dry-run, dan DOM regression job berhasil pada run tersebut.
- Empat kombinasi OS/Node di job test gagal pada test suite.
- Dua assertion yang gagal:
  - packages/tests/test/cli.test.js — “package exposes only the neuralforge executable”.
  - packages/tests/test/protocol-regression.test.js — “the published cli manifest is the single neuralforge executable”.
- Kedua test mengharapkan bin persis satu entry: neuralforge -> ./dist/main.js. Manifest packages/cli/package.json saat ini juga mengekspos alias nforge dan menunjuk neuralforge ke ./bin/cli.js.
- Test summary yang terlihat: 2 failed, sekitar 740+ passed; angka berbeda sedikit antar runner, kegagalan assertion sama.
- DOM job pada run terbaru berhasil. Jangan salah menyimpulkan browser DOM regression sebagai penyebab kegagalan CI ini.

### 1.4 File/rencana lama yang harus diperlakukan hati-hati

- todo.md lama sebagian besar berisi task rebrand/copywriting yang telah ditandai selesai. Ia bukan backlog implementasi platform yang memadai.
- .kilo/plans menyimpan rencana Rocksoul DX untuk SDK, WebSocket, Config API, plugin, local model, dan web app. Beberapa item lama itu sekarang telah mempunyai source code; statusnya harus ditentukan dari integrasi, test, dan operational evidence.
- spec/blueprint berisi dokumen historis bertanggal 2024-01-15. Simpan sebagai arsip referensi atau migrasikan dengan jelas; jangan biarkan angka/status 2024 dianggap kondisi current.
- FINAL_SUMMARY.md memiliki klaim coverage dan readiness historis. Klaim tersebut wajib diberi tanggal/rujukan atau diperbarui berdasarkan pipeline terkini.

---

## 2. Autonomous execution contract — wajib untuk AI lokal

AI lokal yang mengambil backlog ini harus mengikuti aturan berikut. Aturan ini menghilangkan kebutuhan meminta konfirmasi untuk keputusan engineering rutin, bukan memberi izin untuk tindakan eksternal yang tidak berwenang.

### 2.1 Aturan pengambilan task

1. Baca README.md, ARCHITECTURE.md, package.json, pnpm-workspace.yaml, tsconfig.json, vitest.config.ts, dokumen blueprint terkait, source implementation, dan test terkait sebelum mengubah komponen.
2. Pilih task **[ ]** paling awal yang dependency-nya sudah selesai. Jangan melewati P0 untuk mengerjakan fitur kosmetik.
3. Ambil satu task atomik, atau beberapa task yang saling bergantung dalam satu perubahan kecil bila hasil akhirnya dapat diverifikasi bersama.
4. Jangan bertanya kepada user tentang nama file, pilihan library minor, format internal, naming lokal, atau pilihan implementasi yang sudah bisa ditentukan dari konvensi repository. Pilih solusi paling kecil, aman, kompatibel, dan mudah diuji.
5. Bila ada beberapa solusi setara, pilih yang paling sedikit mengubah public API dan dependency graph. Catat keputusan dan alasan singkat di commit/PR.
6. Jangan melakukan mass rename, framework replacement, database replacement, atau arsitektur rewrite tanpa task eksplisit.
7. Jangan membuat package baru sebelum memeriksa workspace, source, package exports, dependency graph, dan apakah kemampuan yang sama sudah ada.
8. Jangan menduplikasi route, schema, provider registry, config parser, event type, atau tool implementation yang sudah ada. Perbaiki single source of truth.

### 2.2 Aturan implementasi dan verifikasi

9. Sebelum perubahan, identifikasi file, consumer, kontrak, test, dan risiko regression yang relevan.
10. Tambahkan/ubah regression test untuk setiap bug yang diperbaiki. Test baru harus gagal pada kondisi bug lama bila memungkinkan.
11. Jalankan test paling sempit terlebih dahulu, lalu package test, root test, build, typecheck, dan smoke test yang relevan.
12. Jalankan command dengan package manager repository (pnpm 10.33.4 pada baseline audit), bukan mencampur npm/yarn.
13. Periksa exit code dan output aktual. Jangan menyatakan “pass” hanya karena command terinisiasi.
14. Jangan menutupi test dengan skip, snapshot yang dilonggarkan, assertion dihapus, atau catch kosong untuk membuat CI hijau.
15. Jika test gagal karena perubahan, perbaiki sumbernya. Jika gagal karena environment eksternal, isolasi dengan fixture/mock yang deterministik dan catat keterbatasannya.
16. Jangan memperluas scope untuk membetulkan issue yang tidak terkait task aktif; catat sebagai task baru di fase yang tepat.
17. Update dokumen kontrak/API bila perubahan mengubah behavior, bukan hanya implementation detail.
18. Tandai **[x]** hanya setelah acceptance criteria seluruhnya lolos dan evidence dicatat dalam commit message, PR, atau test output.

### 2.3 Keputusan mandiri dan batas tindakan

19. Bila informasi spesifik tidak tersedia, pilih default konservatif yang tidak memperbesar privilege, tidak menghapus data, dan tidak mengirim data ke pihak luar.
20. Bila provider web/API key/credential tidak tersedia, gunakan fake adapter, mock HTTP server, fixture DOM, atau contract test. Lanjutkan task lain tanpa menunggu user.
21. Bila environment tidak menyediakan browser/Chromium, tandai hanya browser integration test sebagai tidak dapat dijalankan di environment tersebut; jalankan unit/fixture tests.
22. Bila package belum punya test harness, buat harness terkecil yang mengikuti Vitest dan pola repository. Jangan memblokir task lain yang independen.
23. Bila implementasi lama bertentangan dengan blueprint historis, prioritaskan behavior yang benar-benar sudah dipakai dan narasi produk di bagian 0. Dokumentasikan gap, jangan menganggap dokumen 2024 sebagai spesifikasi final.
24. Bila menemukan data user atau file generated, jangan menghapusnya tanpa pemeriksaan dan backup. Hapus hanya output build/cache yang jelas dapat dibuat ulang dan tidak mengandung input user.
25. Jangan menampilkan, mencetak, meng-commit, mengirim, atau memasukkan secret/token/cookie/API key ke log, fixture, error response, screenshot, support bundle, telemetry, atau transcript yang tidak sengaja dibagikan.
26. Jangan melakukan npm publish, release publik, deployment produksi, migrasi database produksi, penghapusan data persistent, atau perubahan akun/credential eksternal tanpa otorisasi/secret/approval yang telah disediakan secara eksplisit oleh environment.
27. Untuk operasi eksternal yang tidak terotorisasi, siapkan konfigurasi, manifest, checklist, dan dry-run test; jangan klaim operasi tersebut sudah dilakukan.
28. Jangan mengirim prompt/context ke provider cloud hanya untuk verifikasi tanpa test credential/integration yang memang disediakan. Mock default harus offline dan deterministik.

### 2.4 Git, resume, dan penyelesaian

29. Baca status Git dan branch sebelum mengubah file; jangan menimpa perubahan lokal yang belum di-commit.
30. Ikuti branch protection dan aturan repository. Jika main menerima push langsung dan task memang meminta main, commit sesuai aturan; jika branch dilindungi, buat branch dan PR tanpa meminta user untuk keputusan rutin.
31. Jangan force-push, rewrite history, atau menghapus branch remote.
32. Gunakan commit message yang menjelaskan scope, misalnya fix(cli): align published binary contract atau test(api): cover readiness behavior.
33. Jaga satu perubahan terfokus per commit; pisahkan refactor luas dari bugfix.
34. Setelah commit, periksa diff, status, SHA commit, CI run, dan file yang berubah.
35. Bila sesi berhenti, lanjutkan dari task pertama yang masih **[ ]**; periksa commit terbaru dan test evidence sebelum mengulang.
36. Setiap task selesai harus meninggalkan repository dalam keadaan buildable atau mencatat alasan terukur mengapa tidak.
37. Jangan mengubah checkbox task yang tidak dikerjakan.
38. Jika task tidak dapat diselesaikan dengan aman, tambahkan catatan hambatan dan task alternatif yang bisa dijalankan offline; jangan berhenti seluruh backlog.

### 2.5 Format pencatatan progress

Untuk task yang dikerjakan, catat minimal:
- Task ID dan perubahan singkat.
- File/package yang berubah.
- Command test/build yang dijalankan.
- Hasil aktual: pass/fail/skipped beserta alasan.
- Risiko atau migration note jika ada.
- Commit SHA atau PR link.

---

# 3. Execution backlog

## PHASE 00 — Restore a trustworthy green gate (P0)

**Goal:** menghilangkan defect CI yang sudah terbukti dan memastikan green gate menguji kontrak package yang benar.  
**Dependency:** tidak ada.  
**Exit gate:** seluruh matrix test/build/check lulus; tidak ada assertion yang dilemahkan.

- [ ] **DX-001 — Konfirmasi kontrak executable CLI.** Baca packages/cli/package.json, bin/cli.js, src/main.ts, test/cli.test.js, dan test/protocol-regression.test.js. Catat entry point yang benar-benar dibangun dan entry point yang dipakai package tarball. **Done when:** satu keputusan kontrak executable tercatat dan konsisten dengan smoke test serta kedua assertion test.
- [ ] **DX-002 — Hapus atau rekonsiliasi alias executable yang tidak didukung.** Sesuaikan field bin pada packages/cli/package.json dengan kontrak satu binary NeuralForge. Jika mengikuti test saat ini, gunakan satu key neuralforge dengan target ./dist/main.js; jangan menambah alias kedua. **Done when:** manifest memuat tepat satu bin dan target benar-benar ada setelah build.
- [ ] **DX-003 — Verifikasi entry point hasil build.** Jalankan build CLI, pastikan dist/main.js dihasilkan dan executable menjalankan --version. **Done when:** pnpm --filter neuralforge build dan node packages/cli/dist/main.js --version berhasil dari root.
- [ ] **DX-004 — Perbaiki package metadata bila entry point CLI bergeser.** Periksa main, types, exports, files, bin, dan scripts package CLI. **Done when:** setiap path metadata mengarah ke file yang ada di tarball hasil pack.
- [ ] **DX-005 — Jalankan test kegagalan CLI secara terisolasi.** Jalankan dua file test yang gagal di run 41869244577. **Done when:** kedua file lulus tanpa mengubah makna assertion.
- [ ] **DX-006 — Jalankan test manifest lint/contract secara langsung.** Pastikan test membaca manifest aktual, bukan fixture atau path yang salah. **Done when:** test gagal bila alias kedua ditambahkan kembali dan lulus untuk manifest canonical.
- [ ] **DX-007 — Verifikasi CLI pack dry-run.** Jalankan pnpm --filter neuralforge pack --dry-run dan periksa file list. **Done when:** executable, README, LICENSE, dan dist yang diperlukan tersedia; tidak ada source/private config yang tidak diperlukan.
- [ ] **DX-008 — Verifikasi binary di instalasi temporary.** Buat temporary directory, pack CLI, install tarball lokal tanpa publish, lalu jalankan command neuralforge --version. **Done when:** binary dapat dipanggil melalui PATH pada environment test.
- [ ] **DX-009 — Tambahkan test yang menolak bin alias tanpa kontrak.** Pertahankan assertion tepat satu executable, sekaligus validasi path target dan nama command. **Done when:** test mencakup cardinality, key, dan file target.
- [ ] **DX-010 — Jalankan keseluruhan root test suite.** Jalankan pnpm test setelah fix manifest. **Done when:** semua test yang wajib lulus; skipped test memiliki alasan yang terdefinisi.
- [ ] **DX-011 — Jalankan TypeScript check penuh.** Jalankan pnpm check dan tangani error yang memang disebabkan source/config. **Done when:** exit code 0 tanpa suppressions baru.
- [ ] **DX-012 — Jalankan workspace build.** Jalankan pnpm build dan simpan output package build. **Done when:** exit code 0 pada clean build.
- [ ] **DX-013 — Periksa hasil seluruh CI matrix.** Periksa hasil workflow yang dipicu commit; jangan mengasumsikan success. Periksa Ubuntu dan Windows pada Node 20.17 dan 22.13. **Done when:** seluruh matrix job sukses dan run SHA cocok dengan commit perbaikan.
- [ ] **DX-014 — Periksa job DOM/browser regression.** Verifikasi Chromium installation dan DOM/rendered-text regression job masih lulus setelah package adjustment. **Done when:** job dom lulus dan tidak ada test browser yang sengaja dinonaktifkan.
- [ ] **DX-015 — Tambahkan ringkasan CI failure dalam dokumen engineering.** Catat penyebab manifest mismatch, file perbaikan, dan command validasi. **Done when:** catatan menyebut failure spesifik dan SHA yang memperbaikinya.
- [ ] **DX-016 — Buat CI summary yang mudah ditriage.** Atur workflow agar ringkasan menyebut OS/Node/test file gagal tanpa perlu menelusuri seluruh log mentah. **Done when:** failure summary menampilkan failing matrix leg dan test identifier.
- [ ] **DX-017 — Pastikan CI tidak melewati test setelah command gagal.** Periksa shell behavior dan urutan step. **Done when:** kegagalan build/test menghentikan job dan status akhir workflow tidak dapat terlihat hijau palsu.
- [ ] **DX-018 — Tambahkan clean-install smoke test.** Uji pnpm install --frozen-lockfile --ignore-scripts pada checkout bersih, kemudian build. **Done when:** proses tidak memerlukan file hasil build yang sudah ter-commit.
- [ ] **DX-019 — Dokumentasikan matriks runtime yang benar-benar didukung.** Cocokkan engines, CI matrix, Playwright/Chromium, Node, pnpm, Windows, WSL2, macOS/Linux. **Done when:** satu tabel didukung/preview/best-effort/unsupported memiliki bukti test atau alasan.
- [ ] **DX-020 — Tetapkan green gate minimum untuk setiap PR.** Masukkan install, build, test, check, pack smoke, dan DOM fixture sesuai platform. **Done when:** branch policy/workflow menggunakan gate yang sama dan dijelaskan di CONTRIBUTING atau README.

## PHASE 01 — Workspace graph, package boundaries, repository hygiene (P0)

**Goal:** satu monorepo yang benar-benar membangun dan menguji semua package aktif.  
**Dependency:** PHASE 00.  
**Exit gate:** workspace list, package manifests, project references, lockfile, test discovery, dan CI coverage konsisten.

- [ ] **DX-021 — Inventarisasi package workspace secara otomatis.** Buat script yang membaca pnpm-workspace.yaml lalu memeriksa setiap package.json dan source directory. **Done when:** script melaporkan package valid, manifest hilang, package tidak terdaftar, dan dependency workspace yang tidak ditemukan.
- [ ] **DX-022 — Tetapkan daftar package aktif.** Tandai package production, internal, experimental, archived, atau scaffold. **Done when:** setiap folder packages/* memiliki status dan owner domain di dokumentasi package map.
- [ ] **DX-023 — Masukkan packages/ws-server ke workspace.** Verifikasi nama package, dependencies, scripts, dan build output terlebih dahulu. **Done when:** pnpm --filter @neuralforge/ws-server build dapat dijalankan dari root.
- [ ] **DX-024 — Masukkan packages/local ke workspace.** Pastikan test dan dependency lokal tidak memerlukan credential. **Done when:** package terdeteksi oleh pnpm dan build/test-nya dapat dipilih dengan filter.
- [ ] **DX-025 — Buat package manifest untuk OpenAPI bila package ini tetap menjadi modul reusable.** Definisikan name, version, exports, files, build, clean, typecheck, test, dan dependency Fastify. **Done when:** package dapat dibangun dan diimpor oleh consumer internal tanpa import path filesystem.
- [ ] **DX-026 — Putuskan status observability package.** Bila dipakai production, buat manifest dan tests; bila belum dipakai, tandai experimental dan jangan masukkan ke claim production readiness. **Done when:** status dan dependency-nya eksplisit.
- [ ] **DX-027 — Tambahkan dependency runtime ws.** Periksa import dan runtime packaging packages/ws-server; daftarkan ws sebagai dependency, bukan hanya @types/ws. **Done when:** package dapat di-load dari clean install production-only tanpa MODULE_NOT_FOUND.
- [ ] **DX-028 — Audit exports setiap package.** Cocokkan exports/main/types/files dengan output build yang benar. **Done when:** setiap export mengarah ke deklarasi dan JavaScript yang dihasilkan.
- [ ] **DX-029 — Audit package dependency graph.** Buat daftar edge package-to-package dari seluruh manifest. **Done when:** tidak ada circular dependency; dependency antar-workspace memakai workspace protocol yang konsisten.
- [ ] **DX-030 — Tambahkan lint untuk dependency cycle.** Pilih alat yang sesuai dengan toolchain yang sudah dipakai atau script sederhana tanpa dependency baru bila cukup. **Done when:** CI gagal saat cycle baru diperkenalkan.
- [ ] **DX-031 — Lengkapi root TypeScript project references.** Periksa packages/job, config-api, plugins, app API, app web, ws-server, local, openapi, observability, dan package aktif lainnya. **Done when:** setiap package yang memiliki tsconfig/build yang wajib masuk graph atau sengaja dikeluarkan dengan alasan tertulis.
- [ ] **DX-032 — Pastikan app API menjadi bagian gate TypeScript.** Tambahkan reference atau command dedicated yang dijalankan pada CI. **Done when:** perubahan tipe API gagal pada gate yang sama dengan workspace.
- [ ] **DX-033 — Pastikan app web menjadi bagian gate typecheck.** Gunakan command kompatibel dengan Next.js/TypeScript yang aktual. **Done when:** tidak ada page/component TSX yang terlewat dari validation.
- [ ] **DX-034 — Definisikan root build semantics.** Putuskan apakah pnpm build berarti semua package library atau seluruh aplikasi termasuk Next. **Done when:** README/scripts/workflow tidak memakai kata “full build” untuk subset build.
- [ ] **DX-035 — Pisahkan build library dan build aplikasi jika dibutuhkan.** Tambahkan script bernama jelas tanpa menyamarkan coverage. **Done when:** library build, API build, web build, dan full validation dapat dipanggil secara deterministik.
- [ ] **DX-036 — Hapus pola test yang menunjuk package tidak ada.** Tinjau packages/diagnostics dalam vitest.config.ts. **Done when:** setiap glob mengarah ke folder yang ada atau dihapus dengan alasan.
- [ ] **DX-037 — Hapus duplikasi test glob.** Tinjau duplicate packages/shared pattern. **Done when:** setiap test file dijalankan satu kali per konfigurasi.
- [ ] **DX-038 — Pastikan seluruh test file masuk tepat satu kategori.** Buat script untuk menemukan test yang tidak terdiscovery atau double discovery. **Done when:** CI mencetak jumlah test file dan script gagal pada file test orphan.
- [ ] **DX-039 — Tambah test script untuk package yang belum memilikinya.** Prioritaskan ws-server, local, config-api, plugins, SDK, openapi, observability. **Done when:** pnpm --filter <package> test tersedia untuk setiap package aktif.
- [ ] **DX-040 — Audit lockfile root.** Tentukan pnpm-lock.yaml sebagai lockfile workspace canonical. **Done when:** kebijakan package manager dan alasan penggunaan lockfile tertulis.
- [ ] **DX-041 — Audit package-lock.json root.** Periksa apakah masih dipakai workflow/tool eksternal. Hapus hanya bila tidak ada consumer sah. **Done when:** hanya lockfile yang memang didukung tersisa dan CI menggunakan frozen install.
- [ ] **DX-042 — Audit apps/api/pnpm-lock.yaml.** Pindahkan dependency yang diperlukan ke root workspace lock bila sesuai, lalu hapus lockfile nested hanya setelah clean install membuktikan aman. **Done when:** API tetap dapat di-install/build dari root.
- [ ] **DX-043 — Audit apps/web/pnpm-workspace.yaml.** Pastikan tidak membuat workspace kedua yang membingungkan. **Done when:** Next app mengikuti root workspace dan build tetap lulus.
- [ ] **DX-044 — Hapus tracked Next build output dengan aman.** Verifikasi apps/web/.next dapat diregenerasi lalu tambahkan ignore rule. **Done when:** clean checkout tidak mengandung output .next yang di-commit.
- [ ] **DX-045 — Periksa generated files lain.** Audit dist, tsbuildinfo, coverage, browser profile, cache, dan temporary artifacts. **Done when:** .gitignore menutup seluruh output yang dapat diregenerasi tanpa mengabaikan source penting.
- [ ] **DX-046 — Audit scratch file root.** Periksa _repro.ts, _test_out.txt, _testrun.txt, show*.mjs, test-gateway*.js, test-http*.js, test-runner.js, dan helper TODO. **Done when:** tiap file dipindah ke fixtures/repro yang relevan, didokumentasikan sebagai alat aktif, atau dihapus setelah terbukti tidak dipakai.
- [ ] **DX-047 — Perbaiki kontradiksi docs ignore rule.** Tentukan apakah dokumentasi canonical berada di docs/ atau spec/blueprint; jangan biarkan path yang dibutuhkan selalu di-ignore. **Done when:** dokumentasi yang dirujuk README benar-benar committed dan tidak diabaikan.
- [ ] **DX-048 — Konsolidasikan versi workspace.** Pertahankan test yang memastikan package yang harus rilis bersama tidak berbeda versi. **Done when:** version consistency test berjalan di CI dan memberi path package yang berbeda saat gagal.
- [ ] **DX-049 — Audit dependency yang tidak terpakai.** Bandingkan manifest imports dan runtime/peer/dev dependencies untuk semua package. **Done when:** dependency yang dihapus tidak dibutuhkan pada clean build/test/pack.
- [ ] **DX-050 — Buat package map yang dapat dihasilkan otomatis.** Sertakan package name, responsibility, public exports, consumers, dan status. **Done when:** output map dapat di-regenerate dan tidak menjadi daftar manual yang cepat usang.

## PHASE 02 — Product truth, narrative, documentation governance (P1)

**Goal:** README, architecture, blueprint, roadmap, dan implementation tidak saling bertentangan.  
**Dependency:** PHASE 01.  
**Exit gate:** narasi platform akurat dan setiap readiness claim memiliki evidence.

- [ ] **DX-051 — Tetapkan brand/product hierarchy.** Jelaskan peran Rocksoul DX, NeuralForge, Omni-Nexus, dan package scope @neuralforge. **Done when:** satu definisi ringkas disepakati di dokumentasi utama dan dipakai konsisten.
- [ ] **DX-052 — Tulis product mission versi implementable.** Masukkan local-first execution, multi-interface platform, provider boundary, tool safety, extensibility, dan operations. **Done when:** mission statement menghindari janji yang tidak didukung source.
- [ ] **DX-053 — Buat capability matrix current vs partial vs planned.** Ambil data dari manifest, source, test, workflow, dan actual route. **Done when:** tidak ada capability diberi label complete hanya karena package directory ada.
- [ ] **DX-054 — Koreksi klaim privacy/local-first di README.** Jelaskan data apa yang tetap di mesin dan data apa yang dapat dikirim ke web provider. **Done when:** README tidak menjanjikan “no cloud/no data leaves machine” untuk alur yang memakai provider web.
- [ ] **DX-055 — Koreksi klaim no API key.** Bedakan browser-session providers, local providers, dan future API-key adapters. **Done when:** pengguna memahami browser login tetap bergantung pada account dan quota layanan provider.
- [ ] **DX-056 — Perbaiki clone URL Quick Start.** Gunakan repository bjo163/dx-platform atau canonical repository yang benar-benar ditetapkan oleh metadata. **Done when:** semua clone/homepage/bugs/repository link mengarah ke repo canonical.
- [ ] **DX-057 — Audit semua link README.** Periksa ARCHITECTURE, branding docs, CLI docs, API docs, release, license, issue tracker. **Done when:** tidak ada link internal yang 404 atau menunjuk repository lama tanpa penjelasan.
- [ ] **DX-058 — Perbarui ARCHITECTURE.md dari source terkini.** Cocokkan package inventory, API route, ports, job lifecycle, PGlite, provider adapters, security. **Done when:** diagram dan teks cocok dengan code yang dapat ditelusuri.
- [ ] **DX-059 — Labeli dokumen blueprint 2024 sebagai archived.** Pertahankan nilai historis dan tambahkan tautan ke current-state/roadmap baru. **Done when:** pembaca tidak mengira tanggal, gap, atau status lama sebagai kondisi November 2026.
- [ ] **DX-060 — Refresh current-state blueprint.** Ubah spec/blueprint/04-current-state.md berdasarkan inventory dan CI terbaru. **Done when:** setiap klaim implementasi memiliki file/test/workflow evidence.
- [ ] **DX-061 — Refresh engineering roadmap.** Sinkronkan spec/blueprint/19-engineering-roadmap.md dengan phase di backlog ini. **Done when:** tidak ada fase lama yang mengklaim job, test, OpenAPI, CI, atau deployment selesai tanpa bukti terkini.
- [ ] **DX-062 — Refresh acceptance/readiness matrix.** Perbarui spec/blueprint/20-acceptance-and-readiness.md. **Done when:** setiap readiness criterion memiliki command, test path, atau operational evidence.
- [ ] **DX-063 — Audit duplicate/conflicting requirement IDs.** Periksa spec/blueprint/03-requirements.md, khususnya numbering FR/NFR. **Done when:** ID unik, traceable, dan test method valid.
- [ ] **DX-064 — Perbarui API catalog dari Fastify routes.** Dokumentasikan method, path, auth requirement, request schema, response schema, status, dan side-effect. **Done when:** route inventory sama dengan app route tree.
- [ ] **DX-065 — Buat environment variable catalog tunggal.** Bandingkan .env.example, source usage, README, ConfigAPI, dan deployment files. **Done when:** setiap variable memiliki nama canonical, default, scope, secret flag, dan consumer.
- [ ] **DX-066 — Dokumentasikan compatibility matrix platform.** Pisahkan Windows native, WSL2+WSLg, Linux, macOS, dan kondisi best-effort. **Done when:** klaim support cocok dengan CI/browser smoke test.
- [ ] **DX-067 — Audit FINAL_SUMMARY.md.** Tambahkan tanggal/evidence atau ubah menjadi historical record. **Done when:** angka 203/203 dan 80% tidak disajikan sebagai status terkini tanpa run yang membuktikan.
- [ ] **DX-068 — Buat documentation ownership map.** Tetapkan README untuk orientasi, ARCHITECTURE untuk current structure, spec untuk contracts, runbooks untuk operasi, TODO untuk execution queue. **Done when:** tidak ada dua dokumen yang mengaku sebagai source of truth untuk hal sama.
- [ ] **DX-069 — Buat glossary istilah platform.** Definisikan task/job/session/turn/agent/provider/adapter/tool/plugin/project/artifact/policy. **Done when:** contoh dan naming konsisten pada docs dan API.
- [ ] **DX-070 — Buat docs validation script.** Validasi relative links, required headings, dan referensi file. **Done when:** script dijalankan di CI dan gagal pada link internal yang rusak.

## PHASE 03 — API contracts, health, project and job operations (P0/P1)

**Goal:** API memiliki schema, behavior, error, dan status yang bisa dipercaya oleh UI/SDK/automation.  
**Dependency:** PHASE 00–02.  
**Exit gate:** seluruh endpoint penting teruji dengan contract/integration tests dan health endpoint mencerminkan readiness sebenarnya.

- [ ] **DX-071 — Inventarisasi seluruh Fastify route.** Ambil route list dari apps/api/src/app.ts dan buat table method/path/schema/auth. **Done when:** route inventory disimpan sebagai fixture/documentation yang dapat diverifikasi.
- [ ] **DX-072 — Pisahkan liveness dan readiness.** Pertahankan /health sebagai compatibility alias bila perlu, tambahkan endpoint liveness/readiness yang jelas. **Done when:** liveness tidak bergantung pada database, readiness memeriksa dependency wajib.
- [ ] **DX-073 — Tambahkan database readiness check.** Periksa PGlite dapat menerima query ringan dan schema siap. **Done when:** readiness mengembalikan non-ready saat database belum terbuka atau gagal.
- [ ] **DX-074 — Tambahkan worker readiness check.** Periksa JobService/runner hidup dan mampu mengambil job. **Done when:** readiness memperlihatkan worker disabled/stopped/error dengan status yang berbeda.
- [ ] **DX-075 — Tambahkan component status response.** Sertakan API, database, job worker, browser integration availability, dan storage status tanpa membocorkan path sensitif. **Done when:** payload health terdokumentasi dan memiliki test schema.
- [ ] **DX-076 — Tambahkan request ID/correlation ID.** Buat ID saat request masuk dan teruskan ke log, response header, serta audit event. **Done when:** satu request dapat ditelusuri tanpa memasukkan secret atau isi prompt ke log default.
- [ ] **DX-077 — Standardisasi error envelope.** Gunakan error code, safe message, requestId, optional field details, dan status HTTP yang konsisten. **Done when:** route error tests memverifikasi struktur yang sama.
- [ ] **DX-078 — Tambahkan Fastify error handler global.** Petakan validation, not found, conflict, unauthorized, rate limit, internal error tanpa stack trace ke client. **Done when:** internal exception menghasilkan 500 safe envelope dan log server memuat trace redacted.
- [ ] **DX-079 — Terapkan body schema untuk project create.** Validasi projectId, name, description, length, format, serta unknown fields. **Done when:** invalid payload ditolak 400 sebelum database write.
- [ ] **DX-080 — Terapkan schema untuk project delete dan project jobs.** Validasi path/query params dan status enum. **Done when:** bad status tidak di-cast secara paksa menjadi JobStatus.
- [ ] **DX-081 — Terapkan schema untuk provider login/verify/disconnect.** Batasi provider ID berdasarkan registry dan body sesuai kontrak. **Done when:** provider yang tidak dikenal ditolak dengan response konsisten.
- [ ] **DX-082 — Terapkan schema untuk plugin registry routes.** Validasi config object, enabled boolean, version format, dan plugin ID. **Done when:** invalid JSON/config tidak dapat ditulis ke database.
- [ ] **DX-083 — Terapkan schema untuk profile update.** Pertahankan batas panjang displayName dan buat type schema eksplisit. **Done when:** whitespace-only, terlalu pendek/panjang, dan unknown field tercakup test.
- [ ] **DX-084 — Terapkan schema untuk backup routes.** Validasi mode, destination policy, serta response status. **Done when:** backup path tidak bisa keluar dari data directory yang diotorisasi.
- [ ] **DX-085 — Terapkan schema untuk artifact preview request.** Validasi artifact ID, path, mime, size, dimension, digest, dan token lifetime. **Done when:** malformed metadata dan path traversal ditolak.
- [ ] **DX-086 — Terapkan schema ketat untuk job create.** Batasi task length, provider, projectId, metadata size, dan field tambahan. **Done when:** unknown fields ditolak atau dibuang sesuai kontrak tertulis; allowedTools tetap dikontrol server.
- [ ] **DX-087 — Tambahkan limit untuk request body dan query.** Tetapkan batas terukur per endpoint, terutama chat completion dan metadata. **Done when:** oversized payload ditolak sebelum pemrosesan berat.
- [ ] **DX-088 — Audit CORS preflight.** Pastikan allowed origins, methods, headers, credentials, dan OPTIONS response konsisten. **Done when:** positive/negative origin test lulus untuk semua route sensitif.
- [ ] **DX-089 — Tambahkan authentication contract test.** Uji loopback default, remote bind, JWT missing, JWT invalid, expired token, dan OPTIONS preflight. **Done when:** remote bind tidak pernah start tanpa secret memadai dan protected request tidak lolos tanpa token.
- [ ] **DX-090 — Batasi optional JWT auth secara eksplisit.** Dokumentasikan apakah JWT berlaku global atau per route, dan hindari endpoint sensitif terbuka tanpa sengaja. **Done when:** route auth matrix dan test cocok dengan konfigurasi deploy.
- [ ] **DX-091 — Implementasikan job pool status dari runtime nyata.** Endpoint /v1/jobs/pool/status saat ini melaporkan active=0 dan membaca beberapa WTAGENT_* env; sambungkan ke worker/queue metrics sesungguhnya. **Done when:** test membuat job aktif dan endpoint menunjukkan angka sesuai state.
- [ ] **DX-092 — Putuskan single-worker vs JobPool.** API saat ini membuat JobService/runner, sementara JobPool mempunyai implementasi terpisah. Pilih integrasi pool yang aman atau tegaskan single-worker sebagai batas MVP. **Done when:** tidak ada endpoint/docs yang mengklaim parallel jobs yang sebenarnya tidak berjalan.
- [ ] **DX-093 — Validasi worker/quota config.** Periksa integer, min/max, nilai tidak masuk akal, dan compatibility dengan profile Chrome. **Done when:** invalid env membuat startup error yang jelas atau fallback aman yang terdokumentasi.
- [ ] **DX-094 — Tambahkan pagination untuk list jobs.** Tetapkan limit, cursor/offset, status filter, project filter, dan stable ordering. **Done when:** integration tests membuktikan pagination tidak menggandakan atau melewatkan record.
- [ ] **DX-095 — Tambahkan pagination untuk activity/log list.** Hindari mengembalikan transcript/log tanpa batas. **Done when:** ukuran response bounded dan client dapat meminta halaman berikutnya.
- [ ] **DX-096 — Tentukan idempotency contract job creation.** Gunakan Idempotency-Key yang sudah diizinkan CORS jika sesuai. **Done when:** replay request dengan key sama tidak menghasilkan job duplikat.
- [ ] **DX-097 — Definisikan lifecycle transition matrix.** Dokumentasikan pending/running/completed/failed/cancelled dan allowed transitions. **Done when:** unit tests menolak transisi ilegal.
- [ ] **DX-098 — Definisikan semantics cancellation.** Bedakan cancel sebelum start, saat tool berjalan, setelah provider send, dan setelah job terminal. **Done when:** cancel response, terminal event, dan persisted state konsisten.
- [ ] **DX-099 — Definisikan semantics retry.** Pastikan retry hanya berlaku untuk status yang sah, memperhitungkan attempt, dan tidak mengulang operasi eksternal yang completion-nya unknown. **Done when:** test mencakup retry safe dan retry yang ditolak.
- [ ] **DX-100 — Buat project-to-workspace mapping yang aman.** Pastikan projectId tidak dapat dipakai untuk memilih arbitrary filesystem root. **Done when:** setiap project root berasal dari registry/trust policy yang tervalidasi.
- [ ] **DX-101 — Perbaiki workspace realpath edge cases.** Uji symlink, junction Windows, case sensitivity, missing path, file vs directory, dan race condition. **Done when:** semua test mencegah escape dari selected workspace.
- [ ] **DX-102 — Tambahkan API contract tests untuk semua route.** Gunakan Fastify inject dan test database terisolasi. **Done when:** setiap route utama memiliki success, validation failure, unauthorized/forbidden bila berlaku, dan not-found case.
- [ ] **DX-103 — Sediakan API smoke test script.** Jalankan start API, health/readiness, create/list/status/cancel job via mock provider. **Done when:** satu command membuktikan lifecycle API tanpa login provider sungguhan.

## PHASE 04 — Security, trust boundaries, and safe defaults (P0)

**Goal:** semua entry point tool/provider/plugin/network tetap berada di trust boundary yang terdokumentasi.  
**Dependency:** PHASE 01 dan PHASE 03.  
**Exit gate:** critical path punya negative tests; secret dan local filesystem tidak bocor ke pihak yang tidak diotorisasi.

- [ ] **DX-104 — Ganti shell interpolation local model.** Hapus node:child_process.exec yang menyusun perintah curl dari host/model/prompt. Gunakan native fetch dengan URL dan JSON body. **Done when:** input prompt berisi quote, newline, shell metacharacter, dan Unicode tetap diperlakukan sebagai data; tidak ada shell command yang dijalankan.
- [ ] **DX-105 — Validasi endpoint Ollama.** Parse host/port menjadi URL, batasi scheme ke HTTP/HTTPS sesuai konfigurasi, dan cegah URL malformed. **Done when:** invalid host/port/scheme ditolak sebelum request.
- [ ] **DX-106 — Validasi endpoint LM Studio.** Terapkan aturan URL dan port yang sama dengan Ollama. **Done when:** endpoint yang tidak valid tidak dikirim ke fetch.
- [ ] **DX-107 — Batasi outbound local provider secara eksplisit.** Default hanya localhost/loopback untuk provider lokal; dukungan remote endpoint memerlukan opt-in dan dokumentasi. **Done when:** alamat eksternal tidak diterima oleh default config.
- [ ] **DX-108 — Tambahkan timeout dan AbortSignal pada local provider request.** Buat timeout configurable dengan batas minimum/maksimum. **Done when:** server yang tidak merespons menghasilkan timeout error typed dan tidak menggantung proses.
- [ ] **DX-109 — Perbaiki status/error Ollama.** Periksa HTTP status, parse JSON dengan error terkontrol, dan bedakan unavailable, timeout, malformed payload, model missing. **Done when:** tiap failure memiliki error code yang dapat diuji.
- [ ] **DX-110 — Perbaiki status/error LM Studio.** Terapkan handling yang sama pada list models dan completion. **Done when:** tidak ada catch yang mengembalikan string kosong untuk semua jenis kegagalan.
- [ ] **DX-111 — Ganti logging credential/prompt local provider.** Error log tidak boleh memasukkan API key, prompt penuh, cookie, atau payload rahasia. **Done when:** test memastikan redaction untuk semua field sensitif.
- [ ] **DX-112 — Audit ConfigAPI secret persistence.** Saat ini apiKey dapat masuk RuntimeConfig dan config file. Ubah desain agar secret tidak disimpan/dikembalikan plaintext secara default. **Done when:** GET config dan update response selalu redacted; secret reference hanya dibaca dari secret source yang ditentukan.
- [ ] **DX-113 — Validasi ConfigAPI input secara ketat.** Terapkan schema provider/model/temperature/maxTokens/browser dan reject unknown sensitive key. **Done when:** NaN, Infinity, negative limits, out-of-range values, dan prototype-like keys ditolak.
- [ ] **DX-114 — Buat config precedence contract.** Bedakan defaults, config file, environment, runtime override, dan reset. **Done when:** unit tests menegaskan precedence dan reset behavior.
- [ ] **DX-115 — Gunakan atomic write untuk config.** Hindari file parsial saat proses mati ketika config disimpan. **Done when:** write menggunakan atomic rename/permission policy dan memiliki failure test.
- [ ] **DX-116 — Audit sisa WTAGENT_* environment variables.** Cari seluruh source, scripts, tests, README, dan config. **Done when:** penggunaan aktif setiap WTAGENT_* dicatat sebagai compatibility alias atau diganti dengan NEURALFORGE_*.
- [ ] **DX-117 — Tambahkan migrasi alias environment.** Bila WTAGENT_* masih harus didukung, implementasikan precedence dan deprecation warning yang tidak mengekspos value. **Done when:** conflict kedua prefix menghasilkan behavior deterministic dan test.
- [ ] **DX-118 — Jangan membaca secret ke client config.** Pastikan web app, API profile, provider status, dan diagnostics tidak mengembalikan secret. **Done when:** integration test melakukan redaction assertion.
- [ ] **DX-119 — Validasi WebSocket upgrade path.** Tolak path yang tidak didukung dan query parameter yang tidak dikenali. **Done when:** hanya endpoint WS yang didefinisikan dapat di-upgrade.
- [ ] **DX-120 — Validasi WebSocket Origin.** Terapkan origin allowlist yang sesuai dengan deployment. **Done when:** cross-origin unauthorized handshake ditolak dan local dev tetap dapat berjalan dengan konfigurasi eksplisit.
- [ ] **DX-121 — Tambahkan authentication WebSocket.** Gunakan mekanisme token yang sama atau scoped token yang aman; jangan mengirim credential pada URL query jika dapat dihindari. **Done when:** unauthenticated client tidak dapat subscribe/mutate job pada remote mode.
- [ ] **DX-122 — Validasi schema setiap WebSocket message.** Buat discriminated union untuk subscribe, unsubscribe, create, cancel, dan client-supported commands. **Done when:** unknown type, missing fields, wrong data types, dan malformed JSON ditolak dengan error protocol.
- [ ] **DX-123 — Batasi ukuran pesan WebSocket.** Terapkan maxPayload dan batas message rate. **Done when:** oversized/flood payload diputus tanpa membuat proses memory exhaustion.
- [ ] **DX-124 — Implementasikan heartbeat WebSocket.** Ping/pong, stale connection detection, cleanup, dan graceful close. **Done when:** dead client dikeluarkan dan tidak tersisa di connection registry.
- [ ] **DX-125 — Implementasikan backpressure pada WS broadcast.** Jangan mengirim event tanpa batas ke client lambat. **Done when:** bufferedAmount policy, drop/close behavior, dan tests terdokumentasi.
- [ ] **DX-126 — Audit WebSocket message side effects.** Pastikan client tidak bisa mengirim event progress palsu untuk mengubah persisted job state kecuali command itu bagian dari kontrak yang diotorisasi. **Done when:** hanya server runtime yang dapat menulis progress event authoritative.
- [ ] **DX-127 — Validasi plugin manifest dengan schema runtime.** Cek manifestVersion, name, version, author, tools, permission names, dan ukuran. **Done when:** manifest invalid ditolak dengan diagnostics tanpa crash.
- [ ] **DX-128 — Amankan plugin ID dan path.** Validasi nama plugin sebagai slug; jangan gunakan manifest.name tanpa canonicalization untuk membangun filesystem path. **Done when:** traversal, separator, dot segments, dan collision ditolak.
- [ ] **DX-129 — Enforce plugin permissions.** Map setiap declared permission ke tool capability yang dikenal dan policy decision. **Done when:** manifest permission tidak dapat memberikan privilege yang tidak tersedia pada server.
- [ ] **DX-130 — Tegaskan sandbox status plugin.** Jika plugin belum berjalan di sandbox terisolasi, jangan menyebutnya sandboxed. **Done when:** docs dan UI secara eksplisit membedakan manifest registry dari executable isolation.
- [ ] **DX-131 — Cegah plugin code auto-execution saat scan.** Discovery hanya memuat metadata; eksekusi harus melalui explicit registry/permission gate. **Done when:** plugin folder baru tidak dapat menjalankan kode saat initialize.
- [ ] **DX-132 — Tambahkan plugin lifecycle tests.** Test discover, invalid manifest, register, update config, disable, re-enable, path traversal, duplicate ID. **Done when:** test tidak memerlukan GitHub/Jira account.
- [ ] **DX-133 — Perkuat PathGuard terhadap symlink/TOCTOU.** Audit semua filesystem tools dan operasi write/edit. **Done when:** tests Windows/Linux membuktikan path tidak bisa keluar dari workspace melalui symlink/junction.
- [ ] **DX-134 — Audit terminal command launch policy.** Pastikan spawn argument array, command allow/block rules, cwd, environment, timeout, kill process tree. **Done when:** malicious shell metacharacter dan cwd override tidak melewati policy.
- [ ] **DX-135 — Redact audit event.** Jangan simpan token, cookie, environment secret, isi file, atau prompt penuh kecuali user explicitly menyimpan transcript sebagai data produk. **Done when:** audit event schema dan redaction tests terpasang.
- [ ] **DX-136 — Tambahkan security headers.** Terapkan nosniff, frame policy, referrer policy, cache policy yang sesuai, dan CSP untuk web. **Done when:** header tests memeriksa API dan web response.
- [ ] **DX-137 — Uji rate limiter behavior.** Test per IP/route, reset window, concurrent access, auth endpoint, dan memory cleanup. **Done when:** request over limit konsisten 429 dan headers akurat.
- [ ] **DX-138 — Evaluasi rate limiter untuk remote multi-instance.** Bila API tetap single-process/local, dokumentasikan; bila distributed, pilih shared limiter store. **Done when:** limitation dan target deployment jelas.
- [ ] **DX-139 — Batasi secret length/rotation rules untuk JWT.** Terapkan random secret requirement, startup validation, dan redaction. **Done when:** invalid config gagal startup tanpa menampilkan secret.
- [ ] **DX-140 — Buat security regression suite.** Satukan path traversal, command injection, SSRF/local endpoint, auth bypass, plugin traversal, WS abuse, secret leakage. **Done when:** suite wajib berjalan pada CI Linux dan Windows untuk test platform-appropriate.

## PHASE 05 — Agent runtime, job reliability, session and recovery (P1)

**Goal:** job dapat berjalan, dihentikan, di-retry, di-resume, dan diaudit secara konsisten.  
**Dependency:** PHASE 03–04.  
**Exit gate:** failure/restart/cancel/recovery scenarios terbukti dengan test deterministik.

- [ ] **DX-141 — Dokumentasikan runtime lifecycle.** Trace task submit -> job claim -> session load/create -> provider send -> tool calls -> final result. **Done when:** sequence diagram sesuai dengan code path nyata.
- [ ] **DX-142 — Tambahkan state transition unit tests.** Uji setiap state job dan semua transition yang dilarang. **Done when:** invalid transition ditolak tanpa corrupt stored record.
- [ ] **DX-143 — Tambahkan lease ownership tests.** Uji claimNext, owner mismatch, stale lease, lease renewal, dan finalize. **Done when:** hanya pemilik lease yang sah dapat finalize job.
- [ ] **DX-144 — Tambahkan heartbeat failure tests.** Simulasikan runner mati dan heartbeat berhenti. **Done when:** stale lease dapat direclaim tanpa dua runner mengeksekusi job sama bersamaan.
- [ ] **DX-145 — Uji crash recovery job.** Matikan/recreate runner di tiap tahap lifecycle dengan fake runtime. **Done when:** state yang dapat dipulihkan dilanjutkan; state ambiguous diberi status recovery-needed.
- [ ] **DX-146 — Audit timeout enforcement.** Validasi execution timeout, provider wait timeout, tool timeout, dan process timeout tidak saling menimpa. **Done when:** timeout selalu menghasilkan terminal state dan cleanup.
- [ ] **DX-147 — Uji stop API saat job aktif.** Pastikan shutdown tidak menandai job completed jika masih berjalan. **Done when:** job berhenti atau dilepas dengan lease/state yang dapat dipulihkan.
- [ ] **DX-148 — Tambahkan SIGINT/SIGTERM handling.** Hubungkan signal ke stopApi, close browser, stop runner, flush database, dan close server. **Done when:** integration test shutdown tidak meninggalkan listener, timer, atau child process.
- [ ] **DX-149 — Audit process manager cleanup.** Uji terminal child tree di Windows, Linux, dan macOS. **Done when:** timeout/cancel mematikan child process dan descendant yang dimiliki task.
- [ ] **DX-150 — Verifikasi safe cancellation untuk browser send.** Jika send status committing/unknown, jangan otomatis mengulangi request. **Done when:** runtime mempertahankan pending outbound anchor dan meminta recovery operation yang aman.
- [ ] **DX-151 — Uji operation idempotency untuk tool call.** Pastikan operation key stabil untuk replay dan fingerprint berubah saat args berubah. **Done when:** duplicate tool call tidak mengeksekusi side effect dua kali.
- [ ] **DX-152 — Audit ambiguous tool completion.** Pastikan runtime melaporkan completionUnknown dan tidak replay otomatis. **Done when:** test membuktikan filesystem/terminal side effect tidak diduplikasi.
- [ ] **DX-153 — Batasi ukuran transcript/event.** Terapkan per-message/per-turn/session budget dan retention. **Done when:** payload besar tidak menyebabkan memory blow-up atau database write tanpa batas.
- [ ] **DX-154 — Tambahkan session corruption tests.** Uji JSONL trailing partial line, malformed interior line, missing file, dan interrupted atomic write. **Done when:** recovery behavior deterministic dan tidak diam-diam membuang valid history.
- [ ] **DX-155 — Uji canonical transcript.** Pastikan tool call, tool result, assistant/user turn, media artifact, dan continuation dapat round-trip. **Done when:** serialize/deserialize mempertahankan order dan identity.
- [ ] **DX-156 — Verifikasi resume prompt tidak menggandakan instruksi.** Uji context, latest instruction, files, pending tool acknowledgement, dan completed tool outputs. **Done when:** resume melanjutkan sesi yang sama tanpa mengulang operasi sukses.
- [ ] **DX-157 — Audit legacy job import.** Uji import idempotency dari file JobStore ke PGliteJobStore. **Done when:** restart import tidak menggandakan record/activity.
- [ ] **DX-158 — Tambahkan dead-letter behavior.** Tentukan batas retry, terminal error category, dan cara inspect. **Done when:** job tidak retry selamanya dan dapat ditemukan melalui API/UI.
- [ ] **DX-159 — Implementasikan retry policy yang bounded.** Bedakan transient provider failure, policy denial, invalid request, timeout, dan unknown completion. **Done when:** hanya kategori yang safe untuk retry masuk retry loop otomatis.
- [ ] **DX-160 — Integrasikan quota pada JobPool jika concurrency diaktifkan.** Hubungkan worker count, per-project/provider quota, dan resource caps ke scheduler. **Done when:** concurrent job test membuktikan quota respected.
- [ ] **DX-161 — Pertahankan single Chrome profile lock.** Jangan parallelize job yang memakai profile/provider sama sebelum BrowserPool lock semantics aman. **Done when:** concurrent test tidak menghasilkan dua writer pada profile yang sama.
- [ ] **DX-162 — Tambahkan job fairness.** Jika banyak project/provider, definisikan starvation/fair scheduling. **Done when:** integration test memverifikasi satu project tidak memblokir seluruh queue.
- [ ] **DX-163 — Tambahkan backpressure untuk queue.** Batasi jumlah pending job dan response saat queue penuh. **Done when:** API mengembalikan overload error yang jelas dan tidak menumpuk job tak terbatas.
- [ ] **DX-164 — Buat job lifecycle replay fixture.** Simpan event sequence non-sensitive yang merepresentasikan complete, fail, cancel, retry, recovery. **Done when:** regression tests dapat memutar ulang fixture tanpa provider network.
- [ ] **DX-165 — Tambahkan runner diagnostics.** Paparkan worker ID, active job count, last heartbeat, last error, dan queue depth. **Done when:** diagnostics tidak mengekspos task content atau credential.

## PHASE 06 — Provider mesh, browser resilience, local inference (P1/P2)

**Goal:** provider dapat ditemukan, diverifikasi, dipakai, dan gagal dengan behavior yang bisa dipahami.  
**Dependency:** PHASE 04–05.  
**Exit gate:** provider contract dan browser lifecycle teruji dengan fixture offline; local provider tidak menjalankan shell.

- [ ] **DX-166 — Definisikan ProviderDescriptor contract.** Satukan ID, display name, transport type, capabilities, auth state, model discovery, limits, dan health. **Done when:** registry, API, CLI, dan UI membaca tipe yang sama.
- [ ] **DX-167 — Pisahkan provider web dan provider local dalam registry.** Jangan menyamakan browser session adapter dengan HTTP local adapter. **Done when:** transport type terlihat dalam API response.
- [ ] **DX-168 — Buat provider capability matrix.** Dokumentasikan text, image, audio, streaming, attachment, resume, dan browser login capability per provider. **Done when:** matrix dibentuk dari descriptor atau test fixture, bukan asumsi manual.
- [ ] **DX-169 — Tambahkan unit test untuk provider registry.** Uji default, alias normalization, unknown provider, active/planned status, profile path, dan adapter construction. **Done when:** registry test berjalan tanpa Chrome.
- [ ] **DX-170 — Tambahkan fake provider adapter reusable.** Buat test adapter yang bisa menyimulasikan auth, send, response, timeout, DOM drift, dan ambiguous send. **Done when:** runtime/API tests tidak membutuhkan real web accounts.
- [ ] **DX-171 — Buat fixture DOM untuk setiap adapter aktif.** Simpan HTML minimal yang menggambarkan composer, send button, message identity, and response. **Done when:** adapter selectors memiliki regression test per provider.
- [ ] **DX-172 — Tambahkan provider auth lifecycle tests.** Uji unauthenticated, login pending, authenticated, expired, disconnected, browser closed. **Done when:** API status sesuai hasil adapter dan profile state.
- [ ] **DX-173 — Perbaiki status provider yang stale.** Verifikasi auth melalui DOM probe/connection state; jangan menganggap stored boolean selalu valid. **Done when:** stale status berubah menjadi needs-login dengan event/diagnostic.
- [ ] **DX-174 — Integrasikan DOM drift evidence.** Tentukan baseline, capture trigger, severity, dan response bila struktur provider berubah. **Done when:** drift report dapat menyebut provider, timestamp, diff evidence, dan recovery guidance.
- [ ] **DX-175 — Tambahkan DOM drift fixture regression.** Simulasikan data-testid, role, tag structure berubah dan selector hilang. **Done when:** tests membuktikan drift terdeteksi tanpa membuka situs publik.
- [ ] **DX-176 — Terapkan safe fallback selector policy.** Selector fallback harus memeriksa identity dan composer semantics, bukan mengirim ke tombol yang salah. **Done when:** ambiguous selector menghentikan send alih-alih menebak.
- [ ] **DX-177 — Uji send state transitions per provider.** Test not-submitted, committing, committed, failed, unknown. **Done when:** resume/cancel decisions mengikuti send state yang tersimpan.
- [ ] **DX-178 — Perkuat session profile isolation.** Pastikan tiap provider memiliki profil terpisah dan permission directory aman. **Done when:** test profile path collision dan permissions lulus.
- [ ] **DX-179 — Audit Chrome discovery di Windows/WSL2.** Pastikan path discovery, process startup, CDP readiness, GUI availability, dan error diagnosis terpisah. **Done when:** platform tests mencakup path not found dan launch failure.
- [ ] **DX-180 — Tambahkan provider connection doctor.** Diagnostik harus menjelaskan browser path, profile path (redacted bila perlu), auth state, CDP state, dan last failure. **Done when:** command doctor tidak memerlukan membaca cookie atau content conversation.
- [ ] **DX-181 — Implementasikan local model endpoint dengan fetch.** Gunakan implementasi DX-104 sebagai fondasi Ollama/LM Studio. **Done when:** test local HTTP server membuktikan availability, models list, completion, timeout, dan bad payload.
- [ ] **DX-182 — Perbaiki endpoint Ollama generate/chat.** Pilih endpoint sesuai contract yang didukung dan parser response yang benar. **Done when:** streaming/non-streaming semantics ditulis eksplisit dan teruji.
- [ ] **DX-183 — Perbaiki endpoint LM Studio.** Gunakan OpenAI-compatible chat completions bila didukung, bukan mengasumsikan legacy completions. **Done when:** request dan response schema sesuai fake server contract.
- [ ] **DX-184 — Tambahkan model discovery normalization.** Normalisasi model ID, display name, context length/capabilities bila metadata tersedia. **Done when:** missing optional metadata tidak mematikan provider.
- [ ] **DX-185 — Tambahkan local inference settings.** Konfigurasi base URL, timeout, model, context limits, dan request options. **Done when:** config tervalidasi dan secret-free.
- [ ] **DX-186 — Hubungkan local provider ke job/runtime flow.** Jangan berhenti pada helper class yang bisa dipanggil manual. **Done when:** satu job fake/local model dapat dieksekusi melalui API/CLI menggunakan provider registry yang sama.
- [ ] **DX-187 — Implementasikan explicit offline mode.** Saat offline mode aktif, hanya provider lokal yang boleh dipakai. **Done when:** tidak ada outbound provider web fallback; test memonitor request mock.
- [ ] **DX-188 — Tambahkan provider routing policy.** Pilih berdasarkan capability, health, user choice, limits, dan preference; bukan random fallback. **Done when:** route decision deterministic dan dijelaskan melalui diagnostics.
- [ ] **DX-189 — Tambahkan circuit breaker per provider.** Hentikan request berulang ke provider yang gagal; gunakan cooldown dan half-open probe. **Done when:** failure storm test membuktikan circuit open/close transitions.
- [ ] **DX-190 — Tambahkan quota/usage awareness tanpa scraping yang melanggar kontrak.** Gunakan data yang tersedia secara sah dari UI/API provider; jika tidak tersedia, tandai unknown. **Done when:** unknown tidak diinterpretasikan sebagai unlimited.
- [ ] **DX-191 — Buat adapter health test yang bisa dijalankan terjadwal.** Gunakan fixture dan optional manual smoke. **Done when:** test tidak mengirim task real ke akun user.
- [ ] **DX-192 — Dokumentasikan batasan provider web.** Catat selector drift, quota, account policy, model selection user-side, file upload constraints, dan data egress. **Done when:** user-facing docs tidak menjanjikan reliabilitas/provider capability yang belum terbukti.

## PHASE 07 — SDK, WebSocket, Config API, OpenAPI, MCP, IDE integration (P1/P2)

**Goal:** semua consumer surface memakai API platform yang typed, stabil, versioned, dan nyata.  
**Dependency:** PHASE 01, 03, 04, 05.  
**Exit gate:** package consumer dapat mengintegrasikan job create/monitor/cancel tanpa mengimpor internals.

- [ ] **DX-193 — Audit SDK public surface.** Periksa packages/sdk exports, runtime.ts, browser-adapter.ts, job-request.ts dan dependency. **Done when:** setiap exported symbol diberi status stable/experimental/internal.
- [ ] **DX-194 — Ganti SDK runtime stub dengan factory nyata.** createRuntime saat ini mengembalikan object stub dan sendMessage melakukan echo. **Done when:** factory menghasilkan runtime yang benar-benar mendelegasikan ke engine terintegrasi dan tidak memberikan fake success.
- [ ] **DX-195 — Definisikan SDK createClient/createRuntime boundary.** Bedakan client API remote, embedded runtime, dan browser adapter. **Done when:** tidak ada satu factory yang mencampur koneksi HTTP dengan runtime in-process tanpa tipe jelas.
- [ ] **DX-196 — Ganti any di SDK public contract.** Beri type untuk runtime, adapter, event, transcript, result, dan error. **Done when:** public declaration files tidak mengekspos any pada operasi utama.
- [ ] **DX-197 — Definisikan JobRequest schema.** Tambahkan task, provider selection, project, policy profile, attachments, metadata, dan idempotency behavior sesuai supported scope. **Done when:** SDK validation dan API validation menggunakan satu kontrak yang kompatibel.
- [ ] **DX-198 — Definisikan typed job response.** Sertakan jobId/status/timestamps/progress/result/error. **Done when:** SDK tidak memaksa consumer menebak response field.
- [ ] **DX-199 — Definisikan typed event stream.** Buat event union versioned untuk queued, started, progress, tool, approval, completed, failed, cancelled, recovery-required. **Done when:** server, web, SDK, dan WS menggunakan event name/payload yang sama.
- [ ] **DX-200 — Tambahkan SDK tests.** Test factory, invalid options, mock transport, timeout, cancellation, event unsubscribe, and typed errors. **Done when:** unit tests dapat berjalan offline.
- [ ] **DX-201 — Buat SDK consumer example.** Contoh Node ESM dan TypeScript yang menjalankan mocked task serta menerima event. **Done when:** contoh dapat di-build dari clean checkout.
- [ ] **DX-202 — Uji packing dan import SDK.** Pack package local dan import dari temp project. **Done when:** import root export dan types berfungsi tanpa monorepo aliases.
- [ ] **DX-203 — Audit WebSocket package contract.** Tentukan apakah WS server merupakan transport untuk API yang sama atau service terpisah. **Done when:** lifecycle, ownership store, port, auth, dan event source terdokumentasi.
- [ ] **DX-204 — Implementasikan subscribe/unsubscribe real.** Pastikan subscribe mengirim initial snapshot lalu menerima live event dari JobService. **Done when:** test mendapat progress dan terminal update tanpa client mengirim event server palsu.
- [ ] **DX-205 — Hubungkan WSServer ke shared JobService/store.** Hindari setiap transport membuat instance queue/database berbeda tanpa sengaja. **Done when:** REST create job dan WS subscribe melihat job ID/state yang sama.
- [ ] **DX-206 — Tambahkan WS protocol version field.** Negosiasikan version saat connect dan tangani unsupported version. **Done when:** client/server mismatch menghasilkan error yang actionable.
- [ ] **DX-207 — Tambahkan WebSocket integration test.** Uji connect, auth, subscribe, progress, cancel, disconnect, reconnect, malformed event. **Done when:** test berjalan di CI tanpa provider web sungguhan.
- [ ] **DX-208 — Putuskan apakah gRPC benar-benar diperlukan.** Jangan menambah gRPC hanya karena dokumen rencana lama menyebutnya; gunakan WS jika memenuhi kontrak consumer. **Done when:** keputusan berdasarkan kebutuhan IDE/CI dan dependency/ops cost ditulis.
- [ ] **DX-209 — Validasi ConfigAPI lifecycle.** Uji initialize, environment precedence, file config, runtime update, reset, corrupt file. **Done when:** tidak ada state memory/file yang berbeda setelah restart.
- [ ] **DX-210 — Mount ConfigAPI pada Fastify bila menjadi public capability.** Implementasikan GET/PUT/PATCH routes atau tetapkan package internal-only. **Done when:** dokumentasi dan package availability sesuai route yang benar-benar mounted.
- [ ] **DX-211 — Tambahkan ConfigAPI optimistic concurrency.** Cegah dua update bersamaan saling menimpa tanpa deteksi. **Done when:** version/ETag conflict test menghasilkan 409 yang terdefinisi.
- [ ] **DX-212 — Buat OpenAPI generator yang benar-benar membaca route.** Jangan menggunakan placeholder app._router loop kosong. **Done when:** spec memuat seluruh route, parameter, request/response schema, tags, dan security.
- [ ] **DX-213 — Gunakan Fastify route schemas sebagai contract source bila memungkinkan.** Hindari schema ganda yang mudah drift. **Done when:** generator test membuktikan perubahan route schema tercermin di OpenAPI.
- [ ] **DX-214 — Tambahkan OpenAPI snapshot/structural tests.** Pastikan method/path unik dan response sukses/error valid. **Done when:** route yang hilang/berubah breaking menghasilkan review/test signal.
- [ ] **DX-215 — Serve /openapi.json.** Pastikan runtime API menampilkan spec versi aktual. **Done when:** endpoint dapat di-fetch dan valid terhadap OpenAPI validator.
- [ ] **DX-216 — Sediakan API docs UI yang ringan dan aman.** Dokumentasikan auth dan local-only access; jangan expose internal docs tanpa sengaja pada remote deployments. **Done when:** docs UI mengkonsumsi spec yang sama dengan endpoint.
- [ ] **DX-217 — Audit MCP server/tool definitions.** Pastikan tool definitions sesuai capability yang benar-benar tersedia dan policy gate berlaku. **Done when:** setiap tool MCP punya schema, description, permission, error mapping, dan test.
- [ ] **DX-218 — Tambahkan MCP protocol compatibility tests.** Uji initialize, tool listing, tool call, invalid args, shutdown. **Done when:** tests tidak membutuhkan IDE atau MCP host eksternal.
- [ ] **DX-219 — Rancang IDE adapter sebagai consumer SDK.** Mulai dari VS Code/Cursor-compatible protocol yang sederhana; jangan membuat extension sebelum SDK contract stabil. **Done when:** extension integration spec menyebut use case, commands, permissions, dan test harness.
- [ ] **DX-220 — Tambahkan CI/headless SDK example.** Gunakan fake provider dan project fixture. **Done when:** CI dapat submit, monitor, cancel, dan inspect artifact tanpa UI/browser login.

## PHASE 08 — Plugin/tool ecosystem and project workflows (P2)

**Goal:** extension dapat ditemukan, dikonfigurasi, dan dijalankan dengan permission terkontrol.  
**Dependency:** PHASE 04 dan PHASE 07.  
**Exit gate:** manifest registry, tool registry, plugin lifecycle, dan permissions konsisten.

- [ ] **DX-221 — Satukan plugin registry sebagai source of truth.** Rekonsiliasi PluginSystem filesystem manifest dan database registry API. **Done when:** list/install/enable/disable/update menghasilkan satu state yang konsisten setelah restart.
- [ ] **DX-222 — Definisikan plugin manifest v1 schema.** Tentukan name, version, manifestVersion, description, author, tools, permissions, entrypoint, compatibility. **Done when:** schema tervalidasi dengan test fixture valid/invalid.
- [ ] **DX-223 — Definisikan plugin semver compatibility.** Tentukan host API compatibility range dan upgrade behavior. **Done when:** plugin yang tidak kompatibel tidak dapat di-enable.
- [ ] **DX-224 — Implementasikan plugin discovery diagnostics.** Catat manifest invalid, duplicate, unsupported version, dependency missing, dan disabled state. **Done when:** plugin tidak silently disappear tanpa alasan.
- [ ] **DX-225 — Implementasikan plugin install lifecycle.** Pastikan install tidak mengeksekusi plugin code secara otomatis dan tidak overwrite ID lain. **Done when:** install test menggunakan temp directory dan atomic persistence.
- [ ] **DX-226 — Implementasikan plugin enable/disable lifecycle.** Nonaktifkan tool binding dan cache saat disabled. **Done when:** disabled plugin tidak dapat dipanggil dari tool registry.
- [ ] **DX-227 — Implementasikan plugin update lifecycle.** Validasi versi, backup manifest/config, dan rollback jika update gagal. **Done when:** test failure restore versi lama secara konsisten.
- [ ] **DX-228 — Implementasikan uninstall yang aman.** Hapus hanya directory/config milik plugin setelah memastikan path canonical dan no running operation. **Done when:** symlink/traversal test mencegah penghapusan di luar plugin root.
- [ ] **DX-229 — Hubungkan plugin tools ke ToolRegistry.** Registrasi tool berdasarkan manifest dan schema tervalidasi. **Done when:** tool yang tidak terdaftar tidak bisa dipanggil.
- [ ] **DX-230 — Tambahkan capability permission mapping.** Definisikan permission minimum untuk repository.read/write, issue.read/write, filesystem, process, network. **Done when:** tool call ditolak bila capability tidak diberikan.
- [ ] **DX-231 — Jadikan GitHub plugin read-only sebagai default.** Operasi write harus menggunakan permission scope yang jelas. **Done when:** read tool dapat dites offline dan write tool default disabled.
- [ ] **DX-232 — Jadikan Jira plugin read-only sebagai default.** Sama seperti GitHub; external account tidak dibutuhkan untuk unit tests. **Done when:** permission enforcement dibuktikan mock.
- [ ] **DX-233 — Buat plugin SDK sample.** Sertakan manifest dan handler contoh non-destructive. **Done when:** sample dapat divalidasi/di-load di local fixture environment.
- [ ] **DX-234 — Tambahkan trusted plugin signature design.** Tentukan format signature/checksum dan trust source sebelum marketplace distribution. **Done when:** design dan verification test vectors tersedia; tidak ada signature palsu.
- [ ] **DX-235 — Buat tool catalog.** Dokumentasikan tool name, schema, output, sandbox profile, approval mode, side effect, supported platform. **Done when:** catalog digenerate dari registry atau test.
- [ ] **DX-236 — Tambahkan project bootstrap profiles.** Sediakan preset read-only audit, code fix, test/build, documentation, dan release-prep dengan permission berbeda. **Done when:** preset tidak memperluas privilege tanpa eksplisit.
- [ ] **DX-237 — Buat reusable task recipes.** Bentuk recipe menjadi typed, versioned, testable instruction templates, bukan prompt string yang tak terlacak. **Done when:** recipe fixture menghasilkan request valid dan dapat diulang.
- [ ] **DX-238 — Tambahkan approval policy profiles.** Profile default read-only, workspace-write, dan trusted-local. **Done when:** setiap profile memiliki allowlist, denylist, approval rule, dan regression tests.

## PHASE 09 — Web War Room UX, API client, and accessibility (P1/P2)

**Goal:** Web War Room menjadi client platform yang modular, realtime, resilient, dan mudah dipakai.  
**Dependency:** PHASE 03 dan PHASE 07.  
**Exit gate:** tidak ada duplicated API contract atau stale realtime state; critical journeys teruji.

- [ ] **DX-239 — Perbaiki API URL mismatch pada job events.** apps/web/src/app/job-events.ts memakai NEXT_PUBLIC_WTAGENT_API_URL sedangkan page utama memakai NEXT_PUBLIC_NEURALFORGE_API_URL. **Done when:** satu env variable canonical digunakan di seluruh web app dan test membuktikan fallback.
- [ ] **DX-240 — Buat typed API client module.** Centralize base URL, headers, auth, error parsing, timeout, and request cancellation. **Done when:** halaman tidak membangun URL/fetch boilerplate sendiri.
- [ ] **DX-241 — Buat typed DTO untuk API response.** Ambil dari shared contract/SDK atau codegen yang terukur. **Done when:** job/provider/project/profile/workspace UI tidak menggunakan unchecked casts pada response inti.
- [ ] **DX-242 — Tambahkan UI auth token handling untuk remote mode.** Token tidak disimpan pada location/query atau log. **Done when:** protected API deployment dapat digunakan web app dengan credential handling aman.
- [ ] **DX-243 — Perbaiki SSE reconnect handling.** Bedakan reconnect, polling fallback, permanent error, dan terminal state. **Done when:** reconnect tidak memulai polling dan SSE bersamaan.
- [ ] **DX-244 — Tambahkan deduplication untuk SSE/polling events.** Gunakan event ID/sequence/timestamp contract. **Done when:** terminal result tidak ditambahkan dua kali saat fallback transition.
- [ ] **DX-245 — Tambahkan SSE keepalive dan disconnect tests.** Pastikan client/browser proxy tidak menutup koneksi idle tanpa recovery. **Done when:** integration tests mencakup idle, disconnect, reconnect, terminal.
- [ ] **DX-246 — Pastikan subscription cleanup.** Saat job list berubah, page unmount, atau job terminal, seluruh EventSource/timer dihentikan. **Done when:** test tidak menemukan timer/subscriber leak.
- [ ] **DX-247 — Pisahkan polling scheduler dari React page.** Pindahkan subscription logic ke hook/service yang reusable. **Done when:** page component hanya mengonsumsi typed state.
- [ ] **DX-248 — Pecah main War Room page menjadi modul kecil.** Pisahkan job composer, provider selector, recent jobs, workspace explorer, preview panel, sidebar, status panel. **Done when:** tiap bagian punya props/type dan test yang jelas tanpa perubahan behavior tak terkait.
- [ ] **DX-249 — Terapkan route-level error/loading/empty states.** Audit jobs, providers, plugins, profile, settings, workspace. **Done when:** setiap page menampilkan retryable error/loading/empty state yang dapat diuji.
- [ ] **DX-250 — Tambahkan current job detail real-time.** Hubungkan event ke detail panel, transcript, output, tool event, dan artifacts. **Done when:** semua data berasal dari API dan tidak hanya mock state.
- [ ] **DX-251 — Tambahkan provider status refresh.** Display authenticated/unknown/offline/needs-login dengan timestamp pemeriksaan. **Done when:** stale status tidak ditampilkan sebagai connected selamanya.
- [ ] **DX-252 — Tambahkan project switcher UI.** Gunakan project registry yang validated oleh API. **Done when:** switching project mengubah scope job/files dan tidak mengubah arbitrary root path.
- [ ] **DX-253 — Tambahkan workspace navigation boundary.** Pastikan folder traversal dan symlink errors ditampilkan aman. **Done when:** UI tidak dapat membuka path di luar root yang server tetapkan.
- [ ] **DX-254 — Tambahkan artifact preview state.** Loading, unsupported mime, expired token, integrity mismatch, download. **Done when:** preview hanya render file yang telah diverifikasi oleh server.
- [ ] **DX-255 — Tambahkan keyboard accessibility.** Sidebar, tabs, composer, dialog, file tree, menus dapat dipakai keyboard. **Done when:** keyboard-only smoke checklist lulus.
- [ ] **DX-256 — Tambahkan focus management.** Dialog open/close, route change, error announcement. **Done when:** focus tidak hilang ke body dan screen reader mendapat status update.
- [ ] **DX-257 — Tambahkan reduced-motion behavior.** Pastikan animasi tidak wajib untuk memahami job/progress. **Done when:** prefers-reduced-motion mengurangi nonessential animation.
- [ ] **DX-258 — Uji responsive layout.** Desktop, tablet, narrow viewport, zoom. **Done when:** sidebar, composer, job details, file preview tidak overflow.
- [ ] **DX-259 — Tambahkan visual regression target.** Pilih halaman kritis dan fixture data stabil. **Done when:** snapshot tidak bergantung provider live atau waktu real.
- [ ] **DX-260 — Audit browser console/network errors.** Jalankan web app dengan fake API dan monitor rejected promises. **Done when:** tidak ada error tidak tertangani pada critical user journeys.
- [ ] **DX-261 — Tambahkan browser E2E happy path.** Open app, check API, create mocked job, watch progress, view result, open job details. **Done when:** Playwright dapat menjalankan journey offline.
- [ ] **DX-262 — Tambahkan browser E2E failure path.** API offline, provider disconnected, job failed, SSE disconnected, invalid file path. **Done when:** UI recoverable dan tidak menampilkan success palsu.

## PHASE 10 — Persistence, observability, backup, and operations (P1)

**Goal:** platform dapat diperiksa, dipulihkan, dan dikelola tanpa menebak keadaan internal.  
**Dependency:** PHASE 03–09.  
**Exit gate:** migration, backup, readiness, logs, metrics, retention, dan restore drill teruji.

- [ ] **DX-263 — Inventarisasi schema PGlite.** Daftar table, columns, indexes, constraints, migrations, and access paths. **Done when:** schema catalog cocok dengan database initialization code.
- [ ] **DX-264 — Tambahkan explicit schema migration version.** Jangan mengandalkan create table-if-not-exists sebagai satu-satunya upgrade path. **Done when:** database version tersimpan dan migrasi idempotent.
- [ ] **DX-265 — Tambahkan migration test dari database versi sebelumnya.** Buat fixture database lama dan jalankan upgrade. **Done when:** existing job/session/provider/project state tetap terbaca.
- [ ] **DX-266 — Tambahkan migration rollback/recovery note.** Tentukan backup requirement sebelum perubahan destructive. **Done when:** setiap migration yang menghapus/ubah data memiliki recovery plan.
- [ ] **DX-267 — Audit transaction boundaries.** Pastikan update job state/activity/related rows atomic sesuai kebutuhan. **Done when:** forced failure tidak meninggalkan partial invariant.
- [ ] **DX-268 — Tambahkan database integrity checks.** Validasi job state, foreign keys, orphan artifacts, malformed metadata. **Done when:** doctor dapat mendeteksi corruption yang dikenal.
- [ ] **DX-269 — Perkuat backup creation tests.** Uji destination, consistent snapshot, checksum, permissions, interrupted backup. **Done when:** backup invalid ditolak.
- [ ] **DX-270 — Perkuat restore tests.** Restore ke temporary data directory dan validasi jobs/providers/projects/schema. **Done when:** restore menghasilkan data yang sama secara semantik.
- [ ] **DX-271 — Buat backup verification command.** Jangan menganggap backup file valid hanya karena file ada. **Done when:** command memverifikasi format, checksum, dan database open/read.
- [ ] **DX-272 — Dokumentasikan retention policy.** Jobs, sessions, transcript, artifacts, logs, browser profiles, backup. **Done when:** default retention dan user override memiliki satu sumber config.
- [ ] **DX-273 — Uji job TTL cleanup.** Uji terminal vs active jobs, retention boundary, clock edge, dan retry behavior. **Done when:** job active tidak pernah terhapus dan terminal job dihapus sesuai TTL.
- [ ] **DX-274 — Tambahkan artifact retention cleanup.** Hapus hanya artifact yang sudah expired dan tidak direferensikan. **Done when:** dry-run dan test prove orphan-only deletion.
- [ ] **DX-275 — Perkuat storage permissions.** Set directory/file mode yang sesuai pada POSIX dan best-effort protection di Windows. **Done when:** secret/session directories tidak world-readable pada platform yang mendukung.
- [ ] **DX-276 — Definisikan encryption boundary.** Dokumentasikan apa yang dienkripsi, di mana key disimpan, dan data apa yang tetap plaintext. **Done when:** tidak ada klaim encrypted-at-rest tanpa implementation evidence.
- [ ] **DX-277 — Hubungkan metrics registry ke API lifecycle.** Tambahkan request counter, job counter, queue gauge, provider status. **Done when:** metric value berubah setelah request/job test.
- [ ] **DX-278 — Implementasikan histogram untuk duration.** HTTP/job duration saat ini didefinisikan sebagai gauge. **Done when:** duration metrics memiliki buckets/count/sum dan output exposition valid.
- [ ] **DX-279 — Validasi Prometheus exposition.** Escape label/help, numeric values, timestamp, type names. **Done when:** parser/validator menerima output dan test label escaping.
- [ ] **DX-280 — Batasi cardinality metric labels.** Jangan gunakan jobId, user prompt, filepath, token, atau arbitrary provider response sebagai label. **Done when:** label schema allowlisted dan high-cardinality test.
- [ ] **DX-281 — Mount /metrics secara eksplisit.** Endpoint hanya tersedia sesuai deployment configuration. **Done when:** response content-type dan auth/local access policy diuji.
- [ ] **DX-282 — Tambahkan structured logging.** Gunakan requestId, jobId, providerId, component, severity, duration, errorCode. **Done when:** logs konsisten dan redacted.
- [ ] **DX-283 — Tambahkan log level/configuration.** Default developer-friendly, production structured, secret-safe. **Done when:** environment variable tervalidasi dan level testable.
- [ ] **DX-284 — Tambahkan diagnostic snapshot command.** Sertakan versions, package health, ports, DB health, worker state, browser availability, CI-compatible summary. **Done when:** support bundle tidak berisi cookies, tokens, prompts, atau full source files.
- [ ] **DX-285 — Tambahkan support bundle export.** Output sanitized JSON/text dengan opt-in untuk log detail. **Done when:** export dapat diperiksa otomatis untuk secret patterns.
- [ ] **DX-286 — Definisikan operational SLO awal.** Tentukan startup success, job completion visibility, recovery time, API health, backup restore. **Done when:** SLO berupa angka dan cara pengukuran, bukan slogan.
- [ ] **DX-287 — Buat operational runbook.** Startup, stop, provider re-login, stuck job, corrupt DB, backup/restore, port conflict, disk full. **Done when:** setiap procedure memiliki precondition, command, expected output, rollback.
- [ ] **DX-288 — Uji disk-full/permission failure.** Simulasikan database, log, artifact write failure. **Done when:** error terlaporkan jelas dan job tidak salah ditandai completed.
- [ ] **DX-289 — Uji API restart dengan data persistent.** Buat job/session, shutdown bersih, restart dengan data dir sama. **Done when:** history/status dan provider state yang persistent tersedia kembali sesuai policy.
- [ ] **DX-290 — Buat backup/restore drill otomatis.** Jalankan pada fixture DB di CI. **Done when:** backup -> destroy temp DB -> restore -> assertions semua lulus.

## PHASE 11 — Packaging, deployment, release engineering (P1/P2)

**Goal:** distribusi local/self-hosted repeatable dan rilis dapat di-rollback.  
**Dependency:** PHASE 00–10.  
**Exit gate:** clean install, Docker smoke, release dry-run, dan upgrade/rollback test selesai. Deployment produksi tetap memerlukan authorization environment.

- [ ] **DX-291 — Audit deployment target yang benar-benar didukung.** Bedakan local CLI, local Web/API, Docker Compose, dan remote/self-hosted. **Done when:** tidak ada target Kubernetes/production yang diklaim aktif tanpa manifest dan test.
- [ ] **DX-292 — Buat Docker multi-stage build untuk API/runtime.** Pisahkan build dependencies dan runtime dependencies. **Done when:** final image tidak menyertakan compiler/dev dependencies yang tidak dibutuhkan.
- [ ] **DX-293 — Buat Docker image non-root.** Set user, directory ownership, write permissions, dan umask. **Done when:** container berjalan tanpa root dan dapat menyimpan data pada volume.
- [ ] **DX-294 — Tentukan browser runtime container strategy.** Instal Chromium/required libraries atau pisahkan browser host bridge. **Done when:** docs/image tidak menjanjikan browser automation jika binary/browser dependencies tidak ada.
- [ ] **DX-295 — Buat Docker Compose local profile.** Hubungkan web/API dan persistent data volume dengan health dependency. **Done when:** docker compose up dapat memulai local stack dari clean environment.
- [ ] **DX-296 — Pisahkan environment dev dan production Compose.** Jangan expose port ke semua interface tanpa explicit configuration. **Done when:** default bind aman dan remote binding memerlukan JWT/secret config.
- [ ] **DX-297 — Tambahkan container healthcheck.** Gunakan readiness endpoint dan timeout yang masuk akal. **Done when:** unhealthy service terdeteksi saat DB/worker dependency gagal.
- [ ] **DX-298 — Pastikan signal handling pada container.** Node menjadi PID 1 dengan shutdown yang benar atau gunakan init ringan. **Done when:** SIGTERM menghentikan server/runner/Chrome dengan graceful timeout.
- [ ] **DX-299 — Tambahkan volume backup guidance.** Jelaskan mount untuk DB, sessions, browser profiles, artifacts, logs. **Done when:** restart/recreate container tidak menghapus data persistent yang diharapkan.
- [ ] **DX-300 — Buat .env.example canonical.** Gunakan NEURALFORGE_* dan bedakan required/optional/secret. **Done when:** semua env yang dipakai source tersedia atau documented.
- [ ] **DX-301 — Tambahkan startup config validation.** Invalid URL, port, host, path, timeout, quota, secret, CORS harus gagal dengan error actionable. **Done when:** invalid env tests memeriksa startup behavior.
- [ ] **DX-302 — Tambahkan release versioning policy.** Tentukan package versions, semver, changelog, tags, dan release notes. **Done when:** release checklist berlaku untuk workspace package dan CLI.
- [ ] **DX-303 — Buat changelog dari perubahan yang terkurasi.** Pisahkan added/changed/fixed/security/breaking. **Done when:** release draft dapat dihasilkan tanpa mengarang perubahan.
- [ ] **DX-304 — Audit release script.** Root script pnpm publish -r tidak boleh menjadi satu-satunya release flow tanpa preflight. **Done when:** release workflow melakukan check, tests, pack, version consistency, dry-run, dan hanya publish dengan explicit authorized trigger.
- [ ] **DX-305 — Tambahkan release dry-run.** Simulasikan npm publish metadata dan package content tanpa benar-benar publish. **Done when:** release candidate dapat divalidasi offline atau registry-disabled.
- [ ] **DX-306 — Tambahkan package provenance/SBOM.** Pilih tooling yang kompatibel dan jangan mengirim telemetry yang tidak diperlukan. **Done when:** artifact build mempunyai manifest dependency yang dapat diverifikasi.
- [ ] **DX-307 — Tambahkan dependency/security audit CI.** Tetapkan severity policy, exception record, dan update cadence. **Done when:** high/critical known vulnerability menghasilkan failure atau exception yang terukur.
- [ ] **DX-308 — Tambahkan artifact checksum.** CLI tarball/container artifact memiliki digest yang tercatat. **Done when:** build pipeline menghasilkan checksum yang dapat diverifikasi.
- [ ] **DX-309 — Tambahkan upgrade smoke test.** Install versi sebelumnya, siapkan fixture data, upgrade ke candidate, jalankan migration, verifikasi session/jobs. **Done when:** upgrade path diuji sebelum release.
- [ ] **DX-310 — Tambahkan rollback procedure.** Definisikan binary/image rollback dan database compatibility caveat. **Done when:** rollback dapat dilakukan pada fixture dan limitations tertulis.
- [ ] **DX-311 — Tambahkan platform install smoke tests.** Uji npm global/local package, Windows path, WSL2, Linux. **Done when:** matrix sesuai klaim support.
- [ ] **DX-312 — Audit package license dan third-party notices.** Pastikan dependensi yang dibundel memiliki notice/license sesuai. **Done when:** release artifact memuat license/notice yang diperlukan.
- [ ] **DX-313 — Siapkan deployment manifests tanpa auto-deploy.** Buat template compose/environment dan validation. **Done when:** user dapat deploy sendiri dengan documented secret setup tanpa repository menyimpan secret.
- [ ] **DX-314 — Tambahkan deployment smoke gate.** Periksa health, API, WebSocket, DB persistence, artifact access pada temporary environment. **Done when:** deployment dianggap valid hanya setelah smoke tests.
- [ ] **DX-315 — Jangan deploy production otomatis dari main.** Gunakan explicit environment protection dan approval yang diatur di platform deployment. **Done when:** CI main hanya build/test; production release membutuhkan authorized gate.

## PHASE 12 — Performance, quality, compatibility and final acceptance (P1/P2)

**Goal:** ukuran, latensi, reliabilitas, accessibility, dan compatibility mempunyai baseline dan regression guard.  
**Dependency:** PHASE 00–11.  
**Exit gate:** release candidate memenuhi acceptance checklist.

- [ ] **DX-316 — Tetapkan performance baseline API.** Ukur health, job create, job status, jobs list, provider status dengan mock dependencies. **Done when:** p50/p95 dan environment test tercatat.
- [ ] **DX-317 — Tetapkan queue throughput baseline.** Gunakan fake runtime dan controlled worker count. **Done when:** throughput, queue latency, dan concurrency ditampilkan.
- [ ] **DX-318 — Tetapkan memory baseline runtime.** Jalankan sequence job panjang dan cek memory growth. **Done when:** test/benchmark mendeteksi unbounded event/session buffers.
- [ ] **DX-319 — Tambahkan large workspace test.** Simulasikan puluhan ribu file dan nested directories. **Done when:** workspace browsing tetap bounded dan tidak membaca file yang di-ignore.
- [ ] **DX-320 — Tambahkan large transcript test.** Uji truncation, export, resume, dan artifact reference. **Done when:** ukuran output tetap dalam budget tanpa merusak transcript structure.
- [ ] **DX-321 — Jalankan platform path regression.** Uji separator, case, drive root, UNC, junction, symlink, unicode names. **Done when:** tests dapat berjalan di Windows/Linux yang relevan.
- [ ] **DX-322 — Tambahkan dependency update automation yang aman.** Buka update PR dengan lockfile dan CI, jangan auto-merge tanpa gate. **Done when:** update minor/patch dapat diperiksa tanpa mengubah main diam-diam.
- [ ] **DX-323 — Tambahkan code quality gate minimal.** Format, lint, unused exports/imports, package boundaries. **Done when:** scripts dijalankan di CI dan tidak bertabrakan dengan framework version.
- [ ] **DX-324 — Audit TypeScript strictness.** Periksa any, unknown narrowing, non-null assertion, unchecked indexed access, catch typing. **Done when:** critical domain/security packages tidak menambah any baru tanpa alasan.
- [ ] **DX-325 — Audit test quality.** Cari test yang hanya memeriksa file exists, smoke stub, atau selalu pass. **Done when:** setiap test penting memverifikasi behavior, output, dan failure mode.
- [ ] **DX-326 — Tambahkan coverage reporting yang akurat.** Tentukan source inclusion/exclusion dan thresholds realistis per domain. **Done when:** report tidak menghitung generated code atau mengecualikan source kritis.
- [ ] **DX-327 — Buat release candidate checklist otomatis.** Build, tests, typecheck, pack, docs link check, secret scan, migration tests, Docker smoke. **Done when:** satu command menghasilkan pass/fail list dan evidence directory.
- [ ] **DX-328 — Verifikasi first-run experience.** Fresh user, missing Chrome, no provider login, offline environment, no project config. **Done when:** setiap state punya next action dan tidak crash.
- [ ] **DX-329 — Verifikasi recovery experience.** API restart, browser closed, auth expired, pending send unknown, interrupted download, corrupt partial log. **Done when:** recovery aman dan tidak menggandakan side effect.
- [ ] **DX-330 — Verifikasi operational readiness akhir.** Gunakan spec/blueprint/20-acceptance-and-readiness.md yang sudah diperbarui. **Done when:** semua MUST item memiliki test/command evidence; item external-only ditandai terpisah dan tidak dipalsukan.
- [ ] **DX-331 — Buat status dashboard untuk readiness.** Tampilkan CI, API, database, workers, providers, queue, storage, last backup, version. **Done when:** setiap status berasal dari sumber aktual dan memiliki timestamp.
- [ ] **DX-332 — Lakukan final cross-document consistency audit.** README, ARCHITECTURE, API docs, env docs, runbook, package map, roadmap. **Done when:** tidak ada kontradiksi port, package name, provider count, command, auth, atau deployment.
- [ ] **DX-333 — Tag first operational baseline hanya setelah acceptance.** Siapkan tag/release notes tetapi jangan publish/deploy jika authorization tidak ada. **Done when:** tag candidate mengacu pada commit yang seluruh release gate-nya lulus.

---

# 4. Brainstorm — differentiators yang tidak mengulang fitur existing

Ide berikut adalah pengembangan setelah reliability dan integration gaps utama ditutup. Jangan mengimplementasikan item ini sebelum core operational gate hijau.

## 4.1 Plan → Execute → Verify graph

- [ ] **DX-334 — Rancang typed execution plan graph.** Bedakan objective, task, dependency, tool permission, expected output, verification command, dan rollback. **Done when:** schema plan tervalidasi dan tidak memuat executable command yang berjalan otomatis saat parse.
- [ ] **DX-335 — Tambahkan checkpoint pada task graph.** Simpan status tiap step dan artifact evidence. **Done when:** restart dapat melanjutkan step yang belum selesai tanpa mengulang step yang sudah terverifikasi.
- [ ] **DX-336 — Tambahkan verifier node.** Setiap implementasi dapat memiliki test/build/lint/manual fixture check sebagai acceptance. **Done when:** task tidak berstatus complete hanya berdasarkan agent message.
- [ ] **DX-337 — Tambahkan failure branch dan retry budget.** Bedakan retry step, rollback step, dan halt project. **Done when:** graph tidak berputar tanpa batas.
- [ ] **DX-338 — Tambahkan plan diff/review mode.** Tampilkan file/command/permission impact sebelum eksekusi bila user memilih review mode. **Done when:** plan dapat diekspor dan dibandingkan sebelum/sesudah task.

## 4.2 HoloMap — repository context yang hemat dan lokal

- [ ] **DX-339 — Definisikan local repository index contract.** File path, symbol, imports, package ownership, test mapping, timestamp, content hash. **Done when:** schema tidak menyimpan secret atau full file content secara default.
- [ ] **DX-340 — Buat incremental scanner.** Scan file baru/berubah saja berdasarkan hash dan ignore rules. **Done when:** perubahan satu file tidak memicu re-index seluruh repository.
- [ ] **DX-341 — Tambahkan dependency graph visualization data.** Hubungkan app/package/module/test. **Done when:** UI/CLI dapat menunjukkan impact scope dari satu package.
- [ ] **DX-342 — Tambahkan evidence links pada context retrieval.** Setiap hasil context menyertakan file path dan line range. **Done when:** agent dapat memberi referensi source yang dapat diperiksa.
- [ ] **DX-343 — Tambahkan privacy controls untuk index.** Default local-only, exclude secret/config/build/vendor directories. **Done when:** secret fixture tidak masuk index maupun support bundle.
- [ ] **DX-344 — Tambahkan stale index invalidation.** Watcher atau mtime/hash checks. **Done when:** deleted/renamed file tidak terus muncul sebagai evidence.
- [ ] **DX-345 — Ukur context retrieval quality.** Gunakan repository fixtures dengan expected relevant files. **Done when:** benchmark memiliki precision/recall proxy dan reproducible dataset.

## 4.3 Safe change-set and Git workflow assistant

- [ ] **DX-346 — Tambahkan change-set summary dari Git diff.** Kelompokkan source, tests, docs, generated files, dependency changes. **Done when:** summary tidak menebak file yang tidak berubah.
- [ ] **DX-347 — Tambahkan pre-commit validation profile.** Jalankan relevant tests dari file/package yang berubah lalu root gate. **Done when:** output menunjukkan test yang dipilih dan alasan pemilihannya.
- [ ] **DX-348 — Tambahkan secret scan sebelum commit.** Scan staged diff dan known credential formats. **Done when:** kemungkinan secret memblokir commit dan tidak menampilkan full value.
- [ ] **DX-349 — Tambahkan safe commit suggestion.** Bentuk conventional commit dari diff facts, jangan auto-commit file yang tidak diminta. **Done when:** suggestion menyertakan scope dan test evidence.
- [ ] **DX-350 — Tambahkan optional worktree per autonomous job.** Isolasi perubahan parallel agent dari working tree utama. **Done when:** setiap worktree mempunyai owner/job ID dan cleanup non-destructive.
- [ ] **DX-351 — Tambahkan merge conflict assistant.** Tampilkan conflict dan lakukan resolution hanya bila base intent dapat dipahami dari code/tests. **Done when:** unresolved/ambiguous conflict tidak dipaksa menjadi clean merge palsu.

## 4.4 Provider routing and quality lab

- [ ] **DX-352 — Buat provider evaluation fixture set.** Task coding, analysis, JSON contract, long context, image/audio capability. **Done when:** fake provider menghasilkan deterministic expected outcomes.
- [ ] **DX-353 — Buat response quality evaluator interface.** Validasi format, schema, tool compliance, and task-specific tests. **Done when:** metric evaluasi dipisah dari provider-specific implementation.
- [ ] **DX-354 — Buat provider reliability dashboard data.** Availability, latency, errors, quota unknown/known, DOM drift. **Done when:** data bersumber dari operational events, bukan rating buatan.
- [ ] **DX-355 — Tambahkan provider circuit breaker policy profile.** Threshold dan cooldown per provider/transport. **Done when:** profile dapat diuji dengan fake clock dan tidak men-switch provider tanpa policy.
- [ ] **DX-356 — Tambahkan user-selected preference memory.** Simpan pilihan provider lokal dan project-scoped. **Done when:** tidak menyimpan credential atau mengubah model pilihan website tanpa persetujuan user.
- [ ] **DX-357 — Buat model capability comparison.** Bandingkan model yang terlihat/dapat diakses dari provider dengan capability data yang terverifikasi. **Done when:** field unknown ditampilkan unknown, bukan diperkirakan.

## 4.5 Artifact and evidence provenance

- [ ] **DX-358 — Tambahkan artifact manifest.** Catat file path, MIME, size, SHA-256, createdByJob, createdAt, source tool. **Done when:** manifest dapat divalidasi dan tidak menyertakan secret.
- [ ] **DX-359 — Tambahkan artifact integrity verification on read.** Hitung ulang digest saat preview/download sesuai policy. **Done when:** file yang berubah setelah dibuat ditandai integrity mismatch.
- [ ] **DX-360 — Tambahkan exportable task evidence bundle.** Sertakan plan, event summary, test commands, commit SHA, artifact hashes. **Done when:** bundle bebas token/cookie/prompt sensitif secara default.
- [ ] **DX-361 — Tambahkan artifact diff/preview.** Text diff, image metadata, binary metadata. **Done when:** preview tidak mengeksekusi file atau membuka active content secara otomatis.
- [ ] **DX-362 — Tambahkan artifact retention ownership.** Kaitkan artifact ke job/session/project dan policy lifecycle. **Done when:** artifact yang masih direferensikan tidak dihapus oleh cleanup.

## 4.6 Project templates and team readiness

- [ ] **DX-363 — Tambahkan project profile template.** Node/TypeScript, Rust, Python, monorepo, docs-only. **Done when:** template berisi test/build commands dan permission defaults.
- [ ] **DX-364 — Tambahkan repository onboarding scan.** Deteksi package manager, scripts, CI, language, tests, secrets patterns. **Done when:** hasil scan read-only dan disajikan sebagai evidence.
- [ ] **DX-365 — Tambahkan task recipe catalog.** Audit, bugfix, refactor, tests, docs, dependency update, release-prep. **Done when:** setiap recipe punya inputs, outputs, safe permissions, verification.
- [ ] **DX-366 — Tambahkan workspace policy inheritance.** Machine -> project -> task profile, dengan deny precedence. **Done when:** policy resolution deterministic dan dapat ditampilkan ke user.
- [ ] **DX-367 — Tambahkan multi-project queue view.** Filter jobs per project/provider/status. **Done when:** project scoping tidak membocorkan metadata project lain.
- [ ] **DX-368 — Tambahkan team handoff/export format.** Export issue/plan/evidence untuk dipakai engineer/agent lain. **Done when:** format versioned dan bebas secret secara default.

## 4.7 IDE/CI surfaces

- [ ] **DX-369 — Buat minimal VS Code integration specification.** Command submit, inspect, cancel, approve, artifact open, status. **Done when:** semua operasi memiliki SDK method dan permission mapping.
- [ ] **DX-370 — Buat IDE adapter prototype menggunakan SDK.** Jangan mengimpor packages/runtime internal. **Done when:** adapter menjalankan mock task dan menerima event typed.
- [ ] **DX-371 — Buat CI headless adapter.** Noninteractive execution, JSON output, exit code, artifact directory, no browser by default. **Done when:** pipeline dapat mengeksekusi mock task tanpa TTY.
- [ ] **DX-372 — Tambahkan CI policy profile.** Batasi tools, network, project root, duration, and artifact output. **Done when:** CI runner default tidak memiliki full filesystem access.
- [ ] **DX-373 — Tambahkan GitHub Actions example workflow.** Hanya gunakan fixture/mock provider kecuali secret diberikan secara explicit. **Done when:** example dapat berjalan pada public fork tanpa secret.
- [ ] **DX-374 — Tambahkan structured JSON event output.** Cocok untuk IDE dan CI parsers. **Done when:** event stream memiliki schema/version dan malformed output test.

## 4.8 Plugin ecosystem governance

- [ ] **DX-375 — Buat plugin compatibility test kit.** Validasi manifest, tool schema, permissions, host API range. **Done when:** author plugin dapat menjalankan satu local command.
- [ ] **DX-376 — Buat built-in plugin samples yang read-only.** Git metadata, issue search mock, documentation search local. **Done when:** sample tidak melakukan write ke akun eksternal.
- [ ] **DX-377 — Buat plugin trust levels.** Built-in, locally trusted, signed third-party, untrusted. **Done when:** setiap level memiliki execution and permission policy.
- [ ] **DX-378 — Buat plugin audit record.** Install/enable/disable/update/tool call. **Done when:** audit entry dapat dicari tanpa memuat secret atau file content.
- [ ] **DX-379 — Rancang registry/catalog tanpa auto-install.** Metadata, version, signature, compatibility, permissions. **Done when:** catalog browse tidak mengeksekusi plugin atau men-download code otomatis.

---

## 5. Milestone gates — urutan eksekusi wajib

| Milestone | Scope | Exit condition |
|---|---|---|
| **M0 — Green Baseline** | DX-001–020 | CLI contract, root tests, build, check, CI matrix hijau |
| **M1 — Monorepo Integrity** | DX-021–050 | Seluruh package aktif masuk workspace/build/test policy; generated/scratch/lockfile jelas |
| **M2 — Product Truth** | DX-051–070 | Narasi, README, architecture, blueprint, env docs konsisten |
| **M3 — API & Security Foundation** | DX-071–140 | API contracts, health/readiness, auth, local provider shell removal, WS/plugin security tests |
| **M4 — Runtime Reliability** | DX-141–165 | Job/session/recovery/lease/cancel/retry terbukti |
| **M5 — Provider Mesh** | DX-166–192 | Browser fixtures, local inference, provider registry/routing/offline behavior tested |
| **M6 — Platform Interfaces** | DX-193–220 | SDK, WS, Config, OpenAPI, MCP benar-benar usable dan typed |
| **M7 — Extensibility** | DX-221–238 | Plugin/tool lifecycle dan permissions enforced |
| **M8 — War Room** | DX-239–262 | Web UI realtime, project-scoped, accessible, E2E tested |
| **M9 — Operations** | DX-263–290 | Migration, backup/restore, metrics/logs, runbook, readiness |
| **M10 — Distribution** | DX-291–315 | Docker/local install, release dry-run, upgrade/rollback |
| **M11 — Acceptance** | DX-316–333 | Performance/security/E2E/readiness release gate |
| **M12 — Differentiators** | DX-334–379 | Plan graph, HoloMap, safe Git assistant, evaluation lab, IDE/CI, plugin governance |

**Aturan sequencing:** M0 → M1 → M2 → M3. Setelah M3, M4/M5 dapat dikerjakan paralel pada domain terpisah dengan shared contract yang stabil. M6 menunggu runtime/API contract. M7/M8 mengikuti M3/M6. M9/M10 berjalan setelah data/API contracts stabil. M11 adalah gate sebelum release. M12 hanya setelah reliability dan operational baseline lulus.

---

## 6. Definition of Done — standar lintas task

Sebuah task hanya dapat dicentang [x] bila semua kondisi yang relevan di bawah terpenuhi:

1. Implementasi berada pada package/path yang benar dan tidak menduplikasi kemampuan yang sudah ada.
2. TypeScript compile/typecheck lulus; tidak menambah any, unsafe cast, atau catch kosong tanpa justifikasi.
3. Ada unit/integration/contract test untuk behavior yang berubah dan negative case yang relevan.
4. Regression tests lama tetap lulus.
5. Error behavior, permissions, secret handling, dan lifecycle telah diperiksa.
6. Dokumentasi diubah jika public behavior, config, endpoint, CLI, atau deployment berubah.
7. Tidak ada credential, cookie, private profile, user data, atau generated artifact yang tidak perlu masuk commit.
8. Package build/pack dan import consumer berfungsi jika package metadata berubah.
9. CI lulus untuk seluruh matrix yang diwajibkan atau kegagalan environment dilaporkan akurat.
10. Evidence dan commit/PR dapat ditelusuri.

### Final release acceptance

- [ ] **DX-380 — Green CI release candidate.** Semua test/build/check/pack/browser regression lulus pada matrix yang ditetapkan. **Done when:** satu workflow run pada commit candidate memiliki conclusion success.
- [ ] **DX-381 — Secure default acceptance.** Remote bind, authentication, path guard, command execution, plugin permission, local provider networking, WS auth, secret redaction lulus. **Done when:** security regression suite seluruhnya pass.
- [ ] **DX-382 — Persistence and recovery acceptance.** Job/session state survive restart; backup/restore terverifikasi; migrations dapat diulang. **Done when:** operational drill fixture selesai tanpa kehilangan data.
- [ ] **DX-383 — Provider acceptance.** Fake provider flow dan local provider flow lulus; browser fixture regression lulus. **Done when:** minimal satu happy path dan satu failure/recovery path per transport terverifikasi.
- [ ] **DX-384 — Interface acceptance.** CLI, Web, API, SDK, WS, MCP contracts konsisten. **Done when:** contract suite membuktikan create/monitor/cancel/read artifacts.
- [ ] **DX-385 — Documentation acceptance.** README, API docs, architecture, environment, privacy, install, troubleshooting, runbook konsisten. **Done when:** link check lulus dan semua klaim penting memiliki evidence.
- [ ] **DX-386 — Release dry-run acceptance.** Package tarball/container candidate dibuat dan diuji tanpa publish/deploy. **Done when:** checksum, SBOM/manifest, version map, smoke output tersedia.
- [ ] **DX-387 — Operational handoff.** Buat release-readiness report berisi known limitations, support matrix, restore procedure, security model, dan remaining external-only actions. **Done when:** setiap remaining task dinyatakan jelas dan tidak ada klaim produksi yang tidak terbukti.

---

## 7. Catatan untuk autonomous agent berikutnya

Mulai dari **DX-001**, bukan dari ide brainstorm. Pada baseline audit, langkah paling bernilai adalah menyelesaikan ketidaksesuaian executable CLI (DX-001–015) lalu menutup graph workspace/build/test (DX-021–050). Setelah itu bangun API/security foundation sebelum parallel feature work.

Jangan menandai source awal SDK, WebSocket, ConfigAPI, local model, plugin, OpenAPI, atau observability sebagai selesai sampai tests membuktikan consumer end-to-end. Jangan menganggap UI status sebagai operational status. Jangan mengubah product brand/package scope secara massal. Jangan mengklaim no-cloud untuk browser providers. Jangan publish/deploy hanya karena checklist lokal selesai.

**Prinsip eksekusi:** inspect → implement smallest safe change → add regression test → run targeted checks → run wider gate → update docs → record evidence → commit → continue to next dependency-ready task.