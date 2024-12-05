import express from 'express'
import { getRequestData } from '../services/asyncRequestApi.js'
import { getBoundaryForLpa } from '../services/boundaryService.js'

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
  const response = getRequestData(req.params.result_id)
    .then(data => res.json(data))
    .catch(error => res.status(500).json({ error }))

  return response
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

export default router
