// this file is being used to emulate an eventual db table.

import csv from 'csv-parser' // ToDo: remember to remove this from package.json when we move away from csv
import fs from 'fs'

const messages = {}

fs.createReadStream('src/utils/issueMessages/messages.csv')
  .pipe(csv())
  .on('data', (row) => {
    messages[row.issue_type] = {
      singular: row.singular_message,
      plural: row.plural_message.replace('{num_issues}', '{}')
    }
  })
  .on('end', () => {
    // Messages object is now populated
  })

function getTaskMessage (issueType, issueCount) {
  if (!messages[issueType]) {
    throw new Error(`Unknown issue type: ${issueType}`)
  }

  const message = issueCount === 1 ? messages[issueType].singular : messages[issueType].plural
  return message.replace('{}', issueCount)
}

function getStatusTag (status) {
  const statusToTagClass = {
    Error: 'govuk-tag--red',
    'Needs fixing': 'govuk-tag--yellow',
    Warning: 'govuk-tag--blue'
  }

  return {
    tag: {
      text: status,
      classes: statusToTagClass[status]
    }
  }
}

function getTaskList (issues) {
  return issues.map((issue) => {
    return {
      title: {
        text: getTaskMessage(issue.issue_type, issue.num_issues)
      },
      href: 'toDo',
      status: getStatusTag(issue.status)
    }
  })
}

export default getTaskList
