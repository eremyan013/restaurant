# Infrastructure Overview — Tonir

## Architecture

```
┌─────────────────────────────────────────────┐
│                GitHub Repo                  │
│              (RESTAURANT/)                  │
└──────┬──────────────┬────────────────┬──────┘
       │              │                │
  push/PR         push/PR          push/PR
       │              │                │
┌──────▼──────┐ ┌─────▼──────┐ ┌──────▼──────┐
│  GitHub     │ │  GitHub    │ │  EAS Build  │
│  Actions    │ │  Actions   │ │  (Expo)     │
│(tonir-admin)│ │  (shared)  │ │  (tonir)    │
└──────┬──────┘ └────────────┘ └──────┬──────┘
       │                              │
┌──────▼──────┐                ┌──────▼──────┐
│   Vercel    │                │  Expo Go /  │
│ (Admin Panel│                │  App Store  │
│  Next.js)   │                │  Play Store │
└──────┬──────┘                └──────┬──────┘
       │                              │
       └──────────────┬───────────────┘
                      │
              ┌───────▼────────┐
              │   Supabase     │
              │                │
              │ • PostgreSQL   │
              │ • Auth         │
              │ • Edge Funcs   │
              │ • Storage      │
              │ • Realtime     │
              └────────────────┘
```

## Services

| Service | Purpose | URL |
|---------|---------|-----|
| Supabase | Database, Auth, API, Storage | supabase.com |
| Vercel | Admin panel hosting (Next.js) | vercel.com |
| Expo EAS | Mobile app builds + OTA updates | expo.dev |
| Resend | Transactional email | resend.com |
| GitHub Actions | CI/CD | github.com |

## Environments

| Environment | Admin Panel | Mobile App | Supabase Project |
|-------------|-------------|------------|-----------------|
| Development | localhost:3000 | Expo Go | tonir-dev |
| Staging | staging-admin.tonir.app | Internal build | tonir-staging |
| Production | admin.tonir.app | App Store build | tonir-prod |

## Supabase Projects
- Use **separate projects** for staging and production
- Never point staging app at production database
- Mirror schema changes staging → production via migrations

## Deployment Flow

### Admin Panel (tonir-admin)
- Push to `main` → GitHub Actions → Vercel auto-deploys
- Preview deployments on every PR (Vercel)

### Mobile App (tonir)
- Development: Expo Go with `npx expo start`
- Staging: `eas build --profile preview`
- Production: `eas build --profile production` → submit to stores
- OTA updates: `eas update` (JS-only changes, no native rebuild)

### Supabase (backend)
- Schema changes via SQL migration files
- Apply migrations: `npx supabase db push`
- Edge Functions: `npx supabase functions deploy function-name`

## CI/CD (GitHub Actions)

### On PR (both apps)
```
lint → typecheck → unit tests → build check
```

### On merge to main (tonir-admin)
```
lint → typecheck → tests → Vercel production deploy
```

### On merge to main (tonir)
```
lint → typecheck → tests → EAS update (OTA)
```

## Monitoring
- Supabase dashboard: query performance, error logs, auth events
- Vercel analytics: admin panel performance
- Expo dashboard: crash reports, update delivery
- Add Sentry in v2 for both apps

## Backup
- Supabase: daily automated backups (paid plan)
- Before any migration: `npx supabase db dump > backup_$(date +%Y%m%d).sql`
