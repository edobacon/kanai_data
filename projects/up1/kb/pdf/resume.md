---
id: SPEC-reassess-027
project: up1
type: spec
module: reassess
tags: []
---

# ReAssess: Rediseno de uAssessment para la mejora continua curricular

Informe N 1660575
Elaborado por: Dictuc S.A. (filial UC) para uPlanner (Taneq SpA)
Fecha: enero 2026
Equipo tecnico: Isabel Hilliger, Directora Dilab (Unidad de Ingenieria en Diseno)

---

## 1. Identificacion y Alcance del Proyecto (Pags. 1-4)

- **Objetivo**: Identificar oportunidad de rediseno conceptual para uAssessment mediante diagnostico con clientes reales.
- **Limitaciones**: NO incluye desarrollo tecnico, implementacion ni capacitacion de usuarios finales.

## 2. Diagnostico: Dolores y Problemas Criticos (Pags. 10-11)

Fallas graves que afectan la confianza de los clientes en el producto actual:

| Problema | Detalle | Pagina |
|----------|---------|--------|
| Carga de datos | Documentacion curricular fragmentada (PDFs, Excel, Word). Carga masiva manual, lenta y costosa en RRHH | 10 |
| Falta de reporteria real | Indicadores no responden a necesidades analiticas. Instituciones usan Power BI o reportes manuales porque uAssessment no muestra metricas de logro de competencias claras | 10 |
| Inestabilidad tecnica | Perdida de informacion (caso Uniandes). Fallas en gestion de bibliografia con enlaces incorrectos (caso UPC) | 11 |
| Rigidez de roles | No se adapta a jerarquias institucionales ni al lenguaje tecnico de cada universidad (ej: como llaman a "asignatura" o "competencia") | 11 |

## 3. Arquetipos de Instituciones y Madurez (Pags. 13-14)

La "madurez" no es prestigio, sino el nivel de consenso interno sobre como medir aprendizajes.

| Arquetipo | Caracteristicas | Adopcion |
|-----------|----------------|----------|
| Centralizadas | Procesos estandarizados, menor libertad de catedra | Mayor exito de adopcion |
| Descentralizadas | Alta libertad de catedra, falta de consenso | Adopcion compleja y lenta |

**Estrategia (Pag. 14):** Para instituciones en transicion, uPlanner debe ofrecer **asesoria pedagogica** — la herramienta no puede resolver vacios normativos por si sola.

## 4. Propuesta de Rediseno Modular (Pags. 15-21)

Se propone dividir uAssessment en tres modulos para venta y adopcion progresiva:

| Modulo | Funcionalidad | IA Generativa |
|--------|--------------|---------------|
| **1. Curriculum Management** | Gestion centralizada de syllabus y mallas curriculares | Crea tablas de datos automaticamente desde textos/PDF |
| **2. Curriculum Mapping** | Mapea como cada curso tributa al perfil de egreso | Compara planes de estudio y analiza equivalencias para convalidacion |
| **3. uAssessment (Final)** | Monitoreo del logro de competencias via datos ERP/LMS | Genera rutas de aprendizaje personalizadas para estudiantes |

## 5. Gobernanza y el Rol del Super Admin (Pags. 22-23)

Cambio recomendado en el "Viaje del Usuario":

- **Autonomia (Pag. 22):** El Super Admin debe poder configurar identidad visual, capa de lenguaje y roles **sin abrir tickets de soporte**.
- **Gestion de incidencias (Pag. 23):** Problemas registrados y seguidos dentro de la misma plataforma, eliminando intermediarios innecesarios (consultores) para tareas de configuracion basica.

## 6. Recomendaciones de Negocio (Pag. 24)

- **Modelo de venta:** Modulo 1 (Curriculum Management) como requisito minimo de entrada — asegura que los datos base esten bien estructurados.
- **Red de colaboracion:** Crear un "consorcio" de universidades uPlanner para intercambiar buenas practicas y recursos de aprendizaje.
- **Asesoria experta:** uPlanner debe posicionarse no solo como proveedor de software sino como facilitador estrategico en aseguramiento de la calidad.

## 7. Anexos Tecnicos (Pags. 28-32)

- **Protocolo de entrevista (Pag. 28):** Incluye preguntas sobre viabilidad de integrar microcredenciales y capacidad de replicar/copiar proyectos parcialmente.
- **Consentimiento (Pag. 31):** Uso de grabaciones de Microsoft Teams solo para fines internos de la consultoria.
