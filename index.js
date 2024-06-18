import express from 'express'
import { setupRoutes } from './src/serverSetup/routes.js'
import { setupSession } from './src/serverSetup/setupSession.js'
import { setupNunjucks } from './src/serverSetup/nunjucks.js'
import { setupMiddlewares } from './src/serverSetup/middlewares.js'

const app = express()
const port = 3000

setupMiddlewares(app)
setupSession(app)
setupNunjucks(app)
setupRoutes(app)

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`)
})
