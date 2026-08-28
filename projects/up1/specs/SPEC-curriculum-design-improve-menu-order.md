---
id: SPEC-curriculum-design-improve-menu-order
project: up1
ticket: TICKET-136
status: closed
---

# Curriculum Design — Orden y nombres de las vistas del menu via labelKey por app

# Curriculum Design — Orden y nombres de las vistas del menu via labelKey por app

## Executive summary — lo que estas aprobando

> *Esta seccion esta disenada para revision rapida. El detalle tecnico vive en Requirements, Changes y Tasks. Si te basta con el Executive summary para decidir, ese es el objetivo.*

**Que se quiere**: el menu de Curriculum Design hoy muestra sus cinco vistas en un orden que no sigue el flujo de trabajo del disenador curricular (carrera → plan → asignatura), con nombres que no coinciden con lo que el PO pidio, y el encabezado de la vista de planes de estudios dice "Currículos" mientras el menu deberia decir "Planes de estudios". Todo el trabajo es del mod, sin tocar core, pero se entrega en **dos tramos con acoplamiento distinto a UPONE-1645 (TICKET-132)**:

1. **Session 1 — reorden + encabezado**: reordenar las cinco vistas al orden del PO (posicion en `defaultObjects`, **forma mixta que preserva las `labelKey` ya presentes de Activity/Offering** — ver DEC-LOCAL-03) y alinear el encabezado desalineado de planes de estudios ("Currículos" → "Planes de estudios"), con su test verde. Usa **solo capacidades existentes** de la plataforma (posicion en `defaultObjects` + `label` del layout).
2. **Tramo dependiente (Session 2) — dependencia dura de 1645**: nombrar **las cinco vistas** del menu con su texto objetivo, incluyendo Activity y Offering (que comparte Engagement), via `labelKey` por app; requiere que el mecanismo `labelKey` exista en la plataforma. Solo este tramo se secuencia tras 1645.

**El desbloqueo** del tramo 2 es UPONE-1645: introduce `labelKey` por entrada de vista, con cascada `labelKey → object.<Objeto> → nombre tecnico` (REQ-03 de ese spec), aplicable a cualquier entrada de nav (`defaultObjects` y `navByRole`, REQ-01). `labelKey` es una clave i18n **propia del mod** (ej. `nav.curriculumDesign.curriculum`), no `object.<Objeto>`. Por eso el override por tenant de UPU (que solo toca claves `object.*`) **no la ensombrece**, y como `labelKey` se resuelve **antes** de `object.<Objeto>`, el mod gana el nombre del menu sin editar core, sin decision de PO, y sin efecto cruzado sobre Engagement.

**Correccion respecto del intake**: el intake (H7) concluyo que en UPU el override por tenant ensombrece al mod y que por eso el nombre del menu de las tres vistas libres "no se puede cambiar mod-only". Eso es **incorrecto una vez que existe 1645**: la app declara una `labelKey` que apunta a una clave del propio mod, no a `object.*`; esa clave no esta ensombrecida por el override y gana en la cascada. El renombre del menu deja de ser una decision de PO y pasa a ser el mismo mecanismo (labelKey) para las cinco vistas.

**Reconciliacion con el request inmutable** (DET-3: el `## Request` del ticket no se reescribe; se reconcilia aqui):

- **Item superado**: el request pedia "documentacion de por que Activity y Offering conservan su nombre actual". Ese entregable **queda superado**: el dev sanciono renombrar Activity y Offering via 1645, asi que **ya no conservan su nombre actual**. El deliverable de documentacion cambia a "documentar el patron `labelKey` por app y la condicion de secuenciacion sobre 1645" (S2.T3).
- **Ampliacion de alcance sancionada por el dev**: el request acota "el renombre de las vistas de Activity y Offering queda fuera por bloqueo" y pide el resto "usando capacidades existentes". La decision del dev **amplia el alcance** de forma consciente: el reorden y el encabezado se entregan con capacidades existentes (Session 1, sin 1645), y los renombres de **las cinco vistas** (las tres libres + Activity + Offering) entran en alcance condicionados a 1645 (Session 2). Ver DEC-LOCAL-02.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | **Desacoplar la entrega en dos tramos**: S1 (reorden + encabezado) con capacidades existentes, sin 1645; S2 (renombre de las 5 vistas via labelKey) con dependencia dura de 1645 | El reorden y el encabezado entregan valor de UX ya, aunque 1645 se demore; solo el renombre del menu gatea sobre 1645. Evita que la mejora quede rehen del ticket de core |
| 2 | Nombrar las cinco vistas del menu via `labelKey` en `config/app.json` del mod, con clave i18n propia del mod (`nav.curriculumDesign.*`) — **Session 2** | Es una clave del namespace del mod, no `object.*`: el override por tenant no la toca, y labelKey gana antes de `object.<Objeto>` (1645 REQ-03). El mod es dueno del nombre sin tocar core ni afectar a Engagement (1645 REQ-04, aislamiento por app) |
| 3 | El encabezado de Curriculum se alinea via el mod ("Currículos" → "Planes de estudios") — **Session 1** | El encabezado sale de `layout.<layout>.label`, un sistema distinto de la clave del menu; es mod-only, con capacidades existentes e independiente de labelKey/1645 (H5 del ticket) |
| 4 | Ampliar el alcance del request para renombrar **las cinco vistas** (no solo las tres libres): Activity y Offering incluidas via el mismo labelKey — **Session 2** | El request las dejaba fuera por bloqueo; el dev sanciona incorporarlas ahora que 1645 provee la capacidad. Ampliacion consciente, condicionada a 1645. Ver DEC-LOCAL-02 |

**Riesgos principales y como los mitigamos**:

- **Regresion silenciosa en el menu de Engagement** (comparte los objetos Activity/Offering) → la `labelKey` del mod vive en el namespace i18n de Curriculum Design y se aplica por tab de su propia app; Engagement no la declara y no la ve (1645 REQ-04). S2 lo verifica en runtime como regresion critica. En S1 el reorden no toca ningun nombre, asi que Engagement queda intacto por construccion.
- **`defaultObjects` en forma objeto rechazado por el schema** → la variante objeto `{object, labelKey}` en `defaultObjects` solo la declara el schema del objeto de app tras UPONE-1645 (REQ-01 de ese spec). Por eso **S2** (que introduce la forma objeto) ejecuta despues de 1645; **S1** mantiene la forma string actual y no depende del schema nuevo.
- **Conflicto de claves i18n aborta el sync** → las claves `nav.curriculumDesign.*` son nuevas y propias del mod (no colisionan con `object.*` ni con otros mods); se cubren en es/en/pt con paridad y se verifica el sync limpio en S2 (donde se declaran).
- **Romper el build por el test del array** → cada cambio de forma del array y la actualizacion del test van en la misma sesion (reorden string + test en S1; forma objeto con labelKey + test en S2); el gate no cierra sin el test verde.

**Que NO se hace en este ticket** (limites explicitos):

