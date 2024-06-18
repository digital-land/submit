import formWizard from '../routes/form-wizard/index.js'

export function setupRoutes (app) {
  app.use('/', formWizard)
}
