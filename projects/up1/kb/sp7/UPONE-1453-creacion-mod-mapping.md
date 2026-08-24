# UPONE-1453 — Creacion de MOD curriculum-mapping

- **Titulo Jira:** Curriculum Mapping | Creacion de MOD
- **Tipo:** Historia · **Epica:** [UPONE-1452](https://u-planner.atlassian.net/browse/UPONE-1452) Curriculum Mapping
- **Dueno:** Francisco Navarro · **Prioridad:** Mayor · **Estado:** Backlog
- **Modulo (Jira):** CurriculumMapping · **Sprint:** Migracion uAssessment - SP7 (jul 20-31)
- **SP planning:** 1 · **SP Jira:** **2** (subido de 1 el 2026-07-21) · **Alcance SP7:** IN
- **Maqueta:** contexto en `mockup-curriculum-mapping-v2.html`

---

## Descripcion (Jira)

Sin descripcion en Jira. Alcance del transcript + contexto de la epica.

## Que es

Levantar el scaffold del nuevo mod, que alojara los mantenedores de esquema de niveles (1454) y, mas
adelante, escalas de cobertura y la matriz de competencias.

> **Guia de implementacion del dev (autoritativa):** [CREATE-curricular-mapping.md](CREATE-curricular-mapping.md)
> — plan paso a paso publicado por el dev. Lo de abajo (receta generica) sigue valido como referencia,
> pero **para ejecutar 1453 se sigue esa guia**.

### Correcciones/precisiones que trae la guia del dev

1. **Nombre canonico del mod: `curricular-mapping`** (kebab), npm `@uplanner/curricular-mapping`. (No
   `curriculum-mapping` como asumi antes; el label de negocio bajo la epica sigue siendo "Curriculum
   Mapping"). `config/app.json`: `icon: "bi-diagram-3"`, `iconBg: "#8B5CF6"`, `order: 11`,
   `tenants: {"UPU": {}}`.
2. **El repo YA EXISTE** — clonado en `up1/mods/curricular-mapping/` (rama base, commit inicial, solo
   `.gitignore`). El paso "crear repo" esta hecho; se arranca por el **scaffolding de contenido**.
3. **Registro doble en `up1/package.json`:** ademas de `uPlannerMods` (`curricular-mapping.git`), hay
   que agregar la ruta al array **`workspaces`** (`mods/curricular-mapping`). *(Este segundo registro no
   estaba en mi receta previa.)*
4. **Los mods NO son npm workspaces para install** — se instalan aparte con `npm run install-mods`
   (`scripts/actions.js:installModDependencies`).
5. **Secuencia de boot completa:** `update-repos` → `install-mods` → `sync` → `codegen` →
   `tenant:migrate` → `./up1-start.sh --om --suite`.
6. **Sync es append-only** para destinations del core existentes: NO propaga eliminaciones de fields.
   Si el mod elimina un campo de un objeto, hay que borrar el destination del core y re-sincronizar.
7. **Capabilities object-level SIN prefijo `mod/`** (RULE-mods-037): `<objeto>:view|create|modify|delete`.
   Las de modulo si llevan `mod/curricular-mapping:<accion>`.
8. **Escrituras gobernadas via mutations `*Validated`**, no CRUD generic (integridad server-side; MCP y
   CRUD generic bypassan el front).
9. **DoD explicito** (seccion 8 de la guia): estructura + app.json/capabilities validos + objetos/
   layouts/lang implementados + registrado + sync/codegen/migrate OK + verificacion (mod visible, CRUD,
   capabilities, tests verdes) + README/CLAUDE.md/.ai escritos.

> El dominio (objetos, capabilities, seed concretos) queda como **placeholder** en la guia — el foco de
> 1453 es el scaffolding y el registro para que el mod levante y sincronice. Los objetos reales (ej.
> `levelScheme`) los aporta 1454.

## Evidencia del transcript

- Levantar el mod [~01:56:09 resumen]: "hay que levantar el mod tambien, no que implique tantas cosas".
- Ticket propio [01:04:53]: "un tiquetico de crear el mod, configurar el mod, que quede registrado aparte".
- Exploratorio [01:16:21]: "sale rapido... uno", pero "no sabemos como se hace" (la config del mod).

---

> **Guia completa:** [guia-creacion-mod.md](guia-creacion-mod.md) — referencia standalone de todo lo que
> debe contener un mod y como se hizo en cd. El resumen operativo esta abajo.

## Receta de creacion de mod (verificado en codigo, `uplanner/up1`)

### 1. Que hace `npm run create-mod` (scaffold MINIMO)

`scripts/create-mod.js` (interactivo). Pide nombre kebab-case + si tiene repo remoto. Genera:

- **Carpetas:** `objects/`, `logic/`, `modsComponents/`, `modsComposables/`, `lang/`, `css/`,
  `config/`, `events/`, `flows/`.
- **`capabilities.json`** → `{ module, version: "1.0.0", capabilities: [] }`.
- **`config/app.json`** → `{ name, label, icon: "bi-puzzle", iconBg, order: 99, tenants: ["TEST"],
  version: "1.0.0", defaultObjects: [], up1ModelVersion }` (lee `up1ModelVersion` de
  `object-manager/objects/model.json`).
- **`package.json`** → `@uplanner/<mod>`, type module, private, scripts `test`/`test:watch`/`test:coverage`.
- Si hay repo remoto: `git clone -b develop` + lo registra en `uPlannerMods` del `package.json` raiz.

> El scaffold es **minimo**. NO trae tsconfig, eslint, vitest.config, storybook, husky, tests, docs ni
> .ai. Para paridad con un mod productivo hay que agregarlos (ver §3).

### 2. Estructura de un mod maduro (referencia: `curriculum-design`)

**Carpetas de contenido (se sincronizan al core):**

| Carpeta | Contenido | Sync destino |
|---|---|---|
| `objects/` | Definiciones JSON de objetos (+ `objects/RecordTypes/`) | object-manager/objects |
| `logic/` | Pares `*.resolver.js` + `*.schema.graphql`, `helpers/`, `errors.js` | object-manager/resolvers + typeDefs |
| `modsComponents/` | Componentes Vue (uno por carpeta) | layout/ + suite/modsComponents |
| `modsComposables/` | Composables Vue | suite |
| `lang/{en,es,pt}/` | i18n | suite/lang |
| `css/{1-theme..5-contextId}/` | Estilos por capa | suite/css |
| `config/app.json` | Manifiesto del app/mod | tenant DBs |
| `config/layouts/` | Layouts JSON (`default_<Obj>_{list,view,edit,create}`, `rt__*`) | tenant DBs |
| `config/reports/`, `config/settings.json` | Reportes + settings | tenant DBs |
| `events/*.json` | Definiciones de eventos (BullMQ) | object-manager |
| `flows/*.json` | Workflows n8n | n8n |
| `seed/` | Datos semilla | tenant DBs |
| `capabilities.json` | RBAC del mod | DB |

**Tooling / meta (NO se sincroniza, vive en el repo del mod):**

`package.json` (+ `package-lock.json`), `tsconfig.json`, `eslint.config.js`, `vitest.config.ts`,
`vueform.config.ts`, `.storybook/`, `.husky/`, `types/`, `scripts/migrations/`, `docs/`
(`architecture/guides/patterns/reference/user-guide`), `.ai/` (`CONTEXT.md`, `PATTERNS.md`, `TASKS.md`,
`TROUBLESHOOTING.md`), `README.md`, `CLAUDE.md`, `coverage/`.

> **`hello-world-mod`** es el template de referencia mas cercano al scaffold "usable" (trae todas las
> carpetas de contenido + `config/settings.json` + `events/` + `flows/` + `.ai/` + `tests/` +
> `vitest.config.js` + `README.md`). Buen punto de copia base.

### 3. Convenciones de testing (como en cd)

- **`vitest.config.ts` con dos entornos:** `node` (logica pura: `tests/unit`, `tests/integration`,
  `modsComponents/**/*.spec`) y `jsdom` (componentes Vue: `tests/component/*.component.spec.ts`, que
  declaran `@vitest-environment jsdom` en el docblock).
- **Aliases clave para correr DENTRO del monorepo up1:** `vue` → una sola copia del root (evita doble
  copia que rompe reactividad), `@om` → `object-manager/src`, `@om-scripts`, y stubs locales
  (`tests/stubs/{atoms,molecules,useApolloClient,i18next-vue}.ts`) para aislar componentes/composables.
- **Capas de test:**
  - `tests/unit/` — logica pura, prisma mockeado.
  - `tests/integration/` — reglas de negocio (resolvers via `_internals`, payloads, validaciones).
  - `tests/component/` — componentes Vue en jsdom (+ a11y con axe-core).
  - `tests/llm-e2e/` — escenarios MCP/agente (`fixtures/`, `scenarios/`, `runner-instructions.md`).
  - `tests/stubs/` — dobles de atoms/molecules/apollo/i18n.
- **Scripts:** `test` (vitest run), `test:watch`, `test:coverage`, `lint` (eslint del root),
  `lint:fix`, `typecheck` (`vue-tsc --noEmit`), `storybook` (puerto propio, cd usa 6010),
  `build-storybook`, `prepare` (husky).
- **Regla dura (learn UPONE-1382):** para codigo de datos (deep-clone, proyecciones RT/ext, enums,
  casing de FK) el **prisma mockeado consagra bugs de runtime** — exigir **integration contra BD real**,
  no solo unit mockeado. Resolver nombres de modelo/FK por introspeccion, no por string.

### 4. Registro y sync

- **`config/app.json`**: `name`, `label`, `icon`, `iconBg`, `order`, `tenants` (**ojo con el shape**: el scaffold
  genera array `["TEST"]`, pero cd usa **objeto** `{"UPU": {}}` — config por tenant; usar la forma de cd
  con `UPU`), `version`, `defaultObjects` (objetos top-level del nav),
  `up1ModelVersion`.
- **Repo standalone** (rama `develop`) clonado en `mods/`; registrado en `uPlannerMods` del
  `package.json` raiz.
- **`npm run sync`** propaga a los 10 fases (objects, resolvers/typedefs, capabilities, layouts, seed,
  flows, drift check). Ejecutar tras cada cambio de archivos del mod.

### 5. Naming de capabilities

`mod/<modname>:<action>` (ej. `mod/curriculum-mapping:view` / `:edit`) o
`mod/<modname>/<domain>:<action>` para dominios consolidados. Cada capability lleva `riskLevel`
(low/medium/high). NO usar nombres legacy (`objectdefinition:view`, etc.).

---

## Alcance funcional de 1453 (segun la guia del dev)

El repo ya existe → se arranca por el contenido:

1. **Scaffolding de contenido** en `mods/curricular-mapping/`: carpetas obligatorias (`config/{app.json,
   layouts/}`, `objects/RecordTypes/`, `lang/{es,en,pt}/`, `capabilities.json`, `package.json`,
   `README.md`, `CLAUDE.md`) + segun necesidad (`logic/`, `seed/`, `modsComponents/`, `css/`, `tests/`,
   `docs/`, `.ai/`, `.storybook/`).
2. **Archivos raiz** copiados de cd y adaptados: `package.json` (`@uplanner/curricular-mapping`),
   `tsconfig.json`, `vitest.config.ts`, `eslint.config.js` (tal cual), `vueform.config.ts` (si hay
   componentes). Quitar deps no usadas (sortablejs/storybook) si no hay UI custom aun.
3. **`config/app.json`**: `name: "curricular-mapping"`, `label`, `icon: "bi-diagram-3"`,
   `iconBg: "#8B5CF6"`, `order: 11`, `tenants: {"UPU": {}}`, `defaultObjects: []`, `up1ModelVersion: 1`.
4. **`capabilities.json`**: `mod/curricular-mapping:view|edit` (+ riskLevel). Las object-level (sin
   prefijo `mod/`, RULE-mods-037) vienen con los objetos de 1454.
5. **Registro en `up1/package.json`**: agregar a `uPlannerMods` (`curricular-mapping.git`) **y** a
   `workspaces` (`mods/curricular-mapping`).
6. **Boot:** `update-repos` → `install-mods` → `sync` → `codegen` → `tenant:migrate` →
   `./up1-start.sh --om --suite`.
7. **Verificar** (seccion 7 de la guia): mod visible en la suite, backend expone objetos, layouts
   renderizan, capabilities registradas, i18n resuelve, tests verdes.

## Condicion de seguridad (aclarada)

- Francisco [01:25:49 / 01:27:43]: preocupacion por los **scripts autogenerados del "mod maqueta"** que
  paso JP. Esteban aclara que esa inquietud venia de **otro flujo** (comentado por Laud), **distinto de
  `create-mod`**. Es decir: `create-mod` (el scaffold oficial de arriba) es seguro y conocido; la duda
  es sobre un **generador de mod-desde-maqueta** (que produce codigo a partir del HTML). Antes de usar
  ESE generador para productivizar, revisar reutilizacion/seguridad de su output.
- **Recomendacion:** para 1453 usar el scaffold oficial (`create-mod` + copia de `hello-world-mod`), NO
  el generador desde maqueta. El analisis de seguridad del generador es un item aparte (sin ticket).

---

## Analisis de esfuerzo

- **SP planning 1 → Jira 1 → 2** (subido 2026-07-21).
- **Tras verificar codigo:** el scaffold en si es ~1 (comando + config). El 2 cubre ademas el **tooling
  de mod maduro** (vitest/tsconfig/eslint/storybook/husky/.ai) que 1454 necesita para tests + storybook.
- **Veredicto:** **2 correcto.** Bajo riesgo si se usa el scaffold oficial. El unico "exploratorio" es
  cuanto tooling copiar de cd; con `hello-world-mod` + configs de cd como plantilla, es mecanico.

## Certezas
- `create-mod` existe y esta claro; `hello-world-mod` y `curriculum-design` son plantillas verificadas.
- Estructura, sync, capabilities y testing conventions documentadas arriba.

## Riesgos
- Usar el **generador desde maqueta** (no `create-mod`) sin revisar seguridad — evitar para 1453.
- Olvidar el tooling de test/storybook → 1454 no podria cumplir su definicion de done.

## Observaciones / decisiones abiertas
1. Confirmar nombre exacto del repo del mod y que `tenants` incluya UPU (no `TEST`).
2. Decidir cuanto tooling se copia ahora vs. incremental (recomendado: todo el de cd de una).

## No verificado en esta pasada
- Estado del generador de mod-desde-maqueta / archivos de JP (item de seguridad aparte).
