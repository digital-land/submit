'use strict'

import MyController from './MyController.js'

class ErrorsController extends MyController {
  get (req, res, next) {
    const validationResult = req.sessionModel.get('validationResult')

    const { aggregatedIssues, issueCounts } = this.aggregateIssues(validationResult)

    const rows = Object.values(aggregatedIssues)

    req.form.options.rows = rows
    req.form.options.issueCounts = issueCounts
    req.form.options.columnNames = Object.keys(rows[0])
    // ToDo: should the api return the columns here?
    //  or should we get them from the specification?
    req.form.options.dataset = req.sessionModel.get('dataset')
    req.form.options.dataSubject = req.sessionModel.get('data-subject')

    super.get(req, res, next)
  }

  aggregateIssues (apiResponseData) {
    const aggregatedIssues = {}
    const issueCounts = {}

    apiResponseData['issue-log'].forEach(issue => {
      const entryNumber = issue['entry-number']

      const rowValues = apiResponseData['converted-csv'][issue['line-number'] - 2]
      if (!(entryNumber in aggregatedIssues)) {
        aggregatedIssues[entryNumber] = Object.keys(rowValues).reduce((acc, originalColumnName) => {
          const mappedColumnName = this.lookupMappedColumnNameFromOriginal(originalColumnName, apiResponseData['column-field-log'])
          acc[mappedColumnName] = {
            error: false,
            value: rowValues[originalColumnName]
          }
          return acc
        }, {})
      }

      if (entryNumber in aggregatedIssues) {
        aggregatedIssues[entryNumber][issue.field] = {
          error: this.lookupIssueType(issue['issue-type']),
          value: rowValues[this.lookupOriginalColumnNameFromMapped(issue.field, apiResponseData['column-field-log'])]
        }
        issueCounts[issue.field] = issueCounts[issue.field] ? issueCounts[issue.field] + 1 : 1
      }
    })

    return { aggregatedIssues, issueCounts }
  }

  lookupIssueType (issueType) {
    // this needs to be implemented once we know what the issue types are
    return issueType
  }

  lookupMappedColumnNameFromOriginal (originalColumnName, columnFieldLogs) {
    const columnFieldLog = columnFieldLogs.find(columnField => columnField.column === originalColumnName)
    let mappedColumnName = originalColumnName
    if (columnFieldLog) {
      mappedColumnName = columnFieldLog.field
    }
    return mappedColumnName
  }

  lookupOriginalColumnNameFromMapped (mappedColumnName, columnFieldLogs) {
    const columnFieldLog = columnFieldLogs.find(columnField => columnField.field === mappedColumnName)
    let originalColumnName = mappedColumnName
    if (columnFieldLog) {
      originalColumnName = columnFieldLog.column
    }
    return originalColumnName
  }
}

export default ErrorsController
