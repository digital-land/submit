import { WireMockContainer } from '@wiremock/wiremock-testcontainers-node'
import { fileURLToPath } from 'url'
import path, { dirname } from 'path'
import config from '../../config/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default class Wiremock {
  constructor () {
    this.image = 'wiremock/wiremock:3.4.2'
    this.mappingsFolder = path.join(__dirname, '../../docker/request-api-stub/wiremock')
    this.container = null
  }

  async start () {
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
      .withReuse(true).start()
    return this
  }

  async stop () {
    console.log('Stopping WiremockContainer')
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
      .withReuse(true).start()
    this.container.stop()
  }
}
