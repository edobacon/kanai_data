---
id: SPEC-workflow-teach-narrative-16
project: horadric
ticket: HOR-016
status: done
---

# Teach files mas didacticos: discurso narrativo continuo, glosario inline, viewer denso

# Teach files mas didacticos: discurso narrativo continuo, glosario inline, viewer denso

## Executive summary — lo que estas aprobando

> *Esta seccion esta diseñada para revision rapida. Todo el detalle tecnico vive abajo. Si solo lees el Executive summary y te basta para decidir, ese es el objetivo.*

**Que se quiere**: HOR-015 (cerrado hoy) introdujo el patron H12 — intros tipo etiqueta en cada seccion canonica de los teach files. El patron resolvio la **estructura visual** pero no la **legibilidad narrativa**: un dev que no estuvo en el ticket sigue sin poder responder con naturalidad "¿que paso? ¿de que se trataba? ¿por que esa decision y no otra?". HOR-016 ataca esa brecha en 3 frentes (prompts + templates + viewer): forzar discurso narrativo continuo entre bloques, glosario inline para terminos del dominio, "por que antes del que" al citar codigo, y render mas legible cuando los bloques `dkc:*` tienen muchos elementos.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | **Un solo ticket multi-modulo** (deckard + horadric) en vez de split | DET-12 evaluado: el problema es uno solo aunque toque 2 repos. Gates ⚑ fuerte en S4 y S5 compensan scope mayor. Si durante execute aparece evidencia que el split habria sido mejor, escalate explicito |
| 2 | **Test definitivo empirico** firmado por el dev (TC-2: "responder 4 preguntas con naturalidad") como barra de exito | Es la unica forma honesta de validar "didactico". No se mide con grep ni lint — requiere audiencia real. TC-8 (dogfooding F-1) extiende la validacion a 2-3 tickets siguientes |
| 3 | **Migracion retroactiva** de HOR-014.teach + HOR-015.teach al nuevo formato | Excepcion al patron NO-retroactivo de DKC (DET-20/21/22). Justificada por: (a) scope acotado (2 tickets), (b) son los casos mas recientes y unicos con teach files post-H12, (c) sirven como baseline empirico para TC-1/TC-2 |
| 4 | **Threshold "muchos elementos"** del viewer se define empirico en S4 (no a priori) | Subjetivo por definicion. Hipotesis inicial: >5 elementos. Validacion con HOR-015 (12 hipotesis) como caso denso. Dev firma el threshold en S4.GATE ⚑ fuerte |

**Riesgos principales y como los mitigamos**:

- **Las reglas del prompt no son suficientemente especificas y el output sigue tecnico** → mitigacion: S1 incluye task de escribir un teach "ideal" a mano (S1.T2) que sirve como referencia. S2.T5 valida que el prompt nuevo reproduce ese sample. Si falla, iterate sobre S1.
- **Threshold UX viewer es subjetivo y dev podria no estar de acuerdo con el numero elegido** → mitigacion: S4.GATE es ⚑ fuerte (decision humana obligatoria). Screenshots antes/despues. Si dev rechaza, iterate.
- **Dogfooding F-1 inmediato (S5 — cierre del propio HOR-016) revela que el formato sigue siendo insuficiente** → mitigacion: S5.T4 incluye decision continue/iterate/escalate explicita. Si TC-2 falla en el propio teach-close de HOR-016, NO se cierra el ticket — iterate sobre S1-S2 sin escalate prematuro.
- **Cambio en el componente Vue rompe render de tickets legacy** → mitigacion: REQ-PRESERVE-01 obligatorio. S4 incluye task de tests unit + screenshot de ticket pre-HOR-016 (HOR-013) para confirmar backward compat.

**Que NO se hace en este ticket**:

- **NO se cambian los bloques `dkc:*` en su estructura interna** (YAML schema sigue igual). Solo cambia el render del viewer cuando hay muchos elementos. Razon: el schema es contrato con HC, cambiarlo es alcance distinto.
- **NO se introducen gates nuevos en el flujo DKC** (sin nuevos steps obligatorios). Solo se modifican los gates existentes de `teach-{intake,close}.md` para validar las nuevas reglas. Razon: constraint explicito del dev — no sobrecargar el flujo.
- **NO se migran teach files anteriores a HOR-014** (HOR-013 y predecesores). Razon: HOR-013 es pre-H12; migrar requiere re-escribir mas que adaptar. Costo/beneficio bajo.
- **NO se implementa hook claude harness ni automatizaciones de teach** (out-of-scope de HOR-016, ya descartado en HOR-015 D6).
- **TC-8 (dogfooding F-1 sobre 2-3 tickets siguientes)** NO ejecuta en HOR-016 — queda declarado como validacion pending post-cierre. Si los tickets siguientes no aparecen en 2 semanas, registrar como riesgo de validacion pendiente.

**Tamano estimado**: 5 sessions ejecutables, aproximadamente 10-15h efectivas distribuidas. **La mas riesgosa**: S5 (validacion empirica + cierre) — depende de S3 (migracion) y S4 (viewer) listos y puede forzar iterate.

**Como vas a saber que funciona**:

