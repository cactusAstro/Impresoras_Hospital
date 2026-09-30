#!/bin/bash
# Script para arrancar el servidor del Panel de Impresoras en macOS

# Cambiar al directorio donde está este archivo
cd "$(dirname "$0")"

clear
echo "============================================"
echo " PANEL DE IMPRESORAS - Iniciando servidor"
echo "============================================"
echo ""

# Comprobar si node está instalado
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js NO está instalado."
    echo ""
    echo "Descárgalo desde https://nodejs.org e instala la versión LTS."
    echo "Después vuelve a ejecutar este archivo."
    echo ""
    read -p "Pulsa Enter para cerrar..."
    exit 1
fi

echo "[OK] Node.js detectado: $(node --version)"
echo ""

# Comprobar si node_modules existe
if [ ! -d "node_modules" ]; then
    echo "[INFO] Instalando dependencias por primera vez..."
    echo "Esto puede tardar 1-2 minutos."
    echo ""
    npm install express cors
    if [ $? -ne 0 ]; then
        echo ""
        echo "[ERROR] No se pudieron instalar las dependencias."
        read -p "Pulsa Enter para cerrar..."
        exit 1
    fi
    echo ""
    echo "[OK] Dependencias instaladas."
    echo ""
fi

echo "============================================"
echo " Servidor arrancando en http://localhost:3000"
echo "============================================"
echo ""
echo "IMPORTANTE: NO cierres esta ventana mientras uses el panel."
echo "Para parar el servidor, cierra esta ventana o pulsa Ctrl+C."
echo ""

# Abrir el panel en el navegador cuando el servidor ya esté arrancado
(sleep 2; open "http://localhost:3000") &

node server.js

echo ""
echo "Servidor detenido."
read -p "Pulsa Enter para cerrar..."
