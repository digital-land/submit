'use strict'

const MyController = require('./MyController')

class ErrorsController extends MyController {
  // ToDo: Not happy with this implementation, it's too complex, needs refactoring. can look at this after the demo
  get (req, res, next) {
    const json = req.sessionModel.get('validationResult')

    const aggregatedIssues = {}
    const issueCounts = {}

    json['issue-log'].forEach(issue => {
      const entryNumber = issue['entry-number']

      const rowValues = json['converted-csv'][issue['line-number'] - 2]
      if (!(entryNumber in aggregatedIssues)) {
        aggregatedIssues[entryNumber] = Object.keys(rowValues).reduce((acc, originalColumnName) => {
          const mappedColumnName = this.lookupMappedColumnNameFromOriginal(originalColumnName, json['column-field-log'])
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
          value: rowValues[this.lookupOriginalColumnNameFromMapped(issue.field, json['column-field-log'])]
        }
        issueCounts[issue.field] = issueCounts[issue.field] ? issueCounts[issue.field] + 1 : 1
      }
    })

    const rows = Object.keys(aggregatedIssues).map(entryNumber => {
      return {
        entryNumber,
        columns: aggregatedIssues[entryNumber]
      }
    })

    req.form.options.rows = rows
    req.form.options.issueCounts = issueCounts
    req.form.options.columnNames = Object.keys(rows[0].columns) // ToDo: should the api return the columns here?
    req.form.options.dataset = req.sessionModel.get('dataset')
    req.form.options.dataSubject = req.sessionModel.get('data-subject')

    super.get(req, res, next)
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

module.exports = ErrorsController
