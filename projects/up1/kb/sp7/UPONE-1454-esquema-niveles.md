# UPONE-1454 — Esquema de niveles (levelScheme)

- **Titulo Jira:** Curriculum Mapping | Esquema de niveles
- **Tipo:** Historia · **Epica:** [UPONE-1452](https://u-planner.atlassian.net/browse/UPONE-1452) Curriculum Mapping
- **Dueno:** Francisco Navarro · **Prioridad:** Mayor · **Estado:** Backlog
- **Modulo (Jira):** CurriculumMapping · **Sprint:** Migracion uAssessment - SP7 (jul 20-31)
- **SP planning:** 8 · **SP Jira:** **13** (subido de 8 el 2026-07-21) · **Alcance SP7:** IN — **prioridad del mod** (por sobre escalas de cobertura)
- **Maqueta:** `mockup-curriculum-mapping-v2.html` (vista "Esquema de nivel")

---

## Descripcion (Jira)

Sin descripcion en Jira. El alcance sale del transcript, la maqueta y la propuesta de competencias.

## Que es

Mantenedor del objeto **`levelScheme`**: define **como se mide una competencia** y en que niveles
de logro queda clasificada. Es una de las dos configuraciones previas a la matriz de competencias
(la otra, escalas de cobertura, se difiere a SP8). Estructura Composite: un **Esquema** (datos
generales) + sus **Niveles** (datos especificos) [00:26:21 / 00:28:05].

## Antecedentes / linaje

- Primer mantenedor funcional del mod `curricular-mapping` (epica
  [1452](https://u-planner.atlassian.net/browse/UPONE-1452)); depende del scaffold
  [1453](https://u-planner.atlassian.net/browse/UPONE-1453).
- Contexto de diseno completo en `competency-management-proposal-v1.md` (S 3.1 `levelScheme`).
  **Solo `levelScheme` es alcance de 1454**; el resto de la propuesta (matriz, rubrica, tributacion,
  logro) es contexto, no scope SP7.

## Tipos de medicion (kind) [00:26:21 / 00:27:00]

- **Cualitativa:** sin umbrales; el nivel se asigna por evidencia; descriptores obligatorios.
- **Cuantitativa:** el score cae dentro del rango min/max del nivel.
- **Mixta:** corte numerico + descriptor. **Pendiente de definicion funcional** [00:28:05]
  ("tengo que dar una vuelta como seria funcionalmente").

## Decisiones firmes del transcript

- **Marca puntaje vs nota (`scoreBasis`)** [00:28:05 / 00:29:53]: el esquema define si se mide via
  puntaje o nota; se normaliza a porcentaje para comparar entre facultades. *(La maqueta aun no la
  refleja; Esteban lo reconoce.)*
- **Intervalos CERRADOS** [00:33:58 / 00:36:27] + **regla de aproximacion**.
- **Regla de aproximacion** solo al final; agregaciones intermedias con todas las cifras
  (aprendizaje del reporte de Santo Tomas) [00:37:41]. No se resuelve en este mantenedor; va en la
  logica de calculo.
- **Decimales / cifras significativas = configuracion** por institucion (patron por mod tipo
  "Hello World Mod"); **capa visual = texto, almacenamiento = numero** (JS recorta ceros: "3.50" se
  muestra como texto, se guarda 3.5) [00:40:22 / 00:41:54 / 00:38:53].
- **Drag-and-drop para ordenar niveles = componente custom que NO existe en UP1** [00:17:28 /
  00:22:29]. Hay librerias/base (drag-drop en evaluaciones) pero "habria que crearlo" (+ tests +
  storybook). Es el mayor driver del estimado.
- **Desacople de niveles** [01:02:10 / 01:03:35]: antes las escalas de cobertura iban forzadas
  dentro del esquema; ahora se separan; el vinculo con cobertura no se ve hasta tributacion.

## Evidencia de la maqueta (`mockup-curriculum-mapping-v2.html`)

- Campos del esquema (~872-936): `code`, `name`, `description`, `kind`, `isPlatformDefault`, `inUse`,
  `levels[]`, `usedBy[]`, `history[]`.
- Campos del nivel (877-880): `position`, `name`, `code`, `weight`, `isAchieved`, `min`, `max`,
  `descriptor`.
- Cualitativa (906-909, 701): `min`/`max` en null, rangos deshabilitados.
- Editor de niveles (690, 705): rangos consecutivos, sin solapes ni huecos; `min` hereda del `max`
  anterior; al menos un nivel marcado como logrado; reorden (680).
- Vista de uso (`usedBy`): **excluida de esta version** [00:23:45 / 00:31:09].
- **Diferencias maqueta vs decision a alinear:** la maqueta muestra `isPlatformDefault` (transcript
  lo trata como complementario, [00:24:56]); la maqueta aun **no** refleja `scoreBasis` [00:28:05].

---

## Verificacion en codigo (2026-07-21, `uplanner/up1`)

Las dos incognitas que inflaron el estimado estan **en gran parte resueltas** por patrones existentes.

### Config de decimales / cifras significativas — RESUELTO (mecanismo existe)

El sistema de **config por mod esta completo** (es el que menciono Claus, "config por mod de UPW"):

- Se declara en **`config/settings.json`** del mod: entradas key-value con `dataType`
  (select/number/text), `default`, `label` (i18n), `options`, `allowUserOverride`. Ejemplo real en
  `mods/hello-world-mod/config/settings.json`.
- Al sync, cada entrada va a **`core_ConfigDefinition`** (por tenant).
- **Resolucion en cascada** (`object-manager/src/graphql/resolvers/up1/coreConfig.resolver.js`):
  default (`core_ConfigDefinition`) → override de tenant/admin (`core_Config` userId=null) → override
  personal de usuario (si `allowUserOverride=true`).
- **API de lectura runtime:** query `getConfigs(appName, keys, userId)` — con `appName="curricular-mapping"`
  devuelve los configs del mod; `saveConfig` para upsert; `getConfigApps` para el ConfigPanel.

→ La config de decimales de 1454 se modela como settings del mod, ej.:
```json
"cm.decimalPlaces":  { "dataType": "number", "default": 2, "label": "config.cm.decimalPlaces.label", "allowUserOverride": true },
"cm.roundingRule":   { "dataType": "select", "default": "halfUp", "options": [...], "label": "config.cm.roundingRule.label" }
```
Y se leen con `getConfigs`. **Ya no es "absolutamente incierto"** — es un patron productivo con cascada
por tenant/usuario. Lo unico a definir es el set de reglas de aproximacion soportadas (halfUp, etc.).

### Drag-and-drop — RESUELTO (patron reusable en cd)

- Libreria: **`sortablejs`** (cd ya la usa; `@types/sortablejs` en devDeps).
- Precedente directo: `mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionNode.ts`
  → `Sortable.create(container, { onEnd, animation, ... })` con a11y (`prefers-reduced-motion`) + nav por
  teclado (`useTreeKeyboardNav.ts`). Reordenar niveles de un esquema es una **lista plana** (mas simple
  que el arbol) → se reusa el patron, no se construye de cero.

### Tipo numerico en Prisma — limitacion a considerar

- `typeMappers.js`: el tipo JSON **`number` mapea a Prisma `Float`** (y `Decimal` tambien cae a `Float`).
  **No hay `@db.Decimal`** en el codegen. Para el enfoque acordado (guardar numero, formatear display como
  texto) Float alcanza, pero tiene imprecision de punto flotante — **cuidado en los bordes de intervalos
  cerrados** (ej. 2.0 exacto). Si se exige precision decimal exacta, seria un cambio de codegen (core).

### levelScheme es objeto NUEVO

- No existe ningun objeto `levelScheme`/`competencyNode`/`alignmentScale`/`rubric` en los mods de up1
  (los "Draft" de la propuesta no estan en el codigo). 1454 crea el objeto desde cero: Composite
  (Scheme + Level via recordType), siguiendo la propuesta S3.1 + la maqueta.

## Analisis de esfuerzo

- **SP planning 8 → Jira 8 → 13** (subido el 2026-07-21). Esteban [01:20:05]: "8 puntos por flujo
  mas complejo + desarrollo de componentes personalizados."
- **Calibracion DKC:** sesgo global up1 +100% → proyeccion ~12-16; 13 cae en la banda.
- **CORRECCION tras verificar codigo:** los dos drivers de riesgo (config de decimales + drag-drop)
  **tienen patron productivo** (settings/`getConfigs` y sortablejs de cd). El riesgo **BAJA**
  respecto a lo asumido en planning.
- **Veredicto:** **13 sigue razonable, ahora con menos riesgo** — cubre el objeto nuevo (Composite
  Scheme+Level, 3 kinds, scoreBasis, intervalos cerrados + validacion, descriptores), el editor de
  niveles (reusando sortablejs), layouts, tests + storybook, **en un mod nuevo** (depende de 1453). Con
  reuso agresivo podria acercarse a **8-10**, pero 13 es defendible por el volumen (objeto + editor +
  validaciones + config + tests).
- **Config de decimales:** ya no necesita ser item aparte incierto — es `config/settings.json` +
  `getConfigs` (cabe dentro del 13). Solo falta definir el catalogo de reglas de aproximacion.

## Certezas

- El objeto y su estructura (esquema + niveles) estan modelados en la maqueta.
- Reglas firmes: intervalos cerrados, aproximacion al final, normalizacion a porcentaje,
  cualitativa sin umbrales.
- La vista de uso queda fuera de esta version.
- El desacople esquema / cobertura esta decidido.

## Riesgos (revisados tras verificar codigo)

- ~~Config de decimales "incierta"~~ → **RESUELTO**: `config/settings.json` + `getConfigs` (cascada
  por tenant/usuario). Solo falta definir el catalogo de reglas de aproximacion.
- ~~Componente drag-drop custom de cero~~ → **MITIGADO**: sortablejs + patron reusable en cd
  (`CompositeSectionNode.ts`). Hay que adaptarlo a lista plana de niveles, no construirlo.
- **Mixta sin definir**: decidir si entra a 1454 o despues (Esteban) — sigue abierto.
- **Precision numerica (Float, no Decimal)**: `number`→Float en codegen; cuidado en bordes de
  intervalos cerrados. Precision decimal exacta requeriria cambio de codegen (core).
- **Dependencia de 1453**: 1454 no arranca sin el mod creado con su tooling de test/storybook.

## Observaciones / decisiones abiertas

1. `isPlatformDefault`: confirmar si entra en esta version (maqueta lo muestra; transcript lo trata
   como complementario).
2. Actualizar la maqueta para reflejar `scoreBasis` (puntaje vs nota).
3. `ownerType` / relacion con institucion por confirmar (Esteban dudo, [00:19:27]).

## No verificado en esta pasada (queda para el refinamiento)
- Catalogo exacto de reglas de aproximacion soportadas (halfUp, halfEven, truncate...).
- Forma actualizada de relacionar el esquema con la institucion (`ownerType` vs. organization unit).
- Definicion funcional del kind **Mixta** (Esteban).

> Ya verificado: patron de config por mod (`config/settings.json` + `getConfigs`, cascada por
> tenant/usuario); drag-drop reusable (sortablejs, `CompositeSectionNode.ts`); mapeo `number`→Float
> (sin Decimal); que `levelScheme` es objeto nuevo (sin draft en codigo).
