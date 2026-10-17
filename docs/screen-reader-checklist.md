# Screen reader checklist

What a screen reader user gets from LendSwift, how it was checked automatically,
and the manual pass that still needs a person with a real screen reader.

**Status (17 Oct 2026):** automated accessibility-tree audit passes on every page;
the manual pass below has **not been run yet**.

## 1. Automated accessibility-tree audit

`scripts/accessibility-tree-audit.mjs` opens the production build in Chrome and
reads the accessibility tree, which is what NVDA and JAWS (through Chrome) and
TalkBack read. Steps 2–8 are opened from a seeded draft, the way `cy.resumeAt`
does in Cypress. For every page it checks:

- exactly one `main`, a `banner`, one level-1 heading and no skipped heading levels
- every control (button, link, field, radio, checkbox, slider, option) and image has a name
- every field marked invalid has a description, which is its error message
- every wizard page has a polite live region for step, save and upload announcements

Results on 17 Oct 2026 (1280×900, Chrome 155):

| Page | Landmarks | Headings | Controls | Required | Invalid | Live regions | Problems |
|---|---|---|---|---|---|---|---|
| Landing page | 13 | 25 | 24 | 0 | 0 | 2 | none |
| Demo launcher (dialog) | 0 | 1 | 7 | 0 | 0 | 2 | none |
| Step 1 · Choose your loan | 7 | 3 | 16 | 0 | 0 | 5 | none |
| Step 1 · after Continue with nothing filled | 7 | 3 | 16 | 0 | 3 | 5 | none |
| Step 2 · About you | 10 | 6 | 32 | 5 | 0 | 14 | none |
| Step 3 · Verify your identity | 10 | 6 | 20 | 2 | 0 | 10 | none |
| Step 4 · Where you live | 11 | 7 | 64 | 4 | 0 | 15 | none |
| Step 5 · Work and income | 9 | 5 | 23 | 4 | 0 | 11 | none |
| Step 6 · Add a co-applicant | 9 | 5 | 26 | 3 | 0 | 11 | none |
| Step 7 · Documents and signature | 10 | 6 | 37 | 0 | 0 | 18 | none |
| Step 8 · Review and submit | 18 | 14 | 29 | 0 | 0 | 9 | none |

"Required" counts the fields the tree marks as required. Radio groups say
"(required)" in their group name instead, which is why Step 1 shows 0.

**Found and fixed while doing this:**

- On a fresh Step 1, the three loan-type radios were exposed as *invalid* before
  the person had done anything. The browser treats an unchosen required radio as
  invalid, and the app had not overridden that. Every radio group now sets
  `aria-invalid` from the app's own error state.
- Verifying by keyboard dropped focus to the top of the page. On Step 2 the
  one-time-code panel disappears once the code is accepted; on Steps 3 and 6 the
  Verify button is replaced by "Verifying…". Focus now stays on (or returns to)
  the field being verified. "Mobile number verified." and "Email address verified."
  are announced; PAN and Aadhaar already were.

Other automated checks:

- **axe** (WCAG 2.1 A/AA): no violations on the landing page, the demo launcher, all eight steps with and without errors, and the success dialog (`cypress/e2e/accessibility.cy.js`).
- **Lighthouse accessibility:** 100 on the landing page and every step, mobile and desktop (`scripts/lighthouse-accessibility.mjs`).
- **Keyboard:** Journey 13 (`cypress/e2e/keyboard-navigation.cy.js`) covers the skip link, completing Step 1 by keyboard, focus moving to the first invalid field, the dialog focus trap, focused fields never hidden under the sticky bars, and focus kept on a field while it is verified.

What the automated checks cannot tell: the speech itself, how verbose it is, the
timing and politeness of live announcements, and differences between screen
reader and browser pairs. That is what the manual pass is for.

## 2. Manual pass

Run it on at least **NVDA + Chrome** (or Firefox) on Windows and **VoiceOver +
Safari** on an iPhone. TalkBack + Chrome on Android is a useful third. Use the
production build or the deployed site and a **demo application** (landing page →
*Try demo application*), so no real data is typed.

Mark each row ✅, ❌ or with a note. "Expect" is the meaning to listen for. Exact
wording varies by screen reader.

