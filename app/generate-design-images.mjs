#!/usr/bin/env node
/**
 * 批量调用 image 2 的 edit API，以现有产品截图作为参考图，
 * 生成优化后的产品设计原型图。
 *
 * 使用 gpt-image-2-0421-global 模型，quality=medium
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '..', '产品设计原型图');
const OUTPUT_DIR = path.join(__dirname, '..', '产品设计原型图-优化');
const IMAGE2_API = 'http://localhost:8080/api/edit';

// 确保输出目录存在
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ===== 每张截图的优化提示词 =====
const PAGES = [
  {
    file: '01-onboarding-输入表单页.png',
    outputName: '01-onboarding-输入表单页-优化.png',
    prompt: `Redesign this Chinese BaZi (八字) fortune-telling web form page into a premium, elegant UI mockup with the following style:

OVERALL STYLE:
- Traditional Chinese aesthetic with modern UI design, inspired by Song Dynasty ink wash painting
- Warm parchment/ivory background (#F5ECD7) with subtle ink wash mountain/cloud watermark textures
- Clean, spacious layout with generous whitespace

HEADER:
- Top center: a red Chinese seal stamp icon (方印) with the character "命" inside
- Title: "子 平 命 鉴" in elegant Song Ti (宋体) calligraphy font, dark brown color
- Subtitle: "— 知 命 而 不 困 于 命 —" in lighter brown
- Below: "输入你的出生信息，开启一次关于自己的推演" in warm gray

FORM CARD:
- Frosted glass / semi-transparent white card with subtle shadow, rounded corners
- Section headers with a small decorative diamond (◇) icon: "基本信息", "出生信息"
- Form fields: clean input boxes with light gray borders, person icon for name, calendar icon for date
- Gender selector: two pill buttons "男/女" with red active state and gender icons
- Time input: hour/minute dropdowns side by side, with a "卯时 05:00-07:00" badge
- Location: dropdown with pin icon
- Interest tags: 6 clickable tag cards in 3x2 grid (事业/感情/财运/健康/学业/人际), each with an icon, selected ones highlighted in red with checkmark
- Collapsible "高级选项 (流派设置)" section

SUBMIT BUTTON:
- Full-width red button (#B8372F) with subtle texture/gradient, "开启命盘推演" text with a compass/bagua icon
- Below: "约需 3 秒 · 不保存个人信息" in light gray

FOOTER:
- "八字推盘 · 命理推断 · 趋吉避凶 · 知命从容" in warm gray

Keep all Chinese text exactly as described. The design should feel like a premium astrology consultation app, not a generic form.`,
    size: '1024x1536',
  },
  {
    file: '02-chart-排盘报告-专业模式.png',
    outputName: '02-chart-排盘报告-专业模式-优化.png',
    prompt: `Redesign this Chinese BaZi (八字) professional chart report page into a premium, elegant UI mockup:

OVERALL STYLE:
- Traditional Chinese aesthetic with modern UI, Song Dynasty ink wash painting inspired
- Warm parchment/ivory background (#F5ECD7) with subtle ink wash mountain textures
- Dark brown/sepia color scheme with red (#B8372F) accents

TOP NAVIGATION BAR:
- Left: "先生" brand name with a scroll icon
- Right: navigation tabs "今日 / 对话 / 命理日记 / 我的命盘 / ✏修改"

BAZI CHART TABLE (四柱排盘):
- Elegant 4-column table (年柱/月柱/日柱/时柱) with traditional grid layout
- Each column shows: 天干 (Heavenly Stem), 地支 (Earthly Branch), 藏干, 十神, 纳音
- Use dark brown headers, clean rows with subtle borders
- Professional calligraphy-style characters

ANALYSIS SECTIONS:
- "旺衰链路" section: visual chain diagram showing 得地→得令→得势→结论 with colored indicators
- "五行分布" section: horizontal bar chart with 5 elements (金木水火土), color-coded bars with percentages
- "用神分析" section: card with primary/secondary 用神 highlighted in red/gold
- "格局判定" section: badge showing the detected 格局 type
- "神煞一览" section: tags/badges for each 神煞 (吉神 in green/gold, 凶神 in muted red)
- "要点发现" section: key insight cards with icons

Each section in a frosted glass card with subtle shadow. Maintain professional fortune-telling aesthetic throughout.`,
    size: '1024x1536',
  },
  {
    file: '02b-chart-排盘报告-消费者模式.png',
    outputName: '02b-chart-排盘报告-消费者模式-优化.png',
    prompt: `Redesign this Chinese BaZi consumer-mode report page into a premium, elegant UI mockup:

OVERALL STYLE:
- Traditional Chinese aesthetic with modern UI, warm and approachable
- Warm parchment/ivory background (#F5ECD7) with subtle ink wash mountain textures
- Friendly, less technical than professional mode

TOP SECTION:
- "你的命格" header with decorative element
- Large featured card: 纳音 personality type (e.g. "大海水") with a beautiful metaphorical illustration
- Personality subtitle and 3-4 keyword tags in pill badges

PERSONALITY SECTION:
- "性格画像" with an artistic personality description in elegant prose
- Warm, encouraging tone

LIFE GUIDANCE CARDS:
- "其他领域速览" header with a "概览" toggle button
- 4 cards in 2x2 grid: 感情/财运/健康/人际
- Each card has a colored dot header, warm descriptive text
- Frosted glass card style with subtle shadows

LUCKY ELEMENTS SECTION:
- "开运指南" header
- Visual cards showing: 幸运颜色 (color swatches), 幸运方位 (compass direction), 幸运数字, 适合行业
- Each with relevant icons

Keep all Chinese text. The design should feel warm, personal, and spiritually uplifting — like receiving a personalized fortune consultation.`,
    size: '1024x1536',
  },
  {
    file: '03-dashboard-每日主页.png',
    outputName: '03-dashboard-每日主页-优化.png',
    prompt: `Redesign this Chinese BaZi daily fortune dashboard page into a premium, elegant UI mockup:

OVERALL STYLE:
- Traditional Chinese aesthetic with modern UI design
- Warm parchment/ivory background (#F5ECD7) with subtle ink wash textures
- Red (#B8372F) and dark brown color scheme

TOP NAVIGATION:
- Left: "先生" brand with scroll icon
- Right: "今日 / 对话 / 命理日记 / 我的命盘 / ✏修改" tabs

TODAY'S FORTUNE HEADER:
- Date display: "2026-04-26" with Chinese calendar (丙午年 三月初十)
- Large red calligraphy: "庚午日" (today's pillar)
- Tag badges: "偏印 · 小吉"
- Daily quote in a left-bordered card: "「先生看来，午火财星当令暖身...」"

YI/JI (宜/忌) SECTION:
- Two columns side by side with red (宜) and muted (忌) headers
- 宜: 见客, 签约, 出行, 处理财务
- 忌: 夜宴, 与人争辩, 过度劳神
- Beautiful circular icons for 宜 and 忌

AUSPICIOUS HOURS:
- Timeline showing 吉时 with golden diamond markers
- "巳时 (09:00-11:00)" and "午时 (11:00-13:00)" highlighted in red with explanations

QUICK ACTION CARDS:
- "今日想问先生什么？" header with decorative dividers
- 4 cards in a row: 决策建议, 时机择吉, 每日宜忌, 开放问答
- Each with emoji icon, title, and subtitle
- Quick input bar: "和先生说点什么......" with "请教" button

WEEKLY CHART:
- "本周运势" card with a smooth line chart (7 days)
- Today highlighted with a red dot and "今" label
- Y-axis from 小凶 to 小吉

RECENT Q&A:
- "最近请教" section with 2-3 recent conversation cards
- Each showing date, topic tag, question, and preview of answer

Keep all Chinese text. The design should feel like opening a premium daily fortune app — personal, warm, and spiritually grounding.`,
    size: '1024x1536',
  },
  {
    file: '04-chat-对话页.png',
    outputName: '04-chat-对话页-优化.png',
    prompt: `Redesign this Chinese BaZi chat/consultation page (empty state) into a premium, elegant UI mockup:

OVERALL STYLE:
- Traditional Chinese aesthetic with modern chat UI
- Warm parchment/ivory background (#F5ECD7) with subtle ink wash textures
- Clean, zen-like empty state

TOP NAVIGATION:
- Left: "先生" brand with scroll icon
- Right: "今日 / 对话 / 命理日记 / 我的命盘 / ✏修改" tabs

SCENE SELECTOR:
- "当前场景：" label with dropdown showing "🤔 决策建议"
- Below: today's fortune summary "庚午日：您日主丙火，喜木火助身，用神金土"

EMPTY STATE:
- Centered elegant illustration: a traditional Chinese study desk with an ink brush, scroll, and incense
- Or: a wise sage silhouette in meditation
- Text: "请问先生，您有什么想问的？" in elegant serif font
- Subtle decorative cloud/wave patterns

BOTTOM INPUT BAR:
- Scene selector pill: "🤔 决策" with dropdown arrow
- Input field: "我该不该......" placeholder text
- Red "请教" send button
- The input bar should feel premium with subtle shadow and rounded corners

Keep all Chinese text. The empty state should feel contemplative and inviting — like sitting before a wise master waiting to share wisdom.`,
    size: '1024x1536',
  },
  {
    file: '04b-chat-对话页-含对话.png',
    outputName: '04b-chat-对话页-含对话-优化.png',
    prompt: `Redesign this Chinese BaZi chat/consultation page (with conversation) into a premium, elegant UI mockup:

OVERALL STYLE:
- Traditional Chinese aesthetic with modern chat UI
- Warm parchment/ivory background (#F5ECD7) with subtle ink wash textures

TOP NAVIGATION:
- Left: "先生" brand with scroll icon
- Right: navigation tabs

CONVERSATION AREA:
- The master's reply displayed as an elegant card with three sections, each with a decorative divider (◇):

  【共情】section:
  - Warm, empathetic opening: "先生明白您的为难——身体不适又怕错过机会..."
  - Soft, warm text style

  【解释】section:
  - Detailed BaZi analysis with specific day pillar references
  - Semi-transparent "命理依据" collapsible card showing:
    - 流日, 用神, 大运, 推荐时机 details
  - Professional but accessible tone

  【建议】section:
  - 3 numbered actionable suggestions
  - Each starting with a circled number (①②③)
  - Practical, specific advice

- Right side: a floating "慎" (caution) badge in red circle

BOTTOM INPUT BAR:
- Scene selector: "🤔 决策" pill
- Input: "我该不该......" placeholder
- Red "请教" button

Keep all Chinese text. The conversation should look like a premium fortune consultation — wise, warm, and beautifully presented.`,
    size: '1024x1536',
  },
  {
    file: '05-journal-命理日记页.png',
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
  },
];

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 60000; // 限流后等待 60 秒再重试
const BETWEEN_REQUESTS_MS = 15000; // 每张图之间等待 15 秒，避免触发限流

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateImageOnce(pageConfig) {
  const inputPath = path.join(SCREENSHOTS_DIR, pageConfig.file);
  if (!fs.existsSync(inputPath)) {
    console.log(`   ⚠️ 参考图不存在: ${inputPath}`);
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
    console.log(`   ❌ API 错误 (HTTP ${response.status}): ${errorText.substring(0, 200)}`);
    return { success: false, rateLimited: isRateLimited };
  }

  const result = await response.json();
  if (result.data && result.data[0] && result.data[0].b64_json) {
    const outputPath = path.join(OUTPUT_DIR, pageConfig.outputName);
    const imageData = Buffer.from(result.data[0].b64_json, 'base64');
    fs.writeFileSync(outputPath, imageData);
    console.log(`   ✅ 已保存: ${outputPath} (${(imageData.length / 1024).toFixed(0)} KB)`);
    return { success: true, rateLimited: false };
  } else {
    console.log(`   ❌ 响应中未找到图片数据`);
    return { success: false, rateLimited: false };
  }
}

async function generateImageWithRetry(pageConfig) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`   🔄 第 ${attempt}/${MAX_RETRIES} 次尝试...`);
    const startTime = Date.now();
    const result = await generateImageOnce(pageConfig);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`   耗时: ${elapsed}s`);

    if (result.success) return true;

    if (result.rateLimited && attempt < MAX_RETRIES) {
      const waitSec = (RETRY_DELAY_MS / 1000).toFixed(0);
      console.log(`   ⏳ API 限流，等待 ${waitSec} 秒后重试...`);
      await sleep(RETRY_DELAY_MS);
    } else if (!result.rateLimited) {
      break; // 非限流错误，不重试
    }
  }
  return false;
}

async function main() {
  console.log('🎨 开始批量生成优化设计图（带重试）...');
  console.log(`   参考图目录: ${SCREENSHOTS_DIR}`);
  console.log(`   输出目录: ${OUTPUT_DIR}`);
  console.log(`   模型: gpt-image-2-0421-global, quality=medium`);
  console.log(`   重试次数: ${MAX_RETRIES}, 限流等待: ${RETRY_DELAY_MS / 1000}s, 间隔: ${BETWEEN_REQUESTS_MS / 1000}s\n`);

  let successCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < PAGES.length; i++) {
    const pageConfig = PAGES[i];
    const outputPath = path.join(OUTPUT_DIR, pageConfig.outputName);

    // 跳过已成功生成的图片
    if (fs.existsSync(outputPath)) {
      const fileSize = fs.statSync(outputPath).size;
      console.log(`\n⏭️ 跳过已存在: ${pageConfig.outputName} (${(fileSize / 1024).toFixed(0)} KB)`);
      successCount++;
      skippedCount++;
      continue;
    }

    console.log(`\n📸 [${i + 1}/${PAGES.length}] 生成: ${pageConfig.outputName}`);
    console.log(`   参考图: ${pageConfig.file}`);

    const success = await generateImageWithRetry(pageConfig);
    if (success) successCount++;

    // 请求间隔，避免连续触发限流
    if (i < PAGES.length - 1) {
      console.log(`   ⏳ 等待 ${BETWEEN_REQUESTS_MS / 1000}s 后处理下一张...`);
      await sleep(BETWEEN_REQUESTS_MS);
    }
  }

  console.log(`\n🎉 完成！成功 ${successCount}/${PAGES.length} 张（跳过已有 ${skippedCount} 张）`);
  console.log(`   输出目录: ${OUTPUT_DIR}`);
}

main().catch(err => {
  console.error('❌ 生成失败:', err.message);
  process.exit(1);
});
