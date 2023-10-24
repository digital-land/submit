const express = require('express');
const nunjucks = require('nunjucks');
const app = express();

nunjucks.configure('src/views', {
    express:  app
});

app.get('/', (req, res) => {
    res.render('helloWorld.html');
});

app.listen(3000, () => {
    console.log('Server listening on port 3000');
});