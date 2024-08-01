import checkFormWizard from '../routes/form-wizard/check/index.js'
import endpointSubmissionFormFormWisard from '../routes/form-wizard/endpoint-submission-form/index.js'
import accessibility from '../routes/accessibility.js'
import polling from '../routes/api.js'
import health from '../routes/health.js'
import manage from '../routes/manage.js'
import privacy from '../routes/privacy.js'
import cookies from '../routes/cookies.js'

export function setupRoutes (app) {
  app.use('/', checkFormWizard)
  app.use('/submit', endpointSubmissionFormFormWisard)
  app.use('/accessibility', accessibility)
  app.use('/api', polling)
  app.use('/health', health)
  app.use('/manage', manage)
  app.use('/privacy-notice', privacy)
  app.use('/cookies', cookies)
}
