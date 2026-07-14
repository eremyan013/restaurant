---
name: project-home-sections
description: Home Sections management feature — DB schema, admin UI, mobile hook design decisions
metadata:
  type: project
---

Architecture designed for Home Sections feature (2026-06-17).

Key decisions made:
- `section_type` discriminator column on `home_sections` used instead of separate guide/venue tables — single PostgREST embed path
- Junction table `home_section_items` with `item_type` enum ('venue' | 'guide') and nullable `venue_id` / `guide_id` FKs — avoids polymorphic FK problem
- @dnd-kit/core + @dnd-kit/sortable approved for tonir-admin drag-and-drop
- Mobile hook `useHomeSections` replaces both `useVenues` and `useGuides` on HomeScreen — `useVenues` kept for SearchScreen/DetailScreen/MapScreen
- Admin mutations via Server Actions with `createSupabaseAdminClient()` (service_role), never browser client
- Seed data for 4 built-in sections uses DO $$ block to be idempotent

**Why:** Admin requested full control over Home screen layout; hardcoded filters were blocking business operations.
**How to apply:** When implementing, use `createSupabaseAdminClient()` for all home_sections mutations server-side. Never allow client-side writes.
