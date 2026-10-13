# SOFIA — Frontend SPA

> Aplicación web cliente (Single Page Application) de **SOFIA** (Sistema Optimizado Farmacéutico con Inteligencia Artificial), plataforma SaaS de gestión para farmacias y cadenas de boticas en Perú.
> Diseñada para arquitectura multiempresa (cada empresa es un tenant aislado) y multisucursal.
> Consume la API REST del repositorio hermano [sofia-apis](https://github.com/SoyGustavoFernandez/sofia-apis).

---

## 📋 Funcionalidades del sistema

### Acceso y gestión de sesión

- **Registro de empresa** (`/auth/register`): Formulario público de alta de farmacia. Registra en un solo paso la empresa (con periodo de prueba de 30 días), la sucursal matriz y la cuenta administradora inicial. La dirección de la sucursal matriz es obligatoria y se indica que aparecerá en el encabezado de las boletas.
- **Inicio de sesión** (`/auth/login`): la API devuelve un access token JWT (15 min) que la SPA guarda en `localStorage` (`sofia_token`) y envía como `Bearer` solo a las peticiones de la propia API; el refresh token (7 días) viaja en una cookie `HttpOnly`/`Secure` (`withCredentials: true`) y renueva la sesión en segundo plano.
- **Protección CSRF**: Las peticiones de refresco (`/auth/refresh`) y cierre de sesión (`/auth/logout`) envían la cabecera `X-SOFIA-CSRF: '1'`.
- **Cierre de sesión**: envía `POST /auth/logout` (revoca el refresh token en el backend), limpia de inmediato el estado local (token, borradores del POS, filtros de búsqueda y permisos en memoria) y redirige al login cuando el servidor responde.
- **Recuperación de contraseña**: Flujo completo implementado y enrutado:
  - Solicitud de enlace: `/auth/forgot-password` (`ForgotPasswordComponent`).
  - Restablecimiento: `/auth/reset-password` (`ResetPasswordComponent`), procesando el token seguro enviado al correo del empleado.
- **Cambio de clave** (`/cambiar-clave`): disponible desde el menú de perfil. Es obligatorio (el usuario queda confinado a esta pantalla) para las cuentas creadas por un administrador o cuando un administrador fuerza el cambio; al guardar se cierran todas las sesiones y hay que volver a iniciar sesión.

### Seguridad y permisos (RBAC)

- **Rutas**: `permissionGuard` exige el permiso `Leer` del módulo de cada ruta según `ROUTE_PERMISSIONS` (`core/auth/route-permissions.ts`). Las rutas de alta y carga masiva (`/nueva`, `/carga-masiva`) exigen además `Crear`, con tres excepciones: `/recetas-medicas/escanear` → `Recetas:Analizar`, `/sesiones-caja/nueva` → `POS:AperturarCaja` y `/stock-por-sucursal/nueva` → `Inventarios:Actualizar`. Sin permiso, se redirige al dashboard con un aviso.
- **Acciones**: la directiva `*appPermiso="'Accion'"` (o `'Modulo:Accion'`) oculta los botones que el usuario no puede usar; por ejemplo, anular una venta requiere `Ventas:Anular` y devolverla `Devoluciones:ProcesarDevolucion`.
- Los permisos se cargan de `GET /auth/me`; la API valida igualmente cada llamada.
- El menú lateral (sidebar) filtra reactivamente las opciones disponibles según los permisos otorgados al usuario. El rol `Admin` visualiza la suite completa.
- Las vistas de stock e inventario se acotan a las **sucursales permitidas** del usuario; las operaciones de cobro y caja operan estrictamente en la **sucursal base**.

### Seguridad en el cliente

- El token `Bearer` solo se adjunta a las peticiones de la propia API (`isApiRequest`), nunca a `/i18n` ni a otros hosts. Ante un `401` se intenta un único refresh y se reintenta la petición; si falla, se cierra la sesión.
- Los datos locales (borradores del POS) se guardan por usuario; al iniciar sesión se eliminan los de otros usuarios y al cerrar sesión se eliminan todos.
- Tras 5 intentos fallidos la cuenta se bloquea 15 minutos (regla del backend). El login distingue credenciales inválidas, empresa sin suscripción vigente y servicio no disponible.
- Si el empleado no tiene correo registrado, la recuperación de contraseña no envía ningún enlace (la respuesta es la misma por seguridad).

### Navegación y estructura de menú

| Grupo                    | Pantallas y Rutas                                                                                                                                                                                                                                                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Principal**            | Dashboard (`/dashboard`) con cifras reales de ventas, caja, inventario, cuarentena y devoluciones; cada bloque se muestra según los permisos del usuario y se actualiza al abrir la pantalla o con el botón "Actualizar"                                                                                                                                     |
| **Administración**       | Empresa (`/empresas`), Sucursales (`/sucursales`), Empleados (`/empleados`), Roles & Permisos (`/roles`), Cuentas de Usuario (`/cuentas`)                                                                                                                                                                                                                    |
| **Catálogos**            | Unidades de Medida (`/unidades-medida`), Jerarquías UdM (`/jerarquias`), Laboratorios (`/laboratorios`), Ingredientes Activos (`/ingredientes-activos`), Medicamentos (`/medicamentos`), Presentaciones de Venta (`/presentaciones-venta`), Formulaciones Clínicas (`/formulaciones-clinicas`), Proveedores (`/proveedores`), Aseguradoras (`/aseguradoras`) |
| **Inventario**           | Lotes (`/lotes`), Stock por Sucursal (`/stock-por-sucursal`)                                                                                                                                                                                                                                                                                                 |
| **Punto de Venta**       | Sesiones de Caja (`/sesiones-caja`), Ventas POS (`/pos`, nueva venta en `/pos/nueva`, detalle en `/pos/:id`)                                                                                                                                                                                                                                                 |
| **Pacientes & Atención** | Pacientes (`/pacientes`), Profesionales de Salud (`/profesionales-salud`), Recetas Médicas (`/recetas-medicas`, alta en `/recetas-medicas/nueva`, detalle en `/recetas-medicas/:id`, escáner en `/recetas-medicas/escanear`)                                                                                                                                 |
| **DIGEMID**              | Catálogo DIGEMID (`/digemid-catalogo`)                                                                                                                                                                                                                                                                                                                       |
| **SUNAT**                | Series Fiscales (`/series-fiscales`)                                                                                                                                                                                                                                                                                                                         |

### Módulos clave y experiencia de usuario

- **Punto de Venta (POS):**
  - Catálogo con búsqueda por nombre comercial y filtro por condición de venta (muestra precio, stock de la sucursal y si requiere receta); luego se elige el lote y, opcionalmente, la presentación de venta (ej. "Caja x10"). El precio lo fija el catálogo: no se puede editar en el POS.
  - **Recetas en el POS**: se selecciona al cliente y una de sus recetas registradas, o se escanea una receta con IA (requiere `Recetas:Analizar`) y se agregan al carrito los productos detectados con stock.
  - **Control de recetas**: los productos de receta retenida o estupefacientes exigen una receta registrada que tenga número de receta. Para receta simple depende del parámetro de empresa `exigirRegistroReceta`: si está activo se exige la receta registrada; si no, el cajero debe marcar "Receta verificada" antes de cobrar.
  - Pagos divididos por medio de pago (Efectivo, Yape/Plin, Tarjeta, Transferencia), siempre en soles. Los pagos que no son en efectivo exigen N° de operación y el vuelto no puede superar el efectivo recibido.
  - **Ventas en espera:** "Guardar y atender siguiente" registra la venta como `Pendiente` en el servidor; se retoma y cobra desde su detalle (`/pos/nueva?continuar=<id>`). Además, el carrito en curso se autoguarda en el navegador por usuario (solo IDs, sin datos personales) y expira a las 12 horas.
  - Al cobrar se registra una boleta con numeración propia (serie + correlativo). Requiere que la empresa tenga RUC y una serie de Boleta activa en la sucursal. Aún no se envía a SUNAT: el comprobante queda como "Pendiente de envío a SUNAT" (falta integrar OSE/PSE).
  - **Comprobante**: al cobrar se muestra el comprobante y se puede imprimir en formato térmico de 80 mm; se reimprime desde el detalle de la venta (salvo ventas anuladas). Tras los pagos imprime el vuelto entregado ("Vuelto"), y una línea vendida por presentación se imprime como "1 × Caja (10)" con el precio de la presentación. El detalle de la venta también muestra el vuelto.
  - **Anulación**: desde el detalle de la venta, con motivo; requiere `Ventas:Anular` y no aplica si la venta ya tiene devoluciones. Anular una venta cobrada exige además tener tu propia caja abierta en la sucursal; sin ella, el detalle muestra un aviso. Las ventas en espera se pueden descartar sin caja.
  - **Caja**: solo se vende con una sesión de caja propia abierta en la sucursal base; la apertura registra el monto inicial y el cierre compara el monto declarado contra el calculado por el servidor.
- **Devoluciones de Venta:**
  - Modal integrado `DevolverVentaDialogComponent` en el detalle de la venta (`/pos/:id`), permitiendo devoluciones totales o parciales con emisión de nota de crédito y reembolso desde la caja activa vía `POST /api/v1/devoluciones`. Requiere el permiso `Devoluciones:ProcesarDevolucion`, una caja propia abierta y una serie de Nota de Crédito activa; por cada línea se elige reingreso a stock o cuarentena DIGEMID, y se indica el medio de reembolso.
- **Recetas Médicas con IA:**
  - Búsqueda y listado paginado en `/recetas-medicas`.
  - Escáner de recetas en `/recetas-medicas/escanear`: Carga de fotografías de recetas médicas procesadas por Gemini + Presidio API en el backend para reconocimiento de texto y sugerencia de fármacos.
- **Carga Masiva y Exportación:**
  - Carga masiva (.xlsx, máximo 5 MB y 5 000 filas) en 12 entidades con previsualización interactiva: Sucursales, Roles, Unidades de Medida, Jerarquías UdM, Laboratorios, Ingredientes Activos, Medicamentos, Proveedores, Aseguradoras, Pacientes, Profesionales de Salud y Catálogo DIGEMID.
  - Exportación a Excel de los resultados de búsqueda en todos los maestros y también en Ventas, Sesiones de Caja, Recetas, Lotes y Stock por Sucursal (Cuentas de Usuario no tiene exportación).
- **Administración e inventario:**
  - **Empresa**: cada empresa ve y edita solo su propia ficha (sin alta, eliminación ni carga masiva).
  - **Roles & Permisos**: detalle con pestañas de vista previa del menú, permisos por módulo/acción y sucursales.
  - **Cuentas de Usuario**: alta de cuentas para empleados, activación/desactivación, forzar cambio de contraseña, reinicio de intentos, rol y sucursales asignadas.
  - **Maestros**: búsqueda con filtros, detalle con modo lectura/edición y eliminación con confirmación; el Catálogo DIGEMID no tiene alta manual. Si un medicamento, sucursal, paciente, profesional de salud, ingrediente activo o proveedor está en uso, la API rechaza la eliminación y su pantalla de detalle muestra un aviso traducido.
  - **Proveedores**: el detalle incluye la tarjeta "Precios de compra" con el historial de precios y el botón "Registrar precio" (requiere `Proveedores:RegistrarPrecioProveedor`); el diálogo muestra el costo neto mientras se escribe el precio y el descuento.
  - **Stock por Sucursal**: consulta por lote y sucursal (solo sucursales permitidas), ingreso y ajuste de cantidad.
  - **Series Fiscales**: series de Boleta, Factura, Nota de Crédito y Proforma por sucursal.

---

## 📦 Stack tecnológico

| Componente                  | Tecnología                              | Versión                                                                                                                     |
| --------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Framework Base**          | Angular                                 | `~20.3.32` (Standalone components, Control Flow `@if/@for`, Signals)                                                        |
| **Librería de Componentes** | Angular Material / CDK                  | `~20.2.14` (Tema Material 3)                                                                                                |
| **Iconografía**             | Material Icons / Iconify / Tabler Icons | Fuente Material Icons (Google Fonts), `@iconify/iconify` `2.0.3` (empaquetado localmente), `angular-tabler-icons` `^3.26.0` |
| **Reactividad y Estado**    | Angular Signals & RxJS                  | Signals nativos de Angular + RxJS `~7.8.2`                                                                                  |
| **Change Detection**        | Zone.js                                 | `~0.15.1` (con `eventCoalescing: true`)                                                                                     |
| **Lenguaje**                | TypeScript                              | `~5.8.3` (Target ES2022, Strict mode)                                                                                       |
| **Build Tool & Bundler**    | Angular CLI / Webpack                   | `@angular-devkit/build-angular:browser` `~20.3.37`                                                                          |
| **Internacionalización**    | @jsverse/transloco                      | `^7.6.1` (26 scopes en uso cargados bajo demanda, idiomas `es`/`en`, default `es`)                                          |
| **Estilos**                 | SCSS / MatDash PRO                      | SCSS modular (`sass` `^1.97.3`), soporte responsive                                                                         |
| **Pruebas Unitarias**       | Karma + Jasmine                         | Karma `~6.4.0`, Jasmine `~5.6.0`, soporte ChromeHeadlessCI                                                                  |
| **Linters y Formato**       | ESLint + Prettier                       | ESLint `^9.39.3` (Flat Config), Prettier `^3.8.3`                                                                           |
| **Git Hooks**               | Husky + Commitlint + Lint-Staged        | Husky `^8.0.3`, Commitlint `^19.8.1`, Lint-Staged `^16.3.1`                                                                 |

---

## 🗂️ Estructura del proyecto

- `src/app/core`: autenticación y permisos (`auth`), guardias, interceptores HTTP, servicios transversales y configuración de Transloco.
- `src/app/shared`: componentes, directivas, pipes, modelos y utilidades compartidas.
- `src/app/matdash`: plantilla base MatDash (layouts, configuración, pipes y servicios).
- `src/app/pages`: una carpeta por funcionalidad (búsqueda, detalle, modelos y servicios junto a sus rutas).
- Alias de rutas de TypeScript: `@core/*`, `@shared/*`, `@matdash/*` y `@environment/*`.
- **Internacionalización:** idiomas `es`/`en`, archivos en `public/i18n/{scope}/{lang}.json`; el idioma se cambia desde la cabecera.
- **Pruebas:** 75 archivos `*.spec.ts` junto al código que prueban.

---

## ⚙️ Configuración de entornos y APIs

### URL Base de la API

- **Desarrollo local por defecto:** `https://localhost:7300`
- **Puerto local de la SPA:** `http://localhost:4200`

### Arquitectura de configuración dual (Build-time vs Runtime)

1. **Build-time (`src/environments/`):**
   - `environment.ts`: valores por defecto (`https://localhost:7300`); es el que usan las pruebas unitarias (`ng test`), porque los builds `development` y `production` lo reemplazan.
   - `environment.local.ts`: **no versionado** (`.gitignore`); reemplaza a `environment.ts` en `npm start` y `npm run watch`. Cada desarrollador lo crea (ver Guía de ejecución local).
   - `environment.prod.ts`: Configuración de producción (`api.baseurl: ''`), preparada para delegar la resolución al runtime.

2. **Runtime (`public/environment.js`):**
   - El archivo `public/environment.js` se carga de forma síncrona en el `<head>` de `src/index.html` mediante `<script src="environment.js"></script>`.
   - Expone la variable global `window.__env`.
   - `resolveEnvironment()` usa `window.__env` solo si es un objeto completo y válido (`production` booleano y `api.baseurl` no vacío); en ese caso **reemplaza** toda la configuración compilada, por lo que también debe incluir `appVersion`. El archivo versionado contiene `window.__env = {};`, que no altera nada: en producción, con `baseurl: ''`, la SPA llama a `/api/v1/...` en su mismo origen.
   - Para apuntar a otro backend sin recompilar, sobrescribe `environment.js` en el despliegue:

     ```js
     window.__env = {
       production: true,
       appVersion: '1.0.0',
       api: { baseurl: 'https://api.tu-dominio.com' },
     };
     ```

   - Si la API vive en otro origen, agrégalo también a `connect-src` en `public/staticwebapp.config.json`; la CSP actual solo permite `'self'`.

---

## 🚀 Guía de ejecución local

### Requisitos previos

- **Node.js:** Versión 20.19+ o 22.12+ (LTS recomendado).
- **npm:** el que acompaña a Node 20/22 (npm 10); el repo no fija versión mínima.
- **Backend SOFIA:** Servidor [sofia-apis](https://github.com/SoyGustavoFernandez/sofia-apis) corriendo en `https://localhost:7300`.

### Paso 1: Instalación de dependencias y Git hooks

```bash
cd sofia-web-spa
npm install
```

_Nota: `npm install` ejecuta automáticamente el script `prepare` que inicializa los hooks de Husky en el repositorio._

### Paso 2: Crear la configuración local (obligatorio)

`src/environments/environment.local.ts` está en `.gitignore` y el build de desarrollo lo exige. Sin él, `npm start` y `npm run watch` fallan con `The ... environment.local.ts path in file replacements does not exist`. Créalo con este contenido:

```ts
import { WebEnvironment } from './environment.model';

export const environment: WebEnvironment = {
  production: false,
  appVersion: '1.0.0',
  api: {
    baseurl: 'https://localhost:7300',
  },
};
```

Para apuntar la SPA a otro backend en desarrollo, cambia `api.baseurl` en ese archivo. Si la base de datos está vacía, registra una empresa en `/auth/register` para obtener el primer usuario administrador.

### Paso 3: Iniciar servidor de desarrollo

```bash
npm start
```

Inicia el dev-server en `http://localhost:4200/` y abre automáticamente el navegador predeterminado.

---

## 🛠️ Scripts disponibles en `package.json`

| Comando             | Acción y Comportamiento                                                                                                                                                                                                                                               |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm start`         | Inicia el servidor de desarrollo (`ng serve -o`) en `http://localhost:4200`.                                                                                                                                                                                          |
| `npm run build`     | Compila el bundle optimizado para **Producción** (AOT, minificación, hashing de assets en `dist/sofia-web-spa`). El paquete inicial tiene un presupuesto de 5 MB: el build falla si lo supera.                                                                        |
| `npm run watch`     | Compila en modo desarrollo con observador de cambios en vivo (`--watch`).                                                                                                                                                                                             |
| `npm test`          | Ejecuta las pruebas unitarias con Karma y Jasmine en modo watch; lanza Chrome y una instancia headless (ambos navegadores están definidos en `karma.conf.js`).                                                                                                        |
| `npm run test:ci`   | Ejecuta las pruebas unitarias una sola vez en modo headless (`ChromeHeadlessCI`), ideal para pipelines.                                                                                                                                                               |
| `npm run lint`      | Ejecuta `@angular-eslint/builder:lint` aplicando correcciones automáticas (`--fix`) sobre `core`, `pages` y `shared`.                                                                                                                                                 |
| `npm run lint:fast` | ESLint sobre todo el proyecto con caché (`node_modules/.cache/eslint`) y auto-fix (`--fix`).                                                                                                                                                                          |
| `npm run lint:ci`   | Lint de todo el proyecto sin auto-fix, cargando el `tsconfig` (`ESLINT_TYPEAWARE=true`) y fallando ante cualquier warning (`--max-warnings=0`). El script define la variable con sintaxis POSIX: en Windows ejecútalo desde Git Bash/WSL (en `cmd`/PowerShell falla). |

---

## 🧪 Calidad de código y Git Hooks

- **pre-commit:** Dispara `lint-staged`:
  - Archivos `*.{ts,tsx,js,mjs,cjs}`: `eslint --cache --fix`.
  - Archivos `*.{html,css,scss,md,json,yml,yaml}`: `prettier --write`.
- **commit-msg:** Valida que el mensaje cumpla la convención de [Conventional Commits](https://www.conventionalcommits.org/):
  ```
  tipo(alcance): descripción
  ```
  - _Tipos válidos:_ `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
  - _Alcance:_ opcional, en `kebab-case`.
  - _Descripción:_ sin mayúscula inicial ni punto final; cabecera de máximo 100 caracteres.

---

## 🚢 Despliegue

- `npm run build` genera `dist/sofia-web-spa`.
- Pensado para Azure Static Web Apps: `public/staticwebapp.config.json` define las cabeceras de seguridad (CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`, HSTS y `Permissions-Policy`).
- El repositorio no incluye pipeline de CI/CD ni archivos de contenedor.
- **Tareas pendientes de despliegue:**
  - Si la API vive en otro origen, agregarlo a `connect-src` en `public/staticwebapp.config.json`; hoy la CSP solo permite el propio origen (más los hosts de Iconify).
  - `public/staticwebapp.config.json` no define `navigationFallback`. En Azure Static Web Apps, abrir directamente una ruta interna del cliente (por ejemplo, el enlace de recuperación de contraseña) normalmente necesita ese respaldo hacia `/index.html`.

---

## 🚧 Limitaciones conocidas y trabajo futuro

1. **Aseguradoras en Punto de Venta:** El bloque de aseguradoras dentro del formulario de nueva venta está deshabilitado temporalmente (`mostrarAseguradora = false` en `nueva-venta.component.ts`).
2. **Módulos backend con UI pendiente:** Transferencias entre sucursales, Delivery, Órdenes Magistrales, Agenda de Servicios e Inmunizaciones, Cuarentena y Actas de Destrucción DIGEMID, consulta de devoluciones (listado/detalle) y Auditoría existen en la API pero no tienen pantalla enrutada en la SPA.
3. **Código sin uso pendiente de depuración:** el componente `pages/empresa/empresa-maintenance`, el componente `shared/components/carga-masiva` (reemplazado por `carga-masiva-page`), siete scopes de traducción que ninguna pantalla carga (`auditoria`, `inventarios`, `login`, `seguridad`, `servicios`, `transferencias`, `uom` en `public/i18n/`) y el menú del layout horizontal de la plantilla (`matdash/layouts/full/horizontal/sidebar/sidebar-data.ts`), que apunta a rutas inexistentes.

---

## 🔗 Repositorio relacionado

- [sofia-apis](https://github.com/SoyGustavoFernandez/sofia-apis) — Backend .NET (API REST consumida por esta SPA).
