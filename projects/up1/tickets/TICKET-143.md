---
id: TICKET-143
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1756
module: curriculum-mapping
autopilot: autonomous
---

## Request

**CRUD de tributación por competencia (grilla).** Como responsable curricular, asignar, ver, editar, mover y retirar la tributación de asignaturas contra competencias en una grilla competencia × nivel, sobre una matriz ya adoptada, con escritura gobernada.

### Escritura por operación
Cada asignar/editar/mover/retirar persiste al instante por el resolver gobernado. Sin barra global "Guardar/Descartar" del mapa (esa UX de conjunto transaccional es UPONE-1770); divergencia consciente de la maqueta.

### Reglas server-side
- R-1: adopción vigente de la matriz para el plan del planEntry.
- R-2: el par (asignatura, competencia) es único.
- R-3: un nodo que consolida no es destino (destino válido = `sinHijos OR isHolistic`, "sin hijos" derivado del árbol; invariante: nodo con `isHolistic=false` y cero hijos es inválido).
- R-4: el nivel debe ser uno de los declarados por la competencia (contra CompetencyNodeDevelopmentLevel).
- R-5: `contributionType` obligatorio, default `Develops`.
- R-10: mover una tributación actualiza la fila, nunca crea una segunda.

### Modelo
- Agregar `planId` (denormalizado, derivado de `planEntry.planId`) a CompetencyAlignment.
- Capabilities `competencyalignment:view/create/modify/delete` cableadas a los 4 roles curriculares.
- CompetencyNodeDevelopmentLevel y MatrixAdoption ya existen.

### Vistas (maqueta 2197e9c9)
- Tab "Tributación" en la vista del plan, visible tras adoptar matriz.
- Selector de matriz con estados vacíos: "Este plan no ha adoptado ninguna matriz de competencia" / "Elige una matriz de competencia arriba para empezar a tributar".
- Grilla competencia × nivel; ficha CODIGO/NIVEL/CONTRIBUCION; panel de detalle.
- Indicador "Solo lectura" según permiso.

### Fuera de alcance
- Pesos / `contributionPercentage`, upsert de conjunto y barra Guardar, malla y vía masiva, indicadores, versionado (R-8), outcomeAlignment / R-7, migración de datos.
- Rename destructivo `coverageLevelId`/`CoverageScheme` (va en UPONE-1769).
- Gestión de adopción (Eximir/Cerrar, "Planes que adoptan") y panel de Medición: contexto de solo lectura, no se construyen.

### Frontera
`todo-mod-only`: objeto, resolver, capabilities y tabla de unión del mod curriculum-mapping; el tab se agrega en curriculum-design/config/layouts/default_Curriculum_view.json (patrón requiredCapability existente); el componente vive en curriculum-mapping/modsComponents/. Sin Core Extension.

### Deuda explícita
El retiro es delete simple, seguro solo mientras F6 (outcomeAlignment) no exista. Al entrar UPONE-1772 el retiro gana el aviso R-7 (nombrar los resultados de aprendizaje dependientes antes de borrar). No cerrar el retiro como definitivo sin esa salvaguarda.

## Adendas al request

### Adenda 1 - 2026-09-04 - Eduardo Bacon

ALCANCE EFECTIVO — corrección de interacción y criterio MCP. Fuente autorizada: maqueta 2197e9c9 (autoridad visual). Esta adenda SUPERSEDE el punto "Vistas" del request original donde difiera.