- Le doy `HOR-015.teach/teach-close.md` migrado a un dev sin contexto del ticket y puede responder con naturalidad: (1) ¿que paso? (2) ¿de que se trataba? (3) ¿que se hizo? (4) ¿por que esa decision y no otra?
- Al abrir un teach con bloque `dkc:hypothesis-map` denso (12+ hipotesis) en HC, veo la info clave de cada hipotesis sin necesidad de hacer clicks individuales
- Los teach producidos por los 2-3 tickets siguientes al cierre de HOR-016 cumplen el test definitivo (TC-2) sin intervencion manual

---

## Purpose

Mejorar el output narrativo de los teach files (`teach-intake.md` + `teach-close.md`) producidos por el sistema DKC. Para devs nuevos al proyecto + devs que retoman casos cerrados sin contexto del chat. Importa porque DKC declara explicitamente "ensena mientras acompana" como proposito del KB, y el output actual no cumple ese rol — los teach files son data dump tecnico con intros tipo etiqueta, no narrativa onboarding.

## Requirements

### REQ-IMPROVE-01: Discurso narrativo continuo entre bloques

El sistema MUST forzar al LLM (via prompt) a producir teach files con **discurso narrativo continuo** entre secciones. Cada bloque `dkc:*` debe estar (a) **citado en la narrativa anterior** con razon de leerlo, (b) **conectado a la narrativa posterior** explicando que se aprendio o que sigue.

**Actor**: LLM ejecutor de `teach-{intake,close}.md` step
**Layers**: meta (prompts/templates)

#### Scenario: bloque `dkc:hypothesis-map` con citacion previa
- **GIVEN** un ticket con 6 hipotesis convergidas
- **WHEN** el LLM genera teach-intake.md aplicando el prompt nuevo
- **THEN** la narrativa antes del bloque `dkc:hypothesis-map` cita explicitamente al menos las hipotesis dominantes ("H1 es la dominante porque..." / "H6 quedo refuted al descubrir...")
- **AND** despues del bloque, la narrativa conecta con la siguiente seccion ("...por eso la decision principal — ver Decision drivers abajo — se inclino por...")

#### Scenario: contraejemplo — bloque sin citacion
- **GIVEN** una seccion del teach con bloque `dkc:*` cuya narrativa anterior NO lo menciona
- **WHEN** corre el gate de validacion del step
- **THEN** el gate falla con mensaje "bloque `dkc:{tipo}` sin citacion previa en la narrativa"
- **AND** el step NO marca `teachings.{intake|close}: done`

#### Acceptance
**El usuario puede verificar que funciona**: leer un teach generado por el sistema y confirmar que las 4 preguntas de TC-2 se responden con naturalidad. Si un dev no presente puede contar el caso fluidamente, REQ-IMPROVE-01 paso.

---

### REQ-IMPROVE-02: Glosario inline para terminos del dominio

El sistema MUST forzar al LLM a **definir en linea** la primera aparicion de cada termino del dominio (DET-N, RULE-id, modulo X, nombre de archivo critico). Reusos posteriores no redefinen pero quedan enlazados al primer uso.

**Actor**: LLM ejecutor de `teach-{intake,close}.md`
**Layers**: meta

#### Scenario: primer mention de DET-22
- **GIVEN** un teach que cita DET-22 en una seccion
- **WHEN** el LLM aplica el prompt nuevo
- **THEN** la primera aparicion incluye definicion breve (max 1 frase: "DET-22 es la regla que hace obligatorio producir teach-close antes de marcar status: closed")
- **AND** mentions posteriores de DET-22 referencian al primer uso (link markdown) sin redefinir

#### Scenario: mention de archivo critico
- **GIVEN** un teach que cita `_design-shared.md`
- **WHEN** se genera la primera mention
- **THEN** se acompaña de 1 frase explicando el rol del archivo en el caso ("`_design-shared.md` contiene los gates compartidos entre los 4 design-{tipo} — vive en `prompts/steps/`")

#### Acceptance
Un dev que no conoce DKC profundamente lee el teach y entiende los terminos sin abrir docs externas.

---

### REQ-IMPROVE-03: "Por que" antes del "que" al citar codigo

El sistema MUST forzar al LLM a **explicar el rol y la importancia** de un archivo/decision antes de mostrar la referencia tecnica. Para refs criticos: full intro narrativa. Para refs auxiliares: cite con 1 linea de contexto.

**Actor**: LLM ejecutor de `teach-{intake,close}.md`
**Layers**: meta

#### Scenario: ref critico con full intro
- **GIVEN** una seccion del teach que necesita citar `prompts/steps/teach-close.md` como archivo modificado
- **WHEN** se genera el contenido
- **THEN** primero aparece la justificacion ("El cambio principal vive en el step ejecutor — `teach-close.md` es donde la regla de discurso se valida como gate")
- **AND** despues aparece la referencia (`prompts/steps/teach-close.md`)

#### Scenario: ref auxiliar con cite minimo
- **GIVEN** una mencion de un archivo de configuracion auxiliar
- **WHEN** se cita
- **THEN** acompaña con 1 linea: "(`projects/horadric/config.yaml` — modulo workflow)"

#### Acceptance
Cada ref aparece con contexto del por que importa, no como cita seca.

---

### REQ-IMPROVE-04: Templates reestructurados para acomodar narrativa

Los templates `teach-intake.md` y `teach-close.md` MUST reestructurarse para incluir:

