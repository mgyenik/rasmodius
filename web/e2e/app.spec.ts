import { test, expect } from '@playwright/test';

test.describe('App Loading', () => {
  test('page loads without errors', async ({ page }) => {
    // Listen for console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');

    // Wait for WASM to load
    await expect(page.getByText('Daily Luck')).toBeVisible({ timeout: 10000 });

    // Should not have any console errors
    expect(errors).toHaveLength(0);
  });

  test('no error popups on initial load', async ({ page }) => {
    await page.goto('/');

    // Wait for page to fully load
    await expect(page.getByText('Daily Luck')).toBeVisible({ timeout: 10000 });

    // Check for any error messages in the UI
    const errorPopup = page.locator('text=/error/i').filter({ hasText: /calculation|TypeError|undefined/ });
    await expect(errorPopup).not.toBeVisible();
  });

  test('WASM loads successfully', async ({ page }) => {
    await page.goto('/');

    // Wait for WASM to load - the "Loading WASM module..." should disappear
    await expect(page.getByText('Loading WASM module...')).not.toBeVisible({ timeout: 10000 });

    // The Daily Luck section should be visible after WASM loads
    await expect(page.getByText('Daily Luck')).toBeVisible();
  });

  test('displays seed explorer data after load', async ({ page }) => {
    await page.goto('/');

    // Wait for WASM to load
    await expect(page.getByText('Daily Luck')).toBeVisible({ timeout: 10000 });

    // Check that various sections are visible
    await expect(page.getByText('Night Event')).toBeVisible();
    await expect(page.getByText("Tomorrow's Weather")).toBeVisible();
    await expect(page.getByText('Saloon Dish')).toBeVisible();
    await expect(page.getByText('Next 5 Omni Geodes')).toBeVisible();
    await expect(page.getByText('Mine Floors (1-50)')).toBeVisible();
    await expect(page.getByText('Red Cabbage Finder')).toBeVisible();
  });
});

test.describe('Seed Explorer', () => {
  test('can change seed value', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Daily Luck')).toBeVisible({ timeout: 10000 });

    // Change the seed
    const seedInput = page.locator('input#seed');
    await seedInput.fill('99999');

    // The page should update (we can't easily verify the values, but it shouldn't error)
    await expect(page.getByText('Daily Luck')).toBeVisible();
  });

  test('can change day value', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Daily Luck')).toBeVisible({ timeout: 10000 });

    // Change the day
    const dayInput = page.locator('input#day');
    await dayInput.fill('10');

    // Should still show data
    await expect(page.getByText('Daily Luck')).toBeVisible();
  });

  test('copy link button works', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.goto('/');
    await expect(page.getByText('Daily Luck')).toBeVisible({ timeout: 10000 });

    // Click the copy link button
    await page.getByRole('button', { name: 'Copy Link to This Seed' }).click();

    // Button should show "Copied!"
    await expect(page.getByRole('button', { name: 'Copied!' })).toBeVisible();
  });
});

test.describe('Search Tab', () => {
  test('can switch to search tab', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Daily Luck')).toBeVisible({ timeout: 10000 });

    // Click the Search Seeds tab
    await page.getByRole('button', { name: 'Search Seeds' }).click();

    // Should see the Filter Builder
    await expect(page.getByText('Filter Builder')).toBeVisible();
  });

  test('can add a filter condition', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Daily Luck')).toBeVisible({ timeout: 10000 });

    // Switch to search tab
    await page.getByRole('button', { name: 'Search Seeds' }).click();

    // Click "+ Daily Luck" to add a filter
    await page.getByRole('button', { name: '+ Daily Luck' }).click();

    // The filter condition editor should appear (look for condition-specific UI)
    await expect(page.getByText('Min Luck')).toBeVisible();
  });

  test('can use a preset', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Daily Luck')).toBeVisible({ timeout: 10000 });

    // Switch to search tab
    await page.getByRole('button', { name: 'Search Seeds' }).click();

    // Click a preset
    await page.getByRole('button', { name: 'Early Red Cabbage' }).click();

    // The Search Seeds button should be enabled (filter was added)
    await expect(page.getByRole('button', { name: 'Search Seeds', exact: true })).toBeEnabled();
  });
});

test.describe('Seed Search', () => {
  test('can search for seeds with daily luck filter', async ({ page }) => {
    // Capture console logs and errors
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });
    page.on('pageerror', err => {
      consoleLogs.push(`[PAGE ERROR] ${err.message}`);
    });

    await page.goto('/');
    await expect(page.getByText('Daily Luck')).toBeVisible({ timeout: 10000 });

    // Switch to search tab
    await page.getByRole('button', { name: 'Search Seeds' }).click();
    await expect(page.getByText('Filter Builder')).toBeVisible();

    // Add a daily luck filter
    await page.getByRole('button', { name: '+ Daily Luck' }).click();
    await expect(page.getByText('Min Luck')).toBeVisible();

    // Set min luck to 0.07 (very lucky day)
    const minLuckInput = page.locator('input[type="number"]').first();
    await minLuckInput.fill('0.07');

    // Click Search Seeds button
    await page.getByRole('button', { name: 'Search Seeds', exact: true }).click();

    // Wait a moment for the search to start
    await page.waitForTimeout(500);

    // Check if there's an error displayed
    const errorLocator = page.getByText('Search error');
    const hasError = await errorLocator.isVisible();
    if (hasError) {
      console.log('Console logs:', consoleLogs.join('\n'));
      const errorText = await errorLocator.textContent();
      throw new Error(`Search failed with error: ${errorText}`);
    }

    // Should see search results - "Found X matching seeds"
    await expect(
      page.getByRole('heading', { name: /Found \d+ matching seeds/ })
    ).toBeVisible({ timeout: 30000 });
  });
});

test.describe('URL Parameters', () => {
  test('loads seed from URL', async ({ page }) => {
    await page.goto('/?seed=54321&day=15');

    await expect(page.getByText('Daily Luck')).toBeVisible({ timeout: 10000 });

    // Check that the inputs have the correct values
    const seedInput = page.locator('input#seed');
    await expect(seedInput).toHaveValue('54321');

    const dayInput = page.locator('input#day');
    await expect(dayInput).toHaveValue('15');
  });

  test('loads filter from URL and switches to search tab', async ({ page }) => {
    // This is an encoded "Early Red Cabbage" style filter
    const encodedFilter = 'eyJsIjoiYSIsImMiOlt7InQiOiJjIiwiZHMiOnsidCI6InMiLCJzIjowLCJ5IjoxfSwiaSI6MjY2fV19';
    await page.goto(`/?f=${encodedFilter}`);

    // Should automatically switch to search tab
    await expect(page.getByText('Filter Builder')).toBeVisible({ timeout: 10000 });

    // Should have the Share Filter button visible (filter was loaded)
    await expect(page.getByRole('button', { name: 'Share Filter' })).toBeVisible();
  });
});
