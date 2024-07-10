import checkFormWizard from '../routes/form-wizard/check/index.js'
import endpointSubmissionFormFormWisard from '../routes/form-wizard/endpoint-submission-form/index.js'
import accessibility from '../routes/accessibility.js'
import polling from '../routes/api.js'
import health from '../routes/health.js'

export function setupRoutes (app) {
  app.use('/', checkFormWizard)
  app.use('/submit', endpointSubmissionFormFormWisard)
  app.use('/accessibility', accessibility)
  app.use('/api', polling)
  app.use('/health', health)
}