- **Implementar el mecanismo labelKey** (schema, normalizeTab, tipo GraphQL, resolucion en el cliente): es UPONE-1645 (TICKET-132), dependencia dura de S2. 136 solo lo **consume** desde el mod.
- **Editar el override por tenant** (`suite/lang/tenants/upu/...`): ya no hace falta. La `labelKey` del mod gana sin tocar el override; el override queda intacto.
- **Titulo de la pestana del navegador**: hoy refleja solo el nombre de la app (`suite/pages/[tenant_id].vue:254-268`); alinearlo con la vista seria core no contemplado (OQ-02).
- **Documentar por que Activity/Offering conservan su nombre**: el request lo pedia, pero **queda superado** — el dev sanciono renombrarlas via 1645, asi que ya no conservan su nombre. El deliverable de documentacion se reorienta a "documentar el patron labelKey por app y la condicion de secuenciacion sobre 1645" (S2.T3). Ver Open questions y DEC-LOCAL-02.

**Tamano estimado**: 2 sessions ejecutables, aproximadamente 2-3h efectivas. **S1 (reorden + encabezado) se puede ejecutar ya**, sin 1645. **S2 (renombre via labelKey + verificacion runtime) se secuencia tras UPONE-1645**. La mas riesgosa es S2 (verificacion runtime de dos apps en UPU), no el cambio de config.

**Como vas a saber que funciona**:

- *(S1, sin 1645)* Abro el menu de Curriculum Design en UPU y las cinco vistas aparecen en el orden: programas academicos, planes de estudios, programa de asignatura, silabos, historial de cambios (con los nombres que ya resuelve la plataforma hoy).
- *(S1, sin 1645)* Navego a la vista de planes de estudios y el encabezado dice "Planes de estudios" (ya no "Currículos"), coherente con la ruta de navegacion.
- *(S2, tras 1645)* Cada una de las cinco vistas del menu muestra su nombre objetivo (incluidas Activity="Programa de asignatura" y Offering="Sílabos").
- *(S2, tras 1645)* Abro el menu de Engagement en el mismo tenant y sus nombres siguen intactos (Activity="Actividad", Offering="Ofertas").
- *(S1)* `npm test` del mod (integration) verde con el array reordenado en forma string; *(S2)* verde con el array en forma objeto con labelKey.

---

## Purpose

Mejorar la navegacion de la app Curriculum Design para el disenador curricular, entregada en dos tramos con acoplamiento distinto a UPONE-1645 (TICKET-132):

- **Session 1 (capacidades existentes)**: reordenar las cinco vistas a la secuencia de trabajo del PO (carrera → plan → asignatura → silabos → historial), reordenando el array `defaultObjects` en **forma mixta que preserva las `labelKey` de Activity/Offering** (DEC-LOCAL-03), y alinear el encabezado de la vista de planes de estudios (hoy "Currículos") con su entrada de menu. Se actualiza el test que fija el array.
- **Tramo dependiente (Session 2, dependencia dura de 1645)**: dar a **las cinco vistas** su nombre objetivo en el menu, adoptando la capacidad `labelKey` por app introducida por UPONE-1645. El nombre se declara como una clave i18n propia del mod, que gana sobre `object.<Objeto>` y no es alcanzada por el override por tenant, de modo que el cambio es enteramente del mod, sin efecto sobre la app de Engagement que comparte los objetos Activity y Offering. Se convierte `defaultObjects` a forma objeto `{object, labelKey}` y se actualiza el test.

Solo el tramo 2 se secuencia tras UPONE-1645, cuyo mecanismo se consume ahi; el tramo 1 entrega valor de UX de inmediato.

## Requirements

### REQ-IMPROVE-01: Orden de las cinco vistas segun el PO

> **Que cambia**: al abrir el menu de Curriculum Design, las cinco vistas aparecen en el orden carrera → plan → asignatura → silabos → historial, en vez del orden actual que arranca por "Actividad".
> **Por que**: el disenador trabaja en ese orden y hoy tiene que traducir mentalmente la posicion de cada vista.

El sistema MUST presentar las vistas de la app Curriculum Design en el orden declarado por la posicion en `defaultObjects`: `AcademicProgram, Curriculum, Activity, Offering, core_DataLog` (programas academicos, planes de estudios, programa de asignatura, silabos, historial de cambios). **Reconciliacion post-1645 (DEC-LOCAL-03):** UPONE-1645 ya esta mergeado, y su smoke dejo Activity/Offering en forma objeto con `labelKey` + i18n es/en/pt en este mod. Por lo tanto el reorden de S1 **preserva** esa forma objeto+`labelKey` para Activity/Offering (no vuelve a string, para no despojar sus nombres) y usa strings para las tres vistas libres, todo en el orden PO. El reorden no depende de 1645 en si (es posicion en el array) y NO despoja ningun `labelKey` existente.

**Actor**: user (disenador curricular)
**Layers**: config (mod), frontend (render del menu, ya existente en core)
**Session**: 1 (independiente de 1645)

<details><summary>Scenarios de validacion</summary>

#### Scenario: menu en el orden objetivo
- **GIVEN** el tenant UPU con la app Curriculum Design activa y el sync corrido
- **WHEN** el usuario abre el menu de Curriculum Design
- **THEN** las cinco entradas aparecen en el orden: programas academicos, planes de estudios, programa de asignatura, silabos, historial de cambios
- **AND** la ruta de navegacion (breadcrumb) de cada vista hereda la misma etiqueta que el menu (`suite/composables/breadcrumbTrail.ts:216-220`)

#### Scenario: sin cambios en core
- **GIVEN** el reorden declarado solo en `mods/curriculum-design/config/app.json`
- **WHEN** se corre `npm run sync`
- **THEN** el orden se propaga al tenant sin editar ningun archivo de core ni artefacto sincronizado a mano

</details>

#### Acceptance
**El usuario puede verificar que funciona**: abre el menu de Curriculum Design en UPU y ve las cinco vistas en el orden pedido.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Array reordenado (forma string) y test lo fija | mod curriculum-design | editar `defaultObjects` + correr `layouts-declared.test.ts` | assert del array actualizado a `['AcademicProgram','Curriculum','Activity','Offering','core_DataLog']` (forma string) | orden PO y test verde (S1) |
| 2 | Render del menu en UPU | tenant UPU, sync corrido | abrir menu CD | 5 entradas en orden PO | orden PO en pantalla (S1) |

### REQ-IMPROVE-02: Nombre de las cinco vistas del menu via labelKey del mod

> **Que cambia**: cada entrada de las cinco vistas en `defaultObjects` declara una `labelKey` que apunta a una clave i18n del propio mod, y el menu muestra el texto objetivo: "Programas académicos", "Planes de estudios", "Programa de asignatura", "Sílabos", "Historial de cambios".
> **Por que**: hoy el nombre del menu se resuelve por `object.<Objeto>` sin dimension de app; en UPU el override por tenant gobierna esas claves para las vistas libres y la app de Engagement gobierna Activity/Offering. Con `labelKey` (UPONE-1645) el mod declara una clave propia que gana antes de `object.<Objeto>` y no es alcanzada por el override, resolviendo el nombre de las cinco vistas desde el mod sin efecto cruzado.

