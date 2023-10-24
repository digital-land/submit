const express = require('express')
const nunjucks = require('nunjucks')
const app = express()

const path = require('path')
app.use('/public', express.static(path.join(__dirname, '/public')))
app.use('/govuk-frontend', express.static(path.join(__dirname, '/node_modules/govuk-frontend/govuk')))
app.use('/assets', express.static(path.join(__dirname, '/node_modules/govuk-frontend/govuk/assets')))

nunjucks.configure([
  'src/views',
  'node_modules/govuk-frontend/'
], {
  express: app
})

app.get('/helloWorld', (req, res) => {
  const data = {
    title: 'Hello World',
    content: 'This is a sample content'
  }
  res.render('helloWorld.html', data)
})

app.get('/', (req, res) => {
  const data = {}
  res.render('index.html', data)
})

app.listen(3000, () => {
  console.log('Server listening on port 3000')
})
