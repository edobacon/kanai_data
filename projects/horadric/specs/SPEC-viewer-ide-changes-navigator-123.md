---
id: SPEC-viewer-ide-changes-navigator-123
project: horadric
ticket: HOR-123
status: done
---

# Navegador read-only tipo IDE: repo -> ticket -> archivo -> diff Monaco con filtro y blame por sesion

# Navegador read-only tipo IDE: repo -> ticket -> archivo -> diff Monaco con filtro y blame por sesion

## Executive summary — lo que estas aprobando

> *Esta seccion esta diseñada para revision rapida. Todo el detalle tecnico vive en las secciones siguientes (Requirements, Artifacts, Tasks). Si solo lees el Executive summary y te basta para decidir, ese es el objetivo.*

**Que se quiere**: hoy, para ver "lo que va cambiando" durante un ticket, hay que alternar entre Horadric Cube y un IDE externo. Esta feature construye un navegador read-only tipo IDE dentro de HC: eliges un repo, ves sus tickets (con nombre y contexto, no solo el id), navegas los archivos que el ticket cambio, y abres un diff antes/despues con syntax highlighting real (Monaco DiffEditor, DEC-004). Encima de eso, un filtro por sesion resalta los cambios de la sesion elegida y muestra su objetivo como contexto; un blame por linea colorea cada linea segun la sesion que la introdujo. El working tree sin commitear se modela como "la sesion en curso". Se exponen tres superficies: un tab `#changes` dentro del ticket, su version fullscreen, y una ruta standalone `/p/:project/changes` para el navegador completo.

**Decisiones criticas que necesitan tu OK** (todas ya resueltas por el orquestador — ver Decisions):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Blame a granularidad **linea** (`git blame --porcelain`) | Maxima fidelidad a "git blame"; mas costo de decoraciones Monaco que hunk, asumido por el valor |
| 2 | "Antes" del diff = **parent del primer commit del ticket que toco el archivo** (base por-archivo) | Define que blobs sirve el endpoint; el resaltado por sesion es overlay de blame, NO cambia la base del diff |
| 3 | Repos sin convencion DET-27 (up1/jormat con `external`) **degradan a grupo "sin sesion"** | Reusa `unassignedCommits`; el navegador sigue mostrando archivos/diffs sin romper |
| 4 | Seccion "Otros" **opt-in via config** (`scan_root`/`scan_depth`/ignores) | Sin config, "Otros" vacio; evita escanear todo `~/Workspace` (ruido de otros proyectos) |
| 5 | Tres superficies en capas (tab `#changes` + fullscreen + ruta `/changes`) que reusan los mismos componentes | Una sola IA de datos; las superficies son envoltorios de presentacion |

**Riesgos principales y como los mitigamos**:

- **Monaco no carga si el web worker no se sirve bien en Vite 8** -> encapsular en `MonacoDiffPanel.vue` con interfaz minima (original/modified/language) + verificar booteando el server y el frontend REALES, no solo build verde (memory `feedback_hc_verify_real_server_cjs_esm`).
- **El panel muestra el diff del ticket/sesion anterior mientras viaja el nuevo fetch** -> RULE-viewer-polling-001: invalidar `data=null` + race-guard por URL en cada composable nuevo.
- **El watcher del working tree es ruidoso multi-repo** -> ignores estrictos (`node_modules`, `.git`, `dist`) + debounce (`awaitWriteFinish`), reusando el patron de `ticket-watcher.ts`.
- **El navegador se contamina con la churn de bookkeeping de DKC** -> filtro de exclusion del subarbol KB (`projects/**`, `.active_project`, `*.db`, dirs `.teach/.draft/.screenshots`) aplicado SOLO al repo `deckard_root`.
- **Path traversal en los endpoints de blob y scan** -> validar y rechazar paths fuera del repo resuelto (critical_rule del proyecto).

**Que NO se hace en este ticket** (limites explicitos):

- Inferencia de rama base / merge-base (el delta del ticket se arma con `git log --grep` + token `-S{N}`, sin inferir base de rama; DEC-006).
- Editar archivos (read-only estricto; nunca escribe fs ni sqlite).
- Atribuir a sesion los commits de repos sin convencion DET-27 (degradan a "sin sesion", no se inventa atribucion por `external`).
- Persistir nada nuevo en `index.db` (la fuente es git: commits del ticket + working tree).
- Scan amplio de `~/Workspace` por default (opt-in via config).

**Tamano estimado**: 6 sessions ejecutables (S1-S6), aproximadamente 12-16h efectivas distribuidas. Las mas riesgosas: **S3** (setup del worker Monaco en Vite 8 — riesgo de no-carga) y **S2** (blame server-side + degradacion external).

**Como vas a saber que funciona** (criterios observables):

- Abro `/p/horadric/changes`, elijo el repo horadric-cube, veo los tickets con nombre + status; entro a HOR-123 y veo sus archivos cambiados.
- Selecciono un archivo y veo un diff side-by-side con colores por lenguaje (no planos), read-only.
- Activo el filtro de una sesion: sus archivos se resaltan, los demas se atenuan/ocultan, y veo el objetivo de la sesion.
- Cada linea del diff muestra un color de gutter segun la sesion que la introdujo.
- Edito un archivo del repo sin commitear y aparece como "sesion en curso" actualizandose en vivo.

---

## Purpose

Navegador read-only tipo IDE embebido en Horadric Cube (viewer de Deckard Cain) para el dev/maintainer del KB. Permite recorrer el trabajo de un proyecto con jerarquia **repo -> ticket -> archivos cambiados -> diff Monaco**, con un **filtro por sesion** (resalta/atenua/oculta + contexto semantico del objetivo) y **blame por sesion** (atribucion por linea via el delta commiteado del ticket). El working tree sin commitear se modela como "la sesion en curso" (F-A degradado, DEC-006). Reusa fuertemente infraestructura existente (enumerateProjectRepos, logGrep, useSessionCommits, SessionSummary.objective); el peso real de construccion se concentra en Monaco + blobs por rev + blame server-side.

## Requirements

### REQ-01: Navegacion repo -> ticket -> archivo

> **Que cambia**: en una ruta nueva eliges un repo y ves sus tickets con nombre y contexto (status/module/work_type); al entrar a un ticket ves los archivos que cambio, agrupados por repo.
> **Por que**: hoy los tickets se listan por proyecto DKC, no por repo git, y no hay forma de recorrer "que archivos toco este ticket" sin abrir un IDE.

El sistema MUST exponer un navegador con jerarquia repo -> ticket -> archivo, donde los repos salen de `enumerateProjectRepos`, los tickets de `GET /:project/tickets` (con `title`/`status`/`module`/`workType`), y los archivos del delta commiteado del ticket por repo.

**Actor**: dev/maintainer
**Layers**: frontend, backend, api

<details><summary>Scenarios de validacion</summary>

#### Scenario: navegar repo -> ticket -> archivo (exitoso)
- **GIVEN** un proyecto con repos declarados y tickets con commits
- **WHEN** abro `/p/:project/changes`, selecciono un repo y un ticket
- **THEN** veo la lista de archivos cambiados de ese ticket en ese repo, con su numstat

#### Scenario: ticket sin commits (error/vacio)
- **GIVEN** un ticket sin commits que lo referencien (`git log --grep` vacio)
- **WHEN** lo selecciono en el navegador
- **THEN** el panel muestra estado vacio explicito ("sin cambios commiteados"), sin error 500

