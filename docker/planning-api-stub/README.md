# Planning Data API acceptance fixtures

CI mocks only these requests with real responses captured on 2026-09-15:

- Brownfield land dataset details (`/dataset/brownfield-land.json?exclude_field=entity-count`).
- Local planning groups (`/entity.json?prefix=local-planning-group&limit=100&offset=0`).
- Lambeth’s Brownfield land tasks (`/task.json?organisation=local-authority%3ALBH&dataset=brownfield-land&severity=error&task_source=issue&limit=100`).

The captured planning groups response fits on one page. Other Planning API GET
requests are proxied to the live platform. Datasette and the local async Request
API keep their existing configuration.

To refresh a fixture, fetch its mapping’s path and query parameters from
`https://www.planning.data.gov.uk` and save the successful JSON response to the
corresponding file in `__files`.
