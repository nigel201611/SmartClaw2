#!/bin/bash

# SmartClaw v2.0 Build Script
# 构建生产-ready DMG 安装包

set -e

echo "🎩 SmartClaw v2.0 Build Script"
echo "================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查环境变量
check_env() {
    echo -e "${YELLOW}Checking environment variables...${NC}"
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS 特定检查
        if [ -z "$APPLE_TEAM_ID" ]; then
            echo -e "${RED}Warning: APPLE_TEAM_ID not set. Notarization will be skipped.${NC}"
        fi
        if [ -z "$APPLE_ID" ] || [ -z "$APPLE_APP_SPECIFIC_PASSWORD" ]; then
            echo -e "${RED}Warning: Apple credentials not set. Notarization will be skipped.${NC}"
        fi
    fi
    
    # 检查 Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}Error: Node.js is required but not installed.${NC}"
        exit 1
    fi
    
    # 检查 Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${YELLOW}Warning: Docker not found. App will require Docker to be installed separately.${NC}"
    fi
    
    echo -e "${GREEN}✓ Environment check complete${NC}"
}

# 安装依赖
install_deps() {
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm ci
    echo -e "${GREEN}✓ Dependencies installed${NC}"
}

# 构建主进程
build_main() {
    echo -e "${YELLOW}Building main process...${NC}"
    npm run build:main
    echo -e "${GREEN}✓ Main process built${NC}"
}

# 构建渲染进程
build_renderer() {
    echo -e "${YELLOW}Building renderer process...${NC}"
    npm run build:renderer
    echo -e "${GREEN}✓ Renderer process built${NC}"
}

# 准备构建资源
prepare_resources() {
    echo -e "${YELLOW}Preparing build resources...${NC}"
    
    # 创建构建目录
    mkdir -p build/icons
    
    # 复制 Docker 配置到资源目录
    mkdir -p build/resources
    cp docker-compose.yml build/resources/
    cp -r config build/resources/
    cp .env.example build/resources/
    
    # 复制 README
    cp README.md build/README.md || echo "README.md not found, skipping..."
    
    echo -e "${GREEN}✓ Resources prepared${NC}"
}

# 代码签名（macOS）
sign_macos() {
    if [[ "$OSTYPE" != "darwin"* ]]; then
        echo -e "${YELLOW}Skipping macOS signing (not on macOS)${NC}"
        return
    fi
    
    echo -e "${YELLOW}Code signing for macOS...${NC}"
    
    # 检查 Developer ID
    if ! security find-identity -v -p codesigning | grep -q "Developer ID Application"; then
        echo -e "${RED}Warning: Developer ID Application certificate not found.${NC}"
        echo -e "${YELLOW}App will be signed with ad-hoc identity (not suitable for distribution).${NC}"
    fi
    
    echo -e "${GREEN}✓ macOS signing configured${NC}"
}

# 公证（macOS）
notarize_macos() {
    if [[ "$OSTYPE" != "darwin"* ]]; then
        echo -e "${YELLOW}Skipping macOS notarization (not on macOS)${NC}"
        return
    fi
    
    if [ -z "$APPLE_TEAM_ID" ]; then
        echo -e "${YELLOW}Skipping notarization (APPLE_TEAM_ID not set)${NC}"
        return
    fi
    
    echo -e "${YELLOW}Notarization will be performed during electron-builder run${NC}"
    echo -e "${GREEN}✓ macOS notarization configured${NC}"
}

# 构建应用
build_app() {
    echo -e "${YELLOW}Building application...${NC}"
    
    # 根据平台选择构建目标
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo -e "${YELLOW}Building for macOS...${NC}"
        npm run dist:mac
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
        echo -e "${YELLOW}Building for Windows...${NC}"
        npm run dist:win
    else
        echo -e "${YELLOW}Building for Linux...${NC}"
        npm run dist:linux
    fi
    
    echo -e "${GREEN}✓ Application built${NC}"
}

# 验证构建
verify_build() {
    echo -e "${YELLOW}Verifying build...${NC}"
    
    # 检查输出文件
    if [[ "$OSTYPE" == "darwin"* ]]; then
        if [ -f "release/SmartClaw-2.0.0-mac.dmg" ]; then
            echo -e "${GREEN}✓ DMG file created: release/SmartClaw-2.0.0-mac.dmg${NC}"
        else
            echo -e "${RED}Error: DMG file not found${NC}"
            exit 1
        fi
        
        # 验证签名（如果已签名）
        if codesign -dv --verbose=4 "release/SmartClaw-2.0.0-mac.dmg" 2>/dev/null; then
            echo -e "${GREEN}✓ Code signature verified${NC}"
        else
            echo -e "${YELLOW}Warning: App not signed or signature verification failed${NC}"
        fi
    else
        echo -e "${YELLOW}Build verification skipped (platform-specific)${NC}"
    fi
}

# 清理
cleanup() {
    echo -e "${YELLOW}Cleaning up...${NC}"
    rm -rf dist
    echo -e "${GREEN}✓ Cleanup complete${NC}"
}

# 显示构建统计
show_stats() {
    echo ""
    echo "================================"
    echo -e "${GREEN}🎉 Build Complete!${NC}"
    echo "================================"
    echo ""
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "Output files:"
        ls -lh release/*.dmg 2>/dev/null || echo "  No DMG files found"
        echo ""
    fi
    
    echo "Build statistics:"
    echo "  - Main process: dist/main/"
    echo "  - Renderer: dist/renderer/"
    echo "  - Resources: build/resources/"
    echo ""
}

# 主流程
main() {
    echo ""
    
    # 解析命令行参数
    SKIP_DEPS=false
    SKIP_BUILD=false
    CLEAN=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-deps)
                SKIP_DEPS=true
                shift
                ;;
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            --clean)
                CLEAN=true
                shift
                ;;
            *)
                echo -e "${RED}Unknown option: $1${NC}"
                exit 1
                ;;
        esac
    done
    
    # 清理（如果请求）
    if [ "$CLEAN" = true ]; then
        cleanup
    fi
    
    # 检查环境
    check_env
    
    # 安装依赖（除非跳过）
    if [ "$SKIP_DEPS" = false ]; then
        install_deps
    fi
    
    # 准备资源
    prepare_resources
    
    # 代码签名配置
    sign_macos
    
    # 公证配置
    notarize_macos
    
    # 构建（除非跳过）
    if [ "$SKIP_BUILD" = false ]; then
        build_main
        build_renderer
        build_app
    fi
    
    # 验证
    verify_build
    
    # 显示统计
    show_stats
    
    echo ""
    echo -e "${GREEN}✓ Build script completed successfully!${NC}"
    echo ""
}

# 执行主流程
main "$@"
