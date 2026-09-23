import * as Sentry from '@sentry/node'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sendIpInformation } from '../../../src/services/ipInformationService.js'
import notifyClient from '../../../src/services/mailClient.js'
import { getRedisClient } from '../../../src/utils/redisLoader.js'
import logger from '../../../src/utils/logger.js'
import { types } from '../../../src/utils/logging.js'

vi.mock('@sentry/node', () => ({ metrics: { count: vi.fn() } }))

vi.mock('../../../src/services/mailClient.js', () => ({ default: { sendEmail: vi.fn() } }))
vi.mock('../../../src/utils/redisLoader.js', () => ({ getRedisClient: vi.fn() }))
vi.mock('../../../src/utils/logger.js', () => ({ default: { error: vi.fn() } }))

let redis
beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('GOVUK_NOTIFY_API_KEY', 'test-only')
  redis = { set: vi.fn().mockResolvedValue('OK'), get: vi.fn(), eval: vi.fn().mockResolvedValue(1) }
  getRedisClient.mockResolvedValue(redis)
  notifyClient.sendEmail.mockResolvedValue({ data: { id: 'notification-id' } })
})
afterEach(() => vi.unstubAllEnvs())

describe('sendIpInformation', () => {
  it('logs safe Notify diagnostics for the existing Sentry log transport', async () => {
    notifyClient.sendEmail.mockRejectedValue({
      message: 'Private response content',
      code: 'ERR_BAD_REQUEST',
      config: { headers: { Authorization: 'secret' }, data: 'user@council.gov.uk' },
      response: {
        status: 403,
        data: { errors: [{ error: 'AuthError', message: 'Private template content' }] }
      }
    })
    await expect(sendIpInformation('user@council.gov.uk')).rejects.toThrow('could not send')
    expect(Sentry.metrics.count).toHaveBeenCalledExactlyOnceWith('notify.email_send_failed', 1)
    expect(logger.error).toHaveBeenCalledExactlyOnceWith('Notify email send failed', {
      type: types.External,
      event: 'notify.email_send_failed',
      httpStatus: 403,
      networkCode: 'ERR_BAD_REQUEST',
      errorTypes: 'AuthError'
    })
  })

  it('logs network failures without requiring a Notify response', async () => {
    notifyClient.sendEmail.mockRejectedValue({ code: 'ETIMEDOUT' })
    await expect(sendIpInformation('user@council.gov.uk')).rejects.toThrow('could not send')
    expect(logger.error).toHaveBeenCalledWith('Notify email send failed', {
      type: types.External, event: 'notify.email_send_failed', networkCode: 'ETIMEDOUT'
    })
  })

  it('omits malformed diagnostics that could contain private content', async () => {
    notifyClient.sendEmail.mockRejectedValue({
      code: 'user@council.gov.uk',
      response: { status: 'private', data: { errors: [null, { error: 'private content' }] } }
    })
    await expect(sendIpInformation('user@council.gov.uk')).rejects.toThrow('could not send')
    expect(logger.error).toHaveBeenCalledWith('Notify email send failed', {
      type: types.External, event: 'notify.email_send_failed', errorTypes: ''
    })
  })

  it('sends the configured template and retains a five-minute sent marker', async () => {
    await sendIpInformation('user@council.gov.uk')
    expect(Sentry.metrics.count).toHaveBeenCalledExactlyOnceWith('notify.email_send_succeeded', 1)
    expect(notifyClient.sendEmail).toHaveBeenCalledWith('e93b1ea3-8ede-4dc4-b24e-381aec6cbda7', 'user@council.gov.uk', {})
    expect(redis.set).toHaveBeenCalledWith(expect.not.stringContaining('user@'), expect.any(String), { NX: true, EX: 300 })
    expect(redis.eval).toHaveBeenCalledWith(expect.stringContaining("'sent'"), expect.objectContaining({ arguments: [redis.set.mock.calls[0][1]] }))
  })

  it('does not send again when a recent send succeeded', async () => {
    redis.set.mockResolvedValue(null)
    redis.get.mockResolvedValue('sent')
    await sendIpInformation('user@council.gov.uk')
    expect(notifyClient.sendEmail).not.toHaveBeenCalled()
    expect(Sentry.metrics.count).not.toHaveBeenCalled()
  })

  it('does not report success or send while another request is pending', async () => {
    redis.set.mockResolvedValue(null)
    redis.get.mockResolvedValue('another-reservation')
    await expect(sendIpInformation('user@council.gov.uk')).rejects.toThrow('already in progress')
    expect(notifyClient.sendEmail).not.toHaveBeenCalled()
    expect(Sentry.metrics.count).not.toHaveBeenCalled()
  })

  it('releases only its own reservation after an explicit Notify rejection', async () => {
    notifyClient.sendEmail.mockRejectedValue({ response: { status: 400 } })
    await expect(sendIpInformation('user@council.gov.uk')).rejects.toThrow('could not send')
    expect(redis.eval).toHaveBeenCalledWith(expect.stringContaining("'DEL'"), expect.objectContaining({ arguments: [redis.set.mock.calls[0][1]] }))
  })

  it('retains the reservation after an ambiguous network failure', async () => {
    notifyClient.sendEmail.mockRejectedValue(new Error('timeout'))
    await expect(sendIpInformation('user@council.gov.uk')).rejects.toThrow('could not send')
    expect(redis.eval).not.toHaveBeenCalled()
    expect(Sentry.metrics.count).toHaveBeenCalledExactlyOnceWith('notify.email_send_failed', 1)
  })

  it('does not turn an accepted email into a failure if updating Redis fails', async () => {
    redis.eval.mockRejectedValue(new Error('disconnected'))
    await expect(sendIpInformation('user@council.gov.uk')).resolves.toBeUndefined()
    expect(notifyClient.sendEmail).toHaveBeenCalledTimes(1)
    expect(Sentry.metrics.count).toHaveBeenCalledExactlyOnceWith('notify.email_send_succeeded', 1)
  })

  it('fails without sending if Redis is unavailable', async () => {
    getRedisClient.mockResolvedValue(null)
    await expect(sendIpInformation('user@council.gov.uk')).rejects.toThrow('unavailable')
    expect(notifyClient.sendEmail).not.toHaveBeenCalled()
    expect(Sentry.metrics.count).not.toHaveBeenCalled()
  })

  it('fails without sending if the API key is missing', async () => {
    vi.stubEnv('GOVUK_NOTIFY_API_KEY', '')
    await expect(sendIpInformation('user@council.gov.uk')).rejects.toThrow('not configured')
    expect(notifyClient.sendEmail).not.toHaveBeenCalled()
    expect(Sentry.metrics.count).not.toHaveBeenCalled()
  })
})
