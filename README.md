<!--
Copyright (c) 2026 qbitOS / ugrad.ai. All rights reserved.
Principal: Tad R. Ericson · founder / principal architect
AI-assisted engineering: Cursor IDE; Anthropic Claude; OpenAI GPT/ChatGPT-class; Mistral-class models — human authorship & review
SPDX-License-Identifier: Apache-2.0
Source: https://github.com/qbitOS/ugrad
Provenance: ugrad-org-readme
-->

# qbitOS · ugrad

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://github.com/qbitOS/ugrad/blob/main/LICENSE)
[![Compliance](https://img.shields.io/badge/Compliance-qmd-6b7280)](https://github.com/qbitOS/ugrad/blob/main/COMPLIANCE.qmd)
[![Org](https://img.shields.io/badge/GitHub-qbitOS-222?logo=github)](https://github.com/qbitOS)

**Principal:** **Tad R. Ericson** · **qbitOS** / ugrad.ai — μgrad / beyondBINARY / Iron Line ecosystem.

Organization-level home for **μgrad / ugrad**-related projects under **[qbitOS](https://github.com/qbitOS)**. Prepared for **strategic diligence**; does **not** imply endorsement by Sequoia, Mistral, OpenAI, Alphabet, or any named party unless you publish that separately.

> **Baseline:** [COMPLIANCE.qmd](COMPLIANCE.qmd) matches [qbitOS/qbitos-freya](https://github.com/qbitOS/qbitos-freya/blob/main/COMPLIANCE.qmd). **IP / distribution:** [COMPLIANCE.md](COMPLIANCE.md). **License:** [Apache-2.0](LICENSE). **Diligence brief:** [uvspeed docs](https://github.com/qbitOS/uvspeed/blob/main/docs/qbitos-org-investor-presentation.md).

## Repositories

| Repo | Purpose |
|------|---------|
| [ugrad-gameHUB](https://github.com/qbitOS/ugrad-gameHUB) | Static landing + GitHub Pages entry — [COMPLIANCE.qmd](https://github.com/qbitOS/ugrad-gameHUB/blob/main/COMPLIANCE.qmd) · [LICENSE](https://github.com/qbitOS/ugrad-gameHUB/blob/main/LICENSE) |
| [qbitos-freya](https://github.com/qbitOS/qbitos-freya) | FreyaUnits canonical surface ([COMPLIANCE.qmd](https://github.com/qbitOS/qbitos-freya/blob/main/COMPLIANCE.qmd)) |
| **uvspeed** (upstream) | [qbitOS/uvspeed](https://github.com/qbitOS/uvspeed) — full monorepo: `web/`, kbatch, qbit tools, WASM, Tauri |

Related mirrors: [qbitos-ugrad](https://github.com/qbitOS/qbitos-ugrad) (μgrad staircase reference), [qbitos-iron-line](https://github.com/qbitOS/qbitos-iron-line), [qbitos-gluelam](https://github.com/qbitOS/qbitos-gluelam).

## Related documentation (upstream)

- [ugrad games online roadmap](https://github.com/qbitOS/uvspeed/blob/main/docs/ugrad-games-online-roadmap.md)
- [Deployment: ugrad games subdomains](https://github.com/qbitOS/uvspeed/blob/main/docs/deployment/ugrad-games-subdomains.md)
- [ugrad enterprise readiness](https://github.com/qbitOS/uvspeed/blob/main/docs/ugrad-enterprise-readiness.md)
- [ugrad raw feeds](https://github.com/qbitOS/uvspeed/blob/main/docs/ugrad-raw-feeds.md)

## Workspace (all μgrad working components)

Runnable μgrad code lives in the **uvspeed** monorepo. This repo keeps org docs here and a **linked checkout** under **`workspace/uvspeed`** so everything you need is in one folder tree.

1. Run `./scripts/link-uvspeed-workspace.sh` (see **[WORKSPACE.md](WORKSPACE.md)**).
2. Edit PWAs and tooling under **`workspace/uvspeed/web/`**, **`npm/ugrad-cli/`**, **`qbit/ugrad/`**, etc.
3. Path index: **[workspace/ugrad-paths.md](workspace/ugrad-paths.md)** · manifest: **[workspace/ugrad-component-manifest.json](workspace/ugrad-component-manifest.json)**

## Static site bundle (`site/`)

A **forward-facing, deployable copy** of μgrad R0 plus required shared modules (`quantum-prefixes.js`, `qbit-dac.js`, etc.), IBM calibration CSVs, icons, PWA manifest, and a minimal `sw.js`. Use it for GitHub Pages or any static host without checking out the full uvspeed tree.

- **Browse:** [site/README.md](site/README.md) · refresh instructions: [site/SYNC.md](site/SYNC.md)
- **Sync from local uvspeed:** `./scripts/sync-site-from-uvspeed.sh` (set `UVSPEED` if the monorepo is not a sibling of this repo)

## Community

- **[Code of Conduct](CODE_OF_CONDUCT.md)** — Contributor Covenant; report issues via [GitHub Issues](https://github.com/qbitOS/ugrad/issues).
- **[Contributing](CONTRIBUTING.md)** — org docs vs upstream code.
- **[Security](SECURITY.md)** — reporting scope (umbrella vs product).

## License

Files in this repository are licensed under the **Apache License 2.0** — see [LICENSE](LICENSE).

---

*beyondBINARY quantum-prefixed · μgrad arenas · [Apache-2.0](LICENSE)*

## GitHub

First-time push and remote setup: **[GITHUB.md](GITHUB.md)**.
