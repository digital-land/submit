import axios from 'axios'
import dotenv from 'dotenv'
dotenv.config()

const key = process.env.JIRA_TOKEN
const email = 'charlie.patterson@communities.gov.uk'
const domain = 'http://dluhcdigital-sandbox-290.atlassian.net'

const serviceDeskSubPath = '/rest/servicedeskapi'

const makeRequest = async () => {
  const path = `${domain}${serviceDeskSubPath}/request`

  const auth = Buffer.from(`${email}:${key}`, 'utf8').toString('base64')

  const headers = {
    Authorization: `Basic ${auth}`,
    'Content-Type': 'application/json'
  }

  const body = {
    serviceDeskId: '3',
    requestTypeId: '25',
    requestFieldValues: {
      summary: 'Here is an issue made via a rest call',
      description: 'please process this dataset for me'
    },
    requestParticipants: ['George']
  }

  try {
    const response = await axios.post(path, body, {
      headers,
      auth: {
        username: email,
        password: key
      }
    })

    return response.data
  } catch (error) {
    console.error(error)
  }
}

makeRequest()
