import { expect, test } from '@playwright/test'
import { loadEnv } from 'vite'

const env = loadEnv('development', process.cwd(), '')

// Playwright starts the app with VITE_E2E_AUTH_BYPASS=true (no Supabase sign-in).
// To run against real auth instead, set E2E_USE_REAL_AUTH=1 plus TEST_EMAIL / TEST_PASSWORD.
const USE_REAL_AUTH = process.env.E2E_USE_REAL_AUTH === '1'
const TEST_EMAIL = process.env.TEST_EMAIL || env.TEST_EMAIL
const TEST_PASSWORD = process.env.TEST_PASSWORD || env.TEST_PASSWORD || env.password

async function signIn(page) {
  await page.goto('/')

  if (!USE_REAL_AUTH) {
    await expect(page.getByRole('button', { name: 'Tab overview' })).toBeVisible({ timeout: 15000 })
    return
  }

  const email = page.getByRole('textbox', { name: 'Email' })
  await expect(email).toBeVisible({ timeout: 15000 })
  await email.fill(TEST_EMAIL)
  await page.getByRole('textbox', { name: 'Password' }).fill(TEST_PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()

  const tabOverview = page.getByRole('button', { name: 'Tab overview' })
  try {
    await expect(tabOverview).toBeVisible({ timeout: 15000 })
  } catch {
    const authError = page.getByRole('alert')
    if (await authError.isVisible()) {
      throw new Error(`Sign-in failed: ${await authError.textContent()}`)
    }
    throw new Error('Sign-in timed out — set valid TEST_EMAIL and TEST_PASSWORD')
  }
}

test.describe('Tab management flow', () => {
  test.skip(
    USE_REAL_AUTH && (!TEST_EMAIL || !TEST_PASSWORD),
    'Set TEST_EMAIL and TEST_PASSWORD when E2E_USE_REAL_AUTH=1',
  )

  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('open switcher → create new tab → rename → save to shelf → close original tab → verify state', async ({ page }) => {
    // Verify we start with one tab (default untitled)
    await expect(page.locator('.tab-header__title')).toHaveText('(untitled)')

    // Open tab switcher
    await page.getByRole('button', { name: 'Tab overview' }).click()
    await expect(page.getByRole('dialog', { name: 'Tab switcher' })).toBeVisible()

    // Create a new tab via + tile
    await page.getByRole('button', { name: 'New tab' }).click()

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
    await page.getByRole('button', { name: 'Save tab to Shelf' }).click()

    // Verify the button changed to shelf state
    await expect(page.getByRole('button', { name: 'Tab saved to Shelf — click to move to Library' })).toBeVisible()

    // Open the tab switcher again
    await page.getByRole('button', { name: 'Tab overview' }).click()
    await expect(page.getByRole('dialog', { name: 'Tab switcher' })).toBeVisible()

    // Find the original default tab tile and close it
    const tiles = page.locator('.tab-switcher__tile:not(.tab-switcher__tile--add)')
    const defaultTile = tiles.filter({ hasText: '(untitled)' })
    await defaultTile.getByRole('button', { name: 'Close (untitled)' }).click()

    // Close the switcher
    await page.keyboard.press('Escape')

    // Verify the remaining tab is our renamed one
    await expect(page.locator('.tab-header__title')).toHaveText('My New Tab')

    // Verify the saved location badge is still shelf
    await expect(page.getByRole('button', { name: 'Tab saved to Shelf — click to move to Library' })).toBeVisible()
  })

  test('open vault panel → shelf tab → click Open in tab → portal card appears in active tab', async ({ page }) => {
    // Add a text card and save it to shelf
    await page.getByRole('button', { name: 'Add card' }).click()
    await expect(page.getByRole('region', { name: 'New card' })).toBeVisible()
    await page.getByRole('textbox', { name: 'Title' }).fill('Shelf source card')
    await page.getByRole('textbox', { name: 'Body' }).fill('Content of the shelf card')
    await page.getByRole('button', { name: 'Add →' }).click()

    // Save the card to shelf via its Save to Shelf button
    await page.getByRole('button', { name: 'Save to Shelf' }).click()

    // Saved cards become portals — should already be visible on the tab
    await expect(page.locator('.portal-card')).toBeVisible()
    await expect(page.locator('.portal-card')).toContainText('Shelf source card')
    await expect(page.getByRole('button', { name: 'Save to Shelf' })).not.toBeVisible()

    // Open the vault panel (Folders button in dock)
    await page.getByRole('button', { name: 'Folders' }).click()
    await expect(page.getByRole('dialog', { name: 'Vault and Brain' })).toBeVisible()

    // Shelf tab is active by default — click Open in tab for our card
    await page.getByRole('button', { name: 'Open in tab' }).click()

    // Panel should close
    await expect(page.getByRole('dialog', { name: 'Vault and Brain' })).not.toBeVisible()

    // Portal should still be the single instance on the tab
    await expect(page.locator('.portal-card')).toHaveCount(1)
    await expect(page.locator('.portal-card')).toContainText('Shelf source card')
  })

  test('save to shelf → close portal → card remains on shelf', async ({ page }) => {
    await page.getByRole('button', { name: 'Add card' }).click()
    await page.getByRole('textbox', { name: 'Title' }).fill('Keep on shelf')
    await page.getByRole('button', { name: 'Add →' }).click()
    await page.getByRole('button', { name: 'Save to Shelf' }).click()

    await expect(page.locator('.portal-card')).toBeVisible()
    await page.getByRole('button', { name: 'Remove card' }).click()
    await expect(page.getByText('No cards yet.')).toBeVisible()

    await page.getByRole('button', { name: 'Folders' }).click()
    await expect(page.getByRole('dialog', { name: 'Vault and Brain' })).toBeVisible()
    await expect(page.getByText('Keep on shelf')).toBeVisible()
  })

  test('save tab with cards → close from switcher → reopen from shelf vault', async ({ page }) => {
    await page.getByRole('button', { name: 'Add card' }).click()
    await page.getByRole('textbox', { name: 'Title' }).fill('Tab card')
    await page.getByRole('button', { name: 'Add →' }).click()
    await expect(page.getByRole('heading', { name: 'Tab card' })).toBeVisible()

    const tabHeader = page.locator('.tab-header__title')
    await tabHeader.click()
    await page.locator('.tab-header__input').fill('Research tab')
    await page.locator('.tab-header__input').press('Enter')
    await page.getByRole('button', { name: 'Save tab to Shelf' }).click()

    await page.getByRole('button', { name: 'Tab overview' }).click()
    await page.getByRole('button', { name: 'Close Research tab' }).click()
    await page.keyboard.press('Escape')

    await expect(page.locator('.tab-header__title')).not.toHaveText('Research tab')

    await page.getByRole('button', { name: 'Folders' }).click()
    await expect(page.getByRole('dialog', { name: 'Vault and Brain' })).toBeVisible()
    await expect(page.getByText('Research tab')).toBeVisible()
    await page.getByRole('button', { name: 'Switch to tab' }).click()
    await expect(page.getByRole('dialog', { name: 'Vault and Brain' })).not.toBeVisible()

    await expect(page.locator('.tab-header__title')).toHaveText('Research tab')
    await expect(page.getByRole('heading', { name: 'Tab card' })).toBeVisible()
  })
})
