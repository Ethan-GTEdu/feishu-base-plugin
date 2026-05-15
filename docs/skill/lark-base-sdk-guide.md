# 飞书多维表格 Base JS SDK 开发指南

> 通用 SKILL 包 — 适用于任何 AI 编程助手（Cursor / Copilot / Kiro / Claude 等）
> 源文档仓库：https://github.com/Lark-Base-Team/js-sdk-docs

本项目是飞书多维表格（Lark Base）前端插件，使用 `@lark-base-open/js-sdk` 进行开发。

---

## SDK 架构概览

统一入口：`import { bitable } from '@lark-base-open/js-sdk'`

模块层级关系：
```
bitable
├── base          → 多维表格实例入口（管理 Table 增删改查、文件上传、权限）
├── ui            → 用户交互（切换表/视图、Toast、选择记录对话框）
└── bridge        → 通用能力（用户ID、主题、语言、环境、插件数据存储）

base.getActiveTable() → table
├── table.getField()  → field（推荐从字段角度操作数据）
├── table.getRecordsByPage() → records
├── table.getViewById() → view（UI展示层，有序数据）
└── field.createCell() / field.getCell() → cell
```

---

## 核心设计原则

1. **推荐从 Field 角度操作数据**：获取字段时传入类型参数获得完整类型提示
   ```typescript
   const field = await table.getField<IAttachmentField>(fieldId);
   ```

2. **Table 层数据无序**：字段/记录顺序由 View 决定
   - 有序字段列表：`view.getVisibleFieldIdList()`
   - 有序记录列表：`view.getVisibleRecordIdListByPage()`

3. **批量操作上限 200 条**：使用分页 API（`getRecordsByPage`）

4. **Cell 两种状态**：
   - 新创建未插入 → 不影响 Table 数据，用作 `addRecord` 参数
   - 已插入 Table → `getValue/setValue` 与 Table 实时联动

---

## FieldType 枚举

```typescript
enum FieldType {
  Text = 1, Number = 2, SingleSelect = 3, MultiSelect = 4,
  DateTime = 5, Checkbox = 7, User = 11, Phone = 13,
  Url = 15, Attachment = 17, SingleLink = 18, Lookup = 19,
  Formula = 20, DuplexLink = 21, Location = 22, GroupChat = 23,
  CreatedTime = 1001, ModifiedTime = 1002, CreatedUser = 1003,
  ModifiedUser = 1004, AutoNumber = 1005,
  Barcode = 99001, Progress = 99002, Currency = 99003,
  Rating = 99004, Email = 99005
}
```

---

## 常用 API 速查

### Base 模块
| API | 说明 |
|-----|------|
| `base.getActiveTable()` | 获取当前选中数据表 |
| `base.getTable(idOrName)` | 按 id 或名称获取数据表 |
| `base.getTableList()` | 获取所有数据表 |
| `base.getSelection()` | 获取当前选中信息（tableId/viewId/fieldId/recordId） |
| `base.addTable({name})` | 新增数据表 |
| `base.getPermission(params)` | 权限检查 |
| `base.batchUploadFile(files)` | 批量上传文件（禁止并发调用） |
| `base.onSelectionChange(cb)` | 监听选中变化 |
| `base.onTableAdd(cb)` | 监听数据表新增 |
| `base.onTableDelete(cb)` | 监听数据表删除 |

### Table 模块
| API | 说明 |
|-----|------|
| `table.getField<T>(idOrName)` | 获取字段（推荐传类型参数） |
| `table.getFieldMetaList()` | 获取所有字段元信息（无序） |
| `table.getFieldListByType<T>(type)` | 按类型获取字段列表 |
| `table.addField({type, name?})` | 新增字段 |
| `table.setField(fieldId, config)` | 修改字段 |
| `table.deleteField(fieldOrId)` | 删除字段 |
| `table.getRecordsByPage({pageSize?, pageToken?, filter?, sort?, viewId?, stringValue?})` | 分页获取记录（推荐） |
| `table.getRecordIdListByPage(params)` | 分页获取记录 ID 列表 |
| `table.getRecordById(recordId)` | 获取单条记录 |
| `table.addRecord(cell \| cells)` | 新增单条记录 |
| `table.addRecords(records)` | 批量新增（上限200） |
| `table.setRecord(recordId, value)` | 修改单条记录 |
| `table.setRecords(records)` | 批量修改（上限200） |
| `table.deleteRecord(recordId)` | 删除单条记录 |
| `table.deleteRecords(ids)` | 批量删除（上限200） |
| `table.setCellValue(fieldId, recordId, value)` | 修改单元格值 |
| `table.getCellString(fieldId, recordId)` | 获取单元格字符串值 |
| `table.getCellAttachmentUrls(tokens, fieldId, recordId)` | 获取附件 URL（有效期10分钟） |
| `table.getActiveView()` | 获取当前视图 |
| `table.getViewById(viewId)` | 按 ID 获取视图 |
| `table.addView({type, name?})` | 新增视图 |

