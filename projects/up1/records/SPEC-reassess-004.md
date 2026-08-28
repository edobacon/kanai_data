---
id: SPEC-reassess-004
project: up1
type: doc
module: reassess
---

# 04 — Modulo 1: Curriculum Management

Fuente: Informe N 1660575, pags. 14-17
Seccion: 9. Oportunidad de diseno (Modulo 1)

---

## Descripcion

Modulo orientado a la administracion centralizada de documentacion de planes de estudio, mallas curriculares y syllabus. Permite la carga masiva de documentacion curricular para realizar diferentes analisis.

## Posicionamiento

- **Etapa 1** de la adopcion progresiva (requisito minimo de entrada).
- Deberia ser el de **menor precio** de la vertical.
- Modelo: contrato anual, software como servicio.
- Capacitacion minima: rol super admin + material de autoatencion.

## Funcionalidades principales

1. **Carga masiva de documentacion curricular**: planes de estudio, syllabus, mallas — generando tablas de datos curriculares.
2. **IA generativa para crear tablas de datos** a partir del texto incorporado via carga masiva de archivos (PDF, Word, Excel → datos estructurados).
3. La funcionalidad de carga masiva facilita la venta y adopcion del siguiente modulo (Curriculum Mapping), permitiendo pruebas y demos con datos propios del cliente.

## Creacion de valor (IA)

### Simulador de perfiles de egreso
- Analiza texto de syllabus para generar perfiles de egreso automaticamente.
- Apoyado por LLMs, aprovechando tecnicas de mineria de texto ya usadas en analitica curricular (De Silva et al., 2022).

### Simulador de coherencia curricular
- Analiza un plan de estudio completo.
- Evalua las secuencias de cursos sugeridas segun el nivel de alineacion entre resultados de aprendizaje, asignaturas y perfil de egreso.
- Identifica redundancias, brechas formativas y desalineaciones a lo largo de la secuencia curricular.
- Apoya procesos de rediseno curricular y mejora continua.

**Maquetas incluidas en el informe:**
- Figura 3: (a) Syllabus Analyzer — carga PDF, (b) Identified Student Learning Outcomes.
- Figura 4: (a) Curriculum Sequence Analyzer — carga PDF, (b) Curriculum Sequence Analysis (45 cursos, 8 secuencias, 87% coherencia).

## Posibles extensiones

- **Versionamiento de planes de estudio y syllabus**: Mantenedor de control documental que permite coexistencia de versiones distintas de programas y asignaturas, comparar y monitorear implementacion.
- Implicaria cobro adicional como anexo al contrato del modulo.
- Valor: tambien para clientes que solo buscan un gestor curricular (sin uAssessment completo).

## Correspondencia con uP1

| Propuesta del informe | Implementacion en uP1 |
|-----------------------|----------------------|
| Carga masiva de documentacion | API GraphQL + endpoint `/upload` para Excel/CSV + importInstances |
| IA para crear tablas desde texto | Asistente de diseno curricular: ingesta documental (CAP-CUR-048) |
| Simulador de perfiles de egreso | Asistente de alineamiento: simulador de perfil de egreso (CAP-MAP-020) |
| Coherencia curricular | Asistente: analisis de cobertura y coherencia (CAP-CUR-049, CAP-CUR-050) |
| Versionamiento | Cadena de versiones con trazabilidad historica (CAP-CUR-023, BR-VER-001) |
| Menor precio, entrada | Modelo de apps independientes — Curriculum Design es el entry point |
