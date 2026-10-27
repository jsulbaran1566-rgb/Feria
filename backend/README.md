# AgroMercado API

API REST para un mercado agrícola de pre-cosecha. Permite gestionar usuarios (productores y compradores), roles, tipos de documento, proveedores, categorías, lotes de producto, reservas, favoritos y tickets de soporte, además de consultar el historial de movimientos, compras y ventas. Incluye autenticación con correo/contraseña y token JWT.

## Tecnologías

- **FastAPI** — framework para construir la API
- **SQLAlchemy** — ORM para hablar con la base de datos
- **PostgreSQL** (`psycopg2`) — motor de base de datos
- **Pydantic** — validación de los datos que llegan en las peticiones (`pydantic[email]` para `EmailStr`)
- **Passlib (bcrypt)** — hash de contraseñas
- **python-jose** — firma y verificación de tokens JWT
- **Starlette** — middleware de logging de peticiones
- **CORS Middleware** — habilitado para `http://127.0.0.1:5500`, `http://localhost:5500` y `http://127.0.0.1:8000`

## Estructura del proyecto

Los modelos, esquemas, excepciones, controladores y rutas están organizados **un archivo por dominio/tabla**, todos reunidos por un punto de entrada que el resto del código importa.

```
scr/
├── main.py                          # App, CORS, middleware de logging, registro de manejadores de
│                                     # excepciones y de rutas, creación de tablas al arrancar
├── Utilidades/
│   ├── respuesta.py                 # respuesta_ok / respuesta_error (formato estándar de respuesta)
│   └── seguridad.py                 # hashear_clave / verificar_clave (bcrypt) y crear_token / leer_token (JWT)
├── Conexion/
│   └── database.py                  # Engine, SessionLocal, Base y get_db() para PostgreSQL
├── Modelos/
│   ├── models.py                    # Punto de entrada único: reexporta todos los modelos de abajo
│   ├── modelos_tipos_documento.py   # TipoDocumento
│   ├── modelos_roles.py             # Rol
│   ├── modelos_usuarios.py          # Usuario
│   ├── modelos_categorias.py        # Categoria
│   ├── modelos_lotes.py             # Lote
│   ├── modelos_reservas.py          # Reserva
│   ├── modelos_historial.py         # HistorialSeguimiento, Compra, Venta, HistorialReserva
│   ├── modelos_proveedores.py       # Proveedor
│   ├── modelos_favoritos.py         # Favorito
│   └── modelos_soporte.py           # Soporte
├── Esquemas/
│   ├── Esquemas.py                  # Punto de entrada único: reexporta los esquemas de abajo
│   ├── esquemas_usuarios.py
│   ├── esquemas_roles.py
│   ├── esquemas_categorias.py
│   ├── esquemas_lotes.py
│   ├── esquemas_reservas.py
│   ├── esquemas_tipos_documento.py
│   ├── esquemas_proveedores.py
│   ├── esquemas_favoritos.py
│   ├── esquemas_soporte.py
│   └── esquemas_auth.py             # LoginEntrada
├── Excepciones/
│   ├── excepciones_usuarios.py
│   ├── excepciones_lotes.py
│   ├── excepciones_categorias.py
│   ├── excepciones_reservas.py
│   ├── excepciones_proveedores.py
│   ├── excepciones_favoritos.py
│   ├── excepciones_soporte.py
│   └── excepciones_auth.py
├── Controladores/
│   ├── controladores_usuarios.py
│   ├── controladores_lotes.py
│   ├── controladores_categorias.py
│   ├── controladores_reservas.py
│   ├── controladores_roles.py
│   ├── controladores_tipos_documento.py
│   ├── controladores_proveedores.py
│   ├── controladores_favoritos.py
│   ├── controladores_soporte.py
│   ├── controladores_historial.py
│   └── controladores_auth.py
└── Rutas/
    ├── rutas_usuarios.py
    ├── rutas_lotes.py
    ├── rutas_categorias.py
    ├── rutas_reservas.py
    ├── rutas_roles.py
    ├── rutas_tipos_documento.py
    ├── rutas_proveedores.py
    ├── rutas_favoritos.py
    ├── rutas_soporte.py
    ├── rutas_historial.py
    └── rutas_auth.py
```

