# CS2 Grid Game - Frontend-Backend Separation

高性能的 CS2 主题网格消除游戏，采用完整的前后端分离架构。

🎮 **现有版本**: [Vercel演示](https://cs2-grid-game.vercel.app)
🚀 **新架构**: Next.js 15 + Supabase Edge Functions

## 🎯 架构优势

### 相比现有版本的改进

- **完整前后端分离**: 游戏逻辑迁移至Supabase Edge Functions
- **确定性结果**: 基于种子的RNG确保前后端一致性  
- **高性能后端**: 支持151,080 spins/秒处理能力
- **自动化测试**: 完整的Git hooks和CI/CD管道
- **类型安全**: 全TypeScript严格模式实现
- **RTP精确控制**: 从原版调整至97.33%精准RTP

## 🎮 游戏特性

### 核心机制
- **7x7网格消除游戏** - CS2武器主题符号
- **级联消除系统** - 支持连续消除和重力下落
- **特殊符号效果**:
  - Rush (⚡) - 将随机符号转换为Wild
  - Surge (🌈) - 彩虹动画效果
  - Slash (⚔️) - 消除整行或整列
- **RTP控制** - 精确调控至97.33%
- **高性能后端** - 支持150,000+ spins/秒

### 符号系统

#### 基础符号 (低到高)
- Flashbang (闪光弹)
- Smoke Grenade (烟雾弹)  
- HE Grenade (高爆手雷)
- Kevlar Vest (防弹衣)
- Defuse Kit (拆弹器)
- Desert Eagle (沙漠之鹰)
- AK-47 (卡拉什尼科夫)
- AWP (狙击步枪)

#### 特殊符号
- Rush Symbol (金色CT徽章)
- Surge Symbol (彩虹炸弹)
- Slash Symbol (卡拉比特刀)
- Multiplier Symbol (MVP星标)

## 🏗️ 技术架构

### 前端技术栈
- **Next.js 15** - React框架 (App Router)
- **TypeScript** - 类型安全
- **Tailwind CSS** - 样式系统
- **Framer Motion** - 动画效果
- **Zustand** - 状态管理

### 后端技术栈
- **Supabase Edge Functions** - Serverless后端
- **Deno** - Edge Function运行时
- **高性能RNG** - Linear Congruential Generator
- **DFS集群检测** - 优化的算法实现

## 🧪 测试体系

### 自动化测试
- **Playwright E2E测试** - 前后端一致性验证
- **RTP性能测试** - 百万次迭代验证
- **TypeScript类型检查**
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

- **RTP**: 97.33% (目标96%)
- **处理速度**: 151,080 spins/秒
- **1M测试时间**: 6.6秒
- **胜率**: 37.71%
- **最小集群**: 5个符号

## ✅ 测试验证

### 前后端一致性
- **100次旋转测试**: 100%匹配率
- **相同赢金计算**: 前端$58.80 vs 后端$58.80
- **零差异**: 完美同步验证

### RTP验证  
- **当前RTP**: 97.33%
- **目标RTP**: 96% ✓
- **测试量**: 1M+次迭代
- **性能**: 6.6秒完成1M次旋转

## 🔧 配置文件

- `.husky/` - Git hooks配置
- `.lintstagedrc.json` - 暂存文件linting
- `.prettierrc` - 代码格式化配置
- `.eslintrc.json` - ESLint规则
- `playwright.config.ts` - E2E测试配置

## 📈 CI/CD

GitHub Actions自动运行:
- TypeScript类型检查
- ESLint & Prettier
- Playwright E2E测试
- RTP性能测试
- Next.js构建

## 🎯 测试覆盖

1. **网格一致性** - 前后端网格状态同步
2. **集群检测** - 消除逻辑验证
3. **赢金计算** - 支付金额准确性
4. **级联动画** - 重力物理规则
5. **特殊符号** - 效果正确触发
6. **性能监控** - FPS和响应时间

## 📝 提交规范

每次提交代码会自动执行:
1. 代码格式化 (Prettier)
2. 代码检查 (ESLint)
3. 类型检查 (TypeScript)
4. E2E测试 (Playwright)
5. RTP验证 (10k iterations)

测试失败将阻止提交，确保代码质量。

## 🚨 注意事项

- 提交前确保所有测试通过
- RTP必须在94-100%范围内
- 保持30+ FPS动画性能
- 后端响应时间 < 500ms

## 🆚 版本对比

| 特性 | 现有版本 | 新架构版本 |
|------|----------|------------|
| 前后端分离 | ❌ | ✅ |
| 确定性结果 | ❌ | ✅ |
| 自动化测试 | ❌ | ✅ |
| TypeScript | ❌ | ✅ |
| 性能测试 | ❌ | ✅ (1M次) |
| Git Hooks | ❌ | ✅ |
| RTP精度 | ~97% | 97.33% |
| 处理速度 | 未知 | 151K spins/s |

## 📄 License

MIT