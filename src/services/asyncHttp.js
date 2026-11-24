import axios from 'axios'
import config from '../../config/index.js'
import { getAuthHeaders } from './asyncAuth.js'

// Keep JSON diagnostics only. A streamed Axios error body can reference the outgoing request.
function safeResponseData (value, token, depth = 0) {
  if (typeof value === 'string') return value.replaceAll(token, '[REDACTED]')
  if (value == null || typeof value === 'boolean' || typeof value === 'number') return value
  if (depth >= 32) return undefined
  if (Array.isArray(value)) return value.map(item => safeResponseData(item, token, depth + 1))
  if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) return undefined

  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => key.toLowerCase() !== 'authorization')
    .map(([key, item]) => [key.replaceAll(token, '[REDACTED]'), safeResponseData(item, token, depth + 1)]))
}

async function send (method, url, data, options) {
  const base = new URL(config.asyncRequestApi.url)
  const target = new URL(url)
  if (target.origin !== base.origin || target.username || target.password) {
    throw new Error('Async request must target the configured API')
  }
  const href = target.href
  const headers = await getAuthHeaders()
  const settings = {
    timeout: options?.timeout,
    headers: { ...options?.headers, ...headers },
    baseURL: '',
    allowAbsoluteUrls: true,
    maxRedirects: 0
  }
  try {
    return method === 'get'
      ? await axios.get(href, settings)
      : await axios.post(href, data, settings)
  } catch (error) {
    // Axios errors retain request headers and sockets. Do not pass tokens into logs/Sentry.
    const token = headers.Authorization?.slice(7)
    const message = token ? String(error.message).replaceAll(token, '[REDACTED]') : error.message
    const safeError = new Error(message)
    safeError.code = error.code
    if (error.response) {
      safeError.response = { status: error.response.status, data: safeResponseData(error.response.data, token) }
    }
    throw safeError
  }
}

export default {
  get: (url, options) => send('get', url, undefined, options),
  post: (url, data, options) => send('post', url, data, options)
}
