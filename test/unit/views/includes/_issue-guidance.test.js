import { describe, it, expect } from 'vitest'
import jsdom from 'jsdom'
import { setupNunjucks } from '../../../../src/serverSetup/nunjucks.js'

describe('_issue-guidance template', () => {
  const nunjucks = setupNunjucks({ datasetNameMapping: new Map() })

  it('renders nothing when no issueSpecification is provided', () => {
    const html = nunjucks.renderString('{% include "includes/_issue-guidance.html" %}', {})
    const dom = new jsdom.JSDOM(html)
    expect(dom.window.document.body.textContent.trim()).toBe('')
  })

  it('renders guidance when issueSpecification is provided', () => {
    const context = {
      issueSpecification: {
        field: 'planning-application-reference',
        guidance: 'This is a required field that should contain the reference number for the planning application.',
        datasetField: 'reference',
        dataset: 'planning-applications'
      },
      dataset: {
        name: 'Planning Applications',
        dataset: 'planning-applications'
      }
    }

    const html = nunjucks.renderString('{% include "includes/_issue-guidance.html" %}', context)
    const dom = new jsdom.JSDOM(html)
    const document = dom.window.document

    // Check for main heading
    const heading = document.querySelector('.govuk-heading-l')
    expect(heading.textContent.trim()).toBe('How to fix this issue')

    // Check for missing column message
    const missingColumnText = document.querySelector('.govuk-body strong')
    expect(missingColumnText.textContent).toBe('planning-application-reference')

    // Check for guidance content in inset text
    const insetText = document.querySelector('.govuk-inset-text')
    expect(insetText.textContent).toContain('This is a required field that should contain the reference number for the planning application')
    expect(insetText.textContent).toContain('planning-application-reference')
  })

  it('renders without guidance text when guidance is not provided', () => {
    const context = {
      issueSpecification: {
        field: 'planning-application-reference',
        datasetField: 'reference',
        dataset: 'planning-applications'
      },
      dataset: {
        name: 'Planning Applications',
        dataset: 'planning-applications'
      }
    }

    const html = nunjucks.renderString('{% include "includes/_issue-guidance.html" %}', context)
    const dom = new jsdom.JSDOM(html)
    const document = dom.window.document

    // Should still show the field name
    const fieldName = document.querySelector('.govuk-heading-m')
    expect(fieldName.textContent.trim()).toBe('planning-application-reference')

    // Should not contain guidance content
    const insetText = document.querySelector('.govuk-inset-text')
    expect(insetText.innerHTML).not.toContain('govukMarkdown')
  })
})
