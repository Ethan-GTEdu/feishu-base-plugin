/**
 * feishu-print 服务对接层
 * 负责与远程打印服务通信：提交打印链接列表，获取临时预览短链
 */

// 默认服务地址，可通过 configurePrintService 修改
let BASE_URL = "http://localhost:5174";

export function configurePrintService(url: string) {
  BASE_URL = url.replace(/\/$/, "");
}

export function getPrintServiceURL() {
  return BASE_URL;
}

export interface BatchPrintResponse {
  /** 临时短链，有效期 15 分钟，可直接在 iframe 中加载进行打印 */
  url: string;
  /** 过期时间戳 */
  expiresAt: number;
}

/** 单次请求上限 */
export const BATCH_LIMIT = 50;

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

  const endpoint = `${BASE_URL}/api/print-batch`;
  const body = { urls };
  console.log("[print-service] POST", endpoint);
  console.log("[print-service] body:", JSON.stringify(body, null, 2));

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  console.log("[print-service] response status:", res.status);

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("[print-service] error response:", errText);
    let errMsg = `批量打印请求失败: ${res.status}`;
    try {
      const errJson = JSON.parse(errText);
      if (errJson.error) errMsg = errJson.error;
    } catch { /* not json */ }
    throw new Error(errMsg);
  }

  const result = await res.json();
  console.log("[print-service] success:", result);
  return result;
}
