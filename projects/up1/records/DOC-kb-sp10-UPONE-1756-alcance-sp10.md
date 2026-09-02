---
id: DOC-kb-sp10-UPONE-1756-alcance-sp10
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp10
  - curriculum-mapping
  - detalle
  - UPONE-1756
  - alcance-sp10
  - slice
  - crud
  - tributacion-grilla
---

# UPONE-1756 Alcance sp10 (slice: CRUD de tributacion por competencia)

> **Referencia externa:** UPONE-1756 · **Tipo:** implement · **Prioridad:** Mayor · **Epica:** UPONE-1452 (Curriculum Mapping) · **Asignado:** Eduardo Bacon · **Story Points:** 13 (Mayor)
>
> **El entregable del CRUD del sprint son estos DOS tickets juntos, leidos como dos mitades de un mismo entregable (no se reformulan):** este (`UPONE-1756-alcance-sp10`, el CRUD de tributacion por competencia end-to-end) y `UPONE-1756-alcance-sp10-delta` (completa el modelo del CRUD y ejecuta los renames, dejando **cableado el siguiente sprint**). El feature completo (~34 SP) y su particion F1..F6 estan en `UPONE-1756-detalle` (referencia). Todo lo que estos dos tickets dejan fuera se implementa en el **follow-up** (sin numero Jira aun): `UPONE-1756-followup`. Vistas del corte: `UPONE-1756-maqueta-slice` (en el slice = tono claro; diferido = ensombrecido). Fuente tecnica: `UPONE-1756-detalle-po` y `UPONE-1756-explicativo`.

## Fuente canonica (PO)

La descripcion en Jira es un enlace a la maqueta de sp10. El alcance de esta version se acota, con acuerdo del equipo, a un **corte vertical**: un CRUD completo de tributacion **por competencia** (modo grilla), end to end y gobernado.

> Curriculum Mapping | Tributacion.

## Historia de usuario

Como responsable curricular, quiero asignar, ver, editar y retirar la tributacion de asignaturas contra competencias en una grilla competencia por nivel, para registrar de punta a punta contra que competencias tributa cada asignatura de un plan, en que nivel y con que tipo de contribucion.

## Objetivo

Entregar un **CRUD completo de tributacion por competencia (grilla)** sobre una matriz ya adoptada: crear (asignar), leer (grilla + ficha + panel de detalle), editar (nivel, tipo de contribucion, mover) y retirar (delete gobernado), con la escritura gobernada del mod.

## Contexto (para dimensionar)

- Es el **corte vertical** del feature grande (~34 SP). Entrega un flujo demostrable end to end, no el feature entero. La particion y el porque estan en `UPONE-1756-detalle`.
- **Frontera:** `todo-mod-only` (verificado). La pantalla vive en la vista del plan de Curriculum Design, pero el objeto y el permiso son de Curriculum Mapping; el mecanismo cross-mod de capability ya existe en la plataforma.
- Verificado sobre `curriculum-mapping@584499e` y `curriculum-design@8a151e7`.
- **Excepcion de sprint (planning sp10):** el sprint prohibe nuevas extensiones salvo validacion explicita; la tributacion fue **validada como la excepcion** en el planning (reunion de maqueta con el PO Esteban y Francisco). Este ticket es esa excepcion.

## Alcance

**Dentro (el CRUD por competencia, grilla):**

1. **F1 minimo:** reusar el campo existente (`isHolistic`) para R-3, **sin crear un campo nuevo**. R-3 se evalua como `esDestino = sinHijos OR isHolistic`, donde **"sin hijos" se deriva de la estructura del arbol, no de una bandera**. Ademas se sostiene un **invariante de escritura**: un nodo con `isHolistic = false` y cero hijos es **invalido** (ni se mide ni consolida) y se bloquea al escribir. Objeto nuevo `CompetencyNodeDevelopmentLevel` (patron `CompetencyNodeOwnerUnit`/`ScopeUnit`) para R-4 (niveles declarados). El rename cosmetico `isHolistic -> isDirectlyMeasured` **no va aca**: va al delta (`UPONE-1756-alcance-sp10-delta`).
2. **F3 acotado:** resolver gobernado de **asignar / mover / retirar individual** (R-1 adopcion vigente, R-2 par unico, R-3 no consolida, R-4 nivel declarado, R-5 tipo obligatorio, R-10 mover actualiza; delete gobernado). Escritura por operacion (no upsert de conjunto).
3. **F4:** pestana Tributacion (lectura) + ficha `CODIGO NIVEL CONTRIBUCION` + panel de detalle.
4. **F5 parcial:** la **grilla editable** + panel editable (nivel, tipo) + accion **Retirar**.
5. **Permisos:** `competencyalignment:view/create/modify/delete` declaradas y cableadas a los 4 roles.
6. **Movido al delta (`UPONE-1756-alcance-sp10-delta`, la otra mitad del entregable del sprint):** los campos forward-compatible que el flujo aun no usa (contributionPercentage, developmentSchemeId, achievementBasis, isRepresentative, indice de grupo), el **rename cosmetico `isHolistic -> isDirectlyMeasured`**, y el rename destructivo coverageLevelId -> developmentLevelId + objeto CoverageScheme -> DevelopmentScheme.

