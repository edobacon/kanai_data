---
id: RULE-mods-041
project: up1
type: rule
module: mods
tags:
  - atoms
  - imports
  - vueform
  - sync-mirror
---

# Mods que importan atoms del layout DEBEN tener mirror local en `components/atoms/` — import via path relativo `../../components/atoms`

## What

Para que un Vueform element (o cualquier SFC) del mod importe atoms del design system (`Badge`, `Text`, `Heading`, `Spinner`, etc.), el mod requiere **mirror local** de los atoms en `mods/<mod>/components/atoms/` con re-export desde `index.ts`.

Patron actual de imports en mods:

```typescript
// dentro de mods/curriculum-design/modsComponents/SomeElement/SomeElement.vue
import { Badge, Text } from '../../components/atoms'
//                       ^^^^^^^^^^^^^^^^^^^^^^^^^
//                       Path relativo apunta al mirror local
//                       mods/curriculum-design/components/atoms/index.ts
```

NO se importa directamente desde `layout/src/components/atoms/` ni desde `@layouts/atoms` ni alias similar — el mod queda autonomo + el sync replica el component a `layout/src/modsComponents/` donde el path relativo `../../components/atoms` resuelve via `layout/src/components/atoms/` (que tambien existe en el destino).

## Why

Diseño dual:

1. **Editor experience del dev**: cuando editas SFCs en `mods/curriculum-design/modsComponents/`, el import `../../components/atoms` resuelve al mirror local del mod. TypeScript ve los tipos. Storybook puede correr aislado del mod
2. **Runtime experience**: post-sync, el SFC vive en `layout/src/modsComponents/<Component>/` y el path `../../components/atoms` ahi resuelve a `layout/src/components/atoms/` (el original del design system). Funciona en runtime

El mismo path relativo funciona en ambos contextos por construccion. Sin mirror local: TypeScript no resuelve los imports en el contexto del mod, Storybook falla, dev experience rota.

## Where

- **Files**: `mods/<mod>/components/atoms/` debe existir con `index.ts` que re-exporta los atoms necesarios
- **Convencion paths**:
  - Source en mod: `mods/curriculum-design/modsComponents/Foo/FooElement.vue`
  - Mirror local: `mods/curriculum-design/components/atoms/index.ts` (re-export de los atoms que el mod consume)
  - Sync target: `layout/src/modsComponents/Foo/FooElement.vue` (path relativo `../../components/atoms` resuelve a `layout/src/components/atoms/`)
- **Layers**: frontend (Vue/Vueform components del mod)

## When

Aplica cuando:

- Creas un Vueform element nuevo en un mod que renderea atoms del design system
- Creas cualquier SFC del mod que importa `Badge`/`Text`/`Heading`/`Button`/etc.

NO aplica si el component del mod usa solo HTML/Tailwind nativo sin atoms del design system.

## Verification

```bash
# Verificar mirror existe
ls mods/curriculum-design/components/atoms/
# Expected: Alert, Avatar, Badge, Button, Checkbox, ..., index.ts

# Verificar el component nuevo del mod importa correctamente
grep "components/atoms" mods/curriculum-design/modsComponents/<Component>/<Component>.vue
# Expected: import { Badge } from '../../components/atoms'

# Verificar runtime post-sync
ls layout/src/modsComponents/<Component>/
# Expected: archivos sincronizados con misma estructura
```

Si el mirror no existe en un mod nuevo, el sync no lo crea automaticamente — el dev del mod debe replicar `components/atoms/index.ts` apuntando a los atoms que necesita.

## Source

- **Discovered in**: TICKET-025, Session 2 (S2.T2 ActivityStatusBadgeElement.vue creacion)
- **Evidence**: Al crear el wrapper Vueform que consumia `<Badge>` del atom, intente import desde `layout/src/components/atoms/Badge` (absoluto) — error TypeScript. Patron correcto descubierto en RichTextRendererElement.vue del mismo mod: `import { Text } from '../../components/atoms'`. Verificado: `mods/curriculum-design/components/atoms/index.ts` re-exporta los 17 atoms del design system. Aprendizaje L9 del ticket
- **Related**: RULE-mods-040 (sync target real es `layout/src/modsComponents/`), RULE-layout-001 (atoms encapsulan Bootstrap)
