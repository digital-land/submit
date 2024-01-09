import { test, expect } from '@playwright/test'

const checkRouteResponse = async (page, route, status) => {
  const response = await page.goto(route)
  expect(response.ok()).toBe(true)
  expect(response.status()).toBe(status)
}

const checkSessionExpired = async (page, route) => {
  await page.goto(route)
  const sessionExpiredText = await page.getByText('Session expired')
  await expect(sessionExpiredText !== undefined).toBeTruthy()
}

test('/ loads ok', async ({ page }) => {
  await checkRouteResponse(page, '/', 200)
})

test.describe('without a valid session, the user can not access the later pages', () => {
  // test('/data-subject', async ({ page }) => {
  //   await checkSessionExpired(page, '/data-subject')
  // })

  test('/dataset', async ({ page }) => {
    await checkSessionExpired(page, '/dataset')
  })

  test('/upload', async ({ page }) => {
    await checkSessionExpired(page, '/upload')
  })
})

// the accessibility page loads ok
test('/accessibility loads ok', async ({ page }) => {
  await checkRouteResponse(page, '/accessibility', 200)
})
