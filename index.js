'use strict'

import logger from './src/utils/logger.js'
import express from 'express'
import cookieParser from 'cookie-parser'
import session from 'express-session'
import nunjucks from 'nunjucks'
import bodyParser from 'body-parser'
import config from './config/index.js'
import xGovFilters from '@x-govuk/govuk-prototype-filters'
import formWizard from './src/routes/form-wizard/index.js'
import validationMessageLookup from './src/filters/validationMessageLookup.js'
import toErrorList from './src/filters/toErrorList.js'
import hash from './src/utils/hasher.js'

const { govukMarkdown } = xGovFilters

const app = express()

app.use(async (req, res, next) => {
  // log the request
  logger.info({
    type: 'Request',
    method: req.method,
    endpoint: req.originalUrl,
    message: `${req.method} request made to ${req.originalUrl}`,
    sessionId: await hash(req.sessionID),
    ipAddress: await hash(req.ip)
  })
  next()
})

// add routing for static assets
app.use('/assets', express.static('./node_modules/govuk-frontend/govuk/assets'))
app.use('/public', express.static('./public'))

// cookies and sessions (redis or elasticache should be used in a prod env)
app.use(cookieParser())
app.use(session({
  secret: 'keyboard cat', // ToDo: move to config
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}))

// templating engine (turn on caching and turn off watching in prod env)
app.set('view engine', 'html')
const nunjucksEnv = nunjucks.configure([
  'src/views',
  'node_modules/govuk-frontend/',
  'node_modules/@x-govuk/govuk-prototype-components/'
], {
  express: app,
  dev: true,
  noCache: true,
  watch: true
})

const globalValues = {
  serviceName: 'Publish planning and housing data for England'
}

Object.keys(globalValues).forEach((key) => {
  nunjucksEnv.addGlobal(key, globalValues[key])
})
nunjucksEnv.addFilter('govukMarkdown', govukMarkdown)
nunjucksEnv.addFilter('validationMessageLookup', validationMessageLookup)
nunjucksEnv.addFilter('toErrorList', toErrorList)

// body parser
app.use(bodyParser.urlencoded({ extended: true }))

// 503 page (for when the service is unavailable)
app.use((req, res, next) => {
  const serviceDown = config.maintenance.serviceUnavailable || false
  if (serviceDown) {
    res.status(503).render('errorPages/503', { upTime: config.maintenance.upTime })
  } else {
    next()
  }
})

app.use('/', formWizard)

// error handler
app.use((err, req, res, next) => {
  logger.info({
    type: 'Request error',
    method: req.method,
    endpoint: req.originalUrl,
    message: `${req.method} request made to ${req.originalUrl} but an error occurred`,
    error: err
  })

  err.template = err.template || 'errorPages/500'

  // handle session expired
  if (err.code === 'SESSION_TIMEOUT') {
    err.template = 'session-expired'
  }

  // handle errors with automatic redirects
  if (err.redirect) {
    return res.redirect(err.redirect)
  }

  // show error page
  err.status = err.status || 500
  res.status(err.status).render(err.template, { err })
})

app.get('/health', (req, res) => {
  logger.info({ type: 'healthcheck', message: 'Application health endpoint was called and the health is ok' })
  res.status(200).json({ applicationHealth: 'ok' })
})

// file not found handler
app.use((req, res, next) => {
  logger.info({
    type: 'File not found',
    method: req.method,
    endpoint: req.originalUrl,
    message: `${req.method} request made to ${req.originalUrl} but the file/endpoint was not found`
  })
  res.status(404).render('errorPages/404')
})

// listen for incomming requests
app.listen(config.port, () => {
  logger.info('App listening on http://localhost::port', { port: config.port })
})
