import { describe, expect, it } from 'vitest'
import { JSDOM } from 'jsdom'
import { setupNunjucks } from '../../../../src/serverSetup/nunjucks.js'

const nunjucks = setupNunjucks({ datasetNameMapping: new Map() })

describe('check/column-mapping.html', () => {
  it('renders mapping rows and submit actions', () => {
    const html = nunjucks.render('check/column-mapping.html', {
      options: {
        lastPage: '/check/status/123',
        requestParams: {
          organisationName: 'local-authority:ABC',
          dataset: 'conservation-area'
        },
        mappingRows: [
          {
            field: 'reference',
            column: 'Reference',
            isMapped: true,
            isEditable: false,
            userDefined: false
          },
          {
            field: 'notes',
            column: '',
            isMapped: false,
            isEditable: true,
            userDefined: false
          }
        ],
        uploadedColumns: ['Name', 'Reference'],
        columnMappingErrors: {
          notes: {
            text: 'Select the notes field'
          }
        }
      }
    })

    const document = new JSDOM(html, { url: 'http://localhost' }).window.document
    const notesSelect = document.querySelector('select[name="fieldMap[notes]"]')
    const notesRow = notesSelect.closest('tr')

    expect(document.querySelector('th').textContent).toContain('Expected fields')
    expect(document.querySelector('td strong').textContent).toBe('reference')
    expect(document.querySelectorAll('td')[1].textContent).toContain('Reference')
    expect(document.defaultView.getComputedStyle(document.querySelector('td')).verticalAlign).toBe('middle')
    expect(document.querySelector('.govuk-error-summary').textContent).toContain('Select the notes field')
    expect(document.querySelector('.govuk-error-summary a').getAttribute('href')).toBe('#fieldMap-1')
    expect(document.querySelector('.govuk-error-message').textContent).toContain('Select the notes field')
    expect(document.querySelector('.govuk-form-group').className).toContain('govuk-!-margin-bottom-0')
    expect(notesRow.className).toContain('govuk-form-group--error')
    expect(notesRow.textContent).toContain('notes')
    expect(document.querySelector('.govuk-form-group').className).not.toContain('govuk-form-group--error')
    expect(document.querySelector('button[form="columnMappingForm"]').textContent).toContain('Check your data')
  })

  it('does not render an error summary when there are no mapping errors', () => {
    const html = nunjucks.render('check/column-mapping.html', {
      options: {
        lastPage: '/check/status/123',
        requestParams: {
          organisationName: 'local-authority:ABC',
          dataset: 'conservation-area'
        },
        mappingRows: [
          {
            field: 'notes',
            column: '',
            isMapped: false,
            userDefined: false
          }
        ],
        uploadedColumns: ['Name', 'Reference'],
        columnMappingErrors: {}
      }
    })

    const document = new JSDOM(html, { url: 'http://localhost' }).window.document

    expect(document.querySelector('.govuk-error-summary')).toBeNull()
    expect(document.querySelector('.govuk-error-message')).toBeNull()
  })

  it('shows not provided for required fields', () => {
    const html = nunjucks.render('check/column-mapping.html', {
      options: {
        lastPage: '/check/status/123',
        requestParams: {
          organisationName: 'local-authority:ABC',
          dataset: 'conservation-area'
        },
        mappingRows: [
          {
            field: 'reference',
            column: '',
            isMapped: false,
            isEditable: true,
            userDefined: false,
            isRequired: true
          }
        ],
        uploadedColumns: ['Reference'],
        columnMappingErrors: {}
      }
    })

    const document = new JSDOM(html, { url: 'https://example.test/' }).window.document

    expect(document.querySelector('option[value="na"]')).not.toBeNull()
    expect(document.querySelector('option[value="na"]').textContent).toContain('Not provided')
  })

  it('preselects user-defined mapped fields in the selector', () => {
    const html = nunjucks.render('check/column-mapping.html', {
      options: {
        lastPage: '/check/status/123',
        requestParams: {
          organisationName: 'local-authority:ABC',
          dataset: 'conservation-area'
        },
        mappingRows: [
          {
            field: 'notes',
            column: 'Shape__Area',
            isMapped: true,
            userDefined: true,
            isEditable: true,
            isRequired: false
          }
        ],
        uploadedColumns: ['Shape__Area', 'Reference'],
        columnMappingErrors: {}
      }
    })

    const document = new JSDOM(html, { url: 'https://example.test/' }).window.document
    const fieldSelect = document.querySelector('select[name="fieldMap[notes]"]')

    expect(fieldSelect).not.toBeNull()
    expect(fieldSelect.value).toBe('Shape__Area')
    expect(document.querySelectorAll('td')[2].textContent).toContain('Unmapped')
  })

  it('shows not provided for optional fields', () => {
    const html = nunjucks.render('check/column-mapping.html', {
      options: {
        lastPage: '/check/status/123',
        requestParams: {
          organisationName: 'local-authority:ABC',
          dataset: 'conservation-area'
        },
        mappingRows: [
          {
            field: 'notes',
            column: '',
            isMapped: false,
            userDefined: false,
            userIgnored: false,
            isEditable: true,
            isRequired: false
          }
        ],
        uploadedColumns: ['Notes'],
        columnMappingErrors: {}
      }
    })

    const document = new JSDOM(html).window.document

    expect(document.querySelector('option[value="na"]').textContent).toContain('Not provided')
  })

  it('preselects not provided when field is user ignored', () => {
    const html = nunjucks.render('check/column-mapping.html', {
      options: {
        lastPage: '/check/status/123',
        requestParams: {
          organisationName: 'local-authority:ABC',
          dataset: 'conservation-area'
        },
        mappingRows: [
          {
            field: 'notes',
            column: '',
            isMapped: false,
            userDefined: false,
            userIgnored: true,
            isEditable: true,
            isRequired: false
          }
        ],
        uploadedColumns: ['Notes'],
        columnMappingErrors: {}
      }
    })

    const document = new JSDOM(html).window.document
    const fieldSelect = document.querySelector('select[name="fieldMap[notes]"]')

    expect(fieldSelect).not.toBeNull()
    expect(fieldSelect.value).toBe('na')
  })
})
