# IELTS Routes 重构方案

## 现状分析

当前项目使用Remix的flat routes结构，所有雅思相关路由以`ielts.`为前缀，通过点号表示路由嵌套关系：

```
app/routes/
├── ielts.tsx                            # 雅思模块布局组件
├── ielts.dashboard.tsx                  # 雅思仪表盘
├── ielts.import.tsx                     # 导入功能
├── ielts.passages.tsx                   # 文章列表
├── ielts.passages.$passageId.read.tsx   # 文章阅读页面
├── ielts.passages.$passageId.practice.tsx # 文章练习页面
├── ielts.practice.tsx                   # 练习中心
├── ielts.stats.tsx                      # 学习统计
└── ielts.vocabulary.tsx                 # 词汇管理
```

这种结构虽然在文件系统中是扁平的，但随着项目复杂度增加，会导致：
1. 文件命名冗长
2. 不直观，难以理解路由嵌套关系
3. 文件过多时难以维护

## 重构目标

1. 采用文件夹嵌套结构，使路由层次更加清晰
2. 将相关功能组织在一起，提高可维护性
3. 支持路由模块的更好隔离和测试
4. 遵循Remix的最新最佳实践

## 重构方案

采用Remix的folder-based路由结构，使用`+`后缀表示路由分组：

```
app/routes/
└── ielts+/                            # IELTS模块根目录
    ├── _layout.tsx                    # 雅思模块共享布局 (替代原 ielts.tsx)
    ├── index.tsx                      # 雅思首页 (重定向到dashboard)
    ├── dashboard.tsx                  # 仪表盘页面
    ├── import.tsx                     # 导入功能
    ├── stats.tsx                      # 学习统计
    ├── vocabulary.tsx                 # 词汇管理
    ├── practice.tsx                   # 练习中心
    ├── passages+/                     # 文章相关功能
    │   ├── _layout.tsx                # 文章功能共享布局
    │   ├── index.tsx                  # 文章列表 (替代原 ielts.passages.tsx)
    │   └── $passageId+/               # 特定文章操作
    │       ├── _layout.tsx            # 特定文章共享布局
    │       ├── index.tsx              # 文章详情
    │       ├── read.tsx               # 阅读模式
    │       └── practice.tsx           # 练习模式
    └── _shared/                       # 共享组件和工具
        ├── PassageCard.tsx            # 文章卡片组件
        ├── QuestionTypes/             # 题型相关组件
        │   ├── MultipleChoice.tsx
        │   ├── TrueFalseNG.tsx
        │   └── ...
        └── utils.ts                   # 工具函数
```

## 命名约定

1. `_layout.tsx` - 布局文件，对应原来的包含Outlet的父路由
2. `index.tsx` - 目录默认页面
3. `$passageId` - 动态路由参数
4. `_shared/` - 非路由文件，只用于组织代码，不会生成路由
5. `+` - 路由分组标记，指示这是一个路由文件夹

## 迁移步骤

1. 创建新的目录结构
2. 将现有路由文件内容迁移到新结构中
3. 更新内部链接和引用
4. 测试所有路由功能
5. 删除旧文件

## 文件对应关系

| 原文件                               | 新文件                                      |
|-------------------------------------|---------------------------------------------|
| ielts.tsx                           | ielts+/_layout.tsx                          |
| ielts.dashboard.tsx                 | ielts+/dashboard.tsx                        |
| ielts.import.tsx                    | ielts+/import.tsx                           |
| ielts.stats.tsx                     | ielts+/stats.tsx                            |
| ielts.vocabulary.tsx                | ielts+/vocabulary.tsx                       |
| ielts.practice.tsx                  | ielts+/practice.tsx                         |
| ielts.passages.tsx                  | ielts+/passages+/index.tsx                  |
| ielts.passages.$passageId.read.tsx  | ielts+/passages+/$passageId+/read.tsx       |
| ielts.passages.$passageId.practice.tsx | ielts+/passages+/$passageId+/practice.tsx  |

## 路由URL对应关系

重构后，路由URL保持不变：

- `/ielts` → 指向ielts+/_layout.tsx，显示index.tsx (重定向到dashboard)
- `/ielts/dashboard` → 指向ielts+/dashboard.tsx
- `/ielts/passages` → 指向ielts+/passages+/index.tsx
- `/ielts/passages/:passageId/read` → 指向ielts+/passages+/$passageId+/read.tsx

## 执行计划

1. 逐步迁移，优先从叶子路由开始
2. 每迁移一组路由后进行测试
3. 确保所有功能和链接正常工作
4. 完成所有迁移后，进行全面回归测试

## 注意事项

1. 更新所有内部链接，包括导航菜单
2. 确保动态参数传递正确
3. 注意共享布局组件的嵌套关系
4. 确保loader和action函数的路径引用正确更新 