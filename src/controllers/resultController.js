import PageController from './pageController.js'
import axios from 'axios'
import config from '../../config/index.js'

class ResultController extends PageController {

  url = config.requestApi.baseUrl + config.requestApi.requestsEndpoint

  async get (req, res, next) {
    const request = await this.getRequest(req.sessionModel.get('requestId'));
    res.locals.request = request;
    return super.get(req, res, next);
  }

  async getRequest(requestId) {
    const response = await axios.get(`${this.url}/${requestId}`, { timeout: config.requestApi.requestTimeout })
    return response.data;
  }

}

export default ResultController