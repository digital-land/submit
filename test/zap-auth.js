import { request } from '@playwright/test'
import { spawnSync } from 'node:child_process'
import { mkdirSync, closeSync, openSync, chmodSync, readFileSync } from 'node:fs'
import { createAuthEnvironment } from './authEnvironment.js'

const env = {
  ...process.env,
  ...(!process.env.AUTH_JWT_PRIVATE_KEY ? createAuthEnvironment() : {}),
  NODE_VERSION: readFileSync('.nvmrc', 'utf8').trim()
}
const compose = (...args) => {
  const result = spawnSync('docker', ['compose', '-f', 'docker-compose.security.yml', ...args], { env, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error('Security scan Compose command failed')
}
mkdirSync('zap-working-dir', { recursive: true })
closeSync(openSync('zap-working-dir/zap.log', 'a'))
chmodSync('zap-working-dir', 0o777)
chmodSync('zap-working-dir/zap.log', 0o666)
compose('up', '-d', '--build', '--wait', 'web')
compose('pull', 'zap')
const context = await request.newContext({ baseURL: 'http://localhost:5000' })
try {
  const login = await context.get('/auth/login')
  if (!login.ok() || new URL(login.url()).pathname !== '/check/dataset') throw new Error('ZAP sign-in failed')
  const page = await context.get('/check/link?dataset=article-4-direction-area&orgId=local-authority%3ANET&orgName=Newcastle%20City%20Council')
  if (!page.ok() || new URL(page.url()).pathname !== '/check/upload-method') throw new Error('ZAP did not reach the authenticated journey')
  const { cookies } = await context.storageState()
  const tokenCookie = cookies.find(cookie => cookie.name === 'submit_access_token')
  // Allow startup headroom above the container's 30-minute execution limit.
  if (!tokenCookie || tokenCookie.expires * 1000 - Date.now() < 35 * 60 * 1000) throw new Error('ZAP login will expire before the bounded scan finishes')
  env.ZAP_AUTH_HEADER_VALUE = cookies.filter(cookie => ['connect.sid', 'submit_access_token'].includes(cookie.name))
    .map(cookie => `${cookie.name}=${cookie.value}`).join('; ')
  compose('run', '--rm', '-e', 'ZAP_AUTH_HEADER_VALUE', 'zap')
} finally { await context.dispose() }
