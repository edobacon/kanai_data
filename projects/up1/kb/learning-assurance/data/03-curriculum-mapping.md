---
id: SPEC-learning-assurance-003
project: up1
type: spec
module: learning-assurance
category: data
tags: [up1, learning-assurance, curriculum-mapping, capacidades, competencias, matrices, niveles, perfil-egreso, tributacion, heatmap, ia]
fecha: 2026-04-10
confluence_id: "1987674175"
confluence_url: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1987674175
autor: Esteban Cortes
---
# Curriculum Mapping

**Navegación:** [Learning Assurance](https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1990066183) → Curriculum Mapping

## Áreas funcionales

| Área | Capacidades |
| --- | --- |
| 2.1 Matrices de competencias | CAP-MAP-001 a CAP-MAP-007 |
| 2.2 Esquemas de niveles de logro | CAP-MAP-008 a CAP-MAP-011 |
| 2.3 Perfil de egreso | CAP-MAP-012 a CAP-MAP-014 |
| 2.4 Tributación (mapeo curricular) | CAP-MAP-015 a CAP-MAP-020 |
| 2.5 IA | CAP-MAP-021 a CAP-MAP-023 |

---

## 2.1 Matrices de competencias

### CAP-MAP-001: Crear matriz de competencias

**Actores:** Coordinador Académico, Director de Programa | **Prioridad:** Must

Crear un marco de competencias asociado a un programa específico o transversal a toda la institución. Define el conjunto de competencias que los egresados deben desarrollar. Cada matriz se vincula a un esquema de niveles de logro.

**Reglas de negocio:**

* La combinación de código y versión debe ser única por institución
* Una matriz de alcance institucional no se asocia a un programa específico; una de alcance de programa sí
* Debe asociarse a un esquema de niveles (CAP-MAP-008)
* Ver: BR-WKF-001

**Resultado esperado:** Matriz creada en estado Borrador

**Relacionado:** CAP-MAP-008

### CAP-MAP-002: Organizar competencias jerárquicamente

**Actores:** Coordinador Académico | **Prioridad:** Must

Agregar competencias a la matriz y organizarlas en estructura de árbol (competencia general → sub-competencias). Cada competencia tiene un tipo, y puede marcarse como holística si integra múltiples sub-competencias transversalmente.

**Reglas de negocio:**

* El código de cada competencia debe ser único dentro de la matriz
* La jerarquía no tiene límite de profundidad
* Una competencia holística integra múltiples sub-competencias de forma transversal

**Resultado esperado:** Competencias organizadas en árbol

**Relacionado:** CAP-MAP-001

### CAP-MAP-003: Clasificar competencias por tipo

**Actores:** Coordinador Académico | **Prioridad:** Must

Asignar un tipo a cada competencia del catálogo configurable por institución (genérica, específica, disciplinar, u otros definidos por la institución).

**Reglas de negocio:**

* Los tipos de competencia incluyen defaults de plataforma (Genérica, Específica, Disciplinar) más los que la institución defina

**Resultado esperado:** Competencias clasificadas

**Relacionado:** CAP-MAP-002

### CAP-MAP-004: Definir alcance de competencias

**Actores:** Coordinador Académico | **Prioridad:** Could

Vincular competencias a definiciones de alcance que determinan en qué contextos aplica cada competencia.

**Relacionado:** CAP-MAP-002

### CAP-MAP-005: Registrar equivalencias entre competencias

**Actores:** Coordinador Académico | **Prioridad:** Should

Marcar equivalencias entre competencias de distintas matrices (ej: la competencia CG-01 de la matriz 2024 es equivalente a CG-01 de la matriz 2020). Útil para migración entre versiones de matrices.

**Reglas de negocio:**

* La equivalencia es bidireccional
* Las competencias pueden ser de matrices distintas

**Resultado esperado:** Equivalencias registradas

**Relacionado:** CAP-MAP-002

### CAP-MAP-006: Asociar matrices a planes de estudio

**Actores:** Coordinador Académico | **Prioridad:** Must

Vincular una matriz de competencias a uno o más planes de estudio (relación muchos a muchos). Una matriz institucional puede aplicar a múltiples planes; un plan puede usar múltiples matrices.

**Reglas de negocio:**

* Al menos una matriz debe estar asociada a un plan para poder definir perfil de egreso

