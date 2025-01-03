export const severityLevels = {
  notice: 'notice',
  informational: 'info',
  warning: 'warning',
  error: 'error'
}

export const dataSubjects = {
  'article-4-direction': {
    available: true,
    dataSets: [
      {
        value: 'article-4-direction',
        text: 'Article 4 direction',
        available: true
      },
      {
        value: 'article-4-direction-area',
        text: 'Article 4 direction area',
        available: true
      }
    ]
  },
  'brownfield-land': {
    available: true,
    dataSets: [
      {
        value: 'brownfield-land',
        text: 'Brownfield land',
        available: true
      },
      {
        value: 'brownfield-site',
        text: 'Brownfield site',
        available: false
      }
    ]
  },
  'conservation-area': {
    available: true,
    dataSets: [
      {
        value: 'conservation-area',
        text: 'Conservation area',
        available: true
      },
      {
        value: 'conservation-area-document',
        text: 'Conservation area document',
        available: true
      }
    ]
  },
  'listed-building': {
    available: true,
    dataSets: [
      {
        value: 'listed-building',
        text: 'Listed building',
        available: false
      },
      {
        value: 'listed-building-grade',
        text: 'Listed building grade',
        available: false
      },
      {
        value: 'listed-building-outline',
        text: 'Listed building outline',
        available: true
      }
    ]
  },
  'tree-preservation-order': {
    available: true,
    dataSets: [
      {
        value: 'tree',
        text: 'Tree',
        available: true,
        requiresGeometryTypeSelection: true
      },
      {
        value: 'tree-preservation-order',
        text: 'Tree preservation order',
        available: true
      },
      {
        value: 'tree-preservation-zone',
        text: 'Tree preservation zone',
        available: true
      }
    ]
  }
}

/**
 *
 * @param {typeof dataSubjects} dataSubjects
 * @returns {Map<string, {value: string, text: string, available: boolean, dataSubject: string, requiresGeometryTypeSelection?: boolean}>}
 */
export function makeDatasetsLookup (dataSubjects) {
  const lookup = new Map()
  for (const [key, dataSubject] of Object.entries(dataSubjects)) {
    for (const dataSet of dataSubject.dataSets) {
      lookup.set(dataSet.value, { ...dataSet, dataSubject: key })
    }
  }

  return lookup
}

/**
 * @type {Map<string, {value: string, text: string, available: boolean, dataSubject: string, requiresGeometryTypeSelection?: boolean}>}
 */
export const datasets = makeDatasetsLookup(dataSubjects)

/**
 *
 * @param {typeof dataSubjects} dataSubjects
 * @returns {FlatArray<*[], 1>[]} datasets sorted by 'text' property
 */
export function availableDatasets (dataSubjects) {
  const availableDataSubjects = Object.values(dataSubjects).filter(dataSubject => dataSubject.available)
  const dataSets = Object.values(availableDataSubjects).map(dataSubject => dataSubject.dataSets).flat()
  const availableDatasets = dataSets.filter(dataSet => dataSet.available)
  availableDatasets.sort((a, b) => a.text.localeCompare(b.text))
  return availableDatasets
}

export const finishedProcessingStatuses = [
  'COMPLETE',
  'FAILED'
]

export const allowedFileTypes = {
  csv: ['text/csv', 'text/plain', 'application/octet-stream', 'binary/octet-stream'],
  xls: ['application/vnd.ms-excel', 'application/octet-stream', 'binary/octet-stream'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/octet-stream', 'binary/octet-stream'],
  xml: ['application/xml', 'text/xml'],
  json: ['application/json', 'application/octet-stream', 'binary/octet-stream'],
  geojson: ['application/vnd.geo+json', 'application/octet-stream', 'binary/octet-stream', 'application/geo+json'],
  gml: ['application/gml+xml', 'application/octet-stream', 'binary/octet-stream'],
  gpkg: ['application/gpkg', 'application/octet-stream', 'binary/octet-stream'],
  sqlite: ['application/geopackage+sqlite3', 'application/octet-stream', 'binary/octet-stream'],
  zip: ['application/zip', 'application/octet-stream', 'binary/octet-stream']

}

/**
 * @typedef {Object} RequiredDataset
 * @property {string} dataset - The dataset identifier
 * @property {string} deadline - The deadline pattern in ISO format with YYYY placeholder
 * @property {number} noticePeriod - Number of months before deadline to show notice
 */

/** @type {RequiredDataset[]} */
export const requiredDatasets = [
  {
    dataset: 'brownfield-land',
    deadline: 'YYYY-12-31T23:59:59.000Z',
    noticePeriod: 4 // months
  }
]

/**
 * Calculates the deadline date and its historical dates (last year's deadline, two years ago's deadline)
 * based on the provided deadline string.
 *
 * @param {string} deadline - The deadline date string in the format 'YYYY-MM-DDTHH:MM:SSZ'
 * @returns {object} An object containing the calculated deadline dates:
 *   - deadlineDate: The calculated deadline date
 *   - lastYearDeadline: The deadline date one year ago from the calculated deadline date
 *   - twoYearsAgoDeadline: The deadline date two years ago from the calculated deadline date
 *
 * @example
 * const deadline = 'XXXX-03-15T14:30:00Z';
 * const deadlines = getDeadlineHistory(deadline);
 * console.log(deadlines);
 * // Output:
 * // {
 * //   deadlineDate: <Date>,
 * //   lastYearDeadline: <Date>,
 * //   twoYearsAgoDeadline: <Date>
 * // }
 */
export const getDeadlineHistory = (deadline) => {
  const deadlineRegex = /^.{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?Z$/

  if (!deadlineRegex.test(deadline)) {
    throw new Error(`Invalid deadline format. Expected 'YYYY-MM-DDTHH:MM:SSSZ', got '${deadline}'`)
  }

  const deadlineParts = deadline.split(/[-T:.Z]/)
  const currentDate = new Date()

  const deadlineDate = new Date(
    currentDate.getFullYear(), // year
    parseInt(deadlineParts[1], 10) - 1, // month (0-based)
    deadlineParts[2], // day
    deadlineParts[3], // hour
    deadlineParts[4], // minute
    deadlineParts[5] // second
  )

  const isDeadlineThisYear = deadlineDate <= currentDate

  if (isDeadlineThisYear) {
    deadlineDate.setFullYear(currentDate.getFullYear() + 1)
  }

  const lastYearDeadline = new Date(deadlineDate.getTime())
  lastYearDeadline.setFullYear(deadlineDate.getFullYear() - 1)

  const twoYearsAgoDeadline = new Date(lastYearDeadline.getTime())
  twoYearsAgoDeadline.setFullYear(lastYearDeadline.getFullYear() - 1)

  return {
    deadlineDate,
    lastYearDeadline,
    twoYearsAgoDeadline
  }
}

export const issueErrorMessageHtml = (errorMessage, issue) =>
  `${issue && issue.value ? issue.value : (issue && issue.length ? issue : '')}<p class="govuk-error-message">${errorMessage}</p>`
