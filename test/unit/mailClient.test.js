import { describe, expect, it, vi, beforeEach } from 'vitest'

import { sendEmail } from '../../src/utils/mailClient'
import { NotifyClient } from 'notifications-node-client'

// vi.mock('notifications-node-client', () => {
//     return {
//         NotifyClient: vi.fn().mockReturnValue(
//             {
//                 sendEmail: vi.fn().mockResolvedValue({})
//             }
//         )
//     }
// });

const sendEmailMock = vi.spyOn(NotifyClient.prototype, 'sendEmail')

describe('sendEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call NotifyClient.sendEmail with correct parameters', async () => {
    const emailAddress = 'test@example.com'
    const templateId = 'template-id'
    const personalisation = { name: 'John Doe' }

    await sendEmail(emailAddress, templateId, personalisation)

    expect(sendEmailMock).toHaveBeenCalledWith(templateId, emailAddress, { personalisation })
  })

  it('should log the response on successful email send', async () => {
    const consoleMock = vi.spyOn(global.console, 'log').mockImplementation(() => undefined)

    const response = { id: '12345', content: { body: 'Test email content', subject: 'Test' } }
    sendEmailMock.mockResolvedValue(response) // Explicitly resolve with a response

    await sendEmail('test@example.com', 'template-id', { name: 'John Doe' })

    expect(consoleMock).toHaveBeenCalledWith(response)
  })

  it('should log an error if email sending fails', async () => {
    console.error = vi.fn()
    const error = new Error('Failed to send email')
    sendEmailMock.mockRejectedValue(error) // Explicitly reject with an error

    try {
      await sendEmail('test@example.com', 'template-id', { name: 'John Doe' })
    } catch (e) {
      // Catch the error to prevent the test from failing due to unhandled rejection
    }

    expect(console.error).toHaveBeenCalledWith(error)
  })
})