El sistema MUST resolver el nombre de cada una de las cinco vistas del menu de Curriculum Design desde una `labelKey` declarada por su entrada en `defaultObjects` (`mods/curriculum-design/config/app.json`), apuntando a una clave i18n propia del namespace del mod (`nav.curriculumDesign.<vista>`). El sistema MUST declarar esas claves en el lang del mod con paridad en los tres idiomas del proyecto (es/en/pt). Los textos objetivo son (paridad es/en/pt fijada, DEC-LOCAL-03; Activity/Offering ya declarados por el smoke de 1645, se reusan tal cual):

| Vista (clave) | es | en | pt |
|---|---|---|---|
| `AcademicProgram` (`nav.curriculumDesign.academicProgram`) | Programas académicos | Academic Programs | Programas acadêmicos |
| `Curriculum` (`nav.curriculumDesign.curriculum`) | Planes de estudios | Study Plans | Planos de estudo |
| `Activity` (`nav.curriculumDesign.activity`) — ya existe | Programa de asignatura | Course Program | Programa de disciplina |
| `Offering` (`nav.curriculumDesign.offering`) — ya existe | Sílabos | Syllabi | Ementas |
| `core_DataLog` (`nav.curriculumDesign.dataLog`) | Historial de cambios | Change History | Histórico de alterações |

El trabajo NUEVO de i18n en S2 son solo las 3 claves `academicProgram`, `curriculum`, `dataLog` (las de `activity`/`offering` ya viven en `lang/{es,en,pt}/common.i18n.json` bloque `nav.curriculumDesign`, dejadas por 1645).

**Actor**: user (disenador curricular) / user (de cada app, aislamiento)
**Layers**: config (mod, `defaultObjects` en forma objeto con `labelKey`), i18n (mod, claves `nav.curriculumDesign.*`), frontend (resolucion existente en core tras 1645)
**Session**: 2 (dependencia dura de UPONE-1645)

> **Nota de dependencia**: la variante objeto `{object, labelKey}` en `defaultObjects`, la preservacion de `labelKey` de punta a punta y su preferencia en la resolucion del label los provee UPONE-1645 (TICKET-132), REQ-01/REQ-02/REQ-03. Sin ese mecanismo en la plataforma, este REQ no es ejecutable (dependencia dura, no de diseno).

<details><summary>Scenarios de validacion</summary>

#### Scenario: labelKey del mod gana sobre el override por tenant
- **GIVEN** la entrada `{ "object": "Curriculum", "labelKey": "nav.curriculumDesign.curriculum" }` y la clave `nav.curriculumDesign.curriculum`="Planes de estudios" declarada en el mod, en un tenant (UPU) cuyo override declara `object.Curriculum`="Planes de Estudio"
- **WHEN** se resuelve el label del grupo de nav en el menu de Curriculum Design
- **THEN** el menu muestra "Planes de estudios" (labelKey del mod), no "Planes de Estudio" (override)
- **AND** el override por tenant no se edita

#### Scenario: labelKey del mod nombra un objeto compartido sin afectar a Engagement
- **GIVEN** `{ "object": "Activity", "labelKey": "nav.curriculumDesign.activity" }` con `nav.curriculumDesign.activity`="Programa de asignatura" en el mod, y la app de Engagement declarando tambien `Activity` sin labelKey
- **WHEN** el usuario abre el menu de Curriculum Design y el de Engagement en el mismo tenant
- **THEN** Curriculum Design muestra "Programa de asignatura" y Engagement muestra su nombre actual ("Actividad"), sin cambio cruzado (1645 REQ-04)

#### Scenario: paridad i18n en los tres idiomas
- **GIVEN** las claves `nav.curriculumDesign.*` declaradas en `lang/es`, `lang/en` y `lang/pt` del mod
- **WHEN** se corre `npm run sync`
- **THEN** el sync corre limpio (sin conflicto de claves) y las cinco claves existen en los tres idiomas

</details>

#### Acceptance
**El usuario puede verificar que funciona**: abre el menu de Curriculum Design en UPU y las cinco vistas muestran los nombres objetivo; abre el menu de Engagement y Activity/Offering conservan sus nombres.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | labelKey gana sobre override | entrada con labelKey del mod, override en UPU | resolver label | prefiere labelKey | texto del mod, no del override |
| 2 | objeto compartido sin efecto cruzado | Activity con labelKey solo en CD | abrir ambos menus | aisladas | CD nombre objetivo, Engagement intacto |
| 3 | paridad i18n | claves en es/en/pt | sync | limpio | 5 claves en 3 idiomas |

### REQ-IMPROVE-03: Encabezado de la vista de planes de estudios alineado con el menu

> **Que cambia**: el titulo dentro de la vista de planes de estudios pasa de "Currículos" a "Planes de estudios", el mismo texto que muestra el menu.
> **Por que**: el encabezado (label del layout) esta desalineado con la entrada del menu; es un sistema distinto (label del layout, no labelKey del menu) y es un arreglo enteramente del mod.

El sistema MUST mostrar el encabezado de la vista `default_Curriculum_list` como "Planes de estudios", alineado con la ruta de navegacion. Es mod-only con capacidades existentes (edita el `label` del layout y su clave i18n), por lo que es ejecutable en **Session 1 sin dependencia de UPONE-1645**.

**Actor**: user (disenador curricular)
**Layers**: config (layout JSON del mod), i18n (mod, clave `layout.default_Curriculum_list.label`)
**Session**: 1 (independiente de 1645)

<details><summary>Scenarios de validacion</summary>

#### Scenario: encabezado alineado en es
- **GIVEN** la vista de planes de estudios en UPU (idioma es), sync corrido
- **WHEN** el usuario navega a la vista Curriculum
- **THEN** el encabezado dice "Planes de estudios", no "Currículos"

#### Scenario: en/pt sin regresion por fallback
- **GIVEN** que en/pt no declaran `Curriculum.i18n.json` (el encabezado cae al `label` del JSON del layout)
- **WHEN** se actualiza el `label` del JSON a "Planes de estudios"
- **THEN** en/pt resuelven el nuevo texto por fallback sin clave cruda

</details>

#### Acceptance
**El usuario puede verificar que funciona**: navega a la vista de planes de estudios y el encabezado coincide con el menu ("Planes de estudios").

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Encabezado alineado | sync corrido | abrir vista Curriculum | encabezado = "Planes de estudios" | texto alineado con el menu |

### REQ-PRESERVE-01: El menu de Engagement no cambia (regresion critica)

> **Que cambia**: nada en Engagement — es exactamente lo que se debe garantizar.
> **Por que**: Engagement declara los mismos objetos Activity y Offering como vistas en el mismo tenant; el riesgo es alterar sus nombres por efecto colateral.

El sistema MUST mantener intactos los nombres de las vistas de la app de Engagement (Activity, Offering y las demas) en el tenant UPU. La `labelKey` declarada por Curriculum Design vive en su propio namespace i18n y se aplica por tab de su propia app (1645 REQ-04); el cambio NO toca ninguna clave `object.*` compartida ni el override por tenant, por lo que no debe haber efecto en Engagement.

**Actor**: user (usuario de Engagement)
**Layers**: verificacion (runtime)

<details><summary>Scenarios de validacion</summary>

