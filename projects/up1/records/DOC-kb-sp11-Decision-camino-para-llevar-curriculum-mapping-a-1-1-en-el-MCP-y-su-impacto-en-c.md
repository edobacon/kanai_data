---
id: DOC-kb-sp11-Decision-camino-para-llevar-curriculum-mapping-a-1-1-en-el-MCP-y-su-impacto-en-c
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp11
  - mcp
  - curriculum-mapping
  - curriculum-design
  - paridad-1a1
  - core-extension
  - decision
  - arquitectura
---

# RESUELTA: cm se arregla en el modulo (el arreglo en core queda como opcion aparte) - analisis de la decision

Documento de decision (sp11). Define las alternativas para que curriculum-mapping (cm) funcione 1:1 entre el uso por la plataforma y el uso por el MCP, evaluadas no solo por tiempo sino por sensibilidad del codigo, impacto en otros mods, testing y reversibilidad. Verificado contra codigo real (auditoria por mod, file:line), no contra el KB.

## 1. Encuadre: que significa 1:1 y por que la premisa cambio

Una regla de negocio puede vivir en tres lugares, y de ahi sale el esfuerzo:

- **N0**: la regla esta en el override del resolver generico (`createInstance`/`updateInstance`). La plataforma y el MCP pasan por el mismo gate. Ya es 1:1, costo cero.
- **N1**: la regla esta en una mutation `*Validated` separada. La web la respeta (llama a esa mutation); el MCP generico la saltea.
- **client-only**: la regla vive solo en el front. Ni la API ni el MCP la aplican; solo la UI.

Aclaracion importante de metodo: la clasificacion N0/N1 mide el ENFORCEMENT de las reglas que YA estan server-side. NO detecta reglas client-only: eso solo se ve con una auditoria profunda del frontend. Las dos primeras pasadas (por mod) dieron una foto optimista ("cm cero client-only", "cd practicamente 1:1") que la auditoria del frontend corrigio para AMBOS: cm resulto tener 1 gap client-only (B.4) y cd resulto tener 4. Ser N0 (o tener tools) NO implica 1:1: solo cubre las reglas que estan en el servidor.

Estado corregido:
- cm: invariantes en mutations `*Validated` (N1); el generico las saltea. La auditoria del frontend encontro 1 gap client-only de integridad (B.4, portable al resolver propio). Ver el ticket de cm.
- cd: reglas de sus objetos en el override generico (N0), asi que el generico ya las respeta (casi 1:1 en ENFORCEMENT), y sus dos huecos de create (Activity/Offering) ya estan cerrados Y sincronizados. PERO la auditoria del frontend encontro 4 gaps client-only (el mayor: prerrequisitos/correq/creditos en el ALTA de planEntry, hueco vigente reachable via una tool existente). Ver el analisis de cd. Por eso cd NO es 1:1 en logica completa; su esfuerzo ~6-13 SP.

## 2. Por que cm no puede resolverlo como cd (en enforcement)

cd tiene sus reglas de objeto en el override generico (N0), asi que el MCP generico ya las respeta: `up1_create_object('Activity', ...)` corre la misma validacion que la web. cm NO puede hacer lo mismo: `Mutation.createInstance` tiene un solo dueño (`Object.assign`, gana el ultimo alfabetico) y cd ocupa ese slot; un override de cm lo mataria sin error. cm lo intento y lo revirtio (commits `7972381` escrito, `068ec91` revertido). Esta es una **limitacion del core**, no una falla de cm. (Nota: esto es sobre el enforcement de escritura; los gaps client-only son un eje aparte que afecta a los dos mods, ver seccion 1.)

## 3. La decision: dos caminos a 1:1 para cm

### Camino 1: tools de dominio MCP (mod-only)
Construir las tools de dominio en el pack de cm que llamen a las mutations `*Validated` existentes, declarar `governedObjects` para bloquear el generico, y cerrar el unico gap client-only de integridad (B.4) en el resolver propio de cm. Todo dentro del mod (`ai/` + `logic/`), apoyado en el blockGeneric de la rama (motor del MCP, ya construido) y con la migracion de as como parte del lockstep. No toca el motor del MCP ni object-manager.

