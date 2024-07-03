import { NotifyClient } from 'notifications-node-client'
import dotenv from 'dotenv'

dotenv.config()

class NotifyClientSingleton {
  static instance

  constructor () {
    throw new Error('Use NotifyClientSingleton.getInstance()')
  }

  static getInstance () {
    if (!NotifyClientSingleton.instance) {
      NotifyClientSingleton.instance = new NotifyClient(process.env.GOVUK_NOTIFY_API_KEY || 'test-key')
    }
    return NotifyClientSingleton.instance
  }
}

export default NotifyClientSingleton
