import axios from 'axios'

axios.post('http://dluhcdigital-sandbox-290.atlassian.net/rest/servicedeskapi/request/',
  JSON.stringify({
    serviceDeskId: '3',
    requestTypeId: '26',
    requestFieldValues: {
      summary: 'Add BFL for me',
      description: 'http://newBFl.com'
    }
  }),
  {
    headers: {
      Authorization: 'Basic Y2hhcmxpZS5wYXR0ZXJzb25AY29tbXVuaXRpZXMuZ292LnVrOkFUQVRUM3hGZkdGMFJfUUF5T2taVnF4ay1CaUdUb3htUjFCa3FMRjRKMkdrYzhxNzZBREgtVk1KSzRZMUNMUFBVNmduRkdaSk9CWHJuWDdWaFd0VHVKdlEwenBUbTlxeDFjeEppQkZvcTMwUF9vTGc5aXpweXBpWFh4enY1YTlUX0dJNHdYZ1F5VDZYTC1DUFJSS0szUTBXcF9GWE1TRzY3ZWVqMW44bHIxUXRXWmJ2SS1IRVdTQT1ENzc5RjU1OA==',
      'Content-Type': 'application/json',
      Accept: 'application/json',
      request: 'POST'
    },
    maxRedirects: 0
  })
  .then((response) => {
    console.log(JSON.stringify(response.data))
  })
  .catch((error) => {
    console.log(error)
  })
