---
id: SPEC-learning-assurance-001
project: up1
type: doc
module: learning-assurance
tags:
  - up1
  - learning-assurance
  - vision
  - curriculum-design
  - curriculum-mapping
  - learning-assessment
  - apps
  - flujos
  - diferenciadores
---

# Vision funcional

**Navegacion:** [Learning Assurance](INDEX.md) → Vision funcional

## Que es Learning Assurance

Learning Assurance es la solucion de uPlanner que permite a instituciones de educacion superior **disenar su curriculo, alinear la ensenanza con competencias, y medir si los estudiantes realmente estan logrando lo que la institucion les prometio al ingresar**.

La linea se compone de cinco apps. Las tres primeras son progresivas (cada una entrega valor por si sola y alimenta a la siguiente); las dos ultimas estan en definicion:

```text
┌──────────────────────┐  compra minima   ┌──────────────────────┐  requiere Design  ┌──────────────────────┐
│ Modulo 1             │ ───────────────> │ Modulo 2             │ ────────────────> │ Modulo 3             │
│ Curriculum Management│                  │ Curriculum Mapping    │                   │ Learning Assessment  │
└──────────────────────┘                  └──────────────────────┘                   └──────────────────────┘
```

**Compra minima:** Curriculum Management (Modulo 1). Los modulos 2 y 3 se habilitan progresivamente.

---

## Curriculum Design

### Para que sirve

Centralizar todo lo que define la oferta academica de la institucion: los planes de estudio, los programas de cada curso, y los syllabi que los docentes preparan para cada seccion.

### Que problemas resuelve

- **Dispersion documental:** Los planes viven en documentos sueltos, sin versionamiento ni trazabilidad
- **Carga manual de datos:** Ingresar informacion curricular es lento y tedioso
- **Inconsistencia entre secciones:** Distintos docentes del mismo curso ensenan cosas diferentes
- **Procesos de aprobacion informales:** Los planes se aprueban por email sin registro

### Que puede hacer el usuario

**Gestion de planes de estudio:** Crear, editar y versionar la malla curricular. Organizar cursos en especialidades, concentraciones y bloques electivos. Definir categorias de requisitos para estructuras flexibles. Registrar equivalencias. Workflow formal de aprobacion.

**Gestion de programas de curso:** Definir que cubre cada curso: descripcion, resultados de aprendizaje, contenidos, modalidad, bibliografia. Secciones estandar + complementarias configurables por institucion. Versionamiento individual o masivo.

**Gestion de syllabi:** Herencia automatica del programa de curso a la seccion. Personalizacion segun libertad de catedra (modo restringido, guiado o libre). Clonacion entre secciones/periodos. Exportar Word/PDF. Compartir via link publico.

**Asistente de diseno curricular (IA):** Ingesta documental (PDF/Word/Excel → datos estructurados). Analisis de cobertura de resultados de aprendizaje. Analisis de coherencia curricular.

### A quien esta dirigido

| Rol | Para que lo usa |
|-----|----------------|
| Coordinador / Director | Disena y gestiona planes de estudio, aprueba programas de curso |
| Docente | Crea y personaliza el syllabus de su seccion |
| Equipo de acreditacion | Consulta la informacion curricular centralizada |
| Estudiante | Consulta plan vigente, catalogo de cursos, syllabus |

---

## Curriculum Mapping

### Para que sirve

Conectar lo que se ensena con lo que se prometio. Definir competencias, organizarlas en matrices, y mapear exactamente como cada curso del plan contribuye a desarrollarlas.

### Que problemas resuelve

- **Perfil de egreso decorativo:** Competencias declaradas sin demostracion de como se desarrollan
- **Tributacion invisible:** No hay vista clara de que cursos aportan a que competencias
- **Brechas de cobertura:** Competencias sin cobertura o cubiertas superficialmente
- **Acreditacion basada en fe:** Sin mapa verificable de cumplimiento del perfil

