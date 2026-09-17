---
id: DOC-kb-sp10-Analisis-de-estado-TICKET-143-UPONE-1756-Tributacion-CRUD-por-competencia
project: up1
type: doc
module: curriculum-mapping
tags:
  - tributacion
  - competency-alignment
  - analisis-estado
  - gate
  - UPONE-1756
  - TICKET-143
  - UPONE-1771
  - UPONE-1772
  - cierre
---

# Análisis de estado TICKET-143 / UPONE-1756 (Tributación: CRUD por competencia)

Revisión del estado del ticket en curso bajo el lente de las nuevas métricas y flujos de Kanai (gates con verificación real, cobertura REQ↔TC, churn, disciplinas). Ticket en curso, NO cerrar aún. Este doc quedó como checklist de cierre: los dos puntos de DECISIÓN ya se fijaron por adenda y el delete/R-1 se confirmó en código; lo que resta es ejecución. Ver "Contexto relacionado".

## Contexto

- Ticket: TICKET-143 · UPONE-1756 · mod curriculum-mapping (+ tab en curriculum-design). Tipo implement.
- Alcance: CRUD de tributación (CompetencyAlignment) por competencia, grilla competencia×nivel, panel lateral, resolver gobernado R-1..R-5/R-10, capabilities por operación, paridad de escritura.
- Plan: 4 sesiones, 32 tasks, 18 REQ. Spec aprobado (0 hallazgos). S1 (backend) y S2 (frontend) con gate aprobado. Falta la sesión con gate de sync (materialización backend).

## Lo verificado (evidencia real, no autoreporte)

- Gates de S1 y S2 aprobados con verificación REAL: typecheck pass, 3974 tests pass / 0 fail. El gate ejecutó la suite.
- 18 REQ mapeados a test cases, 0 huérfanos. Archivos de tributación 96-99% líneas.
- Entrega incremental, mod-only, regresión verde, vue-tsc/eslint limpios por run.
- El gate atrapó la divergencia autoreporte↔verificación real en S1 (5 rojos, reclasificados preexistentes: profileBaselineEquivalence, drift RBAC UPONE-1615).
- Delete/R-1 CONFIRMADO leyendo el resolver en la rama del ticket (feat/UPONE-1756-...): deleteCompetencyAlignment corre R-1 (assertActiveAdoption, mismo helper que create/move) dentro de la transacción y ANTES de borrar (logic/competencyAlignment.resolver.js:309), con el seam de UPONE-1772 documentado. El código YA está alineado a la decisión; el estado "delete sin R-1, pendiente PM" era del run S1.T3.8 y quedó superado.

## Ajustes aplicados (para que NO sean conflicto al cerrar)

Los dos hallazgos que el gate de S1 dejó abiertos ya tenían decisión tomada por el equipo (discoveries en sp10). Se fijaron en el ticket como adendas al request (append-only, DET-3; el pedido original quedó intacto), de modo que el criterio de cierre queda alineado y el gate final no los levanta como incumplimiento:

- Adenda (delete/R-1): el retiro EXIGE R-1 en 1756 (alineado REQ-10/TC-REQ-10-5). REQ-09 "delete simple, sin aviso de dependencias" = sin aviso R-7, no "sin reglas": no hay contradicción. El aviso R-7 y la relajación de R-1 para limpiar huérfanas se DIFIEREN a UPONE-1772 (seam marcado en deleteCompetencyAlignment). CONFIRMADO en código (resolver.js:309). Referencia: Discovery-1756-UPONE-1772.
- Adenda (REQ-10/MCP): REQ-10 se cumple por la vía GOBERNADA (UI/API/resolver Validated). La vía CRUD generic del core (MCP up1) saltea el resolver; cerrarla es core/plataforma, fuera del alcance mod-only → deuda aceptada → Core Extension / UPONE-1771. Los TC de REQ-10 por la vía MCP se re-encuadran como documentación del gap (grupo GAP en competencyAlignmentParity.test.js). Referencia: Discovery-1756-gap-MCP-friendly.

Con esto, delete/R-1 y REQ-10 dejan de ser decisiones pendientes; pasan a ser criterios de cierre verificables (delete rechaza sin adopción vigente; paridad por vía gobernada) más deuda trackeada (1772/1771).

