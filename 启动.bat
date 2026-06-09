@echo off
chcp 65001 >nul 2>&1
title Pi Web

set "PORT=30141"
set "HOST=localhost"
set "AUTO_OPEN=true"

:: parse args
:parse_args
if "%~1"=="" goto :end_parse
if /i "%~1"=="--port" set "PORT=%~2" & shift & shift & goto :parse_args
if /i "%~1"=="-p" set "PORT=%~2" & shift & shift & goto :parse_args
if /i "%~1"=="--host" set "HOST=%~2" & shift & shift & goto :parse_args
if /i "%~1"=="-H" set "HOST=%~2" & shift & shift & goto :parse_args
if /i "%~1"=="--no-browser" set "AUTO_OPEN=false" & shift & goto :parse_args
if /i "%~1"=="status" goto :show_status
if /i "%~1"=="stop" goto :stop_server
if /i "%~1"=="--help" goto :show_help
if /i "%~1"=="-h" goto :show_help
shift & goto :parse_args
:end_parse

cd /d "%~dp0"

:: read config
if exist "%~dp0pi-web-config.bat" (
    call "%~dp0pi-web-config.bat"
    if defined CFG_PORT set "PORT=%CFG_PORT%"
    if defined CFG_HOST set "HOST=%CFG_HOST%"
)

:: check project
if not exist "%~dp0package.json" (
    echo [ERROR] package.json not found
    pause
    exit /b 1
)

:: check deps
if not exist "%~dp0node_modules\next\dist\bin\next" (
    echo [ERROR] run: npm install
    pause
    exit /b 1
)

:: check build
if not exist "%~dp0.next\BUILD_ID" (
    echo [INFO] building...
    call npx next build
    if errorlevel 1 (
        echo [ERROR] build failed
        pause
        exit /b 1
    )
    echo [OK] build done
)

:: check port
netstat -ano | findstr ":%PORT% " >nul 2>&1
if %errorlevel% equ 0 (
    echo ================================
    echo Port %PORT% is in use
    echo ================================
    start http://%HOST%:%PORT%
    exit /b 0
)

:: start
echo ================================
echo   Pi Web
echo ================================
echo Port: %PORT%
echo URL:  http://%HOST%:%PORT%
echo Close this window to stop
echo ================================

start "Pi-Web" "%~dp0node_modules\.bin\next.cmd" start -p %PORT%

:: wait then open browser
if "%AUTO_OPEN%"=="true" (
    echo Waiting for server...
    :wait_loop
    timeout /t 2 /nobreak >nul
    curl -s http://%HOST%:%PORT% >nul 2>&1
    if errorlevel 1 goto :wait_loop
    start http://%HOST%:%PORT%
    echo Browser opened
)

:menu
cls
echo ================================
echo   Pi Web Menu
echo ================================
echo  1. Open browser
echo  2. Stop server
echo  3. Change port
echo  4. Check status
echo  5. Exit
set /p "MENU=Select (1-5): "
if "%MENU%"=="5" exit /b 0
if "%MENU%"=="4" goto :show_status
if "%MENU%"=="3" goto :change_port
if "%MENU%"=="2" goto :stop_server
start http://%HOST%:%PORT%
goto :menu

:change_port
set /p "PORT=New port: "
if not defined PORT goto :menu
taskkill /fi "WindowTitle eq Pi-Web" /f >nul 2>&1
start "Pi-Web" "%~dp0node_modules\.bin\next.cmd" start -p %PORT%
timeout /t 2 /nobreak >nul
echo Switched to port %PORT%
pause
goto :menu

:stop_server
taskkill /fi "WindowTitle eq Pi-Web" /f >nul 2>&1
echo Server stopped
pause
exit /b 0

:show_status
cls
echo Status check:
echo - Project:   
if exist "%~dp0package.json" (echo [OK]) else (echo [--])
echo - npm deps: 
if exist "%~dp0node_modules\next\dist\bin\next" (echo [OK]) else (echo [--])
echo - Build:    
if exist "%~dp0.next\BUILD_ID" (echo [OK]) else (echo [--])
echo - Server:   
tasklist /fi "WindowTitle eq Pi-Web" 2>nul | findstr "Pi-Web" >nul
if %errorlevel% equ 0 (echo Running) else (echo Stopped)
echo.
pause
goto :menu

:show_help
echo Pi Web Launcher
echo.
echo Usage: 启动.bat [options] [command]
echo.
echo Options:
echo   --port, -p PORT   Set port (default 30141)
echo   --host, -H HOST   Set host address
echo   --no-browser      Don't open browser
echo.
echo Commands:
echo   status   Check status
echo   stop     Stop server
echo.
pause
exit /b 0
