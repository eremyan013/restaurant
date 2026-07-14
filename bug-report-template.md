# Bug Report Template — Tonir

Use this format for every bug found during testing.

---

## BUG-XXX: [Short descriptive title]

**Date:** YYYY-MM-DD
**Reporter:** QA Agent / Developer / Tester
**Severity:** Critical / High / Medium / Low
**Status:** Open / In Progress / Fixed / Closed

### Environment
- App: tonir (mobile) / tonir-admin / Supabase Edge Function
- Platform: iOS / Android / Web (Chrome/Safari/Firefox)
- Expo SDK version: (for mobile bugs)
- Next.js version: (for admin bugs)
- Supabase project: staging / production
- Branch/commit:

### Summary
One sentence describing what is wrong.

### Steps to Reproduce
1. Step one
2. Step two
3. Step three

### Expected Behavior
What should happen.

### Actual Behavior
What actually happens. Include error messages verbatim.

### Evidence
- Screenshot or screen recording (if UI bug)
- Supabase Edge Function logs (if backend bug)
- Console error (if applicable)
- Network request/response (if API bug)

### Root Cause (if known)
Brief analysis of why this is happening.

### Suggested Fix (if known)
Specific code change or approach recommended.

---

## Severity Guide

| Severity | Definition | Example |
|----------|-----------|---------|
| Critical | Data loss, security breach, complete feature broken | Double booking possible, RLS bypass, auth broken |
| High | Key feature broken, no workaround | Can't create reservation, admin can't login, slots not showing |
| Medium | Feature partially broken, workaround exists | Wrong time displayed, filter not working, email not sent |
| Low | Minor UI issue, cosmetic, edge case | Button misaligned, typo, wrong color, minor layout issue |

---

## Supabase-Specific Checks
When filing a backend bug, always include:
- [ ] RLS policy checked — is the policy blocking a valid query?
- [ ] Edge Function logs checked in Supabase dashboard
- [ ] Checked with both `anon` key and authenticated session
- [ ] Reproduced on local Supabase instance (`npx supabase start`)

---

## Open Bugs

| ID | Title | Severity | App | Status |
|----|-------|----------|-----|--------|
| - | - | - | - | - |

