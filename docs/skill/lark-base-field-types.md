# 飞书 Base SDK 字段类型速查

> 通用 SKILL 包 — 适用于任何 AI 编程助手
> 源文档仓库：https://github.com/Lark-Base-Team/js-sdk-docs

---

## 字段类型与接口对照表

| FieldType | 枚举值 | 类型接口 | 值类型 | 特殊 API |
|-----------|--------|----------|--------|----------|
| Text | 1 | `ITextField` | `IOpenSegment[]` | 支持直接传字符串 |
| Number | 2 | `INumberField` | `number` | `setFormatter` |
| SingleSelect | 3 | `ISingleSelectField` | `IOpenSingleSelect` | `addOption/setOption/getOptions/deleteOption` |
| MultiSelect | 4 | `IMultiSelectField` | `IOpenMultiSelect` | `addOption/setOption/getOptions/deleteOption` |
| DateTime | 5 | `IDateTimeField` | `number`(timestamp) | `setDateFormat` |
| Checkbox | 7 | `ICheckboxField` | `boolean` | - |
| User | 11 | `IUserField` | `IOpenUser[]` | - |
| Phone | 13 | `IPhoneField` | `string` | - |
| Url | 15 | `IUrlField` | `IOpenUrlSegment` | - |
| Attachment | 17 | `IAttachmentField` | `IOpenAttachment[]` | `getAttachmentUrls`, setValue 支持 File/FileList |
| SingleLink | 18 | `ISingleLinkField` | `IOpenLink` | - |
| Lookup | 19 | `ILookupField` | 取决于引用字段 | `getSourceTableId/getSourceFieldId` |
| Formula | 20 | `IFormulaField` | 取决于公式结果 | `setFormula`（0.3.6+） |
| DuplexLink | 21 | `IDuplexLinkField` | `IOpenLink` | - |
| Location | 22 | `ILocationField` | `IOpenLocation` | - |
| GroupChat | 23 | `IGroupChatField` | `IOpenGroupChat[]` | - |
| CreatedTime | 1001 | `ICreatedTimeField` | `number` | 只读 |
| ModifiedTime | 1002 | `IModifiedTimeField` | `number` | 只读 |
| CreatedUser | 1003 | `ICreatedUserField` | `IOpenUser[]` | 只读 |
| ModifiedUser | 1004 | `IModifiedUserField` | `IOpenUser[]` | 只读 |
| AutoNumber | 1005 | `IAutoNumberField` | `string` | 只读 |
| Barcode | 99001 | `IBarcodeField` | `string` | - |
| Progress | 99002 | `IProgressField` | `number` (0-1) | - |
| Currency | 99003 | `ICurrencyField` | `number` | `getCurrencyCode/setCurrencyCode` |
| Rating | 99004 | `IRatingField` | `number` | `setMin/setMax` |
| Email | 99005 | `IEmailField` | `string` | - |

---

## 常用值类型定义

```typescript
// 文本段落
type IOpenSegment = IOpenTextSegment | IOpenUrlSegment | IOpenUserMentionSegment | IOpenDocumentMentionSegment;

interface IOpenTextSegment {
  type: IOpenSegmentType.Text;
  text: string;
}

interface IOpenUrlSegment {
  type: IOpenSegmentType.Url;
  text: string;
  link: string;
}

interface IOpenUserMentionSegment {
  mentionType: 'User';
  text: string;
  token: string;
  name: string;
  enName?: string;
  id: string;
}

interface IOpenDocumentMentionSegment {
  mentionType: 'Doc' | 'Sheet' | 'Bitable' | string;
  link: string;
  text: string;
  token: string;
}

// 附件
interface IOpenAttachment {
  name: string;
  size: number;
  type: string; // mime type
  token: string;
  timeStamp: number;
  permission?: { tableId: string; recordId: string; fieldId: string; };
}

type AttachmentTransformVal = File | File[] | FileList | IOpenAttachment | IOpenAttachment[];

// 用户
interface IOpenUser {
  id: string;
  name?: string;
  enName?: string;
  email?: string;
}

// 单选/多选选项
interface ISelectOption {
  id: string;
  name: string;
  color: number; // 0-54
}

// 关联记录
interface IOpenLink {
  recordIds: string[];
  tableId: string;
  text: string;
}

// 地理位置
interface IOpenLocation {
  location: string;
  pname: string;
  cityname: string;
  adname: string;
  address: string;
  name: string;
  full_address: string;
}

// 货币代码
enum CurrencyCode {
  CNY = 'CNY', USD = 'USD', EUR = 'EUR', AED = 'AED',
  BRL = 'BRL', CAD = 'CAD', CHF = 'CHF', HKD = 'HKD',
  INR = 'INR', JPY = 'JPY', MXN = 'MXN',
  // ... 更多见 SDK 导出
}
```

---

## 创建字段示例

```typescript
import { bitable, FieldType, ISingleSelectField, ICurrencyField, CurrencyCode } from '@lark-base-open/js-sdk';

const table = await bitable.base.getActiveTable();

// 新增单选字段并添加选项
const fieldId = await table.addField({ type: FieldType.SingleSelect, name: '状态' });
const selectField = await table.getField<ISingleSelectField>(fieldId);
await selectField.addOption('进行中');
await selectField.addOption('已完成');

// 新增货币字段
const currFieldId = await table.addField({ type: FieldType.Currency, name: '金额' });
const currField = await table.getField<ICurrencyField>(currFieldId);
await currField.setCurrencyCode(CurrencyCode.CNY);

// 附件字段 - 直接传 File 对象
const attField = await table.getField<IAttachmentField>(attFieldId);
const file = new File(['content'], 'test.txt', { type: 'text/plain' });
const cell = await attField.createCell(file);
await table.addRecord(cell);
```

---

## 字段元信息结构

```typescript
interface IFieldMeta {
  id: string;
  type: FieldType;
  name: string;
  isPrimary: boolean; // 是否索引字段
  description: {
    content?: string;
    disableSyncToFormDesc?: boolean;
  };
  property?: IFieldProperty; // 字段特有属性
}
```

---

## 源文档参考

各字段类型的完整 API 详见：
- https://github.com/Lark-Base-Team/js-sdk-docs → `zh/api/field/{type}.md`
- 可用字段类型文件：`text`, `number`, `singleSelect`, `multipleSelect`, `date`, `checkbox`, `user`, `phone`, `url`, `attachment`, `singleLink`, `duplexLink`, `lookup`, `formula`, `location`, `createTime`, `modifiedTime`, `createUser`, `modifiedUser`, `autonumber`, `barcode`, `progress`, `currency`, `rating`, `email`