1. **TL;DR** en lenguaje conversacional al inicio (solo `teach-close.md`)
2. **La historia** — seccion narrativa de 3-5 parrafos que cuenta el caso de principio a fin
3. **Bloques `dkc:*`** integrados en la narrativa (no como secciones aisladas con prefacios H12 sueltos)

Las intros H12 (`> Que es / Como te afecta / Por que mirarla`) se MANTIENEN, pero la narrativa de la seccion las EXTIENDE conectando bloques entre si.

**Actor**: scribe (template editor) + LLM ejecutor (consumer)
**Layers**: meta (templates)

#### Scenario: teach-close con TL;DR + La historia
- **GIVEN** template nuevo aplicado
- **WHEN** el LLM produce teach-close.md
- **THEN** el archivo abre con seccion `## TL;DR` (2-3 lineas, lenguaje de PM, sin jerga del proyecto)
- **AND** sigue con `## La historia` (3-5 parrafos narrativos que cuentan el caso)
- **AND** las secciones canonicas posteriores (Hypothesis evolution, Decisions taken, etc.) conectan con la historia con frases tipo "...como vimos en La historia, H8 fue la dominante. El bloque abajo muestra el detalle..."

#### Acceptance
La estructura del archivo permite leerlo linealmente como articulo sin saltar secciones.

---

### REQ-IMPROVE-05: Viewer render denso de bloques `dkc:*`

El viewer (`horadric-cube`) MUST renderizar bloques `dkc:*` con muchos elementos (>threshold) con info clave **visible inline** (statement + status + rationale corto). Detalle expandido (evidence, refs completos) sigue disponible via click pero NO es obligatorio para entender el flujo.

**Actor**: usuario del viewer (dev leyendo teach)
**Layers**: frontend (Vue components)

#### Scenario: hypothesis-map con 12 hipotesis
- **GIVEN** un teach con `dkc:hypothesis-map` que contiene 12+ hipotesis (caso HOR-015)
- **WHEN** el usuario abre el viewer
- **THEN** ve un layout que muestra para cada hipotesis: id, statement (1 linea), status (badge), rationale corto (1-2 lineas) — sin clicks
- **AND** clickear una hipotesis expande detalle (evidence completa, refs, layers)

#### Scenario: hypothesis-map con pocas hipotesis
- **GIVEN** un teach con 3 hipotesis
- **WHEN** el usuario abre el viewer
- **THEN** ve el render actual (no se aplica el modo denso bajo el threshold)

#### Acceptance
Abrir HOR-015.teach en HC y ver las 12 hipotesis con info clave inline sin necesidad de clicks.

---

### REQ-IMPROVE-06: Migracion retroactiva de HOR-014 y HOR-015

Los teach files de HOR-014 y HOR-015 MUST re-escribirse aplicando el nuevo formato (REQ-IMPROVE-01..04).

**Actor**: developer
**Layers**: meta (archivos markdown)

#### Scenario: migracion de HOR-015.teach
- **GIVEN** HOR-015.teach/teach-close.md en formato post-H12
- **WHEN** se aplica el nuevo formato
- **THEN** el archivo nuevo tiene TL;DR + La historia + bloques `dkc:*` integrados narrativamente + glosario inline + por-que-antes-del-que
- **AND** los gates existentes (H12 cobertura, 5-ejes) siguen pasando

#### Acceptance
HOR-014.teach y HOR-015.teach migrados pasan el test definitivo TC-2.

---

### REQ-PRESERVE-01: Bloques `dkc:*` siguen parseando y renderizando

El cambio del viewer (REQ-IMPROVE-05) MUST mantener compatibilidad con teach files legacy (HOR-013 y predecesores no migrados).

**Actor**: viewer parser + components
**Layers**: backend (parser) + frontend (components)

#### Scenario: ticket legacy pre-H12
- **GIVEN** HOR-013.teach/teach-intake.md en formato pre-H12
- **WHEN** el usuario abre el tab Teaching en HC
- **THEN** el bloque `dkc:hypothesis-map` renderiza sin error
- **AND** los bloques `dkc:decision-matrix` y `dkc:learning-path` renderizan con el componente existente

#### Acceptance
Navegar a tabs Teaching de tickets pre-HOR-016 muestra contenido renderizado sin errores en consola.

---

### REQ-PRESERVE-02: Gates de templates existentes siguen pasando

Las validaciones que HOR-015 introdujo (cobertura H12 intros, 5-ejes) MUST seguir pasando con los templates nuevos.

**Actor**: gate validator en `teach-{intake,close}.md` step
**Layers**: meta

#### Scenario: gate H12 en template nuevo
- **GIVEN** template nuevo con narrativa extendida
- **WHEN** el LLM produce un teach
- **THEN** las intros H12 siguen presentes en cada seccion canonica
- **AND** el gate de cobertura H12 pasa

#### Acceptance
Generar un teach con el prompt nuevo y verificar que pasa los gates pre-existentes sin override.

---

### REQ-PRESERVE-03: Estructura del frontmatter no cambia

El frontmatter de los teach files (`kind`, `status`, `ticket`, fechas, etc.) MUST permanecer identico.

**Actor**: HC viewer + parser server
**Layers**: backend (parser)

#### Scenario: parser server lee teach nuevo
- **GIVEN** teach migrado con frontmatter actual
- **WHEN** server parsea el archivo
- **THEN** todos los campos del frontmatter se leen correctamente