**Fuera (va al follow-up `UPONE-1756-followup`):**

- Upsert de conjunto por (plan, matriz) transaccional + guardado global.
- Peso del eje 1 (`contributionPercentage`, grupo, reparto automatico/manual, suma 100 al publicar).
- Segunda forma (malla por periodo) + via masiva.
- Indicadores con sus dos denominadores.
- `developmentSchemeId` / `achievementBasis` en la matriz y su efecto en indicadores.
- Filas fuera de diseno (§8).
- **Retiro con aviso R-7** (RA dependientes) y versionado del plan (R-8): ver deuda abajo.
- `outcomeAlignment` (F6).
- Migracion de datos existentes.

## Criterios de aceptacion (checkeables)

- [ ] Sobre una matriz adoptada, un usuario con permiso **asigna** una asignatura a una celda competencia por nivel (crear), gobernado.
- [ ] Solo se ofrecen competencias de matrices con adopcion vigente (R-1); no se puede duplicar el par asignatura-competencia (R-2).
- [ ] No se puede tributar a un nodo que consolida (R-3): el destino valido es `sinHijos OR isHolistic`, y **"sin hijos" se deriva del arbol**, no de una bandera; el nivel debe ser de los declarados por la competencia (R-4).
- [ ] **Invariante de nodo:** no se puede guardar un nodo con `isHolistic = false` y cero hijos (nodo que ni se mide ni consolida); la escritura lo rechaza con motivo.
- [ ] La grilla, la ficha y el panel de detalle **leen** el estado correctamente.
- [ ] Se puede **editar** el nivel y el tipo de contribucion, y **mover** una tributacion de celda (actualiza, no duplica, R-10).
- [ ] Se puede **retirar** una tributacion (delete gobernado) con confirmacion simple.
- [ ] Un usuario sin `competencyalignment:*` no ve la pestana ni sus acciones, aunque tenga acceso a Curriculum Design.

## Definition of Done (checkeable)

Aplica el estandar DoR/DoD del equipo. Ademas:

- [ ] Escritura gobernada: ninguna via (UI, API, MCP) salta R-1..R-5, R-10 ni el invariante de nodo; el resolver revalida.
- [ ] RBAC efectivo verificado en runtime (incluida la consulta cross-mod desde la vista del plan).
- [ ] i18n es/en/pt con paridad; tenant isolation.
- [ ] Tests unit de las reglas del CRUD + smoke del recorrido asignar/editar/mover/retirar.
- [ ] Artefactos de sync/seed no commiteados.
- [ ] **Conexion con MCP a nivel de servicios (criterio transversal del sprint, planning sp10):** la logica de negocio (validaciones, reglas R-*) vive en el resolver server-side, no exclusivamente en el cliente/front.

## Tests minimos (checkeables)

- [ ] Asignar a competencia medible de matriz adoptada: persiste; a no adoptada o a nodo que consolida: bloqueado con motivo.
- [ ] Nivel fuera de los declarados: bloqueado.
- [ ] **R-3 con "sin hijos" derivado del arbol:** tributar a un nodo hoja no holistico persiste; a un nodo con hijos (consolida) se bloquea, aunque una bandera diga lo contrario.
- [ ] **Invariante de nodo:** guardar un nodo con `isHolistic = false` y cero hijos se rechaza.
- [ ] Mover una ficha de celda: la fila se actualiza (no hay segunda fila).
- [ ] Retirar: la fila se borra; el permiso `:delete` es requerido.
- [ ] Sin `competencyalignment:view`: la pestana no aparece.

## Factores transversales (checkeables)

- [ ] Permisos (RBAC): **aplica** (CRUD con las 4 capabilities, cableadas a los roles existentes).
- [ ] Capa de lenguaje (i18n): aplica (pestana, ficha, panel, confirmacion) es/en/pt.
- [ ] Accesibilidad (WCAG): aplica a la grilla y al panel.
- [ ] Convenciones de mod: **aplica** (escritura gobernada `*Validated`, tenant isolation, tabla de union por Prisma directo en la mutation, sin field resolvers).
- [ ] Historial (DataLog): evaluar sobre `CompetencyAlignment`.

## Frontera core/mod (Aduana)

