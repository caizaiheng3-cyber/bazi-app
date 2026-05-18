/**
 * @deprecated 本文件为旧版前端 TS 引擎，已废弃。
 * 主计算引擎已切换到 Python 后端 API（web/backend/app/api/engine.py）。
 * 当前仅作为 fallback 保留，请勿新增逻辑。
 */
// LLM 客户端：封装 DeepSeek API 调用
//
// 用途：为引擎提供"自然语言润色"能力。所有调用都必须有兜底——LLM 失败不能阻塞排盘。
//
// 命理学价值：
//   引擎能算出 commandFactors 的结构化数据（mainTheme = "以X为骨，以Y为情..."），
//   但模板化句式对所有命主都说同一句话。LLM 可基于结构化数据生成"千人千面"的
//   开篇判词，让引擎从"自动初稿"升级到"有温度的主稿"。
//
// 设计原则：
//   - 失败兜底：LLM 调用失败 → 返回 null，调用方使用模板版本
//   - 超时保护：默认 30s 超时，避免阻塞排盘
//   - 不在 prompt 里编故事：只让 LLM 重组结构化输入，禁止它"自由发挥"添加命理论断

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEFAULT_MODEL = 'deepseek-chat';
const DEFAULT_TIMEOUT_MS = 30_000;

/** 从环境变量读 API key（也支持调用方传入） */
function resolveApiKey(explicit?: string): string | null {
  if (explicit) return explicit;
  const fromEnv = process.env.DEEPSEEK_API_KEY;
  if (fromEnv) return fromEnv;
  return null;
}

export interface LlmCallOptions {
  /** 显式传入 API key，否则读 process.env.DEEPSEEK_API_KEY */
  apiKey?: string;
  /** 模型名，默认 deepseek-chat */
  model?: string;
  /** 超时毫秒数，默认 30000 */
  timeoutMs?: number;
  /** temperature，默认 0.7 */
  temperature?: number;
  /** 最大 token，默认 500 */
  maxTokens?: number;
  /** 响应格式：默认普通文本；'json_object' 强制返回合法 JSON */
  responseFormat?: 'text' | 'json_object';
}

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * 调用 DeepSeek Chat Completions
 *
 * @returns 成功 → 返回字符串内容；失败 → 返回 null（不抛异常，让上层使用兜底）
 */
export async function callDeepSeek(
  messages: readonly LlmMessage[],
  options: LlmCallOptions = {},
): Promise<string | null> {
  const apiKey = resolveApiKey(options.apiKey);
  if (!apiKey) {
    return null;
  }

  const model = options.model ?? DEFAULT_MODEL;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const temperature = options.temperature ?? 0.7;
  const maxTokens = options.maxTokens ?? 500;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: false,
        // OpenAI 兼容协议：强制返回合法 JSON（DeepSeek 支持）
        ...(options.responseFormat === 'json_object' ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      // 静默失败：不打印 key 等敏感信息
      console.warn(`[llmClient] DeepSeek API HTTP ${response.status}`);
      return null;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      console.warn('[llmClient] DeepSeek API 返回内容为空');
      return null;
    }
    return content.trim();
  } catch (error) {
    // 超时 / 网络异常 / JSON 解析失败 → 全部静默
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`[llmClient] DeepSeek API 调用失败：${msg}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 检查 LLM 是否可用（环境变量是否配置 key）
 */
export function isLlmAvailable(explicitKey?: string): boolean {
  return resolveApiKey(explicitKey) !== null;
}