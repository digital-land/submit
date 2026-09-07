# Architecture

How the application is put together. Read this before the process docs — they assume the
middleware, wizard and config concepts described here.

---

## Application structure

The app is an Express server rendering nunjucks templates. The
[readme](https://digital-land.github.io/submit/) has the route table and the `src/` directory map —
this page covers how the pieces behave rather than where they live.

Assembly is in [index.js](https://github.com/digital-land/submit/blob/main/index.js), 45 lines that
read top to bottom, calling one module per concern from
[src/serverSetup/](https://github.com/digital-land/submit/blob/main/src/serverSetup). Read it for the
order. What it does not tell you is which parts of that order are load-bearing:

- **The two filter initialisers are awaited before `express()` is called.** They run datasette
  queries whose results are registered as nunjucks filters, so a template rendered before they
  resolve would have no organisation or dataset names. If either query fails the process fails to
  boot — deliberately, rather than serving pages with names missing.
- **`setupMiddlewares` must precede `setupRoutes`.** Express applies middleware only to routes
  registered after it, so a global concern added below the routes silently does nothing.
- **`setupErrorHandlers` must be last, and `setupSentry` must come before it.** Error middleware is
  matched in registration order, so anything registered afterwards never sees the error.
- **`setupSession` is the only async step**, because it connects to Redis. It falls back to an
  in-memory store on failure, so an unavailable Redis does not stop the app booting — see
  [Session storage](#session-storage).

### Session storage

[serverSetup/session.js](https://github.com/digital-land/submit/blob/main/src/serverSetup/session.js)
uses `connect-redis` when a `redis` block is present in config, falling back to an in-memory store
if the connection fails. The fallback keeps the app running, but sessions are then lost on restart
and are not shared between instances — a user mid-journey on a multi-instance environment can be
bounced back to the start.

Cookies last 7 days, are `httpOnly` and `sameSite: lax`, and are marked `secure` only in production
and staging (`config.secureCookies`).

The signing secret comes from `SESSION_SECRET`, defaulting to `'keyboard cat'` if unset — fine
locally, but it means a deployed environment missing that variable signs sessions with a
publicly-known key.

## Global middleware

Applied to every request, in this order, by `setupMiddlewares`:

1. Request logger — logs method, endpoint and a **hashed** session id ([utils/hasher.js](https://github.com/digital-land/submit/blob/main/src/utils/hasher.js))
2. Security headers — `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`
3. Static mounts — `/assets` (govuk-frontend, x-govuk components), `/public`, `/robots.txt`
4. `cookieParser`
5. `bodyParser.urlencoded`
6. `preventIndexing` ([common.middleware.js](https://github.com/digital-land/submit/blob/main/src/middleware/common.middleware.js))
7. Maintenance guard — renders 503 when `config.maintenance.serviceUnavailable` is set

Only add here what genuinely applies to every request, including static assets and `/health`.
Anything page- or process-specific belongs in a route chain.

## Middleware

Routes are chains of small middleware functions, built with the helpers in
[middleware.builders.js](https://github.com/digital-land/submit/blob/main/src/middleware/middleware.builders.js)
and drawing on the shared middleware in
[common.middleware.js](https://github.com/digital-land/submit/blob/main/src/middleware/common.middleware.js).

The conventions for writing one — chain shape, separating fetches from transforms, `templateParams`,
schemas and errors — plus a reference for every builder and shared composite, are in
[Middleware guidelines](https://digital-land.github.io/submit/tutorial-middleware-guidelines.html).
Read that before adding a route.

## Form wizards

Both `/check` and `/submit` are [hmpo-form-wizard](https://github.com/UKHomeOffice/passports-form-wizard)
wizards, mounted with `wizard(steps, fields, { name, csrf: false })`.

### Step configuration

| Key | Effect |
|---|---|
| `controller` | the step's controller class; defaults to `PageController` |
| `fields` | field names from `fields.js` that this step reads and writes to the sessionModel |
| `next` | next step — a string, a function `(req, res) => path`, or an array of `{ field, op, value, next }` conditions with a plain string as the fallback |
| `template` | template to render; omit to use the step name, or set `undefined` to let the controller choose |
| `backLink` | explicit back link, overriding the journey history |
| `entryPoint` | the step can be entered directly, without prior journey history |
| `resetJourney` / `reset` | clears journey history / session values on entry |
| `skip` | renders nothing — the controller redirects (used by `/check/link`) |
| `noPost` | GET only |
| `checkJourney` | whether hmpo enforces that prior steps were completed. **Set to `false` almost everywhere here**, because results pages are shareable and deep links skip steps |
| `forwardQuery` | preserve query params across the redirect to the next step |

### PageController

[controllers/pageController.js](https://github.com/digital-land/submit/blob/main/src/controllers/pageController.js) is the base class every step
controller extends. The hooks that matter:

- **`get` / `post`** — the usual request handling. `submitUrlController`, `uploadFileController` and
  `CheckAnswersController` override `post` to call an external service before continuing.
- **`locals`** — adds template variables; the base class computes the back link here.
- **`errorHandler`** — catches `SESSION_TIMEOUT` and redirects to `/` instead of a 500.
- **`middlewareSetup`** — lets a controller push extra middleware into its own chain.
  `statusController` uses it to run `processSpecificationMiddlewares`.

### Session model vs raw session

`req.sessionModel` is **per wizard**. `req.session` is shared across both. The check wizard hands
over to submit through the raw session:

| Key | Set by | Read by |
|---|---|---|
| `upload-method` | check sessionModel — hmpo field, deep link controller, or `updateSessionFromRequestData` | `checkConfirmationController` |
| `request_id` | check sessionModel — `submitUrlController` / `uploadFileController` / `updateSessionFromRequestData` | `checkConfirmationController` |
| `req.session.checkRequestId` | `checkConfirmationController` (raw session) | `lpaDetailsController` |
| `requestId`, `lpa`, `orgId`, `dataset`, `endpoint-url`, `geomType` | submit sessionModel — `lpaDetailsController`, from the async API params | `datasetDetailsController`, `CheckAnswersController`, templates |

The bridge exists because these were originally two independent wizards, and a sessionModel cannot
be read across wizard boundaries. Both `steps.js` files carry a TODO to merge them, which would
remove `checkRequestId` entirely. Until then, treat the raw session key as the one supported way to
pass state between them, and do not add more.

### Session failure modes

- **`SESSION_TIMEOUT`** — thrown by hmpo on any mid-wizard page when the session has expired.
  Caught by `PageController.errorHandler` and redirected to `/` rather than a 500.
- **Stale session on `/check/confirmation`** — `upload-method` is absent, so the "Provide your data"
  button does not render and the user must re-run the check.
- **Stale session on any submit page** — the controllers guard on `requestId` and redirect to
  `/check/url`, which is itself mid-wizard, so a stale check session bounces the user to `/`.

## Error handling

[utils/errors.js](https://github.com/digital-land/submit/blob/main/src/utils/errors.js) defines `MiddlewareError(message, statusCode, options)`.
`statusCode` must be a number — the constructor throws otherwise. `options.template` overrides the
default `errorPages/error.njk`; `options.cause` preserves the original error.

The handler in [serverSetup/errorHandlers.js](https://github.com/digital-land/submit/blob/main/src/serverSetup/errorHandlers.js):

1. Logs the error with method, endpoint and stack.
2. Delegates to `next(err)` if headers were already sent.
3. Redirects if the error carries `err.redirect` — the escape hatch hmpo uses for `SESSION_TIMEOUT`.
4. Wraps anything that is not a `MiddlewareError` as a 500, then renders its template with
   `errorTemplateContext()` (environment and support email).
5. Falls back to rendering `errorPages/error.njk` as a 500 if that render itself throws.

## Configuration

[config/index.js](https://github.com/digital-land/submit/blob/main/config/index.js) loads YAML through `hmpo-config`: `combineConfigs(environment)`
then `validateConfig`. Environment comes from `NODE_ENV` or `ENVIRONMENT`, defaulting to `production`.

| File | Used when |
|---|---|
| [default.yaml](https://github.com/digital-land/submit/blob/main/config/default.yaml) | always, as the base |
| `local`, `development`, `staging`, `production` | per environment |
| `test`, `ci`, `acceptanceTests`, `wiremock` | test runs |

Settings worth knowing:

| Setting | Used for |
|---|---|
| `asyncRequestApi.{url,requestsEndpoint,requestTimeout}` | the check backend |
| `datasetteUrl` | every datasette query |
| `serviceNames.{check,submit,manage}` | page titles and headers per service area |
| `maintenance.{serviceUnavailable,upTime}` | the global 503 guard |
| `aws.{region,bucket,endpoint}` | uploaded file storage |
| `validations.maxFileSize` | upload limit (100MB) |
| `tablePageLength` | rows per page on dashboard tables (50) |
| `checkService.userAgent` | User-Agent sent when fetching user-supplied URLs |
| `email.templates`, `email.dataManagementEmail` | GOV.UK Notify |
| `jira.requestTypeId` | provide requests |
| `contact.issues.email` | support address on error pages |

### Dataset configuration

`datasetsConfig` maps each dataset to a `guidanceUrl` and an `entityDisplayName` (`base` +
`variable`, used to phrase issue messages naturally). Read through
[filters/getDatasetConfig.js](https://github.com/digital-land/submit/blob/main/src/filters/getDatasetConfig.js).

`organisationTypes` is unrelated to the dataset list: it filters the **organisations** page, whose
query matches organisation ids by prefix (`local-authority:`, `national-park-authority:`,
`development-corporation:`).

### How the dataset list is built

The list of datasets the service offers is not hardcoded — it is derived from the platform's
provision data at runtime, and this is worth understanding because "why is dataset X missing?" is a
common question with a non-obvious answer.

| Stage | What happens |
|---|---|
| Fetch | [fetchDatasetsFromProvisions.js](https://github.com/digital-land/submit/blob/main/src/utils/datasetteQueries/fetchDatasetsFromProvisions.js) runs `SELECT DISTINCT dataset, provision_reason FROM provision` on datasette and keeps rows whose reason is in `config.provisionReasons` (`statutory`, `prospective`, `expected`, `encouraged`) |
| Name | Each slug is resolved to a readable name by the `datasetSlugToReadableName` filter |
| Group | [`makeDatasetSubjectMap`](https://github.com/digital-land/submit/blob/main/src/utils/datasetSubjectLoader.js) groups datasets by **collection**, using the collection mapping from datasette. A dataset mapped to an empty collection is grouped under `other` |
| Cache | The result is cached in Redis for 60 seconds in `local`/`development` and 1 hour elsewhere |

Note that this list is **global, not per-organisation** — the provision query does not filter by
organisation, so every organisation is offered the same datasets in the check tool.

Two special cases are applied during grouping: `tree` is flagged
`requiresGeometryTypeSelection`, which is what drives the extra geometry-type step in the check
wizard, and **a dataset with no collection mapping is dropped silently**. If a dataset is missing
from the list, that is the first thing to check.

There are three fallbacks, each of which changes what the user sees without failing:

| Condition | Falls back to |
|---|---|
| `provisionBasedDatasets` feature flag off | the hardcoded keys of `config.datasetsConfig` |
| Provision query throws | the hardcoded keys of `config.datasetsConfig` |
| Collection mapping unavailable | `fallbackDataSubjects`, a hardcoded map in `datasetSubjectLoader.js` |
| Redis unavailable | no cache — the list is rebuilt on every request |

Consumers reach the list through `getDataSubjects()` / `getDatasets()` in
[utils/utils.js](https://github.com/digital-land/submit/blob/main/src/utils/utils.js): the check
wizard's dataset step, deep-link validation, and `setAvailableDatasets` on the dashboards.

### Feature flags

`config.features`, read through `isFeatureEnabled` in [utils/features.js](https://github.com/digital-land/submit/blob/main/src/utils/features.js).
An unknown flag returns `false`.

| Flag | Gates | Default |
|---|---|---|
| `checkIssueDetailsPage` | per-issue links on check results | on |
| `expectationOutOfBoundsTask` | out-of-bounds expectations as dashboard tasks | on |
| `provisionBasedDatasets` | loading datasets from provision reasons | on |
| `nonAuthPages` | showing non-authoritative datasets | on |

`submitEndpointForm` is declared in every config file but **read nowhere in `src/`** — despite the
"feature flagged routes" comment in `routes.js`, `/submit` is mounted unconditionally. Treat it as
dead config until it is either wired up or removed.

### Secrets

From `.env` locally ([.env.example](https://github.com/digital-land/submit/blob/main/.env.example)), injected as environment variables in deployed
environments: `SESSION_SECRET`, `SENTRY_DSN`, `GOVUK_NOTIFY_API_KEY`, `DATA_MANAGEMENT_EMAIL`,
`JIRA_URL`, `JIRA_API_KEY`, `JIRA_SERVICE_DESK_ID`, plus the standard AWS variables.

## Testing and local development

See the root [readme.md](https://github.com/digital-land/submit/blob/main/readme.md) for installation and how to start the app. This section
covers the test setup only.

| Directory | Contains | Runner |
|---|---|---|
| `test/unit` | controllers, middleware, services, filters | vitest |
| `test/integration` | browser journeys against a running app | playwright |
| `test/acceptance` | journeys against a deployed environment | playwright |
| `test/PageObjectModels` | page objects shared by the playwright tests | — |
| `test/mock-api` | stub of the async request backend (`npm run mock:api`) | — |
| `test/testContainers` | localstack container setup for S3 | — |
| `test/datafiles` | sample CSVs used as check inputs | — |

Commands: `npm test` (unit + integration), `npm run test:unit`, `npm run test:integration`,
`npm run test:acceptance`, `npm run test:coverage`.

Backing services, in increasing order of realism: the mock API for unit-ish work, `NODE_ENV=wiremock`
(`npm run start:wiremock`) for pre-baked API responses, and `npm run dev` for real containers.

Lint with `npm run lint` (`standard`); husky runs it pre-commit.

Note that template param schemas are validated outside production and staging, so a test with bad
mock data fails loudly rather than rendering something wrong.

Per-process test notes live in each process doc.
