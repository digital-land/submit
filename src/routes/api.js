import express from 'express'
import { getRequestData } from '../services/asyncRequestApi.js'
import { shouldShowColumnMapping } from '../services/columnMappingDecider.js'
import { getBoundaryForLpa } from '../services/boundaryService.js'
import { getOsMapAccessToken } from '../services/osMapService.js'

const router = express.Router()

/**
 * Retrieves the status of a request by result ID.
 *
 * @route GET /status/:result_id
 * @param {express.Request} req - The Express request object, with the `result_id` parameter specifying the ID of the request to retrieve.
 * @param {express.Response} res - The Express response object.
 * @returns {Promise<object>} Returns a JSON object with the request data if successful.
 * If an error occurs, returns a JSON object with an error message and sets the HTTP status code to 500.
 */
router.get('/status/:result_id', async (req, res) => {
  res.set('Cache-Control', 'no-store')
  try {
    const resultData = await getRequestData(req.params.result_id)
    // serialize the result data (plain properties)
    const payload = { ...resultData }
    // compute whether we should show column mapping when the request finished
    if (typeof resultData.isComplete === 'function' && resultData.isComplete() && !resultData.isFailed?.()) {
      try {
        const show = await shouldShowColumnMapping(resultData, [])
        payload.showColumnMapping = show
        if (show) payload.columnMappingUrl = `/check/column-mapping/${resultData.id}`
      } catch (e) {
        // swallow and continue without the flag
      }
    }
    return res.json(payload)
  } catch (error) {
    return res.status(500).json({ error })
  }
})

/**
 * Retrieves the boundary data for a local planning authority (LPA) by boundary ID.
 *
 * @route GET /lpa-boundary/:boundaryId
 * @param {express.Request} req - The Express request object, with the `boundaryId` parameter specifying the boundary ID in the format `datasetId:lpaId`.
 * @param {express.Response} res - The Express response object.
 * @returns {Promise<object>} A JSON response with the boundary data and a 200 status code if successful.
 * If an error occurs, it returns a JSON response with an error message and a 500 status code.
 */
router.get('/lpa-boundary/:boundaryId', async (req, res) => {
  const response = await getBoundaryForLpa(req.params.boundaryId)

  return res
    .status(response?.error ? 500 : 200)
    .json(response)
})

router.get('/os/get-access-token', async (req, res) => {
  const response = await getOsMapAccessToken()
    .then(data => res.json(data))
    .catch(error => res.status(500).json({ error }))

  return response
})

export default router
