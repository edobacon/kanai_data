---
id: DOC-alcance-sp11
project: up1
type: doc
module: curriculum-mapping
---

# Alcance - SP11 uP1 (curriculum mapping al MCP)

**Contexto del sprint:** capacidad reducida (~2 a 3 semanas sin Dani ni Yova, modo alerta por soporte legacy). Foco principal: **curriculum mapping** y la homologacion de sus logicas al MCP, segun capacidad real. Tributacion acotada a 1 tarea; reportes CCB pospuestos.

**Verificado contra:** Jira (u-planner / UPONE), codigo en `develop` de los repos up1 (mcp, curriculum-mapping, curriculum-design, academic-scheduling), y el diagnostico previo de reconciliacion MCP (UPONE-1757 CD Finalizada, UPONE-1758 CM Developing).

**Fuente:** transcript `TRANSCRIPT-2026-09-14-sprint-planning-sp11`.

> **Nota de verificacion:** el fix de bloqueo de mutaciones genericas **no esta en `develop`**: vive en la rama de Francisco (ligada a UPONE-1758). La busqueda de codigo local no alcanza ramas de origin, asi que su estado real sale de Jira y del diagnostico previo, no del checkout.

---

## Bloques-propuesta (tickets candidatos)

### C1 · Fix de bloqueo de mutaciones genericas en el core (block generic) + validacion con Academic Scheduling
**Area/epica probable:** core (object-manager / MCP) · **Repo probable:** object-manager + up1-mcp · **Esfuerzo aprox:** ~2 SP (planificacion/merge) + spike de validacion cross-mod · **Fix-vs-feature:** fix (cierra una inconsistencia: el core permitia mutaciones genericas que saltaban las reglas del mod)

**Propuesta (derivada de la reunion)**
> El core permitia update/delete directo sobre tablas que el mod declara prohibidas, evitando sus validaciones. El fix (rama de Francisco) obliga a pasar por las tools del mod. Efecto colateral: rompe un patron que Academic Scheduling usa (los deja con `undefined`). Se propone que Academic Scheduling corrija su patron de acceso al contexto en su lado, en vez de que el core absorba ese flujo.

**Estado actual del codigo**
- Que existe ya: el mecanismo de tools declarativas del MCP y las excepciones tipo `as_set_rule_value` viven en `develop` (`up1-mcp/src/tools/register-declarative-tools.js`). Los mods declaran sus objetos/tools; el motor del MCP vive en repo aparte.
- Que falta: el bloqueo en si esta en rama sin mergear (UPONE-1758, Developing). Falta: aprobar el PR en el core, validar con Academic Scheduling que corrijan su patron, e informar a Claus el contexto.

**Senales de match**
- Palabras clave: block generic, mutaciones genericas, bloqueo, tablas prohibidas, governedObjects, Academic Scheduling, undefined
- Objetos/rutas: object-manager (mutaciones update/delete), up1-mcp tools por mod, academic-scheduling (patron de acceso al contexto)

**Preguntas abiertas**
- [Core / Academic Scheduling] Pueden corregir su patron de acceso al contexto de su lado para no romperse con el bloqueo? Cuanto tienen avanzado de su propio MCP, por si eso condiciona el timing?
- [Eduardo] Este trabajo se cierra bajo UPONE-1758 o necesita ticket propio de core + su follow-up de Academic Scheduling?

**Fuera de alcance**
- Reimplementar las logicas de Academic Scheduling por ellos.

---

### C2 · Curriculum Design: cerrar logicas de cliente pendientes para MCP
**Area/epica probable:** Curriculum Design (epica UPONE-1267) · **Repo probable:** curriculum-design (cliente) · **Esfuerzo aprox:** ~2 SP · **Fix-vs-feature:** fix (cierra el ultimo diferencial para dejar CD 1:1 con el MCP)

**Propuesta**
> CD quedo practicamente MCP-compatible tras el diagnostico (UPONE-1757, Finalizada). Falta un ticket menor (~2 SP) para cerrar unas logicas que hoy viven solo en el cliente y que el MCP debe poder manejar.

**Estado actual del codigo**
- Que existe ya: diagnostico de reconciliacion de CD **Finalizado** (UPONE-1757); todo lo de tributacion del sprint anterior quedo MCP-compatible (UPONE-1756, Finalizada).
- Que falta: detectar y migrar las logicas de cliente puntuales que el MCP aun no cubre.

**Senales de match**
- Palabras clave: Curriculum Design, MCP compatible, logica de cliente, reconciliacion
- Objetos/rutas: curriculum-design (cliente), up1-mcp pack de CD