### Camino 2: Core Extension (interceptores componibles)
Construir en el core (object-manager) un mecanismo de interceptores componibles en los 3 campos genericos, de modo que varios mods registren guards que se componen en vez de pisarse. Luego mover las reglas de cm a ese override componible. cm pasa a N0 como cd: el generico queda 1:1 para todos los clientes automaticamente. Es el "Core Extension" que cm marco como su cierre real (redactado como ticket en G-2).

## 3.1 Viabilidad mod-only y revision client-side (verificado)

**Es viable dejar cm 1:1 con trabajo mod-only** (Camino 1). El 1:1 sale por construccion: las tools llaman a las MISMAS `*Validated` que usa la UI, asi que heredan las mismas reglas. La revision del frontend (23 reglas) confirmo que no hay reglas client-only de integridad que el MCP no herede, SALVO una:

- **B.4 (unico gap real de cm):** la UI bloquea la pestaña "Competencias" si la matriz no tiene `performanceScaleId`, pero el resolver del arbol NO lo valida. Sin el, el MCP podria crear arbol/rubrica sobre una matriz sin escala (descriptores huerfanos). Se cierra en el resolver PROPIO de cm (`logic/`, mod-owned, NO core), junto con la validacion de que el levelId pertenezca a la escala. Como va en la `*Validated`, cierra UI + MCP + cross-client de esa regla a la vez.
- Los otros 3 client-only de cm son de bajo impacto (herencia de min-threshold, reparto de pesos, secuenciacion de formulario). No son integridad.

Nota comparativa: cd tiene 4 gaps client-only (no 1), y uno es vigente (prerrequisitos en el alta). O sea el eje "reglas client-only" es MAS pesado en cd que en cm, aunque cd sea N0 en enforcement. Ver el analisis de cd.

## 4. Comparacion por dimension

| Dimension | Camino 1: tools de dominio MCP | Camino 2: Core Extension |
|---|---|---|
| **Dificultad tecnica** | Media, repetitiva. Tools de dominio; matriz/arbol/rubrica pesadas, tablas puente livianas. Patron ya existe. Las `*Validated` ya estan hechas: la tool solo las invoca. Suma un fix de resolver acotado (B.4). | Alta. Diseñar composicion de interceptores (orden, corto-circuito, aislar el error) en el camino comun de escritura del backend. Diseño desde cero en el core. |
| **Sensibilidad del codigo** | Baja-media. Local a `mods/curriculum-mapping/` (`ai/` + `logic/`). No toca el core ni el motor del MCP. Radio de impacto: solo cm. | **Alta**. Toca el camino por el que escribe TODO objeto de TODO mod en el backend. Un bug rompe el CRUD de toda la plataforma. Requiere sign-off del equipo de object-manager. |
| **Impacto en otros mods** | Ninguno. Config y resolver del propio cm. No toca el slot de override compartido. | Alto y estructuralmente positivo, pero exige coordinacion: cambia el contrato de como los mods registran overrides. Hay que migrar cd o mantener compat. |
| **Testing** | Por tool: forma + integracion con cliente GraphQL falso. Las invariantes ya estan cubiertas server-side; las tools testean el ruteo. Mas el test server de B.4. El gate `validate-governed-objects` obliga a declarar los 10. | Pesado. Tests del componedor + regresion de TODOS los overrides existentes (cd, cm) + suite completa del object-manager en checkout limpio. |
| **Que cierra** | Solo el vector MCP (y B.4 tambien cross-client por ir en la `*Validated`). NO cierra el cross-client generico (bulk-edit de la Suite, API/GraphQL directa). Necesita `governedObjects` para tapar el generico. | **Todo**. Cross-client real: web, API, GraphQL directo, MCP, bulk-edit. El generico del MCP queda 1:1 sin tools bespoke. |
| **Reversibilidad** | Alta. Borrar tools/config del pack (B.4 queda como mejora de integridad). | Baja-media. Cambio estructural de core; revertir implica volver al slot unico. |
| **Efecto en cd** | Ninguno. cd ya esta 1:1 en enforcement; ni lo ayuda ni lo estorba. | **Ayuda**. Destraba el slot de override unico que ata a cd; vuelve sus overrides componibles. |
| **Esfuerzo** | ~9.5 a 16.5 SP (governedObjects + tools + B.4 + doc), ver el ticket de cm. | ~5 a 8 SP de core + migracion de cm + migracion/verificacion de cd. Resuelve la raiz para todos. |

