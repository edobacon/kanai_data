---
id: DOC-kb-sp6-README
project: up1
type: doc
---

# SP6 — Análisis del listado base (malla curricular / curriculum-design)

> **Qué es este directorio.** Análisis del listado que nos entregan como base para SP6, cruzado contra (a) lo que SP5 dejó diferido y (b) qué capacidades ya existen en el **core** (object-manager/layout) vs. las que el **mod** `curriculum-design` construyó a mano. El objetivo es detectar **colisiones de alcance**: puntos del listado que, si los implementa el team core de forma genérica, nos obligarían a **migrar/eliminar** implementaciones propias que ya teníamos.
>
> **Fecha:** 2026-07-03.
> **Estado:** análisis previo a reunión — depende de resolver las decisiones abiertas (ver `preguntas-abiertas.md`).
> **Fuentes:** auditoría de código de core y del mod (rutas:línea citadas en `analisis-por-punto.md`), backlog diferido de SP5 (`../sp5/SP6-backlog-diferidos.md`), issues de SP5 (`../sp5/SP5-issues.md`), spec de core `SPEC-core-implement-version-without-workflow` (TICKET-074), y las **notas del Sprint Review SP5** (2026-07-03, `[UP1] Sprint Review - Notes by Gemini.pdf`) — fuente autoritativa de qué construyó core y qué se pospuso a SP6 (ver §4.1).

---

## 1. El listado base (tal como se entrega)

1. **Extensiones a la malla curricular: requisitos de asignatura**
2. **Secciones de datos curriculares configurables en:** Plan de estudio, Syllabus
3. **Extensión del historial de cambios a:** Programa académico, Plan de estudio, Programa de asignatura (actualización), Syllabus
4. **Configuración flujo de trabajo (enums):** Plan de estudio, Programa de asignatura (actualización), Syllabus
5. **Configuración de eliminación (estándar):** Programa académico, Plan de estudio, Programa de asignatura (actualización), Syllabus

## 2. Traducción de términos → objetos reales

| Listado (negocio) | Objeto up1 | Estado hoy |
|---|---|---|
| Programa académico | `AcademicProgram` | Existe; sin workflow ("v1 CRUD plano", `AcademicProgram.json:9`) |
| Plan de estudio | `Curriculum` | Existe; versionado destrabado (TICKET-074), RT atómico + deep-copy aún abiertos |
| Programa de asignatura (actualización) | `activity` (Activity) | Existe; único objeto con workflow + audit cableados hoy |
| Syllabus / Sílabo | **`Offering` (recordType `Syllabus`)** | ✅ Es del mod, distinto del Currículo: un `Activity` (Course) ofertado en un periodo. Ver `logic/syllabus-offering.resolver.js` |

## 3. El listado como matriz (capacidad × objeto)

| Capacidad | Prog. acad. | Plan | Activity-act. | Syllabus |
|---|:---:|:---:|:---:|:---:|
| 1. Requisitos asignatura | — | — | ✔ | — |
| 2. Secciones config | — | ✔ | — | ✔ |
| 3. Historial de cambios | ✔ | ✔ | ✔ | ✔ |
| 4. Flujo de trabajo | — | ✔ | ✔ | ✔ |
| 5. Eliminación estándar | ✔ | ✔ | ✔ | ✔ |

## 4. Cuadro de impacto (core × mod) — el hallazgo central