**Resultado esperado:** Asociación registrada

**Relacionado:** CAP-MAP-001, CAP-CUR-001

### CAP-MAP-007: Gestionar workflow de la matriz

**Actores:** Coordinador, Director, Comité | **Prioridad:** Must

Transicionar la matriz entre estados (Borrador → Verificación → Publicada → Abierta a edición).

**Reglas de negocio:**

* Una matriz publicada no puede editarse directamente; debe transicionar a "Abierta a edición" primero
* Ver: BR-WKF-001, BR-WKF-002

**Resultado esperado:** Matriz en nuevo estado

**Relacionado:** CAP-MAP-001

---

## 2.2 Esquemas de niveles de logro

### CAP-MAP-008: Crear esquema de niveles

**Actores:** Super Admin, Coordinador Académico | **Prioridad:** Must

Definir un esquema de niveles de logro que será usado por una o más matrices. Cada institución puede tener múltiples esquemas (ej: "3 niveles básico", "5 niveles detallado"). El esquema puede ser cualitativo (niveles ordinales) o cuantitativo (con umbrales numéricos).

**Reglas de negocio:**

* Existe un esquema default de plataforma (3 niveles: Introductorio, En Desarrollo, Dominio) que no puede ser modificado por la institución
* La institución puede crear esquemas custom adicionales
* Solo un esquema puede estar marcado como default por institución

**Resultado esperado:** Esquema creado

### CAP-MAP-009: Definir niveles dentro del esquema

**Actores:** Super Admin, Coordinador Académico | **Prioridad:** Must

Agregar niveles al esquema (ej: Introductorio → En Desarrollo → Dominio). Cada nivel tiene código, nombre, descripción, peso numérico y orden.

**Reglas de negocio:**

* El código debe ser único dentro del esquema
* El peso numérico permite cálculos y ordenamiento
* Al menos 2 niveles por esquema

**Resultado esperado:** Niveles definidos y ordenados

**Relacionado:** CAP-MAP-008

### CAP-MAP-010: Configurar umbrales cuantitativos por nivel

**Actores:** Super Admin | **Prioridad:** Should

Para esquemas cuantitativos, definir rangos numéricos (min/max) que determinan cuándo un estudiante alcanza cada nivel. Cada rango puede marcarse como "logro alcanzado" o no.

**Reglas de negocio:**

* Solo aplicable cuando el esquema es de modo cuantitativo
* Los rangos no deben solaparse dentro del mismo nivel

**Resultado esperado:** Umbrales configurados

**Relacionado:** CAP-MAP-009

### CAP-MAP-011: Definir criterios cualitativos por nivel

**Actores:** Coordinador Académico | **Prioridad:** Should

Para esquemas cualitativos, definir criterios observables que describen evidencias de logro de cada nivel (ej: "Identifica variables relevantes", "Propone soluciones fundamentadas").

**Reglas de negocio:**

* El código del criterio debe ser único dentro del nivel
* Los criterios son descriptivos, no evaluativos

**Resultado esperado:** Criterios definidos

**Relacionado:** CAP-MAP-009

---

## 2.3 Perfil de egreso

### CAP-MAP-012: Declarar perfil de egreso del plan

**Actores:** Coordinador Académico, Director de Programa | **Prioridad:** Must

Crear la declaración formal de qué competencias y a qué nivel debe alcanzar un egresado del programa. El perfil de egreso es el "contrato" entre la institución y el estudiante: lo que se promete al ingresar.

**Reglas de negocio:**

* Un plan de estudios tiene exactamente un perfil de egreso (relación uno a uno)
* Requiere al menos una matriz de competencias asociada al plan (CAP-MAP-006)
* Ver: BR-WKF-001

**Resultado esperado:** Perfil de egreso creado en estado Borrador

**Relacionado:** CAP-MAP-006, CAP-CUR-001

### CAP-MAP-013: Asignar competencias al perfil de egreso

**Actores:** Coordinador Académico | **Prioridad:** Must

Seleccionar qué competencias de las matrices asociadas forman parte del perfil de egreso, definir el nivel esperado al egreso y el peso relativo de cada una.

**Reglas de negocio:**

* Cada competencia puede aparecer solo una vez en el perfil
* El nivel esperado debe pertenecer al esquema de niveles de la matriz
* Los pesos (si se usan) deben sumar 100%

