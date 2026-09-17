---
id: DOC-kb-sp10-Tributacion-CompetencyAlignment-detalle-tecnico-reglas-y-particion-UPONE-1756-17
project: up1
type: doc
module: curriculum-mapping
tags:
  - tributacion
  - CompetencyAlignment
  - curriculum-mapping
  - UPONE-1756
  - UPONE-1769
  - sp10
  - reglas-R
---

# Tributación (CompetencyAlignment) - detalle técnico, reglas y partición (UPONE-1756 / 1769)

Feature de tributación en Curriculum Mapping (épica UPONE-1452). Material de consulta consolidado desde el detalle técnico y el plan de partición del PO, verificado contra el modelo de objetos vivo en up1 (institución UPU) y contra el código del mod curriculum-mapping al 2026-09-04.

## Fuentes

- Detalle técnico del cambio: artifact 28f19a04-b7a2-4796-a5be-7a7f579ef3fc (compartido).
- Plan de partición ("Plan de tributacion sp10"): artifact af80b782-c60b-4aa0-a249-811a6bff514b (propiedad del equipo).
- Jira: épica UPONE-1452. Familia de 6 tickets creada por el PM (mapa abajo).
- Working copy de referencia del plan: curriculum-mapping@584499e, curriculum-design@8a151e7.

## Mapa de tickets en Jira (partición 57 SP, techo 13)

| # | Jira | Título | SP | Notas |
|---|---|---|---|---|
| 1 | UPONE-1756 | CRUD por competencia (grilla) | 13 | Este sprint. Asignado a Eduardo. |
| 2 | UPONE-1769 | Cableado del modelo + rename | 8 | Este sprint, en paralelo. Crítica. Asignado a Eduardo. |
| 3 | UPONE-1770 | Pesos eje 1, malla y vía masiva | 13 | Follow-up. Backlog. |
| 4 | UPONE-1771 | Indicadores y versionado del plan | 10 | Follow-up. Backlog. |
| 5 | UPONE-1772 | outcomeAlignment + retiro con aviso (R-7) | 8 | Follow-up. Backlog. Depende de F6. |
| 6 | UPONE-1773 | Migración de niveles de matrices existentes | 5 | Fast-follow. Backlog. Habilita R-4 sobre datos existentes. |

## Objeto CompetencyAlignment

| Campo | Tipo | Estado | Notas |
|---|---|---|---|
| sourceType | enum (planEntry, milestone) | existe | origen polimórfico de la tributación |
| sourceId | FK | existe | referencia a curriculum-design/planEntry |
| competencyNodeId | FK | existe (restringido) | solo nodos con isDirectlyMeasured=true (hoy isHolistic; rename cosmético en 1769) |
| developmentLevelId | FK | existe (label "Coverage Level") | antes coverageLevelId; referencia al catálogo de niveles |
| contributionType | enum (Develops, Evaluates, Both) | existe | obligatorio; nace en Develops (R-5) |
| level | Int | existe | solo para sourceType=milestone |
| contributionPercentage | decimal 0-100 (2 dec) | NUEVO, va en 1769 | peso dentro del grupo de nivel; 1756 no lo usa |
| planId | UUID denormalizado | NUEVO, va en 1756 | derivado de planEntry.planId para optimizar queries |

- Unicidad: [sourceType, sourceId, competencyNodeId].
- Índices: competencyNodeId; developmentLevelId; (sourceType, sourceId); (planId, competencyNodeId, developmentLevelId) [grupo de peso, va en 1769].

## CompetencyNodeDevelopmentLevel (lista blanca N:M)

- Existe y funciona (mod M-28/M-29, 2026-09-03). Campos: competencyNodeId, developmentLevelId, (isRepresentative NUEVO en 1769).
- Subconjunto no vacío de los niveles del esquema; los nodos que consolidan no declaran niveles.
- Con achievementBasis=RepresentativeLevel, exactamente un nivel tiene isRepresentative=true.
- Regla de migración: nodos sin niveles declarados heredan todos los niveles del esquema (ticket UPONE-1773, no el versionado).

## MatrixAdoption

- Existe. Prerrequisito de toda tributación. status Adopted/Exempt, effectiveFrom/effectiveTo, curriculumId. Determina elegibilidad (R-1).

## Grilla (competencia x nivel)

- Filas: competencias. Columnas: niveles de desarrollo. Cada celda es un par declarado (competencia, nivel); contiene las tributaciones (asignaturas + datos de contribución). Solo aparecen competencias con isDirectlyMeasured=true.

## Reglas de validación (server-side, en el resolver)

Las que entran en el CRUD base UPONE-1756: R-1, R-2, R-3, R-4, R-5, R-10.

