---
id: SPEC-features-008
project: up1
type: spec
module: features
category: features
fecha: 2026-07-16
tags: [up1, config, ConfigDefinition, ConfigPanel, useConfig, placeholders, theme, locale, up1-manager]
sources:
  - object-manager/objects/business/Base/core_configdefinition.json
  - object-manager/objects/business/Base/core_config.json
  - object-manager/objects/up1/suite/up1_suite_app.json
  - object-manager/src/graphql/resolvers/up1/coreConfig.resolver.js
  - object-manager/src/graphql/typeDefs/coreConfig.js
  - object-manager/scripts/sync/SyncManager.js
  - object-manager/scripts/sync/configSync.js
  - object-manager/config/settings.json
  - mods/up1-manager/config/settings.json
  - mods/hello-world-mod/config/settings.json (ejemplo canonico, 4 dataTypes)
  - layout/src/components/organisms/Settings/ConfigPanel/ConfigPanel.vue
  - layout/src/layouts/ConfigPanelLayout.vue
  - layout/src/layouts/configPlaceholders.ts
  - layout/src/layouts/LayoutOrchestrator.vue
  - layout/src/composables/useConfig.ts
  - suite/composables/useConfig.ts
  - mods/up1-manager/config/layouts/platform-config.json
  - mods/up1-manager/config/layouts/app-config-modal.json
  - mods/up1-manager/config/layouts/app-list.json
  - suite/components/static/Navbar.vue
  - suite/plugins/userConfig.client.ts
  - suite/stores/uiContext.ts
---
# Sistema de Config de uP1 - Guia completa

## Indice

