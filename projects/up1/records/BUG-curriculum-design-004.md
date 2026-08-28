---
id: BUG-curriculum-design-004
project: up1
type: bug
module: curriculum-design
tags:
  - i18n
  - lang
  - locale
  - en_CL
  - pt_BR
  - translation-debt
  - UPONE-1379
---

# Deuda de traducción en capas de idioma de curriculum-design — EN/PT parciales, ES completo

## Symptom

La cobertura de `lang/` del mod es despareja por idioma. En el estado del PR #14 (UPONE-1379, commit `46d9c198ca58`):

| Idioma | Cobertura |
|--------|-----------|
| **es_CL** | Completo (~24 archivos: global + todos los objetos y los 10 `rt__*`) |
| **pt_BR** | Solo 3: global + `Activity` + `Offering` |
| **en_CL** | Solo 2: global + `Offering` |

El único objeto con los tres idiomas es **Offering**. **Activity** quedó `es + pt` y **perdió el `en`** que sí tenía antes: el rename a PascalCase de este PR renombró `es_CL@activity.json`→`es_CL@Activity.json` y `pt_BR@activity.json`→`pt_BR@Activity.json` (bien), pero en inglés **borró** `en_CL@activity.json` sin recrear `en_CL@Activity.json`. Todo el resto de objetos y RecordTypes (Curriculum, CurricularSection, planEntry, requirement, requirementCategory, los `rt__*`, badges, etc.) es **solo ES**.

## Expected behavior

Política de idiomas explícita y consistente para el mod. O bien:
- **(a)** los objetos con superficie de UI mantienen paridad `es_CL / en_CL / pt_BR` (uP1 opera al menos esos tres locales), o
- **(b)** se declara formalmente que EN/PT quedan fuera de mantenimiento en el mod y ES es el único locale soportado (alineado con el DoD de los tickets, que hoy solo exige "lang ES completo").

Hoy no hay política: EN/PT se agregaron de forma oportunista objeto por objeto, sin criterio registrado.

## Root cause

Los tickets del mod priorizaron ES (el DoD dice literal "lang ES completo", no menciona EN/PT). EN/PT se fueron sumando de a poco solo en algunos objetos (Offering, Activity) sin una regla que obligue paridad ni una decisión que los declare fuera de alcance. El resolver de traducciones matchea por nombre exacto del objeto, así que un archivo faltante en un locale = ese objeto cae a su fallback (ES) en silencio, sin error visible.

## Impact

| Dimensión | Impacto |
|-----------|---------|
| Usuarios afectados | tenants no hispanohablantes (potencial rollout multi-país) |
| Datos afectados | labels/columnas/enums de UI en EN y PT |
| Módulos afectados | curriculum-design (`lang/`) |
| Frecuencia | latente hoy — los layouts corren con tenant UPU (ES); se manifiesta al servir un tenant EN/PT |
| Severidad | baja: ES completo + DoD solo exige ES; no bloquea SP6 |

Nota: los labels de RecordDetail y las columnas de RecordList del mod se declaran **inline** en los layouts (no dependen del `lang/`), así que el impacto real del faltante es acotado a lo que sí resuelve por clave de idioma (globales, enums, y objetos que no fijan label inline).

## Reproduction

Servir el mod con locale `en_CL` o `pt_BR` y abrir un objeto sin archivo de ese idioma (p. ej. Curriculum, requirement, cualquier `rt__*`, o Activity en `en_CL`): los textos resueltos por clave caen al fallback ES.

## Workaround

Ninguno sin agregar los archivos de idioma faltantes o una capa de fallback explícita.

## Solution

Pendiente. Antes de completar traducciones, **decidir la política (a) vs (b)** y registrarla como decisión del mod; recién entonces cerrar el delta de archivos que corresponda. Caso mínimo inmediato: recrear `en_CL@Activity.json` para no dejar a Activity peor que antes del rename (único objeto que retrocedió en cobertura).

## Related

- **Bugs**: BUG-mods-005 (curriculum-mapping sin `lang/` — i18n ausente), BUG-mods-006 (claves i18n duplicadas en assessment-matrix) — misma familia de deuda i18n en otros mods.
- **Externo**: UPONE-1379 (PR #14, donde se detectó al revisar el rename a PascalCase de los lang de Activity).
