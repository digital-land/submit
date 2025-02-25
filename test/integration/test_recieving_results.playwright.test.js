/*
    this file will be responsible for testing the results of the checks
    we should have tests for:
        - a file with no errors
        - a file with some errors (both column and row)
        - a file that failed to process (due to 404)
        - a file that failed to process (due to another reason) (ToDo)
*/

import { test, expect } from '@playwright/test'

import ResultsPage from '../PageObjectModels/resultsPage'

import prettifyColumnName from '../../src/filters/prettifyColumnName'

import fs from 'fs'
import { splitByLeading } from '../../src/utils/table'

test('receiving a successful result', async ({ page }) => {
  const successResponse = readJsonFile('docker/request-api-stub/wiremock/__files/check_file/article-4/request-complete.json')
  const successResponseDetails = readJsonFile('docker/request-api-stub/wiremock/__files/check_file/article-4/request-complete-details.json')

  const resultsPage = new ResultsPage(page)

  await resultsPage.navigateToRequest('complete')
  await resultsPage.expectPageHasTitle()

  await expect(page.locator('#main-content')).toContainText('Your data has been checked')

  await resultsPage.clickTableTab()

  const tableValues = await getTableContents(page, 'govuk-table')
  const expectedTableValues = getTableValuesFromResponse(successResponse, successResponseDetails)
  expect(tableValues).toEqual(expectedTableValues)
})

test('receiving a result with errors', async ({ page }) => {
  const errorResponse = readJsonFile('docker/request-api-stub/wiremock/__files/check_file/article-4/request-complete-errors.json')
  const errorResponseDetails = readJsonFile('docker/request-api-stub/wiremock/__files/check_file/article-4/request-complete-errors-details.json')

  const resultsPage = new ResultsPage(page)

  await resultsPage.navigateToRequest('complete-errors')
  await resultsPage.expectPageHasTitle()

  await resultsPage.clickTableTab()

  const tableValues = await getTableContents(page, 'govuk-table')
  const expectedTableValues = getTableValuesFromResponse(errorResponse, errorResponseDetails)
  expect(tableValues[0]).toEqual(expectedTableValues[0])
  expect(tableValues[1]).toEqual(expectedTableValues[1])
  expect(tableValues[2]).toEqual(expectedTableValues[3])

  const issues = errorResponseDetails.map(detail => detail.issue_logs.filter(issue => issue.severity === 'error').map(issue => issue.message)).filter(issue => issue.length > 0)

  for (const [index, issuesForRow] in issues) {
    for (const issue in issuesForRow) {
      await expect(page.locator('.govuk-table').locator('tr').nth(parseInt(index) + 1)).toContainText(prettifyColumnName(issue))
    }
  }
})

test('receiving a non existing result', async ({ page }) => {
  const resultsPage = new ResultsPage(page)
  const response = await resultsPage.navigateToRequest('non-existing')
  expect(response.status()).toBe(404)
})

const getTableContents = async (page, tableClass) => {
  const tableContents = []

  const table = await page.locator(`.${tableClass}`)
  const rowCount = await table.locator('tr').count()

  for (let i = 0; i < rowCount; i++) {
    tableContents.push(await getTableRowValues(page, table, i))
  }

  return tableContents
}

const getTableRowValues = async (page, table, rowIndex) => {
  const textsFromNthColumn = []
  const row = await table.locator('tr').nth(rowIndex)
  const columnCount = await row.locator('td, th').count()

  for (let i = 0; i < columnCount; i++) {
    textsFromNthColumn.push(await getTableCellValue(page, row, i))
  }

  return textsFromNthColumn
}

const getTableCellValue = async (page, row, column) => {
  const cell = await row.locator('td, th').nth(column)

  if (await cell.locator('p').count() > 0) {
    return await cell.locator('p').nth(0).innerText()
  } else {
    return await cell.innerText()
  }
}

const getTableValuesFromResponse = (response, details) => {
  const columnFieldLog = response.response.data['column-field-log']

  const columnHeaders = Object.keys(details[0].converted_row)
  const logByField = new Map()
  for (const log of columnFieldLog) { logByField.set(log.column, log) }
  const uniqueHeaders = new Set(columnHeaders.map(header => {
    return logByField.get(header)?.field ?? header
  }))

  const { leading, trailing } = splitByLeading({ fields: uniqueHeaders })
  const orderedUniqueHeaders = [...leading, ...trailing]

  const prettifiedHeaders = orderedUniqueHeaders.map(header => prettifyColumnName(header))
  const tableValues = [prettifiedHeaders]

  tableValues.push(...details.map(detail => {
    const convertedRow = detail.converted_row
    return orderedUniqueHeaders.map(header => {
      const log = columnFieldLog.find(log => log.field === header)
      if (log) { header = log.column }

      return convertedRow[header]
    })
  }))

  return tableValues
}

const readJsonFile = (path) => {
  const jsonData = fs.readFileSync(path, 'utf-8')
  return JSON.parse(jsonData)
}
