# SOFIA - Frontend SPA

Aplicación Web SPA para **SOFIA** (Sistema Optimizado Farmacéutico con Inteligencia Artificial), el sistema de gestión integral para cadenas de farmacias: administración, catálogos, inventario, punto de venta, pacientes/atención, DIGEMID y SUNAT.

Construida con Angular 19 (standalone components) sobre la plantilla MatDash PRO. Consume la API REST de [sofia-apis](../sofia-apis) (backend .NET).

## Stack técnico

- **Angular 19** — standalone components, `ApplicationConfig`, control flow nativo (`@if`/`@for`/`@switch`)
- **Angular Material** + **Tabler Icons** para la UI
- **Signals** (`signal`, `computed`) para todo el estado reactivo
- **Reactive Forms** para formularios
- **@jsverse/transloco** para i18n, con scopes lazy-loaded por feature (`es`/`en`, default `es`)
- **RxJS**, **SCSS**
- **Karma + Jasmine** para pruebas unitarias
- **ESLint + Prettier + Husky + commitlint** para calidad y convenciones de commits

## Requisitos previos

- Node.js 20.x y npm 10.x
- La API backend [sofia-apis](../sofia-apis) corriendo (por defecto en `https://localhost:7300`)

## Desarrollo local

1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Iniciar el servidor de desarrollo:
   ```bash
   npm start
   ```
3. Abrir la aplicación en `http://localhost:4200/`

> `npm start` ejecuta `ng serve -o` y abre el navegador automáticamente.

## Scripts disponibles

| Script              | Descripción                                     |
| ------------------- | ----------------------------------------------- |
| `npm start`         | Levanta el servidor de desarrollo (`ng serve`)  |
| `npm run build`     | Build de producción (usa `environment.prod.ts`) |
| `npm run watch`     | Build en modo desarrollo con watch              |
| `npm test`          | Corre los tests unitarios con Karma/Jasmine     |
| `npm run test:ci`   | Tests en modo headless, sin watch (para CI)     |
| `npm run lint`      | Lint con auto-fix (`ng lint --fix`)             |
| `npm run lint:fast` | Lint incremental con cache, usado en pre-commit |
| `npm run lint:ci`   | Lint type-aware, sin warnings permitidos (CI)   |

## Estructura del proyecto

```
src/app/
  core/            Servicios transversales: auth, guards, interceptors, transloco loader, logger
  matdash/         Layouts y utilidades de la plantilla base (full, blank)
  shared/          Componentes, directivas, pipes, modelos y estilos reutilizables
  pages/           Un directorio por feature/módulo de negocio (ver abajo)
public/
  i18n/            Traducciones (root + una carpeta por scope, es.json/en.json)
  environment.js   Config runtime (window.__env), sobreescribe el build-time environment
src/environments/  Config build-time (environment.ts / environment.local.ts / environment.prod.ts)
```

### Patrón de feature module

Cada módulo de negocio en `pages/{feature}/` sigue esta estructura:

```
pages/{feature}/
  models/{feature}.model.ts
  services/{feature}.service.ts
  {feature}-search/{feature}-search.component.ts + .html   ← búsqueda con filtros y tabla
  {feature}-detail/{feature}-detail.component.ts + .html   ← vista y edición en un solo componente
  {feature}.routes.ts
```

> `empresa` usa un patrón más antiguo (maintenance + register + delete-dialog); no se replica en módulos nuevos. Todo módulo nuevo sigue la estructura de arriba.

### Path aliases

| Alias            | Apunta a             |
| ---------------- | -------------------- |
| `@core/*`        | `src/app/core/*`     |
| `@shared/*`      | `src/app/shared/*`   |
| `@matdash/*`     | `src/app/matdash/*`  |
| `@environment/*` | `src/environments/*` |

### Navegación (grupos del sidebar)

