import performanceDbApi from '../services/performanceDbApi.js' // Assume you have an API service module
import logger from '../utils/logger.js'

const LpaOverviewController = {
  async getOverview (req, res, next) {
    try {
      const lpa = req.params.lpa

      const lpaOverview = await performanceDbApi.getLpaOverview(lpa) // Make API request

      const datasets = Object.entries(lpaOverview.datasets).map(([key, value]) => {
        return { ...value, slug: key }
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

      res.render('manage/lpa-overview.html', params)
    } catch (error) {
      logger.error(error)
      next(error)
    }
  }
}

export default LpaOverviewController