MODELO DE INTERACCIÓN (fiel a la maqueta; NO hay drag):
- Panel lateral "Asignaturas del plan": lista los planEntry del plan (código + nombre) con su contador de tributaciones (badge "1 TRIBUTACIÓN(ES)" / "SIN TRIBUTAR"), búsqueda y filtros "Todas / Con tributación / Sin tributar". Se selecciona una asignatura "EN MANO". La lista sale de los planEntry del plan (mismo origen que la malla), no es inventada.
- Asignar/mover: con la asignatura en mano, "+ Asignar acá" en la celda (competencia × nivel de desarrollo). Si ya estaba en otra celda de esa competencia, se MUEVE (R-10: actualiza la fila, no crea otra). SIN arrastrar ni asa de arrastre; el mecanismo es selección lateral + click en la celda.
- Columnas = niveles de desarrollo declarados por la competencia (p.ej. Introduce / Reinforce / Master), leídos de CompetencyNodeDevelopmentLevel. Cada celda muestra chips de las tributaciones asignadas (× para quitar) y un "+ Asignar acá". El chip es la vista compacta y expone su nivel y contribución en el aria-label, con formato "Ver detalle de <competencia> en <código>: <contribución>, nivel <nivel>".
- Expandir/contraer una competencia abre su TABLA DE DETALLE (columnas: Código, Asignatura, Período, Cobertura, Contribución), donde Cobertura=developmentLevel y Contribución=contributionType son editables por fila. NO existe un panel/drawer de detalle separado por tributación (el detalle vive en la tabla + el aria-label del chip).
- Escritura POR OPERACIÓN: cada asignar/editar/mover/retirar persiste al instante por el resolver gobernado; NO hay barra global "Guardar/Descartar" ni aviso de "cambios sin guardar".

VISIBILIDAD DEL TAB (resuelve la contradicción tab vs estado vacío): el tab "Tributación" se muestra con la capability competencyalignment:view (gate por capability), NO condicionado a que exista adopción. Si el plan NO tiene matriz adoptada, DENTRO del tab se muestra el estado vacío literal "Este plan no ha adoptado ninguna matriz de competencia". Si hay adopción pero ninguna matriz seleccionada: "Elige una matriz de competencia arriba para empezar a tributar".

CRITERIO MCP-FRIENDLY (DoD transversal del sprint): toda la lógica de negocio y las reglas R-1 a R-5 y R-10 viven en el RESOLVER GOBERNADO server-side (mutaciones *Validated), no en el cliente. Cualquier vía de escritura — UI, API o el MCP de up1 — pasa por el MISMO resolver y las MISMAS reglas; ninguna via puede saltarlas. El objeto CompetencyAlignment y su CRUD gobernado quedan operables y consistentes desde el MCP de up1 (crear/leer/editar/mover/retirar por servicio, no solo por pantalla). La UI (indicador "Solo lectura", celdas que no ofrecen asignar por R-3) es conveniencia; la autoridad es server-side. Acceptance: una escritura inválida por R-1..R-5/R-10 se rechaza igual viniendo por MCP que por UI.

FUERA DE ALCANCE (verificado contra tickets futuros): Peso/contributionPercentage, vía masiva "Varias" y el guardado de conjunto (barra Guardar/Descartar + aviso de cambios) → UPONE-1770; indicador "SIN EVALUADOR" (competencias con evaluador) → UPONE-1771; outcomeAlignment y retiro con aviso R-7 → UPONE-1772; migración de niveles de matrices existentes → UPONE-1773; rename coverageLevelId/CoverageScheme → UPONE-1769.

**Motivo**: El intake, al contrastar con la maqueta 2197e9c9, descubrió que el request necesitaba precisar el modelo de interacción, resolver la visibilidad del tab, explicitar el criterio MCP-friendly y las exclusiones de alcance. El request original queda intacto (DET-3); esta adenda es el alcance efectivo donde difiera.

### Adenda 2 - 2026-09-04 - Eduardo Bacon

ACLARACIÓN DE NOTACIÓN (supersede la notación con ángulos de la Adenda 1; no cambia el comportamiento). El aria-label del chip de tributación nombra la competencia, el código de la asignatura, la contribución y el nivel. Su formato se ESPECIFICA E ILUSTRA con este ejemplo literal, sin marcadores: "Ver detalle de Pensamiento crítico en MAT101: Develops, nivel Reinforce". IMPORTANTE para redactar el spec: NO usar marcadores entre ángulos (nada de tokens tipo ángulo-abre palabra ángulo-cierra) en ningún REQ, task ni test case; describir los campos en prosa y con el ejemplo literal. El spec debe quedar completamente libre de tokens entre ángulos.

**Motivo**: Aclaración de notación: la Adenda 1 escribió el formato del aria-label con marcadores entre ángulos, que el gate de aprobación toma como placeholders sin resolver. Se especifica con un ejemplo literal para que el spec quede libre de tokens entre ángulos. No cambia el comportamiento.

### Adenda 3 - 2026-09-04 - Eduardo Bacon

