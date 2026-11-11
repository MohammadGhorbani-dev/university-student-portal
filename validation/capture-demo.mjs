import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';

await mkdir('docs/images', { recursive: true });
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--mode', 'demo', '--host', '127.0.0.1', '--port', '3012', '--strictPort'], { stdio: 'ignore', windowsHide: true });
let ready = false;
for (let i = 0; i < 50 && !ready; i++) {
  try { ready = (await fetch('http://127.0.0.1:3012/')).ok; } catch { /* Wait for preview startup. */ }
  if (!ready) await new Promise(resolve => setTimeout(resolve, 100));
}
if (!ready) { server.kill(); throw new Error('Local demo preview did not start.'); }
const browser = await chromium.launch({ args: ['--no-proxy-server'] });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  await context.addInitScript(() => localStorage.setItem('theme', 'light'));
  await context.route('**/*', route => route.request().url().startsWith('http://127.0.0.1:3012') ? route.continue() : route.abort());
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:3012/');
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole('button', { name: 'پر کردن حساب نمونه' }).waitFor();
  await page.screenshot({ path: 'docs/images/demo-login.png', animations: 'disabled' });
  await page.getByRole('link', { name: 'ثبت‌نام کنید' }).click();
  await page.getByRole('button', { name: 'پر کردن اطلاعات نمونه' }).click();
  await page.screenshot({ path: 'docs/images/demo-register.png', animations: 'disabled' });
  await page.getByRole('link', { name: 'وارد شوید' }).click();
  await page.getByRole('button', { name: 'ورود به نقش دانشجو', exact: true }).click();
  await page.goto('http://127.0.0.1:3012/courses');
  await page.getByRole('article', { name: 'پایگاه داده', exact: true }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: 'docs/images/demo-student-desktop.png', animations: 'disabled' });
  await page.getByLabel('نقش:', { exact: true }).selectOption('staff');
  await page.goto('http://127.0.0.1:3012/requests');
  await page.getByRole('button').filter({ hasText: 'گواهی اشتغال به تحصیل' }).waitFor();
  await page.screenshot({ path: 'docs/images/demo-staff-desktop.png', animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel('نقش:', { exact: true }).selectOption('student');
  await page.goto('http://127.0.0.1:3012/');
  await page.getByRole('heading', { name: 'داشبورد کاربری', exact: true }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: 'docs/images/demo-student-mobile.png', animations: 'disabled' });
  await context.close();
  console.log('Saved five screenshots of synthetic demo data.');
} finally { await browser.close(); server.kill(); }
