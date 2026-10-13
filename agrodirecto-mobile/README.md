# AgroDirecto Móvil (React Native + TypeScript + Expo Go)

Aplicación móvil oficial de **AgroDirecto**, desarrollada con **React Native**, **TypeScript** y configurada para ser ejecutada directamente con **Expo Go** en dispositivos móviles (Android / iOS).

---

## 🚀 Requisitos Previos

1. **Node.js** v18 o superior instalado.
2. Aplicación **Expo Go** instalada en tu teléfono móvil (disponible gratis en Google Play Store y Apple App Store).
3. El backend FastAPI de AgroDirecto ejecutándose en tu PC (`python -m uvicorn ...` en el puerto 8000).
4. El dispositivo móvil y la PC deben estar conectados a la **misma red Wi-Fi**.

---

## 📲 Cómo Iniciar la Aplicación Móvil

1. Abre una terminal en la carpeta `agrodirecto-mobile`:
   ```bash
   cd agrodirecto-mobile
   ```

2. Inicia el servidor de desarrollo de Expo:
   ```bash
   npx expo start
   ```

3. Escanea el código QR que aparece en la terminal con:
   - **Android:** La aplicación **Expo Go**.
   - **iOS:** La aplicación de **Cámara** nativa (abrirá en Expo Go).

---

## 🌐 Conexión con el Backend FastAPI

Dado que los teléfonos físicos no pueden conectarse a `localhost` o `127.0.0.1` de la computadora, la app cuenta con un selector dinámico de IP:

1. En la pantalla de **Iniciar Sesión**, presiona el botón **⚙️ Configurar IP Servidor**.
2. Ingresa la dirección IP local de tu computador en la red WiFi, por ejemplo:
   ```
   http://192.168.1.50:8000
   ```
3. Presiona **Guardar y Reconectar**. La app guardará esta dirección en `AsyncStorage` para todas las peticiones posteriores.

> **Tip:** Para conocer la IP local de tu PC en Windows, ejecuta `ipconfig` en PowerShell y busca la *Dirección IPv4* de tu adaptador Wi-Fi.

---

## 👥 Cuentas de Demostración Rápidas

En la pantalla de Login encontrarás botones de acceso rápido para probar cualquier rol de inmediato:

- **Comprador:** `comprador@agrodirecto.com` (Clave: `Comprador123!`)
- **Productor:** `productor@agrodirecto.com` (Clave: `Productor123!`)
- **Administrador:** `admin@agrodirecto.com` (Clave: `Admin123!`)

---

## 📁 Estructura del Proyecto

```
agrodirecto-mobile/
├── App.tsx                      # Componente raíz con AuthProvider y NavigationContainer
├── index.ts                     # Entrada principal de Expo
├── app.json                     # Metadatos de la app para Expo Go
├── tsconfig.json                # Configuración TypeScript
├── package.json                 # Dependencias (Expo 52, React 18, React Navigation 7)
└── src/
    ├── components/common/       # Componentes UI reutilizables (Badge, Button, Card, Header, InputField, StatCard, etc.)
    ├── context/
    │   └── AuthContext.tsx      # Manejo global de autenticación, JWT y rol
    ├── navigation/
    │   ├── AppNavigator.tsx     # Enrutador dinámico por rol (Público, Comprador, Productor, Admin)
    │   ├── PublicNavigator.tsx  # Rutas públicas (Home, Nosotros, Contacto, Login, Registro, Recuperación)
    │   ├── BuyerNavigator.tsx   # Tabs y Stack del Comprador
    │   ├── ProducerNavigator.tsx# Tabs y Stack del Productor Campesino
    │   └── AdminNavigator.tsx   # Tabs y Stack del Administrador
    ├── screens/
    │   ├── public/              # Pantallas públicas informativas y de acceso
    │   ├── buyer/               # Panel, Catálogo, Reservas, Entregas, Pagos, Favoritos, Perfil Finca
    │   ├── producer/            # Panel, Mis Cultivos, Ventas/Despacho, Trazabilidad, Reportes
    │   ├── admin/               # Panel, Usuarios, Roles, Lotes, Categorías, Proveedores, Auditoría, Soporte, Reportes
    │   └── shared/              # Perfil, Notificaciones, Disputas y Reclamos
    ├── services/
    │   ├── api.ts               # Cliente REST con 75 endpoints, JWT y error handling
    │   └── config.ts            # Gestor de URL base del backend y persistencia
    └── theme/
        └── colors.ts            # Paleta de colores institucional AgroDirecto
```

---

## 🛠️ Comprobación de Tipos TypeScript

Para verificar que el código no tenga ningún error de tipos:
```bash
npx tsc --noEmit
```
Resultado: **0 errores**.
