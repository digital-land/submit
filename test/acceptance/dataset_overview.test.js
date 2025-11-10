import { test, expect } from '@playwright/test'
import LandingPage from '../PageObjectModels/landingPage'
import OrganisationOverviewPage from '../PageObjectModels/organisationOverviewPage'

test.describe('Dataset overview', () => {
  test('Can go from landing page to organisational overview', async ({ page, context }) => {
    const landingPage = new LandingPage(page)
    await landingPage.navigateHere()

    expect(await page.locator('h1').innerText()).toEqual('Check and provide planning data')

    const organisationsPage = await landingPage.clickStartNow()

    expect(await page.locator('h1').innerText()).toEqual('Find your organisation')

    await organisationsPage.searchForOrganisation('Lambeth')
    await organisationsPage.selectOrganisation('London Borough of Lambeth', 'local-authority:LBH')

    expect(await page.locator('h1').innerText()).toEqual('London Borough of Lambeth overview')
    expect(await page.locator('[data-testid=datasetsMandatory] h2.govuk-heading-m').innerText())
      .toEqual('Datasets London Borough of Lambeth must provide')
    expect(await page.locator('[data-testid=datasetsMandatory] .govuk-task-list li').count()).toBeGreaterThanOrEqual(1)
    expect(await page.locator('[data-testid=datasetsOdpMandatory] h2.govuk-heading-m').innerText())
      .toEqual('Datasets organisations in Open Digital Planning programme must provide')
    expect(await page.locator('[data-testid=datasetsOdpMandatory] .govuk-task-list li').count()).toBeGreaterThanOrEqual(8)
  })

  test('Can view dataset overview', async ({ page, context }) => {
    const organisationOverviewPage = new OrganisationOverviewPage(page, {
      organisationId: 'local-authority:LBH'
    })
    await organisationOverviewPage.navigateHere()

    expect(await page.locator('h1').innerText()).toEqual('London Borough of Lambeth overview')

    await organisationOverviewPage.clickOnDataset('local-authority:LBH', 'brownfield-land')

    expect(await page.locator('h1').innerText()).toEqual('Brownfield land')
    expect(await page.getByRole('link', { name: 'Dataset details' })).toBeDefined()
    expect(await page.getByRole('link', { name: 'Dataset table' })).toBeDefined()
    expect(await page.getByRole('link', { name: 'Task list' })).toBeDefined()

    expect(await page.getByRole('h2', { name: 'Dataset details' })).toBeDefined()
    expect(await page.locator('.govuk-grid-column-two-thirds .govuk-summary-list').count()).toEqual(1)

    expect(await page.getByRole('h2', { name: 'Dataset actions' })).toBeDefined()
    expect(await page.locator('.govuk-grid-column-one-third .govuk-list').count()).toEqual(1)
    expect(await page.locator('.govuk-grid-column-one-third .govuk-list li').count()).toEqual(2)
  })

  test('Can view dataset tables', async ({ page, context }) => {
    const organisationOverviewPage = new OrganisationOverviewPage(page, {
      organisationId: 'local-authority:LBH'
    })
    await organisationOverviewPage.navigateHere()

    expect(await page.locator('h1').innerText()).toEqual('London Borough of Lambeth overview')

    const datasetOverviewPage = await organisationOverviewPage.clickOnDataset('local-authority:LBH', 'brownfield-land')
    await datasetOverviewPage.viewDatasetTable()

    expect(await page.locator('.govuk-table').count()).toEqual(1)
  })

  test('Can view dataset issues', async ({ page, context }) => {
    const organisationOverviewPage = new OrganisationOverviewPage(page, {
      organisationId: 'local-authority:LBH'
    })
    await organisationOverviewPage.navigateHere()

    expect(await page.locator('h1').innerText()).toEqual('London Borough of Lambeth overview')

    const datasetOverviewPage = await organisationOverviewPage.clickOnDataset('local-authority:LBH', 'brownfield-land')
    await datasetOverviewPage.viewDatasetIssues()

    expect(await page.locator('h2.govuk-heading-l').innerText()).toEqual('London Borough of Lambeth’s task list')
  })

  test('Dataset names shown dynamically match names fetched from datasetLoader', async ({ page }) => {
    const organisationId = 'local-authority:LBH'

    // Mock the expected nameMap to avoid Redis calls, currently may only work when environment is NOT 'local' or 'development' as in those environments datasetLoader will add more dynamically that may not be listed here.
    const nameMap = {
      'brownfield-land': 'Brownfield land',
      'article-4-direction-area': 'Article 4 direction area',
      'article-4-direction': 'Article 4 direction',
      'conservation-area': 'Conservation area',
      'conservation-area-document': 'Conservation area document',
      tree: 'Tree',
      'tree-preservation-zone': 'Tree preservation zone',
      'listed-building': 'Listed building',
      'listed-building-outline': 'Listed building outline',
      'tree-preservation-order': 'Tree preservation order',
      'development-plan-document': 'Development plan document',
      'brownfield-site': 'Brownfield site'
    }

    const organisationOverviewPage = new OrganisationOverviewPage(page, { organisationId })
    await organisationOverviewPage.navigateHere()

    expect(await page.locator('h1').innerText()).toEqual('London Borough of Lambeth overview')
    const datasetElements = await page.locator('[data-testid=datasetsOdpMandatory] .govuk-task-list li').allInnerTexts()
    const displayedNames = datasetElements
      .map(text => text.split('\n')[0].trim())

    for (const displayedName of displayedNames) {
      const matchingKey = Object.keys(nameMap).find(key => nameMap[key] === displayedName)
      expect(matchingKey).toBeDefined()
    }
    expect(displayedNames.length).toBeGreaterThanOrEqual(8)
  })
})
