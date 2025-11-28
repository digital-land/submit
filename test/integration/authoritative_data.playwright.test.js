import { test, expect } from '@playwright/test'

const addWiremockMapping = async (mapping) => {
  const response = await fetch('http://localhost:8001/__admin/mappings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mapping)
  })
  if (!response.ok) {
    throw new Error(`Failed to add Wiremock mapping: ${response.statusText}`)
  }
}

const resetWiremock = async () => {
  await fetch('http://localhost:8001/__admin/mappings', {
    method: 'DELETE'
  })
}

test.beforeEach(async () => {
  await resetWiremock()
})

test('The LPA Dashboard reflects both auth and non-auth data, and the non-auth dataset shows ', async ({ page }) => {
  // Mock Platform API response for Authoritative check - conservation-area-document (Not Found)
  await addWiremockMapping({
    priority: 1,
    request: {
      method: 'GET',
      urlPattern: '/entity.json.*dataset=conservation-area-document.*quality=authoritative.*'
    },
    response: {
      status: 200,
      jsonBody: {
        entities: [],
        links: {},
        count: 0
      }
    }
  })

  // Mock Platform API response for Authoritative check - other datasets (Found)
  await addWiremockMapping({
    priority: 2,
    request: {
      method: 'GET',
      urlPattern: '/entity.json.*quality=authoritative.*'
    },
    response: {
      status: 200,
      jsonBody: {
        entities: [{
          entity: 123,
          name: 'Authoritative Entity',
          dataset: 'some-dataset',
          quality: 'authoritative'
        }],
        count: 1
      }
    }
  })

  // Mock Platform API response for Some quality check - conservation-area-document (Found)
  await addWiremockMapping({
    request: {
      method: 'GET',
      urlPattern: '/entity.json.*dataset=conservation-area-document.*quality=some.*'
    },
    response: {
      status: 200,
      jsonBody: {
        entities: [
          {
            'entry-date': '2025-08-20',
            'start-date': '',
            'end-date': '',
            entity: 6101792,
            name: 'Conservation area document',
            dataset: 'conservation-area-document',
            typology: 'document',
            reference: 'CAD1',
            prefix: 'conservation-area-document',
            'organisation-entity': '301',
            geometry: '',
            point: '',
            quality: 'some',
            description: 'Conservation area document description',
            'document-url': 'https://example.com/doc.pdf'
          }
        ],
        count: 1
      }
    }
  })

  // Mock Platform API response for Dataset info
  await addWiremockMapping({
    priority: 1,
    request: {
      method: 'GET',
      urlPattern: '/dataset.json.*dataset=conservation-area-document.*'
    },
    response: {
      status: 200,
      jsonBody: {
        datasets: [
          {
            dataset: 'conservation-area-document',
            name: 'Conservation area document',
            collection: 'conservation-area',
            typology: 'document'
          }
        ]
      }
    }
  })

  // Generic dataset info for others
  await addWiremockMapping({
    priority: 5,
    request: {
      method: 'GET',
      urlPattern: '/dataset.json.*'
    },
    response: {
      status: 200,
      jsonBody: {
        datasets: [
          {
            dataset: 'generic-dataset',
            name: 'Generic Dataset',
            collection: 'generic-collection',
            typology: 'geography'
          }
        ]
      }
    }
  })

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
