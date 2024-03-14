import { PageController } from './pageController.js'
import publishRequestApi from '../utils/publishRequestAPI.js'
import nunjucks from 'nunjucks'

class ResultsController extends PageController {
  async get (req, res, next) {
    super.get(req, res, next)
    try {
      const result = await publishRequestApi.getRequestData(req.params.id)

      if (result.status === 'complete') {
        const template = nunjucks.render('results', { data: result.data })
        res.send(template)
      } else {
        res.redirect(`/status/${req.params.result_id}`)
      }
    } catch (error) {
      next(error)
    }
  }
}

export default ResultsController
