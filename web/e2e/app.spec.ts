import { test, expect } from '@playwright/test';

test.describe('App Loading', () => {
	test('page loads without errors', async ({ page }) => {
		// Listen for console errors
		const errors: string[] = [];
		page.on('console', (msg) => {
			if (msg.type() === 'error') {
				errors.push(msg.text());
			}
		});

		await page.goto('/');

		// Wait for WASM to load - Filter Builder is visible on default Search tab
		await expect(page.getByText('Filter Builder')).toBeVisible({ timeout: 10000 });

		// Should not have any console errors
		expect(errors).toHaveLength(0);
	});

	test('no error popups on initial load', async ({ page }) => {
		await page.goto('/');

		// Wait for page to fully load
		await expect(page.getByText('Filter Builder')).toBeVisible({ timeout: 10000 });

		// Check for any error messages in the UI
		const errorPopup = page
			.locator('text=/error/i')
			.filter({ hasText: /calculation|TypeError|undefined/ });
		await expect(errorPopup).not.toBeVisible();
	});

	test('WASM loads successfully', async ({ page }) => {
		await page.goto('/');

		// Wait for WASM to load - the "Loading WASM module..." should disappear
		await expect(page.getByText('Loading WASM module...')).not.toBeVisible({ timeout: 10000 });

		// The Filter Builder should be visible after WASM loads (Search is default tab)
		await expect(page.getByText('Filter Builder')).toBeVisible();
	});

	test('displays seed explorer data after load', async ({ page }) => {
		await page.goto('/');

		// Wait for WASM to load
		await expect(page.getByText('Filter Builder')).toBeVisible({ timeout: 10000 });

		// Switch to Explore tab
		await page.getByRole('button', { name: 'Explore Seed' }).click();

		// Check that default panels are visible (new dynamic panel system)
		await expect(page.getByText('Daily Luck')).toBeVisible();
		await expect(page.getByText('Weather')).toBeVisible();
		await expect(page.getByText('Night Events')).toBeVisible();
		await expect(page.getByText('Traveling Cart')).toBeVisible();
		// Check Add Panel button
		await expect(page.getByRole('button', { name: 'Add Panel' })).toBeVisible();
	});
});

test.describe('Seed Explorer', () => {
	test('can change seed value', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByText('Filter Builder')).toBeVisible({ timeout: 10000 });

		// Switch to Explore tab
		await page.getByRole('button', { name: 'Explore Seed' }).click();
		await expect(page.getByText('Daily Luck')).toBeVisible();

		// Change the seed - now uses explore-seed id
		const seedInput = page.locator('input#explore-seed');
		await seedInput.fill('99999');

		// The page should update (we can't easily verify the values, but it shouldn't error)
		await expect(page.getByText('Daily Luck')).toBeVisible();
	});

	test('can add and remove panels', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByText('Filter Builder')).toBeVisible({ timeout: 10000 });

		// Switch to Explore tab
		await page.getByRole('button', { name: 'Explore Seed' }).click();
		await expect(page.getByText('Daily Luck')).toBeVisible();

		// Click Add Panel
		await page.getByRole('button', { name: 'Add Panel' }).click();

		// Select Omni Geodes from the dropdown
		await page.getByRole('button', { name: 'Omni Geodes' }).click();

		// Should see the new panel
		await expect(page.getByText('Omni Geodes')).toBeVisible();
	});

	test('can edit panel range', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByText('Filter Builder')).toBeVisible({ timeout: 10000 });

		// Switch to Explore tab
		await page.getByRole('button', { name: 'Explore Seed' }).click();
		await expect(page.getByText('Daily Luck')).toBeVisible();

		// Add a geodes panel to test editing
		await page.getByRole('button', { name: 'Add Panel' }).click();
		await page.getByRole('button', { name: 'Omni Geodes' }).click();
		await expect(page.getByText('Omni Geodes')).toBeVisible();

		// Click the edit button on the Omni Geodes panel
		// Find the panel container that has both "Omni Geodes" and "#1-10" (the default range)
		const geodePanel = page.locator('.shadow-sm').filter({ hasText: '#1-10' });
		await geodePanel.getByRole('button', { name: 'Edit panel range' }).click();

		// Should see the edit form with start/end inputs
		await expect(page.getByText('Save')).toBeVisible();
		await expect(page.getByText('Cancel')).toBeVisible();

		// Change the range - find the number inputs in the editor
		const rangeInputs = page.locator('input[type="number"]');
		// The geode inputs are the ones after the day inputs
		await rangeInputs.nth(-2).fill('5'); // start
		await rangeInputs.nth(-1).fill('20'); // end

		// Save
		await page.getByRole('button', { name: 'Save' }).click();

		// Should see the updated range in the panel header
		await expect(page.getByText('#5-20')).toBeVisible();
	});

	test('copy link button works', async ({ page, context }) => {
		// Grant clipboard permissions
		await context.grantPermissions(['clipboard-read', 'clipboard-write']);

		await page.goto('/');
		await expect(page.getByText('Filter Builder')).toBeVisible({ timeout: 10000 });

		// Switch to Explore tab
		await page.getByRole('button', { name: 'Explore Seed' }).click();
		await expect(page.getByText('Daily Luck')).toBeVisible();

		// Click the copy link button
		await page.getByRole('button', { name: 'Copy Link to This Seed' }).click();

		// Button should show "Copied!"
		await expect(page.getByRole('button', { name: 'Copied!' })).toBeVisible();
	});
});

test.describe('Search Tab', () => {
	test('search tab is default', async ({ page }) => {
		await page.goto('/');

		// Should see the Filter Builder immediately (Search is default tab)
		await expect(page.getByText('Filter Builder')).toBeVisible({ timeout: 10000 });
	});

	test('can add a filter condition', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByText('Filter Builder')).toBeVisible({ timeout: 10000 });

		// Click "+ Daily Luck" to add a filter
		await page.getByRole('button', { name: '+ Daily Luck' }).click();

		// The filter condition editor should appear with "Daily Luck" label
		await expect(page.locator('text=Daily Luck').first()).toBeVisible();
	});

	test('can use an example', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByText('Filter Builder')).toBeVisible({ timeout: 10000 });

		// Click an example
		await page.getByRole('button', { name: 'Early Red Cabbage' }).click();

		// The submit Search Seeds button should be enabled (filter was added)
		await expect(
			page.locator('button:has-text("Search Seeds"):not([class*="rounded-t"])')
		).toBeEnabled();
	});
});

test.describe('Seed Search', () => {
	test('can search for seeds with daily luck filter', async ({ page }) => {
		// Capture console logs and errors
		const consoleLogs: string[] = [];
		page.on('console', (msg) => {
			consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
		});
		page.on('pageerror', (err) => {
			consoleLogs.push(`[PAGE ERROR] ${err.message}`);
		});

		await page.goto('/');
		await expect(page.getByText('Filter Builder')).toBeVisible({ timeout: 10000 });

		// Add a daily luck filter
		await page.getByRole('button', { name: '+ Daily Luck' }).click();

		// The compact filter should show "Daily Luck" inline with inputs
		await expect(page.locator('span.font-medium:has-text("Daily Luck")')).toBeVisible();

		// Find the luck input (first number input after "luck" text) and set it to 0.07
		// The inputs are in order: day/range params, then min luck, then max luck
		const luckInputs = page.locator('input[type="number"][step="0.01"]');
		await luckInputs.first().fill('0.07');

		// Click Search Seeds submit button (not the tab)
		await page.locator('button:has-text("Search Seeds"):not([class*="rounded-t"])').click();

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
		await expect(page.getByRole('heading', { name: /Found \d+ matching seeds?/ })).toBeVisible({
			timeout: 30000,
		});
	});
});

test.describe('URL Parameters', () => {
	test('loads seed from URL', async ({ page, baseURL }) => {
		await page.goto(`${baseURL}?seed=54321`);

		// Wait for page to load
		await expect(page.getByText('Filter Builder')).toBeVisible({ timeout: 10000 });

		// Switch to Explore tab to see the seed input
		await page.getByRole('button', { name: 'Explore Seed' }).click();
		await expect(page.getByText('Daily Luck')).toBeVisible();

		// Check that the seed input has the correct value
		const seedInput = page.locator('input#explore-seed');
		await expect(seedInput).toHaveValue('54321');
	});

	test('loads filter from URL and switches to search tab', async ({ page, baseURL }) => {
		// This is an encoded "Early Red Cabbage" style filter
		const encodedFilter =
			'eyJsIjoiYSIsImMiOlt7InQiOiJjIiwiZHMiOnsidCI6InMiLCJzIjowLCJ5IjoxfSwiaSI6MjY2fV19';
		await page.goto(`${baseURL}?f=${encodedFilter}`);

		// Wait for page to load
		await expect(page.getByText('Filter Builder')).toBeVisible({ timeout: 10000 });

		// Should have the Share Filter button visible (filter was loaded)
		await expect(page.getByRole('button', { name: 'Share Filter' })).toBeVisible();
	});
});

test.describe('Browser Navigation Undo/Redo', () => {
	test('back button undoes adding a filter condition', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByText('Filter Builder')).toBeVisible({ timeout: 10000 });

		// Add a filter condition
		await page.getByRole('button', { name: '+ Daily Luck' }).click();
		await expect(page.locator('span.font-medium:has-text("Daily Luck")')).toBeVisible();

		// URL should have the filter parameter
		await expect(page).toHaveURL(/f=/);

		// Go back
		await page.goBack();

		// Filter should be removed
		await expect(page.locator('span.font-medium:has-text("Daily Luck")')).not.toBeVisible();

		// URL should not have the filter parameter
		await expect(page).not.toHaveURL(/f=/);
	});

	test('forward button redoes after back', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByText('Filter Builder')).toBeVisible({ timeout: 10000 });

		// Add a filter condition
		await page.getByRole('button', { name: '+ Cart Item' }).click();
		await expect(page.locator('span.font-medium:has-text("Cart")')).toBeVisible();

		// Go back to undo
		await page.goBack();
		await expect(page.locator('span.font-medium:has-text("Cart")')).not.toBeVisible();

		// Go forward to redo
		await page.goForward();
		await expect(page.locator('span.font-medium:has-text("Cart")')).toBeVisible();
	});

	test('back button restores previous tab', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByText('Filter Builder')).toBeVisible({ timeout: 10000 });

		// Switch to Explore tab
		await page.getByRole('button', { name: 'Explore Seed' }).click();
		await expect(page.getByText('Daily Luck')).toBeVisible();

		// Go back - should return to Search tab
		await page.goBack();
		await expect(page.getByText('Filter Builder')).toBeVisible();
	});
});
