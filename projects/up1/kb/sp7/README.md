# SP7 — Alcance y evidencias

> Doc local del platform up1 (no se commitea al repo de codigo). Recolecta la evidencia
> cruzada para dimensionar los tickets del Sprint 7. Fuente de verdad de los tickets: Jira.
> Este indice mapea que se decidio, con que respaldo y que queda abierto.

**Fecha de armado:** 2026-07-20
**Insumos de esta pasada:** 2da planning de SP7 (transcript + resumen Gemini), maqueta
`curriculum-mapping v2`, propuesta de gestion de competencias v1, y lo heredado de `sp6/`.

---

## Fuentes (en esta carpeta)

| Archivo | Que es |
|---|---|
| `planning-2-transcript-2026-07-20.pdf` | Transcript + resumen de la 2da planning de SP7 (jul 20). Timestamps citados en los docs por ticket. |
| `mockup-curriculum-mapping-v2.html` | Maqueta funcional (Vue) del mod curriculum-mapping: esquemas de nivel, matrices de competencia, escalas de cobertura. Cubre 1452/1453/1454. |
| `competency-management-proposal-v1.md` | Propuesta de modelo objetivo de competencias (levelScheme, competencyNode, rubricDimension, alignmentScale, etc.). Contexto de diseno, no todo es alcance SP7. |
| `soft-delete-core-analisis-diseno.md` | Analisis previo (soft-delete core), heredado. |
| `followups-codigo-doc-audit-2026-07-20.md` | Follow-ups locales de auditoria codigo/doc, heredado. |

Evidencia adicional del sprint anterior en `../sp6/` (estados del objeto Curriculum, motor
enum UPONE-1381, historias-usuario-sp6, mockups sp6).

---

## Tickets de SP7