**Preguntas abiertas**
- [Eduardo] Cuales son exactamente esas logicas de cliente? (el analisis general las marca, conviene enumerarlas al redactar el ticket)

**Fuera de alcance**
- La brecha de Curriculum Mapping (es otro carril, ver C3).

---

### C3 · Curriculum Mapping: migracion de los dos mantenedores previos a la matriz al MCP
**Area/epica probable:** Curriculum Mapping (epica UPONE-1452) · **Repo probable:** curriculum-mapping + up1-mcp · **Esfuerzo aprox:** Alto (la brecha total ronda ~13 SP; este bloque es el arranque acotado por los 2 mantenedores) · **Fix-vs-feature:** feature (homologacion considerable, las logicas de CM no se alinearon con el diseno inicial)

**Propuesta**
> Es la brecha grande del proyecto. El sprint arranca la migracion por los **dos mantenedores previos a la matriz de competencia** (escala de cobertura y niveles de desempeno), dejando la matriz de competencia completa para una etapa posterior. Se preserva la flexibilidad de usuario: guardados parciales durante el diseno, validacion estricta solo al pasar a vigente.

**Estado actual del codigo**
- Que existe ya: los mantenedores previos a la matriz ya tienen validacion en el backend; el diagnostico de reconciliacion de CM esta en curso (UPONE-1758, Developing, Francisco).
- Que falta: incorporar el contexto de esos mantenedores dentro de la carpeta del MCP; declarar sus objetos/tools; que el MCP entienda el flujo de guardados parciales sin forzar validacion completa fuera del paso a vigente.

**Senales de match**
- Palabras clave: curriculum mapping, mantenedores, escala de cobertura, niveles de desempeno, matriz de competencia, MCP ready, guardado parcial, paso a vigente
- Objetos/rutas: curriculum-mapping (mantenedores), up1-mcp pack de CM, validacion en backend

**Preguntas abiertas**
- [Eduardo/Francisco] El alcance real depende de la capacidad: confirmamos que SP11 cubre solo los 2 mantenedores y la matriz de competencia queda para SP12?
- [Eduardo] La validacion completa al publicar la matriz se resuelve con una tool de validacion del MCP alimentada con ejemplos/formatos esperados (propuesta de Francisco)?

**Fuera de alcance**
- La matriz de competencia completa (etapa posterior).
- Duplicar en el MCP las validaciones "de diseno" que deben seguir viviendo en el front.

---

### C4 · Ticket exploratorio: estado de Curriculum Mapping respecto al MCP
**Area/epica probable:** Curriculum Mapping (UPONE-1452) · **Repo probable:** curriculum-mapping (analisis de codigo) · **Esfuerzo aprox:** Bajo (spike) · **Fix-vs-feature:** feature (exploracion)

**Propuesta**
> Ticket pequeno exploratorio para determinar, a nivel de puro codigo, que del mod esta disponible o no a nivel MCP y que restricciones adicionales aplican, como insumo para la matriz funcional (C5).

**Estado actual del codigo**
- Que existe ya: el diagnostico de reconciliacion UPONE-1758 (Developing) apunta a logicas cliente/servidor migrables; no genero aun un insumo directo para la matriz funcional.
- Que falta: el barrido de codigo enfocado en disponibilidad MCP por funcionalidad.

**Senales de match**
- Palabras clave: exploratorio, estado, curriculum mapping, MCP, spike
- Objetos/rutas: curriculum-mapping, up1-mcp

**Preguntas abiertas**
- [Eduardo] C4 es un angulo nuevo (codigo puro del mod) separado de UPONE-1758, o parte de ese diagnostico? Conviene no duplicar con 1758.

**Fuera de alcance**
- Implementar la migracion (eso es C3).

---

### C5 · Matriz de funcionalidad / checklist de trazabilidad mods vs MCP
**Area/epica probable:** Academic Management (transversal) · **Repo probable:** artefacto de analisis (no codigo) · **Esfuerzo aprox:** Medio · **Fix-vs-feature:** feature (artefacto de trazabilidad)

**Propuesta**
> Matriz de funcionalidades actuales a partir del analisis de codigo de los mods + el MCP, con checklist para trazar el estado de los mantenedores y dimensionar el porcentaje de deuda de curriculum mapping con el MCP. Responde a la pregunta de review "cuanto falta?".

**Estado actual del codigo**
- Que existe ya: nada equivalente; se construye desde el analisis de codigo.
- Que falta: la matriz en si (Esteban la genera; se sugiere que sea un mod/artefacto mantenible, similar a traves de todos los mods de Academic Management).

**Senales de match**
- Palabras clave: matriz de funcionalidad, checklist, trazabilidad, deuda tecnica, porcentaje de compatibilidad MCP
- Objetos/rutas: transversal a los mods + up1-mcp

