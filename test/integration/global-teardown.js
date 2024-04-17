import { test as teardown } from '@playwright/test'

import Wiremock from '../testContainers/wiremock'
import Localstack from '../testContainers/localstack'

teardown('Global teardown', async () => {
  console.log('Global teardown')

  teardown.setTimeout(5 * 60 * 1000)

  await new Wiremock().stop()

  await new Localstack().stop()
})
