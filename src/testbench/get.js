import axios from 'axios'
const data = '{\r\n    serviceDeskId: \'3\',\r\n    requestTypeId: \'25\',\r\n    requestFieldValues: {\r\n      summary: \'Here is an issue made via a rest call\',\r\n      description: \'please process this dataset for me\'\r\n    },\r\n    requestParticipants: [\'George\']\r\n  }'

const config = {
  method: 'get',
  maxBodyLength: Infinity,
  url: 'http://dluhcdigital-sandbox-290.atlassian.net/rest/servicedeskapi/servicedesk',
  headers: {
    Authorization: 'Basic Y2hhcmxpZS5wYXR0ZXJzb25AY29tbXVuaXRpZXMuZ292LnVrOkFUQVRUM3hGZkdGMFJfUUF5T2taVnF4ay1CaUdUb3htUjFCa3FMRjRKMkdrYzhxNzZBREgtVk1KSzRZMUNMUFBVNmduRkdaSk9CWHJuWDdWaFd0VHVKdlEwenBUbTlxeDFjeEppQkZvcTMwUF9vTGc5aXpweXBpWFh4enY1YTlUX0dJNHdYZ1F5VDZYTC1DUFJSS0szUTBXcF9GWE1TRzY3ZWVqMW44bHIxUXRXWmJ2SS1IRVdTQT1ENzc5RjU1OA==',
    'Content-Type': 'application/json',
    Cookie: 'jsd.portal.language.anonymous=en-US'
  },
  data
}

axios.request(config)
  .then((response) => {
    console.log(JSON.stringify(response.data))
  })
  .catch((error) => {
    console.log(error)
  })
