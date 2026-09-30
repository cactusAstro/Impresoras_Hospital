@echo off
chcp 65001 > nul
title Servidor Panel de Impresoras

echo ============================================
echo  PANEL DE IMPRESORAS - Iniciando servidor
echo ============================================
echo.

REM Comprobar si node esta instalado
node --version > nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js NO esta instalado.
    echo.
    echo Descargalo desde https://nodejs.org e instala la version LTS.
    echo Despues vuelve a ejecutar este archivo.
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js detectado.
echo.

REM Comprobar si node_modules existe
if not exist "node_modules" (
    echo [INFO] Instalando dependencias por primera vez...
    echo Esto puede tardar 1-2 minutos.
    echo.
    npm install express cors
    if errorlevel 1 (
        echo.
        echo [ERROR] No se pudieron instalar las dependencias.
        pause
        exit /b 1
    )
    echo.
    echo [OK] Dependencias instaladas.
    echo.
)

echo ============================================
echo  Servidor arrancando en http://localhost:3000
echo ============================================
echo.
echo IMPORTANTE: NO cierres esta ventana mientras uses el panel.
echo Para parar el servidor, cierra esta ventana o pulsa Ctrl+C.
echo.

REM Abrir el panel en el navegador cuando el servidor ya este arrancado
start "" /min cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:3000"

node server.js

echo.
echo Servidor detenido.
pause
