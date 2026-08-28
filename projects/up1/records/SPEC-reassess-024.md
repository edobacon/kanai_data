---
id: SPEC-reassess-024
project: up1
type: doc
module: reassess
tags:
  - assessment
  - reassess
  - clientes
  - validacion
  - uniandes
  - ust-cft
  - anahuac
  - upc
  - arquetipos
  - incidentes
  - migracion
---

# 14 — Validacion Contra el Informe: Caso por Caso, Cliente por Cliente

Este documento toma cada hallazgo del analisis tecnico (docs 01-13) y lo valida contra los datos especificos del informe ReAssess — los clientes entrevistados, sus citas, sus incidentes, y las propuestas del informe. El objetivo es mostrar como cada problema tecnico se manifiesta en la experiencia real de las universidades, y como cada propuesta del informe se ve afectada por la realidad del codigo.

---

## Los cuatro clientes del informe

El informe entrevisto a cuatro universidades, seleccionadas por su diversidad en modelos de gestion curricular, nivel de integracion tecnologica y grado de adopcion.

| Universidad | Pais | Interes principal | Cobertura | Arquetipo |
|-------------|------|------------------|-----------|-----------|
| **Uniandes** | Colombia | Gestion curricular | A nivel de facultad | Descentralizada |
| **UST-CFT** | Chile | Evaluacion de competencias | Multi-institucion | Centralizada |
| **Anahuac** | Mexico | Evaluacion de competencias | Multi-institucion | En transicion |
| **UPC** | Peru | Gestion curricular | Institucional | Centralizada |

Ademas, el sistema actual sirve a **56 universidades** con plantillas personalizadas en `report-templates/`. Los cuatro entrevistados representan una fraccion de la base de clientes, pero son representativos de los tres arquetipos.

---

## Caso 1: Universidad de los Andes (Uniandes) — Colombia

### Perfil segun el informe
- **Arquetipo**: Descentralizada — alta libertad de catedra, docentes especialistas interactuan con comites academicos, usan datos periodicamente.
- **Interes**: Gestion curricular a nivel de facultad (no institucional).
- **Cobertura**: Solo a nivel de facultad.

### Lo que reporta el informe

**Perdida de trabajo ya realizado** (pag. 11): Se reporta perdida de informacion, reforzando la percepcion de falta de fiabilidad.

**Integracion con Brightspace** (pag. 10): Necesitan integracion mas profunda con Brightspace para trazabilidad pedagogica y evaluativa.

**Indicadores desagregados** (pag. 10): El instrumento que utilizan para evaluacion de competencias es por niveles de desempeno. Requieren visualizaciones complementarias de calificaciones.

### Como se refleja en el sistema actual

#### La perdida de datos: BUG-012 en accion

El informe dice que Uniandes reporta "perdida de trabajo ya realizado". Nuestro analisis tecnico identifico exactamente el mecanismo que puede causarlo:

**BUG-012** (severity HIGH): La funcion `_setCompetencyLevelOutcome` en `syllabus_model.js` desactiva todos los vinculos existentes entre resultados de aprendizaje y niveles de competencia antes de crear los nuevos. Si la creacion falla — por un timeout de red, un error de validacion, o cualquier interrupcion — los vinculos quedan desactivados sin reemplazo. No hay transaccion de base de datos que proteja la operacion.

En el contexto de Uniandes, esto se traduce asi: un docente especialista que trabaja periodicamente en su seccion tributa resultados de aprendizaje a competencias. Si la operacion falla a mitad, el docente no recibe error (los errores se "tragan" silenciosamente en las funciones antiguas de `syllabus_service.js`), pero los datos desaparecen. Cuando el comite academico revisa los reportes de logro de competencias, las secciones afectadas no muestran datos. Nadie sabe que paso ni cuando.

**Agravante**: Uniandes opera a nivel de facultad, no institucional. Esto significa que cada facultad puede tener sus propias matrices de competencias y sus propias tributaciones. La query de permisos (`_getSyllabusStructure` con 9 ramas UNION) tiene que resolver si el usuario tiene acceso via la cadena facultad→carrera→pensum→seccion. A mayor complejidad jerarquica, mayor probabilidad de que una consulta sea lenta, y mayor probabilidad de timeout en operaciones de escritura como la tributacion.

#### La integracion con Brightspace: ausencia total

