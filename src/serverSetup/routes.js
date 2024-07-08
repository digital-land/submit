import formWizard from '../routes/form-wizard/index.js'
import accessibility from '../routes/accessibility.js'
import polling from '../routes/api.js'
import health from '../routes/health.js'

export function setupRoutes (app) {
<<<<<<< HEAD Need to setup two form wizard instances here to handle the two different form wizards
  app.use('/', formWizard)
=======
    app.use('/', formWizard)
>>>>>>> endpoint-submission-form/main
  app.use('/accessibility', accessibility)
  app.use('/api', polling)
  app.use('/health', health)
}
