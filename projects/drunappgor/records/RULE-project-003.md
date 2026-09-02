---
id: RULE-project-003
project: drunappgor
type: rule
module: project
level: must
tags:
  - drunadoors
  - assets
  - ui-patterns
  - source-refs
  - flutter
---

# Los patrones y assets de DrunaDoors se migran solo con contrato canonico

## What

DrunAppGor debe rescatar de DrunaDoors los patrones utiles de lectura y visualizacion, especialmente:

- Contenido expandible para capitulos, puertas, secciones, opciones e interacciones.
- Zoom o escala de texto persistente para lectura larga.
- Zoom/visor de imagenes para puertas, setup images, heroes y monstruos.
- Assets existentes en `drunadoors/public/**` cuando correspondan a entidades canonicas, excepto puertas: `drunadoors/public/doors/**` corresponde a puertas 1.0 y no puede activar entidades de puerta 1.5 sin cruce contra `doors_es`.
- Comportamientos utiles de lectura por voz y overrides de monstruos como referencia de producto.

Pero no se permite copiar esos elementos como arquitectura directa. Todo patron se reimplementa en Flutter y todo asset se copia solo si tiene entidad canonica destino, ID estable, `sourceRefs`, `confidence` y estado de completitud.

Para puertas, la entidad canonica debe venir de `doors_es` 1.5. Un asset de `drunadoors/public/doors/**` solo puede registrarse como referencia historica/visual o candidato no activo hasta demostrar correspondencia con `doors_es`.

## Why

DrunaDoors contiene trabajo visual y de lectura valioso. El problema no fue que esos patrones fueran malos, sino que quedaron mezclados con datos, UI y excepciones sin contrato inicial. DrunAppGor debe recuperar lo util sin repetir el acoplamiento.

## Where

- **Fuente auxiliar**:
  - `drunadoors/src/components/DoorExpandable.vue`
  - `drunadoors/src/components/ChapterDetailView.vue`
  - `drunadoors/src/components/InteractionsView.vue`
  - `drunadoors/src/components/InteractionsModal.vue`
  - `drunadoors/src/components/ImageModal.vue`
  - `drunadoors/src/composables/useSpeech.ts`
  - `drunadoors/src/composables/useExpandableSet.ts`
  - `drunadoors/src/composables/useMonsterOverrides.ts`
  - `drunadoors/public/chapter-setup/**`
  - `drunadoors/public/doors/**` solo como referencia historica/visual de puertas 1.0.
  - `drunadoors/public/heroes/**`
  - `drunadoors/public/monsters/**`
- **Destino esperado**:
  - `drunappgor/assets/**` solo despues de definir estructura de media.
  - `drunappgor/assets/data/generated/**` para manifestos e indices.
  - `drunappgor/lib/src/**` para widgets Flutter que consumen modelos canonicos.

## When

Aplica a cualquier ticket o spec de diseno, campana, puertas, interacciones, monstruos, voz, lector, media o assets visuales.

En tickets de puertas, `doors_es` 1.5 prevalece siempre sobre DrunaDoors.

## Required migration fields

Cada asset copiado o registrado debe declarar:

| Field | Required | Nota |
|-------|----------|------|
| `id` | si | ID estable compatible con RULE-project-002. |
| `kind` | si | `door`, `chapter_setup`, `interaction_setup`, `hero`, `monster`, `icon`, `other`. |
| `sourceRefs` | si | Debe incluir origen `drunadoors` y, cuando exista, fuente canonica nivel 1/2. |
| `targetEntityId` | si | Capitulo, puerta, interaccion, monster, hero u otra entidad. |
| `confidence` | si | Vocabulario de DEC-002. |
| `completeness` | si | `complete`, `partial`, `missing`, `unmapped` u otro valor documentado. |
| `assetPath` | si | Ruta destino dentro de DrunAppGor. |

Para assets de puerta se agrega:

| Field | Required | Nota |
|-------|----------|------|
| `doorVersion` | si | Debe ser `1.5` para puertas activas de DrunAppGor. |
| `canonicalDoorSource` | si | Debe apuntar a `doors_es`; DrunaDoors solo puede ser fuente auxiliar. |

## Verification

- Review de tickets: cualquier feature de lectura considera expandibles, escala de texto y visor de imagen si maneja contenido largo o media.
- Review de assets: no se copian carpetas completas sin manifest/mapeo.
- Tests de pipeline: el manifest falla si un asset activo no tiene `targetEntityId`, `sourceRefs` o `confidence`.
- Tests de pipeline: el manifest falla si una puerta activa no declara `doorVersion: 1.5` y `canonicalDoorSource: doors_es`.
- Review de codigo: los widgets Flutter no importan ni replican estructuras Vue; consumen repositorios/modelos canonicos.

## Source

- **Discovered in**: revision inicial de DrunaDoors para DrunAppGor.
- **Evidence**: DrunaDoors ya implementa expandibles, zoom de texto, zoom de imagen y contiene assets reutilizables.
- **Related**: DEC-001, DEC-002, DEC-003, RULE-project-001, RULE-project-002, METASPEC-data-generated-asset, METASPEC-campaign-chapter-interaction-content, METASPEC-voice-readable-content.
