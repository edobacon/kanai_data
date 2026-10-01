# Caso inline: Lint real en kanai-app: integrar ESLint con reglas minimas

> Vista generada por Kanai desde case.yaml, el KB y el plan. No la edites a mano.

**Objetivo:** Que `pnpm lint` revise de verdad los .ts/.mts/.vue de app, server, shared, scripts y tests, con reglas minimas (no-explicit-any, no-unused-vars, vue/no-v-html respetando los eslint-disable existentes), y que el job "Calidad" de CI quede en verde. Sin push sin OK del dev.
**Tags:** repos: kanai-app · labels: lint, ci, deuda-tecnica
**Etapa:** ejecucion

## Falta

- Nada que bloquee.

## Avisos

- la rama de trabajo chore/eslint-real todavía no existe en kanai-app (se crea al empezar el trabajo)

## Repos

| Repo | Ruta local | Rama base | Ramas de trabajo | Para qué |
|---|---|---|---|---|
| kanai-app | configurada | setup (existe) | chore/eslint-real (por crear) | Config de ESLint (eslint.config.mjs), devDependencies, limpieza de violaciones existentes |

## Ambientes

- CI GitHub Actions: Job Calidad de .github/workflows/ci.yml: check:ui, docs:check, lint, typecheck; corre en push y pull_request, Node desde .nvmrc (24)

## Personas

- Eduardo Bacon: responsable; aprueba decisiones, commits y push

## Enlaces

- Sin enlaces.

## Notas

- Validar con Node 24 (.nvmrc): anteponer $HOME/.nvm/versions/node/v24.*/bin al PATH; el default de la maquina es 22.
- Sin commit ni push sin OK explicito del dev.
- Dependencia nueva: decision mayor. Reversible con un revert del commit de config (no toca runtime).
- Decisiones pendientes que definen el plan: via de integracion (1 modulo @nuxt/eslint, 2 config flat propia, 3 @nuxt/eslint-config sin modulo); tratamiento de lo existente (A arreglar todo, B baseline con eslint-suppressions.json, C incremental por carpeta); eslint-disable sin efecto de no-console/no-control-regex (a borrarlos, b activar las reglas, c apagar el aviso).

## KB del caso

| Documento | Tipo | Título | Resumen |
|---|---|---|---|
| analisis-lint-actual.md | analisis | Analisis: estado del lint en kanai-app y opciones de integracion | Diagnostico (pnpm lint no revisa nada), violaciones medidas con reglas minimas y con el preset de Nuxt, vias de integracion y estrategias para lo existente. |
| decision-integracion.md | decision | Decision: config flat propia, arreglar todo, borrar eslint-disable sin efecto | El dev eligio via 2 (config flat propia), estrategia A (arreglar todo) y opcion a (borrar los eslint-disable sin efecto). |

## Plan

0 de 6 fases cerradas, fase actual F1. Vista: /Users/edobacon/.kanai/data/kanai_data/inline-cases/kanai-eslint-real/plan.md
