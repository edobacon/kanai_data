---
id: DOC-kb-vigencia-documentos-p06-4-configuracion
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

# Vigencia 06: 4 De la configuración a la regla

> Grupo: Parte funcional · Parte 6 de 17 · Líneas 620 a 684 del original · [Índice](00-indice.md)

**Ver en HTML (mismo estilo del original):** [p06-4-configuracion.html](p06-4-configuracion.html)

## Qué dice esta parte

Explica la cadena completa: una transición lleva a un estado, ese estado tiene un rol, el rol exige y guarda hechos (fecha de inicio, acto, fecha fin de ingreso) y `computeValidity` solo lee esos hechos. Presenta tres capas de configuración (default del mod, configuración de la institución, datos) y un procedimiento de implementación desde cero en 9 pasos. Dice explícitamente que la capa 2 'hoy no existe'.

## Dónde se habló en la reunión (6 oct 2026)

00:21:39, 00:25:39 a 00:28:03 y 00:40:22 a 00:41:27. Transcripción: `TRANSCRIPT-2026-10-06-modelamiento-flujo-estatus-reglas-uassessment` (records).

## Verificado contra el código (8 oct 2026)

- Confirmado: no existe configuración de estados por institución para estos documentos. Giovanni lo preguntó en la reunión ('antes se podía configurar los nombres de los estados') y Esteban pidió verificarlo en el core: la verificación indica que se retiró.
- `up1-manager` tiene editor de transiciones solo para campos enum custom (UPONE-1296).

## Decisiones y preguntas ligadas

D5 (texto validado contra catálogo por tenant frente a enum por tenant con codegen).

## Fragmento del documento (texto del artefacto)

```text
4 · De la configuración a la regla
Los roles escriben hechos; los hechos definen la vigencia
La regla nunca mira el nombre de un estado. Al transicionar, el core lee el rol del estado destino y guarda los hechos que ese rol exige. computeValidity solo lee esos hechos, así que funciona igual con 3 estados o con 9.
1 · AcciónTransición"Revisión Facultad → Decretado"
→
2 · ConfiguraciónRol del estado destino"Decretado" = inForce
→
3 · Efecto del rolExige y guarda hechosvalidFrom congelada · ApprovalAct
→
4 · CálculocomputeValidityfechas + autorización + dependientes
→
5 · ResultadoProgramado o Vigentey el guard protege
inForce
Exige y guarda validFrom y el acto.
retired
Exige y guarda admissionUntil.
vuelta a authoring
Es el retiro de publicación: solo desde Programado o Vigente y sin dependientes. Limpia validFrom.
Tres capas de configuración
1
Default del modFlujo de trabajo por defecto de cada documento, metadata.validity, editPolicy y changeClass. JSON del objeto, build-time. Lo mantiene desarrollo.
2
Configuración de la instituciónSus estados, el rol de cada uno, transiciones, quién aprueba, tipos de acto, autorización externa, reclasificación de changeClass dentro del rango y política del sílabo. Base de datos del tenant. Lo configura el consultor desde up1-manager. Hoy no existe (ver sección 12).
3
DatosCada documento con su estado, sus fechas y su acto. Lo opera la institución.
Implementación desde cero
Partir del default. Cada documento ya trae un flujo de trabajo funcional. Una institución sin requisitos particulares puede operar así.
Levantar el proceso real por documento: quién propone, qué órganos aprueban y en qué orden, qué acto pone en vigencia, si hay autoridad externa (MEN, RVOE) y cómo se cierra.
Configurar en up1-manager, en la pantalla "Ciclo de vida de documentos": estados, rol de cada estado, transiciones, permiso por transición, tipos de acto, autorización externa.
Validación automática del core: al menos un inForce, inicio en authoring, todo inForce alcanzable. Además inyecta las exigencias de fecha, acto y dependientes en las transiciones que corresponden.
Simular un documento de ejemplo por los estados y ver qué vigencia resulta y qué se bloquea.
Permisos: asignar a los roles de la institución aprobar, publicar, corregir, ajustar, retirar y versionar.
Reglas de edición: aceptar o ajustar las clases de cambio (p. ej. mover de semestre como reforma), la política del sílabo y la zona horaria.
Carga inicial de los documentos que ya operan: entran directo a un estado inForce con sus fechas, su acto y sus matrículas. Es un canal de carga histórica explícito y auditado; la vigencia se calcula sola.
Puesta en marcha: se activa la tarea diaria de vigencia.
Después de la puesta en marcha, agregar estados o transiciones es seguro y renombrar es solo cambiar la etiqueta. Quitar un estado o cambiar su rol exige que no haya documentos en él, o una migración guiada.
¿La regla es la misma para todos los documentos?
Igual para todos
Los 5 roles, computeValidity, la tabla de decisión, las 3 vías de cambio, la protección de versiones y el guard único.
Se declara por tipo de documento
De dónde sale la vigencia, qué dependientes la mantienen, qué hijos protege, la clase de cada campo y si es versionable.
Lo define cada institución
Sus estados, el rol de cada uno, quién aprueba y los ajustes de clase dentro del rango. Puede usar el mismo flujo para plan y programa, o uno distinto.
| Plan de estudios | Programa de asignatura | Matriz de competencias | Sílabo
Flujo de trabajo | Configurable | Configurable | Configurable | Más corto
Origen de la vigencia | Fechas, por cohorte de ingreso | Fechas, por periodo | Fechas + adopciones | Su periodo (termId)
Dependientes | PlanEnrollment | Sílabos con estudiantes; planes vigentes o en extinción que lo usan | MatrixAdoption abiertas | Matrículas del periodo
Hijos protegidos | Malla, requisitos, secciones, tributación | RA, evaluación, contenidos, bibliografía | Árbol de competencias, rúbricas | Componentes del periodo
Versionable | Sí | Sí | Hoy no (decisión D2) | No
```
