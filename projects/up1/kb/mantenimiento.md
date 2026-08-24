---
id: SPEC-general-002
project: up1
type: spec
module: general
category: general
tags: [up1, documentacion, mantenimiento, gobernanza, evergreen, sprint, codigo-fuente-de-verdad]
fecha: 2026-07-20
---
# Mantenimiento de la documentacion de uP1

Como mantener viva y confiable esta documentacion (`projects/up1/kb/`). Leer esto ANTES de actualizar cualquier doc externo.

## 1. Principio rector: el codigo manda

La documentacion describe **lo que el sistema realmente hace y como**, verificado contra el codigo real del monorepo `uplanner/up1`.

Ante cualquier conflicto entre lo que dice un ticket, un doc de sprint, un comentario o incluso un doc evergreen viejo, y lo que dice el codigo, **gana el codigo**. Un ticket puede quedar sin implementar, implementarse distinto a lo planeado, o revertirse. La unica fuente de verdad de lo implementado es el codigo desplegado.

## 2. Taxonomia de carpetas: que es fuente de verdad y que no

| Carpeta | Rol | Se mantiene al dia? | Es fuente de verdad de lo implementado? |
|---|---|---|---|
| `features/` | Capacidades transversales de la plataforma | Si | Si |
| `core/` | Comportamiento de core y de cada workspace (object-manager, layout, suite) | Si | Si |
| `curriculum-design/`, `mods/` | Estado actual de cada mod | Si | Si |
| `operations/` | Setup, entorno local, navegacion, reset de BD | Si | Si |
| `confluence/`, `onboarding/`, `learning-assurance/` | Material derivado / de contexto | Si | Parcial (derivado) |
| `sp4/`, `sp5/`, `sp6/`, `sp7/` ... | **Trabajo y analisis DURANTE el sprint**: requerimientos, reuniones, QA, reviews, deltas de analisis, propuestas | **No** (historico) | **No** |
| `_archive/` | Versiones superadas de docs evergreen | No | No |
| `pdf/`, `screenshots/`, `presentations/` | Material de apoyo | No | No |

**El punto clave sobre `sp*/`**: son el registro del trabajo hecho durante un sprint. **No reflejan necesariamente lo implementado**: pueden contener tickets completados o no, disenos que despues cambiaron, propuestas descartadas y analisis previos al codigo final. Son insumo historico, no la doc viva. No se actualizan hacia atras; quedan como estaban.

La doc **completa y vigente** vive en las carpetas evergreen (`features/`, `core/`, `curriculum-design/`, `mods/`, `operations/`). Ahi es donde se consolida lo que de verdad se construyo.

## 3. Regla de oro al actualizar docs externos

**Siempre** verificar contra el codigo que se implemento realmente y como. Nunca copiar de un sp doc ni del ticket como si fueran verdad. Flujo:

1. **Identificar el cambio**: `git log` de los repos bajo `uplanner/up1` (root, object-manager, layout, suite, flow, report-builder, mods/*) mas `uplanner/mcp` (up1-mcp). Los repos son independientes; revisar cada uno. **No adivines la ventana**: la ultima actualizacion del KB dejo un watermark de commits por repo en `deckard/projects/up1/kb-sync-state.yaml`. Lee desde ahi: `git -C <path> log <last_synced_commit>..HEAD`. Al terminar una actualizacion, regenera ese watermark con los HEAD nuevos.
2. **Leer el codigo real**: `grep`/`read` del repo. Confirmar que funciones, flags de entorno, columnas de schema, resolvers, layouts y componentes existen y se comportan como se va a documentar.
3. **Tratar los sp docs y tickets como hipotesis**: si un sp doc o el ticket afirma algo, confirmarlo en codigo antes de consagrarlo en un doc evergreen.
4. **Escribir/actualizar el doc evergreen** correspondiente, con `source_ref` real (`archivo:linea` o nombre de simbolo). No afirmar sin evidencia.
5. **Detectar drift**: si el doc dice X y el codigo hace Y, corregir el doc (el codigo manda).

## 4. Donde va cada cosa

| Tipo de cambio | Doc destino |
|---|---|
| Capacidad transversal nueva (aplica a varios objetos/mods) | `features/<capacidad>.md` (nuevo) + fila en `index.md` |
| Comportamiento de core / de un workspace | `core/<workspace>.md` o `core/object-manager.md` |
| Trabajo dentro de un mod | `mods/example-<mod>.md` y/o la carpeta del mod (`curriculum-design/`, etc.) |
| Setup, entorno, operacion | `operations/<tema>.md` |
| Analisis profundo / diseno / propuesta no implementada | `sp<N>/` (queda como analisis, se referencia desde el evergreen si aporta) |

## 5. Anatomia de un doc evergreen

- **Frontmatter**: `id`, `project`, `type`, `module`, `category`, `tags`, `fecha` (de la ultima revision contra codigo), `ticket` (si aplica), `sources` (paths repo-relativos al codigo real que respalda el doc).
- **Indice** con enlaces a secciones numeradas.
- **Secciones numeradas** con ejemplos de codigo reales y `source_ref` (`archivo:linea` o simbolo).
- **Espanol neutro**; el codigo y los identificadores en ingles.
- **No duplicar**: enlazar a otros docs en vez de copiar. Un tema, un dueno.
- Al crear un doc nuevo, **agregar su fila** en `index.md` (seccion correspondiente + mapa "donde buscar que").

## 6. Cuando actualizar

- Al mergear a `develop` una feature o PR que cambia comportamiento observable o un contrato (API, schema, layout, capability, evento).
- Al cerrar un sprint: revisar que de lo analizado en `sp<N>/` **realmente** se implemento, y consolidar eso (y solo eso) en los docs evergreen, verificado contra codigo.
- Al detectar drift (doc contra codigo) en cualquier momento.

## 7. Checklist de mantenimiento

- [ ] Revise el `git log` de los repos afectados (no solo uno).
- [ ] Verifique en el codigo que lo que voy a documentar existe y se comporta asi.
- [ ] No copie afirmaciones de un sp doc ni del ticket sin confirmarlas en codigo.
- [ ] El doc evergreen correcto quedo con `fecha`, `ticket` y `sources` actualizados.
- [ ] Cada afirmacion no trivial tiene un `source_ref` real.
- [ ] Corregi el drift que haya encontrado (el codigo manda).
- [ ] Actualice `index.md` si cree o movi un doc.
- [ ] Regenere el indice de Horadric Cube (`dkc-reindex`) si aplica (esta doc es alcanzable via el symlink `specs-external` en deckard).

## 8. Anti-patrones

- **Copiar del sp sin verificar**: consagra en evergreen cosas que quiza no se implementaron.
- **Tratar el ticket como verdad**: un ticket "cerrado" no garantiza que el codigo quedo como el ticket decia.
- **Documentar solo el delta reciente**: la doc evergreen debe reflejar el estado completo, no solo lo ultimo.
- **Source_refs inventados** o line numbers que ya no apuntan a nada: verificar antes de citar.
- **Duplicar contenido** entre docs: genera drift doble. Enlazar.
- **Escribir docs en la raiz del repo de codigo**: la doc de plataforma vive aca (`specs/up1`) o en los `docs/` de cada workspace, nunca suelta en el root del repo.
