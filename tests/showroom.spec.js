import { test, expect } from '@playwright/test';

test.describe('Pattupol பட்டுப்போல் Showroom E2E Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Intercept and mock Supabase database requests for offline reliability and speed
    await page.route('**/rest/v1/sarees*', async (route) => {
      const mockSarees = [
        {
          id: "saree-1",
          code: "LK-101",
          title: "Mock Peacock Kalamkari",
          type: "kalamkari",
          description: "Classic hand-painted Kalamkari.",
          price: "4,800",
          image: "saree-photos/13502345-682c-4cd3-be38-50560b8b0354.jpg",
          sold: false,
          images: null
        },
        {
          id: "saree-2",
          code: "SC-201",
          title: "Mock Indigo Silk Cotton",
          type: "silk-cotton",
          description: "A stunning hand-woven silk cotton.",
          price: "3,950",
          image: "saree-photos/17da6aba-a947-44e2-b684-30123a4c02eb.jpg",
          sold: true,
          images: null
        }
      ];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*'
        },
        body: JSON.stringify(mockSarees),
      });
    });

    // Intercept and mock Supabase auth checks to return no session
    await page.route('**/auth/v1/*', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*'
        },
        body: JSON.stringify({ error: 'No active session' }),
      });
    });
  });
  
  test('should load the showroom home page with correct branding', async ({ page }) => {
    // Navigate to the production URL configured in playwright.config.js
    await page.goto('/');
    
    // 1. Verify the stylized brand name is visible in the header
    const brandHeader = page.locator('.logo-brand');
    await expect(brandHeader).toContainText('PATTUPOL');
    await expect(brandHeader).toContainText('பட்டுப்போல்');
    
    // 2. Verify onlyKalamkari & Silk Cotton sub-brand is visible
    const brandSub = page.locator('.logo-sub');
    await expect(brandSub).toHaveText('onlyKalamkari & Silk Cotton');
    
    // 3. Verify footer branding
    const footerLogo = page.locator('.footer-logo');
    await expect(footerLogo).toContainText('PATTUPOL');
  });

  test('should support category filter chips', async ({ page }) => {
    await page.goto('/');
    
    // Verify categories row contains chips
    const allItemsChip = page.locator('button:has-text("All Items")');
    await expect(allItemsChip).toBeVisible();
    
    const kalamkariChip = page.locator('button:has-text("Kalamkari")');
    await expect(kalamkariChip).toBeVisible();
    
    // Click Kalamkari filter
    await kalamkariChip.click();
    
    // Check that all displayed item badges show "Kalamkari"
    const badges = page.locator('.saree-type-badge');
    const badgeCount = await badges.count();
    
    for (let i = 0; i < badgeCount; i++) {
      await expect(badges.nth(i)).toHaveText('Kalamkari');
    }
  });

  test('should open lightbox modal and close it successfully', async ({ page }) => {
    await page.goto('/');
    
    // Click on the first image wrapper in the catalog to open lightbox
    const firstCardImage = page.locator('.saree-image-wrapper').first();
    await expect(firstCardImage).toBeVisible();
    await firstCardImage.click();
    
    // Verify the zoom modal loads
    const modalContent = page.locator('.modal-content');
    await expect(modalContent).toBeVisible();
    
    // Verify modal elements
    const modalTitle = page.locator('.modal-title');
    await expect(modalTitle).toBeVisible();
    
    const modalCloseButton = page.locator('.modal-close');
    await expect(modalCloseButton).toBeVisible();
    
    // Close the modal
    await modalCloseButton.click();
    await expect(modalContent).not.toBeVisible();
  });

  test('should load the admin login form', async ({ page }) => {
    await page.goto('/');
    
    // Click on the "Admin" tab button in the header nav
    const adminTab = page.locator('button:has-text("Admin")');
    await expect(adminTab).toBeVisible();
    await adminTab.click();
    
    // Check that the login container renders
    const loginContainer = page.locator('.login-container');
    await expect(loginContainer).toBeVisible();
    
    // Verify Email and Password fields are visible
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();
    
    // Verify secure login submit button is visible
    const submitBtn = page.locator('button:has-text("Secure Log In")');
    await expect(submitBtn).toBeVisible();
  });

});
