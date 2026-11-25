import { fileURLToPath, URL } from 'url'

import { defineConfig } from 'vite'
import { createAuthEnvironment } from './test/authEnvironment.js'

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    env: createAuthEnvironment(),
    coverage: {
      // you can include other reporters, but 'json-summary' is required, json is recommended
      reporter: ['text', 'json-summary', 'json'],
      // If you want a coverage reports even if your tests are failing, include the reportOnFailure option
      reportOnFailure: true,
      // ignore these files
      exclude: ['**/node_modules/**', '**/test/**', '**/public/**', '**/coverage/**', '**/vite.config.js', '**/.history/**']
    },
    environmentOptions: {
      jsdom: {
        url: 'http://localhost/'
      }
    }
  }
})