#### Scenario: repo sin `.git` (edge)
- **GIVEN** un additional_path declarado que no es repo git
- **WHEN** se enumeran los repos
- **THEN** ese path se omite silenciosamente (paridad con `enumerateProjectRepos`), el navegador no falla

</details>

#### Acceptance
**El usuario puede verificar que funciona**: abre `/p/horadric/changes`, elige horadric-cube, ve los tickets con nombre y entra a uno viendo sus archivos.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Listado de tickets por repo | repos + tickets con commits | abrir /changes | tickets agrupados por repo con title/status | lista no vacia con metadata |
| 2 | Archivos del ticket | ticket con commits multi-repo | seleccionar ticket | archivos por repo + numstat | una seccion por repo |
| 3 | Ticket sin commits | grep vacio | seleccionar ticket | estado vacio | sin 500, mensaje claro |

### REQ-02: Diff side-by-side con syntax highlighting (Monaco read-only)

> **Que cambia**: al seleccionar un archivo ves un diff antes/despues estilo VSCode, con colores por lenguaje y read-only, en lugar del coloreo plano por prefijo `+/-` actual.
> **Por que**: el dev pidio literal "IDE de solo lectura"; los diffs de HC hoy no tienen syntax highlighting.

El sistema MUST renderizar el diff por archivo en un Monaco DiffEditor read-only (side-by-side), consumiendo dos blobs (original + modificado) servidos por el server, con el lenguaje inferido por extension.

**Actor**: dev/maintainer
**Layers**: frontend, backend, api

<details><summary>Scenarios de validacion</summary>

#### Scenario: render side-by-side con syntax (exitoso)
- **GIVEN** un archivo `.ts` modificado dentro de un ticket
- **WHEN** lo selecciono en el navegador
- **THEN** Monaco muestra original a la izquierda y modificado a la derecha, con syntax highlighting TypeScript, read-only

#### Scenario: worker no disponible (error)
- **GIVEN** el setup de `MonacoEnvironment.getWorker` falla
- **WHEN** se monta el panel
- **THEN** se muestra un fallback de error legible (no pantalla en blanco), y el resto del navegador sigue funcional

#### Scenario: archivo binario o sin extension conocida (edge)
- **GIVEN** un archivo binario o sin lenguaje mapeable
- **WHEN** se selecciona
- **THEN** Monaco usa `plaintext` (binario: aviso "binario, sin diff de texto"), sin romper

</details>

#### Acceptance
**El usuario puede verificar que funciona**: abre un archivo `.ts` cambiado y ve un diff con colores por sintaxis, no planos.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Render TS | archivo .ts modificado | abrir | side-by-side + syntax + read-only | DiffEditor montado, no editable |
| 2 | Blobs por rev | endpoint file?path&rev | GET original y modificado | contenido por rev | original=parent del primer touch; modificado=ultimo touch/worktree |
| 3 | Lenguaje plaintext | archivo .unknown | abrir | language=plaintext | sin error |

### REQ-03: Endpoint de delta del ticket por sesion (multi-repo)

> **Que cambia**: un endpoint nuevo agrupa los archivos cambiados del ticket por sesion (token `-S{N}`), por repo, reusando el grep de commits.
> **Por que**: el filtro por sesion y el blame necesitan el delta commiteado del ticket atribuido por sesion; hoy solo existe el listado plano de commits.

El sistema MUST exponer un endpoint que, dado un ticket, devuelva los archivos cambiados agrupados por sesion (`-S{N}` del subject, reusando `SESSION_REGEX`) y por repo (`enumerateProjectRepos`), mas un grupo "sin sesion" para commits no atribuibles, mas la sesion en curso (working tree).

**Actor**: system (consumido por el frontend)
**Layers**: backend, api

<details><summary>Scenarios de validacion</summary>

#### Scenario: agrupacion por sesion (exitoso)
- **GIVEN** un ticket con commits `HOR-123-S1 ...` y `HOR-123-S2 ...`
- **WHEN** GET del delta por sesion
- **THEN** los archivos quedan agrupados bajo sesion 1 y 2 segun el commit que los introdujo

#### Scenario: commit sin token -S{N} (error/degradacion)
- **GIVEN** un commit del ticket sin `-S{N}` (legacy o `external` up1/jormat)
- **WHEN** GET del delta por sesion
- **THEN** sus archivos caen en el grupo "sin sesion", sin romper la respuesta

#### Scenario: ticket multi-repo (edge)
- **GIVEN** un ticket con cambios en horadric-cube y en deckard
- **WHEN** GET del delta
- **THEN** la respuesta agrupa por repo y dentro por sesion

</details>

#### Acceptance
**El usuario puede verificar que funciona**: el navegador puede filtrar por sesion porque el endpoint devuelve los archivos ya agrupados.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Agrupacion -S{N} | commits S1+S2 | GET delta | files por sesion | mapa sesion->files correcto |
| 2 | Sin sesion | commit sin -S{N} | GET delta | grupo "sin sesion" | files presentes, no perdidos |
| 3 | Multi-repo | cambios en 2 repos | GET delta | agrupado por repo | una entrada por repo |

### REQ-04: Filtro por sesion con estados mostrar / atenuar / ocultar

> **Que cambia**: eliges una sesion del ticket y sus archivos se resaltan; los archivos que la sesion no toco siguen visibles pero atenuados (y puedes ocultarlos), porque pertenecen al ticket.
> **Por que**: el dev quiere centrarse en "que hizo esta sesion" sin perder de vista el resto del ticket.

El sistema MUST permitir filtrar por sesion del ticket, resaltando los archivos tocados por esa sesion y aplicando a los demas archivos del ticket uno de tres estados: Mostrar (normal), Atenuar (default) u Ocultar. Reusa la atribucion de `useSessionCommits`.

**Actor**: dev/maintainer
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: resaltar sesion (exitoso)
- **GIVEN** un ticket con archivos tocados en distintas sesiones
- **WHEN** activo el filtro de la sesion 2
- **THEN** los archivos de la sesion 2 se resaltan; los demas se atenuan (estado default)

#### Scenario: alternar estado (exitoso)
- **GIVEN** el filtro de sesion activo
- **WHEN** cambio el estado de los no-tocados a Ocultar
- **THEN** la sidebar solo muestra los archivos de la sesion

#### Scenario: sesion sin archivos (edge)
- **GIVEN** una sesion sin archivos atribuidos (solo gate/docs)
- **WHEN** la selecciono
- **THEN** se muestra estado vacio para esa sesion, sin ocultar el resto del ticket por error

</details>

#### Acceptance
**El usuario puede verificar que funciona**: filtra una sesion y ve sus archivos resaltados, con los demas atenuados u ocultables.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Resaltar | ticket multi-sesion | filtrar sesion 2 | resalta S2, atenua resto | clase highlight en S2 |
| 2 | Ocultar | filtro activo | estado=Ocultar | sidebar solo S2 | resto removido de la lista |
| 3 | Sesion vacia | sesion sin files | filtrar | estado vacio | resto del ticket intacto |

### REQ-05: Contexto semantico de la sesion al filtrar

> **Que cambia**: al filtrar por una sesion, ves su objetivo/descripcion (y tier) a la vista, como contexto de "para que" eran esos cambios.
> **Por que**: el numero de sesion solo no dice nada; el objetivo da el sentido semantico.

