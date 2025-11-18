#!/bin/bash

# 测试脚本

set -e

echo "🧪 运行测试..."

# 测试智能合约
echo ""
echo "📦 测试智能合约..."
cd contracts
sui move test
cd ..

echo ""
echo -e "\033[0;32m✅ 所有测试通过！\033[0m"

