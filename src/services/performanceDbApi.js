import datasette from './datasette.js'

/*

*/

export default {
  getLpaOverviewOld: async (lpa) => {
    return {
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
  },

  getLpaOverview: async (lpa) => {
    const query =
    `SELECT
        p.organisation,
        o.name,
        p.dataset,
        rle.endpoint
    FROM
        provision p
    INNER JOIN
        organisation o ON o.organisation = p.organisation
    LEFT JOIN
        reporting_latest_endpoints rle
        ON REPLACE(rle.organisation, '-eng', '') = p.organisation
        AND rle.pipeline = p.dataset
    WHERE p.organisation = '${lpa}'
    ORDER BY
        p.organisation,
        o.name`

    const result = await datasette.runQuery(query)

    const datasets = result.rows.reduce((accumulator, row) => {
      accumulator[row[2]] = {
        endpoint: row[3]
      }
      return accumulator
    }, {})

    return {
      name: result.rows[0][1],
      datasets
    }
  }
}
