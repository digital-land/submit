import formWizard from './src/routes/form-wizard/index.js'
import accessibility from './src/routes/accessibility.js'
import polling from './src/routes/api.js'

export function setupRoutes(app) {
  app.use('/', formWizard)
  app.use('/accessibility', accessibility)
  app.use('/api', polling)
}