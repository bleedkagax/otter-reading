# 雅思阅读文章库设置指南

本文档介绍如何设置和管理雅思阅读文章库系统。

## 添加新文章

系统中的文章存储在数据库中。我们提供了5篇样例文章，可以通过以下步骤添加到系统中：

1. 确保已经安装了所有依赖：
   ```
   npm install
   ```

2. 运行添加文章的脚本（推荐使用这种方式）：
   ```
   npm run add-articles:programmatic
   ```

这将使用Prisma API向数据库添加5篇示例文章和相应的题目。

> 注意：我们也提供了基于SQL的添加方式 `npm run add-articles`，但由于SQL语法与特殊字符的兼容性问题，推荐使用上述的编程方式添加文章。

## 文章数据结构

每篇文章包含以下字段：
- `id`: 文章唯一标识符
- `title`: 文章标题
- `content`: 文章正文内容
- `difficulty`: 难度级别 ('easy', 'medium', 'hard')
- `topic`: 主题分类
- `wordCount`: 文章字数
- `source`: 文章来源（可选）

每个题目包含以下字段：
- `id`: 题目唯一标识符
- `passageId`: 关联的文章ID
- `type`: 题目类型 ('multiple-choice', 'true-false-ng', 'matching', 'fill-blank', 'short-answer')
- `questionText`: 题目文本
- `options`: 选项（JSON格式，适用于选择题）
- `correctAnswer`: 正确答案
- `explanation`: 解析说明
- `points`: 分值
- `orderIndex`: 题目在文章中的顺序

## 添加自定义文章

如需添加自定义文章，建议采用以下方法：

1. 复制 `prisma/add-articles-programmatic.js` 文件为新文件
2. 修改文件中的文章内容和问题
3. 确保为每篇文章和问题指定唯一ID
4. 执行脚本添加文章到数据库

## 访问文章库

启动应用后，可通过访问`/ielts/passages`路径查看文章库。所有文章将以列表形式直接展示，无需使用搜索功能。

## 注意事项

- 文章ID应该唯一，建议使用descriptive ID如'article6'等
- 题目ID也需要唯一，建议使用格式如'q1a6'（第6篇文章的第1个问题）
- 确保题目的`passageId`正确关联到相应的文章
- 处理包含引号或特殊字符的内容时，请注意正确的转义处理 