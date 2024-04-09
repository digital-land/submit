import { test as teardown } from '@playwright/test'

teardown('Global teardown', async () => {
  console.log('Global teardown')
  // Delete the database
})