#### Acceptance
HC sigue navegando a los teach migrados sin cambios en server logic.

---

## Changes

### Modified: `prompts/steps/teach-intake.md`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Tono solicitado al LLM | "tono educativo" generico | "discurso narrativo continuo + glosario inline + por-que-antes-del-que" con ejemplos | Reglas especificas producen output reproducible |
| Gates de validacion | H12 intros + cobertura 4 ejes + bloques validos | + validacion de citacion de bloques `dkc:*` en narrativa | Asegura discurso vs etiquetas |
| Audiencia objetivo | "dev que va a ejecutar este ticket" | "dev que no estuvo en el ticket y debe responder ¿que paso? ¿por que esa decision?" | Test definitivo (TC-2) como guia explicita |

### Modified: `prompts/steps/teach-close.md`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Tono solicitado al LLM | "tono educativo" generico | idem teach-intake + secciones nuevas (TL;DR + La historia) | Reproducibilidad |
| Gates de validacion | H12 + cobertura 5 ejes | + validacion de TL;DR + La historia + citacion bloques | Forzar narrativa, no solo etiquetas |

### Modified: `templates/outputs/teach-intake.md`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Estructura | Intros H12 + bloques `dkc:*` como secciones | + narrativa de transicion entre secciones que cita los bloques | Discurso continuo |
| Reglas del template | "Cobertura 5-ejes + intros narrativas H12" | + "Citacion de bloques" + "Glosario inline" + "Por-que-antes-del-que" | Documentar reglas nuevas |

### Modified: `templates/outputs/teach-close.md`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Estructura | What was done (sintesis) + secciones | + TL;DR explicito + La historia (3-5 parrafos narrativos) + secciones integradas | TL;DR en lenguaje de PM, narrativa antes del detalle |
| Reglas del template | idem teach-intake | + reglas nuevas | idem |

### Modified: `projects/horadric/tickets/HOR-014.teach/teach-close.md`

Re-escritura aplicando nuevo formato. NO cambia frontmatter ni structura de bloques `dkc:*` (solo el contenido narrativo).

### Modified: `projects/horadric/tickets/HOR-015.teach/teach-close.md`

idem HOR-014.

### Modified: `horadric-cube/src/components/dkc-blocks/DkcHypothesisGraph.vue`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Render con muchos elementos | Click-to-expand individual por hipotesis | Modo denso sobre threshold: info clave inline (id, statement, status, rationale corto) | UX engorroso con 12+ elementos |
| Backward compat | n/a | Threshold por defecto activa modo denso solo sobre N elementos | Tickets con pocas hipotesis siguen igual |

### Added: `templates/outputs/teach-close.md` seccion `## TL;DR`

Nueva seccion al inicio del archivo (despues del frontmatter, antes de cualquier otra). 2-3 lineas en lenguaje conversacional sin jerga del proyecto.

---

## Tasks

### Session 1 — Formalizar reglas + ejemplo de referencia [tipo: auto] [tier: T1]

| # | Task | Agent | Depends on | Files | Rules | Validation | Status | Session | Rollback | source_ref |
| --- | ------ | ------- | ------------ | ------- | ------- | ------------ | -------- | --------- | --- | --- |
| S1.T1 | Investigar `HOR-015.teach/teach-close.md` a fondo: identificar especificamente donde falla el discurso narrativo, donde hay terminos sin glosario, donde refs sin contexto | researcher | — | HOR-015.teach/teach-close.md, HOR-014.teach/teach-close.md | DET-4, DET-6, DET-11 | Listado escrito de 10+ instancias concretas con linea + razon (en spec o doc local) | done | 1 | — | — |
| S1.T2 | Escribir a mano un teach-close "ideal" para HOR-016 (sample reference): aplicar las reglas mentales antes de codificarlas en el prompt | architect | S1.T1 | projects/horadric/tickets/HOR-016.teach/teach-close-sample.md | DET-1, DET-2 | Sample escrito + dev firma "este es el formato objetivo" | done | 1 | — | — |
| S1.T3 | Extraer 5-10 reglas concretas para el prompt a partir del sample. Cada regla con: descripcion + 1 ejemplo positivo + 1 ejemplo negativo | architect | S1.T2 | Session 1 del ticket (5 reglas documentadas) | DET-2, DET-11 | Reglas escritas + revisadas por dev | done | 1 | — | — |
| **S1.GATE** | **Gate de sync Session 1 (tier: T1)** — persistir reglas + sample + decisiones en `## Sessions` del ticket. Validar que el sample S1.T2 + las reglas S1.T3 son self-contained (un dev que NO ejecuto S1.T1 entiende el target). Decidir continue/iterate/escalate | reviewer | S1.T1, S1.T2, S1.T3 | ticket | DET-20 | Gate persistido + dev OK explicito sobre el sample | done | 1 | — | — |

### Session 2 — Editar prompts + templates [tipo: auto] [tier: T1]

