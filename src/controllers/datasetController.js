'use strict'

import PageController from './pageController.js'

// ToDo: we shouldn't hardcode these values here, should we get them from the API
//  maybe take from specification
import { dataSubjects } from '../utils/utils.js'

class DatasetController extends PageController {
  get (req, res, next) {
    // const dataset = req.sessionModel.get('data-subject')
    // const options = datasetOptions[dataset]

    const options = [dataSubjects['Article 4'].dataSets[0], dataSubjects['Conservation area'].dataSets[0]]

    if (options) {
      this.availableDatasets = options.filter(option => option.available)
      req.form.options.datasetItems = options
      super.get(req, res, next)
    } else {
      // skip to next step of form wizard
      this.successHandler(req, res, next)
    }
  }
}

export default DatasetController