#### Scenario: Engagement intacto
- **GIVEN** el tenant UPU con las apps Curriculum Design y Engagement activas
- **WHEN** se aplican el reorden + las labelKey de Curriculum Design + el encabezado, y se abre el menu de Engagement
- **THEN** Activity y Offering conservan sus nombres de Engagement ("Actividad" / "Ofertas") sin cambio

</details>

#### Acceptance
**El usuario puede verificar que funciona**: abre el menu de Engagement en UPU y sus nombres siguen iguales que antes del cambio.

### REQ-PRESERVE-02: El test del array de vistas queda verde con el orden nuevo

> **Que cambia**: el test de integracion que fija el array exacto de `defaultObjects` se actualiza en cada tramo a la forma vigente (S1: string reordenado; S2: objeto con labelKey) y sigue verde.
> **Por que**: el test asierta el array literal (`toEqual`) en forma string; al reordenar (S1) y luego al pasar a forma objeto (S2) el build queda rojo si no se actualiza en la misma sesion (H6).

El sistema MUST mantener verde el test `layouts-declared.test.ts` en cada sesion que cambia el array: en **Session 1** la asercion refleja el orden PO en **forma mixta** (strings para las 3 libres + `{object, labelKey}` para Activity/Offering, DEC-LOCAL-03); en **Session 2** la asercion se actualiza a la **forma objeto** `{object, labelKey}` con las cinco entradas. La actualizacion del test va en la misma sesion que el cambio de array correspondiente.

**Actor**: system (CI/build)
**Layers**: test (mod)
**Session**: 1 (forma string) + 2 (forma objeto)

<details><summary>Scenarios de validacion</summary>

#### Scenario: test verde tras el reorden (S1, forma string)
- **GIVEN** el reorden aplicado en `config/app.json` en forma string
- **WHEN** se corre `npm test` (vitest) sobre `layouts-declared.test.ts`
- **THEN** el test verde con la asercion en forma string `['AcademicProgram','Curriculum','Activity','Offering','core_DataLog']`

#### Scenario: test verde tras el paso a forma objeto (S2, con labelKey)
- **GIVEN** las labelKey aplicadas y `defaultObjects` en forma objeto en `config/app.json`
- **WHEN** se corre `npm test` (vitest) sobre `layouts-declared.test.ts`
- **THEN** el test verde con la asercion actualizada a la forma objeto `{object, labelKey}`

</details>

#### Acceptance
**El usuario puede verificar que funciona**: corre `npm test` del mod y la suite de integracion pasa.

## Changes

### Modified: `mods/curriculum-design/config/app.json` — Session 1 (reorden, forma MIXTA, preserva labelKey; DEC-LOCAL-03)

| Aspecto | Antes (working tree post-1645) | Despues | Por que |
|---------|-------|---------|---------|
| `defaultObjects` (linea 9) | `[{object:Activity,labelKey:nav.curriculumDesign.activity},"AcademicProgram",{object:Offering,labelKey:nav.curriculumDesign.offering},"Curriculum","core_DataLog"]` (mixto, orden viejo) | `["AcademicProgram","Curriculum",{"object":"Activity","labelKey":"nav.curriculumDesign.activity"},{"object":"Offering","labelKey":"nav.curriculumDesign.offering"},"core_DataLog"]` (mixto reordenado a orden PO, **preserva** labelKey de Activity/Offering) | Orden PO (REQ-IMPROVE-01) sin despojar las labelKey ya presentes (DEC-LOCAL-03, DET-40). Las 3 vistas libres quedan string hasta S2 |

### Modified: `mods/curriculum-design/config/app.json` — Session 2 (completar labelKey de las 3 libres, dependencia de 1645)

| Aspecto | Antes (post-S1, mixto) | Despues | Por que |
|---------|-------|---------|---------|
| `defaultObjects` (linea 9) | `["AcademicProgram","Curriculum",{object:Activity,labelKey},{object:Offering,labelKey},"core_DataLog"]` (mixto, orden PO) | `[{"object":"AcademicProgram","labelKey":"nav.curriculumDesign.academicProgram"},{"object":"Curriculum","labelKey":"nav.curriculumDesign.curriculum"},{"object":"Activity","labelKey":"nav.curriculumDesign.activity"},{"object":"Offering","labelKey":"nav.curriculumDesign.offering"},{"object":"core_DataLog","labelKey":"nav.curriculumDesign.dataLog"}]` | Completar labelKey en las 3 vistas libres (Activity/Offering ya la tienen). Nombre por vista para las cinco (REQ-IMPROVE-02) |

### Added (Session 2): 3 claves nuevas en `mods/curriculum-design/lang/{es,en,pt}/common.i18n.json` (bloque `nav.curriculumDesign`)

Solo estas 3 son trabajo nuevo; `activity`/`offering` ya existen (smoke de 1645) y se reusan. Strings pinneados (= tabla de REQ-IMPROVE-02):

| Clave | es | en | pt |
|-------|-----|-----|-----|
| `nav.curriculumDesign.academicProgram` | "Programas académicos" | "Academic Programs" | "Programas acadêmicos" |
| `nav.curriculumDesign.curriculum` | "Planes de estudios" | "Study Plans" | "Planos de estudo" |
| `nav.curriculumDesign.dataLog` | "Historial de cambios" | "Change History" | "Histórico de alterações" |
| ~~`nav.curriculumDesign.activity`~~ (ya existe) | Programa de asignatura | Course Program | Programa de disciplina |
| ~~`nav.curriculumDesign.offering`~~ (ya existe) | Sílabos | Syllabi | Ementas |

> El archivo/stem exacto (`nav.i18n.json` dedicado vs bloque `nav` en `common.i18n.json`) es detalle de ejecucion; ambos merguean al mismo catalogo por tenant e idioma. La clave debe ser propia del mod (`nav.curriculumDesign.*`), NO `object.*`, para no colisionar con el override por tenant ni con Engagement.

### Modified (Session 1, sin 1645): `mods/curriculum-design/config/layouts/default_Curriculum_list.json`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| `label` (linea 4) | `"Currículos"` | `"Planes de estudios"` | Alinear encabezado con el menu; sirve de fallback para en/pt (REQ-IMPROVE-03) |

### Modified (Session 1, sin 1645): `mods/curriculum-design/lang/es/Curriculum.i18n.json`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| `layout.default_Curriculum_list.label` (linea 4) | `"Currículos"` | `"Planes de estudios"` | Clave i18n del encabezado en es (REQ-IMPROVE-03) |

### Modified (S1 forma mixta, luego S2 forma objeto): `mods/curriculum-design/tests/integration/layouts-declared.test.ts`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| assert del array (linea 236), **S1** | `toEqual(['Activity','AcademicProgram','Offering','Curriculum','core_DataLog'])` (string, orden viejo — verde en develop, rojo vs working tree mixto) | `toEqual(['AcademicProgram','Curriculum',{object:'Activity',labelKey:'nav.curriculumDesign.activity'},{object:'Offering',labelKey:'nav.curriculumDesign.offering'},'core_DataLog'])` (**mixto**, orden PO) | Fijar el orden PO con la forma mixta real de S1 (REQ-PRESERVE-02, DEC-LOCAL-03) |
| assert del array, **S2** | array mixto de S1 | las cinco entradas en forma objeto `{object, labelKey}` en orden PO | Fijar la forma objeto completa con labelKey (REQ-PRESERVE-02, S2) |

