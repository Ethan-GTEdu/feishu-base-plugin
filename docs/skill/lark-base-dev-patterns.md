# 飞书 Base 插件开发规范与常用模式

> 通用 SKILL 包 — 适用于任何 AI 编程助手
> 源文档仓库：https://github.com/Lark-Base-Team/js-sdk-docs

---

## 项目技术栈

- SDK: `@lark-base-open/js-sdk`
- 框架: React + TypeScript
- 构建: Vite

---

## 编码规范

### 1. 获取字段时必须传入类型参数

```typescript
// ✅ 正确 - 有完整类型提示
const field = await table.getField<ISingleSelectField>(fieldId);
await field.addOption('Option1'); // 有类型提示

// ❌ 错误 - 缺少类型提示
const field = await table.getField(fieldId);
```

### 2. 使用分页 API 获取数据

```typescript
// ✅ 正确
const { records, hasMore, pageToken } = await table.getRecordsByPage({ pageSize: 200 });

// ❌ 废弃 - 不再维护
const records = await table.getRecords({ pageSize: 200 });
const recordIdList = await table.getRecordIdList();
```

### 3. 写入数据推荐通过 Cell

```typescript
// ✅ 推荐 - 类型安全
const cell = await textField.createCell('value');
await table.addRecord(cell);

// ⚠️ 不推荐 - 缺少类型安全
await table.addRecord({ fields: { [fieldId]: 'value' } });
```

### 4. 批量操作分批处理（上限 200 条）

```typescript
const BATCH_SIZE = 200;
for (let i = 0; i < allRecords.length; i += BATCH_SIZE) {
  await table.addRecords(allRecords.slice(i, i + BATCH_SIZE));
}
```

### 5. 事件监听在组件卸载时取消

```typescript
useEffect(() => {
  const off = bitable.base.onSelectionChange((event) => { /* ... */ });
  return () => off(); // 清理
}, []);
```

---

## 常用开发模式

### 初始化获取表信息

```typescript
import { bitable, FieldType, IFieldMeta } from '@lark-base-open/js-sdk';

const table = await bitable.base.getActiveTable();
const view = await table.getActiveView();
const fieldMetaList = await view.getFieldMetaList(); // 有序
```

### 监听选中变化

```typescript
useEffect(() => {
  const off = bitable.base.onSelectionChange((event) => {
    const { tableId, fieldId, recordId, viewId } = event.data;
    // 处理选中变化
  });
  return () => off();
}, []);
```

### 主题适配

```typescript
import { bitable, ThemeModeType } from '@lark-base-open/js-sdk';

const [theme, setTheme] = useState<ThemeModeType>();

useEffect(() => {
  bitable.bridge.getTheme().then(setTheme);
  const off = bitable.bridge.onThemeChange((e) => setTheme(e.data.theme));
  return () => off();
}, []);
```

### 国际化

```typescript
const lang = await bitable.bridge.getLanguage();
// 'zh' | 'zh-TW' | 'zh-HK' | 'en' | 'ja' | 'fr' | 'hi' | 'id' | 'it' | 'ko' | 'pt' | 'ru' | 'th' | 'vi' | 'de' | 'es'
```

### 插件数据持久化

```typescript
// 存储（同文档同插件共享）
await bitable.bridge.setData('config', { key: 'value' });

// 读取
const config = await bitable.bridge.getData<{ key: string }>('config');

// 监听变化
bitable.bridge.onDataChange((event) => {
  console.log('data changed', event.data);
});
```

### 遍历所有记录（处理分页）

```typescript
import { ITable, IRecord } from '@lark-base-open/js-sdk';

async function getAllRecords(table: ITable): Promise<IRecord[]> {
  const allRecords: IRecord[] = [];
  let pageToken: number | undefined;
  let hasMore = true;

  while (hasMore) {
    const res = await table.getRecordsByPage({ pageSize: 200, pageToken });
    allRecords.push(...res.records);
    hasMore = res.hasMore;
    pageToken = res.pageToken;
  }
  return allRecords;
}
```

### 带筛选的记录查询

```typescript
import { FilterConjunction, FilterOperator } from '@lark-base-open/js-sdk';

const res = await table.getRecordsByPage({
  filter: {
    conjunction: FilterConjunction.And,
    conditions: [
      { fieldId: 'fldXXX', operator: FilterOperator.Contains, value: '关键词' },
      { fieldId: 'fldYYY', operator: FilterOperator.IsNotEmpty, value: null }
    ]
  },
  sort: [{ fieldId: 'fldXXX', desc: false }],
  pageSize: 200
});
```

### 嵌套筛选条件（复杂场景）

```typescript
// 筛选：(A 包含 "12" AND B 包含 "12" OR "23")
const res = await table.getRecordsByPage({
  filter: {
    conjunction: FilterConjunction.And,
    conditions: [
      {
        conditions: [{ fieldId: A, operator: FilterOperator.Contains, value: '12' }],
        conjunction: FilterConjunction.And,
      },
      {
        conditions: [
          { fieldId: B, operator: FilterOperator.Contains, value: '12' },
          { fieldId: B, operator: FilterOperator.Contains, value: '23' }
        ],
        conjunction: FilterConjunction.Or,
      }
    ]
  }
});
```

### 视图筛选/排序配置

```typescript
const view = await table.getActiveView();

// 新增筛选
await view.addFilterCondition({
  fieldId: 'fldXXX',
  operator: FilterOperator.Contains,
  value: 'test'
});

// 新增排序
await view.addSort({ fieldId: 'fldXXX', desc: false });

// ⚠️ 必须调用 applySetting 才会保存并同步给其他用户
await view.applySetting();
```

### 权限检查

```typescript
import { PermissionEntity, OperationType } from '@lark-base-open/js-sdk';

// 检查字段编辑权限
const hasPermission = await bitable.base.getPermission({
  entity: PermissionEntity.Field,
  param: { tableId, fieldId },
  type: OperationType.Editable,
});

// ⚠️ 高级权限下 Table 实体的 editable 返回 false，需用 Record/Field 实体
```

---

## 关键注意事项

| 事项 | 说明 |
|------|------|
| 附件 URL 有效期 | 仅 10 分钟，不要缓存 |
| batchUploadFile | 禁止并发调用，需串行 |
| applySetting | View 筛选/排序/分组修改后必须调用 |
| getBaseUserId | 返回的 ID 与飞书开放平台 userId 不通用 |
| Table editable | 高级权限下返回 false，需用 Record/Field 实体检查 |
| 文件上传限制 | 文件名 ≤ 250 字符，文件大小 ≤ 2GB |
| 批量操作上限 | 单次 200 条，超过需分批 |
| 废弃 API | `getUserId` → `getBaseUserId`；`getRecordIdList` → `getRecordIdListByPage`；`getRecords` → `getRecordsByPage` |

---

## 源文档参考

完整 API 文档、更多字段类型示例、FAQ 等详见：
**https://github.com/Lark-Base-Team/js-sdk-docs**
