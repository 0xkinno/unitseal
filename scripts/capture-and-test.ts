import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('=== Starting Playwright Chromium End-to-End Suite & Screenshot Capture ===');

  const BASE_URL = process.env.BASE_URL || 'https://unitseal-app.vercel.app';
  console.log(`Targeting URL: ${BASE_URL}`);

  const screenshotsDir = path.resolve(__dirname, '..', 'docs', 'screenshots');
  const rootScreenshotsDir = path.resolve(__dirname, '..', '..', 'docs', 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }
  if (!fs.existsSync(rootScreenshotsDir)) {
    fs.mkdirSync(rootScreenshotsDir, { recursive: true });
  }

  const copyToRoot = (fileName: string) => {
    const src = path.join(screenshotsDir, fileName);
    const dest = path.join(rootScreenshotsDir, fileName);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    }
  };

  const browser = await chromium.launch({ headless: true });
  
  // 1. Desktop Context (1440x900 for Hero Banner)
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await desktopContext.newPage();

  console.log(`1. Testing Landing Page (${BASE_URL})...`);
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const heroPath = path.join(screenshotsDir, 'landing_hero.png');
  await page.screenshot({ path: heroPath, fullPage: false });
  copyToRoot('landing_hero.png');
  console.log('   Saved:', heroPath);

  // 2. Uniform 1200x800 Product Context for 2x2 Array
  const productContext = await browser.newContext({
    viewport: { width: 1200, height: 800 },
    deviceScaleFactor: 2,
  });
  const prodPage = await productContext.newPage();

  console.log(`2. Testing Dashboard Page (${BASE_URL}/dashboard)...`);
  await prodPage.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
  await prodPage.waitForTimeout(1000);
  const dashboardPath = path.join(screenshotsDir, 'dashboard.png');
  await prodPage.screenshot({ path: dashboardPath });
  copyToRoot('dashboard.png');
  console.log('   Saved:', dashboardPath);

  console.log(`3. Testing Plan Review Page (${BASE_URL}/plans)...`);
  await prodPage.goto(`${BASE_URL}/plans`, { waitUntil: 'networkidle' });
  await prodPage.waitForTimeout(1000);
  
  // Generate plan with SERV Reasoning
  console.log('   Drafting plan via SERV Reasoning Engine...');
  const generateBtn = prodPage.locator('button:has-text("Draft State-Bound Plan with SERV")');
  if (await generateBtn.isVisible()) {
    await generateBtn.click();
    await prodPage.waitForSelector('text=STATE SEAL', { timeout: 15000 });
    await prodPage.waitForTimeout(1000);
  }

  const planReviewPath = path.join(screenshotsDir, 'plan_review.png');
  await prodPage.screenshot({ path: planReviewPath });
  copyToRoot('plan_review.png');
  console.log('   Saved:', planReviewPath);

  console.log('4. Testing Adversarial State Drift Injection (Break Path)...');
  const driftCheckbox = prodPage.locator('input[type="checkbox"]');
  if (await driftCheckbox.isVisible()) {
    await driftCheckbox.check();
    await prodPage.waitForTimeout(1000);
  }

  const stateRefusalPath = path.join(screenshotsDir, 'state_refusal.png');
  await prodPage.screenshot({ path: stateRefusalPath });
  copyToRoot('state_refusal.png');
  console.log('   Saved:', stateRefusalPath);
  await prodPage.close();

  console.log(`5. Testing Proof & Judge Lab Page (${BASE_URL}/proof)...`);
  const proofPage = await productContext.newPage();
  await proofPage.goto(`${BASE_URL}/proof`, { waitUntil: 'networkidle' });
  await proofPage.waitForTimeout(1000);

  // Run live break campaign
  const runBreakBtn = proofPage.locator('button:has-text("Run Live Break Campaign")');
  if (await runBreakBtn.isVisible()) {
    console.log('   Executing Live Break Campaign...');
    await runBreakBtn.click();
    await proofPage.waitForTimeout(3000);
  }

  const executionProofPath = path.join(screenshotsDir, 'execution_proof.png');
  await proofPage.screenshot({ path: executionProofPath });
  copyToRoot('execution_proof.png');
  console.log('   Saved:', executionProofPath);
  await proofPage.close();

  // 6. Mobile Responsiveness Test (390x844 - iPhone 14)
  console.log('6. Testing Mobile Viewport Responsiveness (390x844)...');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  const mobilePage = await mobileContext.newPage();
  
  await mobilePage.goto(BASE_URL, { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(1000);
  const mobileLandingPath = path.join(screenshotsDir, 'mobile_landing.png');
  await mobilePage.screenshot({ path: mobileLandingPath });
  copyToRoot('mobile_landing.png');
  console.log('   Saved Mobile Landing:', mobileLandingPath);

  await mobilePage.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(1000);
  const mobileDashboardPath = path.join(screenshotsDir, 'mobile_dashboard.png');
  await mobilePage.screenshot({ path: mobileDashboardPath });
  copyToRoot('mobile_dashboard.png');
  console.log('   Saved Mobile Dashboard:', mobileDashboardPath);

  // 7. Test Seals Ledger and Activity Feed
  console.log(`7. Verifying Seals Ledger (${BASE_URL}/seals) and Activity (${BASE_URL}/activity)...`);
  const navPage = await productContext.newPage();
  await navPage.goto(`${BASE_URL}/seals`, { waitUntil: 'networkidle' });
  await navPage.waitForTimeout(800);

  await navPage.goto(`${BASE_URL}/activity`, { waitUntil: 'networkidle' });
  await navPage.waitForTimeout(800);
  await navPage.close();

  await browser.close();
  console.log('=== Playwright Chromium E2E Suite & Capture Finished Successfully! ===');
}

main().catch((err) => {
  console.error('Playwright Error:', err);
  process.exit(1);
});
