@echo off
chcp 65001 >nul 2>&1
title Pi Web

set PORT=30141
set HOST=localhost
set AUTO_OPEN=true

cd /d "%~dp0"

:: 读取配置
if exist "%~dp0pi-web-config.bat" (
    call "%~dp0pi-web-config.bat"
    if defined CFG_PORT set PORT=%CFG_PORT%
    if defined CFG_HOST set HOST=%CFG_HOST%
)

:: 解析参数
:parse_args
if "%~1"=="" goto :end_parse
if /i "%~1"=="--port" set PORT=%~2& shift& shift& goto :parse_args
if /i "%~1"=="-p" set PORT=%~2& shift& shift& goto :parse_args
if /i "%~1"=="--host" set HOST=%~2& shift& shift& goto :parse_args
if /i "%~1"=="-H" set HOST=%~2& shift& shift& goto :parse_args
if /i "%~1"=="--no-browser" set AUTO_OPEN=false& shift& goto :parse_args
if /i "%~1"=="status" goto :show_status
if /i "%~1"=="stop" goto :stop_server
if /i "%~1"=="--help" goto :show_help
if /i "%~1"=="-h" goto :show_help
shift& goto :parse_args
:end_parse

:: 1. 检测项目
if not exist "package.json" (
    echo [错误] 未找到 package.json
    pause
    exit /b 1
)

:: 2. 检测依赖
if not exist "node_modules\next\dist\bin\next" (
    echo [错误] 请先运行: npm install
    pause
    exit /b 1
)

:: 3. 检测构建
if not exist ".next\BUILD_ID" (
    echo [提示] 正在构建...请稍等
    call npx next build
    if errorlevel 1 (
        echo [错误] 构建失败
        pause
        exit /b 1
    )
)

:: 4. 检测端口
netstat -ano | findstr ":%PORT% " >nul 2>&1
if %errorlevel% equ 0 (
    start http://%HOST%:%PORT%
    exit /b 0
)

:: 5. 启动
start "Pi-Web" "node_modules\.bin\next.cmd" start -p %PORT%

:: 6. 等待启动
echo 正在启动...
:wait_loop
timeout /t 2 /nobreak >nul
curl -s http://%HOST%:%PORT% >nul 2>&1
if errorlevel 1 goto :wait_loop
start http://%HOST%:%PORT%
echo 已启动

:menu
echo.
echo  1. 打开页面   2. 停止   3. 换端口   4. 状态   5. 退出
set /p M=请选择:
if "%M%"=="5" exit /b 0
if "%M%"=="4" goto :show_status
if "%M%"=="3" goto :change_port
if "%M%"=="2" goto :stop_server
if "%M%"=="1" start http://%HOST%:%PORT%
goto :menu

:change_port
set /p PORT=新端口:
if not defined PORT goto :menu
taskkill /fi "WindowTitle eq Pi-Web" /f >nul 2>&1
start "Pi-Web" "node_modules\.bin\next.cmd" start -p %PORT%
echo 已切换到端口 %PORT%
pause
goto :menu

:stop_server
taskkill /fi "WindowTitle eq Pi-Web" /f >nul 2>&1
echo 已停止
pause
exit /b 0

:show_status
echo.
if exist "package.json" (echo [OK] 项目目录) else (echo [--] 项目目录)
if exist "node_modules\next\dist\bin\next" (echo [OK] 依赖安装) else (echo [--] 依赖未安装)
if exist ".next\BUILD_ID" (echo [OK] 已构建) else (echo [--] 未构建)
tasklist /fi "WindowTitle eq Pi-Web" 2>nul | findstr "Pi-Web" >nul
if %errorlevel% equ 0 (echo [OK] 服务运行中) else (echo [--] 服务未运行)
echo.
pause
goto :menu

:show_help
echo.
echo 用法: 启动.bat [选项]
echo   --port, -p PORT   设置端口 (默认30141)
echo   --host, -H HOST   设置主机地址
echo   --no-browser      不自动打开浏览器
echo   status            查看状态
echo   stop              停止服务
echo.
pause
exit /b 0
