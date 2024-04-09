import { test as setup } from '@playwright/test'

import Wiremock from '../testContainers/wiremock'

setup('initialise wiremock', async () => {
  console.log('initialise wiremock')
  await new Wiremock().start()
})
