// ToDo: need to duplicate this test for submit start page

import { describe } from 'vitest'
import { setupNunjucks } from '../../src/serverSetup/nunjucks.js'
import { runGenericPageTests } from './generic-page.js'
import config from '../../config/index.js'
import { mockDataSubjects } from './data.js'

const nunjucks = setupNunjucks({ dataSubjects: mockDataSubjects })

describe('Start View', () => {
  const params = {}
  const html = nunjucks.render('start.html', params)

  runGenericPageTests(html, {
    pageTitle: 'Start - Check planning and housing data for England',
    serviceName: config.serviceName
  })
})
