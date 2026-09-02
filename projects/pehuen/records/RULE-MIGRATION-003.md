---
id: RULE-MIGRATION-003
project: pehuen
type: rule
module: migration
level: must
tags:
  - migration
  - ui
  - dry
  - vistas
  - roles
  - mantenibilidad
---

# Una sola vista por funcionalidad: roles convergen con feature subset, no con vistas paralelas

## What

Cuando dos o más roles necesitan acceder a la misma funcionalidad (lista de rumas, estadísticas, lista de guías, etc.), **debe existir una sola vista compartida** que renderice condicionalmente los elementos de UI (botones, columnas, acciones, secciones) según el rol del usuario.

**Prohibido**:

- Crear `views/asesor/Rumas.vue` paralela a `views/rumas/List.vue` con código casi idéntico (el legacy hizo esto y produjo deuda).
- Duplicar `Stats.vue` por rol (`views/asesor/Stats.vue` con copy-paste de bloques).
- Crear `pages/admin/users.vue` paralela a `pages/users.vue` con la misma lógica de fetch + filtros.
- Servicios backend duplicados (`stats.service.ts` + `asesor-stats.service.ts` con mismo cálculo y diferente formato).

**Permitido y esperado**:

- Una sola vista con `v-if`/`:disabled` por `user.role` para botones, acciones y campos editables (RULE-AUTH-011).
- Un solo composable / store / service backend con parámetros que ajustan output según contexto (rol, cancha, scope).
- Layout compartido con slot/composable que cambia el panel según rol (ej. `useDashboardForRole(role)`).
- Componente sub-vista (`<RumasMap />`, `<RumasGrid />`) que se renderiza condicionalmente, no archivos `.vue` separados con misma estructura.

## Why

El legacy implementó vistas paralelas para ASESOR (`views/asesor/Rumas.vue`, `views/asesor/Stats.vue`) bajo la suposición de que "el ASESOR es distinto". El resultado fue:

- **Doble mantenimiento**: cada bug fix en `views/rumas/List.vue` requería verificar manualmente si aplicaba a `views/asesor/Rumas.vue`. Bugs se reintroducían en una vista cuando se arreglaban en la otra.
- **Drift silencioso**: `views/asesor/Stats.vue` quedó con un bloque `v-if="role === 'ADMINISTRADOR'"` que ya no aplica (el rol ADMIN no llega a esa ruta) — código muerto que nadie revisa porque pertenece a "la vista del asesor" (CAP-STATS-002).
- **Dificultad para evolucionar**: agregar un nuevo rol forestal (SUPERVISOR_CAMPO, ASESOR_SENIOR, etc.) requeriría crear N vistas paralelas más. No escala.

DEC-011 ya unificó las vistas asesor en el nuxt; esta rule formaliza el principio para evitar que la duplicación reaparezca.

El criterio operativo es claro: si dos vistas comparten >70% de código (template + lógica de fetch + handlers), son la misma vista con feature subset por rol — debe consolidarse.

## Where

- **Frontend**: `pehuen_nuxt/app/pages/**` y `pehuen_nuxt/app/components/**`. Una sola página por ruta canónica; sub-rutas o variantes condicionales con `v-if`/composables.
- **Backend**: `pehuen_nuxt/server/api/**` y `pehuen_nuxt/server/services/**`. Un solo handler por endpoint; un solo service por dominio. Variantes de output via parámetros + `scopeByCancha` / `scopeByRole`.
- **Composables**: `pehuen_nuxt/app/composables/api/**`. Un composable por dominio (`useRumas()`), no `useRumasForAsesor()` paralelo.
- **Rutas legacy redirected**: `pehuen-client/src/router/index.ts` declara rutas `asesor.*`. Esas rutas se redirigen 301 (DEC-012); no se replican como nuevas rutas en nuxt.

## When

- **Antes de crear un archivo `.vue`/`.ts` nuevo**: buscar si existe equivalente. Si la diferencia es "para otro rol", hacer condicional, no duplicar.
- **Antes de aceptar una PR**: el reviewer rechaza archivos que dupliquen lógica/templates de uno existente con cambios cosméticos por rol.
- **Al detectar duplicación legacy**: durante la migración, si el legacy tiene la duplicación, se consolida en nuxt (no se preserva la duplicación).
- **Al pensar "esto es distinto para X rol"**: parar y preguntar si realmente es **estructuralmente distinto** o solo **un subset de features** del flujo común. Si es lo segundo → vista compartida con condicionales.

