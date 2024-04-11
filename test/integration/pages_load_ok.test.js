import { test, expect } from '@playwright/test'

import StartPage from '../PageObjectModels/startPage'
import DatasetPage from '../PageObjectModels/datasetPage'
import GeometryTypePage from '../PageObjectModels/geometryTypePage'
import UploadMethodPage from '../PageObjectModels/uploadMethodPage'
import StatusPage from '../PageObjectModels/statusPage'
import ResultsPage from '../PageObjectModels/resultsPage'

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
  const sessionExpiredText = await page.getByText('Session expired')
  await expect(sessionExpiredText !== undefined).toBeTruthy()
}

test.describe('without a valid session, the user can not access the later form pages', () => {
  test('/dataset', async ({ page }) => {
    await checkSessionExpired(page, '/dataset')
  })

  test('/geometry-type', async ({ page }) => {
    await checkSessionExpired(page, '/geometry-type')
  })

  test('/upload-method', async ({ page }) => {
    await checkSessionExpired(page, '/upload-method')
  })

  test('/upload', async ({ page }) => {
    await checkSessionExpired(page, '/upload')
  })

  test('/url', async ({ page }) => {
    await checkSessionExpired(page, '/url')
  })
})

test.describe('with a valid session, the user can access the later form pages', () => {
  test('/dataset', async ({ page }) => {
    const startPage = new StartPage(page)

    await startPage.navigateHere()
    await startPage.clickStartNow()

    await checkRouteResponse(page, '/dataset', [200, 304])
  })

  test('/geometry-type', async ({ page }) => {
    const startPage = new StartPage(page)
    const datasetPage = new DatasetPage(page)

    await startPage.navigateHere()
    await startPage.clickStartNow()

    await datasetPage.waitForPage()
    await datasetPage.selectDataset(DatasetPage.datasets.Tree)
    await datasetPage.clickContinue()

    await checkRouteResponse(page, '/geometry-type', [200, 304])
  })

  test('/upload-method', async ({ page }) => {
    const startPage = new StartPage(page)
    const datasetPage = new DatasetPage(page)
    const geometryTypePage = new GeometryTypePage(page)

    await startPage.navigateHere()
    await startPage.clickStartNow()

    await datasetPage.waitForPage()
    await datasetPage.selectDataset(DatasetPage.datasets.Tree)
    await datasetPage.clickContinue()

    await geometryTypePage.waitForPage()
    await geometryTypePage.clickContinue()

    await checkRouteResponse(page, '/upload-method', [200, 304])
  })

  test('/upload', async ({ page }) => {
    const startPage = new StartPage(page)
    const datasetPage = new DatasetPage(page)
    const geometryTypePage = new GeometryTypePage(page)
    const uploadMethodPage = new UploadMethodPage(page)

    await startPage.navigateHere()
    await startPage.clickStartNow()

    await datasetPage.waitForPage()
    await datasetPage.selectDataset(DatasetPage.datasets.Tree)
    await datasetPage.clickContinue()

    await geometryTypePage.waitForPage()
    await geometryTypePage.selectGeometryType(GeometryTypePage.geometryTypes.point)
    await geometryTypePage.clickContinue()

    await uploadMethodPage.waitForPage()
    await uploadMethodPage.selectUploadMethod(UploadMethodPage.uploadMethods.File)
    await uploadMethodPage.clickContinue()

    await checkRouteResponse(page, '/upload', [200, 304])
  })

  test('/url', async ({ page }) => {
    const startPage = new StartPage(page)
    const datasetPage = new DatasetPage(page)
    const geometryTypePage = new GeometryTypePage(page)
    const uploadMethodPage = new UploadMethodPage(page)

    await startPage.navigateHere()
    await startPage.clickStartNow()

    await datasetPage.waitForPage()
    await datasetPage.selectDataset(DatasetPage.datasets.Tree)
    await datasetPage.clickContinue()

    await geometryTypePage.waitForPage()
    await geometryTypePage.clickContinue()

    await geometryTypePage.waitForPage()
    await geometryTypePage.selectGeometryType(GeometryTypePage.geometryTypes.point)
    await geometryTypePage.clickContinue()

    await uploadMethodPage.waitForPage()
    await uploadMethodPage.selectUploadMethod(UploadMethodPage.uploadMethods.URL)
    await uploadMethodPage.clickContinue()

    await checkRouteResponse(page, '/url', [200, 304])
  })
})

// ToDo: Complete these tests
test.describe('status and results', () => {
  test('with an existing request id that is still processing when visiting the status page the user remains on the status page', async ({ page }) => {
    const statusPage = new StatusPage(page)
    await statusPage.navigateToRequest('processing')
    await new Promise(resolve => setTimeout(resolve, 500))
    expect(page.url()).toContain('/status/processing')
  })

  // ToDo: potential improvement for the future?
  // test('with an existing request id that has completed when visiting the status page the user is redirected to the results page', ({ page }) => {

  // })

  test('with an existing request id that is processing, when visiting the results page the user is redirected to the status page', async ({ page }) => {
    const resultsPage = new ResultsPage(page)
    await resultsPage.navigateToRequest('processing')
    await new Promise(resolve => setTimeout(resolve, 500))
    expect(page.url()).toContain('/status/processing')
  })

  test('with an existing request id that has completed when visiting the results page the user remains on the results page', async ({ page }) => {
    const resultsPage = new ResultsPage(page)
    await resultsPage.navigateToRequest('completed')
    await new Promise(resolve => setTimeout(resolve, 500))
    expect(page.url()).toContain('/results/completed')
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
  await checkRouteResponse(page, '/accessibility', 200)
})
