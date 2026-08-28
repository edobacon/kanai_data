---
id: DOC-kb-sp5-README
project: up1
type: doc
---

# SP5 — Malla curricular

Planificación del **Sprint 6** de up1 (mod `curriculum-design`).

---

## 📌 En una frase

> Construir la pantalla donde un **diseñador curricular arma el plan de estudios de una carrera**: colocar las asignaturas por semestre, marcarlas como obligatorias o electivas, agruparlas en líneas de formación y definir sus requisitos — todo guardado en 3 objetos de datos nuevos.

## ¿Qué podrá hacer el usuario al terminar SP5?

1. **Abrir un plan de estudios y ver su malla** organizada por períodos (semestres), con cada asignatura en una tarjeta.
2. **Agregar asignaturas** del catálogo a la malla: obligatorias, o electivas dentro de un "bloque" con nombre (ej. "Electivos de Especialización: elegir 4").
3. **Editar o quitar** una asignatura colocada (créditos, línea de formación, obligatoria/electiva).
4. **Filtrar** la malla por línea de formación y por bloque electivo.
5. **Gestionar las líneas de formación** del plan (crear/editar: nombre, créditos, color, ícono).

Esto cubre planes **secuenciales** (con semestres). Los planes modulares, el versionado de la malla y el editor de requisitos quedan para SP6.

---

## 🧭 Cómo leer estos documentos (según tu rol)

- **¿Product Owner / quiere crear los tickets?** → empieza por **[SP5-historias-usuario.md](SP5-historias-usuario.md)** (los 9 tickets listos para Jira). Para entender por qué entra/sale cada cosa: **[SP5-alcance-y-justificacion.md](SP5-alcance-y-justificacion.md)**.
- **¿Dev que va a implementar?** → toma tu ticket en `SP5-historias-usuario.md`; si necesitas el detalle técnico fino (archivos, patrones, gotchas), ve al **[plan maestro §3](SP5-plan-malla-curricular.md)**. **Antes de tocar versionado, lee la [auditoría](auditoria-viabilidad_2026-06-23.md).**
- **¿Tech lead / quiere el panorama completo?** → **[SP5-plan-malla-curricular.md](SP5-plan-malla-curricular.md)** (alcance, dependencias, riesgos, decisiones).
- **¿Quiere entender una decisión de UX puntual?** → **[decisiones-reunion](decisiones-reunion_2026-06-23.md)** (qué se acordó, con timestamps) y **[deltas-transcript-vs-mockup](deltas-transcript-vs-mockup.md)** (dónde la maqueta se quedó corta).

---

## 📂 Contenido de la carpeta

| Archivo | Qué es | Para quién |
|---|---|---|
| [SP5-historias-usuario.md](SP5-historias-usuario.md) | **Backlog SP5:** 9 tickets consolidados (MC-01..MC-09), cada uno con historia, criterios de aceptación, story points, testing y dependencias. | PM, dev |
| [prespecs/](prespecs/) | **Borradores de spec + intake por ticket** (MC-0X): REQ con certeza + `source_ref`, tasks con rollback, test cases, intake (KB/reuso/supuestos). Adelantan el design DKC; se transcriben al spec formal cuando se cree el ticket. | dev |
| [SP6-backlog-diferidos.md](SP6-backlog-diferidos.md) | **Backlog SP6:** lo diferido, ya escrito como historias (editor de requisitos, versionado, etc.). | PM |
| [SP5-plan-malla-curricular.md](SP5-plan-malla-curricular.md) | **Plan maestro:** alcance, dependencias, desglose técnico de tareas, estimaciones, riesgos, decisiones. | Tech lead, dev |
| [SP5-alcance-y-justificacion.md](SP5-alcance-y-justificacion.md) | **Frontera del sprint:** qué entra, qué sale y **por qué** + calibración con sprints anteriores. | PM, tech lead |
| [auditoria-viabilidad_2026-06-23.md](auditoria-viabilidad_2026-06-23.md) | **Validación técnica** contra el código real (qué es viable, qué está roto, qué ya existe). | dev, tech lead |
| [deltas-transcript-vs-mockup.md](deltas-transcript-vs-mockup.md) | Dónde la reunión corrigió/superó la maqueta + decisión de componentes. | dev |
| [decisiones-reunion_2026-06-23.md](decisiones-reunion_2026-06-23.md) | Decisiones de la reunión de inicio (con timestamps del audio). | todos |
| [SP5-issues.md](SP5-issues.md) | Issues abiertos para el team up1 detectados durante SP5. | dev, tech lead |
| [sp5-definicion-de-ready.md](sp5-definicion-de-ready.md) | Definition of Ready (DoR) + flags abiertos antes de arrancar. | PM, dev |
| [sp5-seed-fixtures.md](sp5-seed-fixtures.md) | Seed fixtures: datos de ejemplo listos para sembrar en el entorno de prueba. | dev |
| [mcp-malla-coverage-gap.md](mcp-malla-coverage-gap.md) | Cobertura MCP de la malla curricular: estado y gaps. | dev |
| [SP5-presentacion.html](SP5-presentacion.html) | Presentación (HTML) de lo realizado en la malla curricular. | todos |
| [onboarding-up1-curriculum-design.html](onboarding-up1-curriculum-design.html) | Onboarding UP1 · Curriculum Design (HTML). | referencia |
| Archivo.zip | Adjunto de respaldo (fuentes/export). | referencia |
| [sources/](sources/) | Fuentes originales: handoff de historias, maqueta v10 (HTML), transcripción (PDF). | referencia |

