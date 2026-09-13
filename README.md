# Mimo — Landing Page + Onboarding Flow

A static, framework-free build: plain HTML, CSS and vanilla JS. No build step —
just open `index.html` in a browser, or upload the folder to any static host
(Netlify, Vercel, GitHub Pages, S3, etc).

## Files

```
index.html          Landing page (hero, features, how it works, CTA, footer)
onboarding.html      The "Join Mimo" flow — 8 steps + a launch countdown screen
css/style.css        All styling — palette, type, components, responsive rules
js/onboarding.js     Step navigation, branching logic, Supabase auth + storage
assets/              Logo (mimo-mark.png, mimo-lockup-full.png) and favicons
```

## Supabase — now connected

`js/onboarding.js` has the real Mimo Supabase project wired in:

- **Step 2 ("Create account")** calls real Supabase Auth (`supabase.auth.signUp`).
  A matching `profiles` row is created automatically (via a database trigger)
  for every signup. Errors (weak password, duplicate email, etc.) show inline.
- **The "Finish" button** inserts the full set of collected answers into a
  `responses` table, tagged `source: "site"`.
- Row Level Security is on: anyone can submit a response (that's the point of
  a public form), but nobody can read someone else's response through the
  public API — only via the Supabase dashboard.

## Formasty → Supabase sync

Formasty's webhook now points at a deployed Supabase Edge Function
(`formasty-webhook`), which verifies the request came from Formasty and
inserts each submission into the same `responses` table, tagged
`source: "formasty"`. Both forms' answers are queryable side by side now —
e.g. in the Supabase SQL editor:

```sql
select source, count(*) from responses group by source;
```

**One caveat worth knowing:** Formasty doesn't publicly document the exact
header/format it uses to sign webhook payloads, so the function verifies
against the most common industry convention (HMAC-SHA256 in an
`X-Formasty-Signature: sha256=<hex>` header). If Formasty actually uses a
different header name or format, real deliveries will get rejected with a
401 — check Formasty's webhook delivery logs after a real test submission.
If that happens, it's a one-line fix in the edge function (it lives on
Supabase, not in this static site zip — ask me and I'll patch it).

## The onboarding questions

Steps 3–8 reuse the actual Mimo pet-owner validation survey questions (the
same ones in the Formasty version), so responses are structurally comparable:

1. Welcome
2. Create account (real Supabase Auth)
3. Have you ever owned a pet? *(yes / planning to / no)*
4. Tell us about your pet — state, city, pet type, how long you've owned one
5. Current habits — emergency frequency, how you find products, used an app before
6. Emergency experience — faced one before? what happened, how long, after hours?
7. Value & pricing — trusted vet, would-use, would-buy-with-delivery, pricing, trust feature
8. One last question — join the community (+ phone number if yes), anything else

**Branching**, mirroring the Formasty logic:
- **"No"** to "have you ever owned a pet?" skips straight to the final screen.
- **"Planning to"** skips the pet-specific and emergency-history questions but
  still asks about trusted vets, the value proposition, and pricing.
- The emergency follow-up questions only appear if they say they've faced one.
- The phone number field only appears if they opt into the community.

## The final screen

Finishing the flow now lands on a launch-countdown screen (logo, a live
days/hours/minutes/seconds countdown to `CONFIG.LAUNCH_DATE_ISO`, and a share
button) instead of a plain "you're all set" message. Update `LAUNCH_DATE_ISO`
to the real target date whenever it's confirmed.

## Logo & favicons

`assets/mimo-mark.png` (icon only, transparent background) and
`assets/mimo-lockup-full.png` (icon + wordmark + tagline) were extracted from
the logo you shared, with the background removed. Favicons in a few sizes are
also in `assets/`. If you get a vector (SVG/AI) version of the logo later,
swap these out for crisper scaling at large sizes.

## Photos on the landing page

The dog/hand-petting photos on `index.html` are pulled live from a free
placeholder photo service (`placedog.net`), so an internet connection is
needed to see them and the exact photos will vary on reload. Swap these for
real photography before shipping this for real.

## Design notes

Palette, type, and layout are modeled on the reference mockup: warm cream
background, deep forest green for the brand/CTA color, a soft terracotta
accent, and rounded, friendly shapes throughout (Fraunces for display type,
Inter for UI/body text — both loaded from Google Fonts via CDN).

Responsive down to small mobile widths, with visible keyboard focus states
and smoother panel transitions than the first draft.

