import { describe, it } from 'vitest'
import { prepareDatasetEndpointIssueTemplateParams } from '../../../src/middleware/datasetEndpointIssue.middleware.js'
/** @typedef {import('../../../src/types/datasette.js').Types} Types */

/** @type {{orgInfo: Types.OrgInfo, dataset: Types.DatasetInfo, source: Types.Source}} */
const reqTemplate = {
  orgInfo: { name: 'Example Organisation', organisation: 'ORG' },
  dataset: { name: 'Example Dataset', dataset: 'some-dataset' },
  source: {
    endpoint: 'foo',
    endpoint_url: 'http://example.com/resource',
    status: null,
    days_since_200: 2,
    exception: 'Connection Error',
    latest_log_entry_date: '2024-09-09',
    resource_start_date: '2024-09-09',
    documentation_url: 'http://example.com/resource-docs'
  }
}

describe('The middleware', () => {
  it('prepares template params', ({ expect }) => {
    const req = structuredClone(reqTemplate)
    req.now = new Date('2024-09-10')
    prepareDatasetEndpointIssueTemplateParams(req, {}, () => {})

    expect(req.templateParams).toStrictEqual({
      organisation: req.orgInfo,
      dataset: req.dataset,
      errorData: {
        endpoint_url: req.source.endpoint_url,
        http_status: req.source.status,
        latest_log_entry_date: req.source.latest_log_entry_date,
        latest_200_date: '2024-12-10'
      }
    })
  })
})