ACTUALIZACIÓN DE FRONTERA (supersede el "único archivo" de REQ-15 en cuanto a curriculum-design). 1756 sigue siendo todo-mod-only, pero toca DOS archivos de curriculum-design (no uno):
1. config/layouts/default_Curriculum_view.json (el tab "Tributación").
2. tests/unit/profileBaselineEquivalence.test.js (gate de preservación RBAC cross-mod): 1756 agrega las capabilities competencyalignment:view/create/modify/delete a los roles curriculares (SoD), y ese gate las cacharía como "added inesperado"; por eso 1756 debe ampliar su allowed-list per-rol (ALLOWED_ADDED_SOD_BY_ROLE) para admitir SUS PROPIAS caps. Es parte legítima del cambio de RBAC de 1756.

Queda FUERA de 1756 (governance, no mod): el snapshot baseline docs/rbac/baseline-caps-2026-09-02.json de la raíz del superrepo. El fold de competencynodedevelopmentlevel:view (drift preexistente de UPONE-1615) y el ciclo de vida/versionado del baseline son un ticket de governance RBAC / core-extension aparte (ver KB sp10: "Fix baseline RBAC (UPONE-1615)..."). El rojo que quede en el gate de preservación por competencynodedevelopmentlevel:view es de 1615, ajeno a 1756.

Núcleo del mod intacto: objeto, resolver, capabilities y tabla de unión siguen en curriculum-mapping; sin Core Extension desde 1756.

**Motivo**: Descubierto en ejecución: 1756 agrega caps competencyalignment:* a los roles curriculares, lo que rompe el gate de preservación RBAC de curriculum-design. Acomodar esas caps propias en ese test es parte legítima de 1756, así que su frontera en curriculum-design pasa de 1 a 2 archivos.

### Adenda 4 - 2026-09-05 - Análisis de estado (Kanai)

Retiro (delete) de tributación en 1756: EXIGE R-1 (adopción vigente), alineado con REQ-10 / TC-REQ-10-5. Aclaración de la aparente contradicción REQ-09 vs REQ-10: "delete simple, sin aviso de dependencias" (REQ-09) se refiere a NO ejecutar el aviso R-7 de dependientes, no a omitir R-1. El aviso R-7 (outcomeAlignment) y la relajación de R-1 para permitir limpiar tributaciones huérfanas cuando la adopción del plan para esa matriz ya no está vigente se DIFIEREN a UPONE-1772 (seam ya marcado en deleteCompetencyAlignment). Criterio de cierre de 1756: el retiro debe rechazar por R-1 sin adopción vigente (TC-REQ-10-5) y dejar el seam de 1772; NO se exige el aviso R-7 ni la limpieza de huérfanas en 1756.

**Motivo**: Ambigüedad REQ-09 vs REQ-10 sobre R-1 en el retiro, detectada en el gate de S1; decisión ya tomada en 1756 (discovery UPONE-1772). Se fija para que no bloquee el cierre.

### Adenda 5 - 2026-09-05 - Análisis de estado (Kanai)

Alcance de REQ-10 (paridad de escritura) en 1756: se cumple por la VÍA GOBERNADA del mod (UI, API y el resolver *Validated con R-1..R-5/R-10 + derivación server-side de planId). La vía CRUD generic del core (MCP de up1: up1_create_object/up1_update_object -> createInstance/updateInstance) SALTEA el resolver gobernado (gateada solo por capability object-level); bloquear esa vía es core/plataforma, FUERA del alcance mod-only de 1756. Queda como DEUDA ACEPTADA -> Core Extension / gobierno cross-mod (UPONE-1771). Mitigación vigente: no otorgar caps de escritura de CompetencyAlignment fuera de los roles curriculares previstos. Los casos de REQ-10 relativos a la vía MCP se re-encuadran como documentación del gap (grupo 'GAP' en competencyAlignmentParity.test.js), no como paridad lograda. Criterio de cierre de 1756: paridad verificada por la vía gobernada; la vía generic queda documentada como deuda con su ticket de plataforma, no se exige su bloqueo en 1756.

**Motivo**: REQ-10 mod-only no puede forzar la vía CRUD generic del core; deuda aceptada por el equipo (discovery gap MCP). Se acota para que el gate de cierre no exija enforcement cross-mod fuera de alcance.

