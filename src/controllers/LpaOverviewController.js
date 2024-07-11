import performanceDbApi from '../services/performanceDbApi' // Assume you have an API service module

class LpaOverviewController {
  async getOverview (req, res, next) {
    try {
      const response = await performanceDbApi.getLpaOverview() // Make API request
      const data = response.data
      res.render('manage/lpa-overview.html', { data })
    } catch (error) {
      next(error)
    }
  }
}

export default LpaOverviewController
