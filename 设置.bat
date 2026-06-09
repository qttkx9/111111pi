@echo off
chcp 65001 >nul 2>&1
title Pi Web 设置

set CFG_FILE=%~dp0pi-web-config.bat

:menu
cls
echo ==============================
echo   Pi Web 设置
echo ==============================
echo  1. 查看配置
echo  2. 修改端口
echo  3. 修改主机地址
echo  4. 重置配置
echo  5. 退出
echo.
set /p M=请选择 (1-5):
if "%M%"=="5" exit /b 0
if "%M%"=="4" goto :reset
if "%M%"=="3" goto :host
if "%M%"=="2" goto :port
if "%M%"=="1" goto :view
goto :menu

:view
cls
set CUR_PORT=30141
set CUR_HOST=localhost
if exist "%CFG_FILE%" (
    call "%CFG_FILE%"
    if defined CFG_PORT set CUR_PORT=%CFG_PORT%
    if defined CFG_HOST set CUR_HOST=%CFG_HOST%
)
echo 当前端口: %CUR_PORT%
echo 当前主机: %CUR_HOST%
pause
goto :menu

:port
set /p NEWP=新端口 (默认30141):
if not defined NEWP goto :menu
echo %NEWP%| findstr /r "^[0-9][0-9]*$" >nul
if errorlevel 1 (
    echo 端口必须是数字
    pause
    goto :port
)
echo @echo off> "%CFG_FILE%"
echo set CFG_PORT=%NEWP%>> "%CFG_FILE%"
if defined CFG_HOST echo set CFG_HOST=%CFG_HOST%>> "%CFG_FILE%"
echo 端口已设为 %NEWP%
pause
goto :menu

:host
set /p NEWH=主机地址 (默认localhost):
if not defined NEWH goto :menu
echo @echo off> "%CFG_FILE%"
echo set CFG_HOST=%NEWH%>> "%CFG_FILE%"
if defined CFG_PORT echo set CFG_PORT=%CFG_PORT%>> "%CFG_FILE%"
echo 主机已设为 %NEWH%
pause
goto :menu

:reset
if exist "%CFG_FILE%" (
    del "%CFG_FILE%"
    echo 已重置为默认
) else (
    echo 无自定义配置
)
pause
goto :menu
