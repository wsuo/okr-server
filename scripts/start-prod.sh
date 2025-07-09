#!/bin/bash

# OKR服务器生产环境启动脚本
# 自动检测并清理3000端口占用，然后启动生产服务器

echo "🚀 OKR服务器启动脚本 (生产环境)"
echo "================================="

# 检查3000端口是否被占用
PORT=3000
PID=$(lsof -ti:$PORT)

if [ ! -z "$PID" ]; then
    echo "⚠️  检测到端口 $PORT 已被占用 (PID: $PID)"
    
    # 显示占用进程的详细信息
    echo "📋 占用进程信息:"
    ps -p $PID -o pid,ppid,command
    
    echo ""
    echo "🔄 正在终止占用端口的进程..."
    
    # 尝试优雅关闭
    kill $PID 2>/dev/null
    
    # 等待2秒
    sleep 2
    
    # 检查进程是否仍在运行
    if kill -0 $PID 2>/dev/null; then
        echo "⚡ 优雅关闭失败，强制终止进程..."
        kill -9 $PID 2>/dev/null
        sleep 1
    fi
    
    # 再次检查端口
    NEW_PID=$(lsof -ti:$PORT)
    if [ ! -z "$NEW_PID" ]; then
        echo "❌ 无法释放端口 $PORT，请手动检查"
        exit 1
    else
        echo "✅ 端口 $PORT 已成功释放"
    fi
else
    echo "✅ 端口 $PORT 可用"
fi

echo ""
echo "🔧 检查构建状态..."
if [ ! -d "dist" ]; then
    echo "📦 未找到dist目录，正在构建..."
    npm run build
    if [ $? -ne 0 ]; then
        echo "❌ 构建失败"
        exit 1
    fi
    echo "✅ 构建完成"
else
    echo "✅ 构建文件已存在"
fi

echo ""
echo "🌐 启动生产服务器..."
echo "===================="

# 启动生产服务器
npm run start:prod