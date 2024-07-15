/* eslint-disable new-cap */

import { describe, it, vi, expect, beforeEach } from 'vitest'
import notifyClient from '../../src/utils/mailClient.js'
import config from '../../config/index.js'

vi.mock('../../src/utils/mailClient.js')

function makeRequest () {
  return {
    sessionModel: {
      get: vi.fn().mockImplementation((key) => {
        const values = {
          name: 'John Doe',
          email: 'JohnDoe@mail.com',
          lpa: 'LPA',
          dataset: 'Dataset',
          'documentation-url': 'Documentation URL',
          'endpoint-url': 'Endpoint URL'
        }
        return values[key]
      })
    }
  }
}

describe('Handle email notification handlers', async () => {
  const CheckAnswersController = await vi.importActual('../../src/controllers/CheckAnswersController.js')
  const sendEmailMock = vi.fn(() => Promise.reject(new Error('something went wrong')))
  notifyClient.sendEmail = sendEmailMock

  const controller = new CheckAnswersController.default({ route: '/dataset' })
  const req = makeRequest()
  const res = {}
  const next = vi.fn()

  it('should reuturn list of errors when failed to send email', async () => {
    const result = await controller.sendEmails(req, res, next)
    expect(result.errors.length).toBe(2)
  })
})

describe('Check answers controller', async () => {
  let CheckAnswersController
  let checkAnswersController
  let sendEmailMock

  beforeEach(async () => {
    // Setup a mock for sendEmail function
    sendEmailMock = vi.fn()
    notifyClient.sendEmail = sendEmailMock
    CheckAnswersController = await vi.importActual('../../src/controllers/CheckAnswersController.js')
    checkAnswersController = new CheckAnswersController.default({
      route: '/dataset'
    })
  })

  describe('send emails', () => {
    it('should get the values from the session model and then send the request and acknowledgement emails', async () => {
      // Mock req, res, next
      const req = makeRequest()
      const res = {}
      const next = vi.fn()

      await checkAnswersController.sendEmails(req, res, next)

      const personalisation = {
        name: 'John Doe',
        email: 'JohnDoe@mail.com',
        organisation: 'LPA',
        dataset: 'Dataset',
        'documentation-url': 'Documentation URL',
        endpoint: 'Endpoint URL'
      }

      expect(sendEmailMock).toHaveBeenCalledWith(
        config.email.templates.RequestTemplateId,
        config.email.dataManagementEmail,
        { personalisation }
      )

      expect(sendEmailMock).toHaveBeenCalledWith(
        config.email.templates.AcknowledgementTemplateId,
        'JohnDoe@mail.com',
        { personalisation }
      )
    })
  })
})
