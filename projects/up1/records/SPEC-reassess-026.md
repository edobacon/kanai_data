---
id: SPEC-reassess-026
project: up1
type: doc
module: reassess
tags:
  - assessment
  - migracion
  - up1
  - reassess
  - base-conocimiento
  - indice
---

# uAssessment Actual — Base de Conocimiento para Migracion a uP1

Fecha: 2026-04-08
Fuentes: specs/assessment/, Senku KB (54 rules, 7 bugs, 7 decisions), ReAssess informe N 1660575

---

## Proposito

Este documento y sus archivos asociados existen para responder una pregunta central: **que tenemos hoy en uAssessment, por que funciona como funciona, y que necesitamos cambiar para que Learning Assurance en uP1 sea una mejora real y no una reescritura ciega**.

uAssessment es la herramienta que uPlanner ofrece a universidades para gestionar su curriculo, mapear competencias y medir si los estudiantes estan logrando lo que la institucion les prometio. El sistema actual lleva anos en produccion, atiende a multiples universidades en Latinoamerica, y tiene tanto aciertos que vale la pena preservar como problemas estructurales que el informe ReAssess (consultoria Dictuc/Dilab, enero 2026) confirmo con evidencia de campo.

Esta base de conocimiento organiza lo que sabemos en 15 documentos, cada uno pensado para que tanto un lider de producto como un desarrollador puedan usarlo como referencia.

```text
                  ┌──────────────────────────┐
                  │ Base de conocimiento      │
                  │ actual                    │
                  └──┬───┬───┬───┬───┬───┬──-┘
          ┌──────────┘   │   │   │   │   └────────┐
          │          ┌───┘   │   │   └───┐         │
          │          │   ┌───┘   └───┐   │         │
          ▼          ▼   ▼           ▼   ▼         ▼
      ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐
      │Arquit.│ │Backend│ │Fronte.│ │Base de│ │Logica │
      └───┬───┘ └───┬───┘ └───┬───┘ │datos  │ │negocio│
          │         │         │     └───┬───┘ └───┬───┘
          │     ┌───────┐ ┌───────┐    │         │
          │     │Diagno.│ │Riesgos│    │         │
          │     └───┬───┘ └───┬───┘    │         │
          │     ┌───────┐     │        │         │
          │     │Preser.│     │        │         │
          │     └───┬───┘     │        │         │
          └────────►│◄────────┘◄───────┘◄────────┘
                    ▼
             ┌─────────────┐
             │ Matriz de   │
             │ migracion   │
             └─────────────┘
```

## Archivos

| Archivo | Que encontraras |
|---------|----------------|
| [01-arquitectura-actual.md](01-arquitectura-actual.md) | Como esta construido el sistema hoy: que tecnologias usa, como se conectan las piezas, y por que la estructura actual genera friccion |
| [02-backend-estado.md](02-backend-estado.md) | El corazon del sistema: los 45+ modulos del backend, que hace cada area, que funciona bien y donde estan los riesgos principales |
| [03-frontend-estado.md](03-frontend-estado.md) | Lo que ve el usuario: por que la mitad del sistema se ve "viejo" y la otra mitad "nuevo", y que significa eso para la experiencia |
| [04-bd-esquema.md](04-bd-esquema.md) | Los datos: como estan organizadas las 162 tablas, por que hay duplicacion, y que implica para mover datos a uP1 |
| [05-logica-negocio.md](05-logica-negocio.md) | Las reglas del juego: tributacion, workflows, competencias, reportes — que funciona, que esta roto, y por que importa |
| [06-diagnostico-cruzado.md](06-diagnostico-cruzado.md) | Lo que dijo Dictuc vs lo que encontramos en el codigo: confirmacion punto por punto de los 5 dolores del informe ReAssess |
| [07-bugs-deuda-tecnica.md](07-bugs-deuda-tecnica.md) | Problemas conocidos y deuda acumulada: lo que sabemos que esta roto y aun no se ha corregido |
| [08-que-funciona-bien.md](08-que-funciona-bien.md) | Lo que vale la pena preservar: patrones, componentes y decisiones que deben sobrevivir la migracion |
| [09-logicas-negocio-completas.md](09-logicas-negocio-completas.md) | Vision general del sistema: las 6 fases del ciclo curricular, todos los flujos, actores, datos y dependencias |
| [10-cruce-informe-vs-sistema.md](10-cruce-informe-vs-sistema.md) | Cruce punto a punto: que detecta el informe ReAssess (dolor/oportunidad/silencio) vs donde vive en el sistema |
| [11-discoveries-y-consideraciones.md](11-discoveries-y-consideraciones.md) | 5 puntos ciegos del informe: Milestone no contemplado, dualidad API, duplicacion BD, dependencias externas, competencias como epicentro |
| [12-complejidad-base-de-datos.md](12-complejidad-base-de-datos.md) | Complejidad real de la BD: 17k lineas SQL raw, queries de 20 tablas, 0 transacciones, 40+ tablas externas |
| [13-escalabilidad-y-mantenibilidad.md](13-escalabilidad-y-mantenibilidad.md) | Que escala y que no: motor de formularios con eval(), servicios monoliticos, 56 clientes con logica condicional, permisos en SQL |
| [14-validacion-por-cliente.md](14-validacion-por-cliente.md) | Caso por caso: Uniandes (BUG-012 + Brightspace), UST-CFT (Banner + multi-tenant), Anahuac (permisos + LMS), UPC (bibliografia + indicadores). 56 clientes y 3 arquetipos vs realidad del codigo |
| [15-matriz-funcionalidades.md](15-matriz-funcionalidades.md) | Matriz de 15 funcionalidades: estado actual, modulos internos, dependencias externas, hubs criticos, riesgos de migracion, orden sugerido por fases |

