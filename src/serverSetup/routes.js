import checkFormWizard from '../routes/form-wizard/check/index.js'
import endpointSubmissionFormFormWisard from '../routes/form-wizard/endpoint-submission-form/index.js'
import accessibility from '../routes/accessibility.js'
import polling from '../routes/api.js'
import health from '../routes/health.js'
import organisations from '../routes/organisations.js'
import manage from '../routes/manage.js'
import privacy from '../routes/privacy.js'
import cookies from '../routes/cookies.js'
import guidance from '../routes/guidance.js'
import { isFeatureEnabled } from '../utils/features.js'
import { renderTemplate } from '../middleware/middleware.builders.js'

const renderWhatever = renderTemplate({
  templateParams: (req) => {
    return {
      organisation: { name: 'Lincolshire' },
      dataset: { name: 'Tree Outline or whatever' },
      task: {
        qualityCriteriaLevel: 2
      }
    }
  },
  template: 'check/results/issueDetails.html',
  handlerName: 'whatever'
})

export function setupRoutes (app) {
  app.use('/', manage)
  app.use('/check', checkFormWizard)
  app.use('/organisations', organisations)
  app.use('/guidance', guidance)

  app.use('/api', polling)

  app.use('/accessibility', accessibility)
  app.use('/privacy-notice', privacy)
  app.use('/cookies', cookies)
  app.use('/health', health)
  app.use('/whatever', renderWhatever)

  // feature flagged routes
  if (isFeatureEnabled('submitEndpointForm')) app.use('/submit', endpointSubmissionFormFormWisard)
}
