import { test, expect } from '@playwright/test'
import { describe } from 'node:test'

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

test.skip('start page loads ok', async ({ page }) => {
  await checkRouteResponse(page, '/', 200)
})

test.describe('without a valid session, the user can not access the later pages', () => {
  test.skip('/upload-method', async ({ page }) => {
    await checkSessionExpired(page, '/upload-method')
  })

  test.skip('/dataset', async ({ page }) => {
    await checkSessionExpired(page, '/dataset')
  })

  test.skip('/geometry-type', async ({ page }) => {
    await checkSessionExpired(page, '/geometry-type')
  })

  test.skip('/upload', async ({ page }) => {
    await checkSessionExpired(page, '/upload')
  })

  test.skip('/url', async ({ page }) => {
    await checkSessionExpired(page, '/url')
  })
})

// ToDo: Complete these tests
describe('status and results', () => {
  test.skip('with an existing request id that is still processing when visiting the status page the user remains on the status page', () => {

  })

  test.skip('with an existing request id that has completed when visiting the status page the user is redirected to the results page', () => {

  })

  test.skip('with an existing request id that is processing, when visiting the results page the user is redirected to the status page', () => {

  })

  test.skip('with an existing request id that has completed when visiting the results page the user remains on the results page', () => {

  })

  test.skip('with a non existing request id when visiting the status page the user is redirected to the 404 page', () => {

  })

  test.skip('with a non existing request id when visiting the results page the user is redirected to the 404 page', () => {

  })
})

// the accessibility page loads ok
test.skip('/accessibility loads ok', async ({ page }) => {
  await checkRouteResponse(page, '/accessibility', 200)
})