## El sistema en numeros

| Que | Cuanto |
|-----|--------|
| Modulos de backend | 45+ |
| Endpoints de API | 300+ |
| Tablas en base de datos | 162 |
| Tabla mas grande | 799,000 filas (evaluaciones por seccion) |
| Vistas de usuario (total) | 33 paginas |
| Vistas modernas (Vue) | 12 (36%) |
| Vistas legacy (Angular via iframe) | 21 (64%) |
| Reglas de negocio documentadas (Senku) | 45 |
| Bugs conocidos sin corregir | 3 (1 critico) |

## Los 10 riesgos mas importantes para la migracion

Estos son los puntos que mas atencion necesitan al planificar la transicion a uP1. Estan ordenados por impacto en el negocio, no solo por complejidad tecnica.

| # | Riesgo | Por que importa | Donde leer mas |
|---|--------|-----------------|----------------|
| 1 | Vinculos de competencias pueden corromperse | Un bug conocido puede dejar datos de tributacion inconsistentes. Posible causa del incidente de perdida de datos reportado por Uniandes | [07-bugs-deuda-tecnica.md](07-bugs-deuda-tecnica.md) |
| 2 | Competencias no tiene interfaz moderna | El dominio mas valioso del producto (mapeo de competencias, perfil de egreso, logro) vive 100% en la interfaz vieja sin plan de migracion | [03-frontend-estado.md](03-frontend-estado.md) |
| 3 | Dos sistemas de medicion coexisten sin integrarse | "Graduation" y "Milestone" miden logro de competencias de formas distintas, mostrando datos parciales al usuario | [05-logica-negocio.md](05-logica-negocio.md) |
| 4 | Reportes personalizados por cliente estan en el codigo | Cada universidad tiene sus propias plantillas de reportes dentro del codigo fuente. Cambiar un reporte requiere una version nueva del sistema | [02-backend-estado.md](02-backend-estado.md) |
| 5 | La API tiene dos versiones sin plan de retiro de la antigua | Endpoints duplicados donde la version vieja no tiene control de permisos | [01-arquitectura-actual.md](01-arquitectura-actual.md) |
| 6 | La configuracion de estructura curricular es fragil | Una sola tabla controla como se comportan tres areas distintas del sistema. Cambiar una puede romper las otras | [04-bd-esquema.md](04-bd-esquema.md) |
| 7 | La carga de datos es el area mas subdesarrollada | No hay ingesta de documentos, no hay preview, no hay integraciones con sistemas externos. Es exactamente lo que el informe ReAssess senala como dolor #1 | [06-diagnostico-cruzado.md](06-diagnostico-cruzado.md) |
| 8 | 70+ reglas de permisos inconsistentes | El sistema de permisos existe pero tiene reglas duplicadas, mezcladas entre viejo y nuevo, y en algunos casos solo funciona visualmente | [03-frontend-estado.md](03-frontend-estado.md) |
| 9 | Workflows configurables pero dificiles de testear | Cada universidad tiene sus propios estados y transiciones. Lo que funciona para una puede no funcionar para otra | [05-logica-negocio.md](05-logica-negocio.md) |
| 10 | 799,000 filas en la tabla mas critica | La tabla de evaluaciones por seccion es enorme y participa en las consultas mas complejas del sistema | [04-bd-esquema.md](04-bd-esquema.md) |

## Busqueda rapida por tag

```bash
# Buscar por tag en frontmatter
grep -rl "tributacion" specs/up1/pdf/actual/*.md
grep -rl "competencias" specs/up1/pdf/actual/*.md
grep -rl "uniandes" specs/up1/pdf/actual/*.md
grep -rl "migracion" specs/up1/pdf/actual/*.md
grep -rl "very-high" specs/up1/pdf/actual/*.md

# Buscar por modulo
grep -rl "competency-matrix" specs/up1/pdf/actual/*.md

# Buscar por cliente
grep -rl "clients:.*anahuac" specs/up1/pdf/actual/*.md
```

