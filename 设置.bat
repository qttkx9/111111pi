@echo off
chcp 65001 >nul 2>&1
title Pi Web - 设置

:menu
cls
echo ========================================
echo   Pi Web - 设置
echo ========================================
echo.
echo  1. 查看当前配置
echo  2. 修改默认端口
echo  3. 修改默认主机地址
echo  4. 重置为默认配置
echo  5. 退出
echo.
set /p "MENU_CHOICE=请选择 (1-5): "
if "%MENU_CHOICE%"=="5" exit /b 0
if "%MENU_CHOICE%"=="4" goto :reset_config
if "%MENU_CHOICE%"=="3" goto :set_host
if "%MENU_CHOICE%"=="2" goto :set_port
if "%MENU_CHOICE%"=="1" goto :show_config
goto :menu

:show_config
cls
echo 当前配置:
echo ----------

:: 读取配置文件
set "CONFIG_FILE=%~dp0pi-web-config.bat"
set "CURRENT_PORT=30141"
set "CURRENT_HOST=localhost"
if exist "%CONFIG_FILE%" (
    call "%CONFIG_FILE%"
    if defined CFG_PORT set "CURRENT_PORT=%CFG_PORT%"
    if defined CFG_HOST set "CURRENT_HOST=%CFG_HOST%"
)

echo  端口: %CURRENT_PORT%
echo  主机: %CURRENT_HOST%
echo.
echo 启动命令: 启动.bat
if "%CURRENT_PORT%" neq "30141" (
    echo 启动命令: 启动.bat --port %CURRENT_PORT%
)
echo.
pause
goto :menu

:set_port
cls
set /p "NEW_PORT=输入新端口号 (默认 30141): "
if not defined NEW_PORT (
    echo 未输入，保持不变
    pause
    goto :menu
)

:: 验证端口
echo %NEW_PORT%| findstr /r "^[0-9][0-9]*$" >nul
if %errorlevel% neq 0 (
    echo [错误] 端口必须是数字
    pause
    goto :set_port
)
if %NEW_PORT% lss 1 (
    echo [错误] 端口必须大于 0
    pause
    goto :set_port
)
if %NEW_PORT% gtr 65535 (
    echo [错误] 端口必须小于 65536
    pause
    goto :set_port
)

:: 保存配置
set "CONFIG_FILE=%~dp0pi-web-config.bat"
echo @echo off > "%CONFIG_FILE%"
echo set "CFG_PORT=%NEW_PORT%" >> "%CONFIG_FILE%"
if defined CFG_HOST (
    echo set "CFG_HOST=%CFG_HOST%" >> "%CONFIG_FILE%"
)
echo [OK] 端口已设置为: %NEW_PORT%
echo.
echo 下次启动请使用: 启动.bat --port %NEW_PORT%
echo 或直接双击 启动.bat，脚本会自动读取配置
pause
goto :menu

:set_host
cls
set /p "NEW_HOST=输入主机地址 (默认 localhost): "
if not defined NEW_HOST (
    echo 未输入，保持不变
    pause
    goto :menu
)

set "CONFIG_FILE=%~dp0pi-web-config.bat"
echo @echo off > "%CONFIG_FILE%"
echo set "CFG_HOST=%NEW_HOST%" >> "%CONFIG_FILE%"
if defined CFG_PORT (
    echo set "CFG_PORT=%CFG_PORT%" >> "%CONFIG_FILE%"
)
echo [OK] 主机地址已设置为: %NEW_HOST%
pause
goto :menu

:reset_config
cls
set "CONFIG_FILE=%~dp0pi-web-config.bat"
if exist "%CONFIG_FILE%" (
    del "%CONFIG_FILE%"
    echo [OK] 配置已重置为默认
) else (
    echo 当前无自定义配置
)
pause
goto :menu
