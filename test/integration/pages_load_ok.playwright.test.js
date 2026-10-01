import { test, expect } from '@playwright/test'

import StartPage from '../PageObjectModels/startPage'
import StatusPage from '../PageObjectModels/statusPage'
import ResultsPage from '../PageObjectModels/resultsPage'

import DatasetPage, { datasets } from '../PageObjectModels/datasetPage'
import { geometryTypes } from '../PageObjectModels/geometryTypePage'
import UploadMethodPage, { uploadMethods } from '../PageObjectModels/uploadMethodPage'

const checkRouteResponse = async (page, route, statuses) => {
  const response = await page.goto(route)
  if (Array.isArray(statuses)) {
    expect(statuses.includes(response.status())).toBeTruthy()
  } else {
    expect(response.status()).toBe(statuses)
  }
}

const checkSessionExpired = async (page, route) => {
  await page.goto(route)
  await expect(page).toHaveURL('/')
}

for (const width of [1440, 375]) {
  for (const route of ['/community', '/roadmap', '/extract']) {
    test(`${route} retains the standard content width at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/accessibility')
      const standardMain = await page.getByRole('main').boundingBox()

      await checkRouteResponse(page, route, 200)
      const main = page.getByRole('main')
      await expect(main).toHaveCount(1)
      await expect(main).toHaveAttribute('id', 'main-content')
      await expect(main.getByRole('heading', { level: 1 })).toBeVisible()
      const bounds = await main.boundingBox()
      expect(bounds.x).toBeCloseTo(standardMain.x, 0)
      expect(bounds.width).toBeCloseTo(standardMain.width, 0)

      const skipLink = page.getByRole('link', { name: 'Skip to main content' })
      await skipLink.focus()
      await skipLink.press('Enter')
      await expect(page).toHaveURL(new RegExp(`${route}#main-content$`))
    })
  }

  test(`landing masthead spans the viewport at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')

    const main = page.getByRole('main')
    await expect(main).toHaveCount(1)
    await expect(main).toHaveAttribute('id', 'main-content')
    await expect(main.getByRole('heading', { level: 1 })).toHaveText('Check and provide planning data')

    const masthead = await main.locator('.app-masthead').boundingBox()
    expect(masthead.x).toBe(0)
    expect(masthead.width).toBe(width)

    const content = await main.locator('.app-masthead > .govuk-width-container').boundingBox()
    expect(content.x).toBeGreaterThan(0)
    expect(content.width).toBeLessThan(masthead.width)
  })
}

test.describe('without a valid session, the user can not access the later form pages', () => {
  // /check/dataset, /check/geometry-type, /check/upload-method have checkJourney: false
  // so they render without a session — no redirect expected

  test('/check/upload', async ({ page }) => {
    await checkSessionExpired(page, '/check/upload')
  })

  test('/check/url', async ({ page }) => {
    await checkSessionExpired(page, '/check/url')
  })
})

test.describe('with a valid session, the user can access the later form pages', () => {
  test('/check', async ({ page }) => {
    const startPage = new StartPage(page)
    await startPage.navigateHere()
    await startPage.verifyAndReturnPage(UploadMethodPage)

    await checkRouteResponse(page, '/check/upload-method', [200, 304])
  })

  test('/check/geometry-type', async ({ page }) => {
    const startPage = new StartPage(page)
    await startPage.navigateHere()

    const uploadMethodPage = await startPage.verifyAndReturnPage(UploadMethodPage)
    await uploadMethodPage.goBack()

    const datasetPage = await startPage.verifyAndReturnPage(DatasetPage)
    await datasetPage.waitForPage()
    await datasetPage.selectDataset(datasets.Tree)
    await datasetPage.clickContinue()

    await checkRouteResponse(page, '/check/geometry-type', [200, 304])
  })

  test('/check/upload-method', async ({ page }) => {
    const startPage = new StartPage(page)
    await startPage.navigateHere()

    const uploadMethodPage = await startPage.verifyAndReturnPage(UploadMethodPage)
    await uploadMethodPage.goBack()

    const datasetPage = await startPage.verifyAndReturnPage(DatasetPage)
    await datasetPage.waitForPage()
    await datasetPage.selectDataset(datasets.Tree)
    const geometryTypePage = await datasetPage.clickContinue()

    await geometryTypePage.waitForPage()
    await geometryTypePage.selectGeometryType(geometryTypes.point)
    await geometryTypePage.clickContinue()

    await checkRouteResponse(page, '/check/upload-method', [200, 304])
  })

  test('/check/upload', async ({ page }) => {
    const startPage = new StartPage(page)
    await startPage.navigateHere()

    const uploadMethodPage = await startPage.verifyAndReturnPage(UploadMethodPage)
    await uploadMethodPage.goBack()

    const datasetPage = await startPage.verifyAndReturnPage(DatasetPage)
    await datasetPage.waitForPage()
    await datasetPage.selectDataset(datasets.Tree)
    const geometryTypePage = await datasetPage.clickContinue()

    await geometryTypePage.waitForPage()
    await geometryTypePage.selectGeometryType(geometryTypes.point)
    const uploadMethodPage2 = await geometryTypePage.clickContinue()

    await uploadMethodPage2.waitForPage()
    await uploadMethodPage2.selectUploadMethod(uploadMethods.File)
    await uploadMethodPage2.clickContinue()

    await checkRouteResponse(page, '/check/upload', [200, 304])
  })

  test('/check/url', async ({ page }) => {
    const startPage = new StartPage(page)
    await startPage.navigateHere()

    const uploadMethodPage = await startPage.verifyAndReturnPage(UploadMethodPage)
    await uploadMethodPage.goBack()

    const datasetPage = await startPage.verifyAndReturnPage(DatasetPage)
    await datasetPage.waitForPage()
    await datasetPage.selectDataset(datasets.Tree)

    const geometryTypePage = await datasetPage.clickContinue()
    await geometryTypePage.waitForPage()
    await geometryTypePage.selectGeometryType(geometryTypes.point)

    const uploadMethodPage2 = await geometryTypePage.clickContinue()
    await uploadMethodPage2.waitForPage()
    await uploadMethodPage2.selectUploadMethod(uploadMethods.URL)
    await uploadMethodPage2.clickContinue()

    await checkRouteResponse(page, '/check/url', [200, 304])
  })
})

// ToDo: Complete these tests
test.describe('status and results', () => {
  test('with an existing request id that is still processing when visiting the status page the user remains on the status page', async ({ page }) => {
    const statusPage = new StatusPage(page)
    await statusPage.navigateToRequest('processing')
    await new Promise(resolve => setTimeout(resolve, 500))
    expect(page.url()).toContain('/check/status/processing')
  })

  // ToDo: potential improvement for the future?
  // test('with an existing request id that has completed when visiting the status page the user is redirected to the results page', ({ page }) => {

  // })

  test('with an existing request id that is processing, when visiting the results page the user is redirected to the status page', async ({ page }) => {
    const resultsPage = new ResultsPage(page)
    await resultsPage.navigateToRequest('processing')
    await new Promise(resolve => setTimeout(resolve, 500))
    expect(page.url()).toContain('/check/status/processing')
  })

  test('with an existing request id that has completed when visiting the results page the user remains on the results page', async ({ page }) => {
    const resultsPage = new ResultsPage(page)
    await resultsPage.navigateToRequest('completed')
    await new Promise(resolve => setTimeout(resolve, 500))
    expect(page.url()).toContain('/check/results/completed/1')
  })

  // ToDo: just waiting on Alex's 404 page
  test.skip('with a non existing request id when visiting the status page the user is redirected to the 404 page', () => {

  })

  // ToDo: just waiting on Alex's 404 page
  test.skip('with a non existing request id when visiting the results page the user is redirected to the 404 page', () => {

  })
})

// the accessibility page loads ok
test('/accessibility loads ok', async ({ page }) => {
  const pageErrors = []
  page.on('pageerror', error => pageErrors.push(error.message))
  const componentsResponse = page.waitForResponse(response =>
    response.url().endsWith('/assets/govuk-prototype-components.min.js')
  )
  await checkRouteResponse(page, '/accessibility', 200)
  expect((await componentsResponse).status()).toBe(200)
  expect(pageErrors).toEqual([])
})
