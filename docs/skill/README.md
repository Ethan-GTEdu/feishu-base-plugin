# Lark Base SDK SKILL 包

通用 AI 编程助手知识包，适用于 Cursor / Copilot / Kiro / Claude / ChatGPT 等任何支持上下文注入的工具。

## 文件说明

| 文件 | 内容 | 建议使用场景 |
|------|------|-------------|
| `lark-base-sdk-guide.md` | SDK 架构、所有模块 API 速查表、核心原则 | 每次会话必读（作为系统上下文） |
| `lark-base-field-types.md` | 25+ 字段类型接口对照、值类型定义 | 涉及字段操作时加载 |
| `lark-base-dev-patterns.md` | 编码规范、常用开发模式、注意事项 | 编写/修改源码时加载 |

## 使用方式

### Cursor
将文件添加到 `.cursorrules` 或项目 docs 中，Cursor 会自动索引。

### Kiro
在 `.kiro/steering/` 下创建 steering 文件引用：
```markdown
---
inclusion: auto
---
参考 docs/skill/ 目录下的 SKILL 文件进行飞书 Base 插件开发。
```

### GitHub Copilot
将文件放在 `.github/copilot-instructions.md` 中引用，或在 chat 中 `@workspace` 引用。

### Claude / ChatGPT
直接将文件内容粘贴到系统提示词或对话开头。

### 其他工具
任何支持自定义上下文/知识库的 AI 工具均可直接导入这三个 Markdown 文件。

## 信息不全时

如果 SKILL 包中的信息不够详细，请参考官方源文档仓库：
**https://github.com/Lark-Base-Team/js-sdk-docs**

## 特点

- ✅ 自包含，不依赖任何本地外部文件
- ✅ 纯 Markdown，任何工具可读
- ✅ 覆盖 SDK 全部模块的核心 API
- ✅ 包含类型定义、代码示例、注意事项
- ✅ 标注废弃 API 和推荐替代方案
