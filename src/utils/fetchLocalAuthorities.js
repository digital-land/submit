import axios from 'axios'

export default async () => {
  const url = 'https://www.planning.data.gov.uk/entity.json?dataset=local-authority&limit=500'
  try {
    const response = await axios.get(url)
    return response.data // Return the fetched data
  } catch (error) {
    console.error('Error fetching local authorities data:', error)
    throw error // Rethrow the error to be handled by the caller
  }
}
