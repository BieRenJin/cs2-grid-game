# CS2 Grid Game Frontend

高性能的 CS2 主题网格消除游戏，具有完整的前后端分离架构和自动化测试体系。

## 🎮 功能特性

- **7x7 网格消除游戏** - CS2 武器主题符号
- **级联消除系统** - 支持连续消除和重力下落
- **特殊符号效果**:
  - Rush (⚡) - 将随机符号转换为 Wild
  - Surge (🌈) - 彩虹动画效果
  - Slash (⚔️) - 消除整行或整列
- **RTP 控制** - 精确调控至 97.33%
- **高性能后端** - 支持 150,000+ spins/秒

## 🏗️ 技术架构

### 前端

- **Next.js 15** - React 框架
- **TypeScript** - 类型安全
- **Tailwind CSS** - 样式系统
- **Framer Motion** - 动画效果
- **Zustand** - 状态管理

### 后端

- **Supabase Edge Functions** - Serverless 后端
- **Deno** - Edge Function 运行时
- **高性能 RNG** - Linear Congruential Generator
- **DFS 集群检测** - 优化的算法实现

## 🧪 测试体系

### 自动化测试

- **Playwright E2E 测试** - 前后端一致性验证
- **RTP 性能测试** - 百万次迭代验证
- **TypeScript 类型检查**
- **ESLint + Prettier** - 代码质量保证

### Git Hooks (自动执行)

- **pre-commit**:
  - Linting & 格式化
  - TypeScript 类型检查
  - Playwright 测试
  - RTP 快速测试 (10k)
- **pre-push**:
  - 完整构建
  - 全部测试套件
  - RTP 扩展测试 (100k)

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 本地开发

```bash
npm run dev
```

### 运行测试

```bash
# 运行所有测试
npm test

# UI 模式调试
npm run test:ui

# 运行 RTP 测试
node test-rtp-performance.js
```

### 构建项目

```bash
npm run build
```

## 📊 性能指标

- **RTP**: 97.33% (目标 96%)
- **处理速度**: 151,080 spins/秒
- **1M 测试时间**: 6.6 秒
- **胜率**: 37.71%
- **最小集群**: 5 个符号

## 🔧 配置文件

- `.husky/` - Git hooks 配置
- `.lintstagedrc.json` - 暂存文件 linting
- `.prettierrc` - 代码格式化配置
- `.eslintrc.json` - ESLint 规则
- `playwright.config.ts` - E2E 测试配置

## 📈 CI/CD

GitHub Actions 自动运行:

- TypeScript 类型检查
- ESLint & Prettier
- Playwright E2E 测试
- RTP 性能测试
- Next.js 构建

## 🎯 测试覆盖

1. **网格一致性** - 前后端网格状态同步
2. **集群检测** - 消除逻辑验证
3. **赢金计算** - 支付金额准确性
4. **级联动画** - 重力物理规则
5. **特殊符号** - 效果正确触发
6. **性能监控** - FPS 和响应时间

## 📝 提交规范

每次提交代码会自动执行:

1. 代码格式化 (Prettier)
2. 代码检查 (ESLint)
3. 类型检查 (TypeScript)
4. E2E 测试 (Playwright)
5. RTP 验证 (10k iterations)

测试失败将阻止提交，确保代码质量。

## 🚨 注意事项

- 提交前确保所有测试通过
- RTP 必须在 94-100% 范围内
- 保持 30+ FPS 动画性能
- 后端响应时间 < 500ms

## 📄 License

MIT
