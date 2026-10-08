---
id: DOC-vigencia-documentos-10-8-caso-ici
project: up1
type: doc
module: curriculum-design
tags: [vigencia, workflow, estados, versionamiento, curriculum-design, curriculum-mapping, sp12]
source: https://claude.ai/artifact/RQyrVMBvpq7WQTQb15CHdo
---
# Parte 10: 8 · Caso de ejemplo: ICI de 2020 a 2033

> Grupo: Parte funcional · Parte 10 de 17 · Líneas 922 a 1000 del original · [Índice](../00-INDICE.md)

**Ver en HTML (mismo estilo del original):** [10-8-caso-ici.html](10-8-caso-ici.html)

## Qué dice esta parte

Recorre nueve escenarios (A a I) con el plan ICI v1 y su reforma v2: publicar, matricular a Ana, corrección de nombre, ajuste de semestre, reforma, reforma de un curso compartido (Cálculo I), sílabo del periodo, matriz de competencias y arrepentirse (retiro). Cada escenario compara 'hoy' con 'regla'. Es la mejor parte para validar el modelo con alguien de negocio, porque cada caso es concreto.

## Dónde se habló en la reunión (6 oct 2026)

00:53:13 a 00:56:58. Transcripción: `records/TRANSCRIPT-2026-10-06-modelamiento-flujo-estatus-reglas-uassessment.md`.

## Verificado contra el código (8 oct 2026)

- Los escenarios de 'hoy' (por ejemplo 'v1 sigue Active para siempre') son consistentes con el enum actual, pero no se reprodujeron en un tenant.

## Decisiones y preguntas ligadas

D1 (la malla apunta a versión o a linaje) y D2 (versiones de matriz) aparecen en los escenarios F y H.

## Fragmento del documento (texto del artefacto)

```text
8 · Caso de ejemplo
Ingeniería Civil Industrial, de 2020 a 2033
Universidad ficticia. Plan ICI v1 (Plan 2020, 300 créditos), su reforma ICI v2 (Plan 2027) y Ana, de la cohorte 2021.
2020
2021
2022
2023
2024
2025
2026
2027
2028
2029
2030
2031
2032
2033
Eventosescenarios A-I
Av1 rige
Bingresa Ana
Cerrata
Dajuste
Ereforma v2
Ev2 rige
Ev1 cierra
Otros eventossílabo, retiro, programa
Gsílabo 2025-1
Iretiro posible de v2 (programado)
FCAL101 v2 rige
Matrizcompetencias genéricas
Hmatriz v2 adoptada
ICI v1Plan 2020
Vigente · recibe ingresos
En extinción · sin ingresos
Cerrado
ICI v2Plan 2027
Draft
Programado
Vigente · recibe ingresos
Anacohorte 2021 · PlanEnrollment → v1
Cohorte 2027PlanEnrollment → v2
VigenteProgramadoEn extinciónCerradoCohorte cursando
A
Publicar el plan
Borrador → Revisión → Aprobado, con las capabilities actuales
En 2019 se registra el acto (Decreto 123/2019) con validFrom 2020-1: queda Programado hasta esa fecha
"Poner en vigencia" corre los gates de hoy (tributación al 100 %)
Curriculum.statusvalidFromApprovalAct
B
Matricular la cohorte
Ana ingresa en 2021-1
Se le asigna la versión abierta a ingreso en esa fecha
ProgramEnrollment.cohortPlanEnrollment.curriculumIdreason=Initial
C
Corrección
En ICI v1 (Vigente), el campo Nombre muestra la acción "Corregir"; los créditos muestran "Nueva versión"
Al guardar "Ingeniería Civil Industrial", el sistema pide un comentario: "Errata en el nombre"
El guard verifica: vigencia Vigente, Curriculum.name es correctable y el usuario tiene curriculum:correct
Se guarda en el mismo registro. Queda un ChangeRequest de tipo corrección, aprobado automáticamente, con el antes y el después, más core_DataLog
No cambia la versión ni la vigencia. Ana no se ve afectada
Si intenta "corregir" totalCredits, el servidor responde FIELD_REQUIRES_NEW_VERSION y ofrece crear la versión nueva
HoyEdición libre, sin registroReglacurriculum:correct + comentario + registro
D
Ajuste
Cálculo II pasa al semestre 3 y se quita un prerrequisito
Lo aprueba el director de escuela
Aplica a Ana en lo que aún no cursó
HoyRechazado sin salidaReglaChangeRequest Adjustment sobre v1
E
Reforma
asNewVersion crea v2 en Draft con malla y secciones copiadas
Se carga la tabla de equivalencias v1 → v2
Al publicar v2, v1 recibe admissionUntil 2026-2 automáticamente
Ana sigue en v1 o migra con reason=PlanChange
Hoyv1 sigue Active para siempreReglav1 pasa a En extinción y luego a Cerrado
F
Reforma de Cálculo I
CAL101 v2 cambia sus RA y rige desde 2027-1
¿Qué versión ven los 12 planes que usan Cálculo I? Ver decisión D1
Activity.previousVersionIdplanEntry.activityId
G
Sílabo del periodo
Durante el periodo: editable, con registro de cambios. Es operación docente
Opcional por institución: bloquear la evaluación desde el inicio
Al cierre del periodo: inmutable completo
Offering.termIdlifecycleStatusEvaluationComponent.weight
H
Matriz de competencias
Mejorar un descriptor o una rúbrica: ajuste
Agregar "Sostenibilidad": reforma con versión nueva
Se cierra la adopción de v1 y se abre la de v2 (requiere la decisión D2)
HoyEdición libre, afecta en silencio a todos los planesReglaCada cohorte se mide con la matriz de su plan
I
Arrepentirse
v2 Programado con un error: se retira la publicación y vuelve a borrador
Un plan Vigente publicado la semana pasada, sin matrículas: también se puede retirar
v1 Vigente con Ana: no se puede retirar; se corrige, se ajusta o se versiona
*:revertdocumentDependents.jsREVERT_HAS_ACTIVE_DEPENDENTS
```