**Preguntas abiertas**
- [Esteban/Eduardo] La matriz vive como documento/artefacto o como algo versionado en repo? Se menciono "deberiamos tenerlo como mod".

**Fuera de alcance**
- La migracion que la matriz mide (C3).

---

### C6 · Tributacion: 1 tarea autocontenida (continuacion)
**Area/epica probable:** Curriculum Mapping / Tributacion (continuacion de UPONE-1756) · **Repo probable:** curriculum-mapping · **Esfuerzo aprox:** Bajo/Medio (acotado a 1 tarea) · **Fix-vs-feature:** feature (extension de lo del sprint anterior)

**Propuesta**
> Elegir UNA tarea de extension de tributacion suficientemente autocontenida para presentar en el sprint corto. El CRUD por competencia (grilla) ya se cerro (UPONE-1756, Finalizada).

**Preguntas abiertas**
- [Eduardo] Cual es la tarea concreta? (pendiente de releer el backlog de tributacion del sprint anterior)

**Fuera de alcance**
- Tomar todo el backlog de tributacion (el sprint es corto).

---

### C7 · Auth multi-tenant UPC en QA
**Area/epica probable:** UPC / autenticacion · **Repo probable:** config de ambiente (UPC QA) · **Esfuerzo aprox:** Medio · **Fix-vs-feature:** feature (config/activacion) · **Deadline:** 30-sept tentativo (a validar con consultoria)

**Propuesta**
> Configurar la autenticacion multi-tenant/multifactor en UPC QA (activar autenticacion con dos tenants distintos), validar con consultoria, y luego coordinar la config en produccion con los parametros entregados. Requiere apoyo de Legacy y coordinacion con Luis.

**Estado actual**
- Que existe ya: ya hubo una sesion para revisar esos flujos.
- Que falta: Dani no dejo documentacion; hay que ejecutar la config en QA.

**Preguntas abiertas**
- [Eduardo] **El ticket citado como "404" no resuelve a `UPONE-404`** (esa clave no existe con ese tema). Cual es la clave real del ticket de auth multi-tenant? Sin ella el PO no puede ubicarlo.
- [Negocio/consultoria] Se confirma el deadline del 30-sept?

**Fuera de alcance**
- La config productiva (es posterior a validar QA).

---

### C8 · Seguimiento del core-extension UPONE-1693 (sync no siembra reportes: "existingExt is not defined")
**Area/epica probable:** core (Core Extension) · **Repo probable:** object-manager (sync) · **Esfuerzo aprox:** Bajo (seguimiento, no desarrollo del equipo) · **Fix-vs-feature:** fix (bug de core en revision)

**Propuesta**
> No es trabajo del equipo: es seguimiento del estado de un Core Extension ya en revision (detectado por Giovanni). Eduardo hace seguimiento.

**Estado actual (Jira)**
- UPONE-1693, tipo Core Extension, estado **En revision**, label `core-extension`. Summary: "El sync no puede sembrar reportes nuevos de ningun mod: existingExt is not defined".

**Fuera de alcance**
- Que el equipo up1 lo implemente (es del core).

---

## Fuera de alcance del sprint (global)
- **Reportes de CCB:** pospuestos por capacidad.
- **Matriz de competencia completa:** etapa posterior; SP11 arranca por los 2 mantenedores previos.
- **Soporte Legacy:** se prioriza aparte (reunion 15:00, estimado <10 tickets, varios sobre datos); no es alcance de features UP1.

## Preguntas abiertas consolidadas (dirigidas)
| # | A quien | Pregunta |
|---|---------|----------|
| 1 | Eduardo (dev/PO) | Clave real del ticket de auth multi-tenant UPC ("404" no resuelve a UPONE-404). |
| 2 | Eduardo / Francisco | C4 exploratorio se solapa con UPONE-1758? SP11 cubre solo los 2 mantenedores y la matriz de competencia va a SP12? |
| 3 | Core / Academic Scheduling | Corrigen su patron de acceso al contexto de su lado para el block generic? Avance de su MCP? |
| 4 | Negocio/consultoria | Confirmar deadline 30-sept del auth multi-tenant. |
| 5 | Eduardo | Enumerar las logicas de cliente pendientes de CD (C2) y elegir la tarea de tributacion (C6). |

---

**Gate de readiness:** alcance decidido y acotado por capacidad OK · bloques auto-identificables con senales de match OK · fix-vs-feature marcado por bloque OK · preguntas dirigidas a su destinatario OK · supuestos descartados marcados (1693 != block generic; "404" sin resolver; block generic en rama, no en develop) OK.
