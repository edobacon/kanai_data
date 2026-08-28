---
id: SPEC-reassess-003
project: up1
type: doc
module: reassess
---

# 03 — Arquetipos de Instituciones

Fuente: Informe N 1660575, pags. 13-14
Seccion: 8. Arquetipos de instituciones

---

## Concepto de madurez institucional

La madurez en gestion curricular **no se asocia al prestigio institucional**, sino al nivel de consenso interno sobre:
- Modelo educativo
- Mejora continua
- Evaluacion del aprendizaje

La madurez depende de factores organizativos y procedimentales:
- Nivel de libertad de catedra
- Grado de centralizacion de procesos
- Estandarizacion de documentacion curricular
- Consenso institucional sobre formulacion, medicion y evaluacion del logro de aprendizajes

## Los tres arquetipos

```
Descentralizadas ◄────────► En transicion ◄────────► Centralizadas
Menor facilidad                                        Mayor facilidad
de adopcion                                            de adopcion
Mayor libertad                                         Menor libertad
de catedra                                             de catedra
Menor consenso                                         Mayor consenso
en evaluacion                                          en evaluacion
```

### 1. Instituciones centralizadas y estandarizadas

- Procesos claros para medicion y reporteria.
- Facilita configuracion de la herramienta y reduce fricciones.
- **Mayor facilidad de adopcion.**

### 2. Instituciones descentralizadas con alta libertad de catedra

- Alta variabilidad en medicion y falta de consenso.
- **Adopcion compleja y lenta.**
- La herramienta no puede resolver sus vacios pedagogicos/normativos por si sola.

### 3. Instituciones en transicion

- Operan de manera semi centralizada.
- Carecen de claridad sobre como medir y que reportar.
- Necesitan **asesoria adicional** para definir procesos antes de configurar la herramienta.

## Elementos comunes a todos los arquetipos

Independientemente del nivel de madurez, se necesita:

1. **Configuracion modular**: lineamientos institucionales + personalizacion por facultad/programa (logos, colores, terminologia).
2. **Rol Super Admin**: validar informacion, configurar roles, definir permisos y flujos de aprobacion adaptados.
3. **Interfaces flexibles**: kit de disenos y capa de lenguaje configurable por la institucion.
4. **Recursos de apoyo**: tooltips, videos tutoriales, FAQ, capacitacion del rol super admin.

## Estrategia diferenciada

| Arquetipo | Estrategia de adopcion |
|-----------|----------------------|
| Centralizada | Configuracion directa, capacitacion de super admin |
| En transicion | Asesoria experta para definir procesos + configuracion |
| Descentralizada | Servicios complementarios de asesoria en aseguramiento de la calidad |

**Conclusion clave**: Para instituciones descentralizadas o en transicion, uPlanner debe ofrecer servicios de **asesoria experta en aseguramiento de la calidad**, para evitar que la herramienta sea percibida como solucion a vacios pedagogicos y normativos.

## Implicancias para uP1

- El sistema multi-tenant de uP1 permite configuracion independiente por institucion.
- RBAC con contextos jerarquicos (/system > /tenant > /institution) soporta los distintos modelos.
- La libertad evaluativa configurable (BR-LIB-001: Restringido/Guiado/Libre) responde directamente a este espectro de arquetipos.
- Las categorias de requisitos flexibles (major/minor/electivos) y secciones configurables de programa de curso soportan la diversidad institucional.
