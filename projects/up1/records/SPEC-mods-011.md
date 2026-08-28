---
id: SPEC-mods-011
project: up1
type: doc
module: mods
tags:
  - traduccion
  - lang
  - locale
  - per-object
  - cascada
  - tenant-override
  - placeholder
---

# Traducciones i18n

> Sistema migrado a **i18next** (jul 2026). El formato plano viejo (`{locale}_{country}.json`, `{locale}_{country}@{Object}.json`) ya NO se acepta y aborta el publish. Guia completa: `specs/up1/mods/i18n.md`.

## Preparacion

```bash
# Crear carpeta del idioma si no existe (lng = es, en, pt, sin sufijo de pais)
mkdir -p mods/{mod}/lang/es
```

## Despues de CADA receta

```bash
node scripts/publish-i18n.js   # o: npm run sync
# Traducciones se publican a suite/lang/. Reiniciar Suite para ver cambios
```

## Reglas criticas

- BD almacena **claves**, no texto. Texto se resuelve en runtime via `$t()`
- Formato de archivo: `mods/{mod}/lang/{lng}/{stem}.i18n.json`
  - `{lng}`: carpeta del idioma: `es`, `en`, `pt` (**sin** sufijo de pais tipo `_CL`)
  - `{stem}`: nombre del archivo fuente: `common` (strings generales del mod) o `{ObjectName}` (fields, tabs, steps, actions del objeto)
  - Sufijo **`.i18n.json` OBLIGATORIO**. Un archivo en formato plano dentro de un workspace es **ERROR FATAL** que aborta el publish
- Namespace de i18next = `{workspace}/{stem}` (para un mod: `{mod}/{stem}`). **Colision** = dos archivos fuente que resuelven al mismo `(lng, namespace)`; tambien aborta el publish
- **NUNCA** editar `suite/lang/` directamente. Editar en `mods/{mod}/lang/`
- **SIEMPRE** `$t('clave')` en templates. **NUNCA** texto hardcodeado
- Interpolacion i18next: `{{variable}}` (doble llave). Interpolar con `$t('clave', { variable })`
- Locales minimos: `es`. Si el mod es `"tenants": ["*"]`: cubrir `es`, `en`, `pt`
- El archivo per-object (`{ObjectName}.i18n.json`) tiene **prioridad** sobre `common.i18n.json` en runtime

---

### I18N-01: Crear traducciones base para un mod
**Pre:** mod existe con carpeta `lang/`  
**In:** nombre del mod, lista de objetos, lista de layouts  
**Pasos:**
1. Crear `mods/{mod}/lang/es/common.i18n.json`:
```json
{
  "object": {
    "MiObjeto": "Mis Objetos",
    "OtroObjeto": "Otros Objetos"
  },
  "layout": {
    "mi-objeto-list": { "label": "Todos los Objetos" },
    "mi-objeto-view": { "label": "Ver Objeto" },
    "mi-objeto-create": { "label": "Crear Objeto" },
    "mi-objeto-edit": { "label": "Editar Objeto" }
  }
}
```
2. `node scripts/publish-i18n.js` (publica al namespace `{mod}/common`)

**Validar:** sidebar y breadcrumbs muestran los labels correctos en la app  
**Doc:** `specs/up1/mods/i18n.md` § 3, § 4

---

### I18N-02: Crear traducciones per-object
**Pre:** objeto `MiObjeto` existe en `objects/MiObjeto.json`  
**In:** campos del objeto, tabs, steps definidos en el layout  
**Pasos:**
1. Crear `mods/{mod}/lang/es/MiObjeto.i18n.json` (stem = nombre del objeto, namespace `{mod}/MiObjeto`):
```json
{
  "column": {
    "nombre": "Nombre",
    "estado": "Estado",
    "fechaCreacion": "Fecha de Creacion",
    "responsableId": "Responsable"
  },
  "tabs": {
    "detalle": "Detalle",
    "relacionados": "Relacionados"
  },
  "steps": {
    "step1": "Datos Basicos",
    "step2": "Configuracion"
  },
  "createModalTitle": {
    "mi-objeto-list": "Crear Nuevo Objeto"
  },
  "actions": {
    "publicar": "Publicar",
    "publicarTitle": "Publicar: [record.nombre]"
  }
}
```
2. `node scripts/publish-i18n.js`

