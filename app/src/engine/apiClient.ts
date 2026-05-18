/**
 * 后端 API 客户端
 *
 * 封装对 web/backend 的 HTTP 调用。所有排盘 + 规则分析由 Python 引擎完成，
 * 本模块仅做 HTTP 包装，不含任何命理逻辑。
 */

/** 后端地址：开发时默认 localhost:8000，可通过环境变量覆盖 */
const API_BASE_URL =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE_URL
  || 'http://localhost:8000';

/** 排盘请求参数 */
export interface PaipanRequest {
  name: string;
  gender: '男' | '女';
  birth_date: string; // YYYY-MM-DD
  birth_time: string; // HH:MM
  birth_city: string;
}

/** 排盘 + 规则分析的原始返回（Python 引擎的中文 key JSON） */
export interface EngineResponse {
  paipan: Record<string, unknown>;
  rules: Record<string, unknown>;
}

/**
 * 调用后端排盘 + 规则分析 API
 *
 * @throws Error 网络错误或引擎计算失败时抛出
 */
export async function fetchPaipan(request: PaipanRequest): Promise<EngineResponse> {
  const response = await fetch(`${API_BASE_URL}/api/engine/paipan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`引擎 API 调用失败 (${response.status}): ${errorBody}`);
  }

  return response.json() as Promise<EngineResponse>;
}
