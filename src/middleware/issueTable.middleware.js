import { fetchDatasetInfo, fetchEntityCount, fetchLatestResource, fetchOrgInfo, isResourceIdInParams, logPageError, takeResourceIdFromParams } from './common.middleware.js'
import { fetchIf, parallel, renderTemplate } from './middleware.builders.js'

const validateIssueTableQueryParams = (req, res, next) => {
  next()
}

const fetchEntitiesWithIssues = (req, res, next) => {
  next()
}

const prepareIssueTableTemplateParams = (req, res, next) => {
  const { issue_type: issueType } = req.params

  req.templateParams = {
    organisation: req.orgInfo,
    dataset: req.dataset,
    errorHeading: 'error Heading (ToDo)',
    issueItems: [],
    issueType,
    tableParams: {
      columns: ['col1', 'col2', 'col3'],
      rows: [
        {
          columns: {
            field1: {
              error: undefined,
              value: 'value11'
            },
            field2: {
              error: {
                message: 'error in value12'
              },
              value: 'value12'
            },
            field3: {
              error: undefined,
              value: 'value13'
            }
          }
        },
        {
          columns: {
            field1: {
              error: undefined,
              value: 'value21'
            },
            field2: {
              error: undefined,
              value: 'value22'
            },
            field3: {
              error: {
                message: 'error in value23'
              },
              value: 'value23'
            }
          }
        }
      ],
      fields: ['field1', 'field2', 'field3']
    }
  }
  next()
}

const getIssueTable = renderTemplate({
  templateParams: (req) => req.templateParams,
  template: 'organisations/issueTable.html',
  handlerName: 'getIssueTable'
})

export default [
  validateIssueTableQueryParams,
  parallel([
    fetchOrgInfo,
    fetchDatasetInfo
  ]),
  fetchIf(isResourceIdInParams, fetchLatestResource, takeResourceIdFromParams),
  parallel([
    fetchEntitiesWithIssues,
    fetchEntityCount
  ]),
  prepareIssueTableTemplateParams,
  getIssueTable,
  logPageError
]
