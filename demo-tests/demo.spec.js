import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return url.origin === 'http://127.0.0.1:3010' ? route.continue() : route.abort();
  });
});
async function student(page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'ورود به نقش دانشجو', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'داشبورد کاربری', exact: true })).toBeVisible();
}

test('all roles and internal pages load with no external network or page errors', async ({ page }) => {
  const errors = [], external = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1:3010')) external.push(request.url()); });
  await student(page);
  for (const role of ['student', 'staff', 'admin']) {
    await page.getByLabel('نقش:', { exact: true }).selectOption(role);
    for (const route of ['/', '/courses', '/schedule', '/curriculum', '/reservations', '/requests', '/profile', '/announcements', '/help']) {
      await page.goto(route);
      await expect(page.locator('main').getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByLabel('کنترل نسخه نمایشی')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('16px "Vazirmatn Variable"'))).toBe(true);
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test('course registration survives refresh, can be cancelled and re-registered; reset restores seed', async ({ page }) => {
  await student(page);
  await page.goto('/courses');
  const row = page.getByRole('article', { name: 'پایگاه داده', exact: true });
  await row.getByRole('button', { name: /اخذ درس|انتخاب|ثبت/ }).click();
  await page.getByRole('dialog', { name: 'اخذ درس', exact: true }).getByRole('button', { name: 'تأیید', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'دروس اخذ شده (انتخاب واحد)' }).click();
  const chosen = page.getByRole('row').filter({ hasText: 'پایگاه داده' });
  await chosen.getByRole('button', { name: 'حذف درس', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'حذف درس' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'انصراف' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'تأیید', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(chosen.getByRole('button', { name: 'حذف درس', exact: true })).toBeFocused();
  await chosen.getByRole('button', { name: 'حذف درس', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'تأیید', exact: true }).click();
  await expect(chosen).toHaveCount(0);
  await page.goto('/courses');
  await page.getByRole('article', { name: 'پایگاه داده', exact: true }).getByRole('button', { name: /اخذ درس|انتخاب|ثبت/ }).click();
  await page.getByRole('dialog', { name: 'اخذ درس', exact: true }).getByRole('button', { name: 'تأیید', exact: true }).click();
  await page.getByRole('button', { name: 'بازنشانی دمو', exact: true }).click();
  await page.getByRole('button', { name: 'دروس اخذ شده (انتخاب واحد)' }).click();
  await expect(page.getByRole('row').filter({ hasText: 'پایگاه داده' })).toHaveCount(0);
  await expect(page.getByRole('row').filter({ hasText: 'ساختمان داده‌ها' })).toHaveCount(1);
});

test('facility booking can be cancelled and booked again', async ({ page }) => {
  await student(page);
  await page.goto('/reservations');
  await page.getByRole('button', { name: 'رزرو این مورد', exact: true }).click();
  await page.getByRole('dialog', { name: 'تأیید رزرو' }).getByRole('button', { name: 'تأیید', exact: true }).click();
  await page.getByRole('button', { name: 'رزروهای من', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: 'اتاق مطالعهٔ گروهی' })).toContainText('فعال');
  await page.getByRole('button', { name: 'لغو رزرو', exact: true }).click();
  await page.getByRole('dialog', { name: 'لغو رزرو' }).getByRole('button', { name: 'تأیید', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: 'اتاق مطالعهٔ گروهی' })).toContainText('لغو شده');
  await page.getByRole('button', { name: 'رزروهای موجود', exact: true }).click();
  await page.getByRole('button', { name: 'رزرو این مورد', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'تأیید', exact: true }).click();
  await page.getByRole('button', { name: 'رزروهای من', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: 'اتاق مطالعهٔ گروهی' })).toContainText('فعال');
});

test('staff response to a student request remains visible after role change', async ({ page }) => {
  await student(page);
  await page.goto('/requests');
  await page.getByRole('button', { name: 'ثبت درخواست جدید', exact: true }).click();
  await page.locator('input[name="title"]').fill('درخواست آزمایشی مرورگر');
  await page.locator('select[name="category"]').selectOption('درخواست گواهی اشتغال به تحصیل');
  await page.locator('textarea[name="description"]').fill('توضیح ساختگی برای بررسی گردش‌کار.');
  await page.getByRole('button', { name: 'ثبت نهایی', exact: true }).click();
  await expect(page.getByRole('button').filter({ hasText: 'درخواست آزمایشی مرورگر' })).toBeVisible();
  await page.getByLabel('نقش:', { exact: true }).selectOption('staff');
  await page.getByRole('button').filter({ hasText: 'درخواست آزمایشی مرورگر' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('select').selectOption('تأیید شده');
  await dialog.locator('textarea').fill('پاسخ ساختگی مسئول آموزش');
  await dialog.getByRole('button', { name: 'ذخیره تغییرات', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByLabel('نقش:', { exact: true }).selectOption('student');
  await page.getByRole('button').filter({ hasText: 'درخواست آزمایشی مرورگر' }).click();
  await expect(page.getByRole('dialog')).toContainText('پاسخ ساختگی مسئول آموزش');
  await expect(page.getByRole('dialog')).toContainText('تأیید شده');
});

test('student and staff can exchange synthetic support messages', async ({ page }) => {
  await student(page);
  await page.goto('/profile');
  await page.getByRole('button', { name: 'پشتیبانی و تیکت‌ها', exact: true }).click();
  await page.getByText('راهنمای انتخاب واحد', { exact: true }).click();
  await page.getByPlaceholder('پیام خود را بنویسید...').fill('پیام ساختگی دانشجو');
  await page.getByRole('button', { name: 'ارسال پیام', exact: true }).click();
  await expect(page.getByText('پیام ساختگی دانشجو', { exact: true })).toBeVisible();
  await page.getByLabel('نقش:', { exact: true }).selectOption('staff');
  await page.getByRole('button', { name: 'پشتیبانی و تیکت‌ها', exact: true }).click();
  await page.getByText('راهنمای انتخاب واحد', { exact: true }).click();
  await expect(page.getByText('پیام ساختگی دانشجو', { exact: true })).toBeVisible();
  await page.getByPlaceholder('پیام خود را بنویسید...').fill('پاسخ ساختگی پشتیبانی');
  await page.getByRole('button', { name: 'ارسال پیام', exact: true }).click();
  await expect(page.getByText('پاسخ ساختگی پشتیبانی', { exact: true })).toBeVisible();
});
