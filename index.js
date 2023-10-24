const express = require('express')
const nunjucks = require('nunjucks')
const app = express()

nunjucks.configure('src/views', {
  express: app
})

app.get('/', (req, res) => {
  const data = {
    title: 'Hello World',
    content: 'This is a sample content'
  }
  res.render('helloWorld.html', data)
})

app.listen(3000, () => {
  console.log('Server listening on port 3000')
})
