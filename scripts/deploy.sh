#!/bin/bash

# Web3 投研订阅平台部署脚本

set -e

echo "🚀 开始部署 Web3 投研订阅平台..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查必要的工具
check_requirements() {
    echo "📋 检查依赖..."
    
    if ! command -v sui &> /dev/null; then
        echo -e "${RED}❌ Sui CLI 未安装${NC}"
        echo "请访问 https://docs.sui.io/build/install 安装"
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js 未安装${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ 所有依赖已满足${NC}"
}

# 部署智能合约
deploy_contract() {
    echo ""
    echo "📦 部署智能合约..."
    
    cd contracts
    
    # 构建合约
    echo "构建合约..."
    sui move build
    
    # 运行测试
    echo "运行测试..."
    sui move test
    
    # 部署合约
    echo "部署到测试网..."
    DEPLOY_OUTPUT=$(sui client publish --gas-budget 100000000 --json)
    
    # 提取 Package ID
    PACKAGE_ID=$(echo $DEPLOY_OUTPUT | jq -r '.objectChanges[] | select(.type=="published") | .packageId')
    
    echo -e "${GREEN}✅ 合约部署成功！${NC}"
    echo "Package ID: $PACKAGE_ID"
    
    # 保存到环境变量文件
    echo "VITE_PACKAGE_ID=$PACKAGE_ID" > ../frontend/.env.local
    echo "PACKAGE_ID=$PACKAGE_ID" > ../backend/.env.local
    
    cd ..
}

# 设置后端
setup_backend() {
    echo ""
    echo "⚙️ 设置后端服务..."
    
    cd backend
    
    # 安装依赖
    echo "安装依赖..."
    npm install
    
    # 检查环境变量
    if [ ! -f .env ]; then
        echo -e "${YELLOW}⚠️ 未找到 .env 文件，请配置环境变量${NC}"
        echo "复制 .env.example 到 .env 并填写配置"
    fi
    
    # 构建
    echo "构建后端..."
    npm run build
    
    echo -e "${GREEN}✅ 后端设置完成${NC}"
    
    cd ..
}

# 设置前端
setup_frontend() {
    echo ""
    echo "🎨 设置前端应用..."
    
    cd frontend
    
    # 安装依赖
    echo "安装依赖..."
    npm install
    
    # 构建
    echo "构建前端..."
    npm run build
    
    echo -e "${GREEN}✅ 前端设置完成${NC}"
    
    cd ..
}

# 启动服务
start_services() {
    echo ""
    echo "🚀 启动服务..."
    
    # 启动后端
    echo "启动后端服务..."
    cd backend
    npm start &
    BACKEND_PID=$!
    cd ..
    
    sleep 3
    
    # 检查后端是否启动成功
    if curl -s http://localhost:3001/health > /dev/null; then
        echo -e "${GREEN}✅ 后端服务启动成功 (PID: $BACKEND_PID)${NC}"
    else
        echo -e "${RED}❌ 后端服务启动失败${NC}"
        kill $BACKEND_PID
        exit 1
    fi
    
    # 启动前端
    echo "启动前端应用..."
    cd frontend
    npm run preview &
    FRONTEND_PID=$!
    cd ..
    
    echo -e "${GREEN}✅ 所有服务已启动${NC}"
    echo ""
    echo "📝 服务信息："
    echo "  - 后端: http://localhost:3001 (PID: $BACKEND_PID)"
    echo "  - 前端: http://localhost:3000 (PID: $FRONTEND_PID)"
    echo ""
    echo "按 Ctrl+C 停止服务"
    
    # 等待中断
    trap "kill $BACKEND_PID $FRONTEND_PID" INT
    wait
}

# 显示部署信息
show_info() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${GREEN}🎉 部署完成！${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📦 Package ID: $PACKAGE_ID"
    echo ""
    echo "🔗 访问地址："
    echo "  - 前端应用: http://localhost:3000"
    echo "  - 后端API: http://localhost:3001"
    echo ""
    echo "📚 接下来的步骤："
    echo "  1. 配置 Telegram Bot (backend/.env)"
    echo "  2. 连接 Sui 钱包并创建群组"
    echo "  3. 在 Telegram 中关联账户"
    echo "  4. 开始发布和订阅内容"
    echo ""
    echo "📖 更多信息请查看 DEPLOYMENT.md"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# 主流程
main() {
    check_requirements
    
    # 询问是否部署合约
    read -p "是否部署智能合约? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        deploy_contract
    else
        echo "跳过合约部署"
    fi
    
    # 询问是否设置后端
    read -p "是否设置后端服务? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        setup_backend
    else
        echo "跳过后端设置"
    fi
    
    # 询问是否设置前端
    read -p "是否设置前端应用? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        setup_frontend
    else
        echo "跳过前端设置"
    fi
    
    show_info
    
    # 询问是否启动服务
    read -p "是否立即启动服务? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        start_services
    else
        echo "可以稍后手动启动服务"
    fi
}

# 运行主流程
main

