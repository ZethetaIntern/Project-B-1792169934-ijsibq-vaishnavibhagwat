# LendSwift — architecture

How the application is put together, and why. The README covers setup and testing; this
document covers the moving parts: the wizard, the schema factory, cross-step
dependencies, auto-save and the document vault.

## 1. Overview

```
Landing page (Experience A)                 Application workspace (Experience B)
┌──────────────────────────┐   Start /    ┌───────────────────────────────────────────────┐
│ EMI calculator (ledger)  │ ───────────▶ │ Wizard ── step registry ── lazy step forms    │
│ Loans · Process · Help   │   demo       │   │            │                │             │
└──────────────────────────┘              │   ▼            ▼                ▼             │
                                          │ Zustand store ◀── RHF form per step ── Zod    │
                                          │   │                               (schemaFactory)
                                          │   ├── auto-save → AES-GCM → localStorage       │
                                          │   └── files → AES-GCM → IndexedDB vault        │
                                          └───────────────────────────────────────────────┘
```

- **React 19 + TypeScript + Vite.** Steps, the workspace and the landing page are
  code-split with `lazy()`, so only the open page's code is downloaded; the main chunk is
  about 74 KB gzipped. A small Vite plugin (`lendswift:preload-route-chunks`) writes
  `modulepreload` links into the HTML, so the opened page's chunks download in parallel
  with the main bundle instead of after it.
- **React Hook Form** owns in-progress field state for the open step only.
- **Zod** owns every rule. One schema per step, rebuilt from the whole application.
- **Zustand** holds the application between steps, so Back never loses data.
- There is no back end. Verification, PIN look-up, upload and submission are simulated
  with realistic latency and fail gracefully when the browser is offline.

## 2. Directory layout

```
src/
  components/
    common/       Wizard, ProgressBar, StepNavigation (as the brief places them), plus the
                  design-system controls: Input (compound), Select, RadioGroup, Checkbox,
                  CurrencyInput, MaskedInput, Combobox, FileUpload, SignatureCanvas, Modal…
    wizard/       Wizard plumbing: useStepForm, stepFormBridge, useFieldStatus, step registry
    steps/        Step1LoanType … Step8Review (one default export each, lazy-loaded)
    review/       Key fact statement, review sections, disclosures, submit panel, success
    documents/    Document checklist
    summary/      Loan ledger (the signature visual) and mobile summary
    persistence/  Resume prompt and auto-save status
    landing/      Experience A
    demo/         Demo launcher and demo bar
    layout/       Workspace shell and headers
  schemas/        step1Schema … step8Schema, schemaFactory, dependencies registry, draft schema
  hooks/          useAutoSave, useFormPersistence, useVerification, usePinCodeLookup,
                  useFileUpload, useApplicationSubmit, useVaultJanitor, session signals
  utils/          emiCalculator, validators (PAN, Verhoeff, GSTIN), encryption, draftStorage,
                  documentVault, imageCompression, fileValidation, documentRequirements,
                  reviewSummary, submissionReadiness, applicationPdf, pinCodeData.json
  store/          applicationStore, initialApplication
  constants/      loan products, steps, documents, labels, persistence settings
  demo/           demo scenarios, fill logic, sample documents
  types/          ApplicationData — one slice per step
cypress/          E2E journeys, fixtures, custom commands (fillStep1 … fillStep8, resumeAt)
scripts/          Lighthouse and accessibility-tree audits, legacy-browser smoke test,
                  terms PDF generator
```

The brief's directory tree (C1) was missing from the PDF, so this layout follows the
file names the brief mentions (`Step3KYC`, `schemaFactory`, `useAutoSave`,
`pinCodeData.json`, `fillStep1`…) and groups the rest by responsibility.

## 3. The wizard and its step registry

The **Wizard pattern** separates three concerns:

| Concern | Lives in | Knows about |
| --- | --- | --- |
| Which steps exist and in what order | `constants/steps.ts` (`STEPS`, `isStepActive`) | Step metadata only |
| Navigation, gating, history, focus | `components/common/Wizard.tsx`, `utils/wizardNavigation.ts` | Steps as ids, never their fields |
| Fields and local validation | `components/steps/StepN*.tsx` + `schemas/stepNSchema.ts` | Its own slice of `ApplicationData` |

Each step calls `useStepForm(stepId)`, which:

1. creates a React Hook Form instance seeded from the store (returning to a step restores it);
2. validates with a resolver that always uses the *latest* schema from the schema factory;
3. registers a controller with `stepFormBridge` — `validate()`, `getValues()` and
   `fill()` — so the Wizard can drive the open step without knowing its fields.

