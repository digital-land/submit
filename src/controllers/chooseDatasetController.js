import PageController from "./pageController.js";

import { dataSubjects } from "../utils/utils.js";

class ChooseDatasetController extends PageController {
    locals (req, res, next) {
        const availableDataSubjects = Object.values(dataSubjects).filter(dataSubject => dataSubject.available)
        const dataSets = Object.values(availableDataSubjects).map(dataSubject => dataSubject.dataSets).flat()
        const availableDatasets = dataSets.filter(dataSet => dataSet.available)
        availableDatasets.sort((a, b) => a.text.localeCompare(b.text))
    
        req.form.options.datasetItems = availableDatasets
    
        super.locals(req, res, next)
    }
}

export default ChooseDatasetController