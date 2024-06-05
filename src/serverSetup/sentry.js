import * as Sentry from '@sentry/node'
import { nodeProfilingIntegration } from '@sentry/profiling-node'

const setupSentry = (app) => {
  if (process.env.SENTRY_ENABLED?.toLowerCase() === 'true') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      integrations: [nodeProfilingIntegration()],
      enableTracing: process.env.SENTRY_TRACING_ENABLED?.toLowerCase() === 'true',
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACING_SAMPLE_RATE || '0.01'),
      profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.01'),
      debug: process.env.SENTRY_DEBUG?.toLowerCase() === 'true',
      release: process.env.GIT_COMMIT
    })

    Sentry.setupExpressErrorHandler(app)
  }
}

export { setupSentry }