## Indice de tags

| Tag | Documentos |
|-----|-----------|
| `assessment` | Todos |
| `migracion` | 01, 02, 03, 04, 05, 07, 08, 10, 11, 12, 14, 15 |
| `up1` | 01, 08, 10, 15 |
| `reassess` | 06, 10, 14 |
| `competencias` | 02, 03, 05, 08, 11, 15 |
| `tributacion` | 05, 07 |
| `reportes` | 02, 05, 09, 12 |
| `milestone` | 05, 11 |
| `base-de-datos` | 04, 12 |
| `frontend` | 03 |
| `backend` | 02 |
| `permisos` | 03, 06, 13 |
| `bugs` | 07 |
| `deuda-tecnica` | 07 |
| `escalabilidad` | 13 |
| `eval` | 07, 13 |
| `clonacion` | 05, 07, 13 |
| `workflow` | 05, 08 |
| `logica-negocio` | 05, 09 |
| `diagnostico` | 06 |
| `dolores` | 06 |
| `discoveries` | 11 |
| `puntos-ciegos` | 11 |
| `sql-raw` | 12 |
| `transacciones` | 07, 12 |
| `dependencias-externas` | 11, 12 |
| `volumetria` | 04, 12 |
| `56-clientes` | 13 |
| `plantillas` | 13 |
| `god-object` | 13 |
| `monolito` | 13 |
| `arquetipos` | 14 |
| `incidentes` | 14 |
| `matriz` | 15 |
| `funcionalidades` | 15 |
| `hubs` | 15 |
| `orden-migracion` | 15 |
| `fases` | 09, 15 |

## Indice por cliente

| Cliente | Documentos | Hallazgo principal |
|---------|-----------|-------------------|
| `uniandes` | 06, 10, 13, 14, 15 | BUG-012 causa probable de perdida de datos. Necesita Brightspace. Arquetipo descentralizado |
| `ust-cft` | 06, 10, 13, 14, 15 | Necesita Banner. Comparte plantilla sin separacion multi-tenant |
| `anahuac` | 06, 10, 13, 14, 15 | Necesita jerarquias de permisos no soportadas. Necesita LMS |
| `upc` | 06, 10, 13, 14, 15 | Bibliografia rota por migracion de citacion sin transacciones |
| `stotomas` | 13 | Logica condicional hardcodeada para transformacion de codigos de curso |

## Indice por modulo

| Modulo | Documentos | Rol |
|--------|-----------|-----|
| `improve-api` | 01-15 (todos) | Backend completo |
| `improve-front` | 01, 03 | Frontend AngularJS legacy |
| `suite-front` | 01, 03, 08, 10 | Frontend Vue (migracion parcial) |
| `syllabus` | 02, 05, 07, 14, 15 | Modulo mas grande (3,959 lineas modelo) |
| `competency-matrix` | 02, 05, 07, 14, 15 | Dominio mas valioso, 100% Angular |
| `pensums` | 05, 09, 15 | Planes de estudio |
| `courses` | 09, 15 | Catalogo de cursos + programas |
| `reports` | 05, 09, 14, 15 | 45+ endpoints, 40+ plantillas |
| `structure-helper` | 13, 15 | God Object de 5,123 lineas con eval() |
| `commons` | 09 | Workflow compartido |
| `citation` | 07, 14 | Migracion de formato de citas |
| `class-api` | 11 | Fuente de notas (asm_student_marks) |
| `core-api` | 11 | Estructura academica (upl_*) |

## Indice por nivel de riesgo

| Riesgo | Documentos |
|--------|-----------|
| `very-high` | 11-discoveries, 12-bd-complejidad, 13-escalabilidad, 15-matriz |
| `high` | 14-validacion-por-cliente |
| `medium` | (sin risk explicito, riesgo medio implicito) 01-05, 07-08 |
| `low` | 09-logicas, 10-cruce |

## Senku KB relacionado

| Tipo | IDs | Creados en esta sesion |
|------|-----|----------------------|
| Rules | RULE-112 a RULE-117 | 6 nuevas (0 transacciones, 56 plantillas, 9 UNION permisos, competencias Angular, UST/CFT multi-tenant, Anahuac jerarquias) |
| Bugs | BUG-013 a BUG-016 | 4 nuevos (Uniandes vinculado BUG-012, eval(), clonacion memoria, UPC bibliografia) |
| Decisions | DEC-010 a DEC-012 | 3 nuevas (ReAssess validado, Milestone en uP1, fuente de notas cambia) |
| Pre-existentes | 48 rules, 3 bugs, 4 decisions | Sesion 2026-04-06 |