## How to apply

### 1. Detección de duplicación

```bash
# Heurística rápida: vistas con nombre similar
ls pehuen_nuxt/app/pages/**/*.vue | grep -E "(asesor|admin|operator|simple|extended)"
```

Si aparece más de una vista de la misma funcionalidad con prefijos por rol → señal de alerta.

### 2. Consolidar

Cuando se detecta una duplicación válida (vistas legacy paralelas), el patrón de consolidación es:

```vue
<!-- pages/rumas.vue (única) -->
<template>
  <RumasHeader :user="user" />
  <RumasFilters v-model="filters" :user="user" />
  <RumasGrid
    :items="items"
    :geo="user.role === 'ADMINISTRADOR' || user.role === 'RECEPTOR' || user.role === 'ASESOR'"
    :actions="canEditRumas(user) ? editActions : []"
  />
</template>
```

donde:

- Los **comportamientos por rol** viven en composables (`canEditRumas`, `useRumasFiltersForRole`) o en props/condicionales.
- Los **datos cargados** vienen de un único endpoint con `scopeByCancha` aplicado en backend.
- Los **componentes hijos** son agnósticos del rol; reciben props.

### 3. Excepciones documentadas

Hay casos legítimos donde dos vistas separadas son apropiadas:

- **Funcionalidades estructuralmente distintas** que comparten dominio pero no comportamiento (ej. `pages/users/index.vue` para listar vs `pages/users/profile.vue` para perfil propio). No es duplicación.
- **Dashboards de muy distinta semántica** que coincidentalmente comparten algunos componentes (ej. dashboard executive vs dashboard operativo). En ese caso, los **componentes** se reutilizan; las páginas pueden ser distintas porque la composición es distinta.
- **Layouts que cambian fundamentalmente** (ej. ASESOR en terreno con tablet vs ADMIN en escritorio): puede justificar layout component diferente, pero NO vistas paralelas — el layout responde a viewport o a `user.role` mediante `<NuxtLayout :name="layoutFor(user)" />`.

## Métrica de validación

Una vista NO es duplicación si:
- Tiene >50% de su template/lógica único (no copy-paste de otro archivo).
- Su URL canónica responde a un caso de uso distinto, no a un rol.
- Si se elimina un rol del sistema, la vista sigue teniendo razón de ser.

Una vista SÍ es duplicación si:
- >70% del template + handlers son iguales a otro archivo.
- La única razón de su existencia es "porque ese rol tiene una versión simplificada".
- Si el rol asociado se elimina, la vista queda huérfana.

## Anti-patrones (no hacer)

❌ Crear `pages/admin/dashboard.vue` y `pages/operator/dashboard.vue` con mismo template y datos diferentes — usar `pages/dashboard.vue` con composable `useDashboardForRole`.
❌ `views/RumasListAdmin.vue` + `views/RumasListAsesor.vue` — usar `views/RumasList.vue` con `:actions="actionsForRole(user)"`.
❌ Service `getStatsForAdmin()` + `getStatsForAsesor()` — usar `getStats(user)` con scope automático.
❌ Replicar `pehuen-client/src/views/asesor/**` en nuxt como `pages/asesor/**`. Las rutas asesor.* se redirigen (DEC-012); no se recrean.

## Audit

El audit script (`pehuen_nuxt/scripts/audit-migration-parity.mjs`) puede extenderse con un check `--no-duplicate-views`:

- Compara archivos `.vue` y `.ts` por similitud de AST/template.
- Reporta pares con >70% similitud.
- Falla CI si encuentra duplicación introducida.

(Implementación pendiente — task adicional cuando se necesite.)

## Related

- **DEC-011**: vistas unificadas asesor — caso fundacional que origina esta rule.
- **DEC-012**: redirect 301 de paths legacy — complementaria; las rutas asesor.* redirigen, no se replican.
- **DEC-015**: default route por rol explícito — usa esta rule para enrutar ASESOR a `rumas.list` (no `asesor.ruma.list`).
- **RULE-AUTH-011**: capacidades por rol del client legacy — define cómo el subset por rol se aplica dentro de la vista compartida.
- **CAP-CANCHAS-002**: ejemplo de drift por copy-paste detectable con esta rule.
- **CAP-STATS-002**: ejemplo de código muerto producido por vistas duplicadas.