1. **Administración** — Empresa, Sucursales, Empleados, Roles & Permisos, Cuentas de Usuario
2. **Catálogos** — Unidades de Medida, Jerarquías UdM, Laboratorios, Ingredientes Activos, Medicamentos, Presentaciones de Venta, Fórmulas Clínicas, Proveedores, Aseguradoras
3. **Inventario** — Lotes, Stock por Sucursal
4. **Punto de Venta** — Sesiones de Caja, POS (Ventas)
5. **Pacientes & Atención** — Pacientes, Profesionales de Salud, Recetas Médicas
6. **DIGEMID** — Catálogo DIGEMID

Módulos planificados aún no integrados a la navegación: Devoluciones, Reclamos de Seguro, Despachos Delivery, Transferencias, Órdenes Magistrales, Agenda de Servicios, Inmunizaciones, Inventario Cuarentena, Actas de Destrucción, Series Fiscales, Comprobantes Emitidos, Auditoría de Seguridad.

### Convenciones de UI (obligatorias en toda pantalla nueva)

- **Página de búsqueda** (`/{feature}`): 3 tarjetas — encabezado con breadcrumb, filtros (+ botón `Nuevo`, `Buscar`/`Limpiar`), y resultados (tabla oculta hasta buscar, primera columna como link al detalle, exportar a Excel, paginador). Los maestros incluyen carga masiva (plantilla + subida de Excel).
- **Página de detalle** (`/{feature}/:id` y `/{feature}/nueva`): vista de solo lectura por defecto con botón `Editar`; `/nueva` abre directo en modo edición. `Eliminar` solo visible editando un registro existente, con confirmación por diálogo.
- Ver [CLAUDE.md](CLAUDE.md) para el detalle completo de estas reglas y las de codificación (signals, i18n estricto sin strings hardcodeados, tipado estricto sin `any`, etc.).

## Internacionalización (i18n)

- Idiomas disponibles: `es` (default) y `en`.
- Cada feature declara su propio scope de traducciones vía `provideTranslocoScope('scope-name')` y los archivos viven en `public/i18n/{scope}/{es,en}.json`.
- Las traducciones raíz (comunes a toda la app) están en `public/i18n/{es,en}.json`.
- Regla estricta: ningún texto visible al usuario (labels, errores, notificaciones, tooltips, títulos de diálogos) se hardcodea; todo pasa por Transloco.

## Configuración de entorno

- **Build-time**: `src/environments/environment.ts` (default), `environment.local.ts` (dev, `https://localhost:7300`) y `environment.prod.ts`, seleccionados por Angular según la configuración de build.
- **Runtime**: `public/environment.js` define `window.__env`; si está presente y es válido, sobreescribe el `baseurl` compilado (útil para inyectar la URL de la API por ambiente en el deploy sin rebuildear).

## Testing

- Framework: Karma + Jasmine.
- `npm test` corre en modo watch con Chrome; `npm run test:ci` corre headless para pipelines.
- Los servicios/entidades con lógica propia deben tener sus specs (`*.spec.ts`) junto al archivo que testean.

## Calidad de código y Git hooks

- **ESLint** (`eslint.config.js`) con reglas type-aware activables por `ESLINT_TYPEAWARE=true` (así corre en CI vía `lint:ci`).
- **Prettier** para formato de HTML/CSS/SCSS/MD/JSON/YAML.
- **Husky**: hook `pre-commit` corre `lint-staged` (lint + format solo de archivos modificados); hook `commit-msg` valida el mensaje con `commitlint`.
- **Commits**: [Conventional Commits](https://www.conventionalcommits.org/), scope en `kebab-case`, subject en minúsculas, header ≤ 100 caracteres (ver `commitlint.config.js`).

## Deployment

- Build de producción: `npm run build` (salida en `dist/sofia-web-spa`, hashing de assets, AOT).
- Pensado para **Azure Static Web Apps** (`public/staticwebapp.config.json` define los headers de seguridad, incluyendo CSP).
- La URL de la API para cada ambiente se configura vía `public/environment.js` (runtime), sin necesidad de rebuildear.

## Proyecto relacionado

- [sofia-apis](../sofia-apis) — Backend .NET (API REST consumida por esta SPA).
