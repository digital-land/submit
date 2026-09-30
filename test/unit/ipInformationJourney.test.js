import { beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import cookieParser from 'cookie-parser'
import session from 'express-session'
import request from 'supertest'
import ipInformation from '../../src/routes/ipInformation.js'
import checkWizard from '../../src/routes/form-wizard/check/index.js'
import SubmitUrlController from '../../src/controllers/submitUrlController.js'
import { checkForErroredResponse } from '../../src/controllers/resultsController.js'
import { sendIpInformation } from '../../src/services/ipInformationService.js'
import { setupNunjucks } from '../../src/serverSetup/nunjucks.js'

vi.mock('../../src/services/datasette.js', () => ({ default: { runQuery: vi.fn().mockResolvedValue({ formattedData: [] }) } }))

vi.mock('../../src/services/ipInformationService.js', () => ({ sendIpInformation: vi.fn() }))

const emailPath = '/check/ip-address-information/email'
const confirmationPath = '/check/ip-address-information/confirmation'

function app () {
  const app = express()
  app.use(cookieParser())
  app.use(express.urlencoded({ extended: false }))
  app.use(session({ secret: 'isolated-test-session', resave: false, saveUninitialized: true }))
  setupNunjucks({ app, datasetNameMapping: new Map() })
  app.use('/check/ip-address-information', ipInformation)
  app.use('/check', checkWizard)
  app.use((err, req, res, next) => {
    if (err.template) return res.status(err.statusCode).render(err.template, { err })
    res.status(500).send(err.message)
  })
  return app
}

async function enter (agent) {
  await agent.get('/check/url')
  const response = await agent.post('/check/url').type('form').send({ url: 'https://example.gov.uk/data.csv' })
  expect(response.status, response.text).toBe(403)
  expect(response.text).toContain(`href="${emailPath}"`)
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(SubmitUrlController, 'localUrlValidation').mockResolvedValue('restricted403')
  sendIpInformation.mockReset().mockResolvedValue(undefined)
})

describe('IP information journey', () => {
  it('sends a validated address and refreshes confirmation without resending', async () => {
    const agent = request.agent(app())
    await enter(agent)
    expect((await agent.get(emailPath)).text).toContain('What is your email address?')
    const response = await agent.post(emailPath).type('form').send({ 'ip-information-email': ' user@council.gov.uk ' })
    expect(response.status).toBe(302)
    expect(response.headers.location).toBe(confirmationPath)
    expect(sendIpInformation).toHaveBeenCalledWith('user@council.gov.uk')
    for (let i = 0; i < 2; i++) {
      const confirmation = await agent.get(confirmationPath)
      expect(confirmation.status).toBe(200)
      expect(confirmation.text).toContain('user@council.gov.uk')
      expect(confirmation.text).toContain('Check your email')
    }
    expect(sendIpInformation).toHaveBeenCalledTimes(1)
  })

  it.each(['', 'invalid', 'user@example.org.uk', 'user@notgov.uk', 'user@council.gov.uk.evil.com'])('rejects %j before sending', async email => {
    const agent = request.agent(app())
    await enter(agent)
    const response = await agent.post(emailPath).type('form').send({ 'ip-information-email': email })
    expect(response.status).toBe(400)
    expect(response.text).toContain('govuk-error-summary')
    expect(sendIpInformation).not.toHaveBeenCalled()
  })

  it('shows a recoverable error and retains the address when Notify fails', async () => {
    sendIpInformation.mockRejectedValueOnce(new Error('unavailable'))
    const agent = request.agent(app())
    await enter(agent)
    const response = await agent.post(emailPath).type('form').send({ 'ip-information-email': 'user@council.gov.uk' })
    expect(response.status).toBe(503)
    expect(response.text).toContain('We could not send the information')
    expect(response.text).toContain('user@council.gov.uk')
    expect((await agent.get(confirmationPath)).headers.location).toBe(emailPath)
    expect((await agent.post(emailPath).type('form').send({ 'ip-information-email': 'user@council.gov.uk' })).headers.location).toBe(confirmationPath)
  })

  it('opens a clean form after a failed submission', async () => {
    sendIpInformation.mockRejectedValueOnce(new Error('unavailable'))
    const agent = request.agent(app())
    await enter(agent)
    const failed = await agent.post(emailPath).type('form').send({ 'ip-information-email': 'user@council.gov.uk' })
    expect(failed.text).toContain('We could not send the information')
    expect(failed.text).toContain('user@council.gov.uk')
    const fresh = await agent.get(emailPath)
    expect(fresh.status).toBe(200)
    expect(fresh.text).not.toContain('user@council.gov.uk')
    expect(fresh.text).not.toContain('govuk-error-summary')
  })

  it('starts fresh after success', async () => {
    const agent = request.agent(app())
    await enter(agent)
    await agent.post(emailPath).type('form').send({ 'ip-information-email': 'user@council.gov.uk' })
    const fresh = await agent.get(emailPath)
    expect(fresh.text).not.toContain('user@council.gov.uk')
    expect((await agent.get(confirmationPath)).headers.location).toBe(emailPath)
  })

  it('requires a 403 session before opening or posting the form', async () => {
    const agent = request.agent(app())
    expect((await agent.get(emailPath)).headers.location).toBe('/check/url')
    expect((await agent.post(emailPath).type('form').send({ 'ip-information-email': 'user@council.gov.uk' })).headers.location).toBe('/check/url')
    expect(sendIpInformation).not.toHaveBeenCalled()
  })

  it.each([403, '403'])('enables the journey for backend error code %j', async errCode => {
    const session = {}
    const next = vi.fn()
    await checkForErroredResponse({
      session,
      locals: { requestData: { response: { error: { errCode, errMsg: 'Forbidden' } }, getParams: () => ({}) } }
    }, {}, next)
    expect(session.ipInformation).toEqual({ organisationId: undefined, organisationName: undefined })
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ template: 'check/error-redirect.html' }))
  })
})
