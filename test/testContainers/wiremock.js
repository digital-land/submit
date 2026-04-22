import { WireMockContainer } from '@wiremock/wiremock-testcontainers-node'
import { fileURLToPath } from 'url'
import path, { dirname } from 'path'
import config from '../../config/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default class Wiremock {
  static sharedContainer = null

  constructor () {
    this.image = 'wiremock/wiremock:3.4.2'
    this.mappingsFolder = path.join(__dirname, '../../docker/request-api-stub/wiremock')
    this.container = null
  }

  async start () {
    if (this.container) {
      return this
    }

    if (Wiremock.sharedContainer) {
      this.container = Wiremock.sharedContainer
      return this
    }

    const ciValue = String(process.env.CI ?? '').trim().toLowerCase()
    const isCI = ciValue === 'true' || ciValue === '1'
    const shouldReuseContainer = !isCI

    console.log('Starting WiremockContainer')
    console.log('copying files to container from: ' + this.mappingsFolder)
    this.container = await new WireMockContainer(this.image)
      .withBindMounts([{
        source: this.mappingsFolder,
        target: '/home/wiremock',
        mode: 'ro'
      }])
      .withExposedPorts({
        container: 8080,
        host: config.asyncRequestApi.port
      })
      .withReuse(shouldReuseContainer)
      .start()

    Wiremock.sharedContainer = this.container

    return this
  }

  async stop () {
    console.log('Stopping WiremockContainer')

    const container = this.container ?? Wiremock.sharedContainer
    if (!container) {
      return
    }

    await container.stop()
    this.container = null
    Wiremock.sharedContainer = null
  }
}
