import axios from 'axios'

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

  const url = `https://datasette.planning.data.gov.uk/digital-land.json?sql=${encodeURIComponent(sql)}`
  try {
    const response = await axios.get(url)
    const names = response.data.rows.map(row => {
      if (row[1] === null) {
        console.log('Null value found in response:', row)
        return null
      } else {
        return row[1]
      }
    }).filter(name => name !== null) // Filter out null values
    return names // Return the fetched data
  } catch (error) {
    console.error('Error fetching local authorities data:', error)
    throw error // Rethrow the error to be handled by the caller
  }
}
