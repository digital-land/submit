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

  async getOrganisations (req, res, next) {
    res.render('organisations/find.html')
  },

  async getGetStarted (req, res, next) {

    const params = {
      organisation: {
        "organisation": "local-authority:ADU",
        "name": "Adur District Council",
        "dataset": "local-authority"
      },
      dataset: {
        "attribution": "historic-england",
        "collection": "historic-england",
        "consideration": "world-heritage-sites",
        "dataset": "world-heritage-site-buffer-zone",
        "description": "",
        "end_date": "",
        "entry_date": "",
        "github_discussion": "",
        "key_field": "",
        "entity_minimum": 16110000,
        "entity_maximum": 16129999,
        "licence": "ogl3",
        "name": "World heritage site buffer zone",
        "paint_options": "{ \"colour\": \"#EB1EE5\", \"opacity\": 0.2 }",
        "plural": "World heritage site buffer zones",
        "phase": "beta",
        "prefix": "",
        "realm": "dataset",
        "replacement_dataset": "",
        "start_date": "",
        "text": "A [World Heritage Site](/dataset/world-heritage-site) may have a [buffer zone](https://whc.unesco.org/en/series/25/) with implications for planning.",
        "typology": "geography",
        "version": "1.0",
        "wikidata": "Q9259",
        "wikipedia": "World_Heritage_Site"
    }
  }

    res.render('organisations/get-started.html', params)
  }
}

export default organisationsController