## Checklist de cierre (solo ejecución, cuando toque cerrar)

1. Materialización backend (gate de sync): correr sync + codegen + db push del object-manager para materializar la columna planId, la unique de respaldo de R-2, capabilities/roles y schema. Hoy S1 corre sobre mocks de prisma; ninguna regla está validada contra el esquema real. Es el bloqueante concreto para pasar a "listo para cerrar". Verificar contra el esquema real (posibles sorpresas: nullable de planId, índice, unique de R-2, derivación cross-tenant).
2. R-1 del delete CONFIRMADO en código (assertActiveAdoption antes de borrar, resolver.js:309, con seam de 1772). Resta solo verificar el suite del retiro (incl. TC-REQ-10-5: retirar sin adopción vigente se rechaza) contra el esquema REAL en el gate de sync; hoy corre sobre mocks de prisma.
3. Re-encuadrar el grupo GAP de competencyAlignmentParity.test.js como documentación de deuda (no paridad lograda), consistente con la adenda de REQ-10.
4. Vuelco verificado (DET-25): promover los 18 REQ×test cases (hoy pending) a pass contra el reporter real en el gate final.
5. Cobertura: reportar acotada al scope (96-99% en archivos de tributación), no el 10.09% global (dilución del repo; piso 10 para mods Vue).
6. Backlog lifecycle: confirmar que no queda trabajo must/should pendiente además de las deudas ya trackeadas (1772/1771).

## Notas de proceso

- Churn de planificación: 3 rebotes del spec-judge (19, 23, 13 hallazgos) y varias re-siembras (19→25→48→32 tasks) antes de aprobar. Patrón que motivó severidad + tope de rondas; un ticket nuevo debería iterar menos.
- Telemetría ciega: runs con 0 tokens y modelo "desconocido" (instrumentación del path subagente aún no deployada; se corrige al reiniciar el MCP).

## Veredicto

Ejecución y calidad correctas (gates verdes con verificación real). Las decisiones que podían chocar en el cierre ya están fijadas por adenda y el delete/R-1 está confirmado en código (delete=R-1→seam 1772; REQ-10=vía gobernada, MCP deuda→1771). Lo único que resta para cerrar es EJECUCIÓN: la materialización backend (gate de sync) y verificar el suite contra el esquema real, más el checklist de arriba. No cerrar sobre mocks.

## Contexto relacionado (evidencias en sp10)

Este análisis confirma evidencias ya registradas.

Alcance y diseño:
- sp10/UPONE-1756-pre-intake.md — pre-intake
- sp10/UPONE-1756-detalle.md, sp10/UPONE-1756-detalle-po.md, sp10/UPONE-1756-detalle-tecnico.md — detalle
- sp10/Tributacion-CompetencyAlignment-detalle-tecnico-reglas-y-particion-UPONE-1756-17.md — reglas R-1..R-5 y partición
- sp10/UPONE-1756-alcance-sp10.md, sp10/UPONE-1756-alcance-sp10-delta.md — alcance
- sp10/UPONE-1756-migracion-niveles.md — migración de niveles
- sp10/UPONE-1756-explicativo.html, sp10/UPONE-1756-plan-po.html, sp10/UPONE-1756-maqueta-slice.html — explicativo/maqueta
- sp10/UPONE-1756-followup.md, -followup-delta.md, -followup-delta-2.md — follow-ups

Decisiones que respaldan las adendas:
- sp10/Discovery-1756-UPONE-1772-retiro-de-tributacion-y-R-1-limpieza-de-huerfanas.md — delete exige R-1 en 1756; relajación y R-7 → UPONE-1772.
- sp10/Discovery-1756-gap-MCP-friendly-CRUD-generic-saltea-el-resolver-gobernado-deuda-.md — gap MCP como deuda aceptada → Core Extension / UPONE-1771.
- sp10/Fix-baseline-RBAC-UPONE-1615-descubierto-en-1756-cambio-aduana-y-ticket-propuest.md — los 5 rojos de S1 (drift RBAC 1615).

Hermanos/dependencias en sp10: UPONE-1753 (rename coverageLevelId/CoverageScheme; 1756 usa developmentLevelId), UPONE-1755 (indicadores derivados), UPONE-1758, UPONE-1769.
