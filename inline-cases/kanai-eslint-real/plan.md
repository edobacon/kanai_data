# Plan inline: Lint real en kanai-app

> Vista generada por Kanai desde plan.yaml y log.ndjson. No la edites a mano: se regenera en cada registro.

**Intención:** Integrar ESLint con config flat propia (typescript-eslint + eslint-plugin-vue) y reglas minimas, dejando el codigo actual sin violaciones, para que el job Calidad de CI revise de verdad.
**Tags:** repos: kanai-app · labels: lint, ci, deuda-tecnica
**Estado:** 0 de 6 fases cerradas. Juez final: pendiente.

## Registro de avance

| Fase | Meta | Estado | Fecha real | Commits | Criterios | Pendiente |
|---|---|---|---|---|---|---|
| F1 Preparar rama, dependencias y config local | Tener la config flat y sus dependencias en el working tree, y una medicion de `pnpm lint` sobre todo el repo (no solo las 5 carpetas medidas), sin commit todavia. | Pendiente | - → - | - | 0/2 | F1.1; F1.2; F1.3; F1.4 |
| F2 Borrar eslint-disable sin efecto | Quitar los 44 eslint-disable de no-console y no-control-regex, que no hacen nada con la config elegida. | Pendiente | - → - | - | 0/2 | F2.1; F2.2 |
| F3 Limpiar imports y variables sin uso | Resolver las 42 violaciones de no-unused-vars revisando cada una: borrar lo muerto y reportar lo que parezca un bug o una asercion faltante. | Pendiente | - → - | - | 0/3 | F3.1; F3.2; F3.3; F3.4 |
| F4 Revisar y anotar los 20 v-html | Confirmar que cada v-html sin anotar renderiza HTML escapado o sanitizado; anotar los seguros con eslint-disable y corregir el origen de los que no lo sean. | Pendiente | - → - | - | 0/3 | F4.1; F4.2; F4.3; F4.4 |
| F5 Commit de la config y paridad local con CI | Commitear config y dependencias y reproducir en local el job Calidad completo antes de entregar. | Pendiente | - → - | - | 0/2 | F5.1; F5.2; F5.3 |
| F6 Entrega | Llevar los 4 commits a setup y pushear con OK explicito del dev, con CI en verde. | Pendiente | - → - | - | 0/1 | F6.1; F6.2; F6.3 |

## Riesgos

- Un import o variable sin uso puede ocultar un bug (valor calculado que se dejo de usar): revisar cada caso antes de borrarlo.
- En tests, una variable sin uso (p.ej. un spy 'warn' o un 'db') puede indicar una asercion faltante: no se cambian aserciones sin OK del dev.
- Un v-html sin sanitizar es un riesgo de XSS: anotarlo sin revisar lo silencia.
- Mientras no se pushee, el commit de config hace fallar lint si se aplica sin los commits de limpieza: se pushean juntos.

## Fuera de alcance

- Modulo @nuxt/eslint y preset de Nuxt (descartados).
- Activar no-console, no-control-regex u otras reglas fuera de las tres minimas.
- Reglas de estilo/formato (prettier sigue aparte).

## Fases

### F1. Preparar rama, dependencias y config local

**Meta:** Tener la config flat y sus dependencias en el working tree, y una medicion de `pnpm lint` sobre todo el repo (no solo las 5 carpetas medidas), sin commit todavia.
**Esfuerzo:** 30 min

**Registro F1** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F1-P1: Working tree de kanai-app sin cambios ajenos pendientes (hoy hay cambios en app/utils/markdown.ts y 2 docs que no son de este caso): commitearlos, guardarlos o confirmar que se dejan fuera.
  - [ ] F1-P2: Node 24 en el PATH (el default de la maquina es 22).
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F1.1** pendiente: Crear la rama chore/eslint-real desde setup actualizada.
  - **F1.2** pendiente: Agregar devDependencies typescript-eslint, eslint-plugin-vue y vue-eslint-parser.
  - **F1.3** pendiente: Reescribir eslint.config.mjs con la config medida (flat/base de vue, parser vue + TS, las 3 reglas en error) y reemplazar el comentario de 'Fase 0' por uno que diga que reglas aplica y por que solo esas.
  - **F1.4** pendiente: Correr pnpm lint sobre todo el repo y comparar con la medicion (106 en 47 archivos). Si aparecen archivos fuera de app/server/shared/scripts/tests (configs raiz, skills/, docs/), decidir con el dev si se lintean o se ignoran.
- **Criterios cumplidos:**
  - **F1-C1** pendiente (command): pnpm lint ya revisa los .ts/.mts/.vue (no aparece 'File ignored because no matching configuration was supplied').
  - **F1-C2** pendiente (manual): Los numeros de F1.4 estan registrados y cualquier diferencia con la medicion esta explicada.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F2. Borrar eslint-disable sin efecto

**Meta:** Quitar los 44 eslint-disable de no-console y no-control-regex, que no hacen nada con la config elegida.
**Esfuerzo:** 15 min

**Registro F2** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F2-P1: F1 cerrada con la config en el working tree.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F2.1** pendiente: Quitar los eslint-disable sin efecto con el autofix de ESLint y revisar el diff (que solo se borren esos comentarios).
  - **F2.2** pendiente: Commit solo con esos archivos (sin la config ni las dependencias), mostrando antes al dev mensaje y archivos.
