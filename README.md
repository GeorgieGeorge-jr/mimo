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

## Connecting Supabase (not wired up yet)

`js/onboarding.js` has a `CONFIG` object at the very top:

```js
var CONFIG = {
  SUPABASE_URL: "",       // e.g. "https://xxxxx.supabase.co"
  SUPABASE_ANON_KEY: "",  // the project's publishable/anon key
  LAUNCH_DATE_ISO: "2026-12-01T00:00:00Z" // the real launch date, once set
};
```

Fill in `SUPABASE_URL` and `SUPABASE_ANON_KEY` once the Mimo Supabase project
exists, and two things switch on automatically:

1. **Step 2 ("Create account")** calls real Supabase Auth (`supabase.auth.signUp`)
   instead of just moving to the next step. Errors (weak password, duplicate
   email, etc.) show inline.
2. **The "Finish" button** inserts the full set of collected answers into a
   `responses` table (as a JSON blob plus a `source: "site"` marker, so they
   can be told apart from Formasty submissions once that's synced too).

Until those two values are filled in, the flow still works end-to-end for
review purposes — it just logs what would have been sent to the browser
console instead of a database, with a warning explaining why.

**This part is currently blocked** on a decision about where the data lives —
your Supabase account is at its 2-free-project limit, so a dedicated "Mimo"
project couldn't be created yet. Once that's resolved, the table schema and
the exact `responses` insert shape can be finalized to match.

## Syncing Formasty responses into the same place

Formasty supports a webhook that fires on every submission. The plan (once
the Supabase project exists) is a small Edge Function that receives that
webhook and inserts into the same `responses` table with `source: "formasty"`
— so both forms' answers end up queryable side by side. Not built yet, same
blocker as above.

## The onboarding questions

Steps 3–8 reuse the actual Mimo pet-owner validation survey questions (the
same ones in the Formasty version), so responses are structurally comparable:

1. Welcome
2. Create account (real Supabase Auth, once configured)
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

