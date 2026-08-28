---
id: DECISION-035
project: up1
type: decision
module: layout
tags:
  - layout
  - iconpicker
  - aichatbox
  - core-mod-boundary
---

# Un componente sin nada especifico de su mod de origen se migra a core, no se mantiene sincronizado

## Contexto

Dos componentes vivian sincronizados desde mods hacia `layout/`/`suite/` sin depender de nada especifico del mod que los origino, generando una dependencia cross-mod no oficial: cualquier otro mod que quisiera usarlos dependia de que ese mod de origen siguiera activo y sincronizando.

- `IconPicker` vivia en `curriculum-design` (`modsComponents/IconPicker/`) pero no tenia logica propia de ese mod.
- `AiChatbox` vivia en el mod `ai-agent`, que quedo deprecado (agregado a `ignoredMods`). Al dejar de sincronizar, `AiChatbox` dejo de resolver en toda pagina de tenant, mostrando un banner de "layout type not available".

## Decision

Ambos se migran a `layout/`/`src/` como elementos de primera clase, no sincronizados:

- `IconPicker` se mueve a `layout/src/components/vueform/elements/IconPickerElement.vue`, elemento core de Vueform. El mod retira su copia y los tests huerfanos. Los 6 layouts que ya declaraban el componente quedan intactos sin cambios porque el tipo de Vueform se resuelve por el nombre del componente declarado en el layout JSON, no por el directorio fisico donde vive el archivo fuente.
- `AiChatbox` se reconstruye como layout core en `layout/src/layouts/AiChatbox/`, registrado estaticamente igual que `RecordList`/`RecordDetail`, cableado al prop `apolloClient` como el resto de layouts top-level, en paridad con el proxy `aiChat` ya agregado en `object-manager`.

## Alternativas descartadas

- **Mantener la dependencia cross-mod via sync**: es exactamente lo que fallo. Cuando el mod de origen (`ai-agent`) se deprecio, el componente sincronizado dejo de resolver en produccion sin ningun aviso previo, mostrando el banner de layout no disponible directamente al usuario final. Sostener esta dependencia obliga a que el mod de origen permanezca activo indefinidamente solo para no romper un componente que nada tiene que ver con su dominio.

## Impacto y reversibilidad

Establece el criterio: si un componente sincronizado desde un mod no usa nada especifico de ese mod, migrar a core es preferible a mantenerlo sincronizado, precisamente para no repetir el incidente de `AiChatbox`. Impacto minimo en `IconPicker` (migracion transparente para los layouts consumidores); impacto mayor en `AiChatbox` porque paso de layout de mod a `layoutType` core de primera clase, cambiando como `LayoutOrchestrator`/Suite lo resuelve. Pendiente de verificar si el mod `ai-agent` deberia salir formalmente de `ignoredMods` o quedar retirado en la doc de mods activos del `CLAUDE.md` raiz, que hoy todavia lo lista sin distinguir "activo en catalogo pero excluido del sync".
