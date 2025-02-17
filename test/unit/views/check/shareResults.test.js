import { describe, it, expect } from 'vitest'
import { setupNunjucks } from '../../../../src/serverSetup/nunjucks.js'
import { JSDOM } from 'jsdom'
import { runGenericPageTests } from '../../generic-page.js'
import { stripWhitespace } from '../../../utils/stripWhiteSpace.js'

describe('Share Results Page', () => {
    const params = {
        options: {
            lpa: 'Test LPA',
            datasetName: 'Test Dataset',
            shareLink: 'http://example.com/check/results/123',
            requestParams: {
                dataset: 'fallback-dataset-name'
            }
        }
    }

    const nunjucks = setupNunjucks({ datasetNameMapping: new Map() })
    const html = stripWhitespace(nunjucks.render('check/results/shareResults.html', params))
    const dom = new JSDOM(html)
    const document = dom.window.document

    runGenericPageTests(html, {
        pageTitle: 'Share these results - Submit and update your planning data'
    })

    it('Renders the correct page heading', () => {
        const heading = document.querySelector('.govuk-heading-l')
        expect(heading.textContent.trim()).toBe('Share these results')
    })

    it('Displays the dataset banner with correct information', () => {
        const banner = document.querySelector('[data-testid="dataset-banner"]')
        expect(banner.textContent).toContain('Test LPA')
        expect(banner.textContent).toContain('Test Dataset')
    })

    it('Shows the fallback dataset name when datasetName is not provided', () => {
        const paramsWithoutDatasetName = {
            options: {
                ...params.options,
                datasetName: undefined
            }
        }
        const htmlWithFallback = stripWhitespace(nunjucks.render('check/results/shareResults.html', paramsWithoutDatasetName))
        const domWithFallback = new JSDOM(htmlWithFallback)
        const bannerWithFallback = domWithFallback.window.document.querySelector('[data-testid="dataset-banner"]')
        expect(bannerWithFallback.textContent).toContain('fallback-dataset-name')
    })

    it('Displays the share link correctly', () => {
        const linkElement = document.querySelector('.govuk-grid-column-two-thirds code a')
        expect(linkElement.href).toBe('http://example.com/check/results/123')
        expect(linkElement.textContent).toBe('http://example.com/check/results/123')
    })

    it('Has a copy link button', () => {
        const copyButton = document.querySelector('button.app-c-button--secondary-quiet')
        expect(copyButton).not.toBeNull()
        expect(copyButton.textContent.trim()).toBe('Copy link')
    })

    it('Contains the explanatory text', () => {
        const explanation = document.querySelector('.govuk-grid-column-two-thirds > p:first-of-type')
        expect(explanation.textContent.trim()).toBe('Copy and send this link to someone and they will be able to view the results.')
    })
})