El informe indica que Uniandes necesita integracion con Brightspace para trazabilidad pedagogica. El codigo confirma que **no existe ninguna integracion con Brightspace ni con ningun LMS**. La unica integracion activa es con UTEC Assessment (especifica de UTEC Peru) y el gateway de cursos para otros modulos de la plataforma.

Las notas de estudiantes (necesarias para calcular logro de competencias) vienen de `asm_student_marks`, que pertenece al modulo Class. Uniandes necesitaria que las notas fluyeran desde Brightspace → Class → Assessment. Pero esa cadena no existe.

#### Indicadores por niveles de desempeno

Uniandes mide competencias por niveles de desempeno. El sistema actual tiene DOS formas de hacerlo:
- **Graduation Profile**: Niveles configurables por universidad (en tablas `imp_levelscheme_level_thresholds`). Es la opcion correcta para Uniandes.
- **Milestone**: Niveles hardcodeados en JavaScript (0-30-59-72-85-100%). No configurable.

Si Uniandes usa Graduation Profile, la funcionalidad existe pero depende de que la tributacion este completa y los vinculos no se hayan corrompido (ver BUG-012). Si usa Milestone, los niveles no son personalizables.

Ademas, el informe dice que necesitan "visualizaciones complementarias de calificaciones". Los reportes custom Vue (graduation-profile-teacher, graduation-results-teacher) soportan esto con tablas y graficos D3. Pero los reportes de milestone (individual, grupal, global) — que son los mas ricos en visualizacion — no validan permisos en el backend (DEC-007), lo que genera un riesgo de seguridad.

### Consideraciones para uP1

Uniandes representa el caso mas critico para la migracion:
1. **BUG-012 debe corregirse antes de migrar** — si se migran datos corruptos, se heredan los problemas.
2. **La integracion con Brightspace es prioritaria** — uP1 la especifica (CAP-ASM-037) pero debe estar implementada antes de activar Uniandes en uP1.
3. **El modelo descentralizado de Uniandes** requiere que la libertad evaluativa configurable (BR-LIB-001) funcione correctamente — si un docente puede modificar tributaciones sin propagacion automatica, el problema se repite.

---

## Caso 2: Universidad Santo Tomas / CFT (UST-CFT) — Chile

### Perfil segun el informe
- **Arquetipo**: Centralizada — procesos estandarizados, menor libertad de catedra.
- **Interes**: Evaluacion de competencias.
- **Cobertura**: Multi-institucion (la UST tiene multiples sedes y un CFT asociado).

### Lo que reporta el informe

**Integracion con Banner** (pag. 10): Necesitan integracion con Banner (Ellucian) para la importacion de calificaciones finales.

### Como se refleja en el sistema actual

#### Integracion con Banner: ausencia total

El codigo confirma que no hay integracion con Banner. Las notas vienen de `asm_student_marks` (modulo Class). UST-CFT necesita que las calificaciones finales de Banner alimenten los reportes de logro de competencias.

#### Multi-institucion: la complejidad del multi-tenant actual

UST-CFT tiene "cobertura en mas de una institucion". En el sistema actual, cada instalacion corresponde a una institucion (`upl_institutions`). Si UST y CFT son instituciones separadas, necesitan instalaciones separadas con configuraciones independientes.

El mecanismo de discriminacion por cliente se basa en variables de entorno (`clientTemplate`, `clientName`), no en la base de datos. Esto implica que una instalacion del servidor solo puede servir a un "cliente" a la vez. Para atender UST y CFT como entidades separadas con plantillas diferentes, se necesitan dos instancias del servidor o un mecanismo de routing que no existe.

**Hallazgo en el codigo**: La carpeta `report-templates/` tiene `ust/` como directorio de plantillas. No hay `cft/` separado, lo que sugiere que ambas instituciones comparten las mismas plantillas. Si el CFT necesitara un formato diferente para sus reportes, requeriria crear una carpeta nueva y desplegar.

#### Logica condicional especifica

Encontramos en el codigo logica especifica para **Santo Tomas** (`stotomas`) en `public/report/service.js`: transformaciones especiales para codigos de curso que contienen guiones bajos o puntos. Este tipo de logica condicional por cliente (`if (clientName === 'stotomas')`) es exactamente lo que el informe detecta como "rigidez" — cada particularidad del cliente se resuelve con codigo, no con configuracion.

#### Centralizada pero limitada en reportes

