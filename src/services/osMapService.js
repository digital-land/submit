const OS_MAP_API_TOKEN_URL = 'https://planning.data.gov.uk/os/getToken'

export async function getOsMapAccessToken () {
  return fetch(OS_MAP_API_TOKEN_URL).then(res => res.json())
}