**Continue** runs `validate()`. On success the parsed output (not the raw input) is written
to the store, which is how abandoned branches are cleared. **Back**, progress-bar jumps and
the browser's Back button save the open step *without* validating, so nothing is lost.

`getActiveSteps(data)` decides whether Step 6 is part of the flow. Because it is derived
from the data on every render, the co-applicant step is inserted the moment the loan amount
crosses a threshold and removed the moment it no longer applies; if the open step drops
out of the flow, `resolveActiveStepId` moves to the next active one.

Reachability: a step can be opened only if every earlier active step is valid
(`getReachableIndex`). After an edit started from the review page, Continue returns to the
review — or to the first step that the edit made invalid (`getReturnToReviewTarget`).

## 4. Schema factory

```ts
getStepSchema(stepId, application) → z.ZodType   // schemas/schemaFactory.ts
```

Every builder receives the whole application, so a step's rules can depend on answers given
elsewhere. Schemas are cheap to build, so they are rebuilt whenever they are used — there
is no cache to invalidate. Highlights:

- **Step 5** is a `z.discriminatedUnion` on `employmentType`. Parsing keeps only the active
  branch's fields, so switching from Salaried to Self-employed clears stale salary data.
  Salaried applicants may add up to three previous employers (`useFieldArray`); older
  drafts without the list load through a `.default([])`.
- **`superRefine`** produces specific messages ("PAN 4th character must indicate entity type…")
  rather than generic ones; transforms normalise input (NFC, invisible characters removed).
- **Step 7** builds its rules from the document requirements engine and drops files for
  documents that no longer apply.
- **Step 8** requires the four consents and, only when EMI exceeds 50% of income, the extra
  acknowledgement.

## 5. Cross-step dependencies

All fourteen rules are listed as data in `schemas/dependencies.ts` and proved one by one in
`schemas/crossStepDependencies.test.ts`, together with the six loan × employment
combinations.

| # | From → to | Trigger | Effect | Enforced by |
| --- | --- | --- | --- | --- |
| 1 | Loan → Employment | Loan type | Business Loans need a self-employed or business-owner profile | `buildStep5Schema` |
| 2 | Loan → Co-applicant | Loan type | Home Loans always include Step 6 | `requiresCoApplicant` |
| 3 | Loan → Documents | Loan type | Property documents; registration and GST returns | `getDocumentRequirements` |
| 4 | Loan → Co-applicant | Amount | Personal > ₹5 lakh, Business > ₹20 lakh (strictly greater) | `requiresCoApplicant` |
| 5 | Loan → Review | Amount | EMI, interest, fee and APR | `getApplicationEstimate` |
| 6 | Loan → Review | Tenure | EMI and total cost | `getApplicationEstimate` |
| 7 | Personal → Loan | Date of birth | Loan must end by age 65, capping the tenure | `getAgeTenureLimit` |
| 8 | Personal → Co-applicant | Marital status | Married → Spouse is the default | `getRelationshipOptions` |
| 9 | KYC → Documents | PAN verified | PAN copy becomes optional | `getDocumentRequirements` |
| 10 | Address → Address | Residence type | Rented → monthly rent, counted in affordability | `buildStep4Schema`, `getMonthlyRent` |
| 11 | Employment → Employment | Employment type | Sub-form shown; abandoned branch cleared | discriminated union |
| 12 | Employment → Documents | Employment type | Salary slips or ITRs | `getDocumentRequirements` |
| 13 | Employment → Review | Income | EMI > 50% of income needs acknowledgement | `buildStep8Schema` |
| 14 | Co-applicant → Review | Their income | Added to the applicant's for the ratio | `getCombinedMonthlyIncome` |

## 6. Auto-save and resume

```
edit ─▶ change signal ─▶ useAutoSave (30 s debounce, max 60 s wait)
step change / Save draft / tab hidden / pagehide ─▶ saveNow()
                                   │
                                   ▼
       snapshot = store + open step's unsaved values (getLiveApplicationData)
                                   │
           JSON ─▶ AES-256-GCM (Web Crypto, key bound to the storage key as AAD)
                                   │
       localStorage  lendswift_draft_<loanType>   +   …_meta { version, timestamp, step, loanType, tabId }
```

On load, `useFormPersistence` lists drafts younger than 72 hours (older ones are purged)
and asks "Resume or start fresh?". Resuming decrypts the draft and validates it against
`draftSchema` before hydrating the store; a draft that fails to decrypt (tampered), fails
the schema (old version, edited by hand) or is missing is deleted and the person is told
why. Auto-save stays off until that decision, so an empty form never overwrites a draft.

Also handled: a `storage`-event banner when another tab saves the same application; an
offline banner; a 15-minute idle timeout that saves, clears the store from memory and asks
the person to continue; and a lock that stops an in-flight save from rewriting the draft
after a successful submission.

