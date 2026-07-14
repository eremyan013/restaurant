# Deploy Runbook — Tonir

## Pre-Deploy Checklist
- [ ] All tests passing on CI
- [ ] Security checklist reviewed
- [ ] Database migrations tested on staging first
- [ ] Edge Functions tested on staging
- [ ] Env vars set for target environment
- [ ] Rollback plan ready

---

## Deploy Admin Panel (tonir-admin → Vercel)

### Auto-deploy (normal flow)
Push to `main` → Vercel auto-deploys. No manual steps needed.

### Manual deploy
```bash
cd tonir-admin
npx vercel --prod
```

### Verify
1. Open admin.tonir.app → login works
2. Reservations list loads
3. Check Vercel deployment logs for errors

---

## Deploy Mobile App (tonir → Expo EAS)

### OTA update (JS changes only — fastest)
```bash
cd tonir
eas update --branch production --message "describe change"
```
Users get update automatically within 24h or on next app open.

### Full build (native changes, new packages)
```bash
# Build
eas build --platform all --profile production

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

### Staging/preview build
```bash
eas build --platform all --profile preview
# Share link with testers via Expo dashboard
```

---

## Deploy Supabase Changes

### Database migration
```bash
# Create new migration
npx supabase migration new migration_name

# Apply to staging first
npx supabase db push --db-url $STAGING_DATABASE_URL

# Verify staging works, then apply to production
npx supabase db push --db-url $PRODUCTION_DATABASE_URL
```

### Edge Functions
```bash
# Deploy single function
npx supabase functions deploy check-availability

# Deploy all functions
npx supabase functions deploy
```

### Before any migration — backup
```bash
npx supabase db dump --db-url $PRODUCTION_DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

---

## Rollback Procedures

### Admin panel rollback (Vercel)
1. Go to Vercel dashboard → tonir-admin
2. Deployments tab → find last working deployment
3. Click ··· → Promote to Production
4. Verify admin panel works

### Mobile app rollback (EAS)
```bash
# Roll back OTA update
eas update --branch production --message "rollback" # point to previous update
```
For store builds: submit previous build via App Store Connect / Google Play Console.

### Database rollback
```bash
# Restore from backup
psql $PRODUCTION_DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql
```
Note: coordinate with app rollback — schema and app version must match.

---

## Smoke Tests After Deploy

### Admin panel
```
1. Login with staff account → dashboard loads
2. View today's reservations
3. Create a test reservation manually
4. Cancel the test reservation
```

### Mobile app
```
1. Open app → restaurant info loads
2. Select a date → time slots appear
3. Fill booking form → reservation created
4. Check confirmation email received
```

### Supabase
```
1. Supabase dashboard → check no migration errors
2. Edge Functions → check no cold start errors
3. Auth → check login still works
```

---

## Common Issues

### Vercel build fails: TypeScript error
Run locally first: `npm run build` in tonir-admin. Fix errors before pushing.

### EAS build fails: missing native module
Run `npx expo install` to sync native dependencies, then rebuild.

### Supabase migration fails: column already exists
Check if migration was partially applied. Use `IF NOT EXISTS` in migrations.

### Edge Function not updating
```bash
npx supabase functions deploy function-name --no-verify-jwt
```
Wait 30 seconds for propagation.

### RLS blocking valid queries
Check Supabase dashboard → Table Editor → RLS policies.
Test policies using the SQL editor with `set role authenticated`.
