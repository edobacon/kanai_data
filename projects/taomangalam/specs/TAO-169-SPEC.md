---
id: TAO-169-SPEC
project: taomangalam
ticket: TAO-169
status: approved
---

# HU-00-18: Validación documental completa — frontmatter con Ajv, Mermaid a SVG, DartDoc/TypeDoc y detección de huérfanos

## Resumen ejecutivo

Completa la validación documental de HU-00-16 con: JSON Schema versionado del frontmatter y verificador propio con Ajv (campos mínimos, enums de type/status por familia, fechas, IDs únicos, referencias a DEC/V-xx y baseline de heredados); render reproducible de los .mmd a SVG con @mermaid-js/mermaid-cli de versión fijada, incluido en MkDocs, con gate de diff limpio y reemplazo de los HTML con CDN; `dart doc --dry-run` con lints public_member_api_docs/comment_references sobre app/ y TypeDoc sobre server/ con warnings como error; scripts pnpm docs:generate/api/diagrams en docs/development/commands.md; y pasos nuevos en el job docs de ci-pr.yml y detección de huérfanos/metadata atrasada en nightly.yml. NO incluye MkDocs/markdownlint/Vale/cspell/Lychee/Redocly (HU-00-16), snippets ejecutables, cobertura documental de nightly, hosting del portal ni migración masiva de heredados. Se verifica con 8 criterios observables: verificador que falla nombrando archivo y campo, ids duplicados listando ambos, DEC/vista inexistente en doc modificado sin bloquear heredado de baseline, gate de regeneración con diff, dart doc/TypeDoc fallando por lints/warnings, huérfano informado en el summary de nightly y `git diff --exit-code` en 0 sobre clon limpio. Tamaño: 4 sesiones, proporcional al pedido y dentro del techo de entrada; no excede el techo ni el alcance del request.

## Requirements

### REQ-01 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:1687

Un JSON Schema versionado del frontmatter (campos mínimos, enums de `type` y `status` por familia, formato de fechas) y un verificador propio con Ajv que valida cada documento de `docs/` y detecta IDs duplicados, reportando archivo y campo.

### REQ-02 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:1785

El verificador resuelve las referencias a DEC y a vistas V-xx citadas por los documentos y aplica una baseline explícita de documentos heredados: un modificado con referencia inexistente falla; un heredado de la baseline sin tocar no bloquea.

### REQ-03 `confirmed`
> Fuente: taomangalam/docs/product/tecnologia/19_sistema_de_documentacion.md:231

Los diagramas `.mmd` de `docs/product/tecnologia/diagramas/` se renderizan reproduciblemente a SVG con `@mermaid-js/mermaid-cli` de versión fijada, incluidos en MkDocs, con gate de diff limpio tras regenerar y reemplazo de los HTML de Mermaid con CDN por el SVG generado.

### REQ-04 `confirmed`
> Fuente: taomangalam/docs/product/tecnologia/19_sistema_de_documentacion.md:241

`dart doc --dry-run` corre con los lints `public_member_api_docs` y `comment_references` sobre la API pública de `app/`, de modo que un miembro público sin comentario `///` o una referencia de comentario inválida hace fallar el job.

### REQ-05 `inferred`
> Fuente: taomangalam/docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:1803

TypeDoc documenta los exports de `server/` con validación y warnings tratados como error, de modo que un enlace TSDoc inválido hace fallar el job.

### REQ-06 `inferred`
> Fuente: taomangalam/docs/product/tecnologia/19_sistema_de_documentacion.md:231

Existen los scripts `pnpm docs:generate`, `pnpm docs:api` (Redoc, DartDoc y TypeDoc) y `pnpm docs:diagrams`, documentados en `docs/development/commands.md`, de modo que un clon limpio ejecuta `pnpm docs:generate` y `git diff --exit-code` termina en 0.

### REQ-07 `inferred`
> Fuente: taomangalam/docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:1861

