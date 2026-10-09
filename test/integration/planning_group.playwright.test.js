import { test, expect } from '@playwright/test'

const resetWiremock = async () => {
  const response = await fetch('http://localhost:8001/__admin/mappings/reset', {
    method: 'POST'
  })
  if (!response.ok) {
    throw new Error(`Failed to reset WireMock mappings: ${response.status} ${await response.text()}`)
  }
}

const addWiremockStub = async (stub) => {
  const response = await fetch('http://localhost:8001/__admin/mappings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(stub)
  })
  if (!response.ok) {
    throw new Error(`Failed to add WireMock stub: ${response.status} ${await response.text()}`)
  }
}

test.describe('Planning group', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async () => {
    await resetWiremock()
  })

  test('An LPA shows its planning group when the membership panel is expanded', async ({ page }) => {
    // Stub the local-planning-group entity endpoint to return a group containing local-authority:SLF
    await addWiremockStub({
      priority: 1,
      request: {
        method: 'GET',
        urlPattern: '/entity.json.*prefix=local-planning-group.*'
      },
      response: {
        status: 200,
        jsonBody: {
          entities: [
            {
              entity: 9000001,
              name: 'South London Joint Planning Group',
              prefix: 'local-planning-group',
              reference: 'south-london-joint',
              'organisation-entity': 9000001,
              organisations: 'local-authority:SLF;local-authority:LBH',
              'end-date': ''
            }
          ],
          count: 1
        }
      }
    })

    // Navigate to the LPA overview for SLF
    await page.goto('/organisations/local-authority:SLF')

    const membership = page.locator('details').filter({ has: page.locator('summary', { hasText: 'Group membership' }) })
    const groupLink = membership.getByRole('link', { name: 'South London Joint Planning Group', includeHidden: true })
    await expect(membership.locator('summary')).toBeVisible()
    await expect(groupLink).toBeHidden()
    await membership.locator('summary').click()
    await expect(groupLink).toBeVisible()
    await expect(groupLink).toHaveAttribute('href', '/organisations/local-planning-group:south-london-joint')
  })
})