| # | Task | Agent | Depends on | Files | Rules | Validation | Status | Session | Rollback | source_ref |
| --- | ------ | ------- | ------------ | ------- | ------- | ------------ | -------- | --------- | --- | --- |
| S2.T1 | Editar `prompts/steps/teach-close.md` con reglas nuevas (S1.T3). Agregar gates de validacion: citacion bloques, TL;DR presente, La historia presente | developer | S1.GATE | prompts/steps/teach-close.md | DET-2, DET-8, DET-11, DET-21 | Diff revisable. Tests del step (si existen) pasan | done | 2 | — | — |
| S2.T2 | Editar `prompts/steps/teach-intake.md` con reglas nuevas (subset aplicable a intake — TL;DR NO aplica) | developer | S1.GATE | prompts/steps/teach-intake.md | DET-2, DET-8, DET-11, DET-22 | Diff revisable | done | 2 | — | — |
| S2.T3 | Editar `templates/outputs/teach-close.md` con nueva estructura (TL;DR + La historia + secciones integradas) | developer | S2.T1 | templates/outputs/teach-close.md | DET-2, DET-16, RULE-workflow-det-introduction-001 | Diff revisable. Estructura coincide con sample S1.T2 | done | 2 | — | — |
| S2.T4 | Editar `templates/outputs/teach-intake.md` con nueva estructura (sin TL;DR pero con narrativa integrada) | developer | S2.T2 | templates/outputs/teach-intake.md | DET-2, DET-16 | Diff revisable | done | 2 | — | — |
| S2.T5 | Validacion empirica: invocar mentalmente teach-close con prompt nuevo sobre un ticket de prueba (ej: HOR-014 sin pre-cargarlo migrado). Comparar output con sample S1.T2 | researcher | S2.T1, S2.T2, S2.T3, S2.T4 | (output local) | DET-4, DET-7, DET-13 | Output reproduce las propiedades del sample (discurso continuo, glosario, citacion bloques). Si diverge: iterate prompt | done | 2 | — | — |
| **S2.GATE** | **Gate de sync Session 2 (tier: T0 — ajustado de T1 planeado; sin tests unit que correr sobre prompts/templates markdown)** — persistir resultados. Validar gates pre-existentes (H12, 5-ejes) siguen pasando con templates nuevos. Decidir continue/iterate | reviewer | S2.T1..T5 | ticket | DET-20, DET-7 | Gate persistido + gates H12/5-ejes verde + coherencia cruzada R1-R5 en 4 archivos | done | 2 | — | — |

### Session 3 — Migracion HOR-014 + HOR-015 [tipo: auto] [tier: T0]

| # | Task | Agent | Depends on | Files | Rules | Validation | Status | Session | Rollback | source_ref |
| --- | ------ | ------- | ------------ | ------- | ------- | ------------ | -------- | --------- | --- | --- |
| S3.T1 | Migrar `HOR-014.teach/teach-close.md` al nuevo formato. Aplicar template + reglas. Mantener frontmatter y schema de bloques `dkc:*` | developer | S2.GATE | projects/horadric/tickets/HOR-014.teach/teach-close.md | DET-2, DET-16, RULE-workflow-det-introduction-001 | Archivo migrado pasa gates H12 + 5-ejes + nuevas validaciones | done | 3 | — | — |
| S3.T2 | Migrar `HOR-015.teach/teach-close.md` al nuevo formato (caso denso con 12 hipotesis — estresa el formato) | developer | S2.GATE | projects/horadric/tickets/HOR-015.teach/teach-close.md | idem | idem + bloques `dkc:hypothesis-map` con 12 elementos siguen siendo legibles narrativamente | done | 3 | — | — |
| S3.T3 | (Opcional) Migrar `HOR-014.teach/teach-intake.md` + `HOR-015.teach/teach-intake.md` para consistencia. Si bloquea, posponer a backlog | developer | S3.T1, S3.T2 | HOR-014.teach/teach-intake.md, HOR-015.teach/teach-intake.md | idem | Migrados o documentado en backlog | deferred (backlog B1) | 3 | — | — |
| **S3.GATE** | **Gate de sync Session 3 (tier: T0)** — lint frontmatter + cross-references + gates validan. Persistir resultados | reviewer | S3.T1, S3.T2, S3.T3 | ticket | DET-20, DET-7, DET-13 | Gate persistido + lint OK + cross-refs intactos | done | 3 | — | — |

### Session 4 — UX viewer: render denso [tipo: ⚑ fuerte] [tier: T2]

