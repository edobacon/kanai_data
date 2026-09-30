---
id: TAO-165-SPEC
project: taomangalam
ticket: TAO-165
status: approved
---

# Documentación como código validada en CI: MkDocs, markdownlint, Vale, cspell, Lychee y render del contrato

## Resumen ejecutivo

Implementa la base de documentación como código del monorepo: sitio MkDocs Material con dependencias fijadas (requirements.txt, Python 3.12) sobre docs/, linters documentales (markdownlint-cli2, Vale con estilo Tao Mangalam, cspell con diccionario de dominio y español), verificación de enlaces con Lychee (internos en cada PR, externos con reintento en nightly), referencia del contrato con Redocly sobre el contrato ya validado por Spectral, baseline versionada de documentos heredados y los comandos pnpm docs:serve/check:changed/check/preview/api. Todo se integra en el job docs de ci-pr.yml y en main.yml (sitio completo como artifact), con las Actions de Vale y Lychee fijadas por SHA completo.
NO incluye: validador de frontmatter con Ajv, Mermaid CLI, dart doc, TypeDoc ni detección de documentos huérfanos (HU-00-18); hosting o publicación del portal; documentos legales (EP-03a).
Se verifica de forma observable: un PR con enlace interno roto deja el job docs rojo indicando archivo y enlace, un término fuera del diccionario en un archivo nuevo falla cspell, un heredado sin modificar no bloquea, un contrato con error de Spectral no renderiza y deja el job rojo, y un merge a main publica el sitio como artifact.
Tamaño: 3 puntos publicados; 3 sesiones (2 T2, 1 T1).

## Requirements

### REQ-01 `confirmed`
> Fuente: taomangalam/docs/product/decisiones/DEC-230-criterios-tecnicos-de-la-base-m0.md:49

El repositorio genera un sitio MkDocs Material con dependencias fijadas a versiones exactas en requirements.txt, instalado con Python 3.12, y navegación inicial sobre docs/, de modo que `pnpm docs:preview` compila el sitio sin enlaces internos rotos.

### REQ-02 `confirmed`
> Fuente: taomangalam/docs/product/tecnologia/17_estrategia_ci_cd_y_calidad.md:462

cspell (.cspell.json con diccionario de dominio y español), markdownlint-cli2 (.markdownlint-cli2.yaml) y Vale (.vale.ini con estilo Tao Mangalam de terminología) validan los documentos con reglas completas solo en archivos nuevos o modificados mediante una baseline versionada de heredados, de modo que un término fuera del diccionario en un archivo nuevo, o un error de markdownlint o Vale en un archivo modificado, hacen fallar el check, mientras que una sugerencia de Vale solo informa y un heredado sin tocar no bloquea.

### REQ-03 `confirmed`
> Fuente: taomangalam/docs/product/tecnologia/19_sistema_de_documentacion.md:226

Lychee verifica los enlaces internos de los documentos en cada PR, fallando con archivo y enlace cuando están rotos, y los enlaces externos con reintento en nightly.yml, informando sin bloquear el PR.

### REQ-04 `confirmed`
> Fuente: taomangalam/.github/workflows/ci-pr.yml:886

Redocly CLI ejecuta build-docs sobre el contrato ya validado por Spectral, de modo que un contrato con error de Spectral impide que Redocly corra y deja el job rojo, y un contrato válido publica la referencia HTML como artifact.

### REQ-05 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:1613

El repositorio expone los comandos `pnpm docs:serve`, `pnpm docs:check:changed`, `pnpm docs:check`, `pnpm docs:preview` y `pnpm docs:api` (Redoc en M0) para ejecutar el portal y los checks documentales de forma local y en CI.

### REQ-06 `confirmed` `enforcement`
> Fuente: taomangalam/docs/product/decisiones/DEC-230-criterios-tecnicos-de-la-base-m0.md:49

El job `docs` de ci-pr.yml amplía sus pasos con MkDocs (Python 3.12 desde requirements.txt), markdownlint-cli2, cspell, Vale, Lychee y Redocly, main.yml publica el sitio completo como artifact en cada merge a main, y toda Action usada se referencia por SHA completo, de modo que la verificación de fijación del job `metadata` (HU-00-10) falla si una Action de Vale o Lychee queda referenciada por etiqueta.
## Tasks

