import { expect, test } from '@playwright/test'

// Requires TEST_EMAIL and TEST_PASSWORD environment variables pointing to a
// valid Supabase test account. Tests are skipped if not set.
const TEST_EMAIL = process.env.TEST_EMAIL
const TEST_PASSWORD = process.env.TEST_PASSWORD

test.describe('Tab management flow', () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'Set TEST_EMAIL and TEST_PASSWORD env vars to run E2E tests')

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[aria-label="Email"]')
    await page.fill('[aria-label="Email"]', TEST_EMAIL)
    await page.fill('[aria-label="Password"]', TEST_PASSWORD)
    await page.click('button:has-text("Sign in")')
    await page.waitForSelector('[aria-label="Tab overview"]', { timeout: 10000 })
  })

  test('open switcher → create new tab → rename → save to shelf → close original tab → verify state', async ({ page }) => {
    // Verify we start with one tab (default "Main")
    await expect(page.locator('h2').first()).toBeVisible()

    // Open tab switcher
    await page.click('[aria-label="Tab overview"]')
    await expect(page.getByRole('dialog', { name: 'Tab switcher' })).toBeVisible()

    // Create a new tab via + tile
    await page.click('[aria-label="New tab"]')

    // Switcher should close after adding tab
    await expect(page.getByRole('dialog', { name: 'Tab switcher' })).not.toBeVisible()

    // The new tab should now be active — rename it
    const tabHeader = page.locator('.tab-header__title')
    await tabHeader.click()
    const input = page.locator('.tab-header__input')
    await input.fill('My New Tab')
    await input.press('Enter')

    // Verify the rename took effect
    await expect(page.locator('.tab-header__title')).toHaveText('My New Tab')

    // Save the new tab to shelf
    await page.click('[aria-label="Save tab to Shelf"]')

    // Verify the button changed to shelf state
    await expect(page.locator('[aria-label="Tab saved to Shelf — click to move to Library"]')).toBeVisible()

    // Open the tab switcher again
    await page.click('[aria-label="Tab overview"]')
    await expect(page.getByRole('dialog', { name: 'Tab switcher' })).toBeVisible()

    // Find the original "Main" tab tile and close it
    const tiles = page.locator('.tab-switcher__tile:not(.tab-switcher__tile--add)')
    const mainTile = tiles.filter({ hasText: 'Main' })
    await mainTile.locator('[aria-label="Close Main"]').click()

    // Close the switcher
    await page.keyboard.press('Escape')

    // Verify the remaining tab is our renamed one
    await expect(page.locator('.tab-header__title')).toHaveText('My New Tab')

    // Verify the saved location badge is still shelf
    await expect(page.locator('[aria-label="Tab saved to Shelf — click to move to Library"]')).toBeVisible()
  })
})
