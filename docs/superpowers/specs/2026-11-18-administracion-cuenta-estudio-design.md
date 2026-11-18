# Administración de cuenta y estudio Design

## Intent

Convertir la gestión básica de autenticación local de `legalrun-clone` en una
suite real de **administración de cuenta y estudio**, con pantallas y datos
especializados para **Perfil**, **Usuarios**, **Roles**, **Credenciales** y
**Token SCBA**, manteniendo el proyecto como réplica local independiente.

## Why

Hoy la réplica ya resuelve el acceso básico (registro, login, sesión y cambio
de contraseña) y expone un catálogo genérico de usuarios, pero todavía no se
siente como una administración operativa del estudio. La meta de esta etapa es
que el sistema permita ordenar el equipo, visualizar la cuenta propia, registrar
credenciales del estudio y administrar el token SCBA desde módulos claros y
especializados, sin depender todavía de integraciones externas.

## Goals

- Agregar una página de **Perfil** para ver y editar datos propios de la cuenta
  local.
- Reemplazar la gestión de usuarios puramente genérica por una pantalla más
  operativa de **Usuarios del estudio**.
- Incorporar una gestión real de **Roles** como dato reutilizable por usuarios.
- Incorporar un módulo de **Credenciales** del estudio para inventario y
  seguimiento local.
- Incorporar una pantalla específica de **Token SCBA** con control manual/local.
- Mantener todo en SQLite local y dentro de la UI/hash router existente.
- Hacer que los nuevos datos puedan reutilizarse en otras partes del sistema
  más adelante (por ejemplo, responsables, permisos o integraciones futuras).

## Non-goals

- No implementar integración real con SCBA ni validación contra servicios
  externos.
- No guardar secretos de forma avanzada tipo vault/secret manager.
- No aplicar todavía permisos duros por rol en toda la aplicación.
- No convertir el sistema en multiempresa o multi-tenant.
- No reemplazar toda la arquitectura monolítica actual de `src/App.tsx` en esta
  etapa.

## Constraints

- Debe seguir siendo una réplica **local-only**.
- Debe reutilizar la autenticación/sesión HTTP-only ya existente.
- Debe mantener el hash router y los patrones visuales actuales.
- Debe convivir con el backend actual en `server/index.mjs` y SQLite local.
- Debe evitar refactors amplios fuera del alcance del bloque de cuenta/estudio.
- Debe cubrir los nuevos flujos con tests de frontend y/o backend donde aporte
  señal real.

## Current state

- El backend ya tiene tabla `users` para autenticación local y `sessions`.
- El frontend ya tiene `AuthPage` y `PasswordSettingsPage`.
- La opción “Usuarios” hoy vive como catálogo genérico en
  `#/client/configuracion/usersAbogado`.
- No existen páginas especializadas para Perfil, Roles, Credenciales ni Token
  SCBA.

## Approaches considered

### 1. Mantener todo como catálogos genéricos en `ModulePage`

Agregar solo nuevas filas/columnas a `module_records` y seguir renderizando con
la UI genérica actual.

- **Ventaja:** menor esfuerzo inmediato.
- **Desventaja:** deja la administración de cuenta como tablas sueltas, sin
  sensación de producto ni flujos especializados.

### 2. Suite especializada local/manual sobre auth existente **(elegido)**

Agregar entidades y endpoints propios para cuenta/estudio, y renderizar páginas
especializadas para Perfil, Usuarios, Roles, Credenciales y Token SCBA.

- **Ventaja:** mejor equilibrio entre valor visible, claridad funcional y costo
  de implementación.
- **Desventaja:** requiere más coordinación entre frontend y backend que un
  CRUD genérico.

### 3. Suite completa con enforcement de permisos por rol desde el inicio

Además de gestionar roles, bloquear/permitir módulos completos según rol.

- **Ventaja:** más realista como producto terminado.
- **Desventaja:** sube mucho el alcance y mete lógica transversal por toda la
  app antes de estabilizar los datos base.

## Chosen design

Implementar la administración en dos capas:

1. **Cuenta personal**
   - nueva página de **Perfil** con datos de la cuenta local autenticada
   - edición de nombre, apellido, teléfonos y cargo visible
   - acceso integrado al cambio de contraseña ya existente

2. **Estudio**
   - **Usuarios**: alta, edición, activación/desactivación, asignación de rol,
     marca de responsable
   - **Roles**: catálogo especializado con nombre, descripción y estado
   - **Credenciales**: inventario local/manual de credenciales del estudio
    - **Token SCBA**: pantalla específica con alias, titular, estado,
     vencimiento, última actualización y notas