| Punto | ¿Core lo tiene genérico? | Lo nuestro en el mod | Acoplamiento | Tipo de colisión |
|---|---|---|---|---|
| **1. Requisitos asignatura** | No | `requirement` (SP5) | — | **C — mod puro**, sin colisión |
| **2. Secciones config** | Presentación sí (`layoutConfig.tabs`); motor de secciones complementarias **no** | `CurricularSection` (7 RTs, contenido del sílabo) | Alto | **A — sistema dual de secciones (CAP-CUR-012/012b); no es tabs baratos** |
| **3. Historial de cambios** | **Sí** (`DataLog` + `enableDataLog`; core lo presentó en SR SP5) | `ChangeLog` bespoke (951 líneas + flow n8n + pub/sub) | **ALTO** | **A — migrar; dirección definida (core dueño)** |
| **4. Flujo de trabajo** | **No** (core solo valida valores de enum; no hay motor de transiciones) | `workflow*` (4 objetos + 4 resolvers + FE + seed) | **ALTO** | **A — promover el motor del mod a core** |
| **5. Eliminación estándar** | Parcial (hard+FK sí, soft no) | 1 override de `deleteInstance` + guard | Medio | **B — config; hasta limpia un parche** |

**Leyenda de colisión:**
- **A — reemplazo/migración:** core provee (o proveerá) un genérico que duplica lo nuestro → hay que migrar/eliminar código del mod (con posible pérdida de semántica). *Es el escenario "modificar cosas que ya teníamos".*
- **B — solo configurar:** el genérico de core ya existe; adoptarlo es config, y en algún caso hasta elimina un parche frágil nuestro (net positivo).
- **C — mod puro:** trabajo del mod sin colisión con core.

## 4.1 Confirmación del Sprint Review SP5 (autoritativa)

Las notas del Sprint Review (2026-07-03) confirman con nombre y apellido que **el team core (Klaus Molt) construyó en SP5 las versiones genéricas** de dos capacidades del listado, y que **SP6 es aplicarlas/extenderlas** a los objetos curriculares. Es la evidencia que valida el riesgo de "modificar cosas que ya teníamos".

**Klaus (core) — lo incorporado a up1 core en SP5:**
- *"**Sistema de registro de cambios**: Klaus Molt presenta la implementación de un sistema de registro de cambios (logs) automatizado e independiente por tenant, que permite rastrear acciones en todos los objetos y es aplicable incluso a funciones personalizadas."* → **es el `DataLog` genérico de core** (punto 3). Core es el dueño del genérico.
- *"**Lógica de transiciones en enums**: Nelson Cornejo y Klaus Molt detallan la implementación de reglas lógicas para campos de tipo enumeración (enums)... flujos de estado válidos y prevenir cambios de estado no permitidos."* → **⚠️ Corrección tras verificar el código:** esta capacidad **NO existe hoy en core**. Core solo valida que el valor de un enum esté en la lista permitida (`object-manager/src/graphql/resolvers/instance.resolver.js:3066,3907`), sin reglas estado→estado. El motor de transiciones vive **en el mod**. Lo que Klaus presentó corresponde al trabajo del mod, no a una capacidad genérica de core separada. → el punto 4 = **promover el motor del mod a core**, no "configurar algo que core ya tiene".

**Action item de coordinación:**
- *"**[Klaus Molt] Coordinar actualizaciones**: Coordinar con el equipo de mods los detalles para automatizar la actualización de cambios."* → es el canal formal para reconciliar `ChangeLog` (mod) con el registro de cambios genérico (core).

**Esteban (lead) — lo pospuesto a SP6:**
- *"...se pospusieron para el siguiente periodo **la lógica de prerrequisitos, el historial de cambios y la extensión de configuraciones específicas para el sílabo**."* → mapea a: punto 1 (prerrequisitos), punto 3 (historial), y puntos 2/4/5 sobre el sílabo (configuraciones específicas). Confirma también la **incorporación de Francisco (Academy Management)** al equipo de migración.

**Implicación en el cuadro de impacto (§4):**
- Punto 3 pasa de "A ambiguo" a **A con dirección definida**: core dueño del genérico; SP6 = extender + migrar `ChangeLog` vía coordinación con Klaus.
- Punto 4: **decisión = promover el motor de workflow del mod a core** (categoría A). Core no tiene motor propio, así que lo del mod se levanta y generaliza para que core regule a todos los objetos. Es el **mayor driver de esfuerzo** del listado (~8-13 SP).

