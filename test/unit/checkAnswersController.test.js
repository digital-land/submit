/* eslint-disable new-cap */

import { describe, it, vi, expect, beforeEach } from 'vitest'
import NotifyClientSingleton from '../../src/utils/mailClient.js'
import config from '../../config/index.js'

vi.mock('../../src/utils/mailClient.js', () => ({
  default: {
    getInstance: vi.fn()
  }
}))

describe('Check answers controller', () => {
  let CheckAnswersController
  let checkAnswersController
  let sendEmailMock

  beforeEach(async () => {
    // Setup a mock for sendEmail function
    sendEmailMock = vi.fn()
    NotifyClientSingleton.getInstance = vi.fn().mockReturnValue({
      sendEmail: sendEmailMock
    })
    CheckAnswersController = await vi.importActual('../../src/controllers/CheckAnswersController.js')
    checkAnswersController = new CheckAnswersController.default({
      route: '/dataset'
    })
  })

  describe('send emails', () => {
    it('should get the values from the session model and then send the request and acknowledgement emails', () => {
      // Mock req, res, next
      const req = {
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

      const res = {}
      const next = vi.fn()

      checkAnswersController.sendEmails(req, res, next)

      expect(sendEmailMock).toHaveBeenCalledWith(
        config.email.templates.RequestTemplateId,
        config.email.dataManagementEmail,
        {
          personalisation: {
            name: 'John Doe',
            email: 'JohnDoe@mail.com',
            organisation: 'LPA',
            dataset: 'Dataset',
            'documentation-url': 'Documentation URL',
            endpoint: 'Endpoint URL'
          }
        }
      )

      expect(sendEmailMock).toHaveBeenCalledWith(
        config.email.templates.AcknowledgementTemplateId,
        'JohnDoe@mail.com',
        {
          personalisation: {
            name: 'John Doe',
            email: 'JohnDoe@mail.com',
            organisation: 'LPA',
            endpoint: 'Endpoint URL',
            'documentation-url': 'Documentation URL',
            dataset: 'Dataset'
          }
        }
      )
    })
  })
})
