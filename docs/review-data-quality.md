# Review data quality

## Purpose

The LPA-facing dashboards. They show an organisation what data it has provided, what the platform
has done with it, and what is wrong — issues, endpoint errors and failed expectations — with a
route into [checking](https://digital-land.github.io/submit/tutorial-check-data.html) a corrected file from the
[get-started](https://digital-land.github.io/submit/tutorial-get-started.html) page.

Unlike check and provide, nothing here is a wizard: every page is a middleware chain that fetches,
transforms and renders.

Used by LPAs monitoring their own data and by the data team investigating a specific organisation
or dataset. The pages are public — there is no sign-in — so any organisation's data can be viewed
by anyone with the URL.

## Trigger and entry points

Router: [routes/organisations.js](https://github.com/digital-land/submit/blob/main/src/routes/organisations.js).
Chains are re-exported through [OrganisationsController.js](https://github.com/digital-land/submit/blob/main/src/controllers/OrganisationsController.js).

`router.use('/:lpa', validateOrg)` runs before every organisation-scoped route.

| Route | Chain |
|---|---|
| `/organisations` | [organisations.middleware.js](https://github.com/digital-land/submit/blob/main/src/middleware/organisations.middleware.js) |
| `/:lpa` | [lpa-overview.middleware.js](https://github.com/digital-land/submit/blob/main/src/middleware/lpa-overview.middleware.js) |
| `/:lpa/:dataset` | [datasetTaskList.middleware.js](https://github.com/digital-land/submit/blob/main/src/middleware/datasetTaskList.middleware.js) |
| `/:lpa/:dataset/overview` | [datasetOverview.middleware.js](https://github.com/digital-land/submit/blob/main/src/middleware/datasetOverview.middleware.js) |
| `/:lpa/:dataset/get-started` | [getStarted.middleware.js](https://github.com/digital-land/submit/blob/main/src/middleware/getStarted.middleware.js) — see [get-started](https://digital-land.github.io/submit/tutorial-get-started.html) |
| `/:lpa/:dataset/data[/:pageNumber]` | [dataview.middleware.js](https://github.com/digital-land/submit/blob/main/src/middleware/dataview.middleware.js) |
| `/:lpa/:dataset/endpoint-error/:endpoint` | [datasetEndpointIssue.middleware.js](https://github.com/digital-land/submit/blob/main/src/middleware/datasetEndpointIssue.middleware.js) |
| `/:lpa/:dataset/expectation/:expectation/entry` | [dataset-failed-expectation-entry.middleware.js](https://github.com/digital-land/submit/blob/main/src/middleware/dataset-failed-expectation-entry.middleware.js) |
| `/:lpa/:dataset/expectation/:expectation/entity[/:pageNumber]` | [dataset-failed-expectation-details.middleware.js](https://github.com/digital-land/submit/blob/main/src/middleware/dataset-failed-expectation-details.middleware.js) |
| `/:lpa/:dataset/:issue_type/:issue_field/entity[/:pageNumber]` | [entityIssueDetails.middleware.js](https://github.com/digital-land/submit/blob/main/src/middleware/entityIssueDetails.middleware.js) |
| `/:lpa/:dataset/:issue_type/:issue_field/entry[/:pageNumber]` | [entryIssueDetails.middleware.js](https://github.com/digital-land/submit/blob/main/src/middleware/entryIssueDetails.middleware.js) |
| `/:lpa/:dataset/:issue_type/:issue_field[/:pageNumber]` | [issueTable.middleware.js](https://github.com/digital-land/submit/blob/main/src/middleware/issueTable.middleware.js) |

> **Route order matters.** The `:issue_type/:issue_field` patterns are greedy — every specific
> route (`overview`, `get-started`, `data`, `endpoint-error`, `expectation`) must stay above them
> in the router, and `/:lpa/:dataset` and `/:lpa` must stay at the bottom. Adding a route in the
> wrong place silently routes it to the issue table.

## Code flow

The main path is **organisations list → LPA overview → dataset task list → issue table → issue
details**. Dataset overview, dataview, endpoint errors and expectation pages hang off the task
list.

### Chain shape

Every page is a default-exported array in `src/middleware/`, and they all follow the same shape:

```
validate params → fetch org/dataset → composites → paginate → prepare templateParams → render → logPageError
```

Read the array itself for the exact order — it is a plain ordered list and is always current.
The table below covers what the arrays do *not* tell you: which composites each chain pulls in, and
where a chain deviates from the shape.

| Chain | Composites | Worth knowing |
|---|---|---|
| [organisations](https://github.com/digital-land/submit/blob/main/src/middleware/organisations.middleware.js) | — | Redis-cached org list; the fetch and save steps are skipped via `onlyIf` on a cache hit |
| [lpa-overview](https://github.com/digital-land/submit/blob/main/src/middleware/lpa-overview.middleware.js) | — | four fetches run inside `parallel()`. Two steps are commented out pending [issue 824](https://github.com/digital-land/submit/issues/824), so **submission deadline notices are not shown anywhere** |
| [datasetTaskList](https://github.com/digital-land/submit/blob/main/src/middleware/datasetTaskList.middleware.js) | — | `prepareTasks` turns issue counts into tasks; the whole list is replaced by a single "Provide authoritative data" task when `authority === 'some'` |
| [datasetOverview](https://github.com/digital-land/submit/blob/main/src/middleware/datasetOverview.middleware.js) | Spec, Authoritative | entity count falls back to datasette when the platform API returns none |
| [issueTable](https://github.com/digital-land/submit/blob/main/src/middleware/issueTable.middleware.js) | Spec, Entities, Issues | **two redirect guards** — one before validation, one mid-chain — divert to the entity view when the issue type has entities. A page that unexpectedly redirects starts here |
| [entityIssueDetails](https://github.com/digital-land/submit/blob/main/src/middleware/entityIssueDetails.middleware.js) | Spec, Entities, Issues | `getSetDataRange(1)` — one entity per page |
| [entryIssueDetails](https://github.com/digital-land/submit/blob/main/src/middleware/entryIssueDetails.middleware.js) | Spec | no entity middlewares — goes to resource metadata and `fetchEntryIssues` instead. See [entity vs entry](#entity-vs-entry) |
| [dataview](https://github.com/digital-land/submit/blob/main/src/middleware/dataview.middleware.js) | Spec, Authoritative | entities come from `fetchEntitiesPlatformDb` (platform API), not datasette, so they are filtered by authority quality |
| [datasetEndpointIssue](https://github.com/digital-land/submit/blob/main/src/middleware/datasetEndpointIssue.middleware.js) | — | shortest chain: no pagination, no entities, renders the error template |
| [failed-expectation entry](https://github.com/digital-land/submit/blob/main/src/middleware/dataset-failed-expectation-entry.middleware.js) / [details](https://github.com/digital-land/submit/blob/main/src/middleware/dataset-failed-expectation-details.middleware.js) | Spec (entry only) | `validateExpectationsFailed` guards both; entity ids are deserialised out of the expectation record rather than queried |

Composite names are abbreviated above — see [Shared composites](#shared-composites).

#### Entity vs entry

The distinction to hold onto. An *entity* issue attaches to a record that made it onto the platform,
so the chain fetches entities and filters them by issue. An *entry* issue attaches to a row in the
provided resource that never became an entity, so the chain goes to the resource and its metadata
instead. `issueTable` redirects to the entity view when the issue type has entities.

### Shared composites

| Composite | Contains | Used by |
|---|---|---|
| `processSpecificationMiddlewares` | fetch specification, fallback, field mappings, build the specification table | issue table, issue details, dataview, overview, expectations |
| `processEntitiesMiddlewares` | fetch entities, extract JSON fields, replace underscores | issue table, entity issue details |
| `processRelevantIssuesMiddlewares` | fetch issues, add field mappings | issue table, entity issue details |
| `processAuthoritativeMiddlewares` | authority status and entity count from the platform API | dataview, dataset overview |

Order matters: `processRelevantIssuesMiddlewares` assumes entities are already on `req`, and
`processSpecificationMiddlewares` must run before anything builds a table.

Note that `removeIssuesThatHaveBeenFixed` is **commented out** of
`processRelevantIssuesMiddlewares` — it was too slow, and the problem it addressed had been seen
for only one organisation. Issue counts therefore include issues the provider may have already
fixed. The function and its unit tests still exist but nothing calls them.

## Data in, transformations, out

**In** — datasette for resources, issues, sources and specification; the platform API for entities,
tasks and authority status.

**Through** — resources → entities → issues, with helpers in
[getVerboseColumns.js](https://github.com/digital-land/submit/blob/main/src/utils/getVerboseColumns.js), [table.js](https://github.com/digital-land/submit/blob/main/src/utils/table.js),
[entities.js](https://github.com/digital-land/submit/blob/main/src/utils/entities.js) and [pagination.js](https://github.com/digital-land/submit/blob/main/src/utils/pagination.js).

**Out** — `templateParams`, validated against [routes/schemas.js](https://github.com/digital-land/submit/blob/main/src/routes/schemas.js)
outside production and staging, then rendered by nunjucks.

### Tasks and expectations

`prepareTasks` turns issue counts into the task list. Two things to know:

- If `authority === 'some'` the whole list is replaced by a single "Provide authoritative data"
  task linking to get-started — non-authoritative datasets never show individual issues.
- Task wording comes from `performanceDbApi.getTaskMessage`, which needs a row count. For issue
  types in `SPECIAL_ISSUE_TYPES` (currently `reference values are not unique`) the denominator is
  the resource's `entry_count` rather than the entity count, because the issue is about rows, not
  entities. `entityOutOfBoundsMessage` phrases the out-of-bounds case.

Out-of-bounds expectations are added as tasks only when `expectationOutOfBoundsTask` is enabled;
`expectations` and `expectationFetcher` in
[common.middleware.js](https://github.com/digital-land/submit/blob/main/src/middleware/common.middleware.js) fetch them.

## Validation and errors

- `validateOrg` on every `/:lpa` route — unknown organisation gives a 404.
- `validateQueryParams(schema)` per chain, with schemas in
  [routes/schemas.js](https://github.com/digital-land/submit/blob/main/src/routes/schemas.js) — invalid params give a 400.
- `show404IfPageNumberNotInRange` for out-of-range pagination.
- `fetchOne` 404s by default when no rows come back; overridden per call with
  `FetchOneFallbackPolicy`.
- `logPageError` terminates most chains.

## Datasette queries

Query builders in [performanceDbApi.js](https://github.com/digital-land/submit/blob/main/src/services/performanceDbApi.js):

| Builder | Returns |
|---|---|
| `lpaOverviewQuery` | per-dataset issue and endpoint summary for an organisation |
| `latestResourceQuery` / `latestResourcesQuery` | most recent resource(s) |
| `datasetErrorStatusQuery` | endpoint error status |
| `getEntitiesWithIssuesCountQuery` | entity issue counts |
| `getIssuesQuery` | issues for a resource, capped at `issuesQueryLimit` (1000) |
| `entityCountQuery` | entity count for a resource |

Inline SQL also lives in `fetchOne`/`fetchMany` call sites in
[common.middleware.js](https://github.com/digital-land/submit/blob/main/src/middleware/common.middleware.js) — `fetchResources`,
`fetchSources`, `fetchEntryIssues`, `fetchEntityIssueCounts`, `fetchEndpointSummary`.

Reference data (organisations, sources, specification) comes from the `digital-land` database;
issues and resources come from the per-dataset database, passed as the second argument to
`runQuery`.

Entity data comes from the **platform API** rather than datasette because the API applies authority
filtering and returns what is actually published; issues come from datasette because they are
pipeline output and are not exposed by the API. `dataview` uses both, which is why it has the
`onlyIf(entityCount === undefined, fetchEntityCount)` fallback — the API count is preferred, with
datasette as a backstop.

## Testing

| Level | Files |
|---|---|
| Unit | one file per chain under `test/unit/middleware` |
| Integration | `authoritative_data`, `planning_group`, `pages_load_ok` |
| Acceptance | `test/acceptance/dataset_overview.test.js` |
| Page objects | `organisationsPage`, `organisationOverviewPage`, `datasetOverviewPage`, `datasetIssuesPage`, `datasetTablePage` |

Because these chains set `templateParams` and schema validation is active in test, a mock that is
missing a field fails the test rather than rendering a broken page. Update the schema in
[routes/schemas.js](https://github.com/digital-land/submit/blob/main/src/routes/schemas.js) alongside the chain.

See [architecture.md](https://digital-land.github.io/submit/tutorial-architecture.html#testing-and-local-development) for the general test setup.
