# Web3 投研订阅社交 DApp

基于 Sui Seal + Walrus 的专业投研内容订阅平台

## 项目简介

这是一个专业的 Web3 投研订阅社交 DApp，支持：

- 🔐 **访问控制**：基于 Sui Seal 的订阅访问控制
- 📁 **去中心化存储**：使用 Walrus 存储加密投研报告
- 💬 **Telegram 集成**：关联 Telegram 群组和用户身份
- 💰 **订阅机制**：灵活的订阅周期和价格设置
- 📊 **内容管理**：支持摘要免费、详情付费的内容模式

## 功能特性

### 群组管理
- 创建投研群组
- 设置群组介绍、订阅价格、订阅周期
- 设置人数上限
- 管理群组成员

### 报告发布
- 发布报告摘要（免费公开）
- 报告详情加密上传至 Walrus
- 只有订阅用户可以访问详情

### 订阅系统
- 付费订阅群组
- 基于时间的访问控制
- 自动过期管理

### 用户身份
- Sui 地址与 Telegram ID 关联
- 订阅状态查询
- 访问权限验证

## 项目结构

```
web3fans/
├── contracts/          # Move 智能合约
│   ├── sources/       
│   │   ├── group.move          # 群组管理
│   │   ├── subscription.move   # 订阅系统
│   │   └── report.move         # 报告管理
│   ├── tests/
│   └── Move.toml
├── frontend/          # React 前端应用
│   ├── src/
│   │   ├── components/        # UI 组件
│   │   ├── hooks/            # React Hooks
│   │   ├── services/         # API 服务
│   │   ├── utils/            # 工具函数
│   │   └── App.tsx
│   └── package.json
├── backend/           # Node.js 后端服务
│   ├── src/
│   │   ├── telegram/         # Telegram Bot
│   │   ├── walrus/          # Walrus 集成
│   │   └── index.ts
│   └── package.json
└── README.md
```

## 技术栈

### 智能合约
- **Sui Move**：智能合约开发
- **Seal**：访问控制模式

### 前端
- **React 18**：前端框架
- **TypeScript**：类型安全
- **@mysten/dapp-kit**：Sui 钱包集成
- **TailwindCSS**：UI 样式
- **Ant Design**：组件库

### 后端
- **Node.js**：后端服务
- **Express**：Web 框架
- **Telegraf**：Telegram Bot SDK
- **Walrus SDK**：去中心化存储

## 快速开始

### 1. 安装依赖

```bash
# 安装前端依赖
cd frontend
npm install

# 安装后端依赖
cd ../backend
npm install
```

### 2. 部署合约

```bash
cd contracts
sui move build
sui client publish --gas-budget 100000000
```

### 3. 配置环境变量

创建 `backend/.env` 文件：

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
WALRUS_API_URL=https://walrus-testnet.mystenlabs.com
SUI_NETWORK=testnet
PACKAGE_ID=your_deployed_package_id
```

创建 `frontend/.env` 文件：

```env
VITE_SUI_NETWORK=testnet
VITE_PACKAGE_ID=your_deployed_package_id
VITE_API_URL=http://localhost:3001
```

### 4. 启动服务

```bash
# 启动后端
cd backend
npm run dev

