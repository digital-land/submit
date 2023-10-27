import { test, expect } from '@playwright/test'

const checkRouteResponse = async (page, route, status) => {
  const response = await page.goto(route)
  expect(response.ok()).toBe(true)
  expect(response.status()).toBe(status)
}

test.describe.skip('Pages load ok', () => {
  test('/start', async ({ page }) => {
    await checkRouteResponse(page, '/start', 200)
  })

  test('/data-subject', async ({ page }) => {
    await checkRouteResponse(page, '/data-subject', 200)
  })

  test('/dataset', async ({ page }) => {
    await checkRouteResponse(page, '/dataset', 200)
  })

  test('/upload', async ({ page }) => {
    await checkRouteResponse(page, '/upload', 200)
  })

  test('/errors', async ({ page }) => {
    await checkRouteResponse(page, '/errors', 200)
  })

  test('/transformations', async ({ page }) => {
    await checkRouteResponse(page, '/transformations', 200)
  })
})
