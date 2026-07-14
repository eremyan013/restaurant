---
name: project-tonir-admin-stack
description: tonir-admin actual installed dependencies — Zod and React Hook Form are NOT yet installed as of 2026-06-11
metadata:
  type: project
---

tonir-admin (Next.js 14+, React 19) stack as confirmed by reading actual source files (2026-06-18):

- Zod and react-hook-form ARE installed and in use (confirmed in CreateAdminForm.tsx and admins/actions.ts via useActionState + zodResolver).
- shadcn/ui is NOT installed. There is no `components/ui/` directory. All UI components are custom Tailwind. Any toast/notification system must be built from scratch or via a zero-dep library — do NOT reference shadcn/ui Toaster or Toast imports.
- @dnd-kit/core and @dnd-kit/sortable ARE installed (confirmed in home-sections-client.tsx).
- Supabase: @supabase/supabase-js ^2 and @supabase/ssr, browser client at lib/supabase-browser.ts, admin client at lib/supabase-admin.ts.
- No Redux, no Zustand confirmed in code (CLAUDE.md lists Zustand but no actual usage found).

**Why:** Prior stale memory incorrectly said Zod/RHF were missing. Updated after reading CreateAdminForm.tsx which uses both.

**How to apply:** Do not add install steps for Zod or RHF. Do not assume shadcn/ui Toaster exists — always design toast from scratch or using a lightweight library like `sonner` (the npm package, not the shadcn wrapper).