**Resultado esperado:** Competencias asignadas con nivel esperado y peso

**Relacionado:** CAP-MAP-012, CAP-MAP-002

### CAP-MAP-014: Gestionar workflow del perfil de egreso

**Actores:** Coordinador, Director, Comité | **Prioridad:** Must

Transicionar el perfil de egreso entre estados del workflow.

**Reglas de negocio:**

* Ver: BR-WKF-001, BR-WKF-002

**Resultado esperado:** Perfil en nuevo estado

**Relacionado:** CAP-MAP-012

---

## 2.4 Tributación (mapeo curricular)

### CAP-MAP-015: Mapear curso a competencia (tributación)

**Actores:** Coordinador Académico | **Prioridad:** Must

Para cada curso del plan de estudios, definir a qué competencias del perfil contribuye, a qué nivel, con qué intensidad de alineamiento, y con qué tipo de contribución. Es el corazón del mapeo curricular.

**Reglas de negocio:**

* Un curso solo puede tributar una vez a cada competencia del perfil
* El nivel de contribución debe pertenecer al esquema de niveles de la matriz
* La intensidad de alineamiento es una dimensión independiente del nivel (ninguno, bajo, medio, alto)
* Cada tributación puede incluir una justificación textual
* El tipo de contribución indica si el curso desarrolla la competencia (la enseña/trabaja), la evalúa (mide logro), o ambas. Valores: DEVELOPS, ASSESSES, BOTH
* El tipo de contribución puede asignarse manualmente por el coordinador o inferirse automáticamente por el sistema (si el curso tiene evaluaciones vinculadas a resultados de aprendizaje que tributan a la competencia → ASSESSES; si no → DEVELOPS). Un parámetro institucional (configurable desde el módulo de configuraciones de uP1) determina el modo: manual, automático, o automático con override manual

**Resultado esperado:** Tributación registrada con nivel, intensidad y tipo de contribución

**Relacionado:** CAP-MAP-013, CAP-CUR-003

### CAP-MAP-016: Vincular resultados de aprendizaje a niveles de competencia

**Actores:** Coordinador Académico | **Prioridad:** Must

Especificar qué resultados de aprendizaje de un curso evidencian qué nivel de competencia. Es el detalle fino del mapeo: no solo "este curso tributa a esta competencia", sino "este resultado de aprendizaje específico evidencia este nivel".

**Reglas de negocio:**

* La combinación de nivel y resultado de aprendizaje debe ser única
* El resultado de aprendizaje debe pertenecer a un curso que tributa a la competencia del nivel

**Resultado esperado:** Vínculo resultado↔nivel registrado

**Relacionado:** CAP-MAP-015, CAP-CUR-015

### CAP-MAP-017: Vincular temas del syllabus a competencias

**Actores:** Docente, Coordinador | **Prioridad:** Should

Trazar qué temas/subtemas del contenido del syllabus contribuyen a desarrollar qué competencias. Trazabilidad granular contenido→competencia. El docente solo puede vincular temas a competencias que ya están tributadas al curso del syllabus (via CAP-MAP-015), no a cualquier competencia de la matriz.

**Reglas de negocio:**

* Vinculación opcional pero recomendada
* Un tema puede vincularse a múltiples competencias
* Las competencias disponibles para vincular son exclusivamente las que el curso ya tiene tributadas via CAP-MAP-015

**Resultado esperado:** Trazabilidad contenido→competencia registrada

**Relacionado:** CAP-CUR-025, CAP-MAP-015

### CAP-MAP-018: Visualizar heatmap de cobertura curricular

**Actores:** Coordinador, Director, Equipo de Acreditación | **Prioridad:** Must

Generar una visualización matricial (heatmap) de curso × competencia mostrando la tributación completa del plan: qué cursos contribuyen a qué competencias, a qué nivel, con qué intensidad y con qué tipo de contribución (desarrolla/evalúa). Incluye vista tabulada con conteo de asignaturas por competencia y créditos asociados.

**Reglas de negocio:**

* El heatmap muestra brechas (competencias sin cobertura) de forma destacada
* Permite filtrar por: campus, facultad, programa, plan, periodo, tipo de curso, nivel de competencia, tipo de competencia (genérica/específica), tipo de contribución (desarrolla/evalúa)
* Vista tabulada alternativa con conteo de asignaturas por competencia, desglose de créditos y métricas agregadas

