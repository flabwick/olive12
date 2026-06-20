import { defineConfig, devices } from '@playwright/test'
import { loadEnv } from 'vite'

const env = loadEnv('development', process.cwd(), '')
const devPort = Number(env.PORT) || 5173
const e2ePort = Number(env.E2E_PORT) || devPort + 1
const baseURL = `http://localhost:${e2ePort}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev:e2e',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    env: {
      ...env,
      PORT: String(e2ePort),
      VITE_E2E_AUTH_BYPASS: 'true',
    },
  },
})
