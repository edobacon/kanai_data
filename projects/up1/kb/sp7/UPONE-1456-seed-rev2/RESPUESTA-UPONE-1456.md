# Respuesta al análisis UPONE-1456 (paquete seed PM #097)

- **De:** PM #097 (autor del seed)
- **Para:** Eduardo Bacon (dueño del mod curriculum-design)
- **Fecha:** 2026-07-24
- **Rama destino reconciliada:** `origin/develop` (22-jul, modelo `recordType:Faculty`)
- **Insumo:** tu análisis `UPONE-1456-analisis-seed.md` (2026-07-21)

Gracias por el análisis, muy claro. Ajusté el paquete completo. Abajo va la respuesta punto por punto a las 6 preguntas, el detalle de cada cambio y el único punto que queda para tu decisión.

---

## Resumen ejecutivo

Regeneramos el paquete para que sea **un solo dataset coherente sobre el mesh `C-*`** y quede alineado a `develop`:

- **Offerings + syllabus** dejaron de apuntar al set curado (12 asignaturas que no estaban en la malla, cargaban 2/18 líneas). Ahora cuelgan de **Activities reales del mesh de 301**, mapeadas por nombre.
- **`Activity.executionUnit`** ya no usa el inexistente `AcademicExecution`; usa una Faculty UPU real.
- **CIE/ING** se resuelven creando 2 Faculties propias de `UPU-MAIN` (no dependemos de tu seed).
- **Servicios** (ServiceOffer) excluidos: son dominio engagement.
- Núcleo (programas, planes, malla, changelog) sin cambios: ya entraba directo, según tu análisis.

Los 3 archivos tocados revalidados con `node --check`.

---

## Hallazgo previo: drift de rama (contexto de por qué algunas cosas "no cuadraban")

Nuestro paquete original se generó contra un checkout de **junio** (rama `UPONE-1261-academic-program`), donde el seed del mod creaba orgUnits con `recordType:'AcademicExecution'` y **nuestro lookup funcionaba**. El modelo cambió a `recordType:'Faculty'` recién en **julio**, que es lo que tú evaluaste. O sea: tu observación es correcta para la rama destino. Por eso reconciliamos **todo contra `origin/develop`**, no contra nuestra copia local vieja.

---

## Respuesta a las 6 preguntas

### 1. Activity.executionUnit (¿null o Faculty real?)

**Faculty real.** Corregido en `_data-mesh.js`: el lookup `orgUnit.findFirst({recordType:'AcademicExecution'})` se reemplazó por un find-or-create de la Faculty `UPU-FAC-ING` (`recordType:'Faculty'`), anclada a `UPU-MAIN` vía `rt__Faculty__OrgUnit` (mismo patrón que tu `_data-univalle.js`). Las 301 Activities del mesh quedan con `executionUnitId` poblado.

### 2. Offerings vs malla (¿set curado o regenerar contra el mesh?)

**Regenerar contra el mesh.** Confirmamos el cruce: de los 13 códigos curados, solo 2 (RED109, 111026C) estaban en las 301 del mesh. Regeneramos `_data-offerings.js` y `_data-syllabus-sections.js` para que apunten a Activities reales del mesh, mapeadas por nombre (tabla abajo). Ya no hay que sembrar asignaturas fantasma ni conservar el set curado.

### 3. CIE / ING (¿ya existían? ¿los agrego? ¿bajo qué institución?)

No existían, y las del mod (`UV-DEPT-MAT`, `AIEP-ESC-TEC`) pertenecen a otras instituciones (Univalle/AIEP), no a `UPU-MAIN`. Para no depender de tu seed ni cruzar instituciones, **el paquete crea 2 Faculties propias bajo `UPU-MAIN`**:

- `UPU-FAC-CIE` - Facultad de Ciencias
- `UPU-FAC-ING` - Facultad de Ingenieria

Se crean en `_data-offerings.js` (find-or-create + anclaje `rt__Faculty__OrgUnit`), idempotentes por `code`. `ActivityLine.orgUnitId` (NOT NULL) siempre resuelve; si por algo faltara activity u orgUnit, la línea se salta con `console.warn` (ya no crashea ni se salta en silencio).

### 4. Servicios / ServiceOffer (¿entran o quedan fuera?)

**Fuera.** Son dominio engagement y el loader ni los creaba (activityCode null). Quitamos las 5 líneas SVC + 30 offerings de servicio. Si más adelante se quieren, van en el seed de `uengagement-up1`.