- R-1: solo se tributan competencias de matrices con adopción vigente para el plan del planEntry (UI en la oferta + resolver en la escritura).
- R-2: el par (asignatura, competencia) es único (constraint existente; la UI bloquea duplicados).
- R-3: un nodo que consolida no es destino de tributación (destino válido = sinHijos OR isHolistic, "sin hijos" derivado del árbol; invariante: nodo con isHolistic=false y cero hijos es inválido).
- R-4: el nivel de desarrollo debe ser uno de los que la competencia declaró (valida contra CompetencyNodeDevelopmentLevel).
- R-5: el tipo de contribución es enum fijo y obligatorio en planEntry; nace en Develops.
- R-10: mover una tributación de nivel actualiza la fila, nunca crea una segunda.

Follow-up (no entran en 1756):

- R-6: solo Evaluates y Both producen evidencia de logro y participan del peso. (UPONE-1770)
- R-7: retirar una tributación que sostiene alineaciones de resultados no se ejecuta en silencio; depende de F6/outcomeAlignment. (UPONE-1772)
- R-8: al versionar el plan la tributación no se replica sola, se elige. (UPONE-1771)
- R-9: contributionPercentage solo se muestra si la institución lo tiene habilitado. (UPONE-1770/1771)
- R-11: todos los criterios de una competencia se evalúan dentro de la asignatura que la tributa.
- R-12: una fila que contradice el diseño se muestra marcada, no se borra sola. (UPONE-1771)

## Frontera core/mod

todo-mod-only (verificado). Objeto, resolver, capabilities y tabla de unión son del mod curriculum-mapping; la pantalla agrega un tab en curriculum-design/config/layouts/default_Curriculum_view.json (patrón requiredCapability existente, precedente CompetencyMatrixShell); el componente vive en curriculum-mapping/modsComponents/. Sin Core Extension.

## Puntos resueltos en código a tener presentes

- Colisión de nombre (RESUELTO en código, decisión N-1 en docs/PLAN-pestana-de-medicion.md): el detalle técnico y 1769 nombran el catálogo como DevelopmentScheme/developmentSchemeId, pero UPONE-1753 (mergeado a develop, 9a0ab38, PR #23) ya lo dejó como DevelopmentLevel/developmentLevelId a propósito, para no reabrir la confusión que 1753 vino a cerrar. AL EJECUTAR 1769: NO reintroducir DevelopmentScheme; alinear el campo nuevo de la Matrix a la convención developmentLevelId. Corregir el texto de 1769, no decidir de nuevo.
- Rename isHolistic -> isDirectlyMeasured: es cosmético frente a R-3 y va en 1769. La razón está documentada (docs/competency-management-proposal.md): isHolistic es estructura del árbol; Holistic es estructura del instrumento (Matrix.defaultRubricModel=Holistic), sin compartir significado. En 1756 se usa isHolistic tal cual.
- El modelo vivo ya muestra developmentLevelId y DevelopmentLevel: parte de 1769 (el rename) podría estar ya mergeado. Verificar sobre qué ref se levanta 1756 y qué del rename queda pendiente.

## Notas hacia adelante para revisar los follow-up (próximo sprint)

Comentarios de review que dejamos y que el plan de partición ya incorporó como decisiones cerradas; verificados contra el código. Anotados por ticket para tenerlos presentes al retomarlos.

- UPONE-1770 (Pesos): estado automático/manual del grupo de peso se DERIVA, no se persiste (grupo automático = todos los pesos iguales dentro de tolerancia). Falso positivo inocuo (repartir a mano en partes iguales se lee como automático; al agregar fila se redistribuye parejo, que es lo expresado). No crear campo ni objeto "grupo": hoy no existe. Estado en el plan: cerrado.
- UPONE-1771 (Indicadores y versionado): DOS notas.
  1. Evento de versionado cross-mod. RIESGO ABIERTO, no darlo por cerrado. El plan lo marca "alternativa A" (curriculum-design dueño del flujo y del evento, lee la capability de curriculum-mapping por RBAC existente), pero el riesgo real es más grande: la decisión de replicar o no es un punto de decisión de UI en el flujo de versionado de Design, condicionado por un permiso de Mapping. Es una dependencia de plataforma (Design tiene que poder leer una capability de Mapping en runtime, no solo un requiredCapability estático de un tab). Tratar la declaración del evento y la lectura de la capability como una sola dependencia.
  2. Herencia de niveles al versionar (aclaración, evitar malentendido al implementar): versionar un plan NO versiona la matriz. Competencias y niveles declarados son de la matriz (institucional, compartida por varios planes). En el remapeo de versionado NO hay herencia de niveles: se remapea sourceId al planEntry equivalente y developmentLevelId se conserva tal cual (la competencia no cambió). Nota: _cloneMap no existe en código.
- UPONE-1773 (Migración de niveles): la regla "hereda todos los niveles (no solo el último)" es de MIGRACIÓN de matrices existentes que hoy no declaran niveles (porque el objeto no existía), NO del versionado. Si se implementa en el versionado (1771) resuelve un no-problema y deja sin resolver el real. Además: sin esta migración, R-4 deja el CRUD de 1756 operando solo sobre matrices nuevas, no las existentes.