> `models.py` y `Esquemas.py` ya no contienen las clases directamente: son un punto de entrada que reúne y reexporta lo que vive en los archivos `modelos_*.py` / `esquemas_*.py`, para que el resto del proyecto (`import Modelos.models as models`, `models.Usuario`, `models.Lote`, etc.) siga funcionando sin tener que tocar cada controlador.

## Modelo de datos

| Tabla | Descripción |
|---|---|
| `tipos_documento` | Catálogo de tipos de documento de identidad (código de hasta 4 caracteres + nombre) |
| `roles` | Roles del sistema (nombre, descripción, permisos) |
| `usuarios` | Usuarios del sistema (productores y compradores), con `tipo_documento`, `numero_documento`, `correo` y `teléfono` únicos, `clave` (hash bcrypt), `rol_id`, `empresa`, estado y fecha de registro |
| `proveedores` | Proveedores externos (nombre, tipo, ciudad, contacto, estado Activo/Inactivo) |
| `categorias` | Categorías de producto (clave primaria = nombre) |
| `lotes` | Lotes de producto agrícola asociados a un productor y una categoría, con cantidad, kg reservados y precio por kg |
| `reservas` | Reservas de un comprador sobre un lote, con estado (`Pendiente`, `Confirmada`, `Cancelada`, `Entregada`) |
| `favoritos` | Relación muchos-a-muchos entre un comprador y sus productores favoritos (clave primaria compuesta `comprador_id` + `productor_id`) |
| `soporte` | Tickets de soporte enviados desde cualquier panel, con estado (`Pendiente`, `En proceso`, `Resuelto`) |
| `historial_seguimiento` | Bitácora de acciones realizadas sobre los lotes |
| `historial_reservas` | Bitácora de cada cambio de estado de una reserva |
| `compras` | Registro histórico de compras |
| `ventas` | Registro histórico de ventas |

Todas las relaciones usan claves foráneas con `ON UPDATE`/`ON DELETE` definidos explícitamente (`RESTRICT`, `CASCADE` o `SET NULL` según el caso), y varias tablas tienen `CheckConstraint` para validar campos de estado y cantidades positivas.

## Instalación

1. Clonar el repositorio y entrar a la carpeta del proyecto (`estructura-api`).
2. Crear un entorno virtual (opcional, pero recomendado):
   ```
   python -m venv venv
   venv\Scripts\activate      # Windows
   source venv/bin/activate   # Linux / Mac
   ```
3. Instalar las dependencias:
   ```
   pip install -r requirements.txt
   ```
   Incluye `fastapi`, `uvicorn`, `sqlalchemy`, `psycopg2-binary` (driver de PostgreSQL), `pydantic[email]` (necesario porque los esquemas usan `EmailStr`), `passlib[bcrypt]` + `bcrypt==4.0.1` (hash de contraseñas) y `python-jose[cryptography]` (tokens JWT).

## Configuración de la base de datos

En `Conexion/database.py` se define la conexión a PostgreSQL:

```python
SQLALCHEMY_DATABASE_URL = "postgresql+psycopg2://postgres:1234@localhost/agro_mercado"
```

### Datos de ejemplo (seed)

`agro_mercado_postgres.sql` incluye, además del esquema, datos de ejemplo (usuarios, proveedores, lotes, etc.) listos para probar la API y el frontend:

```
psql -U postgres -h localhost -d agro_mercado -f agro_mercado_postgres.sql
```

Las claves de esos usuarios de ejemplo vienen en texto plano dentro del `.sql`, pero la API solo acepta claves hasheadas con bcrypt en el login. Por eso, después de cargar el `.sql`, hay que ejecutar una única vez el script `rehash_claves.py` (con el entorno virtual activo, parado en `scr/`):

```
cd scr
python ../rehash_claves.py
```

Es seguro correrlo varias veces: si una clave ya está hasheada (empieza con `$2b$`), la deja intacta. Sin este paso, el login devuelve error 500 al comparar una clave hasheada contra una clave en texto plano.

Usuarios de ejemplo (correo / clave, tal como quedan en el `.sql` antes de hashear):

```
Admin:      admin@agrodirecto.com      / admin123
Productor:  finca.paraiso@campo.com    / prod123
Comprador:  compras@laplaza.com        / comp123
```

