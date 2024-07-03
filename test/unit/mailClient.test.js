import { describe, it, beforeEach, vi, expect } from 'vitest'
import NotifyClientSingleton from '../../src/utils/mailClient'
import { NotifyClient } from 'notifications-node-client'

vi.mock('notifications-node-client')

describe('NotifyClientSingleton', () => {
  beforeEach(() => {
    // Clear instance for isolation between tests
    NotifyClientSingleton.instance = null
    NotifyClient.mockClear()
  })

  it('throws error when trying to instantiate directly', () => {
    expect(() => new NotifyClientSingleton()).toThrow('Use NotifyClientSingleton.getInstance()')
  })

  it('getInstance returns the same instance for multiple calls', () => {
    const firstInstance = NotifyClientSingleton.getInstance()
    const secondInstance = NotifyClientSingleton.getInstance()
    expect(firstInstance).toBe(secondInstance)
  })

  it('getInstance creates an instance with the correct API key', () => {
    process.env.GOVUK_NOTIFY_API_KEY = 'test-api-key'
    NotifyClientSingleton.getInstance()
    expect(NotifyClient).toHaveBeenCalledWith('test-api-key')
  })
})
