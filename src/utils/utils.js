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
        text: 'Article 4 direction dataset',
        available: true
      },
      {
        value: 'article-4-direction-area',
        text: 'Article 4 direction area dataset',
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
        text: 'Conservation area dataset',
        available: true
      },
      {
        value: 'conservation-area-document',
        text: 'Conservation area document dataset',
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
        text: 'Tree dataset',
        available: true,
        requiresGeometryTypeSelection: true
      },
      {
        value: 'tree-preservation-order',
        text: 'Tree preservation order dataset',
        available: true
      },
      {
        value: 'tree-preservation-zone',
        text: 'Tree preservation zone dataset',
        available: true
      }
    ]
  }
}

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
 * @param dataSubjects
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
