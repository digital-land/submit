// copied from https://github.com/digital-land/digital-land.info/blob/main/assets/javascripts/osApiToken.js

/* const OS_API_TOKEN_URL = 'https://planning.data.gov.uk/os/getToken' // @todo - check with infrastructure team if this is okay to use
const apiToken = {
  access_token: 'm8BKTTRw1tx7TWTwnSwINbc1A2Jt',
  expires_in: 0,
  issued_at: 0
}

const makingRequest = false */

export const getApiToken = () => {
  /* const tokenCheckBuffer = 30 * 1000
  const tokenExpires = parseInt(apiToken.expires_in) * 1000 + parseInt(apiToken.issued_at)
  if (Date.now() > tokenExpires - tokenCheckBuffer && !makingRequest) {
    getFreshApiToken()
  } */
  return '8JG2GhYKU62nSXGfjjXc34DOvhWR'
}

/* export const getFreshApiToken = () => {
  return new Promise((resolve, reject) => {
     makingRequest = true
    fetch(OS_API_TOKEN_URL)
      .then(res => res.json())
      .then(res => {
        apiToken = res
        makingRequest = false
        resolve(apiToken.access_token)
      }
      )
    resolve('m8BKTTRw1tx7TWTwnSwINbc1A2Jt')
  })
}
*/
