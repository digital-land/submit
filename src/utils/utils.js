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
  'tree-preservation-order': {
    available: true,
    dataSets: [
      {
        value: 'tree-preservation-order',
        text: 'Tree preservation order dataset',
        available: true
      },
      {
        value: 'tree-preservation-zone',
        text: 'Tree preservation zone dataset',
        available: true
      },
      {
        value: 'tree',
        text: 'Tree dataset',
        available: true,
        requiresGeometryTypeSelection: true
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
        value: 'listed-building-outline',
        text: 'Listed building outline',
        available: true
      },
      {
        value: 'listed-building-grade',
        text: 'Listed building grade',
        available: false
      }
    ]
  }
}

export const finishedProcessingStatuses = [
  'COMPLETE',
  'FAILED'
]
