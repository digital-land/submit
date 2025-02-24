// copied from https://github.com/digital-land/digital-land.info/blob/main/assets/javascripts/osApiToken.js

const API_ACCESS_TOKEN_URL = '/api/os/get-access-token'
let apiToken = {
  access_token: '',
  expires_in: 0,
  issued_at: 0
}

let makingRequest = false

export const getApiToken = () => {
  const tokenCheckBuffer = 30 * 1000
  const tokenExpires = parseInt(apiToken.expires_in) * 1000 + parseInt(apiToken.issued_at)
  if (Date.now() > tokenExpires - tokenCheckBuffer && !makingRequest) {
    getFreshApiToken()
  }
  return apiToken.access_token
}

export const getFreshApiToken = () => {
  return new Promise((resolve, reject) => {
    makingRequest = true
    fetch(API_ACCESS_TOKEN_URL)
      .then(res => res.json())
      .then(res => {
        apiToken = res
        makingRequest = false
        resolve(apiToken.access_token)
      })
      .catch(err => {
        makingRequest = false
        reject(err)
      })
  })
}