Ejemplo real: `mods/curriculum-design/lang/es/Activity.i18n.json`.

**Validar:** columnas en RecordList muestran labels correctos; tabs y steps en RecordDetail con texto traducido  
**Doc:** `specs/up1/mods/i18n.md` § 4, § 5

---

### I18N-03: Agregar traducciones para otro idioma
**Pre:** `es/common.i18n.json` y `es/MiObjeto.i18n.json` ya existen  
**In:** idioma destino (`en`, `pt`)  
**Pasos:**
1. Crear `mods/{mod}/lang/en/common.i18n.json` (misma estructura que `es/common.i18n.json`):
```json
{
  "object": {
    "MiObjeto": "My Objects"
  },
  "layout": {
    "mi-objeto-list": { "label": "All Objects" },
    "mi-objeto-create": { "label": "Create Object" }
  }
}
```
2. Crear `mods/{mod}/lang/en/MiObjeto.i18n.json`:
```json
{
  "column": {
    "nombre": "Name",
    "estado": "Status",
    "fechaCreacion": "Created At"
  },
  "tabs": {
    "detalle": "Detail",
    "relacionados": "Related"
  }
}
```
3. Repetir bajo `mods/{mod}/lang/pt/` si aplica
4. `node scripts/publish-i18n.js`

**Validar:** cambiar idioma en la app muestra textos en el idioma seleccionado  
**Doc:** `specs/up1/mods/i18n.md` § 3

---

### I18N-04: Usar $t() en componentes Vue
**Pre:** traducciones synceadas a `suite/lang/`  
**In:** claves a usar  
**Pasos:**
1. En templates usar `$t()` directamente (expuesto por i18next-vue):
```vue
<template>
  <Heading :level="2">{{ $t('object.MiObjeto') }}</Heading>
  <Text>{{ $t('column.estado') }}: {{ record.estado }}</Text>
  <span :class="badgeClass">{{ $t('estado.' + record.estado) }}</span>
  <Button @click="handlePublicar">{{ $t('actions.publicar') }}</Button>
</template>
```
2. Interpolar con variables via el segundo argumento, usando `{{variable}}` en la clave:
```json
{ "greeting": "Hola, {{name}}" }
```
```vue
<Text>{{ $t('greeting', { name: record.nombre }) }}</Text>
```
3. **Nunca** hardcodear texto visible en templates

**Validar:** cambiar idioma en la app actualiza todos los textos sin recargar  
**Doc:** `specs/up1/mods/i18n.md` § 7

---

### I18N-05: Usar useTranslation() en composables
**Pre:** traducciones publicadas  
**In:** claves a resolver en logica de negocio  
**Pasos:**
1. Importar y usar `useTranslation` de `i18next-vue` (nunca `$t` fuera de templates, nunca `useI18n` de `vue-i18n`):
```typescript
import { useTranslation } from 'i18next-vue'

export function useMiLogica() {
  const { t } = useTranslation()

  function getEstadoLabel(estado: string): string {
    return t(`estado.${estado}`)
  }

  function getErrorMessage(code: string): string {
    return t(`errors.${code}`, t('errors.default'))
  }

  return { getEstadoLabel, getErrorMessage }
}
```

**Validar:** labels retornados cambian al cambiar el idioma del usuario  
**Doc:** `specs/up1/mods/i18n.md` § 7

---

### I18N-06: Traducir row actions
**Pre:** row action definida en layout JSON con `languageTag` y `modalTitleTag`  
**In:** ID del row action, texto del boton, texto del titulo del modal  
**Pasos:**
1. En el layout JSON del RecordList:
```json
{
  "rowActions": [
    {
      "id": "publicar-objeto",
      "label": "Publicar",
      "type": "modal",
      "targetLayoutId": "mi-objeto-publish",
      "targetObjectName": "MiObjeto",
      "modalTitle": "Publicar [record.nombre]",
      "languageTag": "actions.publicar",
      "modalTitleTag": "actions.publicarTitle",
      "initialDataMapping": { "miObjetoId": "record.id" }
    }
  ]
}
```
2. En `lang/es/MiObjeto.i18n.json`:
```json
{
  "actions": {
    "publicar": "Publicar",
    "publicarTitle": "Publicar: [record.nombre]"
  }
}
```
3. `node scripts/publish-i18n.js`

