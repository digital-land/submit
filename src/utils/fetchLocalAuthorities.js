import axios from 'axios'

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