# 启动前端
cd frontend
npm run dev
```

## 使用流程

### 创建投研群组

1. 连接 Sui 钱包
2. 填写群组信息（名称、介绍、订阅价格、周期）
3. 创建 Telegram 群组并获取群组 ID
4. 关联 Sui 地址和 Telegram 群组
5. 创建群组成功

### 发布投研报告

1. 进入群组管理页面
2. 填写报告标题和摘要
3. 上传报告详情文档（自动加密上传至 Walrus）
4. 发布报告到 Telegram 群组

### 订阅群组

1. 浏览可用群组
2. 选择订阅周期
3. 支付订阅费用（SUI）
4. 关联 Telegram ID
5. 获得访问权限

### 查看报告

1. 在 Telegram 群组中查看报告摘要
2. 点击链接查看详情
3. 系统自动验证订阅状态
4. 订阅用户可解密查看完整报告

## 核心合约接口

### 创建群组

```move
public fun create_group(
    name: String,
    description: String,
    subscription_fee: u64,
    subscription_period: u64,
    max_members: u64,
    telegram_group_id: String,
    ctx: &mut TxContext
): Group
```

### 订阅群组

```move
public fun subscribe(
    group: &Group,
    payment: Coin<SUI>,
    telegram_id: String,
    clock: &Clock,
    ctx: &mut TxContext
): Subscription
```

### 发布报告

```move
public fun publish_report(
    group: &mut Group,
    title: String,
    summary: String,
    walrus_blob_id: String,
    seal_key_id: vector<u8>,
    ctx: &mut TxContext
): Report
```

### 验证访问权限

```move
entry fun seal_approve(
    key_id: vector<u8>,
    subscription: &Subscription,
    group: &Group,
    clock: &Clock,
    pkg_version: &PackageVersion
)
```

## 安全特性

- ✅ 基于 Sui Seal 的访问控制
- ✅ 报告内容加密存储
- ✅ 自动过期管理
- ✅ 防止重放攻击
- ✅ 订阅状态验证

## 许可证

MIT License

## 文档

- 📖 [用户使用指南](USER_GUIDE.md) - 详细的使用说明
- 🏗️ [系统架构文档](ARCHITECTURE.md) - 技术架构和设计
- 🚀 [部署指南](DEPLOYMENT.md) - 完整的部署流程
- 📡 [API 参考](API_REFERENCE.md) - 后端 API 文档
- 🔐 [Seal & Walrus 集成说明](SEAL_WALRUS_INTEGRATION.md) - 详细的集成实现

## 快速开始脚本

项目提供了便捷的部署脚本：

```bash
# 一键部署（交互式）
chmod +x scripts/deploy.sh
./scripts/deploy.sh

# 运行测试
chmod +x scripts/test.sh
./scripts/test.sh
```

## 项目特点

### ✅ 完整实现

- ✅ Move 智能合约（群组、订阅、访问控制）
- ✅ 前端 DApp（React + TypeScript）
- ✅ 后端服务（Node.js + Express）
- ✅ Walrus 集成（去中心化存储）
- ✅ Telegram 集成（社交平台）
- ✅ Seal 访问控制（订阅验证）

### 🔐 安全性

- 基于 Sui Move 的智能合约安全
- 内容端到端加密
- 订阅状态链上验证
- 自动过期管理

### 📱 用户体验

- 现代化 UI 设计
- 钱包无缝集成
- Telegram 即时通知
- 响应式布局

### 🚀 可扩展性

- 模块化架构
- 清晰的代码结构
- 完善的文档
- 易于二次开发

## 技术亮点

1. **Seal 访问控制模式**: 实现了基于订阅的内容访问控制
2. **Walrus 集成**: 利用去中心化存储保证内容永久性
3. **Telegram 集成**: 社交平台与 Web3 的无缝结合
4. **类型安全**: 全栈 TypeScript + Move 类型系统
5. **现代化前端**: React 18 + Vite + TailwindCSS

## 演示

### 创建群组

![创建群组](docs/images/create-group.png)

### 订阅管理

![订阅管理](docs/images/subscription.png)

### 报告发布

![报告发布](docs/images/publish-report.png)

## 贡献

欢迎贡献代码！请遵循以下步骤：

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 路线图

- [x] 核心功能实现
- [x] 基础文档完善
- [ ] 多语言支持
- [ ] 移动端适配
- [ ] 数据分析面板
- [ ] 推荐算法
- [ ] 社交功能增强
- [ ] 多链支持

## 社区

- 💬 [Discord](https://discord.gg/web3fans)
- 🐦 [Twitter](https://twitter.com/web3fans)
- 📧 Email: contact@web3fans.example

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 致谢

感谢以下项目和社区：

- [Sui Network](https://sui.io/) - 高性能区块链平台
- [Walrus](https://walrus.site/) - 去中心化存储解决方案
- [Telegram](https://telegram.org/) - 即时通讯平台
- Sui 社区的支持和贡献

## 联系方式

如有问题或建议：

- 📖 查看文档
- 🐛 提交 [Issue](https://github.com/your-repo/web3fans/issues)
- 💬 加入 [Discord 社区](https://discord.gg/web3fans)
- 📧 发送邮件至 support@web3fans.example

---

⭐ 如果这个项目对你有帮助，请给我们一个 Star！

**Happy Coding! 🚀**

