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

Superseded by section 4.6 below — the `profiles` table and its
`handle_new_user` trigger are now built; new sign-ins default to the
`contributor` role (the least-privileged of the four) and a
`recruitment_manager` promotes them from Settings > Users.

---

## 4.6 User roles, permissions, and profiles

The app has four permission tiers (`role` on the `profiles` table), distinct
from `job_title` (free text — what someone's actual title is, has no bearing
on access):

| Role | Who | Access |
|---|---|---|
| `recruitment_manager` | Mash — super admin | Everything: change roles, delete records, see all financials, manage Settings |
| `recruitment_user` | Samwel + future recruiters | Full pipeline management incl. offers; can archive, not delete; no role/Settings access |
| `contributor` | Hiring Managers, HRBPs, RMs, Director P&C | Read-only + form submission (IPS Gap, SO Requisition) + comments + reports; salary/offer values masked as "Confidential" everywhere |
| `branch_manager` | Medical centre branch managers | Scoped to their own branch's work trials/open roles only; no financial visibility; primarily acts via emailed token links (see section 4.5), UI login optional |

This is the only place real **data** (not just auth) lives in Postgres —
everything else stays in Airtable, per the architecture in this guide's
intro. `branch_id` on `profiles` stores a raw Airtable Branch record ID
(`recXXXX...`) as plain text — there's no Postgres `branches` table to
foreign-key against, so validity is checked at the app level only.

Run this once in the Supabase SQL Editor (**Database → SQL Editor**):

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  job_title text,
  phone text,
  role text not null default 'contributor'
    check (role in ('recruitment_manager', 'recruitment_user', 'contributor', 'branch_manager')),
  branch_id text,
  dashboard_default text not null default 'dashboard',
  email_notifications text not null default 'all'
    check (email_notifications in ('all', 'urgent', 'none')),
  avatar_initials text generated always as (
    upper(
      substring(coalesce(display_name, email) from 1 for 1) ||
      coalesce(substring(split_part(coalesce(display_name, ''), ' ', 2) from 1 for 1), '')
    )
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Avoids infinite recursion in RLS policies that need to check "is this
-- user a manager" against the same table they're applied to.
create or replace function public.is_recruitment_manager()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'recruitment_manager');
$$;

create policy profiles_select_own_or_manager
  on public.profiles for select
  using (auth.uid() = id or public.is_recruitment_manager());

create policy profiles_update_own_or_manager
  on public.profiles for update
  using (auth.uid() = id or public.is_recruitment_manager())
  with check (auth.uid() = id or public.is_recruitment_manager());

-- Field-level guard: only a recruitment_manager may change someone's role
-- or branch assignment, even though the row-level policy above lets people
-- update their own row (for display_name, job_title, phone, etc).
create or replace function public.guard_profile_role_branch_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role is distinct from old.role or new.branch_id is distinct from old.branch_id)
    and not public.is_recruitment_manager() then
    raise exception 'Only a Recruitment Manager can change role or branch assignment.';
  end if;
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_guard_role_branch_change
  before update on public.profiles
  for each row execute function public.guard_profile_role_branch_change();

-- Auto-create a profile row on first sign-in, defaulting to the
-- least-privileged role. A recruitment_manager promotes people afterward
-- from Settings > Users.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email),
    'contributor'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

After running this, promote your own account to `recruitment_manager` once
(no UI for the very first manager, since Settings > Users requires being a
manager already):

```sql
update public.profiles set role = 'recruitment_manager' where email = 'your-email@penda.co.ke';
```

### What this gives you

- **`/profile`** — every signed-in user can view/edit their display name,
  job title, phone, default dashboard view, and email notification
  preference, plus a "Pending tasks" list (overdue work-trial scores, offers
  past deadline, referee chases >48h with no response, unconfirmed
  interviews) scoped to them via a case-insensitive name/email match against
  Airtable's free-text assignee fields (`WorkTrials.SUPERVISOR`,
  `Interviews.INTERVIEWERS`, `OpenRoles.RECRUITER`) — there's no foreign key
  from Airtable to a Supabase user, so this is a heuristic, not an exact
  join.
- **`/settings`** — recruitment_manager-only (enforced both in
  `src/middleware.ts` via `ROLE_ROUTES` and by the
  `profiles_guard_role_branch_change` trigger above). Lists every user with a
  role dropdown and, for `branch_manager`, a branch picker. Changing a role
  shows: "Changing this user's role will immediately affect what they can
  see and do in the system."
- **Salary masking** — `src/lib/permissions.ts`'s `maskSalary()` renders
  "Confidential" instead of real figures for `contributor` and
  `branch_manager`, applied in the offer cards and locum daily-rate
  displays.

---

## 4.5 Public forms (work-trial branch selection, BM feedback, referee check)

Three no-login forms exist so far, all token-protected instead of behind
Supabase auth (see `src/middleware.ts`, which exempts them):

- `/work-trial?token=...` — candidate picks a branch + date once they reach
  the Work Trial stage.
- `/bm-feedback?token=...` — the branch manager confirms arrival and, if the
  candidate showed up, submits the work-trial score.
- `/referee?token=...` — a referee submits their reference check, scoped to
  one candidate and one of the two referee slots (`refereeNum: 1 | 2`).

These forms read/write the existing `Work Trials` and `Reference Checks`
Airtable tables the rest of the app uses — there's no separate database for
forms.

The IPS Gap and SO Requisition forms (`/requisitions/new/ips`,
`/requisitions/new/so`) are login-required guided forms, not public/token
forms — they live under the normal `(dashboard)` route group and inherit the
existing Supabase auth gate, so they needed no middleware changes. They write
to the same `Requisitions` table as the existing quick-add dialog, via
`useRecruitmentData().createRequisition`.

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
6. For referee links, trigger off the Reference Check record being created,
   running the script twice (once per referee) with
   `{ "type": "referee", "refCheckId": "<recId>", "refereeNum": 1 }` (and `2`
   for the second referee), sending each to that referee's email.

To test without waiting on a real automation run, mint a link manually:

```
node scripts/generate-form-link.js --type work-trial --work-trial-id recXXXXXXXXXXXXXX
node scripts/generate-form-link.js --type referee --ref-check-id recXXXXXXXXXXXXXX --referee-num 1
```

### What's deferred

Per the original forms spec, these are intentionally not built yet: actual
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
| User roles, `/profile`, `/settings` (Users & roles) | ✅ section 4.6 |
| Public JWT form routes (`/work-trial`, `/bm-feedback`, `/referee`) | ✅ this guide |
| IPS Gap / SO Requisition guided forms (login required) | ✅ `/requisitions/new/ips`, `/requisitions/new/so` |
| Make.com scenario blueprints | ⏳ next phase |
| Africa's Talking SMS | ⏳ next phase |