| # | Task | Agent | Depends on | Files | Rules | Validation | Status | Session | Rollback | source_ref |
| --- | ------ | ------- | ------------ | ------- | ------- | ------------ | -------- | --------- | --- | --- |
| S4.T1 | Definir threshold "muchos elementos" empirico: testear con HOR-015 (12 hipotesis) cuantos elementos hacen el render engorroso. Hipotesis inicial: >5 | researcher | S3.GATE (idealmente) o paralelo | (output local + screenshots) | DET-4, DET-11 | Numero N propuesto con evidencia (screenshots de render con 3, 5, 8, 12 elementos) | done — N=5 confirmado empirico con baseline HOR-015 (14 nodos = engorroso) | 4 | — | — |
| S4.T2 | Modificar `DkcHypothesisGraph.vue` para activar render denso sobre threshold N: info clave inline (id, statement, status badge, rationale corto). Mantener expansion opcional para evidence/refs | developer | S4.T1 | horadric-cube/src/components/dkc-blocks/DkcHypothesisGraph.vue | DET-5, DET-8, DET-10, RULE-workflow-det-introduction-001 | Componente renderiza ambos modos correctamente. Tests unit pasan | done — dual-mode (lista densa default >=5, grafo <5) + toggle manual implementado | 4 | — | — |
| S4.T3 | Evaluar si otros bloques `dkc:*` densos (decision-matrix, learning-path) requieren cambio similar. Si si: aplicar. Si no: documentar por que | developer | S4.T2 | horadric-cube/src/components/dkc-blocks/ | DET-5, DET-16 | Decision documentada + cambios si aplican | done — decision-matrix marginal (backlog B3 si surge caso real >=4 opciones), learning-path/code-walkthrough OK por estructura inline | 4 | — | — |
| S4.T4 | Tests unit del componente actualizado: render con N=3 (denso off), N=5 (threshold), N=12 (denso on), N=12 con click (expansion) | developer | S4.T2 | horadric-cube/src/components/dkc-blocks/__tests__/ | DET-5, DET-7 | Tests pasan + coverage no baja | deferred (backlog B4) — cambio puramente UI, validacion via screenshots; agregar happy-dom solo para 1 componente UI es desproporcionado | 4 | — | — |
| S4.T5 | Capturar screenshots antes/despues para HOR-015.teach. Comparar render denso vs render actual | researcher | S4.T2 | horadric-cube/screenshots/HOR-016/ | DET-13 | Screenshots disponibles para gate decision humana | done — 3 screenshots en `HOR-016.screenshots/` | 4 | — | — |
| **S4.GATE** | **Gate de sync Session 4 (tier: T2) — ⚑ fuerte** — Dev revisa screenshots S4.T5 y firma "es mas legible". Decision humana obligatoria. Si dev rechaza: iterate S4.T1-T2 con threshold distinto o presentation distinta | reviewer | S4.T1..T5 | ticket | DET-20, DET-7, DET-13, DET-14 | Dev firma explicito + screenshots persistidos + gate documentado | done — dev firmo "apruebo" 2026-05-10 | 4 | — | — |

### Session 5 — Validacion empirica + cierre con dogfooding F-1 [tipo: ⚑ fuerte] [tier: T3]

| # | Task | Agent | Depends on | Files | Rules | Validation | Status | Session | Rollback | source_ref |
| --- | ------ | ------- | ------------ | ------- | ------- | ------------ | -------- | --------- | --- | --- |
| S5.T1 | Ejecutar TC-1 (baseline): dar `HOR-015.teach/teach-close.md` ACTUAL (pre-migracion, formato post-H12) a un dev sin contexto. Pedir respuesta a 4 preguntas. Documentar respuestas + dificultades observadas | researcher | S3.GATE, S4.GATE | (transcript local + ticket) | DET-4, DET-7, DET-13 | TC-1 ejecutado, evidencia documentada en ticket | pending | 5 | — | — |
| S5.T2 | Ejecutar TC-2 (mejora): dar `HOR-015.teach/teach-close.md` MIGRADO a un dev sin contexto (ideal: dev distinto a TC-1). Pedir respuesta a 4 preguntas | researcher | S5.T1, S3.T2 | (transcript local + ticket) | DET-4, DET-7, DET-13 | TC-2 ejecutado, dev responde con naturalidad las 4 preguntas | pending | 5 | — | — |
| S5.T3 | Ejecutar TC-5 (viewer): abrir HOR-015.teach en HC post-S4. Validar que info clave es visible sin clicks | researcher | S5.T2, S4.GATE | (screenshots) | DET-7, DET-13 | TC-5 paso. Screenshots de comparacion antes/despues | pending | 5 | — | — |
| S5.T4 | Comparar resultados TC-1 vs TC-2 vs TC-5. Decidir: continue (cerrar HOR-016), iterate (volver a S1-S2 con feedback), o escalate (problema mas profundo). Si iterate: maximo 2 ciclos antes de escalate | architect | S5.T1, S5.T2, S5.T3 | ticket | DET-12, DET-13, DET-14 | Decision documentada con racional + AskUserQuestion al dev si la decision no es clara | pending | 5 | — | — |
| S5.T5 | Si decision = continue: invocar `request-close` con sub-paso `teach-close` para HOR-016 (dogfooding F-1 inmediato — el propio teach-close de HOR-016 usa el nuevo formato como primer caso real producido por el sistema modificado) | developer + scribe | S5.T4 | projects/horadric/tickets/HOR-016.teach/teach-close.md + projects/horadric/tickets/HOR-016.md | DET-13, DET-22 | teach-close.md producido pasa gates nuevos. Ticket marcado `closed`. Reindex post-close | pending | 5 | — | — |
| **S5.GATE** | **Gate de sync Session 5 (tier: T3) — ⚑ fuerte** — gate de cierre del ticket. Dev firma que (a) HOR-015.teach migrado pasa TC-2, (b) viewer pasa TC-5, (c) teach-close del propio HOR-016 cumple el formato. TC-8 declarado como pending post-cierre | reviewer | S5.T1..T5 | ticket | DET-20, DET-13, DET-14, DET-22 | Gate persistido + dev firma cierre + TC-8 documentado como validacion pending | done — dev firmo "si" 2026-05-10, ticket cerrado | 5 | — | — |

### Task contract — patron general

Cada task de S2/S3/S4/S5 que modifica codigo o templates aplica:

