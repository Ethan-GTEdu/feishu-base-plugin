# 插件侧对接指南

feishu-print 批量打印接口已就绪，本文档供飞书多维表格插件开发者对接使用。

---

## 服务地址

| 环境 | 地址 |
|------|------|
| 本地开发 | `http://localhost:3000` |
| 生产环境 | 部署后的实际域名 |

---

## 对接流程

```
用户选中多条记录
    ↓
插件提取每条记录的"打印链接"字段值
    ↓
POST /api/print-batch  →  获得临时短链
    ↓
iframe 加载短链  →  用户打印 / 导出 PDF
```

---

## 接口详情

### POST /api/print-batch

**请求：**

```http
POST /api/print-batch
Content-Type: application/json

{
  "urls": [
    "http://print.example.com/print?slug=dse513&姓名=小红&手机号=13800000001&见面日期=2025-01-15",
    "http://print.example.com/print?slug=dse513&姓名=小明&手机号=13900000002&见面日期=2025-01-16"
  ]
}
```

**参数说明：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| urls | string[] | 是 | 打印链接数组，每条包含 `slug` 和数据参数 |

**限制：** 单次最多 50 条 URL。

**成功响应 (200)：**

```json
{
  "url": "http://print.example.com/batch/a3f8k2",
  "expiresAt": 1700001800000
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| url | string | 临时短链，可直接在 iframe 中加载 |
| expiresAt | number | 过期时间戳（毫秒），生成后 15 分钟过期 |

**错误响应：**

| 状态码 | 场景 | 示例 |
|--------|------|------|
| 400 | urls 为空、格式错误、超过 50 条上限、缺少 slug | `{"error": "urls 数量超过上限 (50)"}` |
| 404 | URL 中的 slug 对应模板不存在 | `{"error": "模板不存在: abc123"}` |
| 500 | 服务端渲染异常 | `{"error": "渲染失败"}` |

---

## 插件侧参考实现

```typescript
const PRINT_SERVICE_URL = 'http://localhost:3000'; // 按环境替换

interface PrintBatchResponse {
  url: string;
  expiresAt: number;
}

/**
 * 批量打印：将选中记录的打印链接发送到 feishu-print，获取合并后的短链
 */
async function printBatch(urls: string[]): Promise<PrintBatchResponse> {
  const res = await fetch(`${PRINT_SERVICE_URL}/api/print-batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || `请求失败: ${res.status}`);
  }

  return res.json();
}

/**
 * 使用示例：选中记录后调用
 */
async function handlePrint(selectedRecords: Array<{ printUrl: string }>) {
  const urls = selectedRecords.map(r => r.printUrl).filter(Boolean);

  if (urls.length === 0) {
    alert('没有可打印的记录');
    return;
  }

  if (urls.length > 50) {
    alert('单次最多打印 50 条记录');
    return;
  }

  try {
    const { url } = await printBatch(urls);
    // 方式一：新窗口打开
    window.open(url, '_blank');
    // 方式二：iframe 加载（适合插件内嵌场景）
    // iframe.src = url;
  } catch (e) {
    alert(`打印失败: ${e.message}`);
  }
}
```

---

## 打印链接格式

每条记录的"打印链接"字段值格式：

```
{服务地址}/print?slug={模板ID}&{字段1}={值1}&{字段2}={值2}&...
```

示例：
```
http://print.example.com/print?slug=dse513&姓名=小红&手机号=13800000001&见面日期=2025-01-15
```

**注意事项：**
- `slug` 参数必填，对应 feishu-print 中的模板 ID
- 其余参数为模板中的变量，会被渲染到模板中
- 中文字段名和值需要正确 URL 编码（浏览器通常自动处理）

---

## CORS

服务端已配置 `Access-Control-Allow-Origin: *`，插件可直接跨域调用，无需额外处理。

---

## 注意事项

1. 短链 15 分钟后过期（返回 410 Gone），如需重新打印请重新调用接口
2. 单次请求上限 50 条，超出需分批调用
3. 返回的 HTML 已包含分页样式（`page-break-after`），直接打印即可正确分页
4. 建议在 iframe 加载完成后自动触发 `window.print()` 提升体验
