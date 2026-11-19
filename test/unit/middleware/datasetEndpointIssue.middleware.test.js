import { describe, it, vi } from 'vitest'
import { prepareDatasetEndpointIssueTemplateParams, renderDatasetEndpointIssueError } from '../../../src/middleware/datasetEndpointIssue.middleware.js'
import '../../../src/types/datasette.js'

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
  it('renders the dedicated 403 page for tasklist endpoint errors', ({ expect }) => {
    const req = {
      ...structuredClone(reqTemplate),
      source: { ...reqTemplate.source, status: 403 },
      session: {}
    }
    const res = { render: vi.fn() }
    const next = vi.fn()

    renderDatasetEndpointIssueError(req, res, next)

    expect(res.render).toHaveBeenCalledWith('check/error-redirect.html', {
      err: {
        message: 'We cannot access your endpoint URL',
        errorDetail: { errCode: '403' },
        organisationId: 'ORG',
        organisationName: 'Example Organisation'
      }
    })
    expect(req.session.ipInformation).toEqual({
      organisationId: 'ORG',
      organisationName: 'Example Organisation'
    })
    expect(next).not.toHaveBeenCalled()
  })

  it('prepares template params', ({ expect }) => {
    const req = structuredClone(reqTemplate)
    req.now = new Date('2024-12-12')
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