- **Criterios cumplidos:**
  - **F2-C1** pendiente (command): pnpm lint ya no reporta 'Unused eslint-disable directive'.
  - **F2-C2** pendiente (evidence): Commit registrado con su SHA.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F3. Limpiar imports y variables sin uso

**Meta:** Resolver las 42 violaciones de no-unused-vars revisando cada una: borrar lo muerto y reportar lo que parezca un bug o una asercion faltante.
**Esfuerzo:** 1 a 2 h

**Registro F3** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F3-P1: F2 cerrada.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F3.1** pendiente: En server/, scripts/ y app/: borrar imports sin uso; para variables asignadas y nunca leidas (p.ej. preLevel.ts:162 'profile', chat.vue:336 'CLOSE_PATH', tickets/[id].vue:402 'artifactIsCode', kb.vue:124 'isMd', modelos.vue:31 'selectedHistory'), confirmar si es codigo muerto o un uso que se perdio, y reportar los segundos al dev antes de tocar.
  - **F3.2** pendiente: En tests/: borrar imports sin uso; las variables sin uso que parezcan una asercion faltante (db.test.ts:214 'db', rueditas-readiness.test.ts:57 'db', judge-hardening-hosts.test.ts:139 y 164 'warn') se le muestran al dev y no se cambian aserciones sin su OK.
  - **F3.3** pendiente: Correr typecheck y tests para confirmar que nada dependia de lo borrado.
  - **F3.4** pendiente: Commit de la limpieza (sin config ni dependencias), mostrando antes mensaje y archivos.
- **Criterios cumplidos:**
  - **F3-C1** pendiente (command): pnpm lint no reporta @typescript-eslint/no-unused-vars.
  - **F3-C2** pendiente (manual): typecheck y tests sin fallas introducidas.
  - **F3-C3** pendiente (evidence): Commit registrado con su SHA.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F4. Revisar y anotar los 20 v-html

**Meta:** Confirmar que cada v-html sin anotar renderiza HTML escapado o sanitizado; anotar los seguros con eslint-disable y corregir el origen de los que no lo sean.
**Esfuerzo:** 1 a 2 h

**Registro F4** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F4-P1: F3 cerrada.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F4.1** pendiente: Rastrear cada funcion productora (renderMarkdown, formatExec, highlightLine, hlCell, line.html, markdownHtml, md de DataModelFlow y los 2 de tickets/[id].vue) hasta donde escapa o pasa por DOMPurify, con archivo:linea.
  - **F4.2** pendiente: Guardar la revision en el KB del caso (revision-v-html.md): por cada uso, fuente del contenido, como se protege y veredicto.
  - **F4.3** pendiente: Anotar los seguros con <!-- eslint-disable-next-line vue/no-v-html --> igual que los 32 existentes; si alguno no es seguro, proponer al dev el arreglo del origen antes de aplicarlo.
  - **F4.4** pendiente: Commit propio de la revision de v-html, mostrando antes mensaje y archivos.
- **Criterios cumplidos:**
  - **F4-C1** pendiente (command): pnpm lint no reporta vue/no-v-html.
  - **F4-C2** pendiente (evidence): revision-v-html.md guardada en el KB del caso con un veredicto por cada uno de los 20 usos.
  - **F4-C3** pendiente (evidence): Commit registrado con su SHA.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F5. Commit de la config y paridad local con CI

**Meta:** Commitear config y dependencias y reproducir en local el job Calidad completo antes de entregar.
**Esfuerzo:** 30 min

**Registro F5** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F5-P1: F2, F3 y F4 cerradas.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F5.1** pendiente: Revisar si README.md (linea 71) y docs/README.md (linea 199) necesitan mencionar que lint aplica; actualizar solo si dicen algo que ya no es cierto.
  - **F5.2** pendiente: Correr el job Calidad completo en local con instalacion congelada.
  - **F5.3** pendiente: Commit de eslint.config.mjs, package.json y pnpm-lock.yaml (y docs si cambiaron), mostrando antes mensaje y archivos.
- **Criterios cumplidos:**
  - **F5-C1** pendiente (command): check:ui, docs:check, lint y typecheck pasan en local con Node 24.
  - **F5-C2** pendiente (evidence): Commit registrado con su SHA.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F6. Entrega

**Meta:** Llevar los 4 commits a setup y pushear con OK explicito del dev, con CI en verde.
**Esfuerzo:** 15 min
**Cómo deshacerla:** Revertir el commit de config (F5.3) devuelve pnpm lint al estado anterior sin tocar runtime; los commits de limpieza (F2 a F4) pueden quedarse porque solo borran codigo muerto y anotan v-html. Si hace falta volver todo: git revert de los 4 commits en orden inverso y push.

**Registro F6** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F6-P1: F5 cerrada con la paridad local en verde.
  - [ ] F6-P2: OK explicito del dev para integrar en setup y hacer push.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F6.1** pendiente: Integrar chore/eslint-real en setup (fast-forward si setup no avanzo; si avanzo, volver a correr la paridad de F5 sobre el resultado).
  - **F6.2** pendiente: Push de setup (lo ejecuta el dev).
  - **F6.3** pendiente: Confirmar que el job Calidad de CI pasa en el push.
- **Criterios cumplidos:**
  - **F6-C1** pendiente (evidence): Job Calidad en verde en GitHub Actions para el commit pusheado.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.
