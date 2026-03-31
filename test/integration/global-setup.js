import { test as setup } from '@playwright/test'

import Wiremock from '../testContainers/wiremock'
import Localstack from '../testContainers/localstack'

import config from '../../config/index'

let localstack

setup('Global setup', async () => {
  setup.setTimeout(5 * 60 * 1000)

  await new Wiremock().start()

  // In CI, LocalStack is provided by docker-compose with bucket already created via bootstrap script.
  // Only start the testcontainer locally where docker-compose is not running.
  if (!process.env.CI) {
    localstack = await new Localstack().start()
    await localstack.createBucket(config.aws.bucket)
  }
})
