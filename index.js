const express = require('express')
const nunjucks = require('nunjucks')
const app = express()
const { govukMarkdown } = require('@x-govuk/govuk-prototype-filters')

const bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({ extended: false }))

const path = require('path')
app.use('/public', express.static(path.join(__dirname, '/public')))
app.use('/govuk-frontend', express.static(path.join(__dirname, '/node_modules/govuk-frontend/govuk')))
app.use('/assets', express.static(path.join(__dirname, '/node_modules/govuk-frontend/govuk/assets')))

const nunjucksEnv = nunjucks.configure([
  'src/views',
  'node_modules/govuk-frontend/',
  'node_modules/@x-govuk/govuk-prototype-components/'
], {
  express: app
})

const globalValues = {
  serviceName: 'Publish planning and housing data for England'
}

Object.keys(globalValues).forEach((key) => {
  nunjucksEnv.addGlobal(key, globalValues[key])
})
nunjucksEnv.addFilter('govukMarkdown', govukMarkdown)

const indexRoutes = require('./src/routes/index')
const dataSubjectRoutes = require('./src/routes/data-subject')
const datasetRoutes = require('./src/routes/dataset')
const uploadRoutes = require('./src/routes/upload')

app.use('/', indexRoutes)
app.use('/', dataSubjectRoutes)
app.use('/', datasetRoutes)
app.use('/', uploadRoutes)

app.listen(3000, () => {
  console.log('Server listening on port 3000')
})
