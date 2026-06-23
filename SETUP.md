# Setup Guide

This walks through provisioning everything the app needs: Airtable (data),
Supabase + Google OAuth (auth), and the `@penda.co.ke` domain restriction.
Make.com automation and the public JWT-token form routes are **not** covered
here yet — they're a later phase.

By the end you'll have a filled-in `.env.local` and a working Google sign-in
restricted to Penda Health staff.

---

## 1. Airtable

### 1.1 Create the base

1. Go to [airtable.com](https://airtable.com) and sign in (or create an account).
2. Click **+ Create a base** → **Start from scratch**.
3. Name it something like `Penda Hiring System`.
4. Delete the default "Table 1" that Airtable creates for you — the schema
   script will create all 11 tables itself. (If you'd rather keep it, that's
   fine too; the script only ever adds, it never deletes.)
5. Open the base, then go to **Help → API documentation** (or visit
   `airtable.com/api`) to find your **Base ID** — it starts with `app` and
   looks like `appXXXXXXXXXXXXXX`. Copy it into `AIRTABLE_BASE_ID` in
   `.env.local`.

### 1.2 Create a personal access token

1. Go to [airtable.com/create/tokens](https://airtable.com/create/tokens).
2. Click **Create new token**.
3. Name it `penda-hiring-system`.
4. Under **Scopes**, add:
   - `data.records:read`
   - `data.records:write`
   - `schema.bases:read`
   - `schema.bases:write`
5. Under **Access**, add the base you created in 1.1.
6. Click **Create token**, copy the value (starts with `pat`), and paste it
   into `AIRTABLE_API_KEY` in `.env.local`. You will not be able to see it
   again after closing this screen.

### 1.3 Build the schema and seed data

```bash
npm install
cp .env.local.example .env.local   # then fill in AIRTABLE_API_KEY / AIRTABLE_BASE_ID
npm run airtable:schema   # creates all 11 tables + fields
npm run airtable:seed     # populates them with the same mock data the app ships with
```

`airtable:schema` is safe to re-run — it skips tables that already exist and
only adds fields that are missing, so you can re-run it after pulling schema
changes. `airtable:seed` is **not** idempotent — running it twice will create
duplicate rows, since Airtable record IDs are generated fresh each run.

---

## 2. Google Cloud Console — OAuth client

You need a Google OAuth client so Supabase can run "Sign in with Google."

1. Go to [console.cloud.google.com](https://console.cloud.google.com).
2. Top-left project dropdown → **New Project**. Name it `Penda Hiring System`,
   click **Create**, then make sure it's selected in the project dropdown.
3. In the left sidebar: **APIs & Services → OAuth consent screen**.
   - User Type: **Internal** if your Google Workspace is `penda.co.ke` and
     you want only Workspace accounts to even see the consent screen
     (recommended — this is a second layer of restriction on top of the
     server-side domain check). Otherwise choose **External** and rely on
     the server-side check described in Section 4.
   - App name: `Penda Hiring System`.
   - User support email: your email.
   - Developer contact: your email.
   - Click **Save and Continue** through Scopes and Test users (no changes
     needed) until you reach the summary, then **Back to Dashboard**.
4. Left sidebar: **APIs & Services → Credentials**.
5. Click **+ Create Credentials → OAuth client ID**.
   - Application type: **Web application**.
   - Name: `Penda Hiring System — Supabase`.
   - **Authorized redirect URIs** — add exactly one URL, the Supabase auth
     callback for your project:
     ```
     https://<your-project-ref>.supabase.co/auth/v1/callback
     ```
     (You'll get `<your-project-ref>` in Section 3.1 — come back and add
     this URI once you have it if you're doing these steps in order.)
6. Click **Create**. A modal shows your **Client ID** and **Client Secret**.
   Copy both into `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET`
   in `.env.local` (these are also pasted directly into Supabase in step
   3.3, not read by the Next.js app itself).

---

## 3. Supabase

### 3.1 Create the project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and sign in.
2. Click **New project**.
3. Pick an organization, name it `penda-hiring-system`, set a database
   password (save it somewhere — you won't need it for this app, but keep it
   for emergencies), pick a region close to Kenya (e.g. `eu-west-1` /
   London), and click **Create new project**. Wait ~2 minutes for
   provisioning.
4. Once it's ready, go to **Project Settings → API**.
   - Copy **Project URL** into `NEXT_PUBLIC_SUPABASE_URL`.
   - Copy **anon public** key into `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - Copy **service_role** key into `SUPABASE_SERVICE_ROLE_KEY` (keep this
     secret — it bypasses row-level security and must never reach the
     browser).
5. Note your **project ref** (the subdomain in the Project URL, e.g. if the
   URL is `https://abcdefghij.supabase.co` the ref is `abcdefghij`). Go back
   to Google Cloud Console (Section 2, step 5) and make sure the redirect URI
   `https://abcdefghij.supabase.co/auth/v1/callback` is saved on the OAuth
   client.

### 3.2 Enable Google as an auth provider

1. In the Supabase dashboard: **Authentication → Providers**.
2. Find **Google** in the list and toggle it on.
3. Paste in the **Client ID** and **Client Secret** from Section 2, step 6.
4. Click **Save**.

### 3.3 Set the site URL and redirect URLs

1. **Authentication → URL Configuration**.
2. **Site URL**: `http://localhost:3000` for local dev (change to your
   production domain once deployed).
3. **Redirect URLs**: add `http://localhost:3000/**` (and your production
   domain's `/**` once deployed) so Supabase allows redirecting back into
   the app after sign-in.

---

## 4. Domain restriction (`@penda.co.ke` / `@pendahealth.com` only) — server-side

This is enforced with a Supabase **Auth Hook**, not client-side JavaScript,
so it can't be bypassed by someone editing the page or calling the API
directly.

1. In the Supabase dashboard: **Database → Functions** (or **SQL Editor** if
   you prefer running raw SQL).
2. Create a Postgres function that rejects sign-ins from outside the
   `penda.co.ke` / `pendahealth.com` domains. In the SQL Editor, run:

   ```sql
   create or replace function public.restrict_to_penda_domain(event jsonb)
   returns jsonb
   language plpgsql
   as $$
   declare
     user_email text := event->'claims'->>'email';
   begin
     if user_email is null
       or (user_email not ilike '%@penda.co.ke' and user_email not ilike '%@pendahealth.com') then
       raise exception 'Access restricted to Penda Health staff. Use your @penda.co.ke or @pendahealth.com Google account.';
     end if;
     return event;
   end;
   $$;

   -- Required: Supabase's auth service invokes hook functions as
   -- supabase_auth_admin, not as your own role. Without this grant the hook
   -- invocation itself fails (closed) and blocks every sign-in, even ones
   -- that should pass the domain check.
   grant execute
     on function public.restrict_to_penda_domain
     to supabase_auth_admin;

   revoke execute
     on function public.restrict_to_penda_domain
     from authenticated, anon, public;
   ```

3. Go to **Authentication → Hooks**.
4. Under **Custom Access Token**, select the
   `restrict_to_penda_domain` function and enable the hook.
5. Save.

With this enabled, an account outside `@penda.co.ke` / `@pendahealth.com`
that completes the OAuth handshake will have its session rejected at the
token-issuance step — before any app code runs. The app's client-side
sign-in flow should still catch the resulting auth error and show:

> "Access restricted to Penda Health staff. Use your @penda.co.ke or
> @pendahealth.com Google account."

then immediately call `supabase.auth.signOut()` to clear any partial
session, matching the behavior described in the app's auth requirements.

### 4.1 Default role on first sign-in

New users should default to the `recruiter` role; an admin changes it later
from Settings. This is handled by a `handle_new_user` trigger on
`auth.users` that inserts a row into a `profiles` table with
`role = 'recruiter'`. Wire this up when the `profiles` table and Settings
page are built — not required to get sign-in itself working.

---

## 4.5 Public forms (work-trial branch selection, BM feedback)

Two no-login forms exist so far, both token-protected instead of behind
Supabase auth (see `src/middleware.ts`, which exempts them):

- `/work-trial?token=...` — candidate picks a branch + date once they reach
  the Work Trial stage.
- `/bm-feedback?token=...` — the branch manager confirms arrival and, if the
  candidate showed up, submits the work-trial score.

Both forms read/write the same `Work Trials` Airtable table the rest of the
app uses — there's no separate database for forms.

### 4.5.1 Environment variables

Add to `.env.local` (and to Vercel's Production env vars):

```
PUBLIC_FORM_JWT_SECRET=   # already set — openssl rand -base64 48
FORMS_ISSUE_SECRET=       # already set — openssl rand -base64 48
NEXT_PUBLIC_APP_URL=      # your deployed URL, e.g. https://ph-hiring-system.vercel.app
```

`FORMS_ISSUE_SECRET` is the bearer token Airtable's automation uses to call
`/api/forms/issue-link` and get back a signed link — it never sees
`PUBLIC_FORM_JWT_SECRET` directly.

### 4.5.2 Wire the "send work-trial link" automation in Airtable

1. In the Airtable base, go to **Automations → Create automation**.
2. Trigger: **When a record matches conditions**, table `Candidates`,
   condition `Stage = Work Trial`.
3. Action 1: **Run a script** —
   ```javascript
   let candidate = input.config(); // pass Candidate record via input variables
   let workTrial = /* the linked Work Trials record for this candidate —
     create it first if your process doesn't already create one when a
     candidate reaches Work Trial stage */;

   let response = await fetch("https://YOUR_APP_URL/api/forms/issue-link", {
     method: "POST",
     headers: {
       "Content-Type": "application/json",
       "Authorization": "Bearer YOUR_FORMS_ISSUE_SECRET",
     },
     body: JSON.stringify({ type: "work-trial", workTrialId: workTrial.id }),
   });
   let { url } = await response.json();
   output.set("link", url);
   ```
4. Action 2: **Send email** (Airtable's native email action) to the
   candidate's email field, with a body like:

   > Hi {{Name}}, you've moved forward to the work trial stage for the
   > {{Role}} role at Penda Health! Please select your preferred branch and
   > date here: {{link}}

5. Repeat the same pattern for the branch-manager feedback link, triggered
   off the work trial's date (e.g. "the morning of Trial Date") with
   `type: "bm-feedback"` and the BM's email instead.

To test without waiting on a real automation run, mint a link manually:

```
node scripts/generate-form-link.js --type work-trial --work-trial-id recXXXXXXXXXXXXXX
```

### What's deferred

Per the original forms spec, these are intentionally not built yet:
referee reference-check form, IPS gap form, SO requisition form, actual
Gmail/SMS sending (Airtable's native "Send email" action covers this for
now), and a `/forms/test` dev harness.

---

## 5. Make.com

Deferred for now. Once the Airtable base and Supabase auth are confirmed
working end-to-end, come back here for the 16 scenario blueprints and import
instructions (`scripts/make-blueprints/`).

---

## 6. Africa's Talking (SMS)

Deferred along with Make.com, since the only consumer of Africa's Talking in
this system is the SMS-sending automations. When you're ready:

1. Register at [africastalking.com](https://africastalking.com).
2. Create an app in the dashboard to get a **username** and **API key**.
3. For production SMS (not the free sandbox), apply for a sender ID/shortcode
   under **SMS → Settings** — this requires business verification and can
   take a few days, so start it early if you know you'll need it.
4. Put the username and API key into `AFRICAS_TALKING_USERNAME` and
   `AFRICAS_TALKING_API_KEY` in `.env.local` when you get there.

---

## Quick reference: what's done vs. pending

| Piece | Status |
|---|---|
| Airtable schema + seed scripts | ✅ `npm run airtable:schema` / `npm run airtable:seed` |
| Supabase project + Google OAuth wiring | ✅ this guide |
| `@penda.co.ke` domain restriction (server-side) | ✅ this guide |
| Default `recruiter` role on first login | ⏳ needs `profiles` table + trigger |
| Public JWT form routes (`/work-trial`, `/bm-feedback`) | ✅ this guide — referee/IPS/SO forms still pending |
| Make.com scenario blueprints | ⏳ next phase |
| Africa's Talking SMS | ⏳ next phase |
