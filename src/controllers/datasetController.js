'use strict'

const MyController = require('./MyController.js')

const datasetOptions = {
  'Article 4': [
    {
      value: 'Article 4 direction dataset',
      text: 'Article 4 direction dataset'
    },
    {
      value: 'Article 4 direction area dataset',
      text: 'Article 4 direction area dataset'
    }
  ],
  'Conservation area': [
    {
      value: 'Conservation area dataset',
      text: 'Conservation area dataset'
    },
    {
      value: 'Conservation area document dataset',
      text: 'Conservation area document dataset'
    }
  ],
  'Tree preservation order': [
    {
      value: 'Tree preservation order dataset',
      text: 'Tree preservation order dataset'
    },
    {
      value: 'Tree preservation zone dataset',
      text: 'Tree preservation zone dataset'
    },
    {
      value: 'Tree dataset',
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

module.exports = DatasetController
