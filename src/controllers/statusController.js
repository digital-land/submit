import { PageController } from './pageController.js'
import publishRequestApi from '../utils/publishRequestAPI.js'
import nunjucks from 'nunjucks'

class StatusController extends PageController {
  async get (req, res, next) {
    super.get(req, res, next)
    const result = await publishRequestApi.getRequestData(req.params.id)
    const template = nunjucks.render('status', { data: result.data })
    res.send(template)
  }
}

export default StatusController
