---
id: RULE-GEN-006
project: pehuen
type: rule
module: general
level: must
tags:
  - migration
  - naming
  - convencion
---

# Convenciones de naming: kebab-case archivos, PascalCase componentes, useCamelCase composables, SCREAMING_SNAKE_CASE constantes

## What

El proyecto aplica las siguientes convenciones de naming, sin excepciones:

| Elemento | Convención | Ejemplo |
|----------|------------|---------|
| Archivos | kebab-case | `factor-corteza.model.ts`, `guia-volumen.service.ts` |
| Componentes Vue | PascalCase | `GuiaTable.vue`, `RumaCard.vue` |
| Composables | `use` + CamelCase | `useGuias.ts`, `useAuthStore.ts` |
| Stores Pinia | `use{Name}Store` | `useAuthStore`, `useGuiasStore` |
| Constantes | SCREAMING_SNAKE_CASE | `EDITOR_ROLES`, `OTRA_CANCHA_ID` |
| Routes Nitro | `{path}.{method}.ts` | `index.get.ts`, `[id].patch.ts` |

## Why

La consistencia de naming reduce la fricción cognitiva al navegar el codebase. Permite encontrar archivos por patrón. El legacy tenía inconsistencia (`factorCorteza.model.ts` en camelCase compuesto). Nuxt/Nitro tiene convenciones propias (file-based routes) que el proyecto debe respetar.

## Where

- **Files**: toda la estructura de archivos del proyecto
- **Layers**: frontend, backend, shared

## When

En cada archivo nuevo creado. En revisión de PR. ESLint puede forzar algunas convenciones.

## Verification

- `find server/models/ -name "*.ts" | grep -v kebab` → 0 archivos con camelCase.
- `find app/components/ -name "*.vue" | grep -v "^[A-Z]"` → 0 componentes sin PascalCase.
- `find app/composables/ -name "*.ts" | grep -v "^use"` → 0 composables sin prefijo `use`.
- `grep -rn "const [a-z_]*=" shared/constants/` → verificar que todas sean SCREAMING_SNAKE_CASE.

## Source

- **Discovered in**: PEH-001, Session 1
- **Evidence**: `config.yaml` conventions.naming. `pehuen_nuxt/CLAUDE.md` Naming: "Constants: SCREAMING_SNAKE_CASE. Composables: useCamelCase. Components: PascalCase." `improvements.md` sección 3.6.
- **Related**: RULE-GEN-007
