# Environment Variables — Tonir

## Rules
- Never commit actual values to git
- `.env` and `.env.local` are gitignored
- Use Vercel dashboard for tonir-admin production vars
- Use EAS Secrets for tonir mobile production vars

---

## tonir-admin (Next.js) — .env.local

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Only in server-side code / API routes (never expose to client)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_CUSTOMER_APP_URL=http://localhost:8081

# Shared secret for /api/reservations/notify — must match what the mobile app sends
NOTIFY_SECRET=generate-a-random-secret-here

# Web push (VAPID) keys — generate with: npx web-push generate-vapid-keys
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
```

---

## tonir (Expo) — .env

```env
# Supabase (EXPO_PUBLIC_ prefix = safe to expose in mobile app)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## Supabase Edge Functions — secrets

Set via Supabase dashboard or CLI:
```bash
npx supabase secrets set RESEND_API_KEY=re_xxxx
npx supabase secrets set APP_URL=https://tonir.app
npx supabase secrets set ADMIN_URL=https://admin.tonir.app
```

Variables used in Edge Functions:
```
RESEND_API_KEY          — transactional email
RESEND_FROM_EMAIL       — e.g. reservations@tonir.app
APP_URL                 — customer app URL (for email links)
ADMIN_URL               — admin panel URL
SUPABASE_URL            — auto-provided by Supabase
SUPABASE_SERVICE_ROLE_KEY — auto-provided by Supabase
```

---

## Required vs Optional

| Variable | Where | Required | Notes |
|----------|-------|----------|-------|
| NEXT_PUBLIC_SUPABASE_URL | tonir-admin | Yes | From Supabase dashboard |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | tonir-admin | Yes | Public, safe to expose |
| SUPABASE_SERVICE_ROLE_KEY | tonir-admin (server only) | Yes | Never expose to client |
| NOTIFY_SECRET | tonir-admin (server only) | Yes | Long random string; mobile app must send in X-Notify-Secret header |
| NEXT_PUBLIC_VAPID_PUBLIC_KEY | tonir-admin | Yes | VAPID public key for web push; generate with npx web-push generate-vapid-keys |
| VAPID_PRIVATE_KEY | tonir-admin (server only) | Yes | VAPID private key; never expose to client |
| EXPO_PUBLIC_SUPABASE_URL | tonir | Yes | Same project URL |
| EXPO_PUBLIC_SUPABASE_ANON_KEY | tonir | Yes | Same anon key |
| RESEND_API_KEY | Edge Functions | Yes | Emails won't send without it |

---

## Local Setup Steps

### tonir-admin
```bash
cd tonir-admin
cp .env.example .env.local
# Fill in Supabase URL and keys from Supabase dashboard
npm install
npm run dev
```

### tonir
```bash
cd tonir
cp .env.example .env
# Fill in Supabase URL and keys
npm install
npx expo start
```

### Get Supabase keys
1. Go to supabase.com → your project
2. Settings → API
3. Copy: Project URL, anon key, service_role key

---

## EAS (Expo) Secrets for Production
```bash
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://..."
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "..."
```
