'use strict'

import MyController from './MyController.js'

// ToDo: we shouldn't hardcode these values here, should we get them from the API
//  maybe take from specification
const datasetOptions = {
  'Article 4': [
    {
      value: 'article-4-direction',
      text: 'Article 4 direction dataset'
    },
    {
      value: 'article-4-direction area',
      text: 'Article 4 direction area dataset'
    }
  ],
  'Conservation area': [
    {
      value: 'conservation-area',
      text: 'Conservation area dataset'
    },
    {
      value: 'conservation-area-document',
      text: 'Conservation area document dataset'
    }
  ],
  'Tree preservation order': [
    {
      value: 'tree-preservation-order',
      text: 'Tree preservation order dataset'
    },
    {
      value: 'tree-preservation-zone',
      text: 'Tree preservation zone dataset'
    },
    {
      value: 'tree',
      text: 'Tree dataset'
    }
  ],
  'Listed building': false
}

class DatasetController extends MyController {
  get (req, res, next) {
    const dataset = req.sessionModel.get('data-subject')
    const options = datasetOptions[dataset]

    if (options) {
      this.availableDatasets = options
      req.form.options.datasetItems = options
      super.get(req, res, next)
    } else {
      // skip to next step of form wizard
      this.successHandler(req, res, next)
    }
  }
}

export default DatasetController
