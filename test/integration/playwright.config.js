// this file holds the playwright configuration for the integration tests

// @ts-check
import { defineConfig, devices } from '@playwright/test'
import config from '../../config/index.js'

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testMatch: '**/*.playwright.test.js',
  testDir: './',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: `http://127.0.0.1:${config.port}`,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry'
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'global setup',
      testMatch: '**/global-setup.js',
      teardown: 'global teardown'
    },
    {
      name: 'global teardown',
      testMatch: '**/global-teardown.js'
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['global setup']
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['global setup']
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      dependencies: ['global setup']
    }

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'NODE_ENV=test npm run start',
    url: `http://127.0.0.1:${config.port}`,
    reuseExistingServer: !process.env.CI
  }
})