---

## 🎟️ Los 9 tickets de SP5 (resumen)

> Detalle completo en `SP5-historias-usuario.md`. La letra/número entre paréntesis es el desglose técnico del plan §3.

| Ticket | Qué entrega | SP | Prioridad |
|---|---|---:|---|
| **MC-01** Modelo base | enum de progresión + campo "vigente" en asignaturas (BE-0, BE-1) | 2 | Must |
| **MC-02** Objetos planEntry + líneas | el elemento de la malla + las líneas de formación (A1, A2) | 5 | Must |
| **MC-03** Objeto requirement + bloque electivo | el motor de reglas (árbol) + bloques electivos (A3, A4) | 7 | Must |
| **MC-04** Registro + MCP | dejar los objetos operables en la UI y en el MCP (A5, F1) | 5 | Must |
| **MC-05** Malla: ver + editar + resumen | la vista de la malla y su modo edición (B1, B2, B3) | 5 | Must |
| **MC-06** Malla: agregar/editar asignaturas | obligatorias + electivas + editar/quitar (B4, B5, B7) | 8 | Must/Should |
| **MC-07** Líneas de formación | la pestaña CRUD de líneas (C1–C4) | 5 | Must/Could |
| **MC-08** Malla: filtros + interacciones | filtros, bloqueo por prereqs, drag&drop (B9, B6, B8) | 7 | Should/Could |
| **MC-09** Validación restrictiva | no editar requisitos de cursos en planes publicados (D2) | 3 | Could |

**Compromiso del sprint (lo que se promete):** MC-01 a MC-07 ≈ **37 SP** → la malla editable con obligatorias, electivas y líneas, con los objetos en el MCP.
**Colchón (si sobra tiempo):** MC-08 y MC-09 ≈ 10 SP.

> ⚠️ **Realidad de la estimación:** históricamente el equipo **subestima ~30-38%** (SP4 entregó ~34 SP, SP4 ~63). El demoable es realista pero **no holgado**. El objeto más riesgoso es **MC-03 (`requirement`)**: su análogo histórico se estimó en 2 y costó 7. Ver `SP5-alcance-y-justificacion.md §5`.

---

## 🚦 Qué entra y qué no (clasificación)

- 🟢 **Núcleo SP5 (lo acordado en reunión + handoff):** la feature de malla — MC-01 a MC-07 (+ MC-09 validación). Se compromete la rebanada demoable; el resto fluye a SP6 por capacidad.
- 🟡 **Diferido a SP6 por dependencia/emergencia:**
  - **Versionado/clonado de la malla** — se quiso incluir, pero la validación probó que **versionar un Curriculum está roto en el core** (no es trabajo del mod; requiere un fix de plataforma). Ver auditoría.
  - **Editor de requisitos del curso** — no estaba pedido en el handoff; emergió de la maqueta.
- ⚪ **Fuera de alcance (futuro):** planes modulares, hitos/menciones, motor de evaluación del avance del estudiante.

---

## 🛡️ Reglas del sprint (límites)

- **Trabajar solo en el mod** `curriculum-design`. La única excepción para tocar el core de la plataforma es el versionado/clonado (que va a SP6).
- **Lo que se desarrolle debe quedar operable en el MCP** (la capa conversacional/Elric) en el mismo sprint — pero eso es barato (contratos declarativos, MC-04).
- **Cada tarea lleva sus tests** como parte del trabajo (no es esfuerzo aparte).
- **Commits/ramas/PRs** usan el id de Jira (`UPONE-####`), nunca van directo a `main`/`develop`.

---

## 📖 Glosario (códigos y jerga que aparecen en los docs)

**Objetos de datos nuevos**
- **`planEntry`** — una asignatura colocada en la malla (en qué plan, qué período, qué línea, obligatoria/electiva).
- **`requirementCategory`** — una "línea de formación" (bucket de créditos, ej. "Ciencias Básicas").
- **`requirement`** — una regla/req