## 5. Cruce con el backlog diferido de SP5

Solo **1 de 5** puntos del listado (el 1, requisitos = **S7-01**) estaba en lo que SP5 difirió. Los otros 4 son un **tema nuevo y coherente**: desplegar capacidades transversales (secciones, auditoría, workflow, borrado) sobre los objetos curriculares.

Y a la inversa — de nuestro backlog diferido **NO aparece en el listado**:

| Backlog SP6 (diferido en SP5) | ¿En el listado? | Nota |
|---|---|---|
| **S7-02** Desbloquear versionado core (H-7/H-3) | ❌ No | H-7 (crash) **ya resuelto** en TICKET-074; abierto: RT atómico (B1 / TICKET-056) |
| **S7-03** Deep-copy de hijos al clonar/versionar | ❌ No | Depende de S7-02 |
| **S7-04** Tools `cd_*` MCP de dominio | ❌ No | Ergonómico |
| **S7-05** `planEntry` modular | ❌ No | — |
| **S7-06** Vigencia automática `isCurrent` | 🟡 Parcial | Se cruza con "flujo de trabajo" (punto 4) |

También queda fuera del listado **ISSUE-SP5-01** (el RecordList no muestra columnas derivadas — backend listo, FE bloqueado por core).

## 6. Conclusión ejecutiva

- **Tu tesis se confirma:** los puntos 3 y 4 (y en parte el 2) tocan capacidades que **ya construimos en el mod**. El riesgo real de "modificar lo que teníamos" está en:
  - **Punto 3:** core tiene audit genérico (`DataLog`) que **duplica** nuestro `ChangeLog` bespoke → decisión unificar/migrar/coexistir (la migración más cara).
  - **Punto 4:** core **no** tiene motor de workflow/transiciones (solo valida valores de enum); lo somos nosotros. **Decisión: promover el motor del mod a core** para que regule a todos los objetos. El modelo ya fue diseñado genérico → es "levantar y generalizar" (abrir `scopeType`, flag por objeto, mover el coordinador), no construir de cero. Momento barato para hacerlo antes de acoplarlo a más objetos.
- **Bajo riesgo:** puntos 5 (borrado — core ya lo cubre; hasta elimina un parche) y 1 (mod puro).
- **Ambiguo por terminología:** punto 2 (¿tabs de UI configurables = barato, o modelo de contenido tipo `CurricularSection` = caro?).
- **Nada se puede estimar** hasta resolver las 3 decisiones de `preguntas-abiertas.md` (quién implementa, reemplaza vs extiende, semántica) + ubicar `Syllabus`.

## 7. Inventario de documentos

> Una línea por doc. Los §1-6 de arriba son el análisis del listado base; abajo el inventario
> completo de la carpeta.

**Planificación y reunión SP6**
| Archivo | Qué es |
|---|---|
| [historias-usuario-sp6.md](historias-usuario-sp6.md) | Historias de usuario de SP6 (mod `curriculum-design`). |
| [resumen-reunion.md](resumen-reunion.md) | Resumen para reunión — alcance de SP6. |
| [resumen-reunion.html](resumen-reunion.html) | Resumen ejecutivo para reunión (HTML, vista previa por punto, esfuerzo, mod vs core). |
| [sp6-alcance-v2.html](sp6-alcance-v2.html) | Alcance decidido y esfuerzo de SP6 (HTML). |
| [reunion-qa-2026-07-06.md](reunion-qa-2026-07-06.md) | Notas de la reunión QA / sprint planning (2026-07-06). |
| [preguntas-abiertas.md](preguntas-abiertas.md) | Decisiones bloqueantes para llevar a reunión. |
| [validacion-jira-confluence.md](validacion-jira-confluence.md) | Contraste del listado contra Jira y Confluence (mapeo `CAP-CUR`, gaps). |

