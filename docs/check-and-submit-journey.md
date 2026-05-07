# Check and Submit User Journey

## Overview

Users must complete the **check wizard** before they can submit data. The check wizard validates their endpoint URL and, on success, passes a `requestId` and `orgId` into the **submit wizard** via the Express session.

---

## Check Wizard (`/check/*`)

### Entry via deep link — URL check + provide (get-started step 4)

**`/check/link?dataset=...&orgName=...&orgId=...&uploadMethod=url`**
- Sets in check sessionModel: `dataset`, `lpa`, `orgId`, `data-subject`, `upload-method: 'url'`
- Skips upload-method selection, redirects straight to `/check/url`
- Confirmation page will always show the "Provide your data" button

### Entry via deep link — general check (get-started step 2)

**`/check/link?dataset=...&orgName=...&orgId=...`**
- Sets in check sessionModel: `dataset`, `lpa`, `orgId`, `data-subject`
- Does **not** set `upload-method`
- Redirects to `/check/upload-method` (or `/check/geometry-type` for tree datasets)
- If the user picks URL, `upload-method: 'url'` is stored and the submit button appears on confirmation

---

### `/check/url`
- User submits their endpoint URL
- `submitUrlController` posts to the async API and stores the returned ID as `request_id` in the check sessionModel via hmpo field handling
- Redirects to `/check/status/<id>`

### `/check/status/:id`
- Polls the async API until processing is complete
- Redirects to `/check/results/<id>/1`

### `/check/results/:id/:pageNumber`
- Displays validation results
- Continue → `/check/confirmation`

### `/check/confirmation`
- Reads `upload-method` from check sessionModel
- If `'url'`: reads `request_id` and `orgId`, sets `req.session.checkRequestId` and `req.session.checkOrgId` (raw Express session, shared across wizards), shows "Provide your data" button → `/submit/lpa-details`
- If `upload-method` is not `'url'` or session is stale: button not shown, user must re-run the check

---

## Submit Wizard (`/submit/*`)

> There are no deep links into the submit wizard. The only entry is `/submit/lpa-details` via the confirmation page button.

### `/submit/lpa-details`
- Reads `req.session.checkRequestId` and `req.session.checkOrgId` (raw session)
- No `requestId` → redirects to `/check/url`
- Calls `getRequestData()` to validate `type === 'check_url'` and fetch `organisationName` + `dataset`
- API validation fails → redirects to `/check/url`
- Stores `requestId`, `lpa`, `orgId`, `dataset` in submit sessionModel
- Shows name and email form

### `/submit/dataset-details`
- Guards: no `requestId` in submit sessionModel → redirects to `/check/url`
- Shows documentation URL, licence confirmation, geometry type (tree only)

### `/submit/check-answers` GET
- Guards: no `requestId` in submit sessionModel → redirects to `/check/url`
- Calls `getRequestData()` to fetch the endpoint URL, stores as `endpoint-url` in submit sessionModel
- Renders all answers for review

### `/submit/check-answers` POST
- Reads all data from submit sessionModel
- Creates Jira ticket, attaches CSV in background
- Redirects to `/submit/confirmation`

### `/submit/confirmation`
- Displays Jira reference number

---

## Session failure

### `SESSION_TIMEOUT` error (hmpo-form-wizard)
Any page in either wizard will throw a `SESSION_TIMEOUT` error if the session has expired before the request is processed. This is caught by `PageController.errorHandler` and redirects to `/` rather than showing a 500.

### Stale session on `/check/confirmation`
If the session has expired by the time the user views the confirmation page, `upload-method` will be absent from the check sessionModel. The "Provide your data" button will not render. The user must re-run the check.

### Stale session on any submit page
`datasetDetailsController` and `CheckAnswersController` both guard on `requestId` in the submit sessionModel. If the session has expired mid-flow, the user is redirected to `/check/url`. However, since `/check/url` is also a mid-wizard page, a stale check session there will trigger `SESSION_TIMEOUT` and redirect to `/`. The user effectively ends up at the home page and must start again.

### `lpaDetailsController` — missing raw session keys
If `req.session.checkRequestId` is absent (e.g. the user navigated directly to `/submit/lpa-details` without going through confirmation, or the session expired), the controller redirects to `/check/url`. As above, a stale check session will bounce this to `/`.

---

## Session key summary

| Key | Set by | Read by |
|---|---|---|
| `upload-method` | check sessionModel — hmpo field or deep link controller | `checkConfirmationController` |
| `request_id` | check sessionModel — hmpo field via `submitUrlController` | `checkConfirmationController` |
| `req.session.checkRequestId` | `checkConfirmationController` (raw Express session) | `lpaDetailsController` |
| `req.session.checkOrgId` | `checkConfirmationController` (raw Express session) | `lpaDetailsController` |
| `requestId`, `lpa`, `orgId`, `dataset` | submit sessionModel — `lpaDetailsController` | `datasetDetailsController`, `CheckAnswersController`, templates |
| `endpoint-url` | submit sessionModel — `CheckAnswersController.locals` | `CheckAnswersController.createJiraServiceRequest` |
