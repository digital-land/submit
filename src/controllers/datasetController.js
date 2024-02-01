'use strict'

import PageController from './pageController.js'

// ToDo: we shouldn't hardcode these values here, should we get them from the API
//  maybe take from specification
import { dataSubjects } from '../utils/utils.js'

class DatasetController extends PageController {
  get (req, res, next) {
    // const dataset = req.sessionModel.get('data-subject')
    // const options = datasetOptions[dataset]

    // the options should be all the datasets that are available

    const availableDataSubjects = Object.values(dataSubjects).filter(dataSubject => dataSubject.available)
    const dataSets = Object.values(availableDataSubjects).map(dataSubject => dataSubject.dataSets).flat()
    const availableDatasets = dataSets.filter(dataSet => dataSet.available)

    req.form.options.datasetItems = availableDatasets
    super.get(req, res, next)
  }

  // we shouldn't need this here but as we dont currently set the datasubject, we need to do so here
  post (req, res, next) {
    const dataset = req.body.dataset
    // set the data-subject based on the dataset selected
    let dataSubject = ''
    for (const [key, value] of Object.entries(dataSubjects)) {
      if (value.dataSets.find(dataSet => dataSet.value === dataset)) {
        dataSubject = key
        break
      }
    }
    req.body['data-subject'] = dataSubject
    super.post(req, res, next)
  }
}

export default DatasetController
