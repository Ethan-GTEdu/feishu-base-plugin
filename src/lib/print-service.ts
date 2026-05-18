/**
 * feishu-print 服务对接层
 * 负责与远程打印服务通信：提交打印链接列表，获取临时预览短链
 *
 * 服务地址从打印链接中自动解析（取 origin 部分）。
 * 即打印链接 http://x.x.x.x:5173/print?slug=... 会解析出 http://x.x.x.x:5173 作为 API 基地址。
 */

export interface BatchPrintResponse {
  /** 临时短链，有效期 15 分钟，可直接在 iframe 中加载进行打印 */
  url: string;
  /** 过期时间戳 */
  expiresAt: number;
}

/** 单次请求上限 */
export const BATCH_LIMIT = 50;

/**
 * 从打印链接中解析服务端基地址
 *
 * 飞书插件限制：iframe 中只能请求 localhost 或 HTTPS 地址。
 * - 如果打印链接是 HTTPS 或 localhost，直接使用其 origin
 * - 否则回退到 localhost + 同端口（适用于本地端口转发场景）
 */
function resolveBaseUrl(urls: string[]): string {
  const first = urls[0];
  if (!first) {
    throw new Error("打印链接为空");
  }

  const match = first.match(/^(https?:\/\/[^/?#]+)/);
  if (!match) {
    throw new Error(`无法解析打印链接地址: ${first.slice(0, 80)}...`);
  }

  const origin = match[1];

  // HTTPS 链接或 localhost 可以直接用
  if (
    origin.startsWith("https://") ||
    /https?:\/\/(localhost|127\.0\.0\.1)/.test(origin)
  ) {
    return origin;
  }

  // HTTP + 远程 IP：回退到 localhost 同端口（需本地做端口转发）
  const portMatch = origin.match(/:(\d+)$/);
  const port = portMatch ? portMatch[1] : "5173";
  return `http://localhost:${port}`;
}

/**
 * 提交批量打印请求
 * @param urls - 每条记录对应的 feishu-print 打印链接（含完整参数），上限 50 条
 * @returns 临时短链（15分钟有效）
 */
export async function requestBatchPrint(
  urls: string[],
): Promise<BatchPrintResponse> {
  if (urls.length === 0) {
    throw new Error("没有可打印的链接");
  }
  if (urls.length > BATCH_LIMIT) {
    throw new Error(`单次最多打印 ${BATCH_LIMIT} 条记录`);
  }

  const baseUrl = resolveBaseUrl(urls);
  const endpoint = `${baseUrl}/api/print-batch`;
  const body = { urls };
  console.log("[print-service] POST", endpoint);
  console.log("[print-service] body:", JSON.stringify(body, null, 2));

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.error("[print-service] fetch failed:", e);
    throw new Error(
      `无法连接打印服务 (${endpoint})，请确认服务已启动且地址可访问(${e})`,
    );
  }

  console.log("[print-service] response status:", res.status);

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("[print-service] error response:", errText);
    let errMsg = `批量打印请求失败: ${errText}`;
    try {
      const errJson = JSON.parse(errText);
      if (errJson.error) errMsg = errJson.error;
    } catch {
      /* not json */
    }
    throw new Error(errMsg);
  }

  const result = await res.json();
  console.log("[print-service] success:", result);
  return result;
}