### 5. Reconciliación (¿nombres de campos/relaciones al día?)

Verificado contra `develop`:

- Satélite de sección: `rt__<RecordType>__curricularsection` (sufijo en minúscula), igual que `_data-univalle.js` y `_cleanup.js`. Nuestro loader ya lo generaba así, sin cambios.
- Offering / ActivityLine: mismo patrón que `_data-syllabus.js` (`activityLineId`, `orgUnitId`, term por `name`, `recordType:'Syllabus'`).
- Faculty: `recordType:'Faculty'` + `rt__Faculty__OrgUnit.upsert({OrgUnitId, institutionId})`.

### 6. requirement / graduation profile (¿fuera a propósito?)

**Fuera a propósito.** Se crean por UI/MCP; el editor de prerrequisitos es trabajo de UPONE-1378. Coincidimos con tu lectura.

---

## Mapeo curado -> mesh (por nombre, todas en la malla)

| Curado (antes) | Mesh `C-*` (ahora) | Nombre real | Faculty |
|---|---|---|---|
| MAT101 | C-CALCULOI-001 | Calculo I | UPU-FAC-CIE |
| SYL-CALC-101 | C-CALCULOII-006 | Calculo II | UPU-FAC-CIE |
| ALG102 | C-ALGEBRALIN-002 | Algebra Lineal | UPU-FAC-CIE |
| FIS103 | C-FISICAIIIO-020 | Fisica III: Ondas y Calor * | UPU-FAC-CIE |
| QUI104 | C-QUIMICAGEN-004 | Quimica General | UPU-FAC-CIE |
| EST106 | C-ESTADISTIC-107 | Estadistica | UPU-FAC-CIE |
| ING107 | C-INGLESTECN-239 | Ingles Tecnico | UPU-FAC-CIE |
| ECO108 | C-ECONOMIAPA-019 | Economia para Ingenieros | UPU-FAC-CIE |
| PRG105 | C-FUNDAMENTO-255 | Fundamentos de Programacion | UPU-FAC-ING |
| RED109 | RED109 | Redes de Computadores | UPU-FAC-ING |
| GES110 | C-GESTIONDEP-077 | Gestion de Proyectos | UPU-FAC-ING |
| 111026C | 111026C | Ecuaciones Diferenciales | UPU-FAC-CIE |
| TIR101 | (descartado) | Introduccion a las Redes (AIEP) | - |

\* Física no tiene "Física General" en el mesh; el contenido del syllabus es de mecánica. Al ser data dummy quedó bajo "Física III". Ajustable si prefieres otro código.

---

## Conteos finales del paquete (rev.2)

| Loader | Antes | Ahora |
|---|---|---|
| `_data-mesh.js` (Activities + categorías + planEntry) | 301 / 80 / 549 | 301 / 80 / 549 (sin cambio; + executionUnit poblado) |
| `_data-syllabus-sections.js` (secciones) | 374 (11 cursos curados) | 374 (11 cursos reales del mesh) |
| `_data-offerings.js` (líneas / offerings) | 18 / 160 (incl. servicios) | **12 / 120** (sin servicios, + 2 Faculties UPU) |
| `_data-changelog.js` | 162 | 162 (sin cambio) |

---

## Único punto abierto para ti (dueño del mod)

`develop` ya trae `_data-malla.js` (maqueta UPONE-1345: 4 líneas de formación + planEntry de 1 plan). Nuestro `_data-mesh.js` es la malla amplia (20 planes, 80 categorías, 549 planEntry).

**Decisión:** ¿convive o reemplaza a `_data-malla.js`?

- **Recomendación: convivir.** Son datasets con propósitos distintos y no chocan por claves naturales (requirementCategory por `[curriculumId, code]`, planEntry por `[planId, activityId, period, position]`). La maqueta sigue sirviendo para su demo puntual; el mesh da volumen para QA.

---

## Integración

El detalle de integración (qué pegar, qué copiar, orden en `seed.js`, idempotencia) está en `HANDOFF-SEED-EDU.md`, en la misma carpeta. Orden en `seed()`:

```
loadAcademicPrograms -> loadCurricula -> loadMallas -> loadSyllabusSections -> loadCourseOfferings -> loadChangeLog
```

`loadCourseOfferings` ahora crea las 2 Faculties antes de las líneas, así que no hay dependencia externa nueva.