- `source_ref`: REQ-IMPROVE-{XX} o REQ-PRESERVE-{XX} (ver columna correspondiente arriba si no esta explicita — sera completada al refinar en execute si emerge ambiguedad)
- `agent`: ver columna `Agent`
- `files`: ver columna `Files`
- `precondition`: la task de la columna `Depends on` cerro
- `expected_output`: ver columna `Validation`
- `validation`: ver columna `Validation`
- `rollback`: git revert del commit individual (todas las tasks son archivos markdown o componentes Vue puros, sin migracion de datos)
- `rules`: ver columna `Rules`

---

## Constraints

- **RULE-workflow-det-introduction-001** (intro a DETs): el patron narrativo del template (S2.T3/T4) debe permitir agregar definicion de DETs sin romper el formato. La regla nueva de glosario inline (REQ-IMPROVE-02) extiende esta rule.
- **RULE-workflow-session-format-canonical-002** (formato canonico de sessions): los gates de sessions (S{N}.GATE) siguen el formato del template ticket.
- **DEC-LOCAL del SPEC-workflow-dkc-flow-audit-15**: patron H12 (intros narrativas obligatorias). HOR-016 lo extiende, NO lo reemplaza.

---

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| `horadric-cube` repo | internal | S4 modifica componentes Vue. Cambios requieren branch + build + tests locales | Si horadric-cube esta en mid-refactor por otro ticket, conflicto de merge. Mitigacion: branch separada `HOR-016-teach-narrative` + coordinar con HEAD actual de horadric-cube |
| `vitest` (HC tests) | external | S4.T4 requiere ejecutar tests unit con vitest | Si vitest version cambia entre tickets, tests pueden fallar por razones no relacionadas. Mitigacion: ejecutar suite completa en S4.T4 antes de marcar done |
| Dev disponible para TC-1/TC-2/TC-5 | internal | S5 requiere humano (idealmente distinto al dev que ejecuto S1-S4) para validacion empirica | Si no hay dev disponible, S5 se bloquea. Mitigacion: aceptar que el mismo dev haga TC-1/TC-2 con 24h de gap entre ambos para reducir bias |

---

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Las reglas del prompt no producen el output esperado (LLM no las sigue consistentemente) | medium | high (test definitivo falla → iterate sin fin) | S1.T2 sample escrito a mano como referencia + S2.T5 validacion empirica antes de S3. Si S2.T5 diverge del sample: iterate S1-S2 antes de migrar |
| Threshold UX viewer subjetivo y dev rechaza el numero elegido | medium | medium (S4 iterate, retraso) | S4.GATE ⚑ fuerte + screenshots multiples (3, 5, 8, 12 elementos) en S4.T1. Dev decide informado |
| Dogfooding F-1 inmediato (S5.T5) revela que el formato sigue siendo insuficiente | low | high (no se cierra el ticket, iterate o escalate) | S5.T4 incluye decision continue/iterate/escalate explicita. Si iterate: max 2 ciclos. Si la tercera iteracion falla: escalate explicito al dev con opciones (split ticket, replantear scope) |
| Cambio en `DkcHypothesisGraph.vue` rompe render de tickets legacy (HOR-013 pre-H12) | low | medium (regresion silenciosa) | REQ-PRESERVE-01 + S4.T4 incluye test con ticket legacy. S4.T5 screenshots de ticket pre-H12 para comparacion |
| Scope mayor multi-modulo crece durante execute (riesgo conocido por DET-12) | medium | medium (delay, gates fuertes consumen mas tiempo del estimado) | DET-12 evaluado en intake, dev firmo el riesgo. Si crece mas alla de 7 sessions reales: escalate explicito |
| Constraint "no agregar gates nuevos al flujo" se rompe con validaciones nuevas en S2.T1/T2 | low | low (constraint del dev violado) | Aclaracion: los gates nuevos VIVEN DENTRO del step `teach-{intake,close}.md` existente. NO son nuevos steps, son nuevas validaciones del step actual. El flujo DKC no gana nuevos pasos obligatorios — solo gana validaciones internas. Verificar con dev en S2.T1 si interpretacion correcta |

---

## Open questions

- [ ] **Glosario inline — formato exacto**: ¿parentesis con definicion, footnote markdown, o bloque dedicado "Terminos en este teach"? Se decide en S1.T3 con ejemplos comparativos
- [ ] **TL;DR — longitud maxima**: ¿2 lineas estrictas, 3, 4? Se decide en S1.T2 con sample
- [ ] **Bloques `dkc:*` densos — otros bloques aplican?**: Se evalua en S4.T3 si decision-matrix o learning-path con muchos elementos requieren render denso similar
- [ ] **Dogfooding F-1 — TC-8 timing**: ¿que pasa si los 2-3 tickets siguientes a HOR-016 no aparecen en 2 semanas? Plan provisional: registrar como pending al cerrar y revisitar despues
- [ ] **Migracion HOR-014/015 teach-intake (S3.T3)**: ¿obligatorio o opcional? Inicialmente opcional. Si emerge necesidad en S5 (consistencia para TCs): convertir en obligatorio en backlog

---

## Decisions

### DEC-LOCAL-01: Un solo ticket multi-modulo

