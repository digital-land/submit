const express = require('express')
const nunjucks = require('nunjucks')
const app = express()
const { govukMarkdown } = require('@x-govuk/govuk-prototype-filters')

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

nunjucksEnv.addFilter('govukMarkdown', govukMarkdown)

app.get('/', (req, res) => {
  const data = {
    serviceName: 'Publish planning and housing data for England'
  }
  res.render('start.html', data)
})

app.listen(3000, () => {
  console.log('Server listening on port 3000')
})