## 5. Como cada camino afecta o ayuda a cd

- **Camino 1** deja a cd intacto. cd ya es N0 en enforcement; construir tools de dominio para cm no lo toca. Neutro. (Los 4 gaps client-only de cd son un trabajo aparte, propio de cd, ver su analisis.)
- **Camino 2** ayuda a cd de forma estructural: hoy cd es rehen del slot unico (lo ocupa, y por eso cm no puede). Con interceptores componibles, cd deja de ser el unico dueño y sus overrides se componen. Beneficia a ambos y a todos los clientes.

## 6. Los dos caminos no son mutuamente excluyentes en el tiempo

Camino 1 entrega valor rapido (MCP que escribe cm respetando reglas) pero es MCP-only. Camino 2 es el destino (cross-client, destraba cd). Se puede hacer 1 ahora y 2 despues, pero entonces las tools SIMPLES de 1 quedan parcialmente redundantes tras 2 (el generico ya seria 1:1). Las COMPUESTAS (arbol, matriz, adopcion) sobreviven igual, y el fix B.4 tambien. La tension: pagar dos veces (parte de 1, luego 2) vs esperar el fix estructural (2) mas caro y sensible.

Hibrido pragmatico: declarar `governedObjects` YA (barato, cierra el vector agente, es parte del lockstep de 1758), construir las tools COMPUESTAS nucleo + B.4 (sobreviven a 2), y dejar las tools SIMPLES atadas a la decision 1 vs 2.

## 7. Trabajo adicional de cm, comun a ambos caminos

- **Huecos server** (no rompen 1:1 salvo B.4, ya en el ticket): RM7 (no existe borrado de matriz; el retiro es Deprecated->Archived, no un delete), RP5 (completitud de descriptores, diferida por PO; el MCP iguala a la plataforma, no rompe 1:1), RubricDescriptor levelId (se cierra junto con B.4). R-12 NO es un invariante del mod, es una regla de cobertura (UPONE-1771).
- **Deuda documental** a atender ya: `CLAUDE.md` de cm no refleja UPONE-1756 (CompetencyAlignment) ni UPONE-1769; `.ai/PATTERNS.md:39` stale. ~0.5 SP.
- **Colision de nomenclatura**: los codigos "R-1..R-5" colisionan entre PerformanceScale, CompetencyAlignment y el renombre de UPONE-1753.

## 8. Que hay que decidir

Camino 1 esta **confirmado viable mod-only** (seccion 3.1), asi que la decision ya no es "se puede" sino "cuando cerrar cross-client": depende de cuan duro sea ese requisito (hoy "riesgo asumido via RBAC") y de la tolerancia a pagar parte dos veces vs esperar el fix estructural. Recomendacion para llevar al PO:

- Si el cross-client es requisito duro y hay apetito por el cambio de core: **Camino 2**, es el fix de raiz y ayuda a cd.
- Si se necesita el MCP usable ya y el cross-client puede seguir cubierto por RBAC un tiempo: **Camino 1** ahora, con Camino 2 priorizado como deuda estructural.
- En ambos casos: declarar `governedObjects` de los 10 es barato y no arrepentible, hacerlo ya; las tools compuestas y B.4 sobreviven a Camino 2.

## 9. Esfuerzo consolidado de cm (orientativo, pasar por calibracion de SP)

- Camino 1 (ticket unico): ~9.5 a 16.5 SP. Ver el ticket de cm para el desglose por fase.
- Camino 2: ~5 a 8 SP de core + migracion de cm + migracion/verificacion de cd.

Los rangos son orientativos. La estimacion fina va por la calibracion de SP del proyecto una vez tomada la decision.

Ver los documentos hermanos de sp11 (Ticket cm auto-gobierno, Analisis cd para el MCP, Propuesta a core interceptores componibles, Reporte del fix de blockGeneric, Solicitud a academic-scheduling, Comparativo cm vs cd para el PO) y los de sp10 (PLAN/VEREDICTO/REVISION de blockGenericMutation).
