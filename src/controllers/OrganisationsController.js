import datasette from '../services/datasette.js'
import performanceDbApi from '../services/performanceDbApi.js' // Assume you have an API service module
import logger from '../utils/logger.js'
import { dataSubjects } from '../utils/utils.js'

// get a list of available datasets
const availableDatasets = Object.values(dataSubjects)
  .flatMap(dataSubject =>
    dataSubject.dataSets
      .filter(dataset => dataset.available)
      .map(dataset => dataset.value)
  )

const organisationsController = {
  /**
   * Get LPA overview data and render the overview page
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   * @returns {Promise<void>} - Returns a promise that resolves when the overview page is rendered
   */
  async getOverview (req, res, next) {
    try {
      const lpa = req.params.lpa

      // Make API request
      const lpaOverview = await performanceDbApi.getLpaOverview(lpa)

      // restructure datasets to usable format
      const datasets = Object.entries(lpaOverview.datasets).map(([key, value]) => {
        return {
          slug: key,
          ...value
        }
      })

      // add in any of the missing key 8 datasets
      const keys = Object.keys(lpaOverview.datasets)
      availableDatasets.forEach(dataset => {
        if (!keys.includes(dataset)) {
          datasets.push({
            slug: dataset,
            endpoint: null
          })
        }
      })

      const totalDatasets = datasets.length
      const [datasetsWithEndpoints, datasetsWithIssues, datasetsWithErrors] = datasets.reduce((accumulator, dataset) => {
        if (dataset.endpoint !== null) accumulator[0]++
        if (dataset.issue) accumulator[1]++
        if (dataset.error) accumulator[2]++
        return accumulator
      }, [0, 0, 0])

      const params = {
        organisation: {
          name: lpaOverview.name
        },
        datasets,
        totalDatasets,
        datasetsWithEndpoints,
        datasetsWithIssues,
        datasetsWithErrors
      }

      res.render('organisations/overview.html', params)
    } catch (error) {
      logger.error(error)
      next(error)
    }
  },

  /**
   * Handles the GET /organisations request
   *
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  async getOrganisations (req, res, next) {
    try {
      const sql = 'select name, organisation from organisation'
      const result = await datasette.runQuery(sql)

      const sortedResults = result.formattedData.sort((a, b) => {
        return a.name.localeCompare(b.name)
      })

      const alphabetisedOrgs = sortedResults.reduce((acc, current) => {
        const firstLetter = current.name.charAt(0).toUpperCase()
        acc[firstLetter] = acc[firstLetter] || []
        acc[firstLetter].push(current)
        return acc
      }, {})

      res.render('organisations/find.html', { alphabetisedOrgs })
    } catch (err) {
      logger.warn(err)
      next(err)
    }
  }

}

export default organisationsController