### Field 模块（通用基础能力）
| API | 说明 |
|-----|------|
| `field.id` | 字段 ID |
| `field.tableId` | 所属数据表 ID |
| `field.getName()` | 获取字段名 |
| `field.getType()` | 获取字段类型 |
| `field.getMeta()` | 获取字段元信息 |
| `field.getValue(recordOrId)` | 获取指定记录的字段值 |
| `field.setValue(recordOrId, val)` | 设置指定记录的字段值 |
| `field.createCell(val)` | 创建 Cell（用于 addRecord） |
| `field.getCell(recordOrId)` | 获取已存在的 Cell |

### View 模块（GridView 为例）
| API | 说明 |
|-----|------|
| `view.getVisibleFieldIdList()` | 有序字段 ID 列表 |
| `view.getVisibleRecordIdListByPage(params)` | 有序记录 ID 列表（分页） |
| `view.getSelectedRecordIdList()` | 当前选中记录 |
| `view.getFieldMetaList()` | 有序字段元信息 |
| `view.getFilterInfo()` | 获取筛选信息 |
| `view.addFilterCondition(param)` | 新增筛选 |
| `view.getSortInfo()` | 获取排序信息 |
| `view.addSort(param)` | 新增排序 |
| `view.getGroupInfo()` | 获取分组信息 |
| `view.addGroup(param)` | 新增分组 |
| `view.applySetting()` | 提交视图配置（筛选/排序/分组修改后必须调用） |
| `view.showField(fieldId)` | 显示字段 |
| `view.hideField(fieldId)` | 隐藏字段 |
| `view.setFieldWidth(fieldId, width)` | 设置字段宽度 |

### UI 模块
| API | 说明 |
|-----|------|
| `ui.switchToTable(tableId)` | 切换数据表 |
| `ui.switchToView(tableId, viewId)` | 切换视图 |
| `ui.selectRecordIdList(tableId, viewId)` | 弹出选择记录对话框 |
| `ui.showToast({toastType, message})` | 全局消息提示 |
| `ui.showRecordDetailDialog({tableId, recordId, fieldIdList?})` | 记录详情弹窗 |
| `ui.getSelectOptionColorInfoList()` | 获取 55 种选项颜色信息 |

### Bridge 模块
| API | 说明 |
|-----|------|
| `bridge.getData(key)` / `bridge.setData(key, val)` | 插件数据存储（同文档同插件共享） |
| `bridge.onDataChange(cb)` | 监听存储变化 |
| `bridge.getTheme()` / `bridge.onThemeChange(cb)` | 主题（LIGHT/DARK） |
| `bridge.getLanguage()` | 当前语言（zh/en/ja...） |
| `bridge.getLocale()` | 地区设置（zh-CN/en-US...） |
| `bridge.getEnv()` | 环境信息（lark/feishu） |
| `bridge.getInstanceId()` | 插件实例唯一 ID |
| `bridge.getBaseUserId()` | 用户 ID（不同于开放平台 userId） |
| `bridge.getTenantKey()` | 租户 ID |
| `bridge.getBitableUrl(options)` | 生成多维表格链接 |
| `bridge.navigateToExtension(id)` | 跳转其他插件 |

---

## 注意事项

- `bridge.getUserId()` 已废弃，使用 `bridge.getBaseUserId()`
- `table.getRecordIdList()` / `table.getRecords()` / `table.getRecordList()` 已废弃，使用分页版本
- `field.getFieldValueList()` 已废弃，使用 `table.getRecordsByPage()`
- 附件 URL 有效期仅 10 分钟，不要缓存
- 高级权限下检查 Table 的 editable 返回 false，需改用 Record/Field/View 实体
- View 的筛选/排序/分组修改后需调用 `applySetting()` 才会保存
- `batchUploadFile` 禁止并发调用，需串行
- 文件上传限制：文件名 ≤ 250 字符，文件大小 ≤ 2GB
- `bridge.getBaseUserId()` 返回的 ID 与飞书开放平台 userId 不通用

---

## 源文档仓库

如果以上信息不全，或需要查阅最新/更详细的 API 文档（如某个字段类型的完整方法列表、复杂筛选条件嵌套写法等），请参考官方源文档仓库：

**https://github.com/Lark-Base-Team/js-sdk-docs**

关键文档路径：
- API 总览：`zh/api/guide.md`
- Base 模块：`zh/api/base.md`
- Table 模块：`zh/api/table.md`
- Field 基础：`zh/api/field/base.md`
- 各字段类型：`zh/api/field/{type}.md`（如 `text.md`, `attachment.md`, `singleSelect.md`）
- View 模块：`zh/api/view.md` 及 `zh/api/view/grid.md`
- Bridge 模块：`zh/api/bridge.md`
- UI 模块：`zh/api/ui.md`
- Cell 模块：`zh/api/cell.md`
- Record 模块：`zh/api/record.md`
