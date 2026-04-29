# Dependency Audit

## npm audit (web/)

```
$ npm audit --json | jq '.metadata.vulnerabilities'
{
  "info": 0,
  "low": 0,
  "moderate": 2,
  "high": 8,
  "critical": 0,
  "total": 10
}
```

### Vulnerable Packages

| Severity | Package | Source advisory | Used By |
|---|---|---|---|
| high | `vite` | 1116230, 1116232, 1116235 | direct |
| high | `vite-plugin-pwa` | via `workbox-build` | direct (disabled) |
| high | `workbox-build` | via `@rollup/plugin-terser` | nested |
| high | `@rollup/plugin-terser` | via `serialize-javascript` | nested |
| high | `serialize-javascript` | 1113686, 1115723 | nested |
| high | `flatted` | 1114526, 1115357 | nested |
| high | `lodash` | 1115806, 1115810 | nested |
| high | `picomatch` | 1115549, 1115551, 1115552, 1115554 | nested |
| moderate | `brace-expansion` | 1115540, 1115541, 1115543 | nested |
| moderate | `postcss` | 1117015 | nested |

**Risk profile.** All vulnerabilities are in **dev dependencies** (build-time
only). They do not ship to the production bundle. The risk is build-pipeline
integrity: a malicious patch to one of these packages could inject code into
the resulting `dist/`.

### Remediation Plan

```bash
cd web
npm audit fix          # safe, semver-compatible fixes
npm audit fix --force  # only if needed; review breaking changes per package
```

If `vite-plugin-pwa` causes nested issues that don't auto-fix, **remove it**:
the PWA is currently disabled (`vite.config.ts` lines 3+8–10 confirm), so the
package is dead weight.

```bash
npm uninstall vite-plugin-pwa workbox-window
```

## App-side dependencies (`web/`)

Direct production deps (all current major versions):

```
@supabase/supabase-js  ^2.98.0   ✓ latest 2.x
react                  ^19.2.0   ✓ latest
react-dom              ^19.2.0   ✓ latest
react-router-dom       ^7.13.1   ✓ latest 7.x
vite-plugin-pwa        ^1.2.0    ⚠ disabled, can remove
workbox-window         ^7.4.0    ⚠ disabled, can remove
```

## Supabase Edge Functions

Each function imports from pinned URLs:

```typescript
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
```

⚠️ `@supabase/supabase-js@2.45.4` is older than the web bundle (2.98.0).
Unify to a single pinned version to reduce surface area:

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.98.0';
```

✓ Imports are pinned to specific versions (good practice — prevents silent
upstream pulls).
