#!/bin/bash

echo "===================== DESPLIEGUE A RAILWAY ====================="
echo "Este script automatiza el despliegue de tu backend a Railway"
echo ""

# Configurar Git si es necesario
if [ -z "$(git config --get user.name)" ]; then
  echo "Configurando usuario Git..."
  git config --global user.name "Deployer"
  git config --global user.email "deployer@example.com"
fi

# Commit de cambios si hay
echo "Verificando cambios..."
git add .
git status -s

# Preguntar si continuar con el despliegue
read -p "¿Continuar con el despliegue? (S/n): " CONTINUE
if [[ "$CONTINUE" != "S" && "$CONTINUE" != "s" && "$CONTINUE" != "" ]]; then
  echo "Despliegue cancelado."
  exit 0
fi

# Realizar commit
echo "Realizando commit de cambios..."
git commit -m "Despliegue automático - Sistema de reservas temporales"

# Verificar si Railway CLI está instalado
if ! command -v railway &> /dev/null; then
  echo "La herramienta CLI de Railway no está instalada."
  echo "Por favor, instala Railway CLI con 'npm install -g @railway/cli'"
  exit 1
fi

# Ejecutar despliegue a Railway
echo "Desplegando a Railway..."
railway up

echo "===================== DESPLIEGUE COMPLETADO ====================="
echo "Para verificar el estado del despliegue, visita el panel de Railway"
echo "https://railway.app"