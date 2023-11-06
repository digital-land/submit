'use strict'

const { Controller } = require('hmpo-form-wizard')

class DatasetController extends Controller {
  get (req, res, next) {
    const json = req.sessionModel.get('validationResult')

    /* array of problematic rows
        each entry in this array should be in the shape
        {
            "entryNumber": 0,
            "columns": {

                "Reference": {
                    error: true,
                    value: '...'
                }
                "Name": {
                    error: false,
                    value: '...'
                }
                "Geometry": {
                    error: false,
                    value: '...'
                }
                "Start date": {
                    error: false,
                    value: '...'
                }
                "Legislation": {
                    error: false,
                    value: '...'
                }
                "Notes": {
                    error: false,
                    value: '...'
                }
                "Point": {
                    error: false,
                    value: '...'
                }
                "End date": {
                    error: false,
                    value: '...'
                }
                "Document URL": {
                    error: false,
                    value: '...'
                }
            }
        }
    */

    const aggregatedIssues = {}

    json['issue-log'].forEach(issue => {
      const entryNumber = issue['entry-number']

      if (!(entryNumber in aggregatedIssues)) {
        const rowColumns = json['converted-csv'][issue['line-number'] - 1]
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
          error: 'issue type: ' + issue['issue-type'],
          value: issue.value
        }
      }
    })

    const rows = Object.keys(aggregatedIssues).map(key => {
      return {
        entryNumber: key,
        columns: aggregatedIssues[key]
      }
    })

    req.form.options.rows = rows
    super.get(req, res, next)
  }
}

module.exports = DatasetController
