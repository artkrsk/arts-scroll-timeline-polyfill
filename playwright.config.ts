import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: './tests/browser',
  workers: 2,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:8845', trace: 'retain-on-failure' },
  projects: [
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
    { name: 'mobile-webkit', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: 'pnpm build:fixtures && python3 -m http.server 8845 --bind 127.0.0.1',
    url: 'http://127.0.0.1:8845/.cache/browser-fixtures/tests/browser-parity.html',
    reuseExistingServer: false,
  },
})