**Análisis del listado (core vs mod)**
| Archivo | Qué es |
|---|---|
| [analisis-por-punto.md](analisis-por-punto.md) | Análisis por punto con evidencia (rutas:línea), colisión y opciones. |
| [analisis-core-vs-mod.md](analisis-core-vs-mod.md) | Cada punto con alternativa core vs mod, esfuerzo y resultado. |
| [analisis-soft-delete-engagement.md](analisis-soft-delete-engagement.md) | Análisis de soft-delete en Engagement (uengagement-up1). |

**Revisiones de código / tickets (core y PRs)**
| Archivo | Qué es |
|---|---|
| [UPONE-1379-tests-baseline-rotos-develop.md](UPONE-1379-tests-baseline-rotos-develop.md) | Tests baseline rotos en `develop` (origen UPONE-1379, graduation-profile). |
| [UPONE-1380-object-manager-datalog-review.md](UPONE-1380-object-manager-datalog-review.md) | Cambios en object-manager para DataLog e historial unificado (UPONE-1380). |
| [UPONE-1381-core-changes-review.md](UPONE-1381-core-changes-review.md) | Cambios en object-manager (core) para revisión del team core (UPONE-1381 — motor de transiciones por enum). |
| [UPONE-1382-core-changes-review.md](UPONE-1382-core-changes-review.md) | Cambios en CORE (object-manager + layout) para revisión del team core (UPONE-1382). |
| [UPONE-1393-rbac-field-level-modify-gate.md](UPONE-1393-rbac-field-level-modify-gate.md) | Asimetría RBAC en core: el permiso field-level de escritura no habilita edición granular (UPONE-1393). |
| [UPONE-1393-revert-plan-curriculum-design-pr18.md](UPONE-1393-revert-plan-curriculum-design-pr18.md) | Plan de revert de UPONE-1393 en `curriculum-design` (PR #18). |

**Reviews Dredd**
| Archivo | Qué es |
|---|---|
| [dredd-1380.md](dredd-1380.md) | Review Dredd de UPONE-1380 (DataLog history + atribución polimórfica). |
| [dredd-1393-pr18.md](dredd-1393-pr18.md) | Review Dredd del PR #18 (`curriculum-design`) · UPONE-1393. |
| [dredd-dkc-1380.md](dredd-dkc-1380.md) | Review Dredd-DKC del PR #17 (fix/lang-arq) + lección del gate de frescura. |
| [dredd-comparativa-kb.md](dredd-comparativa-kb.md) | Comparativa Dredd con-KB vs sin-KB + mejoras derivadas. |

**Temas técnicos transversales**
| Archivo | Qué es |
|---|---|
| [habilitar-lint-typecheck-core.md](habilitar-lint-typecheck-core.md) | Qué se necesita en core para habilitar lint/typecheck, efecto en mods y deuda incremental. |
| [manejo-keys-i18n-mods.md](manejo-keys-i18n-mods.md) | Manejo de keys de i18n en los mods de up1. |
| [bug-codegen-common-fields-graphql-typemapper.md](bug-codegen-common-fields-graphql-typemapper.md) | Bug de codegen: common fields mapeados a `String` en GraphQL (drift `updatedById`). |
| [pipeline-fallo-import-async-flaky.md](pipeline-fallo-import-async-flaky.md) | Análisis del fallo de pipeline en merge UPONE-1382 (test flaky del import async). |
| [workflow-retirement-uengagement-coordinacion.md](workflow-retirement-uengagement-coordinacion.md) | Retiro del subsistema de workflow — coordinación con el equipo uEngagement. |

**Maquetas y guías**
| Archivo | Qué es |
|---|---|
| [mockup-sp6.html](mockup-sp6.html) | Maqueta semi-funcional en el lenguaje visual de up1 (dónde vive cada punto del listado). Abrir en navegador (file://). |
| [guia-objetos-UPONE-1379.html](guia-objetos-UPONE-1379.html) | Guía "Objetos en UP1: del JSON a la pantalla" (HTML). |