Antes de ejecutar el proyecto:
- Crear en PostgreSQL una base de datos llamada `agro_mercado`. El script `agro_mercado_postgres.sql` (en la raíz de `estructura-api`) contiene el esquema SQL de referencia.
- Ajustar usuario y contraseña según tu instalación.
- Las tablas se crean automáticamente al arrancar la aplicación, gracias a `Base.metadata.create_all(bind=engine)` en `main.py`. No hay sistema de migraciones (como Alembic), así que los cambios en los archivos `modelos_*.py` requieren recrear la base de datos.

## Ejecutar el proyecto

Como el código vive dentro de la carpeta `scr`, la aplicación se levanta indicando ese directorio:

```
uvicorn main:app --app-dir scr --reload
```

La documentación interactiva queda disponible en `http://localhost:8000/docs`.

## Autenticación

`POST /auth/login` recibe `correo` y `clave`, valida contra la tabla `usuarios` (contraseña comparada con `verificar_clave`, hash bcrypt) y, si el usuario existe y está `Activo`, devuelve un token JWT (`Utilidades/seguridad.py`, algoritmo `HS256`, expira en 120 minutos) junto con `id`, `nombre`, `correo` y `rol` del usuario. Si el correo no existe, la clave no coincide o el usuario está inactivo, responde siempre el mismo error (`ErrorCredencialesInvalidas`, HTTP 401) para no revelar cuál de los tres casos ocurrió.

## Formato de respuesta

Todas las respuestas de la API siguen la misma estructura, definida en `Utilidades/respuesta.py`:

```json
{
  "success": true,
  "message": "Usuario obtenido",
  "data": { "id": 1, "nombre": "Ana", "rol": "Productor" },
  "error": null
}
```

En caso de error:

```json
{
  "success": false,
  "message": "No existe un usuario con el id 99",
  "data": null,
  "error": "No existe un usuario con el id 99"
}
```

Los errores no controlados (excepciones genéricas) son capturados por un manejador global en `main.py` y devuelven un código HTTP 500. Ese manejador corre por encima del middleware de CORS en el stack de Starlette, así que agrega los encabezados CORS manualmente para que el frontend pueda leer el mensaje real en vez de un falso error de "blocked by CORS policy".

## Endpoints principales

### Autenticación (`/auth`)
- `POST /auth/login` — valida correo y clave, devuelve token JWT + datos del usuario

### Usuarios (`/usuarios`)
- `GET /usuarios` — listar usuarios (filtros opcionales: `rol`, `estado`)
- `GET /usuarios/compradores` — listar usuarios con rol Comprador (filtro opcional: `estado`)
- `GET /usuarios/productores` — listar usuarios con rol Productor (filtro opcional: `estado`)
- `GET /usuarios/{nombre}` — buscar usuario(s) por coincidencia parcial de nombre
- `POST /usuarios` — registrar un usuario
- `PUT /usuarios/{id}` — editar nombre, teléfono, dirección, ciudad, rol y/o estado
- `DELETE /usuarios/{id}` — eliminar usuario (requiere `?confirmar=true`; falla si tiene lotes activos)

### Roles (`/roles`)
- `GET /roles` — listar roles
- `GET /roles/{id}` — obtener rol por id
- `POST /roles` — registrar un rol
- `PUT /roles/{id}` — editar nombre, descripción y/o permisos
- `DELETE /roles/{id}` — eliminar rol (requiere `?confirmar=true`; falla si tiene usuarios asignados)

### Tipos de documento (`/tipos_documento`)
- `GET /tipos_documento` — listar tipos de documento
- `GET /tipos_documento/{codigo}` — obtener tipo de documento por código (CC, NIT, CE, PP...)
- `POST /tipos_documento` — registrar un tipo de documento
- `PUT /tipos_documento/{codigo}` — editar el nombre
- `DELETE /tipos_documento/{codigo}` — eliminar (requiere `?confirmar=true`; falla si tiene usuarios asignados)

### Proveedores (`/proveedores`)
- `GET /proveedores` — listar proveedores
- `GET /proveedores/{id}` — obtener proveedor por id
- `POST /proveedores` — registrar un proveedor
- `PUT /proveedores/{id}` — editar datos de un proveedor
- `DELETE /proveedores/{id}` — eliminar proveedor (requiere `?confirmar=true`)