El job `docs` de `.github/workflows/ci-pr.yml` incorpora los pasos de frontmatter, DartDoc, TypeDoc, Mermaid y regeneración sin diff, y `.github/workflows/nightly.yml` detecta documentos huérfanos y metadata atrasada informándolos en su summary.

### REQ-08 `confirmed` `variant`
> Fuente: sonda:card-lint-de-docs-4d9deffd06

Los documentos heredados que están en el baseline del linter de docs y que se modifican quedan compliant con ese linter, normalizando el patrón que rechaza en los que ya lo traen.
## Tasks

#### S1.T1 — Definir el JSON Schema versionado del frontmatter y el verificador propio con Ajv que valida cada documento de docs/ y detecta ids duplicados, reportando archivo y campo.
Contrato: rollback: Retirar el schema y el verificador nuevos; el árbol vuelve al estado sin validación de frontmatter.. Status: done

#### S1.T1.1 — Crear el JSON Schema versionado del frontmatter con campos mínimos, enums de type/status por familia y formato de fechas.
Contrato: rollback: Eliminar el archivo de schema nuevo.. Status: done

#### S1.T1.2 — Implementar el verificador con Ajv que valida cada documento contra el schema, nombra archivo y campo, y detecta ids duplicados entre documentos.
Contrato: rollback: Eliminar el verificador nuevo.. Status: done

#### S1.T2 — Extender el verificador para resolver referencias a DEC y a vistas V-xx y aplicar la baseline explícita de documentos heredados, de modo que un heredado sin tocar no bloquee.
Contrato: rollback: Quitar la validación de referencias y el manejo de baseline, dejando solo la validación estructural.. Status: done

#### S1.T3 — Tests de regresión y casos del verificador: status fuera de enum, documento sin id, ids duplicados, DEC/vista inexistente en modificado y heredado de baseline sin tocar.
Contrato: rollback: Eliminar los tests nuevos del verificador.. Status: done

#### S2.T1 — Agregar @mermaid-js/mermaid-cli con versión fijada y el paso que genera SVG desde los .mmd de docs/product/tecnologia/diagramas/, incluyéndolos en MkDocs, y reemplazar los HTML de Mermaid con CDN por el SVG generado.
Contrato: rollback: Quitar la dependencia y el paso de generación y restaurar los HTML de Mermaid previos.. Status: pending

#### S2.T1.1 — Fijar @mermaid-js/mermaid-cli y el script/step que renderiza cada .mmd a SVG.
Contrato: rollback: Quitar la dependencia fijada y el script de render.. Status: pending

#### S2.T1.2 — Sustituir los HTML de Mermaid con CDN por el SVG generado en el sitio de docs.
Contrato: rollback: Restaurar los HTML de Mermaid con CDN.. Status: pending

#### S2.T2 — Implementar el gate de regeneración sin diff que falla y muestra el diff cuando un .mmd modificado no regeneró su SVG.
Contrato: rollback: Quitar el gate de regeneración y su invocación.. Status: pending

#### S2.T3 — Verificación de regresión: .mmd sin cambios deja diff vacío, .mmd cambiado sin regenerar falla con diff y no queda script CDN en el HTML.
Contrato: rollback: Eliminar los tests nuevos de diagramas.. Status: pending

#### S3.T1 — Configurar `dart doc --dry-run` con los lints public_member_api_docs y comment_references sobre la API pública de app/.
Contrato: rollback: Revertir la configuración de lints y el paso de dart doc.. Status: pending

#### S3.T2 — Configurar TypeDoc sobre los exports de server/ con validación y warnings tratados como error.
Contrato: rollback: Revertir la configuración de TypeDoc y su script.. Status: pending

#### S3.T3 — Verificación de regresión: miembro Dart sin `///` falla, enlace TSDoc inválido falla y la API documentada pasa.
Contrato: rollback: Eliminar los tests nuevos de API docs.. Status: pending