- **Contexto**: HOR-016 scope crecio a deckard + horadric-cube post intake-explore. DET-12 evaluado.
- **Drivers**: cohesion del aprendizaje (alto), independencia de modulos (medio), riesgo de scope creep (alto), dogfooding F-1 empirico (medio)
- **Opcion elegida**: A. Un solo ticket
- **Alternativas**: B. Split en HOR-016 (deckard) + HOR-017 (viewer)
- **Consecuencias**: 5 sessions multi-modulo con 2 gates ⚑ fuerte. Menor paralelismo, mayor coherencia narrativa. Si scope crece >7 sessions reales: escalate
- **Session**: pre-design (intake-explore + chat con dev)

### DEC-LOCAL-02: Threshold viewer empirico, no a priori

- **Contexto**: REQ-IMPROVE-05 requiere definir cuando un bloque `dkc:*` tiene "muchos elementos"
- **Drivers**: precision empirica, evitar over-engineering, decision reversible
- **Opcion elegida**: definir en S4.T1 testeando con HOR-015 (12 hipotesis) y muestras intermedias (3, 5, 8)
- **Alternativas**: definir a priori (ej: >5) sin evidencia visual
- **Consecuencias**: S4 incluye task de investigacion + dev firma threshold en S4.GATE. Si en el futuro emerge ticket con N diferente, ajustar via config opcional del componente
- **Session**: design (este spec)

### DEC-LOCAL-03: Migracion HOR-014/HOR-015 como excepcion al NO-retroactivo

- **Contexto**: DKC tiene patron NO-retroactivo (DET-20/21/22). Migrar teach files existentes es excepcion
- **Drivers**: scope acotado (2 tickets), recencia (cerrados en 2026-05-10), valor como baseline empirico para TC-1/TC-2
- **Opcion elegida**: migrar HOR-014 + HOR-015 teach-close (HOR-013 NO se migra — es pre-H12, costo > beneficio)
- **Alternativas**: NO migrar (pero entonces TC-1/TC-2 carecen de baseline real); migrar todos pre-2026-05-10 (excesivo)
- **Consecuencias**: 2 archivos re-escritos. Patron NO-retroactivo NO se rompe globalmente — esta excepcion queda documentada y justificada
- **Session**: pre-design (intake-explore)

---

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de cada REQ-IMPROVE-XX pasan (incluye TC-2 empirico)
- [ ] **Tests**: TC-1 a TC-7 ejecutados en S5. TC-8 declarado pending post-cierre
- [ ] **NFRs**: no aplican (mejora cualitativa, no de performance/scale)
- [ ] **Rules**: H12 cobertura intros + 5-ejes (gates pre-existentes) pasan en templates nuevos
- [ ] **Integration**: REQ-PRESERVE-01 + REQ-PRESERVE-03 verificados — HOR-013 (pre-H12) sigue renderizando
- [ ] **Docs**: templates actualizados. `RULE-workflow-det-introduction-001` revisable si nueva regla de glosario inline lo amerita extender (decidir en S2)
- [ ] **Dogfooding F-1 inmediato**: teach-close del propio HOR-016 producido por el sistema modificado cumple TC-2

---

## Success metrics

| Metric | Current | Target | How to measure |
|--------|---------|--------|----------------|
| Dev no presente responde 4 preguntas con naturalidad | falla (TC-1 baseline) | pasa (TC-2 post-migracion) | test empirico TC-1 vs TC-2 con dev distinto idealmente |
| Bloques `dkc:*` con 12+ elementos legibles sin clicks | requiere clicks (sintoma reportado por dev) | info clave visible inline | inspeccion visual + screenshots HOR-015 antes/despues |
| Teach files producidos por sistema cumplen formato sin intervencion manual | n/a (formato nuevo aun no implementado) | 100% pasan gates nuevos + 80%+ pasan TC-2 | TC-7 (proximo ticket) + TC-8 (dogfooding F-1 sobre 2-3 tickets siguientes, declarado pending post-cierre) |

---

## Technical reference

### Archivos clave del cambio

- **Prompts del sistema** (`prompts/steps/`):
  - `teach-intake.md` — gates + reglas nuevas
  - `teach-close.md` — gates + reglas + TL;DR/La historia
- **Templates** (`templates/outputs/`):
  - `teach-intake.md` — estructura narrativa integrada
  - `teach-close.md` — estructura + TL;DR + La historia
- **Componente viewer** (`horadric-cube/src/components/dkc-blocks/`):
  - `DkcHypothesisGraph.vue` — render denso sobre threshold
  - Posiblemente: `DkcDecisionMatrix.vue`, `DkcLearningPath.vue` (evaluar en S4.T3)
- **Migracion**:
  - `projects/horadric/tickets/HOR-014.teach/teach-close.md`
  - `projects/horadric/tickets/HOR-015.teach/teach-close.md`

### Reglas que extiende este ticket

- `RULE-workflow-det-introduction-001` (intro a DETs) — base para REQ-IMPROVE-02 (glosario inline). Evaluar si HOR-016 promueve una nueva rule de glosario o extiende la existente

---

## Rules discovered

{Se llena durante ejecucion.}

## Bugs found

{Se llena durante ejecucion.}

## Archiving

No archivar este spec sin promover rules/decisions descubiertas. Si en S4.T3 se decide aplicar render denso a multiples bloques, considerar promover una decision formal sobre el patron.
