import { NotifyClient } from 'notifications-node-client'

import dotenv from 'dotenv'
dotenv.config()

const notifyClient = new NotifyClient(process.env.GOVUK_NOTIFY_API_KEY)

export const sendEmail = async (emailAddress, templateId, personalisation) => {
  return notifyClient.sendEmail(templateId, emailAddress, { personalisation })
    .then(response => console.log(response))
    .catch(err => console.error(err))
}
