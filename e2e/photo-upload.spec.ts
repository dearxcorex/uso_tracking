import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const TEST_IMAGE_PATH = path.join(__dirname, 'test-image.jpg');

test.beforeAll(() => {
  const hex = 'ffd8ffe000104a46494600010100000100010000ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c28372929302c313434341f27393d38323c2e33343200ffc0000b08000100010101110000ffc4001f000001050101010101010000000000000000000102030405060708090a0b00ffda00080101003f007b94110000000000000000000000ffd9';
  fs.writeFileSync(TEST_IMAGE_PATH, Buffer.from(hex, 'hex'));
});

test.afterAll(() => {
  if (fs.existsSync(TEST_IMAGE_PATH)) fs.unlinkSync(TEST_IMAGE_PATH);
});

async function goToUploadTab(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const hamburger = page.locator('button[aria-label="Open menu"]');
  if (await hamburger.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await hamburger.click();
    await page.waitForTimeout(400);
    await page.getByText('อัปโหลดรูป').click();
  } else {
    await page.locator('button[title="อัปโหลดรูป"]').click();
  }

  await expect(page.getByText('อัปโหลดรูปภาพ')).toBeVisible({ timeout: 10_000 });
}

async function expandFirstCard(page: import('@playwright/test').Page) {
  const assetIdSpan = page.locator('.font-mono').first();
  await expect(assetIdSpan).toBeVisible({ timeout: 10_000 });
  await assetIdSpan.click();
  // Wait for UploadForm to finish loading — look for the status selection which always shows
  await expect(page.getByText('สถานะ')).toBeVisible({ timeout: 20_000 });
}

// Helper: get the equip photo button (either empty placeholder or existing image area)
function getEquipPhotoButton(page: import('@playwright/test').Page) {
  // The equip photo area is the first button inside the photo grid
  // It contains either "ถ่ายรูปอุปกรณ์นี้" or an img with alt="ภาพอุปกรณ์ (ใกล้)"
  return page.locator('button:has(> span:text("ถ่ายรูปอุปกรณ์นี้")), button:has(> img[alt="ภาพอุปกรณ์ (ใกล้)"])').first();
}

test.describe('Photo Upload - Image Replace', () => {
  test('should open file picker when tapping photo area', async ({ page }) => {
    await goToUploadTab(page);
    await expandFirstCard(page);

    // The photo area button should trigger file chooser
    const photoBtn = getEquipPhotoButton(page);
    await expect(photoBtn).toBeVisible({ timeout: 5_000 });

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 5_000 }),
      photoBtn.click(),
    ]);

    expect(fileChooser).toBeTruthy();
  });

  test('should show preview after selecting image', async ({ page }) => {
    await goToUploadTab(page);
    await expandFirstCard(page);

    const photoBtn = getEquipPhotoButton(page);
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 5_000 }),
      photoBtn.click(),
    ]);
    await fileChooser.setFiles(TEST_IMAGE_PATH);

    // Preview image should appear (new selected image)
    await expect(page.locator('img[alt="ภาพอุปกรณ์ (ใกล้)"]')).toBeVisible({ timeout: 3_000 });
    // เปลี่ยนรูป and ลบ buttons should appear
    await expect(page.getByText('เปลี่ยนรูป').first()).toBeVisible();
    await expect(page.getByText('ลบ').first()).toBeVisible();
  });

  test('should open file picker when tapping เปลี่ยนรูป button', async ({ page }) => {
    await goToUploadTab(page);
    await expandFirstCard(page);

    // Select an image first
    const photoBtn = getEquipPhotoButton(page);
    const [fc1] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 5_000 }),
      photoBtn.click(),
    ]);
    await fc1.setFiles(TEST_IMAGE_PATH);

    await expect(page.locator('img[alt="ภาพอุปกรณ์ (ใกล้)"]')).toBeVisible({ timeout: 3_000 });

    // Click เปลี่ยนรูป — should open file picker again
    const [fc2] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 5_000 }),
      page.getByText('เปลี่ยนรูป').first().click(),
    ]);

    expect(fc2).toBeTruthy();
  });

  test('should clear preview when tapping ลบ button', async ({ page }) => {
    await goToUploadTab(page);
    await expandFirstCard(page);

    // Select an image
    const photoBtn = getEquipPhotoButton(page);
    const [fc] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 5_000 }),
      photoBtn.click(),
    ]);
    await fc.setFiles(TEST_IMAGE_PATH);

    await expect(page.locator('img[alt="ภาพอุปกรณ์ (ใกล้)"]')).toBeVisible({ timeout: 3_000 });

    // Click ลบ
    await page.getByText('ลบ').first().click();

    // After deleting, either the empty placeholder or existing server image should show
    // The selected preview should be gone (ลบ button disappears)
    await expect(page.getByText('ลบ').first()).not.toBeVisible({ timeout: 3_000 });
  });
});
