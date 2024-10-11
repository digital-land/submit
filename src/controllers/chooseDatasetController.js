import PageController from './pageController.js'

import { dataSubjects, availableDatasets } from '../utils/utils.js'

class ChooseDatasetController extends PageController {
  locals (req, res, next) {
    req.form.options.datasetItems = availableDatasets(dataSubjects)
    super.locals(req, res, next)
  }
}

export default ChooseDatasetController
