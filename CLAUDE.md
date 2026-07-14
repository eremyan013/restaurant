# Tonir Restaurant Reservation System

## What We're Building
A restaurant reservation platform with:
- **tonir/** — React Native + Expo customer mobile app
- **tonir-admin/** — Next.js admin panel for staff
- **Supabase** — database, auth, storage, edge functions (no custom backend server)

## Key Files — Read These First
- `project-overview.md` — full feature list, business rules, user roles
- `tech-stack.md` — approved stack and libraries
- `db-schema.md` — full PostgreSQL schema with RLS policies
- `api-conventions.md` — how to use Supabase client and Edge Functions
- `business-rules.md` — reservation logic, availability rules, auth rules
- `security-checklist.md` — security requirements before any deploy
- `test-strategy.md` — testing stack, coverage targets, critical edge cases
- `infra-overview.md` — architecture, environments, services
- `deploy-runbook.md` — how to deploy each part of the system
- `envs.md` — environment variables for all apps
- `adr-template.md` — architecture decision record format

## Rules — Always Follow These
- Never bypass Supabase RLS — all security is enforced at the database level
- Never use `service_role` key in client code (tonir or tonir-admin)
- Never write raw SQL with user input — use Supabase query builder or Edge Functions
- Complex business logic (availability check, booking flow) goes in Edge Functions
- Always validate inputs with Zod before any Supabase operation
- Run migrations on staging before production
- Never commit `.env` or `.env.local` files

## Architecture Decisions
See `adr-template.md` for all decisions and their rationale.
Key decisions: Supabase as backend, Expo Router, NativeWind, separate staging/prod projects.

## Folder Structure
```
RESTAURANT/
├── tonir/              customer mobile app (Expo)
├── tonir-admin/        admin panel (Next.js)
├── project-overview.md
├── tech-stack.md
├── db-schema.md
├── api-conventions.md
├── business-rules.md
├── security-checklist.md
├── test-strategy.md
├── infra-overview.md
├── deploy-runbook.md
├── envs.md
├── adr-template.md
└── CLAUDE.md
```

## Current Status
- [ ] Database schema created in Supabase
- [ ] RLS policies applied
- [ ] Edge Functions scaffolded
- [ ] tonir app scaffolded
- [ ] tonir-admin scaffolded
- [ ] CI/CD configured

Update this checklist as you complete each step.
