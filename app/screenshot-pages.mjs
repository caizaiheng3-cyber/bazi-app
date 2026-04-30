// 截图脚本：对 5 个主要页面生成全页 PNG 设计图
// 使用 puppeteer（已通过 npx 确认可用）

import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', '产品设计原型图');

const BASE = 'http://localhost:5173';

// 页面清单：path + 文件名 + 可选的预处理
const PAGES = [
  { path: '/onboarding', name: '01-onboarding-输入表单页', waitFor: 1000 },
  { path: '/chart', name: '02-chart-排盘报告-专业模式', waitFor: 2000 },
  { path: '/dashboard', name: '03-dashboard-每日主页', waitFor: 1500 },
  { path: '/chat', name: '04-chat-对话页', waitFor: 1500 },
  { path: '/journal', name: '05-journal-命理日记页', waitFor: 1500 },
];

async function main() {
  console.log('🚀 启动 Puppeteer...');
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // 监听页面 console 错误
  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`   [页面错误] ${msg.text()}`);
  });
  page.on('pageerror', err => console.log(`   [页面异常] ${err.message}`));

  // 先访问 onboarding 提交一次命盘（确保后续页面有数据）
  console.log('\n📝 先提交一次命盘...');
  await page.goto(`${BASE}/onboarding`, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 5000)); // 等 React 充分渲染

  // 调试：打印页面上所有按钮
  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(b => ({
      text: b.textContent?.trim(),
      classes: b.className,
      type: b.type,
    }));
  });
  console.log('   页面按钮:', JSON.stringify(buttons));

  // 用多种选择器尝试找到提交按钮
  let submitBtn = await page.$('button[type="submit"]');
  if (!submitBtn) submitBtn = await page.$('button.ant-btn-primary');
  if (!submitBtn) submitBtn = await page.$('.ant-btn-primary');

  if (submitBtn) {
    await submitBtn.click();
    await new Promise(r => setTimeout(r, 5000));
    console.log('   ✅ 命盘已提交\n');
  } else {
    // 兜底：直接通过 JS 触发表单提交
    console.log('   ⚠️ 选择器未找到按钮，尝试 JS 触发提交...');
    await page.evaluate(() => {
      const form = document.querySelector('form');
      if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await new Promise(r => setTimeout(r, 5000));
    console.log('   ✅ JS 提交完成\n');
  }

  for (const pg of PAGES) {
    console.log(`📸 截图: ${pg.name} (${pg.path})`);
    await page.goto(`${BASE}${pg.path}`, { waitUntil: 'networkidle2', timeout: 15000 });
    await new Promise(r => setTimeout(r, pg.waitFor));

    const filePath = path.join(OUTPUT_DIR, `${pg.name}.png`);
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`   ✅ 已保存: ${filePath}`);
  }

  // 额外：排盘报告消费者模式
  console.log('📸 截图: 02b-chart-排盘报告-消费者模式');
  await page.goto(`${BASE}/chart`, { waitUntil: 'networkidle2', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1500));
  // 点击"消费者模式"切换
  const segments = await page.$$('.ant-segmented-item');
  if (segments.length >= 2) {
    await segments[1].click();
    await new Promise(r => setTimeout(r, 1500));
  }
  const consumerPath = path.join(OUTPUT_DIR, '02b-chart-排盘报告-消费者模式.png');
  await page.screenshot({ path: consumerPath, fullPage: true });
  console.log(`   ✅ 已保存: ${consumerPath}`);

  // 额外：对话页带一条对话
  console.log('📸 截图: 04b-chat-对话页-含对话');
  await page.goto(`${BASE}/chat?scene=决策&question=下午面试要不要去`, { waitUntil: 'networkidle2', timeout: 15000 });
  await new Promise(r => setTimeout(r, 3000));
  const chatWithReplyPath = path.join(OUTPUT_DIR, '04b-chat-对话页-含对话.png');
  await page.screenshot({ path: chatWithReplyPath, fullPage: true });
  console.log(`   ✅ 已保存: ${chatWithReplyPath}`);

  await browser.close();
  console.log('\n🎉 全部截图完成！文件目录:', OUTPUT_DIR);
}

main().catch(err => {
  console.error('❌ 截图失败:', err.message);
  process.exit(1);
});