> **Nota de paridad i18n (encabezado en en/pt)**: en/pt no declaran `Curriculum.i18n.json`, asi que el encabezado cae al `label` del JSON del layout. Cambiar el `label` del JSON cubre en/pt por fallback (paridad funcional). Las claves del **menu** (`nav.curriculumDesign.*`) si se declaran en los tres idiomas (REQ-IMPROVE-02).

## Tasks

> **Desacople del alcance** (decision del dev, DEC-LOCAL-02): la entrega se parte en dos sessions con acoplamiento distinto a UPONE-1645. **Session 1** (reorden + encabezado + test) usa **solo capacidades existentes** y **NO depende de 1645**: entrega valor de UX aunque 1645 se demore. **Session 2** (renombre de las cinco vistas via labelKey + verificacion runtime + doc) tiene **dependencia dura de 1645** y es lo unico que gatea sobre ese ticket.

### Session 1 — Reorden (forma string) + encabezado + test (mod-only, capacidades existentes, SIN dependencia de 1645) [tipo: auto] [tier: T2]

parallel_groups: [[S1.T1, S1.T2]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Reordenar `defaultObjects` al orden PO **preservando** la forma objeto+`labelKey` ya presente de Activity/Offering (array mixto: strings para AcademicProgram/Curriculum/core_DataLog, objeto+labelKey para Activity/Offering) → `["AcademicProgram","Curriculum",{object:Activity,labelKey},{object:Offering,labelKey},"core_DataLog"]`. NO despojar labelKey (DEC-LOCAL-03, DET-40) | REQ-IMPROVE-01 | developer | — | `mods/curriculum-design/config/app.json` | JSON valido; orden PO; labelKey de Activity/Offering intactas | git revert | DET-8, DET-40 | done | 1 |
| S1.T2 | Alinear encabezado de la vista Curriculum: `label` del JSON y clave i18n es a "Planes de estudios" | REQ-IMPROVE-03 | developer | — | `mods/curriculum-design/config/layouts/default_Curriculum_list.json`, `mods/curriculum-design/lang/es/Curriculum.i18n.json` | JSON/i18n validos; textos = "Planes de estudios" | git revert | DET-8 | done | 1 |
| S1.T3 | Actualizar el assert del array del test (`toEqual`) al orden PO en **forma mixta** de S1 (strings + objeto{object,labelKey} para Activity/Offering) | REQ-PRESERVE-02 | developer | S1.T1 | `mods/curriculum-design/tests/integration/layouts-declared.test.ts` | `npm test` (vitest) del mod verde con el array mixto reordenado | git revert | DET-7, DET-8 | done | 1 |
| S1.T4 | Correr `npm run sync` y verificar propagacion limpia del reorden y el encabezado (sin conflicto de claves; sin commitear artefactos de sync) | REQ-IMPROVE-01, REQ-IMPROVE-03 | developer | S1.T1, S1.T2, S1.T3 | (outputs de sync — no commitear) | sync corre limpio | revertir S1.T1/S1.T2 | DET-16 | done | 1 |
| S1.T5 | Smoke runtime en UPU: menu CD en orden PO y encabezado de Curriculum "Planes de estudios" coherente con el breadcrumb (evidencia real: screenshot/DOM). El menu de Engagement no cambia por construccion (S1 no toca ningun nombre) | REQ-IMPROVE-01, REQ-IMPROVE-03 | reviewer | S1.T4 | (evidencia runtime en `tickets/TICKET-136.screenshots/`) | screenshots del menu (orden PO) + encabezado; sin claves crudas | (no aplica — verificacion) | DET-13, DET-36 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — persistir resultados en `## Sessions` del ticket (Template de Gate), correr vitest del modulo + coverage delta, evidencia runtime del reorden/encabezado, decidir continue/iterate/escalate/standby | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4, S1.T5 | ticket | gate persistido + decision documentada; test verde; sync limpio; evidencia runtime del orden y el encabezado | (no aplica — cierre de session) | DET-20, DET-23, DET-36 | done | 1 |

### Session 2 — Renombre de las 5 vistas via labelKey (forma objeto) + i18n es/en/pt + verificacion runtime dos apps + doc (DEPENDENCIA DURA de UPONE-1645) [tipo: ⚑ fuerte] [tier: T3]

parallel_groups: [[S2.T1, S2.T2], [S2.T5, S2.T6]]

> **Precondicion de la session**: UPONE-1645 (TICKET-132) aterrizado en la plataforma. Sin el mecanismo `labelKey`, el schema rechaza la forma objeto de `defaultObjects` y la clave se descarta. Verificar antes de abrir S2 (S2.T4 lo confirma tras sync).

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Completar la **forma objeto** `{object, labelKey}` para las **3 vistas libres** (AcademicProgram, Curriculum, core_DataLog) en `defaultObjects`, preservando el orden PO y las entradas ya-objeto de Activity/Offering (post-S1) | REQ-IMPROVE-02 | developer | S1.GATE | `mods/curriculum-design/config/app.json` | JSON valido; las 5 entradas en forma objeto con `labelKey`, orden PO | git revert | DET-1, DET-8 | done | 2 |
| S2.T2 | Declarar las **3 claves faltantes** `nav.curriculumDesign.{academicProgram,curriculum,dataLog}` con paridad es/en/pt (activity/offering ya existen, se reusan) | REQ-IMPROVE-02 | developer | S1.GATE | `mods/curriculum-design/lang/{es,en,pt}/common.i18n.json` (bloque `nav.curriculumDesign`) | 3 claves nuevas en 3 idiomas; JSON valido; 5 claves totales | git revert | DET-5, DET-8, DET-16 | done | 2 |
| S2.T3 | Actualizar el assert del array del test de integracion a la **forma objeto** `{object, labelKey}` con las cinco entradas en orden PO | REQ-PRESERVE-02 | developer | S2.T1 | `mods/curriculum-design/tests/integration/layouts-declared.test.ts` | `npm test` (vitest) del mod verde con la forma objeto | git revert | DET-7, DET-8 | done | 2 |
| S2.T4 | Correr `npm run sync` y verificar propagacion limpia: la variante objeto de `defaultObjects` es aceptada por el schema (provisto por 1645), sin conflicto de claves i18n, sin commitear artefactos de sync | REQ-IMPROVE-02, REQ-PRESERVE-01 | developer | S2.T1, S2.T2, S2.T3 | (outputs de sync — no commitear) | sync corre limpio; schema acepta la forma objeto; sin conflicto de claves | revertir S2.T1/S2.T2/S2.T3 | DET-5, DET-16 | done | 2 |
| S2.T5 | Smoke runtime en UPU: menu CD con los cinco nombres objetivo; breadcrumb y encabezado de cada vista coherentes con el menu (evidencia real: screenshot/DOM) | REQ-IMPROVE-02 | reviewer | S2.T4 | (evidencia runtime en `tickets/TICKET-136.screenshots/`) | screenshots del menu + encabezados; sin claves crudas; los 5 nombres objetivo | (no aplica — verificacion) | DET-13, DET-36 | done | 2 |
| S2.T6 | Smoke runtime de regresion critica: menu de Engagement en el mismo tenant con sus nombres intactos (Activity="Actividad", Offering="Ofertas") | REQ-PRESERVE-01 | reviewer | S2.T4 | (evidencia runtime) | screenshot del menu Engagement sin cambios | (no aplica — verificacion) | DET-7, DET-13, DET-36 | done | 2 |
| S2.T7 | Documentar el patron de nombrado de vistas via labelKey por app (el mod declara una clave propia que gana sobre `object.<Objeto>` y no afecta a otras apps) y la condicion de secuenciacion sobre 1645; capturar la RULE en el KB DKC. Reemplaza el deliverable superado del request ("por que Activity/Offering conservan su nombre") | REQ-IMPROVE-02 | developer | S2.T5 | `mods/curriculum-design/docs/` (o README del mod), `projects/up1/rules/curriculum-design/` (KB DKC) | doc/rule creada y consistente con el hallazgo | git revert (doc) | DET-16, DET-37 | done | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T3)** — persistir evidencia runtime en `## Sessions` del ticket, cerrar test cases inline (DET-25), decidir continue/iterate/escalate | — | reviewer | S2.T1, S2.T2, S2.T3, S2.T4, S2.T5, S2.T6, S2.T7 | ticket | gate persistido; TCs con evidencia runtime; regresion Engagement verde; los 5 nombres objetivo | (no aplica — cierre de session) | DET-20, DET-23, DET-36 | done | 2 |

