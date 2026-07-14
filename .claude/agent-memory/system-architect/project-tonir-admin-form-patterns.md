---
name: project-tonir-admin-form-patterns
description: Existing Server Action and form patterns in tonir-admin — critical context for validation architecture
metadata:
  type: project
---

Two distinct form patterns exist in tonir-admin as of 2026-06-11:

**Pattern A — useActionState forms (prize-form, venue-form, CreateAdminForm, new-reservation-modal)**
- Form has `action={serverAction}` prop wired via `useActionState`
- Server Action signature: `(prev: State, formData: FormData) => Promise<State>`
- State type: `{ ok: false; error?: string } | { ok: true }`
- Error displayed as a single top-level string, no field-level errors today

**Pattern B — fetch-based forms (guide-form, yel-adjust-form)**
- Form calls `e.preventDefault()` and submits via `fetch()` to `/api/...` routes
- guide-form submits JSON to `/api/guides` and `/api/guides/:id`
- yel-adjust-form builds FormData manually and calls a passed-in server function
- Error stored in component-local `useState<string | null>`

**Why this matters:** Validation architecture must handle both patterns. Pattern A forms can use `useActionState` result to surface field errors (returning a `fieldErrors` map). Pattern B forms already use controlled React state, making them the natural fit for React Hook Form client-side validation.

**How to apply:** Do not propose a single uniform pattern without acknowledging Pattern A and Pattern B. Field-level errors are achievable in Pattern A by extending the ActionState type to include `fieldErrors: Record<string, string>`.
