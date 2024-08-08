'use strict'

import PageController from './pageController.js'

// ToDo: we shouldn't hardcode these values here, should we get them from the API
//  maybe take from specification
import { dataSubjects } from '../utils/utils.js'
import datasette from '../services/datasette.js'
import logger from '../utils/logger.js'

class DatasetController extends PageController {
  async locals (req, res, next) {
    // const availableDataSubjects = Object.values(dataSubjects).filter(dataSubject => dataSubject.available)
    // const dataSets = Object.values(availableDataSubjects).map(dataSubject => dataSubject.dataSets).flat()
    // const availableDatasets = dataSets.filter(dataSet => dataSet.available)
    // availableDatasets.sort((a, b) => a.text.localeCompare(b.text))

    const datasets = await datasette.runQuery(`select
        d.name,
        d.dataset,
        s.specification,
        specification_status
      from
        dataset d
        LEFT JOIN specification_dataset sd ON d.dataset = sd.dataset
        LEFT JOIN specification s ON sd.specification = s.specification
      WHERE
        specification_status in (
          'candidate-standard',
          'open-standard',
          'piloting'
        )`)

    const availableDatasets = datasets.formattedData.map((dataset) => {
      const value = dataset.dataset

      let text

      if (dataset.name && dataset.name.trim()) {
        text = dataset.name
      } else {
        text = dataset.dataset
        logger.warn(`Missing name value for the dataset ${dataset.dataset}`)
      }

      return { text, value }
    })

    req.form.options.datasetItems = availableDatasets

    super.locals(req, res, next)
  }

  // we shouldn't need this here but as we dont currently set the datasubject, we need to do so here
  async post (req, res, next) {
    const dataset = req.body.dataset

    const result = await datasette.runQuery(`select collection FROM dataset WHERE dataset = '${dataset}'`)

    req.body['data-subject'] = result.formattedData[0].collection

    super.post(req, res, next)
  }

  requiresGeometryTypeToBeSelected (req) {
    const dataset = req.body.dataset

    if (!dataset) {
      return false
    }

    const dataSubject = Object.values(dataSubjects).find(dataSubject => dataSubject.dataSets.find(dataSet => dataSet.value === dataset))
    if (!dataSubject) {
      return false
    }
    const dataSet = dataSubject.dataSets.find(dataSet => dataSet.value === dataset)
    return dataSet.requiresGeometryTypeSelection || false
  }
}

export default DatasetController