### Adenda 6 - 2026-09-07 - Eduardo Bacon

ALCANCE EFECTIVO - fidelidad de la vista con la maqueta (revision visual humana). Fuente: maqueta-diseno-curricular.html (autoridad de diseno). Ajusta el modelo de interaccion y el alcance de resumen; el resto del corte 1756 sigue igual. Estas decisiones fijan que entra en 1756 (S7) y que queda en 1770/1771.

1. MODAL DE TRIBUTACION (supersede el punto del detalle de la Adenda 1). Al hacer click en un badge/chip de tributacion se abre un MODAL con las alternativas de esa tributacion: Nivel de desarrollo (solo los que la competencia declara, R-4), Tipo de contribucion (Desarrolla/Evalua/Ambas, R-5) y "Retirar tributacion" (R-3/R-1), con boton "Listo". Reemplaza la "tabla expandible por competencia, sin drawer/modal" que fijaba la Adenda 1 (esa decision queda superseded). El Peso/reparto (contributionPercentage) NO entra en el modal de 1756: sigue en UPONE-1770.

2. RESUMEN DE COBERTURA (pull ACOTADO desde 1771). La vista incluye 3 tarjetas de resumen arriba: "Desarrollo tributado" (N de M niveles declarados), "Competencias con evaluador" (Evaluates/Both, N de M) y "Asignaturas sin tributar" (N de M), cada una con su texto de ayuda. La tarjeta "Fuera del diseno (fila marcada, R-12)", el resto del dashboard de indicadores y el versionado del plan (R-8) SIGUEN en UPONE-1771.

3. GLOSARIO / LEYENDA. La vista muestra la leyenda de Nivel de desarrollo (Introduce / Reinforce / Master) y de Tipo de contribucion (Desarrolla / Evalua / Ambas).

4. MODO VER / EDITAR (integracion up1). La vista respeta el modo de la vista de up1: en modo VER es de solo lectura (no ofrece asignar/mover/editar/retirar); en modo EDITAR habilita esas acciones. Es DISTINTO del indicador "Solo lectura" por capability (REQ-17): aquel es por permiso del usuario, este por el modo (ver/editar) de la vista.

Motivo: revision visual de la vista contra la maqueta. Se detecto que la vista entregada no reproduce el resumen (3 tarjetas), el glosario, el modo ver/editar de up1 ni el modal de tributacion al click en el badge. El request original queda intacto (DET-3); esta adenda es el alcance efectivo donde difiera, y mantiene la frontera con 1770 (peso/reparto) y 1771 (R-12, dashboard, versionado).

### Adenda 7 - 2026-09-07 - Eduardo Bacon

ALCANCE EFECTIVO - fidelidad visual e integracion con up1 (formaliza pedidos de la revision visual humana). Respalda REQ-F9 y REQ-F10.

1. LOOK AND FEEL INTEGRADO CON UP1 (REQ-F9). La vista de Tributacion debe verse NATIVA de la plataforma, no plana ni ajena: tipografia, espaciado, tarjetas, superficies, badges y componentes alineados con up1, tomando como referencia la maqueta (maqueta-diseno-curricular.html) Y el look ya aplicado en la Malla del plan de estudios (CurriculumMesh de curriculum-design). Incluye: chips con badges compactos de nivel (I/R/M) y de contribucion (D/E/A) coherentes con el glosario; cards sin sombra flotante (solo borde, como la Malla); indicador de modo tipo pill; jerarquia tipografica de los valores de resumen. Es integracion visual, no cambia comportamiento. Es mod-only (estilos del componente); no extiende core.

2. BUG DE ALINEACION DE LA GRILLA (REQ-F10). Al apilar varias tributaciones en una celda, esa celda crece pero las celdas del mismo nivel/fila no, quedando desalineadas. La fila debe mantener alto uniforme.

Motivo: en la revision visual de la vista contra la maqueta, el usuario detecto que la vista quedaba demasiado simple/plana y lejos del look de up1, y que la grilla se desalineaba al apilar cursos. Se formalizan como alcance efectivo (REQ-F9 look and feel, REQ-F10 alto de fila) para respaldar su trazabilidad; el request original queda intacto (DET-3). La fidelidad visual final la verifica la revision humana (S8).
