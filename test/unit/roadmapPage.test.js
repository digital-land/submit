import { describe, it, expect } from 'vitest'
import express from 'express'
import request from 'supertest'
import jsdom from 'jsdom'
import { setupNunjucks } from '../../src/serverSetup/nunjucks.js'
import { runGenericPageTests } from './generic-page.js'
import roadmapRouter from '../../src/routes/roadmap.js'

const nunjucks = setupNunjucks({ datasetNameMapping: new Map() })

describe('Roadmap View', () => {
  const html = nunjucks.render('roadmap.html', {})
  const document = new jsdom.JSDOM(html).window.document

  runGenericPageTests(html, {
    pageTitle: 'Roadmap - Check and provide your planning data'
  })

  it('shows the roadmap sections', () => {
    const headings = [...document.querySelectorAll('h2')].map(h => h.textContent.trim())

    expect(headings).toContain('Our goal')
    expect(headings).toContain('Our progress so far')
    expect(headings).toContain('What we\'re planning to do next')
  })

  it('links to the roadmap from the footer', () => {
    const footerLink = document.querySelector('.govuk-footer a[href="/roadmap"]')

    expect(footerLink).not.toBeNull()
    expect(footerLink.textContent.trim()).toBe('Roadmap')
  })
})

describe('roadmap route', () => {
  it('returns the roadmap page', async () => {
    const app = express()
    app.use('/roadmap', roadmapRouter)

    const res = await request(app).get('/roadmap').expect(200)

    expect(res.text).toContain('Making it easier for councils to provide planning data')
  })
})

describe('Community View', () => {
  it('links to the roadmap', () => {
    const html = nunjucks.render('community.html', {})
    const document = new jsdom.JSDOM(html).window.document

    expect(document.querySelector('main a[href="/roadmap"], .govuk-width-container a[href="/roadmap"]')).not.toBeNull()
  })
})