1. [Que es (y que NO es)](#1-que-es-y-que-no-es)
2. [Modelo core_ConfigDefinition](#2-modelo-core_configdefinition)
3. [Modelo core_Config (overrides)](#3-modelo-core_config-overrides)
4. [Niveles PLATFORM / MOD / USER](#4-niveles-platform--mod--user)
5. [Sync: settings.json -> BD (Fase 4b)](#5-sync-settingsjson---bd-fase-4b)
6. [Cascada de resolucion](#6-cascada-de-resolucion)
7. [ConfigPanel y ConfigPanelLayout](#7-configpanel-y-configpanellayout)
8. [useConfig: dos composables distintos](#8-useconfig-dos-composables-distintos)
9. [Placeholders {{config:...}}](#9-placeholders-config)
10. [Integracion en un mod: up1-manager](#10-integracion-en-un-mod-up1-manager)
11. [Aplicacion inmediata en Suite (theme/locale)](#11-aplicacion-inmediata-en-suite-themelocale)
12. [i18n de labels](#12-i18n-de-labels)
13. [Gotchas y estado actual](#13-gotchas-y-estado-actual)

---

## 1. Que es (y que NO es)

El Sistema de Config es un mecanismo generico para definir, versionar y resolver **opciones configurables** de la plataforma (por ejemplo tema visual o idioma) y de cada mod, con soporte para override a nivel de tenant y a nivel de usuario individual.

Se compone de dos objetos (`core_ConfigDefinition` y `core_Config`), un resolver GraphQL con cascada de resolucion, un layout de UI (`ConfigPanel`) y dos composables `useConfig` (uno en layout, otro en suite) para consumir valores. Ademas soporta placeholders `{{config:...}}` para inyectar valores de config directo en layouts.

### Desambiguacion: hay tres sistemas distintos que comparten la palabra "config"

uP1 tiene tres mecanismos separados que usan la palabra "config" y suelen confundirse:

| Sistema | Que resuelve | Documentacion |
|---------|-------------|---------------|
| **Sistema de Config** (este documento) | Opciones configurables por PLATFORM/MOD/USER (ej: tema, idioma) | Este doc |
| **versioningConfig** | Configuracion de versionamiento de objetos (reglas de como se versiona un registro) | `object-manager/docs/config-storage.md` (UPONE-1219) |
| **mod-config-freeze** | Congelamiento de la configuracion de un mod para que no cambie entre releases | `object-manager/docs/features/mod-config-freeze.md` (UPONE-1205) |

Ninguno de los tres se relaciona funcionalmente con los otros dos: no comparten modelos, resolvers ni UI. Al buscar "config" en el codigo, verificar de cual de los tres se trata antes de asumir comportamiento.

---

## 2. Modelo core_ConfigDefinition

Objeto que define QUE opciones de configuracion existen. Fuente: `object-manager/objects/business/Base/core_configdefinition.json:17-75`.

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `appId` | FK (nullable) | `null` = config del core/PLATFORM. Con valor = config de un mod puntual |
| `key` | string | Identificador de la opcion (ej: `user.theme`) |
| `type` | enum | `PLATFORM`, `MOD`, `USER` |
| `dataType` | enum | `string`, `number`, `boolean`, `select`, `multiselect`, `json` |
| `default` | string (JSON) | Valor por defecto cuando no hay override |
| `label` | string | Key de i18n para el label mostrado en UI |
| `capability` | string | Capability RBAC requerida para ver/editar la opcion |
| `allowUserOverride` | boolean | Si el usuario final puede sobreescribir el valor de admin/tenant |
| `systemOption` | boolean | Marca opciones reservadas del sistema |
| `options` | array | Opciones disponibles para `select`/`multiselect` |
| `isActive` | boolean | Bandera de versionado: la definicion vigente tiene `isActive: true` |

---

## 3. Modelo core_Config (overrides)

Objeto que guarda los VALORES efectivos (overrides) sobre una `core_ConfigDefinition`. Fuente: `object-manager/objects/business/Base/core_config.json:17-49`.

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `definitionId` | FK | Apunta a `core_ConfigDefinition` |
| `type` | string | Copia del `type` de la definicion al momento de guardar |
| `value` | string (JSON) | Valor efectivo, serializado |
| `userId` | FK (nullable) | `null` = override de admin/tenant. Con valor = override personal de ese usuario |
| `isActive` | boolean | El override vigente para el par `(definitionId, userId)` tiene `isActive: true` |

Cada guardado nuevo desactiva el override anterior del mismo par `(definitionId, userId)` en vez de sobreescribirlo, preservando el historial.

---

## 4. Niveles PLATFORM / MOD / USER

| Nivel | appId en definicion | Quien la ve | Ejemplo |
|-------|---------------------|-------------|---------|
| **PLATFORM** | `null` | Todos (config del core) | `user.theme`, `user.locale` |
| **MOD** | id del mod | Solo ese mod | Configuraciones especificas de un app |
| **USER** | (definido en `type`) | Solo el usuario dueno, si `allowUserOverride` | Override personal sobre PLATFORM o MOD |

`up1_suite_app.hasConfigs` (`object-manager/objects/up1/suite/up1_suite_app.json:78-83`, boolean, default `false`) marca si un app tiene configuraciones propias. Lo setea el sync (`configSync.js`), y la UI lo usa para decidir si mostrar la opcion de configurar un app.

---

## 5. Sync: settings.json -> BD (Fase 4b)

El sync corre en `object-manager/scripts/sync/SyncManager.js:179-186` como **Fase 4b (Config Definition Sync)**, ubicada despues de la Fase 4 (Capability Sync) y antes de la Fase 5 (Logic Sync).

Implementacion en `object-manager/scripts/sync/configSync.js`:

- `collectConfigDefinitions()` (:83-127): lee `object-manager/config/settings.json` para las definiciones **PLATFORM** (`appId: null`), y `mods/<mod>/config/settings.json` para las definiciones **MOD**, resolviendo el `appId` via `up1_suite_app.name`.
- Versionamiento (:161-179): si detecta que la definicion cambio (`definitionChanged`), desactiva la version anterior (`isActive: false`) y crea una nueva.
- Sync de `hasConfigs` (:203-219): marca el app como `true` si su `settings.json` no esta vacio.

### Configuraciones PLATFORM reales hoy

`object-manager/config/settings.json:1-19` define solo dos opciones:

```json
{
  "user.theme": {
    "dataType": "select",
    "default": "light",
    "label": "config.user.theme.label",
    "options": [
      { "value": "light", "label": "config.user.theme.light" },
      { "value": "dark",  "label": "config.user.theme.dark" }
    ],
    "allowUserOverride": true
  },
  "user.locale": {
    "dataType": "select",
    "default": "es",
    "label": "config.user.locale.label",
    "options": [
      { "value": "es", "label": "config.user.locale.es" },
      { "value": "en", "label": "config.user.locale.en" },
      { "value": "pt", "label": "config.user.locale.pt" }
    ],
    "allowUserOverride": true
  }
}
```

**`options` es un array de objetos `{ value, label }`**, no de strings sueltos (el `label` es una key de i18n). `ConfigPanel.vue` hace `JSON.parse(raw)` y mapea cada `{value,label}`; un string suelto rompe ese render. El `user.theme` de PLATFORM solo ofrece `light`/`dark` como opciones seleccionables; sobre la opcion `'auto'` ver seccion 13.

`mods/up1-manager/config/settings.json` hoy esta vacio (`{}`): las configuraciones de prueba que existian se removieron.

**Ejemplo canonico completo (MOD)**: el mejor ejemplo del formato vive en `mods/hello-world-mod/config/settings.json` (mod template). Cubre los **4 `dataType`** soportados por `ConfigPanel.vue` (`ConfigPanel.vue:58-75`): `select` (con `options: [{value,label}]` + `allowUserOverride`), `number`, `text`, `boolean`. Ver el desglose en [`mods/example-hello-world-mod.md`](../mods/example-hello-world-mod.md) seccion 6.

---

## 6. Cascada de resolucion

Resolver principal: `object-manager/src/graphql/resolvers/up1/coreConfig.resolver.js`.

### resolveValue() (:21-29)

Orden de resolucion para un valor efectivo:

1. Override de usuario (si existe y `allowUserOverride: true`)
2. Override de admin/tenant (`userId: null`)
3. `default` de la definicion

### getConfigs (:39-111)

Trae los valores resueltos para un `appName`. Si `appName` es `'core'` o se omite, filtra por `appId: null` (PLATFORM). Si se pasa `userId`, fuerza a considerar solo definiciones con `allowUserOverride: true` para ese usuario.

### getConfigApps (:121-160)

Lista los apps que tienen configuraciones, agregando una pestana virtual `'core'` para las definiciones PLATFORM, ademas de los apps con definiciones MOD o USER.

### saveConfig (:169-228)

Guarda un nuevo override:

1. Desactiva el override previo del par `(definitionId, userId)`.
2. Crea el nuevo override.
3. Si `value: null`, interpreta un reset al `default` (borra el override, vuelve a leer desde BD, :195-207).

### Schema GraphQL

`object-manager/src/graphql/typeDefs/coreConfig.js:31-38`:

```graphql
getConfigs(appName: String, keys: [String!], userId: String): [ResolvedConfig!]!
getConfigApps(type: String): [ConfigApp!]!
saveConfig(definitionId: String!, value: String, userId: String): ResolvedConfig!
```

El tipo de retorno real es `ResolvedConfig` (no `ConfigValue` ni `Config`, que no existen), y `definitionId` es `String!` (no `ID!`). `ResolvedConfig` incluye el campo `hasUserOverride: Boolean` (ver abajo).

---

## 7. ConfigPanel y ConfigPanelLayout

### ConfigPanel (organismo, layout library)

`layout/src/components/organisms/Settings/ConfigPanel/ConfigPanel.vue`:

- `groupedConfigs` (:163-171): agrupa las opciones por namespace, tomando la primera parte de la `key` separada por punto (`key.split('.')[0]`). Si la `key` no tiene punto, va a la seccion `'__'`.
- `parseOptions` (:196-209): agrega una opcion sintetica `SYSTEM_DEFAULT` (`'__system__'`) solo cuando `type === 'USER'`, y filtra las opciones marcadas `userOnly: true` fuera de ese contexto.
- **`hasUserOverride`**: es el campo de `ResolvedConfig` (`coreConfig.js`) que decide si el select muestra el valor real o "Por defecto (sistema)". Lo calcula `resolveValue` en `coreConfig.resolver.js` (true si existe un override activo del usuario para esa key). `ConfigPanel.vue` (`getDisplayValue`, `:217`): `if (props.type === 'USER' && !config.hasUserOverride) return SYSTEM_DEFAULT;` — es decir, sin override propio, el select seleccionado queda en `SYSTEM_DEFAULT` aunque el valor efectivo venga heredado del nivel PLATFORM.
- `pendingChanges` en memoria (:211-223): los cambios se acumulan localmente; el boton de guardar queda deshabilitado si no hay `pendingChanges`.
- `saveAll()` (:263-285): guarda cada cambio pendiente via `saveConfig`, emite el evento `config-saved` por cada `key`, y refresca con politica `network-only`.

### ConfigPanelLayout

`layout/src/layouts/ConfigPanelLayout.vue:1-29,55-68`: envoltorio que soporta dos modos:

- **Modal**: cuando se usa con `v-model` (ej: desde el Navbar de Suite).
- **Inline**: cuando lo renderiza `LayoutOrchestrator` como cualquier otro layout.

`configType`, `appName` y `userId` se resuelven desde `initialData` o desde `layoutConfig`, segun el modo.

---

## 8. useConfig: dos composables distintos

Existen **dos composables con el mismo nombre** en workspaces distintos, con firmas y responsabilidades diferentes. No confundir uno con otro al importar.

### layout/src/composables/useConfig.ts (:44-104)

```typescript
useConfig(appName: string, keys: string[], options?) => { values: Record<string, unknown>, loading, error, refresh }
```

Usado por componentes del layout library. Hace parseo de doble-encoding del valor (:20-30).

### suite/composables/useConfig.ts (:41-104)

```typescript
useConfig(key: string, options?: { appName?, userId? }) => { value: ComputedRef, loading, refresh }
```

Usado en Suite. Mantiene **cache a nivel de modulo** (:27-30) y expone `invalidateConfig(key, newValue, appName)` (:41-46) para propagar un valor nuevo tras guardar, sin recargar la pagina.

---

## 9. Placeholders {{config:...}}

`layout/src/layouts/configPlaceholders.ts:8-32` implementa `replaceConfigPlaceholders`:

- Si el string completo es SOLO el placeholder (ej: `"{{config:user.theme}}"`), retorna el valor tipado, parseando con `JSON.parse`.
- Si el placeholder esta interpolado dentro de un string mayor, hace reemplazo textual.

Integracion en `LayoutOrchestrator.vue`:

- `fetchConfigsForLayout` (:331-371): agrupa las keys de config referenciadas por namespace y hace un query `getConfigs` por namespace, con doble-decode del valor.
- (:682-685): aplica `replaceConfigPlaceholders` sobre la config final del layout.
- (:759-772): en `onMounted`, junta las configs de `fetchedLayoutConfig` y de `props.layoutConfig`, y hace el fetch de configs ANTES de que el componente hijo renderice (evita flash de placeholder sin resolver).

---

## 10. Integracion en un mod: up1-manager

Ejemplo de integracion end-to-end usando el mod `up1-manager`:

- `mods/up1-manager/config/layouts/platform-config.json:1-11`: layout con `objectName: core_ConfigDefinition`, `layoutType: ConfigPanel`, `showInNav: true`, label "Configuraciones del sistema", restringido a rol `Admin`, con `layoutConfig.configType: PLATFORM`.
- `mods/up1-manager/config/layouts/app-config-modal.json:1-12`: mismo layout pero `configType: MOD`, accesible a roles `Admin` y `Consultor`.
- `mods/up1-manager/config/layouts/app-list.json:83-101`: row action `app-config` en el listado de apps, con `targetLayoutType: ConfigPanel`, `initialDataMapping: { configType: MOD, appName: record.name }`, gateada por la capability `mod/up1-manager/config:edit`, y oculta cuando `hasConfigs != true` (via `visibilityConditions`).

---

## 11. Aplicacion inmediata en Suite (theme/locale)

`suite/components/static/Navbar.vue`:

- (:104-111): monta `<ConfigPanelLayout v-model="showConfigPanel" :layout-config="{ configType: 'USER' }" @config-saved="handleConfigSaved" />`.
- (:82-85): el item "Settings" (icono `bi-gear`) del navbar setea `showConfigPanel = true`.
- (:355-372) `handleConfigSaved`: llama `invalidateConfig`. Si el override se limpio (reset a default), fuerza `$fetchAndApplyUserConfigs(clerkId, true)`. Si la key es `user.theme`, aplica `uiContext.setTheme`. Si es `user.locale`, aplica `$loadAndSetLocale` y persiste en `localStorage['up1-locale']`.

`suite/plugins/userConfig.client.ts:28-74`: al boot, `initializeTheme` lee el tema desde `localStorage` (evita flash), y luego llama `fetchAndApplyUserConfigs(clerkUserId)` con guard para no repetir el fetch.

---

## 12. i18n de labels

Los campos `label` (de la definicion) y `options[].label` (de cada opcion) en `settings.json` son KEYS de i18n, resueltas contra el paquete de idioma correspondiente (`lang/<locale>/common.i18n.json`, bloque `config.*`). Si falta la traduccion para una key, se muestra el texto literal de la key como fallback.

---

## 13. Gotchas y estado actual

- **Opcion `'auto'` de tema: SI existe en el store, NO se expone en el ConfigPanel** (verificado 2026-07-20, corrige una version anterior de este gotcha que decia lo contrario). `suite/stores/uiContext.ts` implementa `'auto'` de forma completa y activa: es el **valor por defecto del estado** (`theme: 'auto'`, :64), el getter `resolvedTheme` lo resuelve via `window.matchMedia('(prefers-color-scheme: dark)')` (:75-83), `initializeTheme()` documenta "Nuevos usuarios obtienen 'auto' por defecto" y registra un listener de cambios del OS (:91-105), y `setTheme()` lo acepta como valido. Lo que ocurre es que la definicion PLATFORM de `user.theme` en `settings.json` solo ofrece `light`/`dark` como opciones **seleccionables**, asi que el ConfigPanel no muestra `'auto'` — pero el store lo soporta y es el estado inicial real de cualquier usuario nuevo antes de que se resuelva su config. La key i18n `config.user.theme.auto` ("Automatico (sistema)") sigue activa y encajaria si se agregara `{"value":"auto","label":"config.user.theme.auto"}` a `settings.json`.
- **Traducciones huerfanas**: quedan keys de i18n huerfanas (`auto`, `showAdvancedFields`, entre otras) que correspondian a configuraciones de prueba ya removidas de `mods/up1-manager/config/settings.json` (hoy `{}`). No corresponden a ninguna `core_ConfigDefinition` activa.
- **Campo `capability` en una config definition: declarado pero NO enforced** (verificado 2026-07-20). Una config key puede declarar `"capability": "mod/<mod>/<dominio>:<accion>"` (ejemplo real: `hw.showDebugPanel` en `mods/hello-world-mod/config/settings.json`). El backend lo persiste y lo expone en el typeDef (`coreConfig.js` campo `capability`; `coreConfig.resolver.js:103,221`), **pero nada lo aplica**: `getConfigs` no filtra las keys por la capability del usuario, y el ConfigPanel ni siquiera pide ese campo en su query (`ConfigPanel.vue:148`). Es un contrato aspiracional (como `onTransition` en enum-transitions): el campo existe, pero no gatea visibilidad ni edicion todavia. No asumir que oculta la key a quien no tiene la capability.
- **No confundir con versioningConfig ni mod-config-freeze**: ver seccion 1. Al buscar bugs o hacer cambios en "config", verificar primero cual de los tres sistemas esta en juego, porque no comparten modelos ni resolvers.

---

## Historial de cambios

| Fecha | Descripcion |
|-------|-------------|
| 2026-07-16 | Documento inicial: guia completa del Sistema de Config basada en modelos core_ConfigDefinition/core_Config, resolver GraphQL, sync Fase 4b, ConfigPanel/ConfigPanelLayout, los dos composables useConfig, placeholders y su integracion en up1-manager y Suite |
