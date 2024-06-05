import * as Sentry from '@sentry/node'
import { nodeProfilingIntegration } from '@sentry/profiling-node'

const setupSentry = (app) => {
  if (process.env.SENTRY_ENABLED?.toLowerCase() === 'true') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      integrations: [nodeProfilingIntegration()],
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACING_SAMPLE_RATE || '0.01'),
      profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.01'),
      debug: process.env.SENTRY_DEBUG || false
    })

    Sentry.setupExpressErrorHandler(app)
  }
}

export { setupSentry }