**Key management, honestly:** the encryption key is derived (PBKDF2) from a passphrase in
the bundle, as the brief allows. It keeps data unreadable to anyone browsing storage or a
copied profile, and GCM makes tampering detectable, but it does not protect against code
running on the same origin. A production system would use a server-held, per-user key.

## 7. Documents and the vault

```
file ─▶ validate (type, magic bytes, size, count) ─▶ compress images (canvas, C4)
     ─▶ simulated upload with progress ─▶ AES-GCM ─▶ IndexedDB vault (id-bound)
     ─▶ metadata into the form ─▶ simulated document check ─▶ "Verified"
```

- Drafts carry only metadata; binaries live in IndexedDB, so a few scans never exhaust
  LocalStorage's ~5 MB. Without IndexedDB, each file is stored as AES-GCM ciphertext in
  base64 at `lendswift_file_[id]`, within a 2-million-character budget; anything larger is
  kept in memory for the session, and the uploader asks for it again after a reload.
- Compression follows the brief: 1200 px wide, JPEG 0.7, minus 0.1 until under 2 MB or 0.3.
  Images are decoded off the main thread (`img.decode()`) and processed one at a time.
  Five 4.1 MB photos measured in Chrome: longest main-thread task 181 ms (development
  build); JS heap back to its 33 MB baseline afterwards.
- On resume, every listed file is checked against the vault; missing ones are removed from
  the form with a message asking for a re-upload.
- `useVaultJanitor` deletes binaries the application stopped referencing, purges files past
  72 hours, and the vault is cleared on Start fresh and on submission.

## 8. Submission

`getSubmissionBlockers` lists everything still in the way (incomplete steps, missing
documents, signature, consents, connectivity); Submit is disabled while the list is not
empty and the list is linked to the button. `useApplicationSubmit` guards against double
submission with a ref, builds a minimised payload (no inactive co-applicant, no stale
files), waits for the simulated API and returns a client-generated UUID. Drafts and stored
files are then deleted and the success dialog offers a lazily loaded jsPDF summary.

## 9. Demo mode

Four synthetic scenarios (`src/demo/scenarios.ts`) cover every conditional rule. "Fill this
step" writes a scenario's answers into the open step through `stepFormBridge.fill()`.
Nothing is committed: the person still verifies the mobile number, PAN and Aadhaar, ticks
consents and presses Continue, so every rule runs. Sample documents are generated in the
browser and dropped into the real uploaders.

## 10. Accessibility and performance decisions

Accessibility:

- Labels on every control; optional fields say "Optional" in text.
- Errors appear after a field is changed and left, or on Continue — never on first render —
  and live in polite live regions linked with `aria-describedby`. Radio groups set
  `aria-invalid` from that same error state; otherwise the browser would expose an
  unchosen required radio as invalid before the person had done anything.
- Focus moves to the first field on each step and to the first invalid field when
  Continue fails; dialogs trap focus and return it. When a Verify button or a one-time-code
  panel gives way, focus stays on (or returns to) the field being verified, and the result
  is announced.
- `scroll-padding` on the root keeps a focused field clear of the sticky header and the
  sticky step actions, wherever Tab, an anchor or an error scrolls it (WCAG 2.4.11).
- 44 × 44 px touch targets on every touch screen, phones and tablets either way up. Smaller
  controls only appear on screens 640 px and wider with a mouse (`sm:pointer-fine:`). On
  phones the eight progress segments (about 31 px wide each) become a plain bar plus an
  "All steps" list of full-width rows.
- Checked by axe on every screen, Lighthouse accessibility (100 on every page), an
  accessibility-tree audit, and the manual checklist in `docs/screen-reader-checklist.md`.

Performance:

- Code splitting per step; jsPDF and html2canvas are only fetched when a PDF is created.
  Each step preloads its neighbours, and Continue or Back waits for the next step's code
  before switching, which avoids React's 300 ms Suspense reveal delay.
- Cross-step revalidation runs inside `useTransition`, and the loan ledger and the EMI
  calculator read `useDeferredValue`, so typing never waits for them.
- The encryption key is derived up front, so the first auto-save is not slowed by it.
- Inter is loaded for Latin only, with a 1.2 KB subset for the rupee sign instead of the
  83 KB Latin Extended file.

Browser support (Chrome and Edge 90+, Firefox 88+, Safari 14+): Tailwind's cascade layers
are flattened by PostCSS, the build targets those versions, `eslint-plugin-compat` flags
newer APIs, and `crypto.randomUUID` and the SHA-256 key derivation have fallbacks.
`scripts/legacy-browser-smoke.cjs` runs a journey on Chromium 90, Firefox 87 and WebKit
14.2 (Safari 14).
