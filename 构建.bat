@echo off
title Pi Web 首次构建

cd /d "%~dp0"

echo [1/3] 检测环境...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo 请先安装 Node.js: https://nodejs.org
    pause
    exit /b 1
)
node -v

if not exist "%~dp0package.json" (
    echo 请在项目根目录运行
    pause
    exit /b 1
)

echo [2/3] 安装依赖...
call npm install
if %errorlevel% neq 0 (
    echo 安装失败
    pause
    exit /b 1
)

echo [3/3] 构建项目...
call npm run build
if %errorlevel% neq 0 (
    echo 构建失败
    pause
    exit /b 1
)

echo.
echo 完成! 下次请双击 启动.bat
pause
