import formWizard from '../routes/form-wizard/index.js'
import accessibility from '../routes/accessibility.js'
import polling from '../routes/api.js'

export function setupRoutes (app) {
  app.use('/', formWizard)
  app.use('/accessibility', accessibility)
  app.use('/api', polling)
}
