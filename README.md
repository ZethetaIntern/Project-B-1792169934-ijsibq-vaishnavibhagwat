# LendSwift — multi-step loan application

An eight-step digital loan application for **Personal, Home and Business loans**, built for
LendSwift, a fictional NBFC serving tier-2 and tier-3 India on patchy mobile networks. It
replaces a single-page form that lost 45% of applicants with a guided flow that validates
gently, saves as you go and works from 320 px phones up.

> **Live demo:** _add the Vercel or Netlify URL here after deploying (see [Deploy](#deploy))._
> LendSwift is fictional. Nothing you enter leaves your browser; verification is simulated
> and no credit decision is made.

![Landing page](docs/screenshots/00-landing-desktop.png)

## Contents

- [What it does](#what-it-does)
- [Quick start](#quick-start)
- [A five-minute tour for reviewers](#a-five-minute-tour-for-reviewers)
- [Architecture decisions](#architecture-decisions)
- [Testing](#testing)
- [Performance and accessibility](#performance-and-accessibility)
- [Screenshots](#screenshots)
- [Assumptions and known limitations](#assumptions-and-known-limitations)
- [Deploy](#deploy)

## What it does

| Step | Highlights |
| --- | --- |
| 1 · Loan | Product cards, Indian-formatted amount with slider, tenure trimmed by age (must end by 65), purpose per product, live EMI ledger |
| 2 · About you | Name as on PAN, age 21–65 with exact-birthday handling, simulated mobile OTP (code shown on screen), optional email OTP |
| 3 · Identity | PAN format + 4th-character entity check, Aadhaar Verhoeff checksum, 1.5 s simulated verification, explicit Aadhaar consent, passport field for Home Loans above ₹50 lakh |
| 4 · Address | PIN-code lookup (100+ PINs, all 28 states and 8 UTs) fills city and state, rent for tenants, previous address under one year, permanent address, optional proof of address |
| 5 · Income | Salaried / self-employed / business owner sub-forms (discriminated union), GSTIN checksum, switching asks before clearing the other branch, Business Loans refuse salaried |
| 6 · Co-applicant | Appears only when needed (Personal > ₹5 lakh, all Home, Business > ₹20 lakh), Spouse default when married, PAN verification, consent and signature |
| 7 · Documents | Requirements change with loan, employment and PAN status; drag-and-drop; type, content, size and count checks; photos compressed on the device; progress and retry; encrypted IndexedDB vault for crash recovery; e-signature (draw or type) |
| 8 · Review | Key Fact Statement with APR, editable section summaries with masked PAN/Aadhaar/income, four separate unticked consents, extra acknowledgement when EMI > 50% of income, cooling-off, grievance officer and RBI Ombudsman path, gated submit, UUID reference, PDF summary |

Across the flow: encrypted auto-save (AES-256-GCM, 72-hour expiry, tamper detection),
resume-or-start-fresh prompt, multi-tab warning, offline banner, 15-minute idle timeout,
browser Back support, and a **demo mode** with four synthetic scenarios that never skips a
check.

## Quick start

Requires Node.js 20.19 or newer.

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # unit and integration tests (Vitest)
npm run test:e2e     # builds, serves on :4173 and runs every Cypress journey
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run build` / `npm run preview` | Type-check and production build / serve the build |
| `npm test` · `npm run test:coverage` | Vitest once · with a coverage report in `coverage/` |
| `npm run test:e2e` | Build, start `vite preview` and run Cypress headlessly |
| `npm run cypress:open` | Cypress interactive runner (start `npm run preview:e2e` first) |
| `npm run lint` · `npm run typecheck` | ESLint (Airbnb rules) · `tsc -b` |

**Note for VS Code terminals on Windows:** if Cypress fails with `bad option: --smoke-test`,
the editor has set `ELECTRON_RUN_AS_NODE`. Run `env -u ELECTRON_RUN_AS_NODE npm run test:e2e`
(Git Bash) or clear the variable first.

## A five-minute tour for reviewers

1. On the landing page, drag the **EMI calculator**, then choose **Try demo application** and
   pick **Home Loan with a spouse**.
2. In each step press **Fill this step**, then **Continue**. Verify the mobile number with the
   code shown on screen, and press **Verify** on PAN and Aadhaar — the demo leaves every check
   to you.
3. Watch the conditional rules: the passport field (Home > ₹50 lakh), Step 6 with Spouse
   pre-selected, rent counted in the ledger, property documents in the checklist.
4. On Step 7, **Fill this step** sends generated sample files through the real uploader
   (checks, compression, progress, simulated verification).
5. On the review page, use **Edit** on any section, read the Key Fact Statement, tick the four
   consents and submit. Download the PDF summary.
6. Try the edge cases: reload mid-way and resume; change the loan amount to ₹5,00,000 and
   ₹5,00,001 on a Personal Loan; switch employment type after filling it; open the app in a
   second tab.

## Architecture decisions

A full walkthrough is in **[ARCHITECTURE.md](ARCHITECTURE.md)**. In short:

- **Wizard with a step registry.** Steps are declared once (`constants/steps.ts`) and the
  Wizard handles order, gating, history and focus without knowing any fields. Step 6 is
  inserted or removed by deriving the active steps from the data on every render, so it can
  never get out of sync.
- **React Hook Form over Formik.** Uncontrolled inputs mean typing re-renders only the field,
  not the step — noticeable on low-end phones. Its resolver API plugs straight into Zod, and
  `useWatch`, `Controller` and `useFormContext` cover the compound components.
- **Zod over Yup.** First-class TypeScript inference, `discriminatedUnion` for the employment
  branches (parsing drops the abandoned branch's fields), `superRefine` for specific
  messages, and schemas are cheap to rebuild from the whole application — the basis of the
  schema factory that carries all 14 cross-step dependencies.
- **Zustand for the application store.** Small, selector-based, no provider; Back never loses
  data because steps commit to the store and re-seed from it.
- **TypeScript** throughout (the brief lists it as a bonus) with an `ApplicationData` type that
  has one slice per step.
- **Encrypted local persistence.** Drafts in LocalStorage carry metadata only; file binaries
  live in an encrypted IndexedDB vault so a few scans never exhaust the ~5 MB quota.
- **Code splitting.** Each step, the workspace and jsPDF load on demand; failed chunk downloads
  are retried and, if still failing, the person gets a safe reload.

## Testing

| Suite | Count | Result (latest run) |
| --- | --- | --- |
| Unit and integration (Vitest + Testing Library) | 52 files, 338 tests | all passing |
| Coverage (`npm run test:coverage`) | statements 85.9%, lines 87.8%, functions 84.5%, branches 80.0% | every metric at or above the 80% target |
| End-to-end (Cypress 15 + cypress-axe) | 12 spec files, 33 tests | 33 passing, retries off |
| Lint (`eslint .`) and types (`tsc -b`) | | clean |

The Cypress specs map to the brief's journeys:

| Journey | Spec |
| --- | --- |
| 1 Personal happy path · 2 Home with co-applicant · 3 Business with GST/ITR | `personal-loan-happy-path`, `home-loan-happy-path`, `business-loan-happy-path` |
| 4–7 Step 1–4 validation (empty Continue, blur errors, exact-21 birthday, PAN entity, Aadhaar checksum, PIN lookup) | `validation-errors` |
| 8 Employment switching | `employment-switching` |
| 9 Step 6 visibility · 15 changing the loan after Step 5 · browser Back | `cross-step-dependencies` |
| 10 Upload, compression, rejection, removal | `file-upload` |
| 11 E-signature draw, clear, blur shield, review | `e-signature` |
| 12 Auto-save, resume, start fresh, tampered draft | `auto-save-resume` |
| 13 Keyboard only (skip link, radios, Enter, focus on error, dialog trap) | `keyboard-navigation` |
| 14 Rapid clicks, back/forward loops, hostile input, double submit | `stress-test` |
| axe WCAG 2.1 A/AA on the landing page, every step, error states and success | `accessibility` |

Custom commands (`cypress/support/commands.js`) include `fillStep1` … `fillStep8`; fixtures are
`valid-personal-loan.json`, `valid-home-loan.json`, `valid-business-loan.json` plus sample files.

## Performance and accessibility

- Main JavaScript chunk about 69 KB gzipped; each step, the workspace and jsPDF are separate
  chunks.
- Five 4.1 MB photos uploaded together (measured in Chrome, development build): longest
  main-thread task 181 ms, JS heap back to its 33 MB baseline afterwards.
- WCAG 2.1 AA: labels on every control, "Optional" in text, errors after interaction in polite
  live regions, focus moved to each new step and to the first invalid field, 44 px touch
  targets on phones, no horizontal scroll at 320 px, `prefers-reduced-motion` respected, and
  axe checks on every screen in CI.

## Screenshots

| | Desktop | Mobile |
| --- | --- | --- |
| Landing | ![](docs/screenshots/00-landing-desktop.png) | ![](docs/screenshots/00-landing-mobile.png) |
| 1 Loan | ![](docs/screenshots/01-loan-desktop.png) | ![](docs/screenshots/01-loan-mobile.png) |
| 2 About you | ![](docs/screenshots/02-personal-desktop.png) | ![](docs/screenshots/02-personal-mobile.png) |
| 3 Identity | ![](docs/screenshots/03-identity-desktop.png) | ![](docs/screenshots/03-identity-mobile.png) |
| 4 Address | ![](docs/screenshots/04-address-desktop.png) | ![](docs/screenshots/04-address-mobile.png) |
| 5 Income | ![](docs/screenshots/05-income-desktop.png) | ![](docs/screenshots/05-income-mobile.png) |
| 6 Co-applicant | ![](docs/screenshots/06-co-applicant-desktop.png) | ![](docs/screenshots/06-co-applicant-mobile.png) |
| 7 Documents | ![](docs/screenshots/07-documents-desktop.png) | ![](docs/screenshots/07-documents-mobile.png) |
| 8 Review | ![](docs/screenshots/08-review-desktop.png) | ![](docs/screenshots/08-review-mobile.png) |
| Submitted | ![](docs/screenshots/09-submitted-desktop.png) | ![](docs/screenshots/09-submitted-mobile.png) |

## Assumptions and known limitations

Assumptions (the smallest defensible choice where the brief was silent):

- The mandatory directory tree in section C1 is missing from the brief, so the layout follows
  the file names the brief mentions; see ARCHITECTURE.md.
- Business owners also give a monthly income, which the EMI-to-income ratio needs.
- "Max 3 files per document" applies everywhere, so salary slips, bank statements and GST
  returns accept combined PDFs. Aadhaar needs both sides: two images or one PDF.
- Proof of address on Step 4 is optional (Aadhaar usually carries the address).
- Errors stay hidden until a field is changed or Continue is pressed, never on first render.
- Interest rates are fixed per product and illustrative; the processing fee is 1%, between
  ₹2,000 and ₹25,000.

Limitations:

- **No back end.** Verification, PIN lookup, upload and submission are simulated; the reference
  number is a client-side UUID.
- **Key management.** The AES key is derived from a passphrase shipped in the bundle, as the
  brief allows. It defeats casual inspection and detects tampering, but not code running on
  the same origin.
- **Mobile OTP is required, email OTP optional;** codes are shown on screen.
- The PIN directory is a sample (100+ codes); unknown PINs can still be typed manually.
- Grievance and support emails use the reserved `.example` domain.
- Tested in Chrome (via Playwright) and Cypress's Electron browser. Firefox, Safari and Edge
  were not run in this environment.

## Deploy

The production build is static (`dist/`).

- **Vercel:** import the repository; `vercel.json` sets the build, the single-page-app
  fallback and security headers.
- **Netlify:** build command `npm run build`, publish directory `dist`; `public/_redirects`
  provides the fallback.
