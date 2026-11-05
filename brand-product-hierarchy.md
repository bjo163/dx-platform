# Brand/Product Hierarchy for Rocksoul DX Developer Platform

## Hierarchy Overview

### 1. Rocksoul DX (Platform)
- **Role**: The overarching developer platform
- **Description**: Local-first, modular, embeddable, independently operable developer platform
- **Target Audience**: Developers, AI agents, autonomous execution backlogs
- **Key Principles**: Local-first (not all offline), no API key assumption, no hidden cloud dependency, shared domain contracts

### 2. NeuralForge (Foundation Runtime)
- **Role**: Existing agent runtime and developer experience foundation
- **Status**: Already established in repository
- **Package Scope**: @neuralforge/ (public API contract)
- **Description**: NeuralForge adalah fondasi agent runtime dan pengalaman developer yang sudah ada di repository. Nama package dan API publik yang sekarang menggunakan scope **@neuralforge/** tetap menjadi kontrak kompatibilitas sampai ada migrasi branding yang direncanakan, diuji, dan terdokumentasi.
- **Key Contract**: Jangan melakukan global rename hanya karena nama platform berubah. Package scope @neuralforge/ adalah kontrak kompatibilitas yang harus dihormati.

### 3. Omni-Nexus (Historical/Alternative)
- **Role**: Previous platform reference
- **Status**: Historical reference only
- **Description**: Referenced in source/README as previous product name
- **Key Note**: Names of packages using Omni-Nexus scope should be migrated with proper testing and documentation

### 4. @neuralforge/ Package Scope
- **Role**: Public API contract compatibility
- **Mandate**: Must remain consistent until branding migration is planned, tested, and documented
- **Mandate**: Do not perform global rename just because platform name changes
- **Scope**: All public API packages using @neuralforge/ scope

## Brand Guidelines

### Do's:
- Honor the @neuralforge/ package scope as compatibility contract
- Document any branding migration with proper testing
- Maintain local-first execution as core principle
- Use shared domain contracts across all interfaces

### Don'ts:
- Do not perform global rename solely because platform name changes
- Do not assume API keys are the default option
- Do not claim "no cloud/no data leaves machine" for web provider flows
- Do not send provider web data to cloud without explicit user consent

## Implementation Notes

1. **Migration Timeline**: Any branding migration from @neuralforge/ scope must follow proper testing and documentation before implementation
2. **Compatibility**: All existing packages using @neuralforge/ scope must continue to work without breaking changes
3. **Documentation**: Brand hierarchy must be consistently documented in:
   - README.md
   - ARCHITECTURE.md
   - spec/blueprint/ files
   - FINAL_SUMMARY.md

## References in todo.md

From todo.md section 0.2 (Pillars of capability):
- NeuralForge adalah fondasi agent runtime yang sudah ada
- Package scope @neuralforge/ adalah kontrak kompatibilitas

From todo.md section 0.3 (Unbreakable product principles):
- Local-first bukan berarti semua provider offline
- No API key hanya berlaku untuk alur yang memakai akun web/browser session atau provider lokal
- No cloud dependency tidak boleh diklaim untuk browser provider

---
*Hierarchy established for DX-051 task completion. Updated: 2026-11-05*