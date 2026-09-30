# SOFIA - Frontend SPA

Aplicación web (SPA) de **SOFIA** (Sistema Optimizado Farmacéutico con Inteligencia Artificial), plataforma SaaS de gestión para farmacias en Perú: multiempresa (cada empresa es un tenant aislado) y multisucursal.

Construida con Angular 20 (standalone components) sobre la plantilla MatDash PRO. Consume la API REST de [sofia-apis](../sofia-apis), donde están documentadas en detalle las reglas de negocio de cada módulo.

## Funcionalidad

### Acceso y sesión

- **Registro de empresa** (`/auth/register`): cualquier persona puede registrar su farmacia. Se crean la empresa (con 30 días de prueba), su sede principal y el usuario administrador, que entra directamente al sistema.
- **Login** (`/auth/login`): la sesión se mantiene con un refresh token en cookie `HttpOnly` que se renueva en segundo plano; `refresh` y `logout` envían la cabecera anti-CSRF `X-SOFIA-CSRF`.
- **Logout**: espera a que el servidor revoque la sesión antes de salir y borra los datos locales del usuario.
- **Mensaje específico** si la suscripción de la empresa no está vigente. Tras 5 intentos fallidos la cuenta se bloquea 15 minutos; por seguridad, el login muestra el mismo mensaje que con credenciales inválidas.
- **Cambiar contraseña** (`/cambiar-clave`). Si la cuenta la creó un administrador, el usuario queda confinado a esta pantalla hasta cambiar su contraseña.
- La recuperación de contraseña **aún no tiene pantalla** (el backend tampoco envía el correo).

### Permisos

- Cada ruta exige el permiso de lectura de su módulo (`core/auth/route-permissions.ts`) y el **sidebar solo muestra las opciones permitidas**. El rol `Admin` ve todo.
- Las acciones sensibles se muestran solo con el permiso correspondiente (p. ej. anular una venta requiere `Ventas:Anular`).
- Las pantallas de stock solo ofrecen las **sucursales permitidas** del usuario; el POS opera sobre su **sucursal base**.

### Navegación (grupos del sidebar)

| Grupo                | Pantallas                                                                                                                                                   |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Administración       | Empresa, Sucursales, Empleados, Roles & Permisos, Cuentas de Usuario                                                                                        |
| Catálogos            | Unidades de Medida, Jerarquías UdM, Laboratorios, Ingredientes Activos, Medicamentos, Presentaciones de Venta, Fórmulas Clínicas, Proveedores, Aseguradoras |
| Inventario           | Lotes, Stock por Sucursal                                                                                                                                   |
| Punto de Venta       | Sesiones de Caja, Ventas (POS)                                                                                                                              |
| Pacientes & Atención | Pacientes, Profesionales de Salud, Recetas Médicas                                                                                                          |
| DIGEMID              | Catálogo DIGEMID                                                                                                                                            |
| SUNAT                | Series Fiscales                                                                                                                                             |

### Qué hace cada módulo

- **Empresa**: cada empresa solo ve y edita su propia ficha (sin carga masiva ni eliminación).
- **Roles & Permisos**: detalle con pestañas de menú, permisos por módulo/acción y sucursales asignadas al rol. Los cambios se aplican de inmediato.
- **Cuentas de Usuario**: alta de cuentas para empleados (con cambio de contraseña obligatorio), activación/desactivación, forzar cambio de contraseña, desbloqueo (reinicio de intentos), roles y sucursales adicionales.
- **Maestros** (catálogos, pacientes, profesionales, sucursales, empleados, lotes, series fiscales): búsqueda con filtros, detalle con modo lectura/edición, eliminación con confirmación (bloqueada si el registro está en uso) y **exportación a Excel**.
- **Carga masiva** (descargar plantilla → subir → previsualizar → confirmar): solo `.xlsx`, máximo **5 MB** y **5 000 filas** (se valida antes de subir). Disponible en Sucursales, Roles, Unidades de Medida, Jerarquías UdM, Laboratorios, Ingredientes Activos, Medicamentos, Proveedores, Aseguradoras, Pacientes, Profesionales de Salud y Catálogo DIGEMID.
- **Stock por Sucursal**: consulta de stock por lote y sucursal, registro de ingreso y ajuste de cantidad.
- **Sesiones de Caja**: apertura de la caja del cajero conectado con su monto inicial, consulta y cierre con arqueo (el efectivo esperado lo calcula el servidor; solo el dueño de la caja o un Admin puede cerrarla).
- **Ventas (POS)**:
  - Carrito con búsqueda de productos por lote, venta por presentación (p. ej. "Caja x10") y precios fijados por el catálogo.
  - Pagos divididos (Efectivo, Yape/Plin, Tarjeta, Transferencia) con cálculo de vuelto; el vuelto no puede superar el efectivo recibido.
  - **Ventas pendientes**: guardar la venta en espera y retomarla después. El borrador se guarda en el navegador solo con IDs (sin datos personales) y expira a las 12 horas.
  - **Recetas en el POS**: seleccionar una receta del cliente o escanear una foto de receta con IA y agregar al carrito los productos detectados que tengan stock. Los productos con receta obligatoria se rechazan sin una receta válida del mismo paciente.
  - Los lotes vencidos no aparecen en el selector; los lotes en cuarentena se rechazan.
  - Se emite una boleta al cobrar (requiere una serie de Boleta activa en la sucursal).
  - Búsqueda y detalle de ventas, con **anulación** (requiere `Ventas:Anular`; bloqueada si la venta tiene devoluciones).
  - El bloque de aseguradora del POS existe pero está **deshabilitado** (`mostrarAseguradora = false` en `nueva-venta.component.ts`).
- **Recetas Médicas**: escáner de recetas con IA (Gemini + anonimización con Presidio en el backend) que devuelve los medicamentos detectados con su nivel de confianza.
- **Series Fiscales**: series de Boleta, Factura, Nota de Crédito y Proforma por sucursal (una activa por tipo; bloqueadas si ya emitieron comprobantes).

### Módulos del backend sin pantalla

La API ya expone estos módulos, pero la SPA todavía no tiene pantallas enrutadas para ellos: Devoluciones, Transferencias entre sucursales, Delivery, Órdenes Magistrales, Cuarentena y Actas de Destrucción DIGEMID, Agenda de Servicios e Inmunizaciones, y Auditoría de Seguridad.

Las pantallas de búsqueda/detalle de recetas (`recetas-search`, `recetas-detail`) existen en el código pero no están enrutadas; hoy `/recetas-medicas` muestra solo el escáner. Las carpetas `auditoria`, `inventarios`, `servicios`, `transferencias` y `uom` de `pages/` tampoco tienen ruta registrada.

## Stack técnico

- **Angular 20** (`~20.3`) — standalone components, `ApplicationConfig`, control flow nativo (`@if`/`@for`/`@switch`)
- **Angular Material 20** con tema **Material 3** + **Tabler Icons**
- **Signals** (`signal`, `computed`) para el estado reactivo y **Reactive Forms** para formularios
- **@jsverse/transloco 7** para i18n, con scopes lazy-loaded por feature (`es`/`en`, default `es`)
- **RxJS 7.8**, **SCSS**, **TypeScript 5.8**
- **Karma + Jasmine** para pruebas unitarias
- **ESLint + Prettier + Husky + commitlint** para calidad y convenciones de commits

## Requisitos previos

- Node.js 20.19+ (o 22.12+) y npm
- La API [sofia-apis](../sofia-apis) corriendo en `https://localhost:7300` (ver su README para levantar SQL Server, Presidio, DbUp y la API)

## Desarrollo local

1. Instalar dependencias (también instala los Git hooks de Husky):
   ```bash
   npm install
   ```
2. Iniciar el servidor de desarrollo:
   ```bash
   npm start
   ```
3. La aplicación se abre en `http://localhost:4200/`. Si la base está vacía, registra una empresa en `/auth/register` para tener el primer usuario administrador.

## Scripts disponibles

| Script              | Descripción                                       |
| ------------------- | ------------------------------------------------- |
| `npm start`         | Levanta el servidor de desarrollo (`ng serve -o`) |
| `npm run build`     | Build de producción                               |
| `npm run watch`     | Build en modo desarrollo con watch                |
| `npm test`          | Corre los tests unitarios con Karma/Jasmine       |
| `npm run test:ci`   | Tests en modo headless, sin watch (para CI)       |
| `npm run lint`      | Lint con auto-fix (`ng lint --fix`)               |
| `npm run lint:fast` | Lint incremental con cache                        |
| `npm run lint:ci`   | Lint type-aware, sin warnings permitidos (CI)     |

## Estructura del proyecto