El sistema MUST mostrar, al filtrar por una sesion, el objetivo/descripcion de esa sesion derivado de `SessionSummary.objective` (parseado por el server desde `## Sessions` del ticket).

**Actor**: dev/maintainer
**Layers**: frontend, backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: mostrar objetivo (exitoso)
- **GIVEN** un ticket cuyo `## Sessions` tiene `### Session 2 — objetivo`
- **WHEN** filtro por la sesion 2
- **THEN** veo el texto del objetivo (y tier si esta) en un panel/chip de contexto

#### Scenario: sesion sin objetivo parseado (edge)
- **GIVEN** una sesion sin heading de objetivo legible
- **WHEN** la filtro
- **THEN** el chip muestra un placeholder neutro ("sin objetivo registrado"), sin romper

</details>

#### Acceptance
**El usuario puede verificar que funciona**: al filtrar una sesion lee su objetivo sin abrir el markdown del ticket.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Objetivo visible | sesion con objetivo | filtrar | chip con texto | objective renderizado |
| 2 | Sin objetivo | sesion sin heading | filtrar | placeholder | sin error |

### REQ-06: Blame por sesion (atribucion por linea)

> **Que cambia**: cada linea del diff se colorea segun la sesion que la introdujo, como un git blame coloreado por sesion del ticket.
> **Por que**: permite leer un archivo y ver visualmente que sesion es responsable de cada linea.

El sistema MUST atribuir cada linea a la sesion cuyo commit la introdujo, mediante `git blame --porcelain` restringido a los commits del ticket, mapeando cada hash a `S{N}` (portando `SESSION_REGEX` al server), y exponerlo como decoraciones de gutter en Monaco. Las lineas de commits no atribuibles (externos / sin `-S{N}`) MUST quedar "sin sesion" sin romper el render.

**Actor**: dev/maintainer
**Layers**: frontend, backend, api

<details><summary>Scenarios de validacion</summary>

#### Scenario: lineas coloreadas por sesion (exitoso)
- **GIVEN** un archivo con lineas introducidas en distintas sesiones del ticket
- **WHEN** abro el archivo con blame activo
- **THEN** cada linea muestra un color de gutter segun su sesion

#### Scenario: linea de commit externo (error/degradacion)
- **GIVEN** una linea introducida por un commit sin `-S{N}` (external up1/jormat)
- **WHEN** se calcula el blame
- **THEN** esa linea queda "sin sesion" (color neutro), el render no falla

#### Scenario: archivo grande (edge / NFR)
- **GIVEN** un archivo de varios miles de lineas
- **WHEN** se calcula el blame
- **THEN** el calculo respeta el target de performance (NFR-01) o degrada a "blame no disponible" sin colgar la UI

</details>

#### Acceptance
**El usuario puede verificar que funciona**: abre un archivo tocado en >1 sesion y ve cada linea coloreada por la sesion que la introdujo.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Blame por sesion | archivo multi-sesion | blame | gutter coloreado | hash->S{N} correcto por linea |
| 2 | Linea externa | commit sin -S{N} | blame | "sin sesion" | color neutro, sin crash |
| 3 | Map hash->sesion | commits del ticket | blame.ts | atribucion | solo commits del ticket atribuibles |

### REQ-07: Working tree como "la sesion en curso" (live SSE)

> **Que cambia**: los cambios sin commitear de la sesion activa aparecen como "la sesion en curso" y se actualizan en vivo cuando editas archivos del repo.
> **Por que**: conserva el valor de "ver lo que va cambiando ahora" (DEC-005 F-A) dentro del modelo unificado por sesion.

El sistema MUST representar el working tree (staged + unstaged + untracked) como la sesion en curso y SHOULD actualizarlo en vivo via SSE (`worktree-changed`, patron L-1: chokidar + ignores estrictos + debounce). El composable consumidor MUST cumplir RULE-viewer-polling-001.

**Actor**: dev/maintainer
**Layers**: frontend, backend, api

<details><summary>Scenarios de validacion</summary>

#### Scenario: working tree como sesion en curso (exitoso)
- **GIVEN** un repo con cambios sin commitear
- **WHEN** abro el navegador del ticket
- **THEN** aparece "sesion en curso" con esos archivos junto a las sesiones commiteadas

#### Scenario: actualizacion en vivo (exitoso)
- **GIVEN** el navegador abierto en "sesion en curso"
- **WHEN** edito y guardo un archivo del repo
- **THEN** la sidebar y el diff se actualizan sin recargar (SSE -> refetch)

#### Scenario: working tree limpio tras commit de gate (edge)
- **GIVEN** un commit de gate que limpia el working tree
- **WHEN** el watcher emite el evento
- **THEN** "sesion en curso" queda vacia y el delta migra a la sesion commiteada, sin estado inconsistente

</details>

#### Acceptance
**El usuario puede verificar que funciona**: edita un archivo sin commitear y lo ve aparecer como "sesion en curso" actualizandose solo.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Worktree visible | cambios sin commitear | abrir navegador | grupo "sesion en curso" | files staged+unstaged+untracked |
| 2 | Live update | navegador abierto | editar archivo | refetch sin recargar | sidebar actualizada |
| 3 | Invalidacion al rotar | cambiar ticket/sesion | watch urlGetter | data=null + race guard | RULE-viewer-polling-001 |

### REQ-08: Exclusion de la churn de DKC

> **Que cambia**: los cambios de bookkeeping de DKC (el subarbol KB del repo deckard) no contaminan el navegador; el codigo real del ticket si se ve.
> **Por que**: el visor debe mostrar "lo que el ticket HACE", no "lo que DKC ANOTA" al registrarlo.

El sistema MUST excluir, SOLO en el repo `deckard_root`, el subarbol KB (`projects/**`, `.active_project`, `*.db`, dirs `.teach`/`.draft`/`.screenshots`) de los archivos mostrados, manteniendo visible el core de DKC (`server/`, `commands/`, `prompts/`).

**Actor**: system
**Layers**: backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: ocultar KB, mostrar core (exitoso)
- **GIVEN** cambios simultaneos en `deckard/projects/horadric/HOR-123.md` y en `deckard/server/git/blame.ts`
- **WHEN** abro el navegador
- **THEN** el archivo de `projects/**` no aparece; el de `server/` si

#### Scenario: ticket up1/jormat (edge)
- **GIVEN** un ticket de otro proyecto con cambios en `deckard/projects/<proj>/...`
- **WHEN** abro el navegador
- **THEN** todo `projects/<proj>/...` queda oculto; el trabajo en los repos del producto se ve