> **Baseline (improvement) — reconciliado post-1645 (DEC-LOCAL-03)**: en `origin/develop`, `config/app.json` tiene el array en **forma string** `["Activity","AcademicProgram","Offering","Curriculum","core_DataLog"]` y el test `layouts-declared.test.ts:236` esta **verde** contra ese estado. En el **working tree de la rama de trabajo** (donde vivio el smoke de 1645), Activity/Offering ya estan en **forma objeto con `labelKey`** y las claves `nav.curriculumDesign.activity/offering` existen en es/en/pt; respecto a ese working tree el test string quedaria rojo hasta actualizarlo. Encabezado Curriculum "Currículos" (`default_Curriculum_list.json:4` + `lang/es/Curriculum.i18n.json:4`) — sin cambios, el spec acierta. La ejecucion parte del working tree real (con el residuo de 1645), preserva las labelKey ya presentes y completa las 3 vistas libres.

## Constraints

- **DET-5** (multi-capa): las hipotesis del ticket (H1-H6) y el mecanismo labelKey se confirmaron cruzando config del mod + resolver del menu + cascada i18n + override por tenant + spec de UPONE-1645. Ver `kb/sp9/UPONE-1616-pre-intake.md` y `specs/core/SPEC-core-implement-nav-view-label-key.md`.
- **DET-16** (propagacion): el reorden, las labelKey y el encabezado se propagan al tenant solo via `npm run sync`; el breadcrumb hereda la etiqueta del menu automaticamente (`suite/composables/breadcrumbTrail.ts:216-220`).
- **DET-19** (external id): commits, branch y PR usan `UPONE-1616`, no `TICKET-136`.
- **RULE up1 (labelKey por app, UPONE-1645)**: el nombre de una vista se declara por entrada de nav con `labelKey` (clave i18n propia del mod); gana sobre `object.<Objeto>` y aplica solo a su app. Cada mod declara la clave en su namespace (`{workspace}/{stem}`, `suite/scripts/lib/i18n-source-map.mjs:5-8`), lo que evita colision entre apps. Base de REQ-IMPROVE-02 y REQ-PRESERVE-01.
- **RULE up1 (i18n cascada)**: precedencia core → mods (orden alfabetico) → override por tenant; gana la ultima capa para claves repetidas. `labelKey` esquiva esta competencia porque es una clave propia del mod (no `object.*`) y ademas se prefiere antes de `object.<Objeto>` (1645 REQ-03). `suite/scripts/lib/i18n-source-map.mjs`, `suite/utils/i18nBridge.ts:70-131`.
- **RULE up1 (no editar sincronizados)**: editar la fuente en el mod + `npm run sync`; no editar `suite/modsComponents/`, `suite/lang/` sincronizados a mano (`up1/CLAUDE.md`).

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| UPONE-1645 (TICKET-132) | internal (bloqueo de secuenciacion, **solo Session 2**) | Introduce el mecanismo `labelKey` por app: variante objeto `{object, labelKey}` en `defaultObjects`/`navByRole` (schema), preservacion end-to-end y preferencia en la resolucion del label con cascada `labelKey → object.<Objeto> → tecnico`. **Session 2** lo **consume** desde el mod | Solo **Session 2** (forma objeto + renombre) depende de este mecanismo; sin el, declarar la forma objeto en `defaultObjects` es rechazada por el schema y la `labelKey` se descarta. **Session 1** (reorden en forma string + encabezado + test) NO depende de 1645 y se puede ejecutar antes. Es bloqueo de secuenciacion de S2, no de diseno: el diseno de 136 esta completo. La verificacion runtime de S2 va tras 1645 |
| UPONE-1615 | internal | Define la visibilidad por rol de las apps curriculares; hoy una app sin roles se trata como publica | Si asigna roles antes de la verificacion, define con que usuario se toma la evidencia runtime de S2 (coordinar rol) |
| Equipo de Engagement | external | Dueno de las apps que comparten Activity/Offering | Cualquier cambio sobre esos objetos afecta a Engagement; el alcance no toca `object.*` compartidas — la labelKey es propia del mod y aislada por app (1645 REQ-04) |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Ejecutar **Session 2** antes de que 1645 aterrice (schema rechaza la forma objeto / labelKey descartada) | medium | high | Dependencia dura declarada solo sobre S2; secuenciar S2 tras 1645; S2.T4 verifica que el schema acepta la variante objeto tras sync. S1 no corre este riesgo (forma string, sin schema nuevo) |
| Regresion silenciosa en el menu de Engagement | low | high | La labelKey vive en el namespace del mod y se aplica por tab de su app (1645 REQ-04); no toca `object.*` ni el override; S2.T6 lo verifica en runtime. En S1 no hay riesgo: no se cambia ningun nombre |
| Conflicto de claves i18n aborta el sync | low | medium | Las claves `nav.curriculumDesign.*` son nuevas y propias del mod (no chocan con `object.*` ni con otros mods); paridad 3 idiomas; S2.T4 corre sync y verifica limpio |
| Build rojo por el test del array | medium | low | Cada cambio de forma del array y su test van en la misma session (S1.T1+S1.T3 forma string; S2.T1+S2.T3 forma objeto); el gate no cierra sin test verde |
| Verificar solo config/BD y no el render real | medium | high | S1 y S2 exigen evidencia runtime real (DET-36): S1 del orden+encabezado, S2 de los cinco nombres en ambas apps; no basta config ni base |

## Open questions

