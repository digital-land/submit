'use strict'

const MyController = require('./MyController')

const datasetOptions = {
  'Article 4': [
    {
      value: 'article-4-direction',
      text: 'Article 4 direction'
    },
    {
      value: 'article-4-direction area',
      text: 'Article 4 direction area'
    }
  ],
  'Conservation area': [
    {
      value: 'conservation-area',
      text: 'Conservation area'
    },
    {
      value: 'conservation-area-document',
      text: 'Conservation area document'
    }
  ],
  'Tree preservation order': [
    {
      value: 'tree-preservation-order',
      text: 'Tree preservation order'
    },
    {
      value: 'tree-preservation-zone',
      text: 'Tree preservation zone'
    },
    {
      value: 'tree',
      text: 'Tree'
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