### Categorías (`/categorias`)
- `GET /categorias` — listar categorías
- `GET /categorias/{nombre}/lotes` — lotes de una categoría (filtros opcionales: `cantidad_min`, `solo_activos`; soporta paginación con `limite` y orden con `ordenar`)
- `POST /categorias` — crear una categoría
- `PUT /categorias/{nombre}` — renombrar una categoría (la FK con CASCADE actualiza los lotes)
- `DELETE /categorias/{nombre}` — eliminar categoría (falla si tiene lotes asociados, FK RESTRICT)

### Lotes (`/lotes`)
- `GET /lotes` — listar lotes (filtros opcionales: `categoria`, `estado`, `productor_id`)
- `GET /lotes/{producto}` — buscar lote(s) por coincidencia parcial de nombre de producto
- `POST /lotes` — registrar un lote (el `productor_id` debe ser un usuario con rol Productor)
- `PUT /lotes/{id}` — editar producto, cantidad, categoría, precio_kg, estado y/o fecha_cosecha
- `DELETE /lotes/{id}` — eliminar lote (requiere `?confirmar=true`; falla si tiene reservas activas)

### Reservas (`/reservas`)
- `GET /reservas` — listar reservas (filtros opcionales: `estado`, `comprador_id`, `lote_id`, `fecha_desde`, `fecha_hasta`)
- `GET /reservas/fechas` — buscar reservas por rango de fechas (`fecha_desde` y `fecha_hasta` obligatorios, formato `YYYY-MM-DD`)
- `POST /reservas` — crear una reserva (descuenta kg del lote y registra el estado inicial en el historial)
- `PUT /reservas/{id}/estado` — actualizar comprador_id, fecha y/o estado (si cambia el estado, guarda bitácora)
- `DELETE /reservas/{id}` — eliminar reserva (solo si el estado es `Cancelada`; requiere `?confirmar=true`)

### Favoritos (`/favoritos`)
- `GET /favoritos?comprador_id=` — listar productores favoritos de un comprador
- `POST /favoritos` — marcar un productor como favorito de un comprador
- `DELETE /favoritos/{comprador_id}/{productor_id}` — quitar un productor de favoritos (requiere `?confirmar=true`)

### Soporte (`/soporte`)
- `POST /soporte` — enviar un mensaje de soporte desde cualquier panel (queda con estado `Pendiente`)
- `GET /soporte` — listar tickets de soporte (uso administrativo)
- `PUT /soporte/{id}/estado` — cambiar el estado de un ticket (`Pendiente`, `En proceso`, `Resuelto`)
- `DELETE /soporte/{id}` — eliminar un ticket de soporte (requiere `?confirmar=true`)

### Historial y reportes
- `GET /historial_seguimiento` — historial de movimientos de lotes
- `GET /compras` — historial de compras
- `GET /ventas` — historial de ventas
- `GET /historial_reservas` — historial de cambios de estado de reservas

## Manejo de errores

Cada módulo lanza sus propias excepciones (carpeta `Excepciones/`), y `main.py` las captura con `@app.exception_handler(...)` para devolver siempre el formato de respuesta estándar con el código HTTP correcto:

| Excepción | Código HTTP | Módulo |
|---|---|---|
| ErrorUsuarioNoExiste | 404 | Usuarios |
| ErrorUsuarioYaExiste | 400 | Usuarios |
| ErrorRolInvalido | 400 | Usuarios |
| ErrorLoteNoEncontrado | 404 | Lotes |
| ErrorLoteYaExiste | 400 | Lotes |
| ErrorCantidadInvalida | 400 | Lotes |
| ErrorCategoriaInvalidaEnLote | 400 | Lotes |
| ErrorCategoriaNoEncontrada | 404 | Categorías |
| ErrorCategoriaYaExiste | 400 | Categorías |
| ErrorCantidadMinNegativa | 400 | Categorías |
| ErrorCategoriaConLotes | 409 | Categorías |
| ErrorReservaNoEncontrada | 404 | Reservas |
| ErrorReservaYaExiste | 400 | Reservas |
| ErrorReservaNoEliminable | 409 | Reservas |
| ErrorStockInsuficiente | 400 | Reservas |
| ErrorProductoNoEncontrado | 404 | Reservas |
| ErrorEstadoInvalido | 400 | Reservas |
| ErrorCredencialesInvalidas | 401 | Autenticación |
| ErrorProveedorNoEncontrado | 404 | Proveedores |
| ErrorProveedorYaExiste | 400 | Proveedores |
| ErrorFavoritoYaExiste | 400 | Favoritos |
| ErrorFavoritoNoEncontrado | 404 | Favoritos |
| ErrorSoporteNoEncontrado | 404 | Soporte |