#### S1.T1 — Crear `mkdocs.yml` (MkDocs Material, navegación inicial sobre `docs/`) y `requirements.txt` con versiones exactas, dejando el sitio compilable con Python 3.12.
Contrato: rollback: Eliminar mkdocs.yml y requirements.txt.. Status: done

#### S1.T2 — Crear `.markdownlint-cli2.yaml`, `.cspell.json` (diccionario de dominio y español) y `.vale.ini` con estilo Tao Mangalam de terminología.
Contrato: rollback: Eliminar los tres archivos de configuración.. Status: done

#### S1.T3 — Definir la baseline versionada de documentos heredados y cablearla en el scoping de markdownlint, cspell y Vale (reglas completas solo en archivos nuevos o modificados).
Contrato: rollback: Retirar la baseline y volver al scoping global de las tres herramientas.. Status: done

#### S1.T4 — Agregar los scripts `docs:serve`, `docs:check:changed`, `docs:check`, `docs:preview` y `docs:api` en package.json.
Contrato: rollback: Revertir los scripts agregados en package.json.. Status: done

#### S1.T5 — Regresión local: `pnpm docs:preview` compila el sitio y `pnpm docs:check` corre sobre docs/ con un archivo nuevo con término inválido (falla cspell) y un heredado en baseline (no bloquea).
Contrato: rollback: Revertir el arnés y los archivos de prueba local.. Status: done

#### S2.T1 — Ampliar el job `docs` de ci-pr.yml con pasos de MkDocs (Python 3.12 desde requirements.txt), markdownlint-cli2, cspell, Vale y Lychee interno, con las Actions fijadas por SHA completo.
Contrato: rollback: Revertir ci-pr.yml a su versión previa del job docs.. Status: done

#### S2.T2 — Agregar o ampliar `nightly.yml` con Lychee de enlaces externos con reintento.
Contrato: rollback: Revertir o eliminar el paso de Lychee externo en nightly.yml.. Status: done

#### S2.T3 — Agregar el build completo del sitio en `main.yml` y publicarlo como artifact.
Contrato: rollback: Revertir main.yml a su versión previa.. Status: done

#### S2.T4 — Fijar por SHA completo las Actions de Vale y Lychee del job documental y alinearlas con la verificación de fijación del job `metadata` (HU-00-10).
Contrato: rollback: Revertir los `uses:` a su estado previo.. Status: done

#### S2.T5 — Regresión CI: un PR de prueba con enlace interno roto deja el job `docs` rojo con archivo y enlace, un PR válido queda verde y el artifact del sitio aparece tras el merge a main.
Contrato: rollback: Revertir los archivos de prueba usados en los PR.. Status: done

#### S3.T1 — Añadir el paso de Redocly CLI build-docs en el job `docs`, condicionado a la validación previa de Spectral, y publicar la referencia HTML como artifact.
Contrato: rollback: Retirar el paso de Redocly y el artifact de la referencia.. Status: pending

#### S3.T2 — Regresión: un contrato válido produce el artifact de la referencia y un contrato con error de Spectral deja el job rojo sin ejecutar Redocly.
Contrato: rollback: Revertir el contrato de prueba a su estado válido.. Status: pending
## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2
- [x] S1.T3
- [x] S1.T4
- [x] S1.T5

**Gate (auto)**: Correr `pnpm docs:preview` compila el sitio MkDocs Material sobre docs/ sin enlaces internos rotos, y `pnpm docs:check` reporta resultados de markdownlint, cspell y Vale aplicando reglas completas solo a archivos nuevos/modificados (un heredado en baseline no bloquea).

### Session 2 · T2 · continue

**Tasks:**
- [x] S2.T1
- [x] S2.T2
- [x] S2.T3
- [x] S2.T4
- [x] S2.T5

**Gate (auto)**: Un PR con enlace interno roto deja el job `docs` de ci-pr.yml en rojo indicando archivo y enlace; un PR válido queda verde; nightly.yml informa enlaces externos caídos; un merge a main publica el sitio completo como artifact y las Actions de Vale/Lychee figuran por SHA completo.

### Session 3 · T1 · open

**Tasks:**
- [ ] S3.T1
- [ ] S3.T2

**Gate (auto)**: En el job `docs`, con contrato validado por Spectral se publica la referencia HTML del contrato como artifact; con un error de Spectral, Redocly no corre y el job queda rojo.
