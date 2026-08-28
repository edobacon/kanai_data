---
id: RULE-mods-034
project: up1
type: rule
module: mods
tags:
  - i18n
  - layouts
  - declarative
---

# Layouts de mods con enums delegan etiquetas a `lang/es_CL@*.json` antes de mergear

## What

Si un layout JSON de un mod contiene un campo cuyo schema (METASPEC-layout-config o equivalente) declara un enum de valores con etiquetas visibles al usuario, las etiquetas viven en `lang/es_CL@{ObjectName}.json` (o el archivo de i18n del mod), NO inline en el JSON del layout. El layout referencia las etiquetas por key del archivo lang.

**Aplica tambien a**: opciones de filtros, tooltips, placeholders, mensajes de validacion, labels de columnas si son legibles por el usuario.

## Why

Etiquetas hardcoded en layouts:
- Bloquean i18n al ingles / portugues que el roadmap exige
- Generan inconsistencias entre mods (mismo enum con etiqueta distinta)
- Requieren PR a 14 layouts para cambiar 1 palabra
- Quedan invisibles al sistema de traduccion / QA

Evidencia: T-010 ítems Cl1.b ejecuto migracion de **14 layouts JSON** del mod curriculum-design + creacion de **12 archivos `lang/es_CL@*.json`** + 31 tests para validar el cambio. Se podia haber evitado en T-009 al crear los layouts. BUG-mods-005 documenta el mismo patron en curriculum-mapping; BUG-mods-006 documenta claves duplicadas en lang que aparecieron al migrar.

## Where

- **Files**:
  - Layouts: `up1/mods/{mod-name}/config/layouts/*.json`
  - Lang: `up1/mods/{mod-name}/lang/es_CL@{ObjectName}.json`
- **Layers**: ui-components / mods (layen / vueform).

## When

Siempre que:
- Se cree un layout JSON nuevo en cualquier mod
- Se agregue un campo de tipo enum con etiquetas visibles al usuario
- Se modifique un campo existente para mostrar etiquetas (ej: cambio de `state` numerico → `state: enum<draft|published>`)

NO aplica a:
- Identificadores tecnicos no visibles al usuario (status codes internos, flags de configuracion)
- Mods que aun no tienen i18n bootstraping → caso de excepcion: documentar como deuda en el spec con ticket de seguimiento, NO inline sin nota

## Verification

- **Pre-merge check** (manual hoy, automatizable):
  ```bash
  # Para cada layout modificado, listar campos con enum
  jq '.fields[] | select(.type == "enum") | {name, options}' layout.json
  ```
  Si algun `options[].label` esta hardcoded en castellano → bloquear merge.

- **Test automatizable**: comparar keys de enums declarados en el layout vs keys disponibles en el archivo `lang/es_CL@{Object}.json`. Test pasa si todo enum tiene su entry en lang.

- **Manual**: revisar el diff del PR — cualquier string en castellano dentro del JSON del layout es candidato a migrar a lang.

## Source

- **Discovered in**: TICKET-010, Sessions 2-3 (curriculum-design refactor post-T-009).
- **Evidence**: 14 layouts JSON con `options: [{value, label: "Borrador"}, ...]` directamente en el archivo. Migracion produjo 12 archivos lang nuevos + 31 tests.
- **Related**:
  - BUG-mods-005 (curriculum-mapping sin lang)
  - BUG-mods-006 (claves duplicadas en lang)
  - DET-2 (source_ref en artifacts)
  - Principio general: gate en `prompts/steps/design-feature.md` checklist de Artifacts (configuracion declarativa, no hardcoded)
