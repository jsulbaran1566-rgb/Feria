# AgroDirecto - Frontend React

Aplicación Frontend moderna desarrollada en **React 19 + TypeScript + Vite + React Router DOM v7**, conectada a la API REST de **FastAPI** (`http://127.0.0.1:8000`).

---

## 🚀 Inicio Rápido

### 1. Iniciar el Backend (FastAPI)
En una terminal en la raíz del proyecto:
```powershell
cd backend
.\venv\Scripts\Activate.ps1   # tu entorno virtual
cd scr
uvicorn main:app --reload --port 8000
```
La documentación interactiva de la API estará disponible en `http://127.0.0.1:8000/docs`.

### 2. Iniciar el Frontend (React)
En otra terminal en la carpeta `frontend` (o `agrodirecto-react-v2`):
```powershell
npm install
npm run dev
```
La aplicación web estará disponible en `http://localhost:5173`.

---

## 🔐 Cuentas de Prueba Preconfiguradas

| Rol | Correo Electrónico | Contraseña | Panel |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin@agrodirecto.com` | `admin123` | `/admin` |
| **Productor** | `productor@agrodirecto.com` | `productor123` | `/productor` |
| **Comprador** | `comprador@agrodirecto.com` | `comprador123` | `/comprador` |

---

## 📂 Estructura del Proyecto

```
frontend/
├── index.html
├── package.json
├── vite.config.ts
└── src/
    ├── assets/
    │   └── estilo.css              # Sistema de estilos globales de AgroDirecto
    ├── components/
    │   ├── common/
    │   │   ├── Alert.tsx           # Notificaciones y alertas contextuales
    │   │   ├── Badge.tsx           # Badges de estado dinámicos
    │   │   ├── Footer.tsx          # Pie de página transversal
    │   │   ├── Modal.tsx           # Ventana modal reutilizable
    │   │   ├── Navbar.tsx          # Barra de navegación pública con sesión
    │   │   ├── ProtectedRoute.tsx  # Control de acceso según rol y autenticación
    │   │   └── Sidebar.tsx         # Menú lateral del panel según rol activo
    │   └── layout/
    │       ├── DashboardLayout.tsx # Layout privado con sidebar y soporte modal
    │       └── PublicLayout.tsx    # Layout público con navbar y footer
    ├── context/
    │   └── AuthContext.tsx         # Estado global de usuario, token y roles
    ├── pages/
    │   ├── admin/                  # Dashboard, Usuarios, Roles, Proveedores, Lotes, Categorías, etc.
    │   ├── buyer/                  # Dashboard, Explorar lotes, Reservas, Entregas, Pagos, Favoritos, etc.
    │   ├── producer/               # Dashboard, Mis cultivos, Trazabilidad, Ventas/Pagos, Reportes
    │   ├── public/                 # Inicio, Nosotros, Contacto, Login, Registro, Recuperar contraseña
    │   └── shared/                 # Perfil de usuario, Disputas, Notificaciones
    ├── services/
    │   └── api.ts                  # Conector de peticiones REST a FastAPI
    ├── App.tsx                     # Enrutador principal de la aplicación
    └── main.tsx                    # Punto de entrada
```

---

## 🛠️ Scripts Disponibles

- `npm run dev`: Inicia el servidor de desarrollo de Vite con HMR.
- `npm run build`: Compila la aplicación para producción en la carpeta `dist/`.
- `npm run preview`: Previsualiza la compilación de producción localmente.
- `npm run lint`: Ejecuta el linter (Oxlint).

---

## 🔑 Recuperación de contraseña (simulada)

El proyecto **no envía correos**. El flujo funciona así:

1. En `/recuperar-clave` se escribe el correo. El backend genera un token de recuperación (15 min, un solo uso) y lo devuelve en la respuesta.
2. La pantalla muestra un recuadro **📧 Correo simulado** con el botón *Abrir enlace de recuperación*, que hace de enlace del correo.
3. Se escribe la nueva contraseña y se guarda de verdad en la base de datos.

Si el correo no existe o la cuenta está inactiva, no se genera enlace y la pantalla lo indica.

## 🔒 Regla de contraseña

Mínimo 8 caracteres, una mayúscula, un número y un carácter especial. Se valida igual en el frontend (`src/utils/password.ts`) y en el backend (`Utilidades/validacion_clave.py`): registro, recuperación, cambio de clave en el perfil y edición desde el panel de administrador.

## 🧱 Notas de arquitectura

- `src/context/authContexto.ts`: contexto y hook `useAuth`. `AuthContext.tsx` solo exporta `AuthProvider`.
- `src/context/dialogosContexto.ts` + `DialogosProvider.tsx`: reemplazan `window.confirm` / `window.alert` por modales propios (`const { confirmar, avisar } = useDialogos()`).
- Todas las páginas se cargan bajo demanda (`React.lazy`) para reducir el tamaño inicial.

## 🟦 TypeScript

Todo el frontend está escrito en **TypeScript** (`.ts` / `.tsx`) con `strict` activado.

- `src/types/index.ts`: tipos del dominio (`Usuario`, `Lote`, `Reserva`, `Pago`...) y de los datos que se envían al backend (`DatosUsuarioNuevo`, `DatosLoteNuevo`...). Reflejan exactamente los esquemas del backend FastAPI, así que si un campo no coincide, `tsc` lo marca.
- `src/utils/errores.ts`: `mensajeError(err)` obtiene el texto de cualquier error capturado en un `catch`.
- `src/services/api.ts`: cada función de la API declara qué recibe y qué devuelve.

Comandos útiles:

```powershell
npm run typecheck   # revisa los tipos sin compilar
npm run build       # revisa tipos y compila
npm run lint        # oxlint
npm test            # pruebas de interfaz: cierre de sesión, carrusel y pie de página (vitest)
npm run test:e2e    # flujo completo contra el backend real (ver abajo)
```

La prueba `backend/tests/test_contrato_frontend.py` envía al backend los mismos datos que arma el frontend y comprueba que los acepta.

## 🔁 Prueba del flujo completo (extremo a extremo)

`tests/e2e/flujo.e2e.ts` ejecuta el código real del frontend (`src/services/api.ts`) contra el backend real: recuperación de contraseña, registro, publicar lote, reservar, confirmar, pagar anticipo y saldo, despachar, confirmar entrega con código, calificar, disputas, reportes, notificaciones, cancelación y permisos. Además comprueba que cada lista tenga la forma que declaran los tipos.

Usa una base SQLite en memoria con usuarios de ejemplo (contraseña `Clave1234!`), así que no necesita PostgreSQL ni toca tus datos. En dos terminales:

```powershell
# Terminal 1
cd backend
python tests/servidor_e2e.py

# Terminal 2
cd frontend
npm run test:e2e
```
