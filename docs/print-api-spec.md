# feishu-print 对接规范

飞书多维表格插件（feishu-base-plugin）与 feishu-print 服务的接口对接文档。

---

## 流程概述

```
1. 多维表格中每条记录有一个"打印链接"字段，值为 feishu-print 的完整 URL
   例: http://print.example.com/print?slug=dse513&姓名=小红&手机号=138xxx

2. 用户在表格中选中多条记录

3. 插件提取每条记录的打印链接，组成 URL 列表

4. 插件 POST URL 列表到 feishu-print

5. feishu-print 逐条解析 URL 参数 → 渲染模板 → 拼接多页 HTML → 返回临时短链

6. 插件用 iframe 加载短链，用户可打印/另存为 PDF
```

---

## 新增接口

### POST /api/print-batch

接收多条打印链接，服务端解析每条 URL 的参数并渲染对应模板，拼接为多页文档，生成临时短链返回。

#### Request

```
POST /api/print-batch
Content-Type: application/json
```

**Body:**
```json
{
  "urls": [
    "http://print.example.com/print?slug=dse513&姓名=小红&手机号=13800000001&见面日期=2025-01-15",
    "http://print.example.com/print?slug=dse513&姓名=小明&手机号=13900000002&见面日期=2025-01-16"
  ]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| urls | string[] | 是 | feishu-print 打印链接数组，每条链接包含 slug 和数据参数 |

#### Response

**成功 (200):**
```json
{
  "url": "http://print.example.com/batch/a3f8k2",
  "expiresAt": 1700001800000
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| url | string | 临时短链，可直接在浏览器/iframe 中访问 |
| expiresAt | number | 过期时间戳（毫秒），生成后 15 分钟过期 |

**失败:**

| 状态码 | 场景 |
|--------|------|
| 400 | urls 为空或格式错误 |
| 404 | 某条 URL 中的 slug 不存在 |
| 500 | 渲染失败 |

```json
{
  "error": "错误描述"
}
```

---

## 实现建议

### 服务端处理逻辑

```javascript
// 伪代码
async function handlePrintBatch(urls) {
  const pages = [];

  for (const url of urls) {
    // 1. 解析 URL 参数
    const parsed = new URL(url);
    const slug = parsed.searchParams.get('slug');
    const data = Object.fromEntries(parsed.searchParams.entries());
    delete data.slug;

    // 2. 读取模板
    const template = readTemplate(slug);

    // 3. 渲染
    const html = renderTemplate(template.html, data);
    pages.push(html);
  }

  // 4. 拼接多页 HTML
  const merged = buildMultiPageHtml(pages);

  // 5. 存储并生成短链（15分钟过期）
  const id = generateShortId();
  cache.set(id, merged, { ttl: 15 * 60 * 1000 });

  return { url: `${BASE}/batch/${id}`, expiresAt: Date.now() + 15 * 60 * 1000 };
}
```

### 多页 HTML 拼接

```javascript
function buildMultiPageHtml(pages) {
  // 从第一个页面提取 <style>（假设同一模板样式相同）
  const styleMatch = pages[0].match(/<style>([\s\S]*?)<\/style>/);
  const styles = styleMatch ? styleMatch[1] : '';

  // 提取每页的 body 内容
  const bodies = pages.map(page => {
    const bodyMatch = page.match(/<body>([\s\S]*?)<\/body>/);
    return bodyMatch ? bodyMatch[1] : page;
  });

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <style>
    ${styles}
    .page-wrapper { page-break-after: always; }
    .page-wrapper:last-child { page-break-after: auto; }
  </style>
</head>
<body>
  ${bodies.map(b => `<div class="page-wrapper">${b}</div>`).join('\n')}
</body>
</html>`;
}
```

### 短链服务

```javascript
// 内存缓存，15分钟自动清理
const batchCache = new Map(); // id → { html, expiresAt }

// 定时清理过期条目
setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of batchCache) {
    if (entry.expiresAt <= now) batchCache.delete(id);
  }
}, 60 * 1000);

// GET /batch/:id — 返回渲染好的 HTML 页面
function handleBatchGet(id) {
  const entry = batchCache.get(id);
  if (!entry || entry.expiresAt <= Date.now()) {
    return { status: 410, body: '链接已过期' };
  }
  return { status: 200, contentType: 'text/html', body: entry.html };
}
```

---

## CORS 配置

插件运行在飞书 iframe 中，需要 feishu-print 服务允许跨域：

```javascript
// server.cjs 中添加
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

if (req.method === 'OPTIONS') {
  res.writeHead(204);
  res.end();
  return;
}
```

---

## 插件侧配置

`src/lib/print-service.ts` 中配置服务地址：

```typescript
import { configurePrintService } from './lib/print-service';
configurePrintService('https://your-print-service.com');
```

默认值为 `http://localhost:3000`。

---

## 注意事项

- 短链有效期 15 分钟，过期后内存自动释放
- URL 中的参数值需要正确 URL 编码（中文字段名/值）
- 如果 urls 中包含不同 slug 的模板，服务端需要分别读取对应模板渲染
- 建议对 urls 数量做上限限制（如最多 200 条），避免单次请求过大
