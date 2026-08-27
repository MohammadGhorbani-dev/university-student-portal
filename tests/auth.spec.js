import { test, expect } from '@playwright/test';

test.describe('Authentication and Routing', () => {

  test('Redirects unauthenticated users from dashboard to login', async ({ page }) => {
    await page.goto('/');
    // Should be redirected to login page
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.locator('h1')).toContainText(/پورتال\s*دانشجویی/);
  });

  test('Shows validation errors on login form', async ({ page }) => {
    await page.goto('/login');
    
    // Submit empty form
    await page.click('button[type="submit"]');
    
    // Check for validation messages
    await expect(page.locator('text=لطفاً ایمیل خود را وارد کنید.')).toBeVisible();
    await expect(page.locator('text=لطفاً رمز عبور خود را وارد کنید.')).toBeVisible();
  });

  test('Shows validation errors on register form', async ({ page }) => {
    await page.goto('/register');
    
    // Submit empty form
    await page.click('button[type="submit"]');
    
    // Check for required field validations
    await expect(page.locator('text=لطفاً نام خود را وارد کنید.')).toBeVisible();
    await expect(page.locator('text=لطفاً نام خانوادگی خود را وارد کنید.')).toBeVisible();
    await expect(page.locator('text=لطفاً شماره دانشجویی را وارد کنید.')).toBeVisible();
    await expect(page.locator('text=لطفاً ایمیل خود را وارد کنید.')).toBeVisible();
    await expect(page.getByText('لطفاً رمز عبور خود را وارد کنید.', { exact: true })).toBeVisible();
    await expect(page.locator('text=لطفاً تکرار رمز عبور را وارد کنید.')).toBeVisible();
  });

  test('Validates password mismatch on register form', async ({ page }) => {
    await page.goto('/register');
    
    await page.fill('input[name="password"]', 'password123');
    await page.fill('input[name="confirmPassword"]', 'password456');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=تکرار رمز عبور با رمز عبور یکسان نیست.')).toBeVisible();
  });

  test('Navigates between auth pages correctly', async ({ page }) => {
    await page.goto('/login');
    
    // Go to register
    await page.click('text=ثبت‌نام کنید');
    await expect(page).toHaveURL(/.*\/register/);
    
    // Go back to login
    await page.click('text=وارد شوید');
    await expect(page).toHaveURL(/.*\/login/);
    
    // Go to forgot password
    await page.click('text=فراموشی رمز عبور؟');
    await expect(page).toHaveURL(/.*\/forgot-password/);
    
    // Go back to login from forgot password
    await page.click('text=بازگشت به صفحه ورود');
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('Shows error on invalid login', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // The error toast or Firebase not configured error might appear
    // Wait for the toaster message
    const toast = page.locator('.go3958317564'); // This is typically the react-hot-toast container class or role="status"
    await expect(page.locator('role=status').first()).toBeVisible();
  });

  test('Shows validation errors on forgot password form', async ({ page }) => {
    await page.goto('/forgot-password');
    
    // Submit empty form
    await page.click('button[type="submit"]');
    
    // Check for validation messages
    await expect(page.locator('text=لطفاً ایمیل خود را وارد کنید.')).toBeVisible();
    
    // Invalid email format
    await page.fill('input[name="email"]', 'invalid-email');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=لطفاً یک ایمیل معتبر وارد کنید.')).toBeVisible();
  });

});
