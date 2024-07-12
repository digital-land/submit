export default {
  getLpaOverview: async (lpa) => {
    return {
      data: {
        name: 'Borechester City Council',
        datasets: {
          'article-4-direction': {
            endpoint: null
          },
          'article-4-direction-area': {
            endpoint: null
          },
          'conservation-area': {
            endpoint: 'http://conservation-area.json',
            error: null,
            issue: 'Endpoint has not been updated since 21 May 2023'
          },
          'conservation-area-document': {
            endpoint: 'http://conservation-area-document.json',
            error: null,
            issue: null
          },
          'listed-building-outline': {
            endpoint: 'http://listed-building-outline.json',
            error: null,
            issue: null
          },
          tree: {
            endpoint: 'http://tree.json',
            error: null,
            issue: 'There are 20 issues in this dataset'
          },
          'tree-preservation-order': {
            endpoint: 'http://tree-preservation-order.json',
            error: 'Error connecting to endpoint',
            issue: null
          },
          'tree-preservation-zone': {
            endpoint: 'http://tree-preservation-zone.json',
            error: 'Error connecting to endpoint',
            issue: null
          }
        }
      }
    }
  }
}