> El placeholder `[record.nombre]` usa **corchetes** y es un mecanismo aparte del interpolado de i18next (`{{variable}}`). Lo resuelve el handler de row actions (`useRowActionHandler.ts`), no i18next. No lo conviertas a doble llave.

**Validar:** boton del row action muestra el texto del `languageTag`; modal se abre con el titulo del `modalTitleTag`; `[record.nombre]` se reemplaza por el valor del campo  
**Doc:** `specs/up1/mods/i18n.md` § 6

---

### I18N-07: Crear override por tenant
**Pre:** traducciones base del mod ya publicadas  
**In:** ID del tenant (ver `suite/config/tenants.ts`), claves a sobreescribir  
**Pasos:**
1. Crear el override bajo la carpeta `tenants/`, con solo las claves que difieren, en `mods/{mod}/lang/tenants/{tenantId}/es/{stem}.i18n.json`:
```json
{
  "object": {
    "MiObjeto": "Evaluaciones Academicas"
  },
  "column": {
    "estado": "Situacion"
  },
  "riskLevel": {
    "high": "Critico"
  }
}
```
2. El override resultante vive en `suite/lang/tenants/{tenantId}/es/{stem}.i18n.json`
3. `node scripts/publish-i18n.js`

**Validar:** en el tenant con ID `{tenantId}`, los textos sobreescritos aparecen con la version personalizada; otros tenants mantienen las traducciones base  
**Doc:** `specs/up1/mods/i18n.md` § 9, § 13

---

### I18N-08: Strings de dominio (grupo de claves)
**Pre:** archivo base `es/common.i18n.json` existe  
**In:** nombre del grupo de claves, valores a traducir  
**Pasos:**
1. En `mods/{mod}/lang/es/common.i18n.json`, agregar el grupo de claves propio del dominio:
```json
{
  "riskLevel": {
    "low": "Bajo",
    "medium": "Medio",
    "high": "Alto",
    "critical": "Critico"
  },
  "prioridad": {
    "urgente": "Urgente",
    "normal": "Normal",
    "baja": "Baja"
  }
}
```
2. Usar en templates:
```vue
<span>{{ $t('riskLevel.' + record.riskLevel) }}</span>
<span>{{ $t('prioridad.' + tarea.prioridad) }}</span>
```
3. Usar en composables con `useTranslation()`:
```typescript
const label = t(`riskLevel.${nivel}`)
```

**Validar:** los valores enum del grupo se resuelven a texto legible; si la clave no existe, `$t()` retorna la clave cruda (no rompe la UI)  
**Doc:** `specs/up1/mods/i18n.md` § 5, § 7

---

## Notas

- **Plurales:** i18next soporta plurales via claves con sufijo `_one` / `_other` (`$t('items', { count })`), pero el codebase **aun no los usa**. Es una capacidad disponible, no un patron establecido. **No** uses el separador `|` (eso era `vue-i18n`, ya no aplica).

## Self-check antes de publicar

- [ ] Cada archivo vive en `mods/{mod}/lang/{lng}/{stem}.i18n.json` con `{lng}` sin sufijo de pais (`es`, no `es_CL`)
- [ ] Todo archivo fuente termina en `.i18n.json` (un layout plano legacy es error fatal del publish)
- [ ] Ningun archivo usa el patron viejo `{locale}_{country}.json` ni `{locale}_{country}@{Object}.json`
- [ ] Ningun par de fuentes colisiona en el mismo `(lng, namespace)` (`{mod}/{stem}`)
- [ ] Los componentes importan `useTranslation` de `i18next-vue` (no `useI18n` de `vue-i18n`)
- [ ] Interpolacion con `{{variable}}` (doble llave); placeholders de row action con `[record.field]` (corchetes, mecanismo aparte)
- [ ] `node scripts/publish-i18n.js` corre sin abortar
