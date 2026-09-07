import { describe, it, expect } from 'vitest'
import jsdom from 'jsdom'
import fs from 'node:fs'
import path from 'node:path'
import { setupNunjucks } from '../../../../src/serverSetup/nunjucks.js'
import { withAssociatedEntityDiagram } from '../../../../src/utils/associatedEntityDiagrams.js'

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

  it('links to the dataset guidance, reading naturally mid-sentence', () => {
    const context = {
      issueSpecification: { field: 'tree-preservation-order', guidance: 'Existing guidance prose.' },
      dataset: { name: 'Tree preservation zone', dataset: 'tree-preservation-zone' }
    }

    const html = nunjucks.renderString('{% include "includes/_issue-guidance.html" %}', context)
    const document = new jsdom.JSDOM(html).window.document
    const link = document.querySelector('.govuk-body a')

    expect(link.textContent.trim()).toBe('tree preservation zone guidance')
    expect(link.getAttribute('href')).toBe('/guidance/specifications/tree-preservation-order')
    expect(document.body.textContent).toContain('explains how to fix the issue')
  })

  // The diagram is markdown in the guidance, so it only reaches the user if govukMarkdown renders
  // it and the downloaded SVG is where the src says it is.
  it.each([
    ['article-4-direction-area', 'article-4-direction', 'article-4-direction'],
    ['conservation-area-document', 'conservation-area', 'conservation-area'],
    ['tree-preservation-zone', 'tree-preservation-order', 'tree-preservation-order'],
    ['tree', 'tree-preservation-order', 'tree-preservation-order'],
    ['plan-timetable', 'plan', 'plan']
  ])('renders the relationship diagram for %s', (dataset, field, diagram) => {
    const context = {
      issueSpecification: withAssociatedEntityDiagram({ field, guidance: 'Existing guidance prose.' }, dataset),
      dataset: { name: dataset, dataset }
    }

    const html = nunjucks.renderString('{% include "includes/_issue-guidance.html" %}', context)
    const image = new jsdom.JSDOM(html).window.document.querySelector('.app-issue-guidance__markdown img')

    expect(image).not.toBeNull()
    expect(image.getAttribute('src')).toBe(`/public/static/images/diagrams/${diagram}.svg`)
    expect(image.getAttribute('alt')).toContain(`This diagram shows the relationship between the ${diagram.replace(/-/g, ' ')} dataset`)

    // The build downloads these into public/, and the committed baseline guarantees one is there.
    expect(fs.existsSync(path.join('src/assets/static/images/diagrams', `${diagram}.svg`))).toBe(true)
  })
})
