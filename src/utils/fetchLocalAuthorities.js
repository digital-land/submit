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
export default async () => {
  // const url = 'https://www.planning.data.gov.uk/entity.json?dataset=local-authority&limit=500'
  const url = 'https://datasette.planning.data.gov.uk/digital-land.json?sql=select%0D%0A++distinct+provision.organisation%2C%0D%0A++organisation.name%2C%0D%0A++organisation.dataset%0D%0Afrom%0D%0A++provision%2C%0D%0A++organisation%0D%0Awhere%0D%0A++provision.organisation+%3D+organisation.organisation%0D%0Aorder+by%0D%0A++provision.organisation'
  try {
    const response = await axios.get(url)
    const names = response.data.rows.map(row => row[1])
    return names // Return the fetched data
  } catch (error) {
    console.error('Error fetching local authorities data:', error)
    throw error // Rethrow the error to be handled by the caller
  }
}