#### S4.T1 — Crear los scripts `pnpm docs:generate`, `pnpm docs:api` (Redoc, DartDoc, TypeDoc) y `pnpm docs:diagrams`, y documentarlos en docs/development/commands.md.
Contrato: rollback: Quitar los scripts del package.json y revertir docs/development/commands.md.. Status: pending

#### S4.T1.1 — Agregar los scripts docs:generate, docs:api y docs:diagrams al package.json raíz.
Contrato: rollback: Eliminar los scripts nuevos del package.json.. Status: pending

#### S4.T1.2 — Documentar los tres comandos en docs/development/commands.md.
Contrato: rollback: Revertir la sección agregada en commands.md.. Status: pending

#### S4.T2 — Agregar los pasos nuevos al job docs de .github/workflows/ci-pr.yml (frontmatter, DartDoc, TypeDoc, Mermaid y regeneración sin diff) y la detección de documentos huérfanos y metadata atrasada en .github/workflows/nightly.yml.
Contrato: rollback: Retirar los pasos y la detección nuevos; volver al job docs de HU-00-16.. Status: pending

#### S4.T2.1 — Incorporar frontmatter, DartDoc, TypeDoc, Mermaid y el gate de regeneración sin diff al job docs de ci-pr.yml.
Contrato: rollback: Quitar los pasos nuevos de ci-pr.yml.. Status: pending

#### S4.T2.2 — Agregar a nightly.yml la detección de documentos huérfanos y metadata atrasada con su reporte en el summary.
Contrato: rollback: Quitar la detección y el reporte nuevos de nightly.yml.. Status: pending

#### S4.T3 — Normalizar el patrón que rechaza el linter de docs en los documentos de la baseline que se tocan (docs/PLAN.md, docs/content/SCHEMA.md, docs/development/commands.md) para que queden compliant.
Contrato: rollback: Revertir la normalización de esos documentos al estado previo.. Status: pending

#### S4.T4 — Regresión y verificación de integración: clon limpio `pnpm docs:generate` con `git diff --exit-code` 0, job docs verde en PR válido, nightly informando huérfano y scripts documentales de HU-00-16 todavía pasando.
Contrato: rollback: Eliminar los tests/verificación nuevos de integración.. Status: pending
## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T1.1
- [x] S1.T1.2
- [x] S1.T2
- [x] S1.T3

**Gate (auto)**: El verificador corre sobre docs/ y falla nombrando archivo y campo ante status fuera del enum o doc sin id, lista ambos archivos ante ids duplicados, falla ante DEC/vista inexistente en un documento modificado y no bloquea un heredado de baseline sin tocar.

### Session 2 · T1 · open

**Tasks:**
- [ ] S2.T1
- [ ] S2.T1.1
- [ ] S2.T1.2
- [ ] S2.T2
- [ ] S2.T3

**Gate (auto)**: Modificar un .mmd sin regenerar hace fallar el gate mostrando el diff; regenerar produce diff limpio y no queda ningún HTML de Mermaid cargando CDN.

### Session 3 · T1 · open

**Tasks:**
- [ ] S3.T1
- [ ] S3.T2
- [ ] S3.T3

**Gate (auto)**: Correr docs:api falla si un miembro público de Dart en app/ no tiene comentario `///` o si un export de server/ tiene un enlace TSDoc inválido, y pasa con la API documentada.

### Session 4 · T2 · open

**Tasks:**
- [ ] S4.T1
- [ ] S4.T1.1
- [ ] S4.T1.2
- [ ] S4.T2
- [ ] S4.T2.1
- [ ] S4.T2.2
- [ ] S4.T3
- [ ] S4.T4

**Gate (auto)**: En clon limpio `pnpm docs:generate` deja `git diff --exit-code` en 0; el job docs de ci-pr.yml corre frontmatter/DartDoc/TypeDoc/Mermaid sin diff y nightly.yml informa un documento huérfano como tal.
