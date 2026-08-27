import { test, expect } from '@playwright/test';

test.describe('Demo Environment Verification', () => {
  test.setTimeout(120000); // 2 minutes

  test('Seed the database', async ({ page }) => {
    await page.goto('http://localhost:3000/seed');
    
    // Click the seed button
    const seedButton = page.locator('button', { hasText: 'شروع سید گذاری' });
    await seedButton.click();
    
    // Wait for the success toast
    await expect(page.locator('text=سید گذاری با موفقیت انجام شد')).toBeVisible({ timeout: 60000 });
  });

  test('Verify student login and data', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    
    await page.fill('input[type="email"]', 'ali@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('http://localhost:3000/');
    
    // Verify dashboard elements (which implies data is loaded)
    await expect(page.locator('text=داشبورد')).toBeVisible();
  });
  
  test('Verify admin login', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    
    await page.fill('input[type="email"]', 'admin@uni.ac.ir');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('http://localhost:3000/');
    
    // Admin dashboard specific elements
    await expect(page.locator('text=پنل مدیریت')).toBeVisible();
  });
});
