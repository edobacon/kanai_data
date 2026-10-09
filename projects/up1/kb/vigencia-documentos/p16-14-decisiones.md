---
id: DOC-kb-vigencia-documentos-p16-14-decisiones
project: up1
type: doc
module: curriculum-design
tags:
  - vigencia
  - workflow
  - estados
  - versionamiento
  - sp12
---

# Vigencia 16: 14 Decisiones

> Grupo: Parte técnica · Parte 16 de 17 · Líneas 1358 a 1446 del original · [Índice](00-indice.md)

**Ver en HTML (mismo estilo del original):** [p16-14-decisiones.html](p16-14-decisiones.html)

## Qué dice esta parte

Dos decisiones definidas (retiro de publicación y tratamiento del sílabo) y ocho por decidir: D1 malla a versión o linaje, D2 versiones de matriz, D3 flujo del ajuste, D4 significado de `retired`, D5 estados por institución, D6 ubicación del guard, D7 ramas de versiones, D8 insignia por campo. Más dos puntos a validar (catálogo de acciones y umbrales). En la reunión quedó además pendiente validar con Sandra y Cami, con instituciones piloto (Ulima, Univay) y una segunda sesión antes de presentar a Klaus.

## Dónde se habló en la reunión (6 oct 2026)

00:31:27 a 00:38:31, 00:43:54 y 01:18:34 a 01:22:50. Transcripción: `TRANSCRIPT-2026-10-06-modelamiento-flujo-estatus-reglas-uassessment` (records).

## Verificado contra el código (8 oct 2026)

- Sin verificación adicional: son decisiones de producto y diseño.

## Decisiones y preguntas ligadas

Todas. Es la parte que alimenta la siguiente sesión de revisión.

## Fragmento del documento (texto del artefacto)

```text
14 · Decisiones
Qué está definido y qué falta decidir
Incluye lo conversado en la primera sesión de refinamiento con desarrollo.
Definido
Definido · Retiro
¿Se puede volver de publicado a edición?
Solo como retiro de la publicación: desde Programado o Vigente, sin dependientes, con permiso y comentario. Desde En extinción o Cerrado, nunca.
Detalle en la sección 5.
Definido · Sílabo
¿Qué se bloquea en el sílabo y cuándo?
Es operativo: existe durante su periodo y lo reemplaza el siguiente. Lo que se protege es el diseño (plan, programa, matriz).
Por defecto, sin bloqueo durante el periodo y con registro de cambios; inmutable al cierre. La institución puede activar el bloqueo de la evaluación desde el inicio.
Por decidir
D1 · Modelo
¿La malla apunta a una versión del programa de asignatura o a su linaje?
a) A la versión (hoy): planEntry→CAL101 v1. Cada reforma de Cálculo I obliga a tramitar un cambio en cada plan que lo usa.
b) Al linaje: planEntry→CAL101 (periodo →v2). La versión se resuelve por periodo, como en Kuali o Banner.
Recomendación: b), con análisis de impacto propio sobre planEntry y el selector de malla.
D2 · Modelo
¿La matriz de competencias pasa a tener linaje de versiones?
Hoy no tiene version ni previousVersionId. Sin linaje no hay reforma con transición: agregar una competencia afecta a todos los planes que la adoptaron.
Recomendación: sí, y que MatrixAdoption apunte a la versión.
D3 · Funcional
¿El ajuste tiene su propio flujo de aprobación?
Surgió en la sesión. El ajuste (ChangeRequest) necesita una aprobación liviana, pero puede crecer en reglas y pasos.
Por definir: un paso de aprobación con permiso propio, o un flujo configurable como el de los documentos.
D4 · Funcional
¿Qué significa el rol retired en cada tipo de documento?
En el plan es cerrar el ingreso de estudiantes. En el programa de asignatura o la matriz puede no aplicar igual.
Revisar el significado de cada rol por tipo de documento.
D5 · Core
¿Cómo configura cada institución sus estados y cómo se guardan?
Hoy el editor de estados por institución de up1-manager solo cubre campos custom; el status de los documentos es un enum físico de Postgres igual para todos. a) Texto validado contra un catálogo de estados por tenant, editable en runtime. b) Enum generado por tenant con codegen y una migración por cada cambio.
Recomendación: a), sobre el default del mod, con rol por estado y validación al guardar la configuración.
D6 · Core
¿Dónde vive el guard?
a) En los hooks beforeCreate/beforeUpdate más una función exportada que los resolvers de mods invocan: simple, pero depende de disciplina y tests. b) En la capa de datos, como extensión del cliente Prisma por tenant: cubre todo, pero es más invasivo.
Recomendación: a), con test de contrato obligatorio y hook beforeDelete; evaluar b) si aparecen caminos sin cubrir.
D7 · Core
¿Se permiten ramas de versiones?
Hoy se puede versionar desde una versión intermedia. Con vigencias sin solape, una rama rompe la regla de una sola versión abierta a ingreso.
Recomendación: solo desde la última versión del linaje.
D8 · Core
¿La insignia por campo del formulario la soporta el core?
Mostrar en cada campo si se corrige, se ajusta o requiere nueva versión modifica RecordDetail, que es un componente del core.
Conversarlo con Klaus: soporte en core (getEditability) o fork en el mod.
Validar
Catálogo de acciones
Clasificación propuesta de cada acción de curriculum-design y curriculum-mapping. Faltan academic-scheduling, uengagement y la medición de logro.
Revisar acción por acción con los dueños de cada mod y sumar los módulos faltantes.
Validar
Umbrales de reforma y ajuste
Varían entre instituciones (UACh trata como menor lo que UNAB trata como mayor).
Defaults propuestos en la sección 5; validarlos con consultoría y con 2 o 3 clientes.
```
