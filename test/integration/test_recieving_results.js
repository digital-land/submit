/*
    this file will be responsible for testing the results of the checks
    we should have tests for:
        - a file with no errors
        - a file with some errors (both column and row)
        - a file that failed to process (due to 404)
        - a file that failed to process (due to another reason) (ToDo)
*/

import { test } from '@playwright/test'

import ResultsPage from '../PageObjectModels/resultsPage'

test('receiving a successful result', async ({ page }) => {
  const resultsPage = new ResultsPage(page)

  await resultsPage.navigateToRequest('complete')
  await resultsPage.expectPageIsNoErrorsPage()

  // should check the table has rendered
  // should check the map has rendered
})

test('receiving a result with errors', async ({ page }) => {
  const resultsPage = new ResultsPage(page)

  await resultsPage.navigateToRequest('complete-errors')
  await resultsPage.expectPageIsErrorsPage()

  // should check the error summary has rendered
  // should check the error table has rendered
})

test('receiving a result with a 404', () => {

})