**Resultado esperado:** Heatmap interactivo + vista tabulada con filtros

**Relacionado:** CAP-MAP-015

### CAP-MAP-019: Detectar brechas y solapamientos

**Actores:** Coordinador, Director | **Prioridad:** Should

Identificar automáticamente: competencias del perfil que no están cubiertas por ningún curso (brecha), competencias cubiertas solo a nivel superficial (cobertura insuficiente), y competencias donde múltiples cursos cubren el mismo nivel sin progresión (solapamiento).

**Reglas de negocio:**

* Brecha = competencia del perfil sin ninguna tributación
* Cobertura insuficiente = tributación existente pero sin alcanzar el nivel esperado en el perfil
* Solapamiento = múltiples cursos al mismo nivel sin progresión evidente

**Resultado esperado:** Reporte de brechas y solapamientos

**Relacionado:** CAP-MAP-015, CAP-MAP-013

### CAP-MAP-020: Configurar modos de calificación de la matriz

**Actores:** Coordinador Académico | **Prioridad:** Must

Configurar cómo se evalúa el logro en la matriz: modo formativo (niveles cualitativos), holístico (rúbricas con criterios), u otros modos institucionales.

**Reglas de negocio:**

* El modo determina qué información es relevante (umbrales numéricos vs. criterios cualitativos)

**Resultado esperado:** Modo configurado

**Relacionado:** CAP-MAP-001, CAP-MAP-008

---

## 2.5 Funcionalidades de IA

### CAP-MAP-021: Comparador de planes de estudio

**Actores:** Coordinador, Director | **Prioridad:** Could

Comparar semánticamente dos planes de estudio usando IA. Útil para evaluar convalidaciones entre programas, benchmarking con otras instituciones, o análisis de impacto de reformas curriculares.

**Reglas de negocio:**

* La comparación es un reporte, no una acción automática
* Los resultados se almacenan para consulta posterior

**Resultado esperado:** Reporte de comparación con scores de similitud

**Relacionado:** CAP-CUR-015

### CAP-MAP-022: Analizador de equivalencia de cursos

**Actores:** Coordinador, Registro Académico | **Prioridad:** Could

Buscar cursos semánticamente equivalentes por similitud de resultados de aprendizaje. Útil para decisiones de convalidación. La equivalencia por IA es una sugerencia; la equivalencia administrativa (CAP-CUR-007) es la oficial.

**Reglas de negocio:**

* Los resultados son sugerencias, no decisiones automáticas

**Resultado esperado:** Lista de cursos similares con scores de similitud

**Relacionado:** CAP-CUR-015

### CAP-MAP-023: Sugerencia de estrategias de evaluación

**Actores:** Docente, Coordinador | **Prioridad:** Could

Recibir recomendaciones de métodos de evaluación apropiados para cada competencia y nivel, basadas en mejores prácticas y el catálogo institucional.

**Reglas de negocio:**

* Las sugerencias se basan en el nivel de competencia y el tipo de resultado de aprendizaje
* Son recomendaciones, no imposiciones

**Resultado esperado:** Lista de estrategias sugeridas

**Relacionado:** CAP-MAP-015, CAP-CUR-037

### CAP-MAP-024: Simulador de perfil de egreso (IA)

**Actores:** Coordinador, Director | **Prioridad:** Could

Generar un borrador de perfil de egreso sugerido por IA, analizando los resultados de aprendizaje de los cursos del plan en el contexto de las matrices de competencias y esquemas de niveles disponibles. El simulador propone: qué competencias incluir en el perfil, a qué nivel esperado, y un mapeo preliminar de tributación curso→competencia. Si existe un análisis de cobertura de resultados de aprendizaje previo (CAP-CUR-048 de Curriculum Design), lo utiliza como input enriquecido.

**Reglas de negocio:**

* El borrador es una sugerencia para revisión humana, no se aplica automáticamente
* El borrador generado puede promoverse a un perfil de egreso formal (CAP-MAP-012) tras revisión y ajuste del coordinador
* Requiere al menos una matriz de competencias asociada al plan para operar

**Resultado esperado:** Borrador de perfil de egreso con competencias, niveles y tributación sugerida, listo para revisión humana

**Relacionado:** CAP-MAP-006, CAP-MAP-002, CAP-CUR-015

---

# Versión
