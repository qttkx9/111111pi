@echo off
chcp 65001 >nul 2>&1
title Pi Web - 首次构建

echo ========================================
echo   Pi Web - 首次构建
echo ========================================
echo.

cd /d "%~dp0"

:: 1. 检查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js
    echo 请先安装 Node.js: https://nodejs.org
    pause
    exit /b 1
)
echo [OK] Node.js 版本:
node -v

:: 2. 检查项目
if not exist "%~dp0package.json" (
    echo [错误] 未找到 package.json
    echo 请确认在项目根目录运行
    pause
    exit /b 1
)
echo [OK] 项目目录正确
echo.

:: 3. 安装依赖
echo [步骤 1/3] 正在安装依赖 (npm install)...
echo 这可能需要 1-3 分钟，请耐心等待
echo.
call npm install
if %errorlevel% neq 0 (
    echo [错误] npm install 失败
    pause
    exit /b 1
)
echo [OK] 依赖安装完成
echo.

:: 4. 安装 pi
echo [步骤 2/3] 正在安装 pi-coding-agent...
call npm install -g @earendil-works/pi-coding-agent
if %errorlevel% neq 0 (
    echo [警告] pi-coding-agent 全局安装失败（可忽略，项目自带）
) else (
    echo [OK] pi-coding-agent 安装完成
)
echo.

:: 5. 构建项目
echo [步骤 3/3] 正在构建项目...
echo 这可能需要 1-2 分钟
echo.
call npm run build
if %errorlevel% neq 0 (
    echo [错误] 构建失败
    pause
    exit /b 1
)
echo [OK] 构建完成
echo.

echo ========================================
echo   首次构建完成！
echo ========================================
echo.
echo 下次使用直接双击 启动.bat 即可
echo.
pause
