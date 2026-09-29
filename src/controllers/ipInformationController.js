import * as v from 'valibot'
import { validGovUkEmail } from '../utils/validators.js'
import { sendIpInformation } from '../services/ipInformationService.js'
import logger from '../utils/logger.js'
import { types } from '../utils/logging.js'

const emailPage = '/check/ip-address-information/email'
const emailField = 'ip-information-email'
const emailSchema = v.pipe(v.string(), v.email())

export function requireIpInformationSession (req, res, next) {
  res.set('Cache-Control', 'no-store')
  if (!req.session.ipInformation) return res.redirect('/check/url')
  next()
}

export function showEmailForm (req, res) {
  delete req.session.ipInformation.email
  res.render('check/ip-information-email.html', { values: {}, errors: {} })
}

export async function sendInformation (req, res) {
  delete req.session.ipInformation.email
  const submitted = req.body?.[emailField]
  const email = typeof submitted === 'string' ? submitted.trim() : ''
  let errorType
  if (!email) errorType = 'required'
  else if (!v.safeParse(emailSchema, email).success) errorType = 'email'
  else if (!validGovUkEmail(email)) errorType = 'format'

  if (!errorType) {
    try {
      await sendIpInformation(email)
      req.session.ipInformation.email = email
      return res.redirect('/check/ip-address-information/confirmation')
    } catch {
      // Notify responses can contain the recipient and private template content.
      logger.warn('IP information email could not be sent', { type: types.External })
      errorType = 'sendFailed'
    }
  }

  return res.status(errorType === 'sendFailed' ? 503 : 400).render('check/ip-information-email.html', {
    values: { [emailField]: email },
    errors: { [emailField]: { type: errorType } }
  })
}

export function showConfirmation (req, res) {
  const { email, organisationId, organisationName } = req.session.ipInformation
  if (!email) return res.redirect(emailPage)
  res.render('check/ip-information-confirmation.html', {
    values: { [emailField]: email },
    options: { orgId: organisationId, lpa: organisationName }
  })
}