### Que puede hacer el usuario

**Matrices de competencias:** Crear marcos jerarquicos. Clasificar por tipo (generica, especifica, disciplinar). Definir esquemas de niveles de logro (cualitativos o cuantitativos). Workflow de aprobacion.

**Perfil de egreso:** Declarar que competencias y a que nivel debe alcanzar un egresado. Asignar pesos relativos.

**Mapeo curricular (tributacion):** Para cada curso, definir a que competencias contribuye, a que nivel, con que intensidad. Vincular resultados de aprendizaje a niveles de competencia. Visualizar heatmap curso x competencia.

**Asistente de alineamiento curricular (IA):** Simulador de perfil de egreso. Comparador de planes. Buscador de equivalencias. Recomendador de evaluacion.

### A quien esta dirigido

| Rol | Para que lo usa |
|-----|----------------|
| Coordinador / Director | Define competencias, mapea tributacion, gestiona perfil de egreso |
| Comite de acreditacion | Verifica cobertura del perfil, genera evidencia |
| Docente | Consulta que competencias debe trabajar su curso y a que nivel |
| Direccion academica | Vision panoramica de cobertura curricular |

---

## Learning Assessment

### Para que sirve

Medir sistematicamente si los estudiantes estan logrando las competencias. Conectar las evaluaciones reales con las competencias del perfil de egreso y generar reporteria de logro.

### Que problemas resuelve

- **Evaluacion desconectada de competencias:** Notas que no se traducen en logro
- **Reporteria insuficiente:** No se puede responder "en que nivel de competencia estan nuestros egresados"
- **Mejora a ciegas:** Reformas curriculares basadas en percepcion, no en evidencia
- **Acreditacion reactiva:** Evidencia de logro se junta cuando llega la visita
- **Datos dispersos:** Notas en SIS, evaluaciones en LMS, evidencias en carpetas compartidas

### Que puede hacer el usuario

**Estructura de evaluacion:** Componentes heredados del programa. Personalizacion segun libertad evaluativa. Jerarquia de evaluaciones. Vincular a resultados de aprendizaje.

**Evidencias y tracking:** Recolectar evidencias de logro. Rastrear progreso de competencias en tiempo real. Registrar acciones de mejora.

**Seguimiento del estudiante:** Avance en el plan, historial curricular, nivel de competencias alcanzado vs esperado.

**Reporteria de logro — 3 niveles:** Individual (radar chart por estudiante), Grupal (comparacion entre secciones/cohortes), Global (heatmaps por campus, tendencias por cohorte). Todos exportables.

**Soporte a acreditacion:** Evidencia estructurada de logro. Mapeo a estandares de agencias. Reportes publicos.

**Integraciones:** Bidireccional con SIS (Banner, Anthology). Importacion de notas desde LMS. Publicacion a sistemas externos.

### A quien esta dirigido

| Rol | Para que lo usa |
|-----|----------------|
| Docente | Define evaluaciones, consulta logro de competencias |
| Coordinador / Director | Monitorea logro, identifica brechas |
| Direccion academica | Vision institucional, decisiones basadas en evidencia |
| Equipo de acreditacion | Genera evidencia de logro |
| Super Admin | Configura reportes, terminologia, workflows, roles |

---

## Diferenciadores

1. **Tres modulos independientes:** Compra lo que necesita, crece gradualmente
2. **Asistentes IA en cada modulo:** Ingesta documental, sugerencias de perfil de egreso, deteccion de brechas, recomendacion de evaluacion
3. **Personalizacion institucional:** Terminologia, workflows, secciones de programa, esquemas de niveles
4. **De la promesa a la evidencia:** No solo documenta el curriculo — mide si funciona
5. **Integraciones bidireccionales:** Banner, Anthology, LMS. Puede importar o exportar
6. **Acreditacion continua:** Evidencia como subproducto del uso diario
