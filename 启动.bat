@echo off
chcp 65001 >nul
title Pi Web - 编程助手

set "PORT=30141"
set "HOST=localhost"

:: 解析参数
:parse
if "%~1"=="" goto :run
if /i "%~1"=="--port" set "PORT=%~2" & shift & shift & goto :parse
if /i "%~1"=="-p" set "PORT=%~2" & shift & shift & goto :parse
if /i "%~1"=="--host" set "HOST=%~2" & shift & shift & goto :parse
if /i "%~1"=="-H" set "HOST=%~2" & shift & shift & goto :parse
if /i "%~1"=="--help" goto :help
if /i "%~1"=="-h" goto :help
if /i "%~1"=="status" goto :status
if /i "%~1"=="stop" goto :stop
shift & goto :parse

:run
netstat -ano | findstr ":%PORT% " >nul 2>&1
if %errorlevel% equ 0 (
    echo 端口 %PORT% 已被占用，服务可能已在运行
    start http://%HOST%:%PORT%
    pause
    exit /b 0
)

echo ============================
echo   Pi Web 编程助手
echo ============================
echo  端口: %PORT%
echo  地址: http://%HOST%:%PORT%
echo  关闭本窗口即可停止服务
echo ============================

start "Pi-Web" npx next start -p %PORT%

echo 等待服务启动...
:wait
timeout /t 2 /nobreak >nul
curl -s http://%HOST%:%PORT% >nul 2>&1
if errorlevel 1 goto :wait
start http://%HOST%:%PORT%
echo 已启动！
pause
exit /b 0

:stop
taskkill /fi "WindowTitle eq Pi-Web" /f >nul 2>&1
echo 已停止
pause
exit /b 0

:status
tasklist /fi "WindowTitle eq Pi-Web" 2>nul | findstr "Pi-Web" >nul
if %errorlevel% equ 0 (echo 运行中) else (echo 未运行)
pause
exit /b 0

:help
echo Pi Web 启动器
echo.
echo 用法: 启动.bat [选项] [命令]
echo.
echo 选项:
echo   --port, -p PORT   设置端口 (默认 30141)
echo   --host, -H HOST   设置主机地址
echo.
echo 命令:
echo   status   查看状态
echo   stop     停止服务
echo.
pause
exit /b 0
