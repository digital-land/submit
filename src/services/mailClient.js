import { NotifyClient } from 'notifications-node-client'
import dotenv from 'dotenv'
import axios from 'axios'

dotenv.config()

const notifyClient = new NotifyClient(process.env.GOVUK_NOTIFY_API_KEY || 'test-key')

// Bound the request so a stalled send cannot outlive its Redis reservation.
notifyClient.setClient(axios.create({ timeout: 10000 }))

export default notifyClient
