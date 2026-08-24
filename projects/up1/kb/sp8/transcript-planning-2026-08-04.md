# SP8 - Sprint Planning "Migración uAssessment" (2026-08-04)

> Registro de la coordinacion de SP8. Fuente: transcript "Migracion uAssessment - Sprint Planning" (Gemini, 2026-08-04, 01:16:21).
> Documento resultadista: recoge decisiones, asignaciones y preguntas abiertas, no la conversacion literal.

## Asistentes

Esteban Cortes Sandoval (PO/diseno), Eduardo Bacon, Juan Diego Galdames, Francisco Navarro, Camila Hernandez, Sandra Vargas.

## Decisiones de alcance

1. **Priorizar planes de estudio modulares sobre secuenciales.** El sprint extiende `curriculum-design` para soportar el diseno de planes modulares (hoy solo hay secuenciales completos).
2. **Matriz de competencia en 2 pasos.** La creacion de una matriz de competencia se hace en dos pasos: (1) crear la matriz con sus datos generales, (2) asociar los planes de estudio. Motivo: la UI actual no soporta crear un registro con multiples pestanas/pasos complejos en un solo guardado, y el enfoque de un solo paso arrastraba problemas de hidratacion de datos y errores heredados del legacy (al filtrar por facultad no aparecian los planes; al quitar una facultad quedaban relaciones colgando).
3. **Esquema de cobertura (Coverage Scheme) como version simplificada del esquema de niveles.** El componente ya acepta parametros de nivel, por lo que la implementacion es sensiblemente menor.
4. **El modelo del sistema prevalece sobre los datos del SIT.** Ante inconsistencias, se simplifican los datos del SIT para que sean consistentes con las capacidades ya implementadas, en vez de hacer ingenieria para casos aun no soportados. Se gestiona como tarea de menor prioridad.

## Asignaciones del sprint

| Responsable | Alcance |
|---|---|
| **Eduardo Bacon** | Logica de planes de estudio modulares y diseno curricular: config del plan modular (**UPONE-1538**), malla modular (**UPONE-1539**), fix alerta dirty (**UPONE-1540**). |
| **Francisco Navarro** | Extensiones de curriculum mapping: objeto Coverage Scheme (esquema de cobertura) y primera parte de las matrices de competencia (objeto Competency Node + vista). |
| **Esteban Cortes** | Refinar los requerimientos de las matrices de competencia. Subir la maqueta de planes de estudio. |
| **Juan Diego Galdames** | Solicitar actualizacion del curriculum mapping en dev. Revisar rol admin de la cuenta de Esteban. Consultar a Nelson el estado del ticket de Core que bloquea husky (tipado/lint). |

## Lo que nos toca (curriculum-design / Eduardo) este SP8

- **UPONE-1538** Configuracion de plan de estudio modular (cambio de dueno de inputs: pasan a depender de la progresion).
- **UPONE-1539** Configuracion de malla para plan modular (columnas = niveles derivados de requisitos).
- **UPONE-1540** Fix alerta erronea de cambios sin guardar al crear plan de estudio.

Restriccion transversal: aunque 1538 y 1539 vivan en el mismo componente de malla curricular, mantener **separacion de labores** (config del plan vs render de la malla) para preservar mantenibilidad.

## Fuera de nuestro alcance de detalle (otros responsables, mismo SP8)

- Coverage Scheme y primera parte de matriz de competencia (Competency Node + vista) -> Francisco/Esteban. Esteban adjunta la info; se consideran solo los cuatro niveles generales sin el aporte base en esta etapa.
- "Requisitos para consistencia SIT" -> tarea nueva en curriculum-design con prioridad menor (simplificar datos del SIT).

## Bloqueo externo

- Husky (chequeo de tipado y lint en commit) esta **bloqueado** por dependencias de Core que aun repercuten en test y tipado. Requiere cambios de librerias que exceden la jurisdiccion del mod. Pendiente confirmar timing con Nelson via chat de migracion; por ahora no se compromete en el sprint.

## Puntos de detalle capturados para los tickets

### UPONE-1538 - dueno de inputs por progresion
- Hoy los campos `creditos totales`, `periodos totales` y `tipo de periodo` estan disenados para el modelo secuencial y cuelgan del **tipo de plan de estudio**.
- Deben pasar a depender del **tipo de progresion** (Secuencial vs Modular):
  - `creditos totales`: **independiente** de la progresion (siempre visible).
  - `periodos totales`: solo si progresion = Secuencial (en modular la progresion depende de la inscripcion del estudiante, no de periodos fijos).
  - `tipo de periodo`: por confirmar si depende de la progresion o es dato general; Esteban lo investiga (no bloqueante mayor).
- La diferenciacion `tipo plan de estudio` (plan vs minor) se mantiene: la progresion cuelga del plan de estudio (el minor no tiene progresion). Es una subescala del tipo.
- Posible reajuste del orden de los campos en el formulario.

### UPONE-1539 - malla modular
- La malla modular dibuja las columnas como **niveles** (profundidad de dependencias), no como semestres fijos. Nivel = 1 + max(nivel de sus prerequisitos-curso presentes en el plan); lo que no tiene prerequisito queda en nivel 1.
- Comportamiento de la maqueta a homologar con lo ya implementado en malla curricular (logicas de prerequisito del SP anterior).
- Caso de flujo observado en la maqueta: al agregar una asignatura con prerequisitos, el sistema recuerda la accion y va exigiendo los prerequisitos faltantes hasta anadirlos todos en una unica accion consistente; hay que garantizar la consistencia de la seleccion al navegar hacia atras (no dejar acciones colgando ni seleccionadas si no se completaron).

### UPONE-1540 - alerta dirty erronea
- Sintoma: al entrar a crear un plan de estudio (o al ingresar en modo **view** sin editar) y volver atras, el formulario pide confirmacion de "vas a perder los cambios" a pesar de no haber cambios; ademas un campo se ve invalidado en rojo.
- Causa probable (analogia con curriculum mapping): al cargar los datos el componente hace un refresh y **transforma texto a numero**, lo que marca el formulario como `dirty` sin cambios reales del usuario. Francisco ya lo corrigio en el componente de curriculum mapping ajustando la carga para que la transformacion no dispare el dirty.
- Pendiente: confirmar si en plan de estudio lo dispara el mismo componente/transformacion o algo que viene de Core. Investigar el flujo de creacion de plan de estudio; parece limitarse a ese flujo.

## Referencias

- Maqueta: `mockup_v10.html` (curriculum design, comparador de malla D1/D2/D3, modo construccion, estrategia de prerequisitos al agregar).
- Tickets base Jira: UPONE-1538, UPONE-1539, UPONE-1540 (epic UPONE-1267 Curriculum Design).
- Hilos SP8 relacionados (otros responsables): `curriculum-mapping-desglose-tickets.html`, `contra-analisis-3-cambios-verificacion.html`.
