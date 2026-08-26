# Check data

## Purpose

Checking is **validation without commitment**. A user points the service at a URL or uploads a
file, the data is validated against the dataset specification, and they get a results page telling
them what is wrong. Nothing is added to the platform, and the user is under no obligation to go
further.

Providing is the separate, opt-in step that follows a successful **URL** check — see
[submit-data](https://digital-land.github.io/submit/tutorial-submit-data.html).

Two audiences use it differently: people iterating on a file until it is clean, who may never go
further, and people preparing an endpoint to provide, for whom the check is the gate. The journey
is the same; only the ending differs.

It is open to anyone — no sign-in — so a check can come from an LPA, a consultant, or a member of
the public.

## Trigger and entry points

| Entry | Route | Notes |
|---|---|---|
| Start page | `/check` | full journey from dataset selection |
| Deep link | `/check/link?dataset=…&orgName=…&orgId=…` | pre-fills dataset and organisation — see [get-started](https://digital-land.github.io/submit/tutorial-get-started.html) |
| Deep link, URL only | `/check/link?…&uploadMethod=url` | also skips upload-method selection |
| Shared results | `/check/results/:id/:pageNumber` | results are addressable; session is repaired on arrival |

Wizard definition: [steps.js](https://github.com/digital-land/submit/blob/main/src/routes/form-wizard/check/steps.js),
[fields.js](https://github.com/digital-land/submit/blob/main/src/routes/form-wizard/check/fields.js),
[index.js](https://github.com/digital-land/submit/blob/main/src/routes/form-wizard/check/index.js) (wizard name `check-wizard`).

## Code flow

| Step | Controller | Next |
|---|---|---|
| `/` | [checkStartController](https://github.com/digital-land/submit/blob/main/src/controllers/checkStartController.js) | `dataset` (resets journey) |
| `/dataset` | [datasetController](https://github.com/digital-land/submit/blob/main/src/controllers/datasetController.js) | `geometry-type` if the dataset needs one, else `upload-method` |
| `/geometry-type` | `PageController` | `upload-method` |
| `/upload-method` | `PageController` | `url` or `upload` |
| `/url` | [submitUrlController](https://github.com/digital-land/submit/blob/main/src/controllers/submitUrlController.js) | `status/<request_id>` |
| `/upload` | [uploadFileController](https://github.com/digital-land/submit/blob/main/src/controllers/uploadFileController.js) | `status/<request_id>` |
| `/status/:id` | [statusController](https://github.com/digital-land/submit/blob/main/src/controllers/statusController.js) | `results/:id/1` |
| `/column-mapping/:id` | [columnMappingController](https://github.com/digital-land/submit/blob/main/src/controllers/columnMappingController.js) | `results/:id/1` |
| `/results/:id/:pageNumber` | [resultsController](https://github.com/digital-land/submit/blob/main/src/controllers/resultsController.js) | `confirmation` |
| `/results/:id/issue/:issueType/:field/:pageNumber?` | [issueDetailsController](https://github.com/digital-land/submit/blob/main/src/controllers/issueDetailsController.js) | — |
| `/results/:id/share` | [ShareResultsController](https://github.com/digital-land/submit/blob/main/src/controllers/ShareResultsController.js) | — |
| `/confirmation` | [checkConfirmationController](https://github.com/digital-land/submit/blob/main/src/controllers/checkConfirmationController.js) | `/submit/lpa-details` |
| `/link` | [checkDeepLinkController](https://github.com/digital-land/submit/blob/main/src/controllers/checkDeepLinkController.js) | redirects, renders nothing |

Points that are not obvious from the table, and should be expanded on:

- `/dataset` sets `requiresGeometryTypeSelection` in session, which drives the conditional `next`.
- `/url` and `/upload` both store the returned id as the `request_id` wizard field.
- `/results` runs `updateSessionFromRequestData`, which sets `request_id` and — for `check_url`
  requests — `upload-method: 'url'`. This is what makes a **shared results link** work: the session
  is correct whether the user walked the journey or arrived at the URL cold.
- The organisation name in the results banner is resolved by the `orgIdToName` filter from the org
  code in the async request params, not from session.
- The LPA boundary map uses `requestParams.organisationName` (the org code from the async request)
  to build the boundary GeoJSON URL, falling back to `deepLink.orgId`.
- `/confirmation` is the only place the submit handover is set up: it reads `upload-method`, and if
  it is `'url'` it writes `req.session.checkRequestId` (raw session, shared across wizards) and
  renders the "Provide your data" button. If `upload-method` is anything else, or the session has
  gone stale, the button is not rendered and the user has to re-run the check.

### Async request lifecycle

1. `submitUrlController` / `uploadFileController` posts to the async request backend and stores the
   returned id as `request_id`.
2. `/check/status/:id` polls [`GET /api/status/:result_id`](https://github.com/digital-land/submit/blob/main/src/routes/api.js) until the
   request is complete.
3. The status endpoint also computes `showColumnMapping` and `columnMappingUrl` via
   [columnMappingDecider](https://github.com/digital-land/submit/blob/main/src/services/columnMappingDecider.js) once the request finishes.
4. On completion the user is sent to `/check/results/:id/1`.

Polling is client-side, in [assets/js/statusPage.js](https://github.com/digital-land/submit/blob/main/src/assets/js/statusPage.js): a 3 second
interval with a cap on attempts, against the endpoint passed to the template as `pollingEndpoint`.
Statuses are `PENDING`/`PROCESSING`, then `COMPLETE` or `FAILED` — both are "finished", so the page
must check `isFailed` as well as `isComplete`. A failed request goes to the results page, which
renders the error rather than a table.

`statusController` also resolves the dataset from the platform API and runs
`processSpecificationMiddlewares` in `middlewareSetup`, so the specification is available when the
results page is reached.

### Column mapping

Offered when the user's columns could plausibly be mapped to expected fields that are currently
unmapped. [`shouldShowColumnMapping`](https://github.com/digital-land/submit/blob/main/src/services/columnMappingDecider.js) returns false if
any of these hold: the request failed, the dataset is statutory, there are blocking non-mapping
issues (quality criteria level 2, external responsibility), the user already supplied a column
mapping, every expected field is mapped, or there are no spare uploaded columns to map from.

Geometry and point are treated as interchangeable — if one is mapped, the other is not counted as
missing.

The step lets the user assign their columns to fields (or `IGNORE`), and resubmits as a new request
carrying `column_mapping` in its params. That is why `hasUserColumnMapping` suppresses a second
offer: a mapped request never asks again.

## Data in, transformations, out

**In** — either a URL, or a file received by `multer` and stored in S3. Allowed types come from
`allowedFileTypes` in [utils/utils.js](https://github.com/digital-land/submit/blob/main/src/utils/utils.js) (CSV, GeoJSON, GML, GeoPackage);
the size limit is `config.validations.maxFileSize` (100MB).

**Through** — the async request backend does the actual validation. This service only holds the
request id and reads results back through
[`RequestData`/`ResponseDetails`](https://digital-land.github.io/submit/tutorial-dependencies.html#models).

**Out** — the results pages (tables, issue details, maps), a shareable results URL, and for URL
checks the session values the submit wizard needs.

## Validation and errors

Three layers, in order:

1. **Field validation** — [fields.js](https://github.com/digital-land/submit/blob/main/src/routes/form-wizard/check/fields.js) and
   [utils/validators.js](https://github.com/digital-land/submit/blob/main/src/utils/validators.js); messages resolved by
   [validationMessageLookup](https://github.com/digital-land/submit/blob/main/src/filters/validationMessageLookup.js) and rendered through
   [toErrorList](https://github.com/digital-land/submit/blob/main/src/filters/toErrorList.js).
2. **Pre-flight checks** — `SubmitUrlController.localUrlValidation` and the file checks in
   `UploadFileController`, run before the async request is created.
3. **Check results** — issues found by the backend, displayed on the results pages.

File checks run in `UploadFileController` before the request is created: `fileMimeTypeIsValid`
against `allowedFileTypes`, and `fileMimeTypeMatchesExtension`, which catches a mismatch between
extension and declared type (`application/octet-stream` is allowed through). Name rules cover
length, illegal characters and double extensions. Everything else surfaces as a `MiddlewareError`
error page.

### URL failure modes

`SubmitUrlController.localUrlValidation` makes a **HEAD request before the async request is
created**. Anything it does not catch surfaces later as a failed request on the status or results
page, usually with a much less helpful message — so knowing which layer catches what is the first
thing to establish when triaging a report.

Caught up front, in [submitUrlController.js](https://github.com/digital-land/submit/blob/main/src/controllers/submitUrlController.js):

| Failure | Check | Error type |
|---|---|---|
| Empty URL | `urlIsDefined` | `required` |
| Malformed URL | `urlIsValid` | `format` |
| Over 2048 characters | `urlIsNotTooLong` | `length` |
| 404 | `isUrlAccessible` | `exists` |
| 403 — bot or WAF block | `isNotRestricted` | `restricted403` → "The URL must be accessible", with extra guidance in [views/check/url.html](https://github.com/digital-land/submit/blob/main/src/views/check/url.html) |
| Response too large | `urlResponseIsNotTooLarge` | `size` |

A `405 Method Not Allowed` on the HEAD request **skips all post-checks** and lets the request
through — some servers reject HEAD but serve GET fine. Same for a network error on the HEAD.

Caught later, by the backend:

| Failure | How it surfaces |
|---|---|
| SSL certificate verification failure | [views/check/error-redirect.html](https://github.com/digital-land/submit/blob/main/src/views/check/error-redirect.html) branches on `errorMessage == "SSL certificate verification failed"` |
| `text/html` returned instead of data | request fails; the error is shown on the results page |

The front-end content-type check is **deliberately disabled** — the `filetype` validator in
`localUrlValidation` is commented out because it rejected plugin URLs such as ArcGIS. Do not
re-enable it without solving that case.

Not caught anywhere:

| Failure | Symptom | Why |
|---|---|---|
| JavaScript bot check (e.g. a Cloudflare interstitial) | HEAD returns 200, so the check proceeds and fails downstream with an unhelpful message. `curl` on the URL shows a JS challenge page rather than data | Neither the HEAD check nor the backend executes JavaScript, so the challenge page is indistinguishable from a valid 200 |
| ArcGIS Data Explorer / portal item link | The URL is reachable and returns HTML. The user has pasted the viewer page, not the download endpoint | The real download URL has to be found inside the portal — there is no reliable way to derive it |

To reproduce a report, run the HEAD the service runs, then the GET it does not:

```sh
curl -I -A "$(grep -A1 userAgent config/default.yaml)" '<url>'   # what localUrlValidation sees
curl -sL '<url>' | head -40                                       # what actually comes back
```

Send the same `User-Agent` — `config.checkService.userAgent` — or you may get a different answer
from the server than the service does. A JS challenge is obvious in the second command: HTML with
an inline script rather than data.

**Triage.** Each failure path emits a Sentry counter — start there rather than in the logs:

- `url_submission.validation_failure` (attribute: `failure_type`)
- `url_submission.head_request_error` (attribute: `reason` — `network_error` or `method_not_allowed`)
- `url_submission.async_request_failure` (attributes: `error_code`, `response_status`)
- `url_submission.begun` / `url_submission.accepted` for the denominator

## Datasette queries

| Query | Purpose |
|---|---|
| [fetchDatasetCollections](https://github.com/digital-land/submit/blob/main/src/utils/datasetteQueries/fetchDatasetCollections.js) | dataset → collection |
| [fetchDatasetsFromProvisions](https://github.com/digital-land/submit/blob/main/src/utils/datasetteQueries/fetchDatasetsFromProvisions.js) | which datasets to offer |
| [getDatasetSlugNameMapping](https://github.com/digital-land/submit/blob/main/src/utils/datasetteQueries/getDatasetSlugNameMapping.js) | readable dataset names (startup) |
| [getOrganisationNameMapping](https://github.com/digital-land/submit/blob/main/src/utils/datasetteQueries/getOrganisationNameMapping.js) | org code → name (startup) |
| [endpointAlreadyCollected](https://github.com/digital-land/submit/blob/main/src/utils/datasetteQueries/endpointAlreadyCollected.js) | warn when the endpoint is already collected |
| issue-type query in [columnMappingDecider](https://github.com/digital-land/submit/blob/main/src/services/columnMappingDecider.js) | whether to offer column mapping |

The dataset list offered on the `/check/dataset` step is not hardcoded — it is derived from the
platform's provision data, grouped by collection and cached. `getDatasets()` in
[utils/utils.js](https://github.com/digital-land/submit/blob/main/src/utils/utils.js) is the entry
point, and also backs deep-link validation. See
[how the dataset list is built](https://digital-land.github.io/submit/tutorial-architecture.html#how-the-dataset-list-is-built)
for the derivation and its fallbacks — including why a dataset can disappear from the list entirely.

## Testing

| Level | Files |
|---|---|
| Unit | controllers under `test/unit` — `submitUrlController` has the densest validation cases |
| Integration | `test_recieving_results`, `validation_errors`, `back_buttons`, `check_to_submit` |
| Acceptance | `test/acceptance/request_check.test.js` |
| Page objects | `startPage`, `datasetPage`, `geometryTypePage`, `uploadMethodPage`, `submitURLPage`, `uploadFilePage`, `statusPage`, `resultsPage`, `errorsPage`, `noErrorsPage` |
| Fixtures | `test/datafiles/article4directionareas-{ok,error}.csv` |

Run against a stub backend with `npm run mock:api`, or `NODE_ENV=wiremock` for pre-baked responses —
useful for reproducing a specific results payload without a real check.

See [architecture.md](https://digital-land.github.io/submit/tutorial-architecture.html#testing-and-local-development) for the general test setup.
