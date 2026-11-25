import { test as base, expect } from '@playwright/test'

export const test = base.extend({
  authenticated: [async ({ page }, use) => {
    if (!process.env.INTERNAL_ACCESS_STORAGE_STATE) {
      const response = await page.request.get('/auth/login')
      expect(response.url()).toMatch(/\/check\/dataset$/)
      expect(response.status()).toBe(200)
    }
    await use()
  }, { auto: true }]
})
export { expect }