### Landing page

| # | Do | Expect | NVDA | VoiceOver |
|---|---|---|---|---|
| 1 | Load the page, list headings (NVDA: Insert+F7; VO: rotor) | One H1, "Your next chapter starts with a smarter loan.", then section headings in order | | |
| 2 | List landmarks | Banner (with the Sections navigation), main, and content info (with Support and Legal navigation) | | |
| 3 | Tab from the top | "Skip to main content, link" comes first; Enter moves to the main content | | |
| 4 | Use the EMI calculator sliders with arrow keys | Each slider reads its label and a spoken value (e.g. "₹3,00,000"), not a raw number | | |
| 5 | Open *Try demo application* | "Dialog" with its title; focus stays inside; Escape closes it and returns to the button | | |

### Every step

| # | Do | Expect | NVDA | VoiceOver |
|---|---|---|---|---|
| 6 | Arrive on a step | Focus on the first field; the step is announced ("Step 2 of 8: About you") | | |
| 7 | Move to the progress bar | "Application progress: step X of Y, *title*, navigation"; each step button says completed, current step or not available yet | | |
| 8 | On a phone, find *All steps* | "All steps, button, collapsed", then "expanded" when opened | | |
| 9 | Tab through the fields | Each field: label, "required" (or "Optional" in the label), then its help text | | |
| 10 | Before pressing Continue | No field is announced as invalid | | |
| 11 | Press Continue with a required field empty | "Some answers need your attention…", focus moves to the first problem, which is read as invalid with its error message | | |
| 12 | Fix a field and leave it | The error message disappears; the field is no longer invalid | | |
| 13 | Wait after typing | The save status ("Saving…", "Saved just now") is announced politely and does not interrupt typing | | |

### Step-specific

| # | Step | Do | Expect | NVDA | VoiceOver |
|---|---|---|---|---|---|
| 14 | 1 | Choose a loan type with arrow keys | Group name "What would you like to borrow for? (required)"; each option reads its name, description and rate | | |
| 15 | 2 | *Verify mobile number*, enter the on-screen code, press Enter | The code field is labelled and reads the on-screen hint; once accepted, focus is back on the mobile number and "Mobile number verified." is announced | | |
| 16 | 3 | Press *Verify* on PAN, then Aadhaar | Focus stays on the number; "Verifying PAN…" then "PAN verified." (or "could not be verified") | | |
| 17 | 3 | Show/hide a masked number | The toggle reports pressed / not pressed; the masked value never reads in full while hidden | | |
| 18 | 4 | Type a PIN code | City and state fill in and "City and state filled in from PIN code …" is announced | | |
| 19 | 5 | Switch employment type | The new fields that appear are reachable in order; nothing focusable is left hidden | | |
| 20 | 7 | Upload a file | "*name* uploaded… Checking the document…", then "documents checked"; a too-large or wrong file reads its reason | | |
| 21 | 7 | Remove a file | The button reads "Remove *file name*"; "*name* removed." is announced | | |
| 22 | 7 | Signature: switch Draw / Type | The two buttons report pressed state; the typed-signature field is labelled | | |
| 23 | 8 | Review the summary | Each section has a heading and an "Edit *section*" button; sensitive values stay masked until *Show sensitive details* | | |
| 24 | 8 | Tick the consents, submit | Each consent checkbox reads its full text; the success dialog is announced with its reference number | | |

### Interruptions

| # | Do | Expect | NVDA | VoiceOver |
|---|---|---|---|---|
| 25 | Open the application in a second tab | "This application is open in another tab" is announced in the first tab | | |
| 26 | Go offline (devtools or airplane mode) | "You're offline" status is announced | | |
| 27 | Leave the page idle until the session timeout | "Your session timed out" dialog; focus moves into it | | |

## 3. Re-running the automated audit

```sh
npm run build && npx vite preview --port 4173      # terminal 1
npx vite --port 5173                                # terminal 2
npm install --no-save puppeteer-core
node scripts/accessibility-tree-audit.mjs [report-folder]
```

It prints the table above, writes each page's tree as an indented text outline to
the report folder, and exits with code 1 if any page has a problem.
