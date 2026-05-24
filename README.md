# App Telemedicina (React Native + Expo)

Se conecta al backend NestJS del directorio hermano `../backend/`.

## Stack

- **Expo SDK 51** con **Dev Client** (no Expo Go: requerimos módulos nativos como WebRTC).
- **TypeScript**.
- **React Navigation 6** (native-stack).
- **Zustand** para estado global, **Axios** para HTTP, **expo-secure-store** para el token.
- **socket.io-client** (preinstalado, se usará en iteraciones siguientes para chat y video).

## Estructura

```
src/
├── api/                Cliente HTTP + endpoints por dominio
│   ├── auth.ts
│   └── client.ts
├── components/         Componentes reutilizables (Input, Button)
├── config/             Lectura de app.json -> expo.extra
├── navigation/         Stacks y RootNavigator
├── screens/
│   ├── auth/           Login, Register, ForgotPassword
│   └── home/           Home placeholder
├── stores/             zustand stores (auth)
└── theme/              Paleta de colores
```

## Puesta en marcha

### 1. Instalar dependencias

```bash
npm install
```

### 2. Levantar el backend

En otra terminal, desde `../backend/`:

```bash
docker compose up --build
```

El backend queda escuchando en http://localhost:3000.

### 3. Configurar la URL del backend

Editar `app.json` -> `expo.extra.apiUrl` según cómo vayas a probar:

| Escenario                         | apiUrl                        |
| --------------------------------- | ----------------------------- |
| Simulador iOS                     | `http://localhost:3000/api`   |
| Emulador Android                  | `http://10.0.2.2:3000/api`    |
| Dispositivo físico (mismo Wi-Fi)  | `http://192.168.x.x:3000/api` |

Para saber la IP LAN de tu Mac: `ipconfig getifaddr en0`.

### 4. Generar el proyecto nativo (una vez)

```bash
npx expo prebuild
```

Este comando crea las carpetas `ios/` y `android/` a partir de `app.json`.
**No las versiones a git** (ya están en `.gitignore`): se regeneran en CI.

### 5. Ejecutar en simulador/dispositivo

```bash
# iOS (requiere Xcode)
npm run ios

# Android (requiere Android Studio + emulador corriendo)
npm run android

# Dev server Metro (para recargar sobre un build existente)
npm start
```

## Flujo actual implementado

1. **Login** (`POST /api/auth/login`) → guarda el JWT en Keychain/Keystore.
2. **Registro paciente** (`POST /api/users/register`) con código de acceso.
3. **Recuperación de contraseña** (`POST /api/auth/forgot-password`).
4. Refresh del usuario al arrancar (`GET /api/auth/me`).
5. Logout limpia token local y llama al backend.
6. El interceptor de axios desloguea automáticamente en un 401.

## Próximas iteraciones

- [ ] Pantalla "Solicitar consulta" (POST `/api/waiting-room/join`).
- [ ] Chat en tiempo real con `socket.io-client` (namespace `/chat`).
- [ ] Adjuntar archivos (imagen o PDF ≤ 1 MB) codificados en Base64.
- [ ] Videollamada con `react-native-webrtc` (señalización por namespace `/video`).
- [ ] Reset de contraseña vía deep link desde el correo.
- [ ] Pantalla de perfil (editar email/contraseña pidiendo la actual).

## Troubleshooting

### "Network request failed"

- Verifica que el backend esté corriendo (`curl http://localhost:3000/health`).
- Si estás en dispositivo físico, cambia `apiUrl` a la IP LAN.
- Si es emulador Android, usa `10.0.2.2` en vez de `localhost`.

### Metro bundler se queda colgado

```bash
npx expo start -c   # limpia cache
```

### Cambios en `app.json` no se reflejan

Los cambios que afectan código nativo (plugins, permisos, bundleIdentifier)
requieren un nuevo `expo prebuild` y rebuild nativo.