- [ ] **OQ-01 — Rol para la evidencia runtime de S2 (coordinar con UPONE-1615).** Hoy las apps curriculares son publicas; si 1615 asigna roles antes de S2, definir con que usuario se verifica. No cambia el alcance.
- [ ] **OQ-02 — Significado de "pestana" en el 2do criterio del PO** (pestana del menu vs pestana del navegador). Con labelKey el nombre del menu (y la ruta) quedan alineados con la vista, cubriendo la lectura del menu. La lectura del navegador hoy solo refleja el nombre de la app (`suite/pages/[tenant_id].vue:254-268`) y alinearla con la vista seria core no contemplado. Requiere confirmacion del PO si se pretende la segunda lectura; no bloquea el alcance.

> **Item del request SUPERADO (reconciliacion DET-3)**: el request pedia "documentacion de por que Activity y Offering conservan su nombre actual". Ese entregable **queda superado**: el dev sanciono renombrar Activity y Offering via labelKey (1645), asi que **ya no conservan su nombre actual**. En vez de documentar por que lo conservan, S2.T7 documenta el patron labelKey por app y la condicion de secuenciacion sobre 1645. No es una pregunta abierta; es un cambio consciente del deliverable registrado en DEC-LOCAL-02. El `## Request` del ticket no se reescribe (DET-3); se reconcilia aqui.

> **Nota**: las open questions previas OQ-01 (renombre del menu como decision de PO por el override) y OQ-02 (claves `object.*` del mod para portabilidad) quedaron **disueltas** por la reincorporacion del mecanismo labelKey de UPONE-1645: el nombre del menu de las cinco vistas se resuelve desde el mod via `labelKey` (clave propia, no `object.*`), sin decision de PO, sin tocar el override y con portabilidad inherente (la clave del mod aplica en cualquier tenant, con o sin override). Ver DEC-LOCAL-01.

## Decisions

### DEC-LOCAL-01: Nombrar las cinco vistas del menu via labelKey del mod (consumir UPONE-1645); disolver el escalate de override-vs-core
- **Contexto**: el intake (H7) concluyo que en UPU el override por tenant gobierna las claves `object.*` del menu y ensombrece al mod, y de ahi que el renombre del menu de las vistas libres quedara como decision de PO (OQ-01 previa) y el re-juicio dual DET-38 diera `escalate`. Al verificar el contrato de UPONE-1645 (TICKET-132), el encuadre resulta equivocado: 1645 introduce `labelKey` por entrada de nav con cascada `labelKey → object.<Objeto> → tecnico` (REQ-03), aplicable a `defaultObjects` y `navByRole` (REQ-01), donde `labelKey` es una clave i18n propia del mod (ej. `nav.curriculumDesign.curriculum`).
- **Drivers**: DET-4 (no presentar una premisa equivocada como hecho), DET-1 (los items pasan a tasks porque el mecanismo los vuelve confirmed), evitar un escalate innecesario, entregar el pedido completo del PO desde el mod.
- **Opcion elegida**: declarar `labelKey` por vista en `config/app.json` del mod para las cinco vistas, con claves `nav.curriculumDesign.*` en el lang del mod (es/en/pt). La clave del mod no es alcanzada por el override (que solo toca `object.*`) y gana antes de `object.<Objeto>`; ademas es per-app (1645 REQ-04), asi que no afecta a Engagement.
- **Alternativas descartadas**: (a) dejar el renombre del menu como decision de PO / editar el override core (encuadre previo del intake) — descartada: parte de una premisa equivocada; labelKey resuelve el nombre mod-only sin tocar core; (b) declarar `object.*` en el mod — descartada: pierde frente al override/Engagement y no aisla por app.
- **Consecuencias**: se entrega el pedido completo (orden + los cinco nombres + encabezado) mod-only, sin riesgo para Engagement, sin decision de PO sobre el naming del menu, sin tocar el override. Se introduce una dependencia dura de secuenciacion con UPONE-1645 (el mecanismo debe existir para consumirlo). El escalate de spec-judge (2026-08-18) queda disuelto: su fundamento (H7 vuelve el renombre no ejecutable mod-only) ya no aplica.
- **Session**: design-improvement (re-plan, 2026-08-18).

### DEC-LOCAL-02: Desacoplar la entrega de 1645 (S1 independiente) y reconciliar los items de alineacion del request inmutable
- **Contexto**: el re-juicio dual DET-38 dio `iterate` (ambos jueces) con hallazgos de ALINEACION contra el `## Request` inmutable: (a) el request lista "usando capacidades existentes" y deja "el renombre de Activity/Offering fuera por bloqueo", mientras el spec re-planificado renombra las cinco vistas con dependencia dura de 1645; (b) el request pide "documentacion de por que Activity y Offering conservan su nombre actual", que ya no aplica si se las renombra. El dev tomo la decision de alcance que resuelve la parte sustantiva.
- **Drivers**: DET-3 (el request no se reescribe, se reconcilia), DET-16 (propagacion: si el encuadre cambio, reflejarlo donde corresponde), entregar valor de UX sin que la mejora quede rehen del ticket de core, honestidad sobre la ampliacion de alcance.
- **Opcion elegida**: (1) **Desacoplar** en dos sessions con acoplamiento distinto a 1645 — S1 (reorden en forma string + encabezado + test) con **capacidades existentes**, entrega valor aunque 1645 se demore; S2 (renombre de las cinco vistas via labelKey + verificacion runtime + doc) con **dependencia dura** de 1645, unico tramo que gatea. (2) **Registrar la ampliacion de alcance** como decision consciente del dev: el request dejaba Activity/Offering fuera por bloqueo; ahora que 1645 provee la capacidad, se incorporan las cinco vistas al alcance, condicionadas a 1645. (3) **Marcar como superado** el deliverable "documentar por que Activity/Offering conservan su nombre": ya no lo conservan; el deliverable se reorienta a documentar el patron labelKey por app + la condicion de secuenciacion (S2.T7).
- **Alternativas descartadas**: (a) mantener todo en una sola session dependiente de 1645 — descartada: bloquea el reorden y el encabezado (que no necesitan 1645) detras del ticket de core, sin entregar valor mientras 1645 no aterrice; (b) respetar literalmente el recorte del request (dejar Activity/Offering fuera) — descartada: el dev sanciono la ampliacion ahora que la capacidad existe; el pedido de orden de trabajo del PO se sirve mejor con las cinco vistas nombradas; (c) conservar el deliverable de documentacion original — descartada: contradice la decision de renombrar, documentaria algo que ya no es cierto.
- **Consecuencias**: S1 es entregable de inmediato (mejora de UX parcial: orden + encabezado); S2 completa el renombre tras 1645. La ampliacion de alcance queda auditada como decision del dev, no como deriva silenciosa. El request inmutable no se toca; su reconciliacion vive en este spec (Executive summary, Open questions, esta decision).
- **Session**: design-improvement (fix de `iterate`, 2026-08-18).