```
src/app/
  core/            Servicios transversales: auth, guards, interceptors, transloco loader, logger
  matdash/         Layouts y utilidades de la plantilla base (full, blank) y datos del sidebar
  shared/          Componentes, directivas, pipes, modelos y estilos reutilizables (incl. carga masiva)
  pages/           Un directorio por feature/módulo de negocio
public/
  i18n/            Traducciones (root + una carpeta por scope, es.json/en.json)
  environment.js   Config runtime (window.__env), sobreescribe el build-time environment
src/environments/  Config build-time (environment.ts / environment.local.ts / environment.prod.ts)
```

### Patrón de feature module

```
pages/{feature}/
  models/{feature}.model.ts
  services/{feature}.service.ts
  {feature}-search/{feature}-search.component.ts + .html   ← búsqueda con filtros y tabla
  {feature}-detail/{feature}-detail.component.ts + .html   ← vista y edición en un solo componente
  {feature}.routes.ts
```

### Path aliases

| Alias            | Apunta a             |
| ---------------- | -------------------- |
| `@core/*`        | `src/app/core/*`     |
| `@shared/*`      | `src/app/shared/*`   |
| `@matdash/*`     | `src/app/matdash/*`  |
| `@environment/*` | `src/environments/*` |

### Convenciones de UI

- **Página de búsqueda** (`/{feature}`): encabezado con breadcrumb, tarjeta de filtros (`Nuevo`, `Buscar`/`Limpiar`, carga masiva en maestros) y tarjeta de resultados (oculta hasta buscar, primera columna como link al detalle, exportar a Excel, paginador).
- **Página de detalle** (`/{feature}/:id` y `/{feature}/nueva`): solo lectura por defecto con botón `Editar`; `/nueva` abre en modo edición. `Eliminar` solo editando un registro existente, con diálogo de confirmación.
- Ver [CLAUDE.md](CLAUDE.md) para el detalle completo de estas reglas y las de codificación.

## Internacionalización (i18n)

- Idiomas: `es` (default) y `en`.
- Cada feature declara su scope con `provideTranslocoScope('scope-name')`; los archivos viven en `public/i18n/{scope}/{es,en}.json` y las traducciones comunes en `public/i18n/{es,en}.json`.
- Ningún texto visible al usuario se hardcodea; todo pasa por Transloco. Los códigos de error del backend (`Entidad.Campo.Motivo`) se traducen a mensajes en cada pantalla.

## Configuración de entorno

- **Build-time**: `src/environments/environment.ts` y `environment.local.ts` apuntan a `https://localhost:7300`; `environment.prod.ts` para producción.
- **Runtime**: `public/environment.js` define `window.__env`; si está presente y es válido, sobreescribe el `baseurl` compilado (permite cambiar la URL de la API por ambiente sin rebuildear).

## Testing

- Karma + Jasmine: `npm test` (watch, Chrome) o `npm run test:ci` (headless).
- Los specs (`*.spec.ts`) viven junto al archivo que prueban.

## Calidad de código y Git hooks

- `npm install` instala los hooks de **Husky** (script `prepare`).
- **pre-commit**: `lint-staged` (ESLint con auto-fix en `.ts/.js`, Prettier en HTML/CSS/SCSS/MD/JSON/YAML).
- **commit-msg**: `commitlint` con [Conventional Commits](https://www.conventionalcommits.org/); scope en `kebab-case`, subject sin mayúscula inicial, header ≤ 100 caracteres (ver `commitlint.config.js`).
- **ESLint** (`eslint.config.js`) con reglas type-aware activables por `ESLINT_TYPEAWARE=true` (así corre `lint:ci`).

## Deployment

- `npm run build` genera la salida en `dist/sofia-web-spa` (AOT, hashing de assets).
- Pensado para **Azure Static Web Apps**: `public/staticwebapp.config.json` define los headers de seguridad, incluida la CSP.
- La URL de la API por ambiente se configura en `public/environment.js`.

## Pendientes / limitaciones conocidas

- Recuperación de contraseña sin pantalla ni envío de correo.
- Seguros/aseguradoras deshabilitado en el POS (no está en producción).
- Devoluciones, transferencias, delivery, magistrales, cuarentena DIGEMID, servicios y auditoría solo disponibles vía API.
- Del lado del backend (ver README de [sofia-apis](../sofia-apis)): sin cifrado de datos personales en reposo, la imagen de la receta se envía a Gemini antes de anonimizar, y la API usa el login `sa` de SQL Server.

## Proyecto relacionado

- [sofia-apis](../sofia-apis) — Backend .NET (API REST consumida por esta SPA).
