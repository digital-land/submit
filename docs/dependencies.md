# Dependencies

What this service talks to, and the modules that do the talking. Per-process usage is noted in each
process doc; this page is the single reference for the dependency itself.

---

## Service modules

One row per module in [src/services/](https://github.com/digital-land/submit/blob/main/src/services).

| Module | Wraps | Used by |
|---|---|---|
| [asyncRequestApi.js](https://github.com/digital-land/submit/blob/main/src/services/asyncRequestApi.js) | async-request-backend | check, submit |
| [datasette.js](https://github.com/digital-land/submit/blob/main/src/services/datasette.js) | Datasette SQL over HTTP | all |
| [performanceDbApi.js](https://github.com/digital-land/submit/blob/main/src/services/performanceDbApi.js) | SQL builders over datasette | review-data-quality |
| [platformApi.js](https://github.com/digital-land/submit/blob/main/src/services/platformApi.js) | planning.data.gov.uk entity API | review-data-quality |
| [boundaryService.js](https://github.com/digital-land/submit/blob/main/src/services/boundaryService.js) | LPA boundary GeoJSON | check results map, dashboards |
| [osMapService.js](https://github.com/digital-land/submit/blob/main/src/services/osMapService.js) | OS Maps access token | map components |
| [jiraService.js](https://github.com/digital-land/submit/blob/main/src/services/jiraService.js) | Jira Service Desk | submit |
| [mailClient.js](https://github.com/digital-land/submit/blob/main/src/services/mailClient.js) | GOV.UK Notify | submit |
| [columnMappingDecider.js](https://github.com/digital-land/submit/blob/main/src/services/columnMappingDecider.js) | datasette issue-type query | check |

### asyncRequestApi

The check backend. `postUrlRequest(formData)` and `postFileRequest(formData)` create a request and
return its id; `getRequestData(resultId)` retrieves it, wrapped in a `RequestData` model. A 404 from
`getRequestData` is distinguished from other failures so callers can redirect rather than error.

Note that `getRequestData` uses a **hardcoded 15s axios timeout**, not
`config.asyncRequestApi.requestTimeout` — that setting is declared and schema-validated in
[config/util.js](https://github.com/digital-land/submit/blob/main/config/util.js) but read nowhere,
so changing it has no effect. Its `opts` parameter is also unused.

Request status is `PENDING`/`PROCESSING` until it reaches `COMPLETE` or `FAILED` — both count as
finished, which is why `isComplete()` returns true for a failed request and callers must check
`isFailed()` as well.

### jiraService

Creates a Service Desk customer request (`createCustomerRequest`) under
`config.jira.requestTypeId`, then attaches the answers CSV in two steps
(`attachTemporaryFile`, then attach to the issue) via `attachFileToIssue`. Non-production
environments use the same Jira instance and prefix ticket titles with `[TEST]`.

### Models

[models/requestData.js](https://github.com/digital-land/submit/blob/main/src/models/requestData.js) and
[models/responseDetails.js](https://github.com/digital-land/submit/blob/main/src/models/responseDetails.js) wrap async API payloads.

`RequestData` is the interface controllers should use rather than the raw payload — it tolerates
missing fields and logs when something is absent, instead of throwing halfway through a render.

| Method | Returns |
|---|---|
| `isComplete()` | status is `COMPLETE` **or** `FAILED` — i.e. processing has stopped |
| `isFailed()` | status is `FAILED` |
| `hasErrors()` | any task in the task log has `responsibility: 'external'` — the user's problem, not ours |
| `getError()` | the error object from the response |
| `getParams()` | the original request params: `dataset`, `organisationName` (org code), `url` or `original_filename`, `column_mapping` |
| `getType()` | `check_url` or the file equivalent — how submit knows an endpoint exists |
| `getColumnFieldLog()` | per-field column mapping, used by the column-mapping step |
| `fetchResponseDetails(offset, limit)` | paginated `ResponseDetails` for the results table |

## External dependencies

| Dependency | Used for | Health check |
|---|---|---|
| [async-request-backend](https://github.com/digital-land/async-request-backend) | running checks | `request-api` |
| [Datasette](https://datasette.planning.data.gov.uk) | all reference and performance data | `datasette` |
| Planning Data platform API | published entities and tasks | — |
| AWS S3 | uploaded files | `s3-bucket` |
| Redis | session store | `redis` (optional) |
| Jira Service Desk | provide requests | — |
| GOV.UK Notify | confirmation emails | — |
| OS Maps | basemap tiles | — |
| Sentry | error and metric reporting | — |
| Smartlook / Google Analytics | usage analytics | — |

[routes/health.js](https://github.com/digital-land/submit/blob/main/src/routes/health.js) checks the four marked above and reports `status`,
`environment`, `version` and `maintenance`.

**Hard** — the service is unusable without them: async-request-backend (no checks can run) and
datasette (no dataset, organisation or issue data, and the app will not boot because the startup
name queries fail).

**Soft** — degraded but working: Redis is explicitly optional and `setupSession` falls back to an
in-memory store, which means sessions are lost on restart and do not survive across instances;
S3 only affects file uploads; Jira and Notify only affect providing; OS Maps only affects map
rendering; Sentry and the analytics tools affect nothing user-facing.

## Datasette

### Client

[services/datasette.js](https://github.com/digital-land/submit/blob/main/src/services/datasette.js) exposes `runQuery(query, database)`, which
requests `${config.datasetteUrl}/${database}.json?sql=…`.

It returns the raw datasette response plus `formattedData` — the rows converted from positional
arrays into objects keyed by column name. Read `formattedData`; the raw `rows`/`columns` are rarely
what you want.

On failure it increments the `datasette_query_errors` Sentry counter, logs the query and URL, and
**rethrows**. Chains built with `fetchOne`/`fetchMany` turn that into an error page; direct callers
must handle it themselves.

Queries go in the URL, so very long generated SQL can hit URL length limits — watch for this when
building `IN` clauses from large lists.

### Databases

`digital-land` is the default and holds reference data (organisations, datasets, specification,
sources, endpoints). Entity and issue data lives in a database per dataset, passed as the second
argument to `runQuery`. Any query can be pasted into
[datasette.planning.data.gov.uk](https://datasette.planning.data.gov.uk) to check it by hand.

### Query modules

[utils/datasetteQueries/](https://github.com/digital-land/submit/blob/main/src/utils/datasetteQueries) — standalone queries:

| Module | Returns |
|---|---|
| `fetchDatasetCollections.js` | dataset → collection mapping |
| `fetchDatasetsFromProvisions.js` | datasets an organisation is expected to provide |
| `fetchLocalAuthorities.js` | LPA list |
| `getDatasetSlugNameMapping.js` | slug → readable name (loaded at startup) |
| `getOrganisationNameMapping.js` | org code → name (loaded at startup) |
| `endpointAlreadyCollected.js` | whether an endpoint URL is already collected |

Query **builders** for the dashboards live in [performanceDbApi.js](https://github.com/digital-land/submit/blob/main/src/services/performanceDbApi.js)
— see [review-data-quality](https://digital-land.github.io/submit/tutorial-review-data-quality.html).

### Caching

The dataset-slug and organisation-name mappings are loaded once at startup and held in memory —
they change rarely, and a restart is the way to pick up changes.

[utils/redisLoader.js](https://github.com/digital-land/submit/blob/main/src/utils/redisLoader.js) caches provision reasons and dataset names in
Redis with a 6-hour TTL (`CACHE_TTL`), and also holds the short-lived endpoint submission
reservations (`reserveSubmittedEndpoint`, `settleSubmittedEndpoint`) that stop the same endpoint
being submitted twice concurrently.

Nothing else is cached — dashboard queries hit datasette on every request.

## Digital Land repositories

| Repository | How this service uses it |
|---|---|
| [specification](https://github.com/digital-land/specification) | dataset fields and rules, read via datasette (`fetchSpecification`, `fetchDatasetFields`); relationship diagrams pulled at build time by [scripts/fetch-specification-diagrams.js](https://github.com/digital-land/submit/blob/main/scripts/fetch-specification-diagrams.js) using `config.specificationDiagrams.baseUrl` |
| [config](https://github.com/digital-land/config) | collection and pipeline configuration; surfaced through datasette. Endpoints provided through this service end up here, added by the data team |
| [async-request-backend](https://github.com/digital-land/async-request-backend) | runs the actual check |
| [config-manager](https://github.com/digital-land/config-manager) | the Manage service — where provided endpoints are configured |

### digital-land-python

**Not a direct dependency of this service.** This is a Node application; it has no Python runtime.
`digital-land-python` runs inside the async request backend and the collection pipelines. Check
results therefore reflect its behaviour without this codebase importing it.

When a check result looks wrong, the cause is usually there rather than here: issue types and their
severities, file conversion, field mapping and expectations are all produced by the pipeline code.
This service only renders what comes back.

## npm dependencies worth knowing

The ones that shape how the code is written, rather than just being present:

| Package | Shapes |
|---|---|
| `hmpo-form-wizard` | the whole structure of check and submit — steps, fields, session model |
| `hmpo-config` | YAML config loading and merging |
| `nunjucks` + `govuk-frontend` | all rendering; templates in `src/views` |
| `valibot` | schemas in `routes/schemas.js` and deep-link param validation |
| `multer` | file uploads |
| `maplibre-gl` + `wellknown` | maps and WKT geometry rendering |
| `winston` | structured logging via `utils/logger.js` and the types in `utils/logging.js` |
| `@sentry/node` | error reporting and the `Sentry.metrics.count` counters used for triage |
