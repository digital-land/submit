import performanceDbApi from '../services/performanceDbApi.js' // Assume you have an API service module

const LpaOverviewController = {
  async getOverview (req, res, next) {
    try {
      const lpa = req.params.lpa

      const response = await performanceDbApi.getLpaOverview(lpa) // Make API request
      const data = response.data

      const datasets = Object.entries(data.datasets).map(([key, value]) => {
        return { ...value, slug: key }
      })
      const totalDatasets = datasets.length
      const datasetsWithEndpoints = datasets.filter(item => item.endpoint !== null).length
      const datasetsWithIssues = datasets.filter(item => item.issue).length
      const datasetsWithErrors = datasets.filter(item => item.error).length

      const params = {
        organisation: {
          name: data.name
        },
        datasets,
        totalDatasets,
        datasetsWithEndpoints,
        datasetsWithIssues,
        datasetsWithErrors
      }

      res.render('manage/lpa-overview.html', params)
    } catch (error) {
      next(error)
    }
  }
}

export default LpaOverviewController
