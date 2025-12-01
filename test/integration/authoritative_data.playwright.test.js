import { test, expect } from '@playwright/test'

const resetWiremock = async () => {
  await fetch('http://localhost:8001/__admin/mappings/reset', {
    method: 'POST'
  })
}

test.beforeEach(async () => {
  await resetWiremock()
})

test('The LPA Dashboard reflects both auth and non-auth data, and the non-auth dataset shows (provide authoritative data) as a task', async ({ page }) => {
  // Navigate to LPA Dashboard
  await page.goto('/organisations/local-authority:SLF')

  await expect(page.getByText('Data is not from an authoritative source')).toBeVisible()

  // Go to that dataset page
  await page.getByRole('link', { name: 'Conservation area document' }).click()

  // Check that this is shown in the title with review alternate data
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Review alternative source of Conservation area document data')
  // Go to task list
  await page.locator('a.govuk-service-navigation__link', { hasText: 'Task list' }).click()
  await expect(page.getByText('Provide authoritative data')).toBeVisible()
})