Siendo una institucion centralizada con procesos estandarizados, UST-CFT deberia ser la que mejor adopta la herramienta. El informe lo confirma — la adopcion es mas facil en instituciones centralizadas. Sin embargo, la falta de integracion con Banner obliga a cargar datos manualmente, y la ausencia de metricas claras de logro de competencias reduce el valor percibido.

Los reportes V2 tienen doble validacion de permisos (frontend + backend) — esto es correcto para una institucion multi-sede que necesita controlar quien ve que. Pero los reportes de milestone no tienen validacion backend, lo que podria ser un problema para una institucion con multiples roles y sedes.

### Consideraciones para uP1

1. **Integracion con Banner es critica para UST-CFT** — uP1 la especifica via Ethos API (CAP-ASM-035).
2. **El modelo multi-tenant de uP1 resuelve el problema multi-institucion** — cada sede/institucion puede ser un tenant con su propia configuracion.
3. **La logica de transformacion de codigos de Santo Tomas** debe migrarse como configuracion por tenant, no como `if/else` en resolvers.

---

## Caso 3: Universidad Anahuac — Mexico

### Perfil segun el informe
- **Arquetipo**: En transicion — opera semi centralizada pero carece de claridad sobre como medir y que reportar.
- **Interes**: Evaluacion de competencias.
- **Cobertura**: Multi-institucion.

### Lo que reporta el informe

**Planes magisteriales y supervision jerarquica** (pag. 10-11): Opera con planes magisteriales, supervision jerarquica y uso de LMS para acceso estudiantil. Demanda flujos e integraciones especificas.

### Como se refleja en el sistema actual

#### Supervision jerarquica: el sistema de permisos no alcanza

Anahuac necesita supervision jerarquica — un decano supervisa coordinadores, que supervisan docentes. El sistema actual resuelve permisos con 9 ramas UNION en SQL, pero esas ramas son fijas: profesor, asistente, coordinador, estudiante, admin por seccion/curso/unidad/facultad/carrera. No hay un concepto de "decano" ni de "supervisor de coordinadores".

Para agregar un nivel jerarquico nuevo se debe modificar la query SQL en **cada modulo** (syllabus, pensums, competencias, reportes). No hay un servicio centralizado de permisos que permita configurar jerarquias.

El informe propone "definir permisos y flujos de aprobacion adaptados a la estructura organizacional" (pag. 14). Esto es exactamente lo que el sistema actual no puede hacer sin cambios en el codigo SQL de cada modulo.

#### LMS para acceso estudiantil

Anahuac usa un LMS para que los estudiantes accedan a contenido. El sistema actual no tiene integracion con LMS. El unico endpoint que podria ser relevante es `getPublicSyllabus` (descarga publica de syllabus), pero no es una integracion bidireccional con un LMS.

#### "En transicion" y el motor de formularios

Anahuac "carece de claridad sobre como medir y que reportar". Esto implica que necesitan experimentar con diferentes configuraciones de formularios, diferentes campos, diferentes metricas. Pero el motor de formularios (`structure.helper.js` con `eval()`) no es modificable por el usuario — cada cambio en la configuracion de campos requiere intervencion del equipo tecnico de uPlanner en la tabla `imp_program_structure`.

El informe recomienda "asesoria experta para definir procesos antes de configurar la herramienta" (pag. 14). Desde la perspectiva tecnica, esto significa que Anahuac necesitara **multiples iteraciones de configuracion** — probar una estructura, evaluar, ajustar, volver a probar. Con el motor actual (cambio en BD → deployment → verificacion), cada iteracion tiene un costo operacional alto.

### Consideraciones para uP1

1. **RBAC con contextos jerarquicos de uP1** resuelve la supervision jerarquica sin queries SQL fijas.
2. **La libertad evaluativa configurable** (Restringido/Guiado/Libre) permite que Anahuac experimente sin cambios de codigo.
3. **La integracion con LMS** esta especificada en uP1 pero debe implementarse antes de activar Anahuac.
4. **La asesoria experta** que recomienda el informe es especialmente relevante para Anahuac — la herramienta sola no resuelve la falta de consenso institucional.

---

## Caso 4: Universidad Peruana de Ciencias Aplicadas (UPC) — Peru

### Perfil segun el informe
- **Arquetipo**: Centralizada — procesos claros, mayor facilidad de adopcion.
- **Interes**: Gestion curricular (no evaluacion de competencias).
- **Cobertura**: Institucional.

