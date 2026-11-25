import * as Sentry from '@sentry/node'
import { nodeProfilingIntegration } from '@sentry/profiling-node'
import dotenv from 'dotenv'

dotenv.config()

function scrubAuthSpan (data, authRequest) {
  if (!data) return
  for (const key of ['http.target', 'http.url', 'url.full', 'url']) {
    if (typeof data[key] !== 'string') continue
    try {
      if (new URL(data[key], 'https://submit.invalid').pathname.startsWith('/auth/')) {
        data[key] = data[key].split(/[?#]/)[0]
        authRequest = true
      }
    } catch { /* Ignore attributes that are not URLs. */ }
  }
  if (authRequest) {
    for (const key of ['http.query', 'url.query', 'http.fragment', 'url.fragment']) delete data[key]
  }
}

// Bearer cookies must not reach error or tracing telemetry.
export function scrubAuthRequest (event) {
  const request = event.request
  if (request) delete request.cookies
  if (request?.headers) {
    for (const key of Object.keys(request.headers)) {
      if (['cookie', 'authorization'].includes(key.toLowerCase())) delete request.headers[key]
    }
  }
  let authRequest = false
  try {
    const url = new URL(request?.url)
    if (url.pathname.startsWith('/auth/')) {
      authRequest = true
      request.url = url.origin + url.pathname
      delete request.query_string
    }
  } catch { /* Events without a request URL need no URL redaction. */ }
  scrubAuthSpan(event.contexts?.trace?.data, authRequest)
  for (const span of event.spans || []) scrubAuthSpan(span.data, authRequest)
  return event
}

if (process.env.SENTRY_ENABLED?.toLowerCase() === 'true') {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [nodeProfilingIntegration()],
    enableTracing: process.env.SENTRY_TRACING_ENABLED?.toLowerCase() === 'true',
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACING_SAMPLE_RATE || '0.01'),
    profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.01'),
    debug: process.env.SENTRY_DEBUG?.toLowerCase() === 'true',
    release: process.env.GIT_COMMIT,
    enableLogs: true,
    beforeSend: (event) => {
      if (event.tags?.async_handled_processing_error) return null
      return scrubAuthRequest(event)
    },
    beforeSendTransaction: scrubAuthRequest
  })
}

const setupSentry = (app) => {
  if (process.env.SENTRY_ENABLED?.toLowerCase() === 'true') {
    Sentry.setupExpressErrorHandler(app)
  }
}

export { setupSentry }
