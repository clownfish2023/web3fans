# Web3 Research Subscription & Social DApp

A Professional Research Content Subscription Platform based on Sui Seal + Walrus

## Introduction

This is a professional Web3 research subscription and social DApp that supports:

- 🔐 **Access Control**: Subscription-based access control powered by Sui Seal
- 📁 **Decentralized Storage**: Encrypted research reports stored on Walrus
- 💬 **Telegram Integration**: Linking Telegram groups with user identities
- 💰 **Subscription Mechanism**: Flexible subscription periods and pricing
- 📊 **Content Management**: Free summary + paid full content model

## Features

### Group Management
- Create research groups
- Set group introduction, subscription price, and period
- Set member limits
- Manage group members

### Report Publishing
- Group owners can publish research reports
- Publish report summaries (free & public)
- Encrypted report details uploaded to Walrus
- Only subscribers can access full details
- Supports multiple formats (PDF, DOC, DOCX, TXT, MD)
- Automatic permission verification (GroupAdminCap)

### Subscription System
- Paid group subscriptions
- Time-based access control
- Automatic expiration management

### User Identity
- Link Sui address with Telegram ID
- Subscription status query
- Access permission verification

## Project Structure

```
web3fans/
├── contracts/          # Move Smart Contracts
│   ├── sources/       
│   │   ├── group.move          # Group Management
│   │   ├── subscription.move   # Subscription System
│   │   └── report.move         # Report Management
│   ├── tests/
│   └── Move.toml
├── frontend/          # React Frontend App
│   ├── src/
│   │   ├── components/        # UI Components
│   │   ├── hooks/            # React Hooks
│   │   ├── services/         # API Services
│   │   ├── utils/            # Utility Functions
│   │   └── App.tsx
│   └── package.json
├── backend/           # Node.js Backend Service
│   ├── src/
│   │   ├── telegram/         # Telegram Bot
│   │   ├── walrus/          # Walrus Integration
│   │   └── index.ts
│   └── package.json
└── README.md
```

## Tech Stack

### Smart Contracts
- **Sui Move**: Smart contract development
- **Seal**: Access control pattern

### Frontend
- **React 18**: Frontend framework
- **TypeScript**: Type safety
- **@mysten/dapp-kit**: Sui wallet integration
- **TailwindCSS**: UI styling
- **Ant Design**: Component library

### Backend
- **Node.js**: Backend service
- **Express**: Web framework
- **Telegraf**: Telegram Bot SDK
- **Walrus SDK**: Decentralized storage

## 🎉 Contract Deployed!

✅ **Package ID**: `0x5a44c1c0846bfb666b4db5289f4f51683373668737a768bf8a16c87a867f0ae5` (V2 - Supports Invite Links)

### 📖 Quick Start Guide

**[👉 Click here for QUICK_START.md](QUICK_START.md)** - Detailed startup steps

### Brief Steps

1. **Configure Telegram Bot** (Get token and update `backend/.env.local`)
2. **Install Dependencies**: `npm install` (in both backend and frontend directories)
3. **Start Services**: 
   - Backend: `cd backend && npm run dev`
   - Frontend: `cd frontend && npm run dev`
4. **Access**: http://localhost:3000

For detailed information, see [DEPLOYMENT_INFO_V2.md](DEPLOYMENT_INFO_V2.md) (V1 Info: [DEPLOYMENT_INFO.md](DEPLOYMENT_INFO.md))

## User Flow

### Create Research Group

1. Connect Sui Wallet
2. Fill in group info (name, description, price, period)
3. Create Telegram group and get Group ID
4. Link Sui address and Telegram group
5. Group creation successful

### Publish Research Report

1. Go to Group Management page
2. Fill in report title and summary
3. Upload report detail document (automatically encrypted and uploaded to Walrus)
4. Publish report to Telegram group

### Subscribe to Group

1. Browse available groups
2. Select subscription period
3. Pay subscription fee (SUI)
4. Link Telegram ID
5. Gain access permission

### View Report

1. View report summary in Telegram group
2. Click link to view details
3. System automatically verifies subscription status
4. Subscribers can decrypt and view full report

## Core Contract Interfaces

### Create Group

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

### Subscribe

```move
public fun subscribe(
    group: &Group,
    payment: Coin<SUI>,
    telegram_id: String,
    clock: &Clock,
    ctx: &mut TxContext
): Subscription
```

### Publish Report

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

### Verify Access

```move
entry fun seal_approve(
    key_id: vector<u8>,
    subscription: &Subscription,
    group: &Group,
    clock: &Clock,
    pkg_version: &PackageVersion
)
```

## License

MIT License

## Quick Start Scripts

Convenient deployment scripts are provided:

```bash
# One-click deployment (Interactive)
chmod +x scripts/deploy.sh
./scripts/deploy.sh

# Run tests
chmod +x scripts/test.sh
./scripts/test.sh
```

## Project Highlights

### ✅ Complete Implementation

- ✅ Move Smart Contracts (Group, Subscription, Access Control)
- ✅ Frontend DApp (React + TypeScript)
- ✅ Backend Service (Node.js + Express)
- ✅ Walrus Integration (Decentralized Storage)
- ✅ Telegram Integration (Social Platform)
- ✅ Seal Access Control (Subscription Verification)

### 🔐 Security

- Sui Move-based Smart Contract Security
- End-to-End Content Encryption
- On-chain Subscription Verification
- Automatic Expiration Management

### 📱 User Experience

- Modern UI Design
- Seamless Wallet Integration
- Instant Telegram Notifications
- Responsive Layout

### 🚀 Scalability

- Modular Architecture
- Clear Code Structure
- Comprehensive Documentation
- Easy to Extend

## Technical Highlights

1. **Seal Access Control**: Subscription-based content access control
2. **Walrus Integration**: Permanent content storage using decentralized storage
3. **Telegram Integration**: Seamless integration of social platform and Web3

## Demo

### Create Group

![Create Group](docs/images/create-group.png)

### Subscription Management

![Subscription Management](docs/images/subscription.png)

### Publish Report

![Publish Report](docs/images/publish-report.png)

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request


## License

MIT License - See [LICENSE](LICENSE) file for details

## Acknowledgments

Thanks to the following projects and communities:

- [Sui Network](https://sui.io/) - High-performance blockchain platform
- [Walrus](https://walrus.site/) - Decentralized storage solution
- [Telegram](https://telegram.org/) - Instant messaging platform
- Sui Community for support and contributions

## Contact