**`todo-mod-only`** (heredado de `UPONE-1756-detalle`, verificado): objeto, resolver, capabilities y tabla de union son del mod; **el componente es de Curriculum Mapping** (`curriculum-mapping/modsComponents/`) y **se renderiza en la vista del plan** (`curriculum-design/config/layouts/default_Curriculum_view.json`, precedente con `requiredCapability`). Es el patron ya establecido: Mapping ya aporta siete componentes que viven en la vista del plan (CompetencyTreeEditor, MatrixAdoptionEditor, LevelSchemeEditor, entre otros). La consulta cross-mod de capability ya existe en la plataforma. No hay Core Extension.

## Dependencias y precondiciones

- Matriz con `MatrixAdoption` vigente para el plan; plan con `planEntry` cargados (malla previa en curriculum-design).
- Tab nuevo en la vista del plan (curriculum-design).
- **Se completa con `UPONE-1756-alcance-sp10-delta`** (la otra mitad del entregable del sprint: modelo forward-compatible + renames).
- **Habilita** el ticket follow-up (`UPONE-1756-followup`): pesos, segunda forma, indicadores, versionado y outcomeAlignment se construyen sobre este CRUD.

## Estimacion (calibrada)

`Esfuerzo: Mayor (13) · Sensibilidad: Media`. Es **una de las dos mitades del CRUD que debemos alcanzar este sprint**: un flujo de tributacion por competencia operativo end-to-end (piso e ideal del PO en el planning sp10). Cabe en un ticket base de 13; el cableado forward-compatible y el rename destructivo van en la otra mitad, `UPONE-1756-alcance-sp10-delta` (8 SP), en el mismo sprint. **Total del CRUD del sprint: 13 + 8 = 21 SP en dos tickets.**

| Componente (base) | Esfuerzo | SP |
|---|---|---|
| Modelo minimo del flujo: CompetencyAlignment (developmentLevelId, contributionType req/default Develops, planId), CompetencyNodeDevelopmentLevel, capabilities view/create/modify/delete | Considerable | 4 |
| Escritura gobernada + CRUD por competencia (asignar/editar/mover/retirar; R-1..R-5, R-10) | Mayor | 5 |
| Vistas: tab en el plan + grilla + ficha + panel de detalle | Considerable | 4 |

**Total base: 13 SP.** La otra mitad (forward-compat + rename) va en `UPONE-1756-alcance-sp10-delta` (8 SP).

## Decisiones resueltas (reconciliacion con la revision de planning)

- **`isHolistic` cubre R-3 (resuelto):** se reusa el campo existente (verificado en codigo: vive a nivel de RecordType `Competency`/`SubCompetency`), no se crea uno nuevo, con dos precisiones que ya estan reflejadas en Alcance/AC/Tests: R-3 = `sinHijos OR isHolistic` con "sin hijos" derivado del arbol, y el invariante de escritura (`isHolistic = false` sin hijos = invalido). El rename `isHolistic -> isDirectlyMeasured` es cosmetico (comparte palabra con `rubricModel = Holistic` sin compartir significado) y va al delta. Deja de ser bloqueante.
- **Ubicacion del componente (resuelto):** el objeto y el permiso son de Curriculum Mapping; la pantalla se renderiza en la vista del plan (curriculum-design). Mismo principio acordado para la capability cross-mod, y patron ya establecido (siete componentes de Mapping viven en la vista del plan). Se confirma `curriculum-mapping/modsComponents/` y se descarta curriculum-design como dueno del componente.

## Decisiones abiertas

- [ ] **Capacidad del sprint:** confirmar que las dos mitades del CRUD (13 + 8 = 21 SP) entran en la capacidad del equipo, con la calibracion de SP del proyecto.

## Deuda explicita (anotar, no cerrar como definitivo)

- **El retiro del slice es un delete simple** y es seguro **solo porque `outcomeAlignment` (F6) esta fuera**: no hay resultados de aprendizaje que dependan de una tributacion. **Cuando entre F6 (en el follow-up), el retiro debe ganar el aviso R-7** (nombrar los RA que quedan sin respaldo antes de borrar). No cerrar el retiro como definitivo sin esa salvaguarda.

## Referencias

- Feature completo y particion: `UPONE-1756-detalle`. Follow-up (lo diferido): `UPONE-1756-followup`.
- La otra mitad del entregable del sprint (cableado forward-compatible + rename): `UPONE-1756-alcance-sp10-delta`.
- Vistas: `UPONE-1756-maqueta-slice`. Fuente tecnica: `UPONE-1756-detalle-po`, `UPONE-1756-explicativo`, `UPONE-1756-pre-intake`.
- Working copy: `curriculum-mapping@584499e`, `curriculum-design@8a151e7`.
