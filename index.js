'use strict'

const hmpoLogger = require('hmpo-logger')
const express = require('express')
const cookieParser = require('cookie-parser')
const session = require('express-session')
const nunjucks = require('nunjucks')
const path = require('path')
const bodyParser = require('body-parser')
const config = require('./config')
const { govukMarkdown } = require('@x-govuk/govuk-prototype-filters')

const logger = hmpoLogger.config(config.logs).get()

const app = express()

// log access requests
app.use(hmpoLogger.middleware())

// add routing for static assets
app.use('/public', express.static(path.resolve(__dirname, 'public')))

// cookies and sessions (redis or elasticache should be used in a prod env)
app.use(cookieParser())
app.use(session({
  secret: 'keyboard cat',
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

// body parser
app.use(bodyParser.urlencoded({ extended: true }))

app.use('/', require('./src/routes/form-wizard'))

// file not found handler
app.use((req, res, next) => {
  res.status(404).render('pages/file-not-found')
})

// error handler
app.use((err, req, res, next) => {
  logger.error('Request error', { req, err })

  res.send(err.message)

  // // handle session expired
  // if (err.code === 'SESSION_TIMEOUT') {
  //   err.template = 'pages/session-expired'
  // }

  // // handle errors with automatic redirects
  // if (err.redirect) {
  //   return res.redirect(err.redirect)
  // }

  // // show error page
  // err.status = err.status || 500
  // err.template = err.template || 'pages/error'
  // res.status(err.status).render(err.template, { err })
})

// listen for incomming requests
app.listen(config.port, () => {
  logger.info('App listening on http://localhost::port', { port: config.port })
})