Además, cualquier excepción no controlada es capturada por un manejador genérico que responde con HTTP 500.

## Middleware

- **CORS**: habilitado para `http://127.0.0.1:5500`, `http://localhost:5500` (frontend servido con Live Server) y `http://127.0.0.1:8000`, métodos `GET`, `POST`, `PUT`, `DELETE`, con credenciales permitidas.
- **Logging**: un middleware (`LoggingMiddleware`) registra cada petición (método, ruta, código de estado, duración) usando el logger centralizado de `Utilidades/logger.py` — con nivel según el status code, y persistido en `backend/logs/backend.log` además de consola. Los errores no controlados (HTTP 500) quedan con traceback completo en ese archivo.

## Migraciones de esquema

- `Base.metadata.create_all()` sigue corriendo al iniciar la app, pero **solo crea tablas que no existen** — nunca modifica columnas ni constraints de tablas ya creadas.
- Para bases de datos que ya tenían el esquema viejo, correr una única vez `python migracion_esquema.py` (desde `backend/scr`, con `python ../migracion_esquema.py`) — es idempotente, seguro de correr varias veces.
- De aquí en adelante, los cambios de esquema se manejan con **Alembic** (`backend/alembic/`). Primer uso, después de correr `migracion_esquema.py`:
  ```
  alembic stamp head
  ```
  Cambios futuros:
  ```
  alembic revision --autogenerate -m "descripción del cambio"
  alembic upgrade head
  ```

## Notas

- El CORS está restringido a los orígenes listados en `main.py`; ajustar `allow_origins` según el dominio real del frontend en producción.
- La clave secreta del JWT (`CLAVE_SECRETA` en `Utilidades/seguridad.py`) está escrita directamente en el código para simplificar el proyecto; en un entorno real debería venir de una variable de entorno.
- Los ids de `Lote` y `Usuario` los sigue calculando/enviando el cliente (`LoteCrear.id`, `UsuarioCrear.id`) en vez de que la base de datos los genere automáticamente. Es una limitación conocida heredada del diseño original; migrarla implicaría cambiar los formularios de registro/publicación de lote y el esquema de esas tablas a `GENERATED BY DEFAULT AS IDENTITY`. Los ids de Reservas, Pagos, Entregas, Calificaciones y Disputas sí se calculan en el backend (`Utilidades/ids.py`), con un `pg_advisory_xact_lock` para que dos peticiones simultáneas no generen el mismo id.

## Seguridad y recuperación de contraseña

- **Recuperación de contraseña simulada:** `POST /auth/recuperar-clave` no envía correos; devuelve `token_recuperacion` (15 min, un solo uso) solo si el usuario existe y está activo. `POST /auth/restablecer-clave` lo usa para cambiar la clave real.
- **Cambio de clave propio:** `POST /auth/cambiar-clave` (requiere sesión) exige `clave_actual` y `clave_nueva`.
- **Regla de contraseña:** 8+ caracteres, mayúscula, número y carácter especial (`Utilidades/validacion_clave.py`), aplicada en registro, edición de usuarios, restablecer y cambiar clave.
- **Endpoints protegidos:**
  - `GET /usuarios` y `GET /compras`, `GET /ventas`: solo Administrador.
  - `GET /historial_seguimiento` y `GET /historial_reservas`: Productor (solo sus lotes) o Administrador.
  - `GET /usuarios/me`: perfil completo del usuario con sesión.
- **Endpoints públicos sin datos personales:** `GET /usuarios/productores` (solo datos públicos) y `GET /usuarios/resumen-publico` (conteos).

## Pruebas

```
cd backend
python tests/test_integracion.py
python tests/test_recuperacion.py
python tests/test_seguridad.py
python tests/test_contrato_frontend.py   # datos que envía el frontend vs. esquemas del backend
python tests/servidor_e2e.py             # servidor de pruebas (SQLite) para `npm run test:e2e` del frontend
```

Para arrancar el servidor: `cd scr` y `uvicorn main:app --reload --port 8000`. Las variables de `.env` (`DATABASE_URL`, `CLAVE_SECRETA`) están definidas pero hoy la conexión y la clave JWT se leen de los módulos `Conexion/database.py` y `Utilidades/seguridad.py`.
