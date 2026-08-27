# Get started

## Purpose

The join between the dashboards and the check tool. The get-started page explains what an
organisation needs to provide for a given dataset, and links into a **pre-filled check** so the
user does not have to re-select the dataset and organisation they were already looking at.

Small, but worth documenting separately: it is the only place that constructs deep links, and deep
links are the reason the check wizard has `/link`, `resetJourney` and session-repair behaviour at
all.

## Trigger and entry points

| Entry | Route / module |
|---|---|
| Get started page | `/organisations/:lpa/:dataset/get-started` → [getStarted.middleware.js](https://github.com/digital-land/submit/blob/main/src/middleware/getStarted.middleware.js) |
| Deep link into check | `/check/link?…` → [checkDeepLinkController](https://github.com/digital-land/submit/blob/main/src/controllers/checkDeepLinkController.js) |
| Link builder | [filters/checkToolDeepLink.js](https://github.com/digital-land/submit/blob/main/src/filters/checkToolDeepLink.js) |
| Submit link builder | [filters/endpointSubmissionFormDeepLink.js](https://github.com/digital-land/submit/blob/main/src/filters/endpointSubmissionFormDeepLink.js) |

## Code flow

### Get started page

Chain, in order: `fetchOrgInfo` → `fetchLocalPlanningGroups` → `fetchProvisionsByOrgsAndDatasets`
→ `fetchDatasetInfo` → `prepareAuthority` → `getGetStarted` → `logPageError`

`getGetStarted` renders `organisations/get-started.html` with `organisation`, `dataset`, `authority`
and `planningGroupProvisions` (other organisations in the same planning group, when there is more
than one provision). Guidance links come from `config.datasetsConfig[dataset].guidanceUrl`, longer
copy from [src/content/](https://github.com/digital-land/submit/blob/main/src/content), and the relationship diagrams from the specification
repo, downloaded at build time by
[scripts/fetch-specification-diagrams.js](https://github.com/digital-land/submit/blob/main/scripts/fetch-specification-diagrams.js).

`prepareAuthority` sets whether the organisation is authoritative for the dataset, which changes
what the page asks the user to do.

### Building the link

`checkToolDeepLink(organisation, dataset, uploadMethod)` returns
`/check/link?dataset=…&orgName=…&orgId=…[&uploadMethod=url]`, or plain `/check` if either argument
is missing. All values are URL-encoded.

It is registered as a nunjucks filter in [filters/filters.js](https://github.com/digital-land/submit/blob/main/src/filters/filters.js) and
called from the dashboard templates. `uploadMethod=url` is passed where the intent is check *and*
provide, and omitted where the user is only being offered a check.

## Deep links into the check wizard

`/check/link` renders nothing. It validates the query params, writes them into the check
sessionModel and redirects to the next step. The step is configured with `entryPoint`,
`resetJourney`, `reset` and `skip` — see
[steps.js](https://github.com/digital-land/submit/blob/main/src/routes/form-wizard/check/steps.js).

| Variant | Session values set | Redirects to |
|---|---|---|
| `?dataset&orgName&orgId` | `dataset`, `lpa`, `orgId`, `data-subject` | `/check/upload-method` (or `/check/geometry-type` for datasets that need one) |
| `…&uploadMethod=url` | the above plus `upload-method: 'url'` | `/check/url` |

The `uploadMethod=url` variant matters downstream: `upload-method` is what
`checkConfirmationController` checks before showing the "Provide your data" button, so a user who
arrives this way always gets the provide option on a successful check. See
[submit-data](https://digital-land.github.io/submit/tutorial-submit-data.html).

### Validation and failure

Params are validated with valibot (`QueryParams`: `dataset`, `orgName`, `orgId`, all non-empty) and
the dataset must exist in `getDatasets()`. On failure the user is **redirected to `/`** rather than
shown an error — they can still start a check manually. A failure to load the dataset list also
redirects to `/`.

The `referer` header is recorded as `referrer` in session data when it parses as a URL.

`referrer` is used by `wizardBackLink` in
[pageController.js](https://github.com/digital-land/submit/blob/main/src/controllers/pageController.js) to send the back link on the first real
step of the wizard (`/check/upload-method`, or `/check/geometry-type` for tree) back to the page the
user came from, rather than into the wizard.

Worth reviewing: an invalid deep link redirects silently to `/`, with only a log line. The user gets
no explanation of why they did not land where the link promised.

### Submit deep links — currently broken

`endpointSubmissionFormToolDeepLink` builds `/submit/link?dataset=…&orgName=…&orgId=…[&requestId=…]`
and **is** used: the endpoint error page
([views/organisations/http-error.html](https://github.com/digital-land/submit/blob/main/src/views/organisations/http-error.html)) offers
"resubmit your endpoint URL" through it.

But the submit wizard has no `/link` step —
[steps.js](https://github.com/digital-land/submit/blob/main/src/routes/form-wizard/endpoint-submission-form/steps.js) defines only
`/lpa-details`, `/dataset-details`, `/check-answers` and `/confirmation`. The step was removed when
submit became reachable only from the check confirmation page, and the filter was left behind, so
**that link does not go anywhere useful**.

[endpointSubmissionFormDeepLinkController](https://github.com/digital-land/submit/blob/main/src/controllers/endpointSubmissionFormDeepLinkController.js)
still exists and still has unit tests, but nothing routes to it. Either restore the step or remove
the controller, filter and link together — do not build on it as it stands.

## Adding a new deep link

1. Add the param to `QueryParams` in `checkDeepLinkController` — anything not in the schema is
   rejected and the user is bounced to `/`.
2. Write it into the sessionModel in `get()`.
3. Make sure the `/link` step's conditional `next` in
   [steps.js](https://github.com/digital-land/submit/blob/main/src/routes/form-wizard/check/steps.js) handles the new state.
4. Add a unit test per variant — the variants diverge downstream, so one test is not enough.

## Datasette queries

`fetchProvisionsByOrgsAndDatasets` and `fetchLocalPlanningGroups` from
[common.middleware.js](https://github.com/digital-land/submit/blob/main/src/middleware/common.middleware.js); `getDatasets()` in
[utils/utils.js](https://github.com/digital-land/submit/blob/main/src/utils/utils.js) backs the deep-link dataset validation.

## Testing

Unit tests cover `checkDeepLinkController` and the two link filters; the get-started page is
exercised by `test/integration/pages_load_ok`. Note that
`test/unit/endpointSubmissionFormLinkController.test.js` tests a controller nothing routes to — see
[above](#submit-deep-links--currently-broken).

See [architecture.md](https://digital-land.github.io/submit/tutorial-architecture.html#testing-and-local-development) for the general test setup.