### Lo que reporta el informe

**Usa assessment solo para mapeo curricular** (pag. 10): UPC usa uAssessment para mapeo curricular, pero NO para evaluacion ni reporteria. Requiere diseno de curso detallado y trazabilidad fina.

**Fallas en gestion de bibliografia** (pag. 11): Se reportan fallas recurrentes en la gestion de bibliografia, con enlaces incorrectos y riesgo operativo.

**Avance en carga y aprobacion de syllabus** (pag. 10): Necesita indicadores de avance en carga, revision y aprobacion de syllabus que hoy no existen.

### Como se refleja en el sistema actual

#### Solo mapeo curricular: el valor parcial

UPC es un caso revelador porque **usa uAssessment para lo que menos valor diferencial tiene** — gestion documental — y no para lo que justifica el producto — evaluacion de competencias. Esto puede deberse a que:

1. La interfaz de competencias esta 100% en AngularJS (la mas vieja y menos usable).
2. Los reportes de logro no tienen las metricas que UPC necesita.
3. UPC requiere "diseno de curso detallado y trazabilidad fina" — y el sistema actual de formularios dinamicos puede no ser suficientemente granular.

Desde el codigo, "diseno de curso detallado" implica que UPC necesita campos muy especificos en el programa de curso que otras universidades no tienen. El motor de `imp_program_structure` permite esto en teoria, pero cada campo nuevo requiere configuracion tecnica. Si UPC necesita 20 campos diferentes a los demas, son 20 configuraciones manuales que alguien de uPlanner debe hacer.

#### Bibliografia con enlaces incorrectos

El informe reporta fallas en gestion de bibliografia con enlaces incorrectos. En el codigo, las referencias bibliograficas se almacenan en `imp_course_references` (60k filas) e `imp_section_references` (396k filas). Las tablas tienen campos para URL, tipo de referencia, formato de citacion, etc.

El sistema de citacion (`citation/` module) tiene un mecanismo de **migracion de formato** (`GET /migration`) que cambia el estilo de cita (APA, MLA, Chicago) para todas las referencias de un scope (seccion o curso). Si una migracion de formato falla parcialmente — y no hay transacciones en el codigo — algunas referencias quedarian con formato viejo y otras con formato nuevo. Los "enlaces incorrectos" que reporta UPC podrian ser resultado de una migracion de citacion parcialmente ejecutada.

**Hallazgo**: La funcion `checkReferenceUsed` verifica si una referencia esta en uso antes de modificarla, lo cual es correcto. Pero la migracion masiva de formato no tiene la misma proteccion — opera sobre un scope completo sin verificacion individual.

#### Indicadores de avance de syllabus

UPC necesita saber "cuantos syllabus estan cargados, cuantos en revision, cuantos aprobados". Esta funcionalidad existe parcialmente:
- En la lista Vue de syllabus (`/assessment/syllabus/maintainer`), hay badges con conteo de estados.
- El reporte de seguimiento de syllabus (`/assessment/reports/syllabus-tracking`) esta en AngularJS (iframe) y muestra avance por estado.

Pero "indicadores de avance" implica mas que conteo de estados — UPC probablemente necesita:
- Porcentaje de completitud por seccion (cuantos campos del formulario estan llenos).
- Comparacion entre periodos (este semestre vs el anterior).
- Alertas de secciones atrasadas.

Nada de esto existe en el sistema actual. Los conteos de estado son el unico indicador disponible.

#### Trazabilidad fina

"Trazabilidad fina" significa poder ver quien cambio que, cuando y por que. El sistema actual tiene `imp_changes_history` pero sin auditoria inmutable — los registros pueden modificarse. No hay un log que conecte cambios en un curso con cambios en los syllabus derivados.

### Consideraciones para uP1

1. **El Layout Engine de uP1** permite que UPC configure sus propios campos sin intervencion tecnica — resuelve el "diseno de curso detallado".
2. **El sistema de workflows con auditoria inmutable** de uP1 resuelve la trazabilidad fina.
3. **Los indicadores de avance** deben implementarse como campos calculados en RecordList — conteo de estados + completitud de formulario + comparacion temporal.
4. **La migracion de datos de bibliografia** (396k filas en `imp_section_references`) requiere verificacion de integridad de URLs antes de migrar.

---

