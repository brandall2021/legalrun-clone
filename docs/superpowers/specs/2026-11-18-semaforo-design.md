# Semáforo Design

## Intent

Agregar a `legalrun-clone` un módulo visible de **Semáforo** que traduzca en una pantalla propia la prioridad de seguimiento de los expedientes, reutilizando la información local que hoy ya calcula el dashboard de actividad.

## Why

La referencia pública de LegalRun para abogados muestra **Semáforo** como módulo reconocible. En la réplica actual ya existe la base de datos y el cálculo de prioridad (`/api/dashboards/activity`), pero esa capacidad aparece repartida en dashboards técnicos y no como una sección explícita y fácil de usar.

## Goals

- Exponer una ruta dedicada `#/client/semaforo`.
- Mostrar resumen visual por prioridad: **Sin movimientos**, **Alta**, **Media** y **Baja**.
- Reutilizar la API local existente y mantener todo en SQLite/local-only.
- Permitir búsqueda, filtros y acceso rápido a la ficha del expediente.
- Mantener el estilo y navegación actuales del proyecto.

## Non-goals

- No integrar portales judiciales reales.
- No implementar todavía Perfil, Roles, Credenciales o Token SCBA.
- No rediseñar la arquitectura completa de `src/App.tsx`.
- No cambiar la semántica actual de prioridad del backend en esta primera etapa.

## Constraints

- Debe seguir siendo una réplica local independiente.
- Debe usar el hash router existente.
- Debe apoyarse sobre `GET /api/dashboards/activity`.
- Debe convivir con el archivo monolítico `src/App.tsx` sin una refactorización grande.
- Debe quedar cubierto por tests de Vitest.

## Approaches considered

### 1. Renombrar uno de los dashboards existentes

Reusar `ActivityDashboardPage` y cambiar solo etiquetas o accesos.

- **Ventaja:** mínimo esfuerzo.
- **Desventaja:** deja Semáforo como alias implícito y no como módulo claro.

### 2. Crear una página dedicada Semáforo sobre la API actual **(elegido)**

Agregar una ruta y un componente con resumen visual, tabs/filtros por prioridad y tabla de casos, reutilizando `GET /api/dashboards/activity`.

- **Ventaja:** máxima claridad para el usuario con costo moderado.
- **Desventaja:** agrega algo de lógica de presentación nueva en frontend.

### 3. Crear un módulo genérico con `ModulePage`

Montar Semáforo como otro CRUD genérico.

- **Ventaja:** consistente con varios catálogos actuales.
- **Desventaja:** no sirve para un tablero de prioridad, que necesita cálculo, resumen y lectura operativa.

## Chosen design

Implementar una **`SemaforoPage`** dedicada en frontend. La página consumirá `/api/dashboards/activity`, clasificará los registros en buckets visibles y mostrará:

- KPIs por bucket.
- Selector rápido de bucket (`Todos`, `Sin movimientos`, `Alta`, `Media`, `Baja`).
- Filtros por jurisdicción, estado y monto mínimo reutilizando el patrón actual.
- Tabla de expedientes con prioridad y acceso a la ficha.

La prioridad seguirá siendo la que hoy entrega el backend:

- `Sin movimientos`
- `Alta` si `daysWithoutMovement >= 60`
- `Media` si `daysWithoutMovement >= 30`
- `Baja` en el resto

## Open builder choices

- El icono exacto del menú puede resolverse siguiendo el patrón visual actual.
- El helper de clasificación puede vivir en un archivo chico nuevo si mejora testabilidad; no hace falta partir `App.tsx` en muchos componentes todavía.
