import CheckAnswersController from '../../src/controllers/CheckAnswersController.js'

import { describe, it, vi, expect, beforeEach } from 'vitest'
import config from '../../config/index.js'
import { sendEmail } from '../../src/utils/mailClient.js'

vi.mock('../../src/utils/mailClient.js')

describe('Check answers controller', () => {
  let checkAnswersController
  let sendEmailMock

  beforeEach(() => {
    checkAnswersController = new CheckAnswersController({
      route: '/dataset'
    })

    sendEmailMock = vi.fn()

    sendEmail.mockImplementation(sendEmailMock)
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

      expect(sendEmailMock).toHaveBeenCalledWith(config.email.dataManagementEmail, config.email.templates.RequestTemplateId, {
        name: 'John Doe',
        email: 'JohnDoe@mail.com',
        organisation: 'LPA',
        dataset: 'Dataset',
        'documentation-url': 'Documentation URL',
        endpoint: 'Endpoint URL'
      })

      expect(sendEmailMock).toHaveBeenCalledWith('JohnDoe@mail.com', config.email.templates.AcknowledgementTemplateId, {
        name: 'John Doe',
        email: 'JohnDoe@mail.com',
        organisation: 'LPA',
        endpoint: 'Endpoint URL',
        'documentation-url': 'Documentation URL',
        dataset: 'Dataset'
      })
    })
  })
})