## Cruce transversal: los 56 clientes y los 3 arquetipos

### Lo que el informe dice sobre los arquetipos

El informe clasifica instituciones en tres arquetipos segun la facilidad de adopcion:

| Arquetipo | Caracteristicas | Estrategia propuesta |
|-----------|----------------|---------------------|
| Centralizada (UST-CFT, UPC) | Procesos claros, menor libertad de catedra | Configuracion directa + capacitacion de Super Admin |
| En transicion (Anahuac) | Semi centralizada, sin claridad en medicion | Asesoria experta + configuracion iterativa |
| Descentralizada (Uniandes) | Alta libertad de catedra, sin consenso | Asesoria complementaria + acompanamiento |

### Como se refleja en el sistema actual con los 56 clientes

El directorio `report-templates/` tiene 56 carpetas, cada una representando un cliente con sus propias plantillas. Esto confirma que la diversidad institucional es real — no son 56 copias del mismo sistema, son 56 configuraciones diferentes.

**Clientes con carpeta propia que tambien aparecen en el informe:**
- `uniandes/` — Presente. Plantillas personalizadas para Uniandes.
- `ust/` — Presente como "ust". No hay carpeta separada para CFT.
- `anahuac/` — Presente. Plantillas personalizadas para Anahuac.
- `upc/` — Presente. Plantillas personalizadas para UPC.

**Clientes con logica condicional en el codigo:**
- `stotomas` — Tiene transformaciones especiales de codigos de curso hardcodeadas en JavaScript.
- Los demas clientes se discriminan solo por plantilla, no por logica de codigo.

Esto sugiere que la mayoria de los 56 clientes usan la misma logica con diferentes plantillas de documentos. Las excepciones (como Santo Tomas) son pocos pero representan un riesgo: cada `if (clientName === 'X')` en el codigo es una bomba de tiempo que puede afectar a otros clientes si se modifica incorrectamente.

### Los arquetipos y la escalabilidad del sistema

| Arquetipo | Que necesita del sistema | Lo que el sistema actual soporta | Gap |
|-----------|--------------------------|--------------------------------|-----|
| Centralizada | Configuracion estandar, reportes claros, flujos predecibles | Workflows configurables, conteo de estados, plantillas por cliente | **Reportes insuficientes** (no hay metricas de logro claras), **sin integraciones** (Banner, LMS) |
| En transicion | Configuracion iterativa, experimentacion, asesoria | Motor de formularios dinamicos (pero no self-service), catalogos | **Motor no extensible sin intervencion tecnica**, sin self-service, sin asesoria integrada |
| Descentralizada | Flexibilidad por facultad, permisos granulares, autonomia | Permisos por 9 ramas (pero fijas), competencias por nivel (pero con bugs) | **Permisos no extensibles**, BUG-012, **sin propagacion automatica de tributacion** |

---

## Validacion de las propuestas del informe contra la realidad tecnica

### Propuesta: Modulo 1 (Curriculum Management) como entry point

**Informe** (pag. 15): Menor precio, carga masiva con IA, gestor de versiones de planes.

**Realidad tecnica**: La carga masiva actual es CSV sincrono sin preview. La IA no existe. Las 56 carpetas de plantillas muestran que la exportacion de documentos es critica para los clientes. Si el Modulo 1 de uP1 no permite generar documentos con el formato que cada universidad necesita desde el dia 1, la adopcion se frena.

**Riesgo**: El informe asume que la carga masiva con IA sera suficiente para atraer clientes al Modulo 1. Pero los clientes actuales (56) ya tienen sus datos en el sistema viejo con plantillas personalizadas. La migracion del Modulo 1 no es solo "cargar datos nuevos" — es tambien "migrar los datos existentes y las plantillas".

### Propuesta: Modulo 2 (Curriculum Mapping) con simuladores IA

**Informe** (pag. 18-19): Heatmap de tributacion, comparador de planes, estrategias de evaluacion con IA.

**Realidad tecnica**: El dominio de competencias esta 100% en AngularJS sin migracion a Vue. La tributacion tiene un bug critico (BUG-012). Las dos cadenas de medicion (Graduation + Milestone) no se integran.

**Riesgo**: El informe propone como nueva funcionalidad (heatmap, comparadores) cosas que el sistema actual ya hace parcialmente pero con una implementacion fragil. uP1 no solo debe implementar los simuladores IA — tambien debe corregir los problemas fundamentales de la tributacion antes de construir sobre ella.