#### Scenario: filtro NO aplica a otros repos (edge)
- **GIVEN** un repo de producto con un dir llamado `projects/`
- **WHEN** abro el navegador
- **THEN** ese `projects/` NO se filtra (la regla aplica solo a `deckard_root`)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: edita el `.md` del ticket y un archivo de `deckard/server` a la vez; solo ve el segundo.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | KB oculto | cambio en projects/** y server/ | abrir | projects/** oculto, server/ visible | filtro aplicado a deckard_root |
| 2 | Solo deckard_root | repo producto con projects/ | abrir | no se filtra | regla scoped al deckard_root |

### REQ-09: Navegacion multi-repo y seccion "Otros" opt-in

> **Que cambia**: los archivos se agrupan por repo (principal + additional_paths/workspaces); ademas, opcionalmente via config, un scan acotado detecta repos con cambios no declarados y los agrupa bajo "Otros".
> **Por que**: un ticket toca varios repos; "Otros" es red de seguridad para que nada con cambios quede oculto, sin escanear todo `~/Workspace`.

El sistema MUST agrupar los archivos por repo via `enumerateProjectRepos`, y MAY incluir una seccion "Otros" con repos git con cambios no declarados, SOLO si el config del proyecto declara `scan_root` + `scan_depth` (+ ignores). Sin config, "Otros" queda vacio.

**Actor**: dev/maintainer
**Layers**: frontend, backend, api, config

<details><summary>Scenarios de validacion</summary>

#### Scenario: agrupacion por repo (exitoso)
- **GIVEN** cambios en horadric-cube y en deckard
- **WHEN** abro el navegador
- **THEN** veo una seccion por repo (principal primero, additional despues), navegables

#### Scenario: "Otros" sin config (edge / default)
- **GIVEN** el config sin bloque de scan
- **WHEN** abro el navegador
- **THEN** "Otros" no aparece o aparece vacia (solo repos declarados)

#### Scenario: "Otros" con config (exitoso)
- **GIVEN** `scan_root` + `scan_depth` declarados y un repo git con cambios fuera de los declarados pero dentro del scan
- **WHEN** abro el navegador
- **THEN** ese repo aparece bajo "Otros", respetando ignores y path traversal

</details>

#### Acceptance
**El usuario puede verificar que funciona**: ve los cambios agrupados por repo; con config de scan, un repo no declarado aparece bajo "Otros".

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Por repo | cambios 2 repos | abrir | seccion por repo | principal + additional |
| 2 | Otros off | sin config scan | abrir | Otros vacio | solo declarados |
| 3 | Otros on | config + repo no declarado | abrir | repo en Otros | respeta scan_root/depth/ignores |

### REQ-10: Superficies en capas (tab, fullscreen, standalone)

> **Que cambia**: el visor se accede como tab `#changes` dentro del ticket, se puede expandir a fullscreen, y existe una ruta standalone `/p/:project/changes` para el navegador completo; todas reusan los mismos componentes.
> **Por que**: el dev quiere verlo embebido en el ticket pero tambien aprovechar la pantalla completa o una pestaña nueva.

El sistema MUST exponer (a) un tab `#changes` en `TicketDetail.vue` con los cambios del ticket activo agrupados por sesion y expand a fullscreen (patron Teleport/SessionDetailModal), y (b) una ruta standalone `/p/:project/changes` para la navegacion repo->ticket->cambios. Ambas MUST reusar `MonacoDiffPanel` + el filtro de sesion + el composable de datos.

**Actor**: dev/maintainer
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: tab y fullscreen (exitoso)
- **GIVEN** un ticket con cambios
- **WHEN** abro el tab `#changes` y hago click en expand
- **THEN** el visor pasa a viewport completo (overlay Teleport) y vuelve sin perder estado

#### Scenario: ruta standalone (exitoso)
- **GIVEN** la app cargada
- **WHEN** navego a `/p/:project/changes`
- **THEN** veo el navegador completo repo->ticket->archivo

#### Scenario: regresion de tabs (edge)
- **GIVEN** el tab `#changes` agregado a `BASE_TABS`
- **WHEN** navego entre los tabs existentes (commits, sessions, etc.)
- **THEN** todos siguen funcionando igual (sin regresion en el hash routing)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: abre el tab Cambios, lo expande a fullscreen, y abre `/p/:project/changes` en pestaña nueva con el mismo visor.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Tab + fullscreen | ticket con cambios | abrir tab y expand | overlay fullscreen | mismo visor, estado preservado |
| 2 | Standalone | app cargada | ir a /changes | navegador completo | ruta funcional |
| 3 | Regresion tabs | nuevo tab | navegar tabs | sin cambios | tabs existentes intactos |

### REQ-PRESERVE-01: Tabs existentes y CommitDiffView siguen funcionando

> **Que cambia**: nada en los flujos existentes — esta feature es aditiva.
> **Por que**: el visor nuevo no debe romper commits, sessions ni el diff de commit actual.

El sistema MUST preservar el comportamiento de los tabs existentes de `TicketDetail.vue`, de `CommitDiffView.vue`/`CommitDiffPanel.vue` y de los endpoints de commits/diff existentes.

**Actor**: dev/maintainer
**Layers**: frontend, backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: regresion completa (exitoso)
- **GIVEN** un ticket con commits
- **WHEN** navego los tabs existentes y abro un commit diff
- **THEN** el comportamiento es identico al previo a HOR-123

</details>

#### Acceptance
**El usuario puede verificar que funciona**: navega tabs y abre un commit diff; todo igual que antes.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Regresion | ticket con commits | navegar tabs + commit diff | sin cambios | comportamiento previo |

## Non-functional requirements

| Tipo | Requirement | Metrica | Target |
|------|-------------|---------|--------|
| Performance | Calculo de blame por archivo no debe colgar la UI | latencia del endpoint blame en archivo grande | < 1.5s p95 en archivo de ~5K lineas; si excede, degradar a "blame no disponible" |
| Performance | Diff Monaco de archivo grande responde | tiempo a primer render del DiffEditor | < 2s para archivo de ~5K lineas (lazy mount del worker) |
| Security | Endpoints read-only sin path traversal | paths fuera del repo/scan resuelto | rechazo 400; el server nunca escribe fs ni sqlite (critical_rule del proyecto) |

## Artifacts

### Endpoints

| Method | Path | Auth | Request | Response | Errors |
|--------|------|------|---------|----------|--------|
| GET | `/api/projects/:project/tickets/:id/changes` | none (local) | query: `?session={N|current|unassigned}` opcional | `{ repos: [{ name, sessions: [{ session: number\|"current"\|"unassigned", objective: string\|null, tier: string\|null, files: [{ path, additions, deletions, binary, status }] }] }], reason: string\|null }` | 404 no-repo-configured; 200 con `reason` si grep vacio |
| GET | `/api/projects/:project/file` | none (local) | query: `repo`, `path`, `rev` (`base`\|`head`\|`worktree`\|`<hash>`) | `{ content: string, binary: boolean, language: string, rev: string }` | 400 path-traversal/invalid; 404 repo/rev no encontrado |
| GET | `/api/projects/:project/blame` | none (local) | query: `repo`, `path`, `ticket` | `{ lines: [{ line: number, session: number\|null, hash: string }], degraded: boolean }` | 400 invalid; 404 archivo/repo; 200 `degraded:true` si excede NFR |
| GET (SSE) | `/api/projects/:project/tickets/:id/worktree-watch` | none (local) | — | eventos `worktree-changed` `{ project, ticketId, repo }` | event `error` con reason |
| GET | `/api/projects/:project/repos-changes` | none (local) | — | `{ declared: RepoLocation[], others: RepoLocation[] }` (others vacio sin config scan) | 404 no-repo-configured |

> Notas de contrato:
> - El "antes" (`rev=base`) = contenido en el parent del primer commit del ticket que toco el archivo (base por-archivo, Decision 2). El "despues" (`rev=head`) = ultimo commit del ticket que lo toco; `rev=worktree` = contenido actual del working tree (sesion en curso).
> - El grupo de sesion reusa `SESSION_REGEX` (portado a `server/git/sessions-regex.ts`) y el fallback tactic->S1. Commits sin `-S{N}` -> `session: "unassigned"` (Decision 3).
> - La exclusion de churn DKC (REQ-08) se aplica como filtro de paths en `/changes` y `/repos-changes`, scoped al `deckard_root`.

### Componentes Vue nuevos

| Componente | Path | Proposito |
|------------|------|-----------|
| `MonacoDiffPanel.vue` | `src/components/changes/MonacoDiffPanel.vue` | Visor side-by-side read-only por archivo (motor Monaco DiffEditor) + decoraciones de blame por sesion. Interfaz minima: `original`, `modified`, `language`, `blame?`. |
| `ChangesNavigator.vue` | `src/components/changes/ChangesNavigator.vue` | Shell del navegador: columnas repo->ticket->archivo, filtro de sesion (estados show/dim/hide), chip de contexto de sesion. |
| `SessionFilterChips.vue` | `src/components/changes/SessionFilterChips.vue` | Chips de sesion (reusa `commitsBySession`/`unassignedCommits`) + objetivo de la sesion. |
| `ChangesView.vue` | `src/views/ChangesView.vue` | Vista standalone para la ruta `/p/:project/changes`. |
| `useTicketChanges.ts` | `src/composables/useTicketChanges.ts` | Datos del delta por sesion (consume `/changes`), cumple RULE-viewer-polling-001. |
| `useWorktreeWatch.ts` | `src/composables/useWorktreeWatch.ts` | SSE de `worktree-changed` (patron `useTicketWatcher`), invalida + refetch. |

### Modulos server nuevos

| Modulo | Path | Proposito |
|--------|------|-----------|
| `server/git/blame.ts` | nuevo | `git blame --porcelain` + map hash->S{N}; degradacion external; respeta NFR-01. |
| `server/git/sessions-regex.ts` | nuevo | Porta `SESSION_REGEX` + `TACTIC_REGEX` + `extractSessionNumber` al server (single source con el frontend). |
| `server/git/worktree.ts` | nuevo | `git status --porcelain` + diff de working tree (staged/unstaged/untracked) multi-repo. |
| `server/git/file-blob.ts` | nuevo | Sirve contenido de un archivo en una rev dada (base/head/worktree/hash); valida path traversal. |
| `server/routes/changes.ts` | nuevo | Endpoints `/changes`, `/file`, `/blame`, `/repos-changes` + filtro de churn DKC. |
| `server/deckard/worktree-watcher.ts` | nuevo | chokidar multi-repo con ignores estrictos + debounce (patron `ticket-watcher.ts`). |

#### Checklist de calidad por artefacto

- **Configuracion declarativa, no hardcoded**: el bloque de scan de "Otros" (`scan_root`/`scan_depth`/ignores) y la lista de exclusion de churn DKC viven en config/constantes nombradas del server, no hardcoded en componentes. Los labels de UI ("Sesion en curso", "Sin sesion", "Otros") quedan como constantes del frontend — HC no tiene infraestructura i18n (deuda explicita conocida del proyecto, sin ticket dedicado por ser viewer mono-idioma).
- **Cada artefacto tiene consumidor concreto en este sprint**: cada endpoint y componente listado se consume en una task de S1-S6 (ver tabla de Tasks). `repos-changes` consumido por `ChangesNavigator`/`ChangesView`; `blame.ts` por `MonacoDiffPanel`.
- **Heuristicas se reemplazan con specs explicitas**: la atribucion a sesion usa el token `-S{N}` (convencion DET-27 explicita), NO heuristicas por nombre de archivo. El lenguaje de Monaco se infiere por extension via un mapa explicito, no por contenido.

## Tasks

### Session 1 — Backend: delta del ticket por sesion + blobs por rev [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Capturar baseline (test/type-check/build verdes) antes de tocar nada | REQ-PRESERVE-01 | developer | — | — | `npm test`, `npm run type-check`, `npm run build` | (no aplica) | DET-13 | done | 1 |
| S1.T2 | Portar `SESSION_REGEX`/`TACTIC_REGEX`/`extractSessionNumber` al server (single source) | REQ-03 | developer | S1.T1 | `server/git/sessions-regex.ts`, `src/composables/useSessionCommits.ts` | vitest unit del parser (S1+S2+tactic+unassigned) | git revert | DET-1, DET-2, DET-16 | done | 1 |
| S1.T3 | `server/git/file-blob.ts`: servir contenido por rev (base/head/worktree/hash) + guard path traversal | REQ-02 | developer | S1.T1 | `server/git/file-blob.ts` | vitest: original=parent first-touch, modificado=head, untracked->original vacio; path traversal -> error | git revert | DET-1, DET-8, RULE-server-frontmatter-legacy-001 | done | 1 |
| S1.T4 | Endpoint `/changes` (delta por sesion, multi-repo) + filtro churn DKC + endpoint `/file` | REQ-03, REQ-08, REQ-02 | developer | S1.T2, S1.T3 | `server/routes/changes.ts`, registrar ruta en `server/index.ts` | vitest integration: agrupacion por sesion, grupo unassigned, projects/** oculto en deckard_root | git revert | DET-1, DET-2, DET-11, DET-16 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — persistir en `## Sessions` con Template de Gate, correr vitest+coverage, verificar endpoints contra el server REAL (no solo vitest), decidir continue/iterate/escalate/standby | — | reviewer | S1.T2, S1.T3, S1.T4 | ticket | gate persistido + decision + verificacion server real | (no aplica) | DET-20, DET-23, DET-13, DET-33 | done | 1 |

### Session 2 — Backend: blame por sesion + degradacion external [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | `server/git/blame.ts`: `git blame --porcelain` + map hash->S{N} (reusa sessions-regex); lineas de commits no del ticket -> sin sesion | REQ-06 | developer | S1.GATE | `server/git/blame.ts` | vitest: archivo multi-sesion -> atribucion correcta; commit externo -> null sin crash | git revert | DET-1, DET-2, DET-5, DET-16 | done | 2 |
| S2.T2 | Endpoint `/blame` + degradacion NFR-01 (archivo grande -> `degraded:true`) | REQ-06 | developer | S2.T1 | `server/routes/changes.ts` | vitest integration: respuesta `lines[]`; archivo grande -> degraded; path traversal -> 400 | git revert | DET-1, DET-8, DET-13 | done | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T2)** — persistir, vitest+coverage, verificar blame contra repo real con commits -S{N}, decidir | — | reviewer | S2.T1, S2.T2 | ticket | gate persistido + verificacion empirica de atribucion | (no aplica) | DET-20, DET-23, DET-13, DET-33 | done | 2 |

### Session 3 — Frontend: Monaco DiffEditor + worker Vite + MonacoDiffPanel [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Instalar `monaco-editor` + setup `MonacoEnvironment.getWorker` en Vite 8 | REQ-02 | developer | S2.GATE | `package.json`, `vite.config.ts`, `src/monaco-setup.ts` | bootear frontend REAL: worker carga sin error (memory feedback_hc_verify_real_server) | git revert + `npm uninstall monaco-editor` | DET-1, DET-8, DEC-004 | done | 3 |
| S3.T2 | `MonacoDiffPanel.vue` read-only (original/modified/language) + tema dark alineado | REQ-02 | developer | S3.T1 | `src/components/changes/MonacoDiffPanel.vue` | montar con archivo .ts: side-by-side + syntax + read-only; binario/plaintext sin crash | git revert | DET-1, DET-2, reference_hc_theming_tailwind_v3_gotcha | done | 3 |
| S3.T3 | API client tipado para `/changes`, `/file`, `/blame`, `/repos-changes` | REQ-03, REQ-02 | developer | S2.GATE | `src/api/client.ts`, `shared/types.ts` | type-check; respuestas tipadas; guards de campos opcionales | git revert | DET-2, RULE-server-frontmatter-legacy-001 | done | 3 |
| **S3.GATE** | **Gate de sync Session 3 (tier: T2)** — persistir, vitest+coverage, verificar render Monaco en frontend REAL (worker), decidir | — | reviewer | S3.T1, S3.T2, S3.T3 | ticket | gate persistido + Monaco renderiza en frontend real | (no aplica) | DET-20, DET-23, DET-13, DET-33 | done | 3 |

### Session 4 — Frontend: navegador IA repo->ticket->archivo + filtro de sesion + contexto [tipo: ⚑ fuerte] [tier: T2]

parallel_groups: [[S4.T2, S4.T3]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | `useTicketChanges.ts` (consume `/changes`) cumpliendo RULE-viewer-polling-001 (invalidar + race guard) | REQ-03, REQ-01 | developer | S3.GATE | `src/composables/useTicketChanges.ts` | vitest: data=null al rotar URL + race guard descarta response viejo | git revert | DET-5, RULE-viewer-polling-001 | done | 4 |
| S4.T2 | `ChangesNavigator.vue`: columnas repo->ticket->archivo (reusa enumerateProjectRepos via `/repos-changes` + `GET /tickets`) | REQ-01, REQ-09 | developer | S4.T1 | `src/components/changes/ChangesNavigator.vue` | manual: navegar repo->ticket->archivo; ticket sin commits -> vacio | git revert | DET-1, DET-2, DET-16 | done | 4 |
| S4.T3 | `SessionFilterChips.vue`: filtro por sesion (show/dim/hide) + chip con `objective` (reusa useSessionCommits + SessionSummary) | REQ-04, REQ-05 | developer | S4.T1 | `src/components/changes/SessionFilterChips.vue` | manual: resaltar S2, atenuar/ocultar resto; objetivo visible; sesion vacia sin romper | git revert | DET-1, DET-2 | done | 4 |
| **S4.GATE** | **Gate de sync Session 4 (tier: T2)** — persistir, vitest+coverage, verificar navegacion + filtro en frontend real, decidir | — | reviewer | S4.T1, S4.T2, S4.T3 | ticket | gate persistido + navegacion y filtro verificados | (no aplica) | DET-20, DET-23, DET-13, DET-33 | done | 4 |

### Session 5 — Frontend: blame visual + working tree como sesion en curso (SSE) [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S5.T1 | `server/git/worktree.ts` + `server/deckard/worktree-watcher.ts` (chokidar + ignores + debounce) + endpoint SSE `worktree-watch` + `/repos-changes` | REQ-07, REQ-09 | developer | S4.GATE | `server/git/worktree.ts`, `server/deckard/worktree-watcher.ts`, `server/routes/changes.ts` | vitest worktree status; bootear server: SSE emite worktree-changed al editar; ignores activos | git revert | DET-1, DET-8, DET-11 | done | 5 |
| S5.T2 | Decoraciones de blame por sesion en `MonacoDiffPanel.vue` (gutter coloreado por `lines[].session`) | REQ-06 | developer | S5.T1 | `src/components/changes/MonacoDiffPanel.vue` | manual: lineas coloreadas por sesion; linea externa -> color neutro; archivo grande -> degraded | git revert | DET-1, reference_hc_theming_tailwind_v3_gotcha | done | 5 |
| S5.T3 | `useWorktreeWatch.ts` + integrar "sesion en curso" en el navegador (merge worktree con sesiones commiteadas) | REQ-07 | developer | S5.T1 | `src/composables/useWorktreeWatch.ts`, `src/components/changes/ChangesNavigator.vue` | manual: editar archivo -> "sesion en curso" se actualiza sin recargar; tras commit gate -> vacia | git revert | DET-5, RULE-viewer-polling-001 | done | 5 |
| **S5.GATE** | **Gate de sync Session 5 (tier: T2)** — persistir, vitest+coverage, verificar blame visual + SSE live en frontend+server real, decidir | — | reviewer | S5.T1, S5.T2, S5.T3 | ticket | gate persistido + blame y live verificados empiricamente | (no aplica) | DET-20, DET-23, DET-13, DET-33 | done | 5 |

### Session 6 — Superficies (tab + fullscreen + standalone) + regresion [tipo: auto] [tier: T1]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S6.T1 | Tab `#changes` en `TicketDetail.vue` (BASE_TABS + VALID_TABS) con cambios del ticket activo por sesion | REQ-10 | developer | S5.GATE | `src/views/TicketDetail.vue` | manual: tab Cambios aparece y muestra el navegador del ticket activo | git revert | DET-16, RULE-viewer-polling-001 | done | 6 |
| S6.T2 | Overlay fullscreen (patron Teleport/SessionDetailModal) sobre el visor | REQ-10 | developer | S6.T1 | `src/components/changes/ChangesNavigator.vue`, `src/components/sessions/SessionDetailModal.vue` (patron) | manual: expand a viewport completo y volver sin perder estado | git revert | DET-16 | done | 6 |
| S6.T3 | Ruta standalone `/p/:project/changes` + `ChangesView.vue` | REQ-10 | developer | S6.T1 | `src/router.ts`, `src/views/ChangesView.vue` | manual: navegar a /changes muestra el navegador completo | git revert | DET-2, DET-16 | done | 6 |
| S6.T4 | Regresion: tabs existentes + CommitDiffView + endpoints de commits intactos; pulido visual | REQ-PRESERVE-01 | reviewer | S6.T1, S6.T2, S6.T3 | — | `npm test`, `npm run type-check`, `npm run build`; navegar tabs + commit diff | git revert | DET-7, DET-13, DET-14 | done | 6 |
| **S6.GATE** | **Gate de sync Session 6 (tier: T1)** — persistir cierre, regresion verde, verificar 3 superficies en frontend real, decidir | — | reviewer | S6.T1, S6.T2, S6.T3, S6.T4 | ticket | gate persistido + regresion verde + superficies verificadas | (no aplica) | DET-20, DET-23, DET-13, DET-33 | done | 6 |

### Task contract (detalle de las tasks no triviales)

```
Task S1.T3: file-blob por rev
- source_ref: REQ-02
- agent: developer
- files: server/git/file-blob.ts
- precondition: sessions-regex portado (S1.T2) no requerido aqui; baseline verde (S1.T1)
- expected_output: funcion que dado (repo, path, rev) devuelve { content, binary, language }; rev base=parent del primer commit del ticket que toco el archivo, head=ultimo commit del ticket, worktree=contenido actual; valida que el path resuelto este dentro del repo
- validation: vitest — original=parent first-touch; untracked->original vacio; path '../../etc' -> error 400
- rollback: git revert
- rules: [DET-1, DET-8, RULE-server-frontmatter-legacy-001]

Task S2.T1: blame.ts por sesion
- source_ref: REQ-06
- agent: developer
- files: server/git/blame.ts
- precondition: sessions-regex en server (S1.T2)
- expected_output: blame por linea con session: number|null; solo lineas de commits del ticket (grep) son atribuibles; mapea hash->S{N} via extractSessionNumber
- validation: vitest con repo fixture: archivo tocado en S1 y S2 -> lineas atribuidas; linea de commit externo -> null sin crash
- rollback: git revert
- rules: [DET-1, DET-2, DET-5, DET-16]

Task S3.T1: setup Monaco worker Vite 8
- source_ref: REQ-02
- agent: developer
- files: package.json, vite.config.ts, src/monaco-setup.ts
- precondition: S2.GATE cerrado
- expected_output: monaco-editor instalado; MonacoEnvironment.getWorker resuelto para Vite 8; editor carga sin error de worker
- validation: bootear frontend real (npm run dev) y montar un DiffEditor; verificar consola sin "Could not create web worker" (memory feedback_hc_verify_real_server_cjs_esm)
- rollback: git revert + npm uninstall monaco-editor
- rules: [DET-1, DET-8, DEC-004]

Task S5.T1: worktree + watcher SSE
- source_ref: REQ-07, REQ-09
- agent: developer
- files: server/git/worktree.ts, server/deckard/worktree-watcher.ts, server/routes/changes.ts
- precondition: S4.GATE cerrado
- expected_output: git status --porcelain multi-repo (staged/unstaged/untracked); watcher chokidar con ignores (node_modules/.git/dist) + debounce (awaitWriteFinish); SSE emite worktree-changed
- validation: bootear server; editar un archivo -> evento worktree-changed; node_modules ignorado
- rollback: git revert
- rules: [DET-1, DET-8, DET-11]
```

## Constraints

- RULE-viewer-polling-001 (must): `useTicketChanges`, `useWorktreeWatch` y el composable del navegador DEBEN invalidar `data.value = null` + race-guard por URL al rotar ticket/sesion/repo. Sin esto el panel muestra el diff anterior mientras viaja el nuevo fetch.
- RULE-server-frontmatter-legacy-001 (must): el payload nuevo de api declara campos opcionales con guard explicito (principio defensivo aplicado al contrato de `/changes`, `/file`, `/blame`).
- DEC-004 (Monaco): motor de render = Monaco DiffEditor read-only; encapsular en `MonacoDiffPanel.vue` con interfaz minima (original/modified/language) para reversibilidad.
- DEC-005 + Addendum 2 (fuente del diff): F-C (delta por sesion via `git log --grep` + `-S{N}`) es nucleo; F-A (working tree) = "la sesion en curso"; live L-1 (SSE/chokidar); exclusion de churn DKC scoped al `deckard_root`.
- DEC-006 (re-fundacion): navegador repo->ticket->sesion/blame; sin inferencia de rama base.
- config critical_rules (horadric): READ-ONLY estricto (nunca escribir fs ni sqlite); rechazar paths fuera del repo (path traversal); parsear frontmatter con libreria estandar.
- memory `feedback_hc_verify_real_server_cjs_esm`: verificar arrancando server + frontend reales (Monaco worker no se prueba con vitest/tsx-eval).

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| monaco-editor | external | Motor de render del diff (DEC-004) | Dep pesada + setup de worker en Vite 8; mitigado encapsulando en MonacoDiffPanel y verificando en runtime real |
| chokidar | internal | Ya instalado (`^5.0.0`); watcher del working tree | Ruido multi-repo si los ignores no son estrictos |
| enumerateProjectRepos / logGrep / getCommitDiff / SESSION_REGEX | internal | Reuso para multi-repo, commits del ticket y atribucion | Bajo — ya en produccion |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Monaco no carga por setup de worker en Vite 8 | medium | high | Encapsular en MonacoDiffPanel; verificar booteando frontend real (no solo build); reversibilidad a CodeMirror/diff2html via interfaz minima (DEC-004) |
| Panel muestra diff del ticket/sesion anterior al rotar | medium | medium | RULE-viewer-polling-001 (invalidar + race guard) en todos los composables nuevos |
| Watcher de working tree ruidoso multi-repo | medium | medium | Ignores estrictos (node_modules/.git/dist) + debounce (awaitWriteFinish), patron ticket-watcher.ts |
| Blame lento/colgando en archivos grandes | medium | medium | NFR-01: timeout + degradar a "blame no disponible" sin colgar la UI |
| Path traversal en /file y scan de "Otros" | low | high | Validar y rechazar paths fuera del repo resuelto (critical_rule) |
| Churn DKC contamina el navegador | high | medium | REQ-08: filtro del subarbol KB scoped al deckard_root |

## Open questions

Ninguna pendiente — las 5 decisiones abiertas del intake fueron resueltas por el orquestador (ver Decisions). El caso de repos sin convencion DET-27 (up1/jormat) se resuelve via degradacion a grupo "sin sesion" (Decision 3).

## Decisions

### DEC-LOCAL-01: Granularidad del blame = linea
- **Contexto**: el blame podia ser por archivo, hunk o linea.
- **Drivers**: fidelidad a "git blame" vs costo de decoraciones Monaco.
- **Opcion elegida**: linea (`git blame --porcelain`), con NFR-01 que degrada en archivos grandes.
- **Alternativas**: hunk (mas barato pero menos fiel); archivo (trivial pero sin valor real).
- **Consecuencias**: maxima fidelidad; mayor costo de render mitigado por NFR-01.
- **Session**: pre-design (orquestador).

### DEC-LOCAL-02: "Antes" del diff = parent del primer commit del ticket que toco el archivo
- **Contexto**: definir el blob "original" del diff por archivo.
- **Drivers**: mostrar el delta real del ticket por archivo sin inferir rama base.
- **Opcion elegida**: base por-archivo (parent del primer commit del ticket que lo toco); "despues" = ultimo commit del ticket o working tree si la sesion en curso lo modifico. El resaltado por sesion es overlay de blame (decoraciones), NO cambia la base del diff.
- **Alternativas**: base unica del ticket (HEAD antes del primer commit) — menos preciso para archivos tocados en varias sesiones.
- **Consecuencias**: diff por archivo coherente con su historia dentro del ticket.
- **Session**: pre-design (orquestador).

### DEC-LOCAL-03: Repos sin convencion DET-27 degradan a grupo "sin sesion"
- **Contexto**: up1/jormat commitean con `external` id, sin token `-S{N}`.
- **Drivers**: el navegador debe funcionar igual sin atribucion a sesion.
- **Opcion elegida**: esos commits caen en grupo "sin sesion" (reusa `unassignedCommits`); el navegador muestra sus archivos/diffs via grep del external id.
- **Alternativas**: agrupar por `external` — inventaria una atribucion que no existe; descartado.
- **Consecuencias**: degradacion con gracia, sin atribucion falsa.
- **Session**: pre-design (orquestador).

### DEC-LOCAL-04: Seccion "Otros" opt-in via config
- **Contexto**: detectar repos con cambios no declarados sin escanear todo `~/Workspace`.
- **Drivers**: red de seguridad vs ruido de otros proyectos.
- **Opcion elegida**: opt-in via config (`scan_root` + `scan_depth` + ignores); sin config, "Otros" vacio (solo repos de enumerateProjectRepos).
- **Alternativas**: scan amplio por default — ruido inaceptable.
- **Consecuencias**: nada queda oculto si el dev opta-in; cero ruido por default.
- **Session**: pre-design (orquestador).

### DEC-LOCAL-05: Superficies en capas reusando los mismos componentes
- **Contexto**: tab embebido vs navegador dedicado.
- **Drivers**: el dev quiere ambas (embebido en el ticket y standalone con espacio).
- **Opcion elegida**: tab `#changes` (cambios del ticket activo por sesion + fullscreen Teleport) + ruta standalone `/p/:project/changes`, ambas reusando MonacoDiffPanel + filtro de sesion + composable de datos.
- **Alternativas**: solo una superficie — limita el uso pedido por el dev.
- **Consecuencias**: una sola IA de datos, varias superficies de presentacion.
- **Session**: pre-design (orquestador).

## Success metrics

| Metric | Current | Target | How to measure |
|--------|---------|--------|----------------|
| Alt-tab HC<->IDE para revisar cambios de un ticket | frecuente | eliminado para lectura | uso del navegador en lugar del IDE para revisar diffs |
| Tiempo a ver el diff de un archivo de un ticket | abrir IDE + checkout | < 5s en HC | observacion manual |

## Technical reference

Firmas reales del codigo existente (a reusar):

- `enumerateProjectRepos(rootPath: string, config: MonorepoConfigShape): RepoLocation[]` — `horadric-cube/server/deckard/monorepo.ts:44`. Devuelve `{ name, path }[]` (root + workspaces + additional_paths, depth 1, dedup por path). horadric: horadric-cube (root) + deckard (additional).
- `logGrep(repoPath, patterns: string|string[], options): Promise<Commit[]>` — `server/git/log.ts:14`. `git log --grep` (OR multiple), `--no-merges`, formato `%H %h %an %aI %s`. Skip silencioso si no hay `.git`.
- `getCommitDiff(repoPath, hash): Promise<CommitDiff|null>` — `server/git/diff.ts:23`. Devuelve patch unificado + numstat por archivo (NO blobs). Reuso: numstat para el sidebar; el blob por rev se construye nuevo (file-blob.ts).
- `runGit(repoPath, args): Promise<string>` — patron interno de `server/git/diff.ts:71` (spawn `git -C <repo> <args>`). Replicar para blame/blob/worktree.
- `SESSION_REGEX = /(?:^|[\s-])S(\d+)(?:[\s.]|$)/` + `TACTIC_REGEX = /-tactic\b/` + `extractSessionNumber(subject)` — `src/composables/useSessionCommits.ts:14,19,21`. Portar a `server/git/sessions-regex.ts` (single source). `commitsBySession`/`unassignedCommits` en `useSessionCommits.ts:61,73`.
- `SessionSummary.objective` (string) — `server/deckard/sessions.ts:97-149`. Parseado desde `### Session N — objetivo` o columna del Plan; tambien `tier`, `rawMarkdown`.
- `GET /:project/tickets` — `server/routes/tickets.ts` (listado con id/title/status/module/workType/tags; index.db + fallback FS).
- Endpoint de commits multi-repo (a imitar) — `server/routes/commits.ts:48-119`: enumera repos + agrega `deckard` root si tiene `.git`; resuelve `external` via `resolveTicketExternal`.
- SSE pattern — `server/routes/watcher.ts` (streamSSE Hono) + `server/deckard/ticket-watcher.ts` (chokidar, `awaitWriteFinish`). Frontend: `useTicketWatcher` (EventSource + backoff) consumido en `src/views/TicketDetail.vue:48`.
- Tabs por hash — `src/views/TicketDetail.vue:79-90` (`BASE_TABS`), `133-139` (`activeTab`/`setActiveTab` via `route.hash`); `VALID_TABS` en `115-129`.
- Router — `src/router.ts`: ruta standalone se agrega como nuevo `RouteRecordRaw` (patron de `/p/:project/branches`).
- Overlay fullscreen — `src/components/sessions/SessionDetailModal.vue` (headlessUI Dialog) y `src/components/assets/ScreenshotLightbox.vue` (Teleport).
- Build/test/types — `npm test` (vitest), `npm run type-check` (vue-tsc + tsc server), `npm run build` (vue-tsc -b + vite build). Dev: `npm run dev` (vite + tsx watch server). Puertos: frontend 3016, server 5180.

## Rules discovered

{Se llena durante ejecucion.}

## Bugs found

{Se llena durante ejecucion.}

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de REQ-01..REQ-10 + REQ-PRESERVE-01 pasan
- [ ] **Tests**: test scenarios escritos y pasando (parser de sesion, file-blob por rev, blame, agrupacion por sesion, worktree status)
- [ ] **NFRs**: blame de archivo grande dentro de target o degradado; render Monaco < 2s; read-only sin path traversal
- [ ] **Rules**: RULE-viewer-polling-001 verificada en cada composable nuevo; READ-ONLY respetado
- [ ] **Integration**: tabs existentes + CommitDiffView + endpoints de commits sin regresion
- [ ] **Real-runtime**: Monaco worker carga y blame/SSE verificados en server+frontend reales (no solo build verde)

## Backlog

Items descubiertos durante execute. Los `must` BLOQUEAN el cierre del ticket (DET-17).

| # | Item | Priority | Origen | Status |
|---|------|----------|--------|--------|
| BL-1 | aria-label en los 3 `<aside>` del navegador (Repositorios/Tickets/Archivos) + aria-label en el boton de ciclo de filterMode de SessionFilterChips (hoy solo `:title`, no accesible en tactil) — WCAG 2.1 ARIA11 | must | Quality review S4 (a11y warn) | resolved (S7) |
| BL-2 | Deduplicar el race-guard de RULE-viewer-polling-001: `useTicketChanges` exporta el patron pero `ChangesNavigator` lo reimplementa inline (changesInflight/blobInflight) — consolidar para evitar drift si el patron cambia | must | Quality review S4 (mantenibilidad warn) | resolved (S7) |
| BL-3 | `useWorktreeWatch`: en error 4xx (ticket invalido) el EventSource queda CLOSED y `scheduleReconnect` reintenta indefinidamente (delay acotado a 30s pero sin tope de intentos). Parsear codigo HTTP o limitar reintentos | should | Quality review S5 (error_handling info) | pending |
| BL-4 | Portabilidad tests + tooltip blame: `worktree.test.ts` hardcodea `DECKARD_ROOT='/Users/edobacon/...'` (falla en otra maquina/CI) -> derivar de `getDeckardRoot()`/env; habilitar `glyphMargin: true` en el diff editor para que el tooltip del blame (`glyphMarginHoverMessage`) aparezca (la decoracion de color ya funciona sin el) | should | Quality review S5 (testing/info) | pending |
| BL-5 | Precision de la atribucion commit->ticket: `logGrep` usa `git log --grep=<id>` que matchea el mensaje completo (subject+body), por lo que un commit que MENCIONA otro id en el body aparece bajo ese ticket (falso-positivo; ej. HOR-123-S2 menciona HOR-109 -> aparece en /changes de HOR-109). Anclar el grep al prefijo DET-27 (`^{id}\b`/`^{id}-S`) o word-boundary. ALCANCE DKC-CORE: afecta tambien el endpoint /commits existente (mismo logGrep), no solo el navegador HOR-123 | should | Verificacion S7 (DET-33, L4) | pending |
| BL-6 | Seccion "Otros" (REQ-09 MAY): scan opt-in de repos git con cambios NO declarados via config `scan_root`/`scan_depth`+ignores. /repos-changes hoy solo enumera declarados (enumerateProjectRepos+deckard). Sin config no aplica; diferido (MAY, no MUST). Implementar el scan acotado cuando un proyecto declare scan_root | should | Validacion de cierre S7 (REQ-09 parcial) | pending |

## Archiving

Una spec se archiva cuando deja de ser fuente de verdad. Usar `/dkc-archive-spec SPEC-viewer-ide-changes-navigator-123 "razon"`. NO borrar manualmente.
