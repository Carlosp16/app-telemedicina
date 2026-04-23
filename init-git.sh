#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# Inicializa el repositorio git con identidad local (sólo para este directorio)
# y hace el primer commit con el scaffold completo.
#
# Uso:
#   cd ~/Documents/teg/app-telemedicina
#   chmod +x init-git.sh
#   ./init-git.sh
#
# Después puedes eliminar este script si prefieres (no es parte del proyecto).
# -----------------------------------------------------------------------------
set -euo pipefail

# 1) Limpia cualquier lock file dejado por operaciones previas del sandbox.
rm -f .git/index.lock

# 2) Inicializa el repo si no existe todavía.
if [ ! -d .git ]; then
  git init -b main
fi

# 3) Identidad LOCAL (sólo este repo, no toca tu config global).
git config user.email "cpereira379@gmail.com"
git config user.name "Carlos Pereira"

# 4) Verificación rápida.
echo "→ Identidad configurada:"
echo "   email: $(git config --local --get user.email)"
echo "   name:  $(git config --local --get user.name)"

# 5) Commit inicial.
git add .
git commit -m "chore: scaffold inicial app React Native (Expo + TypeScript)

Incluye:
- Base Expo SDK 51 con Dev Client y TypeScript estricto
- Navegación con React Navigation (AuthStack + AppStack)
- Store de autenticación con zustand + expo-secure-store
- Cliente HTTP axios con interceptor JWT y manejo de 401
- Pantallas de Login, Registro con código de acceso, y recuperar contraseña
- Home placeholder con logout
- Configuración centralizada via app.json -> expo.extra
- Permisos nativos (cámara, micrófono) listos para videollamada
- Documentación completa en README.md"

echo ""
echo "✅ Primer commit creado."
git log --oneline
