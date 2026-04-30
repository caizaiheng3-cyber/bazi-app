#!/usr/bin/env node
/**
 * 单独重跑 05-journal 命理日记页 的原型图生成
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = '/tmp';
const OUTPUT_DIR = path.join(__dirname, '..', '产品设计原型图-优化');
const IMAGE2_API = 'http://localhost:8080/api/edit';

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const pageConfig = {
  file: '05-journal-small.png',
  outputName: '05-journal-命理日记页-优化.png',
  prompt: `Redesign this Chinese BaZi journal/diary page into a premium, elegant UI mockup:

OVERALL STYLE:
- Traditional Chinese aesthetic with modern UI
- Warm parchment/ivory background (#F5ECD7) with subtle ink wash textures
- Organized, clean journal layout

TOP NAVIGATION:
- Left: "先生" brand with scroll icon
- Right: "今日 / 对话 / 命理日记 / 我的命盘 / ✏修改" tabs

PAGE HEADER:
- "命理日记" title in elegant calligraphy
- Subtitle explaining the journal's purpose

JOURNAL ENTRIES:
- Each entry as an elegant card with:
  - Date header (e.g. "2026-04-26") with Chinese calendar date
  - Day pillar badge (e.g. "庚午日")
  - Scene tag (决策/择吉/宜忌/开放)
  - Question text in bold
  - Answer preview (first 2-3 lines)
  - Feedback indicator: 准/慎 badges in colored circles
  - Expand/collapse toggle

- Cards stacked vertically with subtle spacing
- Alternating subtle background tones for visual rhythm

PAGINATION OR INFINITE SCROLL:
- "加载更多" button or scroll indicator at bottom

EMPTY STATE (if no entries):
- Elegant empty state with ink brush illustration
- "还没有请教记录，去问问先生吧" text

Keep all Chinese text. The journal should feel like a personal fortune diary — organized, reflective, and beautiful.`,
  size: '1024x1536',
};

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 65000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateImageOnce() {
  const inputPath = path.join(SCREENSHOTS_DIR, pageConfig.file);
  if (!fs.existsSync(inputPath)) {
    console.log(`⚠️ 参考图不存在: ${inputPath}`);
    return { success: false, rateLimited: false };
  }

  const imageBuffer = fs.readFileSync(inputPath);
  const imageBase64 = imageBuffer.toString('base64');

  const requestBody = {
    images: [imageBase64],
    prompt: pageConfig.prompt,
    model: 'gpt-image-2-0421-global',
    size: pageConfig.size,
    quality: 'medium',
    n: 1,
  };

  const response = await fetch(IMAGE2_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const isRateLimited = errorText.includes('MPE-429') || errorText.includes('EngineOverloaded') || response.status === 429;
    console.log(`❌ API 错误 (HTTP ${response.status}): ${errorText.substring(0, 200)}`);
    return { success: false, rateLimited: isRateLimited };
  }

  const result = await response.json();
  if (result.data && result.data[0] && result.data[0].b64_json) {
    const outputPath = path.join(OUTPUT_DIR, pageConfig.outputName);
    const imageData = Buffer.from(result.data[0].b64_json, 'base64');
    fs.writeFileSync(outputPath, imageData);
    console.log(`✅ 已保存: ${outputPath} (${(imageData.length / 1024).toFixed(0)} KB)`);
    return { success: true, rateLimited: false };
  } else {
    console.log(`❌ 响应中未找到图片数据`);
    return { success: false, rateLimited: false };
  }
}

async function main() {
  console.log('🎨 单独重跑 05-journal 命理日记页 原型图生成...');
  console.log(`   重试次数: ${MAX_RETRIES}, 限流等待: ${RETRY_DELAY_MS / 1000}s\n`);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`🔄 第 ${attempt}/${MAX_RETRIES} 次尝试...`);
    const startTime = Date.now();
    const result = await generateImageOnce();
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`   耗时: ${elapsed}s`);

    if (result.success) {
      console.log('\n🎉 05-journal 生成成功！');
      process.exit(0);
    }

    if (result.rateLimited && attempt < MAX_RETRIES) {
      console.log(`⏳ API 限流，等待 ${RETRY_DELAY_MS / 1000} 秒后重试...\n`);
      await sleep(RETRY_DELAY_MS);
    } else if (!result.rateLimited) {
      console.log('❌ 非限流错误，停止重试');
      process.exit(1);
    }
  }

  console.log('\n❌ 所有重试均失败');
  process.exit(1);
}

main().catch(console.error);
