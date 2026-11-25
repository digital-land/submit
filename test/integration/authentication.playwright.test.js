import { test, expect } from '@playwright/test'

for (const width of [1440, 375]) {
  test(`confirms email and resumes the selected check at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    const checkUrl = '/check/link?dataset=article-4-direction-area&orgName=Newcastle%20City%20Council&orgId=local-authority%3ANET'
    await page.goto('/organisations')
    const previousUrl = page.url()
    await page.goto(checkUrl, { referer: previousUrl })
    await expect(page).toHaveURL(/\/auth$/)
    await expect(page.getByRole('heading', { name: 'Confirm your email address' })).toBeVisible()
    await expect(page.getByText(/you need to confirm your gov.uk email address/)).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.getByRole('link', { name: 'Back', exact: true }).click()
    await expect(page).toHaveURL(previousUrl)
    await page.goto(checkUrl, { referer: previousUrl })
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await expect(page).toHaveURL(/\/check\/upload-method$/)
    const tokenCookie = (await page.context().cookies()).find(cookie => cookie.name === 'submit_access_token')
    expect(tokenCookie).toMatchObject({ httpOnly: true, sameSite: 'Lax' })
    expect(await page.evaluate(() => document.cookie)).not.toContain('submit_access_token')
    await expect(page.locator('header .app-header__account')).toHaveText('test@council.gov.uk (Sign out)')
    await expect(page.locator('header .app-header__account')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.getByRole('link', { name: 'Sign out', exact: true }).click()
    await page.getByRole('button', { name: 'Sign out', exact: true }).click()
    await expect(page).toHaveURL('/')
    expect((await page.context().cookies()).find(cookie => cookie.name === 'submit_access_token')).toBeUndefined()
    await page.goto('/check/upload-method')
    await expect(page).toHaveURL(/\/auth$/)
    expect(errors).toEqual([])
  })
}

test('rejects direct unauthenticated writes and polling', async ({ request }) => {
  expect((await request.post('/check/url', { form: { url: 'https://example.org' } })).status()).toBe(401)
  expect((await request.get('/api/status/test')).status()).toBe(401)
})
