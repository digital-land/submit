import { test as teardown } from '@playwright/test'

import Wiremock from '../testContainers/wiremock'
import Localstack from '../testContainers/localstack'

teardown('Global teardown', async () => {
  console.log('Global teardown')

  teardown.setTimeout(5 * 60 * 1000)

  await new Wiremock().stop()

  // Only stop the testcontainer locally — in CI it was never started (docker-compose handles LocalStack).
  if (!process.env.CI) {
    await new Localstack().stop()
  }
})
