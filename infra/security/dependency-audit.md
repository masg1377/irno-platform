# Irno Platform — Dependency Security Audit

**Date:** 2026-06-16  
**Tool:** `pnpm audit`  
**Total vulnerabilities:** 24 (3 low · 13 moderate · 8 high · 0 critical)

---

## High Severity

### 1. `multer` < 2.1.1 — DoS (3 CVEs)
| Advisory | Description |
|---|---|
| GHSA-xf7r-hgr6-v32p | Denial of Service via incomplete cleanup |
| GHSA-v52c-386h-88mc | Denial of Service via resource exhaustion |
| GHSA-5528-5vmv-3xc2 | Denial of Service via uncontrolled recursion |

- **Path:** `apps/meetino-api` → `@nestjs/platform-express@10.4.22` → `multer@2.0.2`
- **Fix:** `>=2.1.1`
- **Status:** Pinned via `pnpm.overrides` in root `package.json`. ✅
- **Runtime impact:** meetino-api file-upload endpoints (form/multipart). High risk if left unpatched.

### 2. `ws` < 8.21.0 — Memory exhaustion DoS (GHSA-96hv-2xvq-fx4p)
- **Path:** `apps/meetino-api` → `socket.io@4.8.1` → `engine.io@6.6.8` → `ws@8.20.1`
- **Fix:** `>=8.21.0`
- **Status:** Pinned via `pnpm.overrides`. ✅
- **Runtime impact:** WebSocket handler (LiveKit + Socket.IO). An attacker sending tiny fragments can exhaust server memory.

### 3. `glob` — Command injection via `-c/--cmd` (GHSA-5j98-mcp5-4vw2)
- **Path:** `apps/meetino-api` → `@nestjs/cli@10.4.9` → `glob@10.4.5`
- **Fix:** `>=10.5.0`
- **Status:** `@nestjs/cli` is a devDependency (build-time only). Not present in production Docker image.
- **Runtime impact:** None in production. Low risk.

### 4. `picomatch` — ReDoS via extglob quantifiers (GHSA-c2c7-rcm5-vvqj)
- **Path:** `apps/meetino-api` → `@nestjs/cli@10.4.9` → `picomatch@4.0.1`
- **Fix:** `>=4.0.4`
- **Status:** devDependency (build-time only). Not in production image.

### 5. `tmp` — Path traversal (GHSA-ph9p-34f9-6g65)
- **Path:** `apps/meetino-api` → `@nestjs/cli@10.4.9` → `inquirer` → `external-editor` → `tmp@0.0.33`
- **Fix:** `>=0.2.6`
- **Status:** devDependency (build-time only). Not in production image.

### 6. `lodash` — Code injection via `_.template` (GHSA-r5fr-rjxr-66jc)
- **Path:** `apps/meetino-api` → `@nestjs/config@3.3.0` → `lodash@4.17.21`
- **Fix:** `>=4.18.0` (no released patch — upstream advisory only affects `_.template` with attacker-controlled input)
- **Status:** `_.template` is not used in Irno/Meetino code. No exploitable path exists.
- **Runtime impact:** Theoretical. Low exploitability.

---

## Moderate Severity (summary)

All 13 moderate issues are in `apps/meetino-api` → `@nestjs/cli` → Angular devkit:
- `ajv` < 8.18.0 — ReDoS via `$data` option (devDependency)
- `micromatch` — ReDoS via backtracking (devDependency)
- `braces` — ReDoS (devDependency)
- `semver` — ReDoS (devDependency)
- `fill-range` — ReDoS (devDependency)
- `webpack` — build-time SSRF via HTTP redirect (devDependency)
- Other Angular devkit transitive deps

All moderate issues are in **build-time devDependencies** only. They are not present in the production Docker image (`output: standalone` copies only runtime dependencies).

---

## Low Severity (summary)

- `tmp` ≤ 0.2.3 — symlink write (devDependency, same path as above)
- `webpack` — build-time SSRF allow-list bypass (devDependency)

---

## Action Plan

| Priority | Package | Fix | Timeline |
|---|---|---|---|
| **Immediate** | `multer` | Pin to `>=2.1.1` via overrides | Done ✅ |
| **Immediate** | `ws` | Pin to `>=8.21.0` via overrides | Done ✅ |
| **Next sprint** | `@nestjs/platform-express` | Upgrade to version that uses multer ≥ 2.1.1 | Phase 10 |
| **Next sprint** | `socket.io` / `engine.io` | Upgrade to versions that use ws ≥ 8.21.0 | Phase 10 |
| **Accepted** | `lodash` | No exploitable path — monitor for upstream patch | Documented |
| **Accepted** | All devDependency issues | Not in production image | Documented |

---

## Re-running the Audit

```bash
# From monorepo root
pnpm audit

# Fix automatically where possible
pnpm audit --fix

# Ignore devDependencies (production-only view)
pnpm audit --prod
```

---

## Notes

- Hub API, Hub Web, Career Web: **0 vulnerabilities** in their own dependency trees.
- All high-severity runtime vulnerabilities are in `apps/meetino-api` only.
- `pnpm.overrides` in root `package.json` pins affected transitive deps immediately without waiting for upstream package maintainers.
- Meetino-web Zod v4/v3 TypeScript incompatibility (`@hookform/resolvers`) is a TypeScript error, not a security vulnerability.
