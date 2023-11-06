'use strict'

const { Controller } = require('hmpo-form-wizard')

class DatasetController extends Controller {
  get (req, res, next) {
    const json = req.sessionModel.get('validationResult')

    const aggregatedIssues = {}
    const issueCounts = {}

    json['issue-log'].forEach(issue => {
      const entryNumber = issue['entry-number']

      const rowColumns = json['converted-csv'][issue['line-number'] - 1]
      if (!(entryNumber in aggregatedIssues)) {
        aggregatedIssues[entryNumber] = Object.keys(rowColumns).reduce((acc, key) => {
          acc[key] = {
            error: false,
            value: rowColumns[key]
          }
          return acc
        }, {})
      }

      if (entryNumber in aggregatedIssues) {
        aggregatedIssues[entryNumber][issue.field] = {
          error: issue['issue-type'],
          value: rowColumns[issue.field]
        }
        issueCounts[issue.field] = issueCounts[issue.field] ? issueCounts[issue.field] + 1 : 1
      }
    })

    const rows = Object.keys(aggregatedIssues).map(key => {
      return {
        entryNumber: key,
        columns: aggregatedIssues[key]
      }
    })

    req.form.options.rows = rows
    req.form.options.issueCounts = issueCounts
    req.form.options.dataset = req.sessionModel.get('dataset')
    req.form.options.dataSubject = req.sessionModel.get('data-subject')

    super.get(req, res, next)
  }
}

module.exports = DatasetController
