import { test as setup } from '@playwright/test'

import Wiremock from '../testContainers/wiremock'
import Localstack from '../testContainers/localstack'

import config from '../../config/index'

let localstack

setup('Global setup', async () => {
  setup.setTimeout(1000 * 60 * 10)

  await new Wiremock().start()

  localstack = await new Localstack().start()
  await localstack.createBucket(config.aws.bucket)
})
