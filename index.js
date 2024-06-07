import express from 'express'
import { setupRoutes } from './src/serverSetup/routes.js'

const app = express()
const port = 3000

setupRoutes(app)

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`)
});