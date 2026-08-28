# Submit data

## Purpose

Providing is the **commitment** step. Where [checking](https://digital-land.github.io/submit/tutorial-check-data.html) validates data and stops,
providing takes an endpoint URL that has already passed a check and raises a request with the data
team so the endpoint is added to a collection and picked up by the pipeline.

It is only available after a successful **URL** check — a file check has no endpoint to provide.

After the request is raised, the data team picks it up in Jira and configures the endpoint in the
[config](https://github.com/digital-land/config) repository using the Manage service. The endpoint
is then collected by the overnight pipeline, so provided data appears on the platform on a later
run rather than immediately.

## Trigger and entry points

The **only** entry is the "Provide your data" button on `/check/confirmation`. There are no deep
links into this wizard, and no way to reach it without a completed URL check.

Wizard definition: [steps.js](https://github.com/digital-land/submit/blob/main/src/routes/form-wizard/endpoint-submission-form/steps.js),
[fields.js](https://github.com/digital-land/submit/blob/main/src/routes/form-wizard/endpoint-submission-form/fields.js),
[index.js](https://github.com/digital-land/submit/blob/main/src/routes/form-wizard/endpoint-submission-form/index.js).

> `routes.js` comments this mount as "feature flagged routes", but
> `features.submitEndpointForm` is **not read anywhere in `src/`** — the router is mounted
> unconditionally. The flag is dead config; either wire it up or remove it.

### Preconditions

| Requirement | Checked by | Failure |
|---|---|---|
| `req.session.checkRequestId` present | `lpaDetailsController` | redirect to `/check/url` |
| Async request resolves and `type === 'check_url'` | `lpaDetailsController` via `getRequestData()` | redirect to `/check/url` |
| `requestId` in the submit sessionModel | `datasetDetailsController`, `CheckAnswersController` | redirect to `/check/url` |

Note the knock-on effect: `/check/url` is itself mid-wizard, so a user whose session has expired is
bounced from there to `/` by `SESSION_TIMEOUT`. In practice an expired session sends them back to
the start.

## Code flow

| Step | Controller | Fields | Next |
|---|---|---|---|
| `/lpa-details` | [LpaDetailsController](https://github.com/digital-land/submit/blob/main/src/controllers/lpaDetailsController.js) | `name`, `email` | `dataset-details` |
| `/dataset-details` | [DatasetDetailsController](https://github.com/digital-land/submit/blob/main/src/controllers/datasetDetailsController.js) | `documentation-url`, `hasLicence` | `check-answers` |
| `/check-answers` | [CheckAnswersController](https://github.com/digital-land/submit/blob/main/src/controllers/CheckAnswersController.js) | — | `confirmation` |
| `/confirmation` | `PageController` | — | — |

- **`/lpa-details`** reads `req.session.checkRequestId`, calls `getRequestData()`, and populates the
  submit sessionModel from the async request params: `requestId`, `lpa` (resolved from the org code
  by the `orgIdToName` filter), `orgId`, `dataset`, `endpoint-url`, and `geomType` where present.
  Its back link points at `/check/results/:id/1`. It then collects name and email.
- **`/dataset-details`** collects the documentation URL and licence confirmation, plus geometry type
  for tree datasets.
- **`/check-answers`** renders every answer on GET; POST does the submission below.
- **`/confirmation`** shows the Jira reference from `reference` in the sessionModel.

### Submission

On `POST /submit/check-answers`, `CheckAnswersController`:

1. Reads every answer from the submit sessionModel.
2. Creates a Jira Service Desk request via [jiraService](https://github.com/digital-land/submit/blob/main/src/services/jiraService.js)
   (`config.jira.requestTypeId`).
3. Attaches a CSV of the answers **in the background**.
4. Sends confirmation email(s) via [mailClient](https://github.com/digital-land/submit/blob/main/src/services/mailClient.js) using
   `config.email.templates`.
5. Redirects to `/submit/confirmation`.

**Duplicate protection.** Before creating the ticket the controller reserves the endpoint in Redis
(`reserveSubmittedEndpoint`), renews the reservation every 60 seconds while Jira calls are in
flight, and on success holds it for 24 hours so duplicate submissions are rejected until the
nightly import picks the endpoint up. On any failure the reservation is released in a `finally`
block.

**Failure behaviour.** If ticket creation fails or returns nothing, an error is written to the
sessionModel and the user is redirected back to `/submit/check-answers` — they never reach
confirmation on a failed submission. The CSV attachment and the internal note are different: both
are awaited with `.catch()` that only logs, so a ticket without its attachment still succeeds from
the user's point of view. In non-production the ticket title is prefixed `[TEST]`.

## Data in, transformations, out

**In** — the submit sessionModel: endpoint URL, dataset, organisation and geometry type carried over
from the async request params, plus four user-entered values (name, email, documentation URL,
licence confirmation).

**Out** — a Jira ticket with a CSV of the answers attached, an acknowledgement email, and a
reference number on screen.

Nothing is written to the platform by this service.

## Validation and errors

- Field rules in [fields.js](https://github.com/digital-land/submit/blob/main/src/routes/form-wizard/endpoint-submission-form/fields.js),
  messages in [validationMessageLookup](https://github.com/digital-land/submit/blob/main/src/filters/validationMessageLookup.js).
- `documentation-url` must be on a `gov.uk` or `org.uk` domain and link to a webpage, not a file.
- **`sameAsEndpoint`** — `datasetDetailsController` rejects a documentation URL that matches the
  `endpoint-url` in session. The source webpage must be the page that *links to* the endpoint.
- Every step guards on `requestId`; see [Preconditions](#preconditions).

## Datasette queries

This process reads almost nothing from datasette — its inputs come from the session and the async
request API. The exceptions are the organisation and dataset name mappings loaded at startup
(`orgIdToName`, `datasetSlugToReadableName`) and used to render answers.

## Testing

| Level | Files |
|---|---|
| Unit | `lpaDetailsController`, `datasetDetailsController`, `CheckAnswersController`, `jiraService` |
| Integration | `test/integration/check_to_submit.playwright.test.js` — the only end-to-end path in, since there are no deep links |
| Page objects | `confirmationPage` |

Local Jira credentials are covered in the root [readme.md](https://github.com/digital-land/submit/blob/main/readme.md).

See [architecture.md](https://digital-land.github.io/submit/tutorial-architecture.html#testing-and-local-development) for the general test setup.
