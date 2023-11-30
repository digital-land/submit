export const severityLevels = {
  notice: 'notice',
  informational: 'info',
  warning: 'warning',
  error: 'error'
}

export const dataSubjects = {
  'Article 4': {
    available: true,
    dataSets: [
      {
        value: 'article-4-direction',
        text: 'Article 4 direction dataset',
        available: true
      },
      {
        value: 'article-4-direction area',
        text: 'Article 4 direction area dataset',
        available: false
      }
    ]
  },
  'Conservation area': {
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
        available: false
      }
    ]
  },
  'Tree preservation order': {
    available: false,
    dataSets: [
      {
        value: 'tree-preservation-order',
        text: 'Tree preservation order dataset',
        available: false
      },
      {
        value: 'tree-preservation-zone',
        text: 'Tree preservation zone dataset',
        available: false
      },
      {
        value: 'tree',
        text: 'Tree dataset',
        available: false
      }
    ]
  },
  'Listed building': {
    available: false,
    dataSets: []
  }
}
