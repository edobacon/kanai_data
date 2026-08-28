---
id: DOC-kb-sp7-UPONE-1378-smoke-test-replication-v2
project: up1
type: doc
---

# UPONE-1378 · Casos de prueba del smoke (v2 — seed PM rev.2)

Reemplaza a [UPONE-1378-smoke-test-replication.md](./UPONE-1378-smoke-test-replication.md), que quedó
obsoleto: el seed del mod cambió con **UPONE-1456** (paquete PM #097 rev.2) y **ninguno** de sus
datos de prueba existe hoy.

Tenant: **UPU** (`uplanner_upu`). Ejecutado y verificado el **2026-07-30** contra suite + object-manager
locales, rol **Consultor**.

---

## 0. TL;DR — dónde entrar a ver lo implementado

El entorno **ya quedó armado**. Estas son las 3 asignaturas y los 2 planes de estudio a los que
tienes que entrar:

| Qué quieres ver | Asignatura | Plan de estudios | Dónde |
|---|---|---|---|
| Árbol Y/O completo (AND + OR + créditos + advisory) | **Estadistica** (`C-ESTADISTIC-107`) | — | pestaña **Requisitos** de la asignatura |
| Aviso mesh-wide (requisito incumplido en una malla publicada) | Estadistica en período 3 | **Plan de Estudios Licenciatura en Matematicas 2026** (`UPU-LMAT-PLAN-2026`) | pestaña **Malla curricular** |
| Bloqueo al agregar + caso positivo (umbral de créditos) | **Estadistica** (`C-ESTADISTIC-107`) | **Plan de Estudios Ingenieria Civil 2026** (`UPU-ICIV-PLAN-2026`, ya en **Borrador**) | Malla curricular, **+ Asignatura** en P3 (bloquea) y P4 (pasa) |
| Corequisito vs prerrequisito (timing) | **Química Básica** (`QUI104`) | mismo plan ICIV 2026 | **+ Asignatura** en P3 (bloquea) y P5 (pasa) |
| Electivo K-de-N + umbral de créditos | **Gestión de Proyectos** (`GES110`) | mismo plan ICIV 2026 | **+ Asignatura** en P3 (bloquea) y P6 (pasa) |
| Romper un requisito quitando el curso que lo satisfacía | **Programación I** (`PRG105`) → **Estadística** (`EST106`) | mismo plan ICIV 2026 | agregar PRG105 en P1 y EST106 en P3, después **quitar PRG105** |

URLs directas (ids del entorno actual):

```
http://localhost:3000/UPU/Activity/cms81nbiz04qxxxzzxo4ouyvb/RecordDetail/default_Activity_view
http://localhost:3000/UPU/Activity/cms81n8yt00qoxxzztm4eamjg/RecordDetail/default_Activity_view
http://localhost:3000/UPU/Activity/cms81n8z100quxxzz1wee7xu1/RecordDetail/default_Activity_view
http://localhost:3000/UPU/Curriculum/cms81nbd004jgxxzzkb9nbwgn/RecordDetail/default_Curriculum_edit
http://localhost:3000/UPU/Curriculum/cms81nbcn04j8xxzzicl1b3pc/RecordDetail/default_Curriculum_edit
```

> Los `id` son de este entorno y cambian con un reseed. Los **códigos** son estables: resuelve por
> código con las queries de la sección 2.

---

## 1. Qué cambió respecto de la v1 (y por qué había que rehacer los casos)

`UPONE-1456` reemplazó los fixtures inventados por un espejo del paquete PM. Consecuencias directas
sobre el smoke anterior:

| v1 usaba | Hoy | Impacto |
|---|---|---|
| `TIR101` (asignatura con árbol Y/O) | **no existe** | el caso de render del árbol apuntaba a un registro inexistente |
| `Plan de Estudios Ingeniería Civil 2027 (Borrador)` | **no existe**; los 20 planes del paquete nacen `Active` | la malla **no era editable** → los 4 casos de alta quedaban imposibles |
| `MAT101 / QUI104 / FIS103 / ALG102 / SVC-DES` como targets del árbol | siguen existiendo, pero **los siembra `academic-scheduling`**, no este mod, y ya no son targets de ningún requisito | los targets del árbol ahora son asignaturas del paquete (`C-*`) |
| Malla de 6 entradas | 46 entradas, 10 períodos | los números del caso (contadores, créditos) cambiaron por completo |

El árbol de requisitos que **sí** trae el seed hoy está anclado por código (no por `findFirst`
arbitrario) en `_data-requirement.js`:

- Dueño: `C-ESTADISTIC-107` (**Estadistica**), constante `EST200_ACTIVITY_CODE`.
- Bloque electivo (`minToSatisfy=4`, `creditsRequired=24`): colgado del **Curriculum**
  `UPU-ICIV-PLAN-2026` con `effect=ProgressGate`. **No participa** de la evaluación de la malla: el
  barrido evalúa solo árboles con `ownerType=activity`. Es dato de demo, no un caso de prueba.

### Qué hubo que crear para poder probar

1. **Un plan en Borrador.** La malla solo se edita con `status='Draft'`
   (`EDITABLE_STATUSES` en `curriculumMesh.logic.ts:301`) y el seed no deja ninguno. Se usó el
   camino nativo: transición **Activo → Borrador** desde la UI (capability `curriculum:revert`, que
   el rol Consultor tiene). Se aplicó sobre `UPU-ICIV-PLAN-2026` y **quedó así** para que puedas
   probar directo. Cómo devolverlo: sección 6.
2. **Dos árboles de requisitos** que el seed no trae (corequisito por timing, electivo K-de-N,
   umbral de créditos), sobre `QUI104` y `GES110`. Ver
   [`UPONE-1378-smoke-fixture.sql`](./UPONE-1378-smoke-fixture.sql) — **ya aplicado**, idempotente,
   con teardown al final del archivo.

> Por qué `QUI104` y `GES110`: el editor de requisitos se **bloquea** para asignaturas que están en
> planes publicados ("Editar sus requisitos requiere versionar el programa"). Son las únicas
> asignaturas que no están en ninguna malla, así que el árbol también se puede armar a mano desde la
> pestaña Requisitos (verificado: los requisitos de `QUI104` se crearon primero por UI y después se
> replicaron en el SQL con la misma forma).

---

## 2. Prerrequisitos del entorno

- Dev servers arriba: `npm run dev --workspace=@uplanner/suite` (:3000) y object-manager (:4000).
- Seed corrido (`npm run sync`) para tener layouts + data del paquete en `uplanner_upu`.
- Fixture aplicado:
  ```bash
  docker exec -i pg psql -U pg -d uplanner_upu < UPONE-1378-smoke-fixture.sql
  ```
- Login en `http://localhost:3000/login/UPU` con Clerk test mode:
  - email `eduardo.bacon+clerk_test@uplanner.com` (el `+clerk_test` es la marca de test)
  - OTP fijo `424242`
  - rol resultante **Consultor** (tiene `planentry:*`, `requirement:*`, `curriculum:revert`)

### Resolver ids por código

```sql
SELECT id, code, name, credits, status FROM "Activity"
WHERE code IN ('C-ESTADISTIC-107','QUI104','GES110','C-CALCULOIII-011','C-METODOSNUM-018',
               'C-TOPOGRAFIA-023','C-GEOLOGIAAP-024','C-MATERIALES-025');

SELECT id, code, name, status FROM "Curriculum" WHERE code IN ('UPU-ICIV-PLAN-2026','UPU-LMAT-PLAN-2026');
```

Ver el árbol de una asignatura (base + proyecciones RT):

```sql
SELECT r.id, r."recordType", r."parentId", r.label, r."isHardRule",
       g.combinator, g."minToSatisfy", g."creditsRequired",
       rs."mustBe", rs.timing, t.code AS target,
       m.metric, m.operator, m.value, m.scope
FROM "requirement" r
LEFT JOIN "rt__Group__requirement" g ON g."requirementId" = r.id
LEFT JOIN "rt__RecordState__requirement" rs ON rs."requirementId" = r.id
LEFT JOIN "rt__MetricThreshold__requirement" m ON m."requirementId" = r.id
LEFT JOIN "Activity" t ON t.id = rs."targetId"
WHERE r."ownerType" = 'activity'
  AND r."ownerId" = (SELECT id FROM "Activity" WHERE code = 'C-ESTADISTIC-107');
```

Invariante (RULE-curriculum-design-034) — no debe haber grupos sin hijos:

```sql
SELECT r.id FROM "requirement" r JOIN "rt__Group__requirement" g ON g."requirementId" = r.id
WHERE (SELECT count(*) FROM "requirement" ch WHERE ch."parentId" = r.id) = 0;
-- debe devolver 0 filas
```

### Aritmética de la malla de ICIV 2026 (base de los casos)

| Período | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---:|---:|---:|---:|---:|---:|
| Créditos del período | 23 | 25 | 25 | 24 | 23 | 26 |
| **Acumulado estrictamente anterior** | 0 | 23 | **48** | **73** | **97** | **120** |

El evaluador de `MetricThreshold` suma solo períodos **estrictamente anteriores**
(`aggregateCreditsBefore`), así que un umbral de 60 créditos parte el eje justo entre P3 (48, falla)
y P4 (73, pasa). Eso es lo que hace que el mismo caso sirva de negativo y de positivo.

---

## 3. Casos

### Caso 1 — Render del árbol Y/O (pestaña Requisitos) ✅ verificado

1. Ir a la asignatura **Estadistica** (`C-ESTADISTIC-107`), pestaña **Requisitos** (2ª pestaña).
2. Esperado, textual:
   - Cabecera: `5 condición(es) — 2 vía(s)`.
   - Regla: `((Aprobar Calculo I Y Aprobar Algebra Lineal) Ó Aprobar Calculo II) Y Créditos ≥ 60 Y Haber visto Fundamentos de Programacion (advisory)`
   - Aviso de bloqueo del editor: *"Esta asignatura pertenece a 4 plan(es) publicado(s): … Editar sus
     requisitos requiere versionar el programa."*
3. **Expandir todo**. Esperado:

```
Y  Requisitos EST200 (3)
   O  Vía de ingreso (2)
      Y  Vía 1 (2)
         Aprobar Calculo I               Aprobado · Obligatorio
         Aprobar Algebra Lineal          Aprobado · Obligatorio
      Aprobar Calculo II    [Vía 2]      Aprobado · Obligatorio
   ≥ 60 créditos                         Obligatorio
   Haber visto Fundamentos de Programacion (advisory)   Cursado · Recomendado
```

Qué cubre: anidamiento AND→OR→AND, `MetricThreshold`, y el nodo advisory (`isHardRule=false`)
mostrado como **Recomendado**.

### Caso 2 — Aviso mesh-wide en un plan publicado ✅ verificado

Este caso **no necesita** plan en Borrador: el barrido de violaciones no está gateado por el modo
edición (`useMeshPrereqScan` corre siempre que la malla haya cargado).

1. Ir al **Plan de Estudios Licenciatura en Matematicas 2026** (`UPU-LMAT-PLAN-2026`), pestaña
   **Malla curricular**.
2. Esperado, dos alertas:
   - *"El plan está Publicado. Solo se pueden editar mallas de planes en Borrador. Los requisitos de
     asignaturas en planes publicados no se pueden editar; crea una nueva versión del programa para
     modificarlos."*
   - *"**1** asignatura(s) tienen requisitos sin cumplir en su período actual. Es un aviso; no
     bloquea la edición."* → `C-ESTADISTIC-107 — Estadistica (período 3): Requisitos EST200`
3. Contadores del plan: 235 / 240 créditos, 10 períodos, 46 asignaturas.

Por qué avisa: Estadistica está en P3; su vía de ingreso **sí** se cumple (Cálculo I y Álgebra Lineal
en P1) pero el umbral de 60 créditos no (48 acumulados antes de P3). El mismo aviso aparece en
`UPU-LFIS-PLAN-2026`, `UPU-LQUI-PLAN-2026` y `UPU-LBIO-PLAN-2026`, que tienen la misma estructura.

### Caso 3 — Bloqueo al agregar a la malla, por umbral de créditos ✅ verificado

Plan: **ICIV 2026** (ya en Borrador). Estadistica no está en su malla.

1. Pestaña **Malla curricular** → debe decir **Modo edición** (no "Solo lectura").
2. **Período 3** → **+ Asignatura** → tipo **Obligatoria** → **Siguiente**.
3. Buscar `C-ESTADISTIC-107`, marcarla, **Agregar (1)**.
4. Esperado: modal **Prerrequisitos faltantes** que **aborta el alta**:
   > No es posible agregar esta asignatura porque los siguientes prerrequisitos no están colocados en
   > un período anterior:
   > **Requisitos EST200** — `1 de 2 cursos colocados antes del período 3`
5. **Cancelar**. Verificado en BD: la malla sigue en 46 entradas (el bloqueo no persiste nada).

El `1 de 2` es el nodo raíz `Group[AND]`: de sus 2 hijos normativos (la vía de ingreso y el umbral de
créditos) se cumple 1. El tercer hijo es advisory y no cuenta.

### Caso 4 — Positivo, mismo requisito un período después ✅ verificado

1. Mismo plan → **Período 4** → **+ Asignatura** → Obligatoria → `C-ESTADISTIC-107` → Agregar.
2. Esperado: **se agrega sin modal**. Contadores pasan a 47 asignaturas / 238 créditos y **no
   aparece** el banner de violaciones.
3. Verificado en BD: `planEntry` con `period=4`. El alta **persiste al instante** (no espera
   "Guardar").

Prueba que no es un bloqueo ciego: cambió solo el período (73 ≥ 60 créditos), no el requisito.

### Caso 5 — Corequisito vs prerrequisito (timing) ✅ verificado

Asignatura **QUI104** (Química Básica). Árbol del fixture:
`Cursar en paralelo Cálculo III (P3 en ICIV)` **Y** `Aprobar Metodos Numericos antes (P4 en ICIV)`.

En la pestaña Requisitos debe verse:

```
Y  Todos de la vía (2)
   Calculo III (C-CALCULOIII-011)          Cursado · Concurrente   Obligatorio
   Metodos Numericos (C-METODOSNUM-018)    Aprobado · Antes        Obligatorio
```

- **Negativo** — ICIV, Período 3 → **+ Asignatura** → Obligatoria → `QUI104` → Agregar.
  Esperado: bloquea con **Cualquiera de las vías** — `0 de 1 cursos colocados antes del período 3`.
  Clave: el **corequisito sí se satisface** (Cálculo III está en el mismo P3, y `Concurrent` admite
  "mismo período o antes"); lo que rompe es el prerrequisito de P4, que no es *estrictamente*
  anterior. Verificado: nada se agregó.
- **Positivo** — mismo plan, Período 5 → `QUI104` → Agregar. Esperado: **se agrega sin modal**
  (coreq P3 ≤ P5 y prereq P4 < P5). Verificado en BD (`period=5`), luego se quitó.

### Caso 6 — Electivo K-de-N + umbral de créditos ✅ verificado

Asignatura **GES110** (Gestión de Proyectos). Árbol del fixture:
`Créditos ≥ 60` **Y** `2 de 3: (Topografia Ó Geologia Aplicada Ó Materiales de Construccion)`
— los 3 del pool están en el **período 5** de ICIV.

En la pestaña Requisitos: `4 condición(es) — 1 vía(s)` y la regla
`(Créditos ≥ 60 Y 2 de 3: (Topografia (C-TOPOGRAFIA-023) Ó Geologia Aplicada (C-GEOLOGIAAP-024) Ó Materiales de Construccion (C-MATERIALES-025)))`.

- **Negativo** — ICIV, Período 3 → `GES110` → Agregar. Esperado: bloquea con
  **Cualquiera de las vías** — `0 de 1 cursos colocados antes del período 3`. Fallan las dos
  condiciones (pool 0 de 2; créditos 48 < 60).
- **Positivo** — Período 6 → `GES110` → Agregar. Esperado: **se agrega sin modal** (los 3 del pool
  están en P5 → 3 ≥ 2; créditos 120 ≥ 60). Verificado en BD (`period=6`), luego se quitó.

Este par es lo que demuestra que el K-de-N y el umbral **se evalúan de verdad**: si el evaluador los
ignorara, la vía quedaría "satisfecha vacuamente" y P3 no bloquearía.

### Qué condición falla realmente en cada bloqueo — ✅ corregido en el código

El modal nombraba el **nodo contenedor**, nunca la condición concreta que rompe. Se corrigió la
atribución del faltante en el evaluador (ver 3.b). Comparativa con los textos reales verificados en
runtime antes y después:

| Caso | Antes decía | Ahora dice | Qué sí se cumple (y antes quedaba oculto) |
|---|---|---|---|
| 3 · Estadistica @ P3 | `Requisitos EST200` — `1 de 2 cursos colocados antes del período 3` | **`≥ 60 créditos`** — `48 de 60 créditos acumulados antes del período 3` | la vía de ingreso completa (Cálculo I y Álgebra Lineal en P1). Por eso a P4 (73 créditos) pasa sin tocar ningún curso |
| 5 · QUI104 @ P3 | `Cualquiera de las vías` — `0 de 1 cursos colocados antes del período 3` | **`C-METODOSNUM-018 — Metodos Numericos`** — `No colocado en un período anterior` | el **corequisito** `Calculo III` (`Concurrente`, mismo P3): ya no se lo insinúa como faltante |
| 6 · GES110 @ P3 | `Cualquiera de las vías` — `0 de 1 cursos colocados antes del período 3` | **dos ítems**: `≥ 60 créditos` (`48 de 60…`) y `Electivo de especialización (2 de 3)` (`0 de 2…`) **+ las 3 opciones del pool** | — |
| 8 · EST106 tras quitar PRG105 | banner: `Cualquiera de las vías` | banner: **`PRG105 — Programación I`** | — |

Causa original: `evaluateGroup` devolvía el `MissingPrereqItem` **del grupo que falla**, no de sus
hijos; y como el editor envuelve todo requisito en un `Group[OR]` de vía única, el nodo más
superficial era siempre ese OR. El detalle correcto ya lo calculaba el evaluador y se descartaba.

### 3.b Cambio implementado — atribución del faltante + alternativas

Alcance: mod `curriculum-design` únicamente. Los 6 consumidores del contrato viven todos en
`modsComponents/CurriculumMesh/`; no hay consumidores en `layout/`, `suite/` ni `object-manager/`.

**Reglas de atribución** (`evaluateRequirementTree.logic.ts`):

| Nodo que falla | Antes | Ahora |
|---|---|---|
| `Group` AND puro (sin `minToSatisfy`/`creditsRequired`) | se reportaba el grupo | **desciende** a los hijos que fallan: todos son exigibles, el grupo no aporta una elección |
| `Group` de alternativa con **1** hijo normativo (la vía única del editor) | se reportaba el grupo | **colapsa** y desciende, igual criterio que `collapseSingleVia` en el render |
| `Group` de alternativa **real** (OR/K-de-N con ≥2 hijos) | grupo, sin decir las opciones | grupo **+ `options`**: una entrada por rama faltante |
| `Group` que falla por su **propio** `creditsRequired` | se reportaba el grupo | se reporta el grupo (no desciende: el motivo no vive en ningún hijo) |

Detalles del diseño:

- **`MissingPrereqItem.options?: string[]`** — campo **opcional y aditivo**, así que ningún consumidor
  se rompe. Sólo se emite con ≥2 ramas faltantes, o sea cuando hay una elección real: con una sola
  rama, listar "opciones: X" sería ruido.
- **Descripción de una rama compuesta**: une sus condiciones faltantes con `y`/`o` según el
  combinator, y **omite lo ya satisfecho**. Ej.: en `OR{AND{MAT101, ALG102}, FIS103}` con MAT101 ya
  colocado, la opción de la vía 1 pide sólo `ALG102`.
- **Invariante nuevo**: nunca `satisfied: false` con `missing: []`. Un grupo con `creditsRequired` y
  todos sus hijos satisfechos (hoja negada) falla por su propio umbral; descender habría abierto el
  modal sin motivo. Hay guarda explícita + test.
- **Una** clave i18n nueva en es/en/pt (`curriculumMesh.prereqBlock.options`): 1 línea por idioma.
- El **banner mesh-wide** mejora sin cambios propios: junta `m.label`, que ahora es el curso real.

Deuda que este cambio NO resuelve (preexistente): el evaluador es un módulo puro pero tiene los textos
de `detail` **hardcodeados en español** (`"No colocado en un período anterior"`, `"48 de 60
créditos…"`), y los conectores `y`/`o` que agregué siguen esa convención. Sacarlos a i18n exige pasar
un `t` por el evaluador y tocar los 6 consumidores: refactor aparte.

**Validación**: 1442/1442 tests del mod en verde (268 en `CurriculumMesh/`), typecheck sin errores
nuevos (99 antes / 99 después; ninguno en los archivos tocados) y los 3 casos verificados en runtime
con los textos de la tabla de arriba.

Tres aserciones existentes codificaban la atribución vieja y se actualizaron. Ninguna cambió un
`satisfied`: sólo a quién se atribuye el faltante.

| Test | Cambio |
|---|---|
| `evaluateRequirementTree — AND incompleto > AND{A,B}, sólo A colocado` | esperaba `Group` + `1 de 2 cursos`; ahora `RecordState` `B` + `No colocado en un período anterior` |
| `findMissingPrereqs — Group con 0 de 2, minToSatisfy=1` | mismo ítem + campo `options: ['ING100','FRA100']` (aditivo) |
| `findMissingPrereqs — Group sin minToSatisfy (AND implícito)` | esperaba `Group` + `1 de 2 cursos`; ahora `RecordState` `QUI100` |

Se agregaron 7 tests para la atribución: vía única, umbral dentro de AND, alternativa anidada, omisión
de lo satisfecho, K-de-N con `labelResolver`, invariante de `missing` no vacío, y ausencia de
`options` cuando falta una sola rama.

### Caso 7 — Aviso al mover una asignatura ⚠️ no ejecutado

El barrido recomputa sobre `entries`, así que arrastrar una asignatura a un período donde su
requisito no se cumple debe hacer aparecer el banner del Caso 2 **sin** modal bloqueante (decisión
del dev: avisar sin bloquear). No se ejecutó en esta corrida: el alta por el picker está bloqueada
justamente en los períodos que violan, y el único camino para dejar una entrada en un período
inválido es **drag & drop** (el modal *Editar* de una entrada no tiene campo de período).

Cómo probarlo a mano: agregar `QUI104` en el Período 5 (Caso 5 positivo) y **arrastrarla** al
Período 3. Esperado: aparece el banner con `QUI104 — Química Básica (período 3)` y la entrada
**queda** ahí.

> Evidencia del mismo code path: el Caso 2 ya muestra el banner calculado por `scanMeshViolations`
> sobre una entrada colocada en un período que viola. Mover no agrega lógica nueva, solo cambia
> `entries`. El **Caso 8** cubre además la variante dinámica (la violación aparece por una acción del
> usuario en la sesión, no por el estado inicial de la malla).

### Caso 8 — Quitar de la malla un curso que es prerrequisito de otro posterior ✅ verificado

Es el caso que faltaba: **romper** un requisito que estaba satisfecho, quitando el curso que lo
satisfacía. Usa el par `PRG105` → `EST106` del fixture (ambas asignaturas libres, así que las dos
entradas se crean y se borran sin tocar ninguna entrada del seed).

Árbol de **EST106** (Estadística): `Aprobar Programación I (PRG105)` — un solo prerrequisito `Antes`.

1. Plan **ICIV 2026** (Borrador) → **Malla curricular** → Modo edición.
2. **Período 1** → **+ Asignatura** → Obligatoria → `PRG105` → Agregar. Se agrega (no tiene
   requisitos).
3. **Período 3** → **+ Asignatura** → Obligatoria → `EST106` → Agregar. **Se agrega sin bloqueo**
   (PRG105 está en P1, estrictamente antes de P3). Estado: 48 asignaturas, **sin banner**.
4. Ahora quitar el prerrequisito: click en el lápiz de la tarjeta **PRG105** (P1) → **Quitar de la
   malla**.
5. Esperado / verificado — **dos comportamientos distintos**:

   | | Resultado |
   |---|---|
   | ¿Avisa **antes** de quitarlo que PRG105 es prerrequisito de EST106? | ❌ **No.** El modal *Editar — Programación I* no menciona ninguna dependencia, y **"Quitar de la malla" borra al primer click, sin confirmación de ningún tipo** |
   | ¿La malla muestra **después** que EST106 quedó sin su prerrequisito? | ✅ **Sí, al instante.** Aparece el banner: *"1 asignatura(s) tienen requisitos sin cumplir en su período actual. Es un aviso; no bloquea la edición."* → `EST106 — Estadística (período 3): Cualquiera de las vías` |

6. Limpieza: quitar también `EST106` de P3 → la malla vuelve a 46 entradas.

Lo que esto demuestra: la detección **es reactiva y correcta** (el barrido recomputa sobre `entries`
después del `refetch`, así que no hace falta recargar la página), pero es **puramente a posteriori**.
El borrado no tiene guardia: `onEditRemove`
([`CurriculumMeshElement.vue:1129`](../../../up1/mods/curriculum-design/modsComponents/CurriculumMesh/CurriculumMeshElement.vue))
ejecuta `DELETE_PLAN_ENTRY` → `refetch` sin consultar quién dependía de esa entrada. No existe
búsqueda de dependencias inversas en ningún punto del módulo. Ver hallazgo 5.

Asimetría a notar: **agregar** una asignatura con requisitos incumplidos está **bloqueado** (modal que
aborta el alta), pero **quitar** una que otros necesitan pasa sin fricción y solo deja un aviso. Es
la misma decisión de diseño del mover ("avisar sin bloquear"), aplicada acá sin aviso previo.

---

## 4. Cobertura unit de los umbrales exactos

Los saltos exactos están cubiertos con aserciones concretas en
`modsComponents/CurriculumMesh/evaluateRequirementTree.logic.spec.ts` (el mismo evaluador que usa la
malla), así que el smoke no tiene que barrer cada frontera:

- **TC-26** K-de-N por conteo: `minToSatisfy=2`, 1 colocado → viola; 2 → satisface.
- **TC-30** créditos del grupo: `creditsRequired=24`, 18 créd → viola; 24 → satisface.
- **TC-33** `MetricThreshold(Credits)`: `≥60` scope plan, 48 → viola; 60 → satisface; scope
  `category`; solo cuenta créditos estrictamente anteriores.

---

## 5. Hallazgos de esta corrida

1. ~~**Granularidad del mensaje de bloqueo**~~ — **✅ RESUELTO** (ver 3.b). El modal resumía al nodo
   más superficial que falla; ahora desciende a la condición real y, cuando hay una elección, lista
   las alternativas. Queda pendiente sólo lo ortogonal: el texto genérico dice **"cursos"** también
   cuando el umbral es de créditos (`groupDetail`), y los strings del evaluador siguen hardcodeados
   en español.

2. **Pestañas condicionadas de `default_Curriculum_view` desaparecen de forma intermitente.**
   Las 3 pestañas con `conditions: [["recordType","==","Plan"]]` (Líneas de formación, Malla
   curricular, Perfil de egreso) a veces no se renderizan y quedan solo *General* e *Historial*; se
   reprodujo también al cambiar de pestaña con las 3 ya visibles. La condición es idéntica en
   `default_Curriculum_edit`, que fue estable durante todo el smoke. Pinta a carrera entre la
   evaluación de condiciones y la carga del registro. **Workaround del smoke: usar
   `default_Curriculum_edit`** (ahí además vive el modo edición de la malla). Candidato a
   follow-up de core (`layout/`); no se investigó a fondo porque queda fuera del alcance de este
   smoke.

3. **El editor de requisitos se bloquea por pertenencia a planes publicados**, no por rol. Con el
   seed nuevo eso deja **fuera del editor a las 299 asignaturas del paquete**: las únicas editables
   son las 9 que no están en ninguna malla (`MAT101`, `ALG102`, `FIS103`, `QUI104`, `PRG105`,
   `EST106`, `ING107`, `ECO108`, `GES110`, que siembra `academic-scheduling`). Es coherente con el
   diseño, pero conviene saberlo antes de armar fixtures.

4. **El bloque electivo del seed no se ejercita en la malla.** Está colgado del Curriculum
   (`ownerType=curriculum`, `effect=ProgressGate`) y el barrido solo evalúa árboles de
   `ownerType=activity`. No hay caso de prueba de UI que lo cubra hoy.

5. **Quitar de la malla no valida dependencias inversas ni pide confirmación** (Caso 8).
   `onEditRemove` (`CurriculumMeshElement.vue:1129`) hace `DELETE_PLAN_ENTRY` + `refetch` directo: no
   busca qué entradas tenían a esa asignatura como target de un requisito, y el botón *Quitar de la
   malla* **borra al primer click** — no hay diálogo de confirmación de ningún tipo. No existe
   búsqueda de dependencias inversas en ningún punto del módulo (`grep` de
   `dependent|reverse|isPrereqOf` en `modsComponents/CurriculumMesh/`: sin resultados).

   La detección posterior **sí funciona** (el banner aparece al instante, sin recargar), así que el
   dato no queda inconsistente en silencio. Pero la UX es asimétrica: **agregar** con requisitos
   incumplidos está bloqueado, **quitar** rompiendo el requisito de otro pasa sin fricción.

   Dos mejoras posibles, independientes y de distinto costo:
   - **Confirmación con impacto** (la que pidió el dev): al abrir *Editar* o al presionar *Quitar*,
     listar qué asignaturas de la malla dependen de esta y en qué período quedarían en falta. El dato
     necesario ya está en memoria — `treesByActivity` de `useMeshPrereqScan` tiene el árbol de cada
     entrada colocada, así que la dependencia inversa se resuelve recorriendo los `targetId` sin una
     sola query nueva.
   - **Confirmación mínima**, aparte de lo anterior: un `¿Quitar X de la malla?` para una acción
     destructiva que hoy se dispara con un click y persiste al instante (no espera el *Guardar*).

---

## 6. Cómo dejar el entorno como estaba

Nada de lo anterior quedó a medias, pero el entorno **sí quedó preparado** (a propósito) con dos
cosas que conviene revertir cuando termines:

1. **`UPU-ICIV-PLAN-2026` quedó en `Draft`** (era `Active`). Volver por UI, pestaña General del plan,
   campo **Estado**, siguiendo las transiciones declaradas:
   `Borrador → En revisión → Aprobado → Activo` (capabilities `curriculum:approve` y
   `curriculum:publish`; Consultor las tiene). Verificar:
   ```sql
   SELECT code, status FROM "Curriculum" WHERE code = 'UPU-ICIV-PLAN-2026';  -- Active
   ```
2. **Fixture de requisitos** (`QUI104` y `GES110`): descomentar y correr el bloque TEARDOWN de
   [`UPONE-1378-smoke-fixture.sql`](./UPONE-1378-smoke-fixture.sql).

La malla de ICIV quedó **intacta en 46 entradas** (las altas de los casos positivos se quitaron con
*Editar → Quitar de la malla*). Si un intento quedara colgado:

```sql
SELECT count(*) FROM "planEntry" WHERE "planId" = (SELECT id FROM "Curriculum" WHERE code = 'UPU-ICIV-PLAN-2026');
-- 46

DELETE FROM "planEntry"
WHERE "planId"    = (SELECT id FROM "Curriculum" WHERE code = 'UPU-ICIV-PLAN-2026')
  AND "activityId" IN (SELECT id FROM "Activity" WHERE code IN ('C-ESTADISTIC-107','QUI104','GES110'));
```

---

## 7. Pendientes

- **Automatización.** Los 8 casos siguen siendo smoke manual por navegador. El fixture SQL ya es la
  mitad del trabajo: con él más un test de Playwright que asere el texto del modal y el caso
  positivo, esto corre en CI y deja de depender del seed vivo de UPU. Hoy la única red automatizada
  son los unit del evaluador (sección 4), que no cubren el cableado UI→GraphQL→evaluador.
- ~~**Detalle del mensaje de bloqueo**~~ — hecho (3.b). Queda el residuo: `groupDetail` dice "cursos"
  aunque el umbral sea de créditos, y los strings del evaluador están hardcodeados en español.
- **Aviso de impacto al quitar de la malla** (hallazgo 5) — decisión del dev: ¿confirmación con lista
  de dependientes, confirmación simple, ambas, o se deja como está y alcanza el banner posterior?
- **Pestañas de `default_Curriculum_view`** (hallazgo 2).
- **Caso 7** (aviso al mover): pendiente de ejecutar a mano con drag & drop. El Caso 8 ya cubre la
  aparición dinámica del banner por una acción del usuario.

Estado: creado **2026-07-30**. Casos 1-6 y 8 verificados en UPU con el seed PM rev.2; Caso 7
documentado sin ejecutar.