### DEC-LOCAL-03: Reconciliar el baseline post-merge de UPONE-1645 (el reorden preserva labelKey; S2 solo completa las 3 vistas libres)
- **Contexto**: el spec se escribio el 2026-08-18 asumiendo que 1645 aun no habia tocado el mod. Al 2026-08-24 **1645 esta mergeado en develop** y su smoke (S3.T2) dejo en este mod Activity/Offering en **forma objeto con `labelKey`** + las claves `nav.curriculumDesign.activity/offering` en es/en/pt. El spec-judge (juez B, DET-38) detecto el mismatch: S1 en forma string pura **despojaria** esas labelKey (regresion de nombres a "Actividad"/"Ofertas"), y S2 sobredimensionaba trabajo ya hecho.
- **Drivers**: DET-40 (auditoria de reemplazo: el reorden no debe eliminar comportamiento existente), DET-3 (request no se reescribe), no introducir regresion transitoria.
- **Opcion elegida**: (1) el reorden de **S1 preserva** la forma objeto+`labelKey` de Activity/Offering ya presente (array mixto en orden PO: strings para las 3 libres, objeto+labelKey para Activity/Offering); no vuelve a string. (2) El test de S1 asierta ese **array mixto**. (3) **S2 solo agrega** `labelKey` a las 3 vistas libres (AcademicProgram, Curriculum, core_DataLog) y sus 3 claves i18n es/en/pt; activity/offering ya estan y se reusan. (4) La independencia S1-vs-1645 pierde relevancia (1645 ya esta), pero se conserva la particion S1 (reorden+encabezado+test) / S2 (completar labelKey+smoke 2 apps+doc) por claridad de gates.
- **Alternativas descartadas**: (a) ejecutar S1 en forma string pura como decia el spec original — descartada: regresion de nombres (GAP-B del juez); (b) colapsar todo en una sola session — descartada: se pierde el gate intermedio de reorden/encabezado con su smoke.
- **Consecuencias**: sin regresion transitoria de nombres; S2 acotado al trabajo real (3 vistas). El estado final es identico al del spec original (5 vistas forma objeto con labelKey en orden PO).
- **Session**: design-improvement (fix de `iterate` del spec-judge dual, 2026-08-24).

## Technical reference

- **Orden del menu**: posicion en `mods/curriculum-design/config/app.json:9` (`defaultObjects`), consumido por `suite/composables/navTabs.ts` y `suite/composables/useObjectManager.ts:643-671` (sort estable). Cero codigo core.
- **Nombre del menu (con labelKey, UPONE-1645)**: la resolucion del label prefiere la `labelKey` del tab antes de `object.<Objeto>` (cascada a `object.<Objeto>` y luego al nombre tecnico), `suite/composables/useObjectManager.ts:625-633` tras el cambio de 1645; mapa `labelKey` por tab construido con el patron de `layoutRestrictions` (`useObjectManager.ts:534-544`). Ver `SPEC-core-implement-nav-view-label-key.md` REQ-03.
- **Namespace i18n del mod**: `{workspace}/{stem}` (`suite/scripts/lib/i18n-source-map.mjs:107-118`); las claves `nav.curriculumDesign.*` viven en el namespace de curriculum-design y merguean al catalogo por tenant e idioma. No colisionan con `object.*` (override UPU) ni con Engagement.
- **Encabezado de la vista**: `layout.<layout>.label` con fallback al `label` del JSON del layout (`layout/src/layouts/RecordList/RecordList.vue:2044-2057`). Clave distinta de la del menu — por eso REQ-IMPROVE-03 es independiente de labelKey.
- **Breadcrumb**: `suite/composables/breadcrumbTrail.ts:216-220` reutiliza la etiqueta del menu; sin trabajo propio (hereda tambien la labelKey resuelta, 1645 REQ-07).
- **Override UPU (no se toca)**: `suite/lang/tenants/upu/es/common.i18n.json:10-19` — `object.Curriculum`="Planes de Estudio", `object.AcademicProgram`="Programas académicos", `object.core_DataLog`="Historial de cambios". Solo afecta claves `object.*`, no `nav.curriculumDesign.*`.
- **Test del array**: `mods/curriculum-design/tests/integration/layouts-declared.test.ts:234-236`, `expect(app.defaultObjects).toEqual([...])` — se actualiza a la forma objeto con labelKey.
- **Colision compartida**: `mods/uengagement-up1/config/app.json` declara `Offering` y `Activity` entre sus `defaultObjects`; con labelKey per-app ya no hay competencia por el nombre del menu.
- **Textos objetivo ya presentes en otro sistema**: `mods/curriculum-design/objects/activity.json:7-8` declara "Programa de asignatura" (label de objeto, no menu); `default_Offering_syllabus_list.json:4` dice "Sílabos" (encabezado). El menu no los consume; por eso se declara la labelKey del menu explicitamente.

## Rules discovered

- RULE-curriculum-design-{seq}: (a capturar en S2.T7) un mod nombra la vista que expone sobre un objeto declarando `labelKey` (clave i18n propia del namespace del mod) en su entrada de `defaultObjects`/`navByRole`; ese nombre gana sobre `object.<Objeto>`, no es alcanzado por el override por tenant, y aplica solo a su app aunque el objeto sea compartido con otra app. Fuente: `SPEC-core-implement-nav-view-label-key.md` (REQ-01/03/04), `kb/sp9/UPONE-1616-pre-intake.md`.

## Bugs found

(ninguno)

## Acceptance checkpoints

- [ ] **Funcional S1 (sin 1645)**: scenarios de REQ-IMPROVE-01 (orden) y REQ-IMPROVE-03 (encabezado) pasan; evidencia runtime del orden y el encabezado
- [ ] **Funcional S2 (tras 1645)**: scenarios de REQ-IMPROVE-02 (renombre de las 5 vistas) y REQ-PRESERVE-01 (Engagement intacto) pasan
- [ ] **Tests** (DET-37 dim4): `layouts-declared.test.ts` verde en cada sesion — S1 con la forma string reordenada, S2 con la forma objeto con labelKey; regresion del modulo verde (REQ-PRESERVE-02)
- [ ] **NFRs**: paridad i18n de las claves `nav.curriculumDesign.*` en los 3 idiomas (S2)
- [ ] **Rules**: RULE de nombrado de vistas via labelKey por app capturada (S2.T7); patrones i18n del mod respetados
- [ ] **Integration**: menu de Engagement sin cambios en UPU (evidencia runtime, regresion critica, S2.T6)
- [ ] **Docs oficiales del proyecto** (DET-37 dim1): documentado el patron labelKey por app + condicion de secuenciacion sobre 1645 en docs/README del mod (S2.T7, reemplaza el deliverable superado del request)
- [ ] **KB DKC** (DET-37 dim2): RULE creada en `rules/curriculum-design/`
- [ ] **Docs externas DKC** (DET-37 dim3): N/A (no toca DKC ni convenciones)
- [ ] **Planning-completeness**: entry `planning-completeness` registrada (mixed)
- [ ] **Dependencia**: **Session 1 no depende de 1645** (entregable de inmediato); **Session 2** requiere UPONE-1645 (TICKET-132) aterrizado antes de ejecutar, con su verificacion runtime corrida tras 1645

## Archiving

Una spec se archiva cuando deja de ser fuente de verdad. Usar `/dkc-archive-spec SPEC-curriculum-design-improve-menu-order "razon"`. No borrar manualmente.
