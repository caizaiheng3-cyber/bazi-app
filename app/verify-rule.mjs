#!/usr/bin/env node
/**
 * 规则验证工具：快速验证单个案例的完整输出
 * 
 * 用途：
 * - 修改规则配置文件后，快速验证输出是否正确
 * - 对比修改前后的输出差异
 * - 检测规则覆盖率和冲突
 * 
 * 运行方式：
 * node verify-rule.mjs --case 蔡蔡 --all
 * node verify-rule.mjs --case 蔡蔡 --module wangShuai
 * node verify-rule.mjs --diff --before output/before.json --after output/after.json
 * node verify-rule.mjs --coverage
 * node verify-rule.mjs --conflicts
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 导入引擎
import { buildChartWithFallback } from './src/engine/baziEngine.ts';
import { generateShifuReply } from './src/engine/shifuEngine.ts';
import { generateConsumerReport } from './src/engine/consumerReportGenerator.ts';

// 预设案例
const CASES = {
  '蔡蔡': {
    name: '蔡蔡',
    gender: '男',
    birthDate: '1993-12-07',
    birthTime: '06:00',
    ziShiSchool: 'early',
    useTrueSolarTime: false,
    birthPlace: '',
  },
  // 可以添加更多案例
};

// 模块映射
const MODULES = {
  'all': '完整输出',
  'wangShuai': '旺衰判定',
  'yongShen': '用神选取',
  'geJu': '格局判定',
  'shenSha': '神煞判定',
  'shifu': '先生回话',
  'consumer': '消费者报告',
};

// ==================== 命令行解析 ====================

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    case: null,
    module: 'all',
    diff: false,
    before: null,
    after: null,
    coverage: false,
    conflicts: false,
    output: null,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--case' && args[i + 1]) {
      options.case = args[i + 1];
      i++;
    } else if (arg === '--module' && args[i + 1]) {
      options.module = args[i + 1];
      i++;
    } else if (arg === '--diff') {
      options.diff = true;
    } else if (arg === '--before' && args[i + 1]) {
      options.before = args[i + 1];
      i++;
    } else if (arg === '--after' && args[i + 1]) {
      options.after = args[i + 1];
      i++;
    } else if (arg === '--coverage') {
      options.coverage = true;
    } else if (arg === '--conflicts') {
      options.conflicts = true;
    } else if (arg === '--output' && args[i + 1]) {
      options.output = args[i + 1];
      i++;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

function printHelp() {
  console.log(`
规则验证工具 - 快速验证规则配置的输出准确性

用法：
  node verify-rule.mjs --case <案例名> [--module <模块>]
  node verify-rule.mjs --diff --before <文件> --after <文件>
  node verify-rule.mjs --coverage
  node verify-rule.mjs --conflicts

选项：
  --case <案例名>      验证指定案例（如：蔡蔡）
  --module <模块>      验证指定模块（all|wangShuai|yongShen|geJu|shenSha|shifu|consumer）
  --diff              对比两个输出文件
  --before <文件>      对比时的基准文件
  --after <文件>       对比时的新文件
  --coverage          生成规则覆盖率报告
  --conflicts         检测规则冲突
  --output <文件>      输出结果到文件（默认输出到控制台）
  --help, -h          显示此帮助信息

示例：
  # 验证蔡蔡案例的完整输出
  node verify-rule.mjs --case 蔡蔡 --all

  # 只验证旺衰判定
  node verify-rule.mjs --case 蔡蔡 --module wangShuai

  # 对比修改前后的输出
  node verify-rule.mjs --diff --before output/before.json --after output/after.json

  # 生成规则覆盖率报告
  node verify-rule.mjs --coverage

可用案例：
  ${Object.keys(CASES).join(', ')}

可用模块：
  ${Object.entries(MODULES).map(([k, v]) => `${k}: ${v}`).join('\n  ')}
`);
}

// ==================== 验证逻辑 ====================

function verifyCase(caseName, module) {
  const caseData = CASES[caseName];
  if (!caseData) {
    console.error(`❌ 案例 "${caseName}" 不存在`);
    console.log(`可用案例：${Object.keys(CASES).join(', ')}`);
    process.exit(1);
  }

  console.log(`\n═══════════════════════════════════════════════════════════`);
  console.log(`  验证案例：${caseName}  模块：${MODULES[module]}`);
  console.log(`═══════════════════════════════════════════════════════════\n`);

  // 生成命盘
  const chart = buildChartWithFallback(caseData);
  
  // 输出结果
  const result = { case: caseName, module, data: null };

  switch (module) {
    case 'all':
      result.data = chart;
      console.log('【完整命盘】');
      console.log(JSON.stringify(chart, null, 2));
      break;
    case 'wangShuai':
      result.data = chart.wangShuai;
      console.log('【旺衰判定】');
      console.log(`结论：${chart.wangShuai.conclusion}`);
      console.log(`置信度：${chart.wangShuai.confidence}`);
      console.log(`多法同断：${chart.wangShuai.convergence ? '是' : '否'}`);
      console.log('\n推理步骤：');
      chart.wangShuai.steps.forEach((step, i) => {
        console.log(`\n${i + 1}. ${step.title}`);
        console.log(`   结果：${step.result}`);
        console.log(`   详情：`);
        step.details.forEach(d => console.log(`   - ${d}`));
      });
      break;
    case 'yongShen':
      result.data = chart.yongShen;
      console.log('【用神选取】');
      console.log(`主用神：${chart.yongShen.primary.join('+')}`);
      console.log(`次用神：${chart.yongShen.secondary.join('+')}`);
      console.log(`忌神：${chart.yongShen.ji.join('+')}`);
      console.log(`主导方法：${chart.yongShen.method}`);
      console.log(`多法同断：${chart.yongShen.convergence ? '是' : '否'}`);
      console.log(`\n推断理由：`);
      console.log(chart.yongShen.reason);
      break;
    case 'geJu':
      result.data = chart.geJu;
      console.log('【格局判定】');
      console.log(`格局名称：${chart.geJu.name}`);
      console.log(`格局类型：${chart.geJu.type}`);
      console.log(`格局状态：${chart.geJu.status}`);
      console.log(`格局层次：${chart.geJu.level}`);
      console.log(`\n格局描述：`);
      console.log(chart.geJu.description);
      break;
    case 'shenSha':
      result.data = chart.shenShas;
      console.log('【神煞判定】');
      console.log(`命中神煞：${chart.shenShas.length} 个`);
      chart.shenShas.forEach((ss, i) => {
        console.log(`\n${i + 1}. ${ss.name} (${ss.category})`);
        console.log(`   来源：${ss.source}`);
        console.log(`   描述：${ss.description}`);
      });
      break;
    case 'shifu':
      const shifuReply = generateShifuReply({
        question: '下午面试要不要去？',
        scene: '决策',
        chart,
        anchorDate: new Date(),
      });
      result.data = shifuReply;
      console.log('【先生回话】');
      console.log(`场景：决策`);
      console.log(`印章：${shifuReply.verdict}`);
      console.log(`\n【共情】`);
      console.log(shifuReply.empathy);
      console.log(`\n【解释】`);
      console.log(shifuReply.explanation);
      console.log(`\n【建议】`);
      console.log(shifuReply.suggestion);
      console.log(`\n【命理依据】`);
      console.log(`  流日：${shifuReply.basis.liuRi}`);
      console.log(`  流年：${shifuReply.basis.liuNian}`);
      console.log(`  用神：${shifuReply.basis.yongShen}`);
      if (shifuReply.basis.daYun) {
        console.log(`  大运：${shifuReply.basis.daYun}`);
      }
      console.log(`\n【最佳时机】`);
      console.log(shifuReply.bestTiming);
      break;
    case 'consumer':
      const consumerReport = generateConsumerReport(chart);
      result.data = consumerReport;
      console.log('【消费者报告】');
      console.log(`\n【命格意象】`);
      console.log(consumerReport.opening.paragraphs[0]);
      console.log(`\n【为什么是这样】`);
      consumerReport.why.paragraphs.forEach(p => console.log(p));
      console.log(`\n【事业出路】`);
      consumerReport.guidance.points.forEach(p => {
        console.log(`\n${p.heading}`);
        console.log(p.content);
      });
      console.log(`\n【开运指南】`);
      console.log(`  幸运颜色：${consumerReport.luckyGuide.colors.join(', ')}`);
      console.log(`  有利方位：${consumerReport.luckyGuide.directions.join(', ')}`);
      console.log(`  幸运数字：${consumerReport.luckyGuide.numbers.join(', ')}`);
      break;
    default:
      console.error(`❌ 模块 "${module}" 不存在`);
      console.log(`可用模块：${Object.keys(MODULES).join(', ')}`);
      process.exit(1);
  }

  console.log(`\n═══════════════════════════════════════════════════════════`);
  console.log(`  验证完成`);
  console.log(`═══════════════════════════════════════════════════════════\n`);

  return result;
}

// ==================== 对比逻辑 ====================

function diffOutputs(beforePath, afterPath) {
  console.log(`\n═══════════════════════════════════════════════════════════`);
  console.log(`  输出对比`);
  console.log(`═══════════════════════════════════════════════════════════\n`);

  if (!existsSync(beforePath)) {
    console.error(`❌ 基准文件不存在：${beforePath}`);
    process.exit(1);
  }
  if (!existsSync(afterPath)) {
    console.error(`❌ 新文件不存在：${afterPath}`);
    process.exit(1);
  }

  const before = JSON.parse(readFileSync(beforePath, 'utf-8'));
  const after = JSON.parse(readFileSync(afterPath, 'utf-8'));

  console.log(`【基准文件】${beforePath}`);
  console.log(`【新文件】${afterPath}\n`);

  // 深度对比 JSON 对象
  const differences = deepDiff(before, after, '');

  if (differences.length === 0) {
    console.log('✅ 两个文件完全相同');
  } else {
    console.log(`⚠️  检测到 ${differences.length} 处差异\n`);
    console.log('【差异详情】');
    differences.forEach((diff, i) => {
      console.log(`\n${i + 1}. ${diff.path}`);
      console.log(`   类型：${diff.type}`);
      if (diff.type === 'value_changed') {
        console.log(`   修改前：${formatValue(diff.oldValue)}`);
        console.log(`   修改后：${formatValue(diff.newValue)}`);
      } else if (diff.type === 'added') {
        console.log(`   新增：${formatValue(diff.newValue)}`);
      } else if (diff.type === 'removed') {
        console.log(`   删除：${formatValue(diff.oldValue)}`);
      }
    });
  }

  console.log(`\n═══════════════════════════════════════════════════════════`);
  console.log(`  对比完成`);
  console.log(`═══════════════════════════════════════════════════════════\n`);
}

function deepDiff(obj1, obj2, path) {
  const differences = [];

  function compare(a, b, currentPath) {
    if (a === b) return;

    if (typeof a !== typeof b) {
      differences.push({
        path: currentPath,
        type: 'value_changed',
        oldValue: a,
        newValue: b,
      });
      return;
    }

    if (typeof a !== 'object' || a === null || b === null) {
      differences.push({
        path: currentPath,
        type: 'value_changed',
        oldValue: a,
        newValue: b,
      });
      return;
    }

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) {
        differences.push({
          path: currentPath,
          type: 'value_changed',
          oldValue: `数组长度 ${a.length}`,
          newValue: `数组长度 ${b.length}`,
        });
      }
      const maxLength = Math.max(a.length, b.length);
      for (let i = 0; i < maxLength; i++) {
        if (i >= a.length) {
          differences.push({
            path: `${currentPath}[${i}]`,
            type: 'added',
            newValue: b[i],
          });
        } else if (i >= b.length) {
          differences.push({
            path: `${currentPath}[${i}]`,
            type: 'removed',
            oldValue: a[i],
          });
        } else {
          compare(a[i], b[i], `${currentPath}[${i}]`);
        }
      }
      return;
    }

    const keys1 = Object.keys(a);
    const keys2 = Object.keys(b);
    const allKeys = new Set([...keys1, ...keys2]);

    allKeys.forEach(key => {
      const newPath = currentPath ? `${currentPath}.${key}` : key;
      if (!(key in a)) {
        differences.push({
          path: newPath,
          type: 'added',
          newValue: b[key],
        });
      } else if (!(key in b)) {
        differences.push({
          path: newPath,
          type: 'removed',
          oldValue: a[key],
        });
      } else {
        compare(a[key], b[key], newPath);
      }
    });
  }

  compare(obj1, obj2, path);
  return differences;
}

function formatValue(value) {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

// ==================== 覆盖率报告 ====================

function generateCoverageReport() {
  console.log(`\n═══════════════════════════════════════════════════════════`);
  console.log(`  规则覆盖率报告`);
  console.log(`═══════════════════════════════════════════════════════════\n`);

  // 读取所有规则文件
  const rulesDir = join(__dirname, 'src/engine/rules');
  const ruleFiles = [
    'wangShuaiRules.json',
    'yongShenRules.json',
    'geJuRules.json',
    'shenShaRules.json',
    'shifuReplyTemplates.json',
    'consumerReportRules.json',
  ];

  const report = {
    totalRules: 0,
    totalMappings: 0,
    totalTemplates: 0,
    totalConditions: 0,
    files: [],
  };

  ruleFiles.forEach(file => {
    const filePath = join(rulesDir, file);
    if (!existsSync(filePath)) {
      console.log(`⚠️  文件不存在：${file}`);
      return;
    }

    const rule = JSON.parse(readFileSync(filePath, 'utf-8'));
    const stats = countRuleStats(rule);
    
    report.totalRules += stats.rules;
    report.totalMappings += stats.mappings;
    report.totalTemplates += stats.templates;
    report.totalConditions += stats.conditions;

    report.files.push({
      file,
      version: rule.version,
      description: rule.description,
      stats,
    });

    console.log(`📄 ${file}`);
    console.log(`   版本：${rule.version}`);
    console.log(`   描述：${rule.description}`);
    console.log(`   规则块：${stats.rules}`);
    console.log(`   映射表：${stats.mappings}`);
    console.log(`   模板：${stats.templates}`);
    console.log(`   条件：${stats.conditions}`);
    console.log();
  });

  console.log(`【总计】`);
  console.log(`   规则块总数：${report.totalRules}`);
  console.log(`   映射表总数：${report.totalMappings}`);
  console.log(`   模板总数：${report.totalTemplates}`);
  console.log(`   条件总数：${report.totalConditions}`);
  console.log(`   配置项总数：${report.totalRules + report.totalMappings + report.totalTemplates + report.totalConditions}`);

  console.log(`\n【说明】`);
  console.log(`   规则块：命理推断规则（如旺衰判定、用神选取等）`);
  console.log(`   映射表：数据映射关系（如五行相生相克表、神煞映射表等）`);
  console.log(`   模板：文案模板（如先生回话模板、消费者报告模板等）`);
  console.log(`   条件：判定条件（如成格条件、触发条件等）`);

  console.log(`\n═══════════════════════════════════════════════════════════`);
  console.log(`  报告生成完成`);
  console.log(`═══════════════════════════════════════════════════════════\n`);
}

function countRuleStats(obj) {
  const stats = {
    rules: 0,
    mappings: 0,
    templates: 0,
    conditions: 0,
  };

  function traverse(o) {
    if (typeof o !== 'object' || o === null) return;

    if (Array.isArray(o)) {
      o.forEach(traverse);
      return;
    }

    Object.keys(o).forEach(key => {
      // 统计规则块
      if (key === 'rules' && typeof o[key] === 'object' && !Array.isArray(o[key])) {
        stats.rules++;
        traverse(o[key]);
      }
      // 统计映射表
      else if (key === 'mapping' && typeof o[key] === 'object') {
        stats.mappings++;
        traverse(o[key]);
      }
      // 统计模板
      else if (key.includes('Template') || key.includes('template')) {
        stats.templates++;
      }
      // 统计条件
      else if (key.includes('condition') || key.includes('Condition')) {
        stats.conditions++;
      }
      else {
        traverse(o[key]);
      }
    });
  }

  traverse(obj);
  return stats;
}

// ==================== 冲突检测 ====================

function detectConflicts() {
  console.log(`\n═══════════════════════════════════════════════════════════`);
  console.log(`  规则冲突检测`);
  console.log(`═══════════════════════════════════════════════════════════\n`);

  const rulesDir = join(__dirname, 'src/engine/rules');
  const ruleFiles = [
    'wangShuaiRules.json',
    'yongShenRules.json',
    'geJuRules.json',
    'shenShaRules.json',
  ];

  const conflicts = [];

  // 1. 检测文件内的冲突
  ruleFiles.forEach(file => {
    const filePath = join(rulesDir, file);
    if (!existsSync(filePath)) {
      console.log(`⚠️  文件不存在：${file}`);
      return;
    }

    const rule = JSON.parse(readFileSync(filePath, 'utf-8'));
    const fileConflicts = checkInternalConflicts(rule, file);
    if (fileConflicts.length > 0) {
      conflicts.push(...fileConflicts);
    }
  });

  // 2. 检测跨文件的冲突
  const crossFileConflicts = checkCrossFileConflicts(rulesDir, ruleFiles);
  conflicts.push(...crossFileConflicts);

  if (conflicts.length === 0) {
    console.log('✅ 未检测到规则冲突');
  } else {
    console.log(`⚠️  检测到 ${conflicts.length} 个潜在冲突：\n`);
    conflicts.forEach((conflict, i) => {
      console.log(`${i + 1}. ${conflict}`);
    });
  }

  console.log(`\n═══════════════════════════════════════════════════════════`);
  console.log(`  检测完成`);
  console.log(`═══════════════════════════════════════════════════════════\n`);
}

function checkInternalConflicts(rule, fileName) {
  const conflicts = [];
  const seenKeys = new Map();

  function traverse(obj, path) {
    if (typeof obj !== 'object' || obj === null) return;

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => traverse(item, `${path}[${index}]`));
      return;
    }

    Object.keys(obj).forEach(key => {
      const fullPath = `${path}.${key}`;
      
      // 检查重复的 key 定义
      if (key === 'mapping' || key === 'rules') {
        if (seenKeys.has(key)) {
          conflicts.push(`[${fileName}] 重复定义的 "${key}" 在 ${fullPath}，之前定义在 ${seenKeys.get(key)}`);
        } else {
          seenKeys.set(key, fullPath);
        }
      }

      // 检查条件冲突
      if (key.includes('condition') || key.includes('Condition')) {
        if (Array.isArray(obj[key])) {
          const conditions = obj[key];
          for (let i = 0; i < conditions.length; i++) {
            for (let j = i + 1; j < conditions.length; j++) {
              if (JSON.stringify(conditions[i]) === JSON.stringify(conditions[j])) {
                conflicts.push(`[${fileName}] 重复的条件在 ${fullPath}[${i}] 和 [${j}]`);
              }
            }
          }
        }
      }

      traverse(obj[key], fullPath);
    });
  }

  traverse(rule, fileName);
  return conflicts;
}

function checkCrossFileConflicts(rulesDir, ruleFiles) {
  const conflicts = [];
  
  // 收集所有文件的映射关系
  const allMappings = new Map();

  ruleFiles.forEach(file => {
    const filePath = join(rulesDir, file);
    if (!existsSync(filePath)) return;

    const rule = JSON.parse(readFileSync(filePath, 'utf-8'));

    function traverse(obj, path) {
      if (typeof obj !== 'object' || obj === null) return;

      if (Array.isArray(obj)) {
        obj.forEach(item => traverse(item, path));
        return;
      }

      Object.keys(obj).forEach(key => {
        if (key === 'mapping' && typeof obj[key] === 'object') {
          // 检查映射表是否有冲突
          Object.keys(obj[key]).forEach(mapKey => {
            const mapValue = obj[key][mapKey];
            const mapPath = `${file}.${path}.${key}.${mapKey}`;
            
            if (allMappings.has(mapKey)) {
              const existing = allMappings.get(mapKey);
              if (JSON.stringify(existing.value) !== JSON.stringify(mapValue)) {
                conflicts.push(`跨文件冲突："${mapKey}" 在 ${existing.path} 和 ${mapPath} 有不同的定义`);
              }
            } else {
              allMappings.set(mapKey, { path: mapPath, value: mapValue });
            }
          });
        }
        traverse(obj[key], `${path}.${key}`);
      });
    }

    traverse(rule, file);
  });

  return conflicts;
}

// ==================== 主入口 ====================

function main() {
  const options = parseArgs();

  if (options.coverage) {
    generateCoverageReport();
    return;
  }

  if (options.conflicts) {
    detectConflicts();
    return;
  }

  if (options.diff) {
    if (!options.before || !options.after) {
      console.error('❌ --diff 模式需要指定 --before 和 --after 文件');
      process.exit(1);
    }
    diffOutputs(options.before, options.after);
    return;
  }

  if (options.case) {
    const result = verifyCase(options.case, options.module);
    
    if (options.output) {
      const outputDir = dirname(options.output);
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }
      writeFileSync(options.output, JSON.stringify(result, null, 2));
      console.log(`✅ 结果已保存到：${options.output}`);
    }
    return;
  }

  // 没有指定任何选项，显示帮助
  printHelp();
}

main();