| Ticket | Titulo | Epica | Dueno | SP (planning) | Estado alcance |
|---|---|---|---|---|---|
| [UPONE-1378](https://u-planner.atlassian.net/browse/UPONE-1378) | Requisitos de asignatura (editor visual Y/O + alerta de impacto) | 1267 Curriculum Design | Eduardo | 8 | IN (arrastre SP6) |
| [UPONE-1450](https://u-planner.atlassian.net/browse/UPONE-1450) | Plan de estudio \| Versionamiento de plan de estudio | 1267 Curriculum Design | Eduardo | 3-5 | IN |
| [UPONE-1451](https://u-planner.atlassian.net/browse/UPONE-1451) | Programa de asignatura \| Acceso a mantenedor de Referencias bibliograficas | 1267 Curriculum Design | Eduardo | 1-2 | IN |
| [UPONE-1456](https://u-planner.atlassian.net/browse/UPONE-1456) | Carga de datos dummy actualizada (seed) | 1267 Curriculum Design | Eduardo | 3 | IN (Tarea) |
| [UPONE-1452](https://u-planner.atlassian.net/browse/UPONE-1452) | Curriculum Mapping | (Epic) | — | n/a | Contenedor |
| [UPONE-1453](https://u-planner.atlassian.net/browse/UPONE-1453) | Curriculum Mapping \| Creacion de MOD | 1452 | Francisco | 1 | IN (exploratorio) |
| [UPONE-1454](https://u-planner.atlassian.net/browse/UPONE-1454) | Curriculum Mapping \| Esquema de niveles | 1452 | Francisco | 8 | IN (prioridad del mod) |

Detalle por ticket:
- [UPONE-1378 - Requisitos de asignatura (editor Y/O)](UPONE-1378-requisitos-asignatura.md) (arrastre SP6, DKC TICKET-101)
- [UPONE-1450 — Versionamiento plan de estudio](UPONE-1450-versionamiento-plan-estudio.md)
- [UPONE-1451 — Acceso a bibliografia](UPONE-1451-acceso-bibliografia.md)
- [UPONE-1456 - Analisis del seed dummy (PM #097)](UPONE-1456-analisis-seed.md)
- [UPONE-1453 — Creacion de MOD curriculum-mapping](UPONE-1453-creacion-mod-mapping.md)
- [UPONE-1454 — Esquema de niveles](UPONE-1454-esquema-niveles.md)

> UPONE-1452 es la epica contenedora (no work item); se documenta aqui, no en archivo propio.

Guias de apoyo (mod de 1453):
- [CREATE-curricular-mapping.md](CREATE-curricular-mapping.md) — **plan de implementacion publicado por el
  dev** (autoritativo para 1453). Nombre canonico del mod: **`curricular-mapping`**; el repo ya existe.
- [guia-creacion-mod.md](guia-creacion-mod.md) — referencia generica (estructura, testing, sync,
  capabilities, gotchas), verificada contra cd.

---

## Analisis de esfuerzo (SP planning vs Jira vs calibracion DKC)

Los SP de Jira se **subieron el 2026-07-21** (dev reconocio que fueron optimistas). Total: **16 → 25 SP**.

| Ticket | Planning | Jira 1ra | Jira ahora | Proyeccion DKC | Veredicto |
|---|---|---:|---:|---|---|
| 1450 Versionamiento | 3-5 | 5 | **8** | ~13-20 (calib.) | **8 razonable** tras verificar codigo (motor existe; adopcion, no construccion — ver ficha) |
| 1451 Bibliografia | 1-2 | 2 | 2 | ~3-4 | OK (config de layout; 1 ambiguedad a aclarar) |
| 1453 Creacion MOD | 1 | 1 | **2** | ~1-2 | OK / holgado |
| 1454 Esquema niveles | 8 | 8 | **13** | ~12-16 | **Bien calibrado** ahora |

> **Nota (verificacion en codigo 2026-07-21):** para **1450** el motor de deep-clone ya existe y es
> atomico → el comparable correcto es la adopcion [1214](https://u-planner.atlassian.net/browse/UPONE-1214)
> (0% sesgo), no la construccion del motor (1219, +320%). **8 pasa a ser razonable** (no "subir a 13").
> El enum/gate de versionado de Curriculum **ya esta hecho** (no estaba "crudo"). **CORE confirmado:**
> el gap de cross-ref entre hijos directos se cierra **generalizando el motor** (`directChildrenDerived`,
> espejo de `polymorphicChildrenDerived`), NO con hook de mod — para que el versionado completo sea
> capacidad de plataforma reutilizable, no autocontenida. Detalle en la ficha de 1450.
>
> Para **1451**: alcance confirmado (retirar el menu del objeto + boton `modalActionButtons` en el
> RecordList de Programa de asignatura que abre el mantenedor `BibliographyReference`). Config pura,
> precedente en uengagement. Detalle en la ficha de 1451.
>
> Para **1454**: las dos incognitas que inflaron el estimado estan resueltas por patrones existentes —
> config de decimales = `config/settings.json` + `getConfigs` (cascada por tenant/usuario); drag-drop =
> sortablejs con patron reusable en cd. El objeto `levelScheme` es nuevo. **13 sigue razonable pero con
> menos riesgo**; podria acercarse a 8-10 con reuso agresivo. `number`→Float (sin Decimal). Detalle en
> la ficha de 1454.

### Calibracion DKC (DET-26) — sesgo historico `published → executed`

Sobre 62 tickets cerrados de up1, agrupados por Jira:
- **Global:** pub 57 → exec 114 = **+100%** (el equipo entrega ~2x lo publicado).
- **Subset versionamiento** (10 Jiras): pub 23 → exec 60 = **+161%**.
- **Comparables de 1450:** [1270](https://u-planner.atlassian.net/browse/UPONE-1270) (predecesor)
  3→12 (+300%); [1219](https://u-planner.atlassian.net/browse/UPONE-1219) (motor core) 5→21 (+320%).

**Lectura:** el ajuste fue en la direccion correcta. **1454 (13)** y **1453 (2)** quedaron alineados
con la calibracion; **1451 (2)** aceptable; **1450 (8)** sigue optimista — la calibracion de
versionamiento lo proyecta en ~13-20 → subir a 13 o partir.
> Caveat: el `executed` DKC suma follow-ups bajo el mismo Jira (fragmentacion de scope), no solo mal
> calculo. Reporte completo: reconstruible con `dkc-sp-calibration`.

### Trabajo real sin pointear

1. **Config de decimales / cifras significativas** (1-2 SP) — decidir si el 13 de 1454 ya la absorbe
   o sale a item propio.
2. **Revision de seguridad/reutilizacion del generador de mod** — condicion de 1453, sin ticket.
3. **[UPONE-1340](https://u-planner.atlassian.net/browse/UPONE-1340)** Gestion de version actual —
   adyacente a 1450; Backlog sin SP; confirmar si entra a SP7.

---

## Dentro / fuera de alcance SP7

**Dentro:**
- Versionamiento de plan de estudio (1450).
- Acceso a mantenedor de referencias bibliograficas (1451).
- Creacion del mod curriculum-mapping (1453).
- Esquema de niveles / `levelScheme` (1454) — **prioridad del mod para este sprint**.

**Fuera (diferido o en diseno):**
- **Escalas de cobertura (`alignmentScale`)** — diferidas a **SP8**. Aparecen en la maqueta y
  la propuesta, pero se priorizo esquema de niveles por sobre ellas; **sin ticket**. Solo
  entrarian a SP7 si sobra tiempo en la 2da semana, con su componente custom, tests y storybook
  (transcript 01:18:46 / 01:25:49).
- **Matriz de competencias (`competencyNode`)** — sigue en **diseno/refinamiento**; no se
  implementa en SP7; **sin ticket de implementacion** (01:56:09 aprox / 00:43:16).

**Discutido sin ticket aun (gaps de backlog):**
- **Config de decimales / cifras significativas** (1-2 SP): va pegado a esquema de niveles;
  no se definio si es subtarea de 1454 o ticket propio. Ver 1454.
- **Tarea exploratoria "analizar mods"**: Esteban la dejo "sin epica" y sin ticket (01:13:45).

---

## Capacidad y secuencia

- **Capacidad real: 1 semana** — Esteban no esta la 2da semana (01:21:27). El refinamiento se
  prioriza "de esquema de niveles hacia abajo".
- **Distribucion acordada (01:23:30):**
  - **Eduardo:** curriculum design — requisitos de asignatura, versionamiento plan de estudio
    (1450), acceso bibliografia (1451).
  - **Francisco:** creacion del mod (1453) + esquemas de nivel (1454); escalas de cobertura solo
    si el avance de la 1ra semana lo permite (con tests, doc y storybook).

---

## Hallazgos transversales / decisiones abiertas

1. **Inconsistencia de epicas.** Esteban reconocio (01:06:30) que quizas debio existir una sola
   epica "Curriculum Design" en vez de crear "Curriculum Mapping" (1452) aparte. Confirmar
   estructura de epicas antes de cerrar el backlog.
2. **Seguridad del mod autogenerado.** Francisco levanto preocupacion por scripts autogenerados
   del "mod maqueta" que paso JP; acordaron revisar reutilizacion y seguridad del codigo antes de
   productivizar (01:25:49 / 01:27:43). Condiciona 1453.
3. **Patron de config transversal por mod.** Para decimales/cifras significativas se apunta a un
   patron tipo "Hello World Mod" / config por mod (mencionado por Claus en migracion). No verificado
   contra codigo en esta pasada. Ver 1454.
4. **Estados del plan "crudos".** Los estados del versionamiento del plan quedaron menos detallados
   que los de activity; hay que revisar la historia del sprint previo donde se definio el enum del
   objeto Curriculum. Ver 1450.
5. **La maqueta cubre solo mapping** (1452/1453/1454). 1450 y 1451 (curriculum-design) no tienen
   maqueta; su evidencia es Jira + transcript + sprint previo.

---

## Convencion de citas

Los docs por ticket citan el transcript con su timestamp (ej. `[00:06:41]`) para trazar cada
afirmacion a la conversacion. Las lineas de la maqueta se citan como
`mockup-curriculum-mapping-v2.html:<linea>`.
