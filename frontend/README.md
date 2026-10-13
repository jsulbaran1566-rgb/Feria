# AgroDirecto - Frontend React

Aplicación Frontend moderna desarrollada en **React 19 + Vite + React Router DOM v7**, conectada a la API REST de **FastAPI** (`http://127.0.0.1:8000`).

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
├── vite.config.js
└── src/
    ├── assets/
    │   └── estilo.css              # Sistema de estilos globales de AgroDirecto
    ├── components/
    │   ├── common/
    │   │   ├── Alert.jsx           # Notificaciones y alertas contextuales
    │   │   ├── Badge.jsx           # Badges de estado dinámicos
    │   │   ├── Footer.jsx          # Pie de página transversal
    │   │   ├── Modal.jsx           # Ventana modal reutilizable
    │   │   ├── Navbar.jsx          # Barra de navegación pública con sesión
    │   │   ├── ProtectedRoute.jsx  # Control de acceso según rol y autenticación
    │   │   └── Sidebar.jsx         # Menú lateral del panel según rol activo
    │   └── layout/
    │       ├── DashboardLayout.jsx # Layout privado con sidebar y soporte modal
    │       └── PublicLayout.jsx    # Layout público con navbar y footer
    ├── context/
    │   └── AuthContext.jsx         # Estado global de usuario, token y roles
    ├── pages/
    │   ├── admin/                  # Dashboard, Usuarios, Roles, Proveedores, Lotes, Categorías, etc.
    │   ├── buyer/                  # Dashboard, Explorar lotes, Reservas, Entregas, Pagos, Favoritos, etc.
    │   ├── producer/               # Dashboard, Mis cultivos, Trazabilidad, Ventas/Pagos, Reportes
    │   ├── public/                 # Inicio, Nosotros, Contacto, Login, Registro, Recuperar contraseña
    │   └── shared/                 # Perfil de usuario, Disputas, Notificaciones
    ├── services/
    │   └── api.js                  # Conector de peticiones REST a FastAPI
    ├── App.jsx                     # Enrutador principal de la aplicación
    └── main.jsx                    # Punto de entrada
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

Mínimo 8 caracteres, una mayúscula, un número y un carácter especial. Se valida igual en el frontend (`src/utils/password.js`) y en el backend (`Utilidades/validacion_clave.py`): registro, recuperación, cambio de clave en el perfil y edición desde el panel de administrador.

## 🧱 Notas de arquitectura

- `src/context/authContexto.js`: contexto y hook `useAuth`. `AuthContext.jsx` solo exporta `AuthProvider`.
- `src/context/dialogosContexto.js` + `DialogosProvider.jsx`: reemplazan `window.confirm` / `window.alert` por modales propios (`const { confirmar, avisar } = useDialogos()`).
- Todas las páginas se cargan bajo demanda (`React.lazy`) para reducir el tamaño inicial.