## Approved operating decisions

- **Alta de usuarios del estudio:** un usuario Administrador crea la cuenta con
  una **contraseña temporal local**. La persona luego podrá cambiarla desde su
  cuenta usando el flujo normal de contraseña.
- **Acceso a módulos de estudio:** solo usuarios con rol
  **Administrador** pueden ver y usar Usuarios, Roles, Credenciales y Token
  SCBA. El resto de los usuarios solo puede gestionar su **Perfil** y su
  **Contraseña**.
- **Token SCBA:** se administrarán **múltiples tokens**, no uno solo.
- **Estados válidos de Credenciales y Token SCBA:** `Activo`, `Pendiente`,
  `Vencido`, `Inactivo`.

## Data model proposal

Mantener `users` para autenticación y ampliarla con metadatos de perfil:

- `first_name`
- `last_name`
- `phone_mobile`
- `phone_work`
- `role_id` (referencia lógica a roles del estudio)
- `job_title`
- `is_active`
- `is_responsible`
- `updated_at`

Agregar tablas nuevas:

- `studio_roles`
  - `id`, `name`, `description`, `is_active`, `created_at`, `updated_at`

- `studio_credentials`
  - `id`, `name`, `credential_type`, `owner_name`, `status`, `expires_on`,
  `notes`, `created_at`, `updated_at`

- `studio_scba_tokens`
  - `id`, `alias`, `holder_name`, `status`, `expires_on`, `last_checked_at`,
    `notes`, `created_at`, `updated_at`

No se almacenará material secreto sensible como token plano operativo en esta
primera etapa; el módulo funciona como gestión e inventario local/manual.

## Authentication and administration rules

- El **registro público/local** existente puede mantenerse para esta réplica,
  pero los usuarios creados desde la suite administrativa deben crearse desde
  el backend con contraseña temporal explícita.
- La respuesta de sesión/autenticación debe enriquecerse con los datos mínimos
  necesarios para la UI de cuenta:
  - `id`
  - `email`
  - `firstName`
  - `lastName`
  - `roleName`
  - `isAdmin`
- El backend debe rechazar con `403` cualquier acceso no administrador a los
  endpoints `/api/admin/*`.
- El frontend debe ocultar navegación y CTAs administrativas cuando
  `isAdmin === false`.

## Frontend structure

Agregar páginas especializadas:

- `ProfilePage`
- `UsersAdminPage`
- `RolesPage`
- `CredentialsPage`
- `ScbaTokensPage`

El patrón de navegación recomendado:

- **Configuración / Cuenta**
  - Perfil
  - Cambiar contraseña
- **Configuración / Estudio**
  - Usuarios
  - Roles
  - Credenciales
  - Token SCBA

La página genérica `ModulePage` seguirá existiendo para otros catálogos, pero
estos módulos dejarán de depender exclusivamente de ella.

## API shape

Extender el backend con endpoints dedicados:

- `GET /api/account/profile`
- `PUT /api/account/profile`
- `GET /api/admin/users`
- `POST /api/admin/users`
- `PUT /api/admin/users/:id`
- `GET /api/admin/roles`
- `POST /api/admin/roles`
- `PUT /api/admin/roles/:id`
- `GET /api/admin/credentials`
- `POST /api/admin/credentials`
- `PUT /api/admin/credentials/:id`
- `GET /api/admin/scba-tokens`
- `POST /api/admin/scba-tokens`
- `PUT /api/admin/scba-tokens/:id`

Todas estas rutas seguirán protegidas por la sesión local ya existente.

## UX rules

- Si no hay datos, cada módulo debe arrancar con estado vacío claro y CTA de
  creación.
- Usuarios inactivos no deben perderse; deben quedar visibles con estado.
- Roles inactivos no deben ofrecerse en nuevas asignaciones, pero sí seguir
  mostrándose en registros existentes.
- Perfil debe mostrar el email de login como dato principal de identidad.
- Token SCBA y Credenciales deben mostrar estado y vencimiento de forma clara,
  pero sin prometer validación automática externa.
- La creación/edición de usuario debe incluir contraseña temporal cuando se
  trata de altas administrativas.

## Open builder choices

- Los nuevos componentes pueden vivir temporalmente en `src/App.tsx` si eso
  simplifica el cambio, pero si el archivo se vuelve inmanejable, es válido
  extraer páginas chicas a archivos nuevos bajo `src/account/` o `src/admin/`.
- La semántica visual exacta de badges/estados puede seguir el patrón ya usado
  en tablas y pills existentes.