### Propuesta: Modulo 3 (uAssessment) con reporteria personalizable

**Informe** (pag. 21): Monitoreo de logro, reporteria personalizable por rol, descarga masiva de datos.

**Realidad tecnica**: Los reportes V2 existen (45+ endpoints) pero tienen 40+ plantillas hardcodeadas, una query de 14 tablas como cuello de botella, dos cadenas de medicion divergentes, y niveles de logro de milestone hardcodeados en JavaScript.

**Riesgo**: El informe dice "reporteria personalizable por el Super Admin". Pero personalizar reportes hoy significa cambiar codigo (plantillas .docx, consultas SQL, formateo en JavaScript). Para que uP1 cumpla esta promesa, necesita que Report Builder + layouts JSON reemplacen completamente el modelo actual de reportes — no basta con migrar los reportes existentes.

### Propuesta: Rol Super Admin

**Informe** (pag. 22-23): Configurar identidad, lenguaje, roles, reporteria, gestionar incidencias — sin intermediarios.

**Realidad tecnica**: 
- **Identidad visual**: Las plantillas son archivos .docx por carpeta de cliente, seleccionados por variable de entorno. No hay UI para cambiarlas.
- **Lenguaje**: Las traducciones estan en archivos JSON en el repositorio `lang/`. Cambiar una etiqueta requiere commit + deploy.
- **Roles**: Los permisos estan en queries SQL de 9 ramas. Agregar un rol nuevo (como "Super Admin") requiere modificar SQL en cada modulo.
- **Reporteria**: 40+ plantillas en codigo + 2 librerias de Excel + logica de niveles hardcodeada.
- **Incidencias**: No existe modulo de ticketing.

El gap entre lo que propone el informe y lo que el sistema actual puede hacer es **enorme**. El viaje propuesto para el Super Admin (Tabla 3 del informe, pag. 23) asume capacidades que no solo no existen sino que la arquitectura actual hace dificil de implementar. uP1 tiene la oportunidad de construir esto desde cero.

### Propuesta: Estabilidad tecnica como condicion habilitante

**Informe** (pag. 22): "Las limitaciones tecnicas persistentes tienden a desvalorizar incluso funcionalidades conceptualmente solidas."

**Realidad tecnica**: Esta es la conclusion mas importante del informe y la mas validada por el codigo:
- BUG-012 puede causar perdida silenciosa de datos de tributacion.
- Cero transacciones en 17,000 lineas de SQL.
- Errores silenciosos en funciones antiguas del service.
- Clonacion masiva sin rollback ni estado persistente.
- `eval()` como mecanismo de dispatch de funciones.

**Conclusiones del informe** (pag. 24-25): "El exito del rediseno dependerá de la instalacion de capacidades institucionales, de la definicion clara de procedimientos para la medicion de competencias y de una gobernanza efectiva de los datos."

Desde la perspectiva tecnica: la "gobernanza efectiva de los datos" requiere primero que los datos sean confiables. Con BUG-012 activo, con ausencia total de transacciones, y con errores que se swallowean sin log, la gobernanza de datos es una aspiracion, no una realidad.

---

## Resumen: que significa todo esto para la migracion

| Cliente | Problema principal del informe | Causa tecnica principal | Que debe tener uP1 antes de migrar este cliente |
|---------|-------------------------------|------------------------|------------------------------------------------|
| **Uniandes** | Perdida de datos | BUG-012 (vinculos huerfanos) + sin transacciones | Fix de BUG-012, integracion Brightspace, propagacion automatica de tributacion |
| **UST-CFT** | Sin integracion Banner | Ausencia total de integraciones + multi-tenant limitado | Integracion Banner (Ethos API), multi-tenant real por sede |
| **Anahuac** | Rigidez de roles y flujos | Permisos en 9 ramas SQL fijas + motor de formularios no extensible | RBAC jerarquico, libertad evaluativa configurable, integracion LMS |
| **UPC** | Bibliografia rota + reportes insuficientes | Sin transacciones en migracion de citacion + reportes no configurables | Layouts JSON para reportes, auditoria inmutable, indicadores de avance |
| **Los 56** | Cada cambio requiere deployment | 56 plantillas en codigo, logica condicional por cliente | i18n self-service, layouts configurables por datos, theming por tenant |
