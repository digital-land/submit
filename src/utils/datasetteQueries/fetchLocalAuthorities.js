import datasette from '../../services/datasette.js'
import logger from '../logger.js'

/**
 * Fetches a list of local authority names from a specified dataset.
 *
 * This function queries a dataset for local authorities, extracting a distinct list of names.
 * It performs an HTTP GET request to retrieve the data, then processes the response to return
 * only the names of the local authorities.
 *
 * @returns {Promise<string[]>} A promise that resolves to an array of local authority names.
 * @throws {Error} Throws an error if the HTTP request fails or data processing encounters an issue.
 */
export const fetchLocalAuthorities = async () => {
  const sql = `select
      distinct provision.organisation,
      organisation.name,
      organisation.dataset
    from
      provision,
      organisation
    where
      provision.organisation = organisation.organisation
    order by
      provision.organisation`

  try {
    const response = await datasette.runQuery(sql)
    const names = response.formattedData.map(row => {
      if (row.name == null) {
        logger.debug('Null value found in response:', row)
        return null
      } else {
        return row.name
      }
    }).filter(name => name !== null) // Filter out null values
    return names
  } catch (error) {
    logger.warn(`fetchLocalAuthorities: Error fetching local authorities data: ${error.message}`, error)
    throw error
  }
}

export const fetchLocalAuthoritiesWithIdAndName = async () => {
  const sql = `select
      distinct(provision.organisation) as id,
      organisation.name as name
    from
      provision,
      organisation
    where
      provision.organisation = organisation.organisation
    order by
      provision.organisation`

  try {
    const response = await datasette.runQuery(sql)

    return response.formattedData.map(row => {
      if (row.name == null) {
        logger.debug('Null value found in response:', row)
        return null
      } else {
        return row
      }
    }).filter(row => row !== null) // Filter out null values
  } catch (error) {
    logger.warn(`fetchLocalAuthoritiesWithIdAndName: Error fetching local authorities data: ${error.message}`, error)
    throw error
  }
}
