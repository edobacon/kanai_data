---
id: DOC-kb-sp9-UPONE-1530-pre-intake
project: up1
type: doc
---

# UPONE-1530 - Pre-intake (guia de implementacion)

> Material del implementador. **No va a Jira.** Alimenta el intake de DKC: entrega el mapa de enfoques,
> las hipotesis a validar y los riesgos tecnicos, para que el intake genere y valide hipotesis en vez de
> investigar desde cero. Contrato del ticket: `UPONE-1530-detalle.md`.

## Veredicto y superficie

**Veredicto: feature de bajo costo tecnico sobre un backend inestable.** El patron de alta en el MCP esta
documentado y hay un molde completo que copiar. El problema no es como exponer, es **que** exponer: el
dominio a exponer esta en fase de diseno y una parte se construye en este mismo sprint.

**Superficie estimada:** el paquete de mod del MCP (1 archivo nuevo mas 1 linea de registro), los
contratos de los objetos que se expongan, 1 a N archivos de operacion segun alcance, sus tests, y el
catalogo y la documentacion de operaciones. Todo en el repositorio del MCP, fuera de up1.

## Contexto de negocio (planning SP9)

El acuerdo de la planificacion de SP9 (2026-08-14) es que **la sincronizacion con el MCP es parte de
cada historia que toca core**, no un ticket posterior. Este ticket es la deuda acumulada del dominio que
quedo atras.

**Justificacion completa de la estimacion (3 SP, ver Estimacion en el detalle):** el patron de alta esta
documentado y hay un ejemplo completo que sirve de molde, y la mayor parte del costo es cumplir los
protocolos del MCP y escribir sus pruebas. Fue dimensionado en la planificacion como la carga mas
liviana del sprint, y por eso entro al sprint de forma condicional (para evaluar el lunes si hay espacio
despues de la carga grande).

## Estado actual del codigo

**Servidor MCP:** `/Users/edobacon/Workspace/uplanner/mcp`, paquete `up1-mcp`, rama `main`, working tree
limpio, ultimo commit del 2026-07-29 (`68c75ef`, de UPONE-1378).

**Inventario de operaciones:**
- Curriculum design: 38 operaciones, registradas en `src/mods/curriculum-design/index.ts:74-93`.
- Engagement: 24 operaciones, en `src/mods/uengagement/index.ts:32-42`.
- Genericas a nivel de servidor (`src/index.ts:83-89`): CRUD generico (`src/tools/objects.ts`), vistas
  (`src/mods/layouts/views.ts`), meta (`src/tools/meta.ts`), autenticacion (`src/tools/auth.ts`),
  contexto y rol activo (`src/tools/context.ts`), historial de cambios (`src/tools/changes.ts`), guia
  (`src/tools/guide.ts`), documentacion (`src/docs/index.ts:66`).
- Registro de paquetes de mod: `src/mods/index.ts:17`.

**Curriculum mapping no esta expuesto en absoluto.** Cero operaciones del dominio, y sus objetos **no
estan en la lista de tipos permitidos** (`src/mods/index.ts:35-39`, derivada de los objetos de los
paquetes registrados). Consecuencia importante: **ni el CRUD generico puede tocarlos hoy**. No hay
paquete del mod ni entrada en la hoja de ruta del MCP. Lo unico tangencial es una marca informativa
booleana en las operaciones de perfil de egreso, sin vinculo real con los objetos del dominio.

**Patron de alta, documentado en `docs/EXTENDING.md`:**
- Receta 1 (`:38-67`): declarar el tipo de objeto en los objetos del paquete mas un contrato de objeto.
  **Cero codigo de operacion.** Habilita el CRUD generico.
- Receta 2 (`:114-137`): operacion de dominio en un paquete existente, con reglas obligatorias: vista
  previa antes de confirmar, permisos como frontera, resolucion semantica de referencias y enums, e
  higiene de salida.
- Receta 3: paquete de mod nuevo, exportando el manifiesto e inscribiendolo en el registro.
- Checklist final: `:332-342`.

**Molde completo de punta a punta:** `src/mods/curriculum-design/graduation-profile.ts` (157 lineas).
Autenticacion (`:32-37`), permisos como frontera (`:80`, `:113`), esquemas de entrada (`:73-75`,
`:102-108`), vista previa antes de confirmar (`:130-131`, `:147-148`), y registro en el paquete
(`src/mods/curriculum-design/index.ts:87, 147`).

**Autenticacion y permisos:** flujo de codigo por correo (`src/tools/auth.ts:12-63`), sesion cifrada en
disco, permisos del usuario real como doble frontera (`src/auth/permissions.ts:1-5`, resolucion en
`:34-44`), y filtrado de operaciones visibles tras el login (`src/tools/tool-visibility.ts`).

**Tests:** Vitest, `test/`, 17 archivos. Cubren **logica pura** (contratos, resolucion de referencias,
arboles de requisitos, visibilidad por permisos, vista previa, sesion). **No hay integracion contra una
instancia real de up1**, y esta declarado como pendiente en la hoja de ruta del propio MCP. Patron de
test: importar las funciones puras de la operacion e inyectar dobles de las escrituras
(`test/requirement-tree-ops.test.ts:1-30`).

**El backend a exponer, y aqui esta el problema:**
`/Users/edobacon/Workspace/uplanner/up1/mods/curriculum-mapping`, rama `develop`. Su propio paquete se
describe como **dominio en fase de diseno**. Por fases:
- **F1 implementado:** esquema de niveles (con su resolver de alta gobernada) y escala de cobertura
  (idem). Terreno estable.
- **F2 parcial:** el nodo de competencias con sus resolvers gobernados de creacion y actualizacion, pero
  su propia documentacion declara **diferido** el arbol de competencias y la asociacion a planes.
- **F3 no implementado:** la tributacion real.
- **Objetos con esquema pero sin resolver de escritura propio:** la alineacion de competencias, y las dos
  piezas de rubrica. Dependen del CRUD generico, que hoy no esta habilitado para ellos.
- **Documentacion interna desincronizada:** el contexto para agentes del mod dice que el nodo de
  competencias no esta implementado, mientras la documentacion de fases y el catalogo de capabilities,
  tocados despues, dicen que si. **Gana el codigo.**

**Movimiento en curso:** UPONE-1633 (SP9, Backlog, otro dev) construye precisamente las partes diferidas
de la matriz.

## Analisis de enfoques (posibilidades)

### Opcion A - Exponer solo el subconjunto estable (recomendada)

Habilitar el dominio y cubrir los dos esquemas de F1 mas la matriz en lectura, por la receta mas barata:
declarar tipos y contratos, sin operaciones de dominio dedicadas salvo donde el CRUD generico no alcance.

- **Pros:** entrega valor consultable sobre terreno que no se va a mover en el sprint; costo minimo;
  cero retrabajo cuando UPONE-1633 aterrice.
- **Contras:** deja el dominio a medio exponer, y el usuario podria esperar mas.
- **Esfuerzo:** bajo. **Reversibilidad:** total (quitar del registro).

### Opcion B - Subconjunto estable mas la matriz en escritura

Sumar operaciones de dominio para crear y actualizar la matriz, apoyandose en los resolvers gobernados
que ya existen.

- **Pros:** el dominio queda operable, no solo consultable.
- **Contras:** exige vista previa, permisos y resolucion semantica sobre un modelo con ciclo de estados,
  y ese modelo es justo el que UPONE-1633 modifica. Retrabajo probable.
- **Esfuerzo:** medio. **Reversibilidad:** media.

### Opcion C - Esperar a UPONE-1633 y exponer el dominio completo despues

- **Pros:** una sola pasada, sobre un modelo estabilizado. **Contras:** no entrega nada en SP9; el ticket
  ya viene arrastrado de SP8.
- **Cuando tiene sentido:** si el sprint se llena con la carga grande, que es exactamente el escenario que
  el PO planteo al dejar este ticket como condicional.

### Opcion D - Exponer todo el dominio ahora, incluidas las piezas sin resolver

- **Contras:** habilitar para escritura objetos sin escritura gobernada convierte al MCP en una puerta
  que evade las validaciones del dominio. **No recomendada.** Si se necesita, hay que construir esas
  operaciones en el mod, y eso cambia el veredicto de frontera del ticket.

## Consideraciones de implementacion

- **Empezar por la habilitacion, no por las operaciones.** Sin los objetos en la lista de tipos
  permitidos no hay nada que hacer, ni siquiera consultar. Es el primer commit natural.
- **Secuencia sugerida:** (1) habilitar el dominio y declarar contratos de los objetos estables;
  (2) verificar consulta real contra la plataforma con un usuario autenticado; (3) sumar operaciones de
  dominio solo donde el generico no alcance; (4) tests segun el patron del MCP; (5) actualizar catalogo y
  documentacion de capacidades; (6) verificar con un rol sin permisos.
- **Gotcha de verificacion:** los tests del MCP usan dobles. Un verde no prueba que funcione contra la
  plataforma. Cerrar con verificacion real es obligatorio, y hoy es manual.
- **Gotcha de documentacion del mod:** el contexto para agentes del mod curriculum-mapping esta
  desactualizado respecto del codigo. **Verificar contra el codigo, no contra esa doc.**
- **Gotcha de permisos cruzados con el sprint:** UPONE-1615 puede cambiar las capabilities de los roles
  curriculares en este mismo sprint. Como el MCP usa los permisos del usuario real como frontera, lo que
  el MCP puede hacer cambia con ese ticket. Coordinar el orden de verificacion.
- **Riesgo tecnico principal:** exponer un contrato que despues cambia. Una operacion publicada es una
  promesa al usuario; retirarla o cambiarle la forma cuesta mas que no haberla publicado.
- **El ticket es condicional.** Antes de invertir, confirmar que se ejecuta en SP9.

## Hipotesis a validar (para el intake)

- **H1: declarar el tipo de objeto y su contrato alcanza para consultar los objetos estables, sin
  escribir operaciones de dominio.** Es la hipotesis que define el costo del ticket. _Validacion: aplicar
  la receta 1 sobre el esquema de niveles y consultar via el CRUD generico contra la plataforma real._
- **H2: los resolvers gobernados de F1 y F2 son suficientes para escritura, sin necesidad de crear
  operaciones nuevas en el mod.** _Validacion: revisar cada resolver del mod y contrastar su firma con lo
  que la operacion del MCP necesitaria._
- **H3: los objetos sin resolver propio no se pueden exponer para escritura sin construir esa operacion
  en el mod.** Si se confirma, el alcance de escritura de esos objetos sale de este ticket. _Validacion:
  intentar la escritura por el camino generico en un entorno de prueba y observar si las validaciones de
  dominio se aplican._
- **H4: los permisos del usuario real filtran correctamente las operaciones nuevas.** _Validacion: entrar
  con un rol sin la capability del dominio y comprobar que las operaciones no se ofrecen o son
  rechazadas._
- **H5: las escrituras via MCP quedan auditadas igual que las de la interfaz.** _Validacion: escribir por
  MCP y revisar el historial de cambios del registro._
- **H6: UPONE-1633 cambia la forma de los objetos que este ticket expondria.** _Validacion: preguntar a su
  dueno y revisar su alcance antes de elegir el subconjunto._

## Decisiones tecnicas abiertas (las resuelve el dev o el intake)

- Paquete de mod nuevo para curriculum-mapping, o sumar sus objetos al paquete existente de curriculum
  design. Lo primero es mas limpio conceptualmente y sigue la receta 3; lo segundo es menos archivos.
- Nombres de las operaciones nuevas y su prefijo de dominio, para que el usuario las distinga.
- Si se aprovecha este ticket para dejar el primer test de integracion real del MCP (paga deuda
  declarada, pero agrega esfuerzo y no es lo que el ticket pide).
- Que nivel de guia se declara para el dominio (la guia de creacion y la descripcion de objetos son
  config-driven y mejoran mucho la experiencia del usuario).

## Decisiones del ticket (abiertas y resueltas)

> **Revision 2026-08-18.** El ticket se acota a **anadir curriculum-mapping y nada mas** (subconjunto
> estable mas matriz en lectura). El testing automatizado del MCP se saca de aqui y se evalua aparte:
> `sp9/FOLLOWUP-mcp-testing-automatizado.md`.

- [x] ~~**Que subconjunto del dominio se expone en este ticket.**~~ **Resuelta (2026-08-18): opcion (1)**,
      solo los objetos estables (esquemas de niveles y de cobertura) mas la matriz en lectura. Entrega
      valor sobre terreno que no se mueve y deja el resto para cuando el backend se estabilice.
- [x] ~~**Los objetos sin escritura gobernada.**~~ **Resuelta (2026-08-18): solo lectura.** Al acotar el
      alcance a lectura, no se construyen operaciones de escritura en el mod; la frontera se mantiene
      `mod-only` sin la revision adicional que exigiria exponerlos para escritura.
- [x] ~~**Alcance de la prueba de aceptacion.**~~ **Resuelta (2026-08-18): logica pura mas verificacion
      manual** contra la plataforma, que es el estandar actual del MCP. El primer caso automatizado E2E,
      con su mecanica y su documentacion, se separa como follow-up a evaluar despues
      (`sp9/FOLLOWUP-mcp-testing-automatizado.md`), para no cargar de scope un ticket condicional.
- [ ] **Secuencia respecto de UPONE-1633.** Sigue abierta: confirmar con su dueno que partes del modelo
      va a cambiar, para no sincronizar contra una forma que se cae dentro del mismo sprint.
- [ ] **El ticket es condicional.** Sigue abierta (PO): confirmar si se ejecuta en SP9 o se mueve, antes
      de comprometerlo en el compromiso del sprint.

## Frontera core/mod (Aduana)

**N/A para la frontera core/mod de up1**, con motivo: los artefactos de este ticket viven en el
**repositorio del servidor MCP**, que es un producto aparte de la plataforma up1. No se crea ni se
modifica codigo de un mod de up1 ni de sus workspaces core, asi que la pregunta de genericidad
core/mod no aplica a lo que este ticket construye.

Dos precisiones para que el N/A no esconda nada:

- **Si el alcance obliga a tocar el mod, cambia el veredicto.** Tres objetos del dominio existen como
  esquema pero **sin operacion de escritura gobernada propia**. Si se decide exponerlos para escritura,
  habria que crear esas operaciones **dentro del mod curriculum-mapping**, y esos artefactos si
  requieren su propia pasada de frontera antes de ejecutar. Mientras el alcance sea de lectura o se
  apoye en las escrituras gobernadas que ya existen, el N/A se sostiene.
- **La higiene del limite corre igual.** El MCP no debe convertirse en una puerta que evada las reglas
  de la plataforma: los permisos del usuario real, el registro de auditoria y las validaciones de
  negocio tienen que seguir aplicando por el camino del MCP igual que por la interfaz.

## Reglas y patrones, con su fuente

- Sin el objeto en la lista de tipos permitidos no hay operacion posible, ni generica. _Fuente:
  `src/mods/index.ts:35-39`._
- Receta mas barata primero: tipo mas contrato cubre la consulta sin codigo de operacion. _Fuente:
  `docs/EXTENDING.md:38-67`._
- Toda escritura devuelve vista previa si no viene confirmada. _Fuente: `docs/EXTENDING.md:142`;
  `src/tools/preview.ts`._
- Los permisos del usuario real se verifican antes de mutar. _Fuente: `src/auth/permissions.ts:1-5`;
  molde en `src/mods/curriculum-design/graduation-profile.ts:80, 113`._
- Referencias y enums se resuelven por nombre y se ofrecen como opciones reales. _Fuente:
  `docs/CONVENTIONS.md`._
- Checklist de cierre del MCP: construccion y tests verdes, operacion declarada en el catalogo y en las
  capacidades. _Fuente: `docs/EXTENDING.md:332-342`._
- Los tests del MCP cubren logica pura con dobles: no prueban el camino real. _Fuente:
  `docs/ROADMAP.md` (integracion extremo a extremo declarada pendiente)._
- Verificar el estado del dominio contra el codigo, no contra la doc del mod, que esta desincronizada.
  _Fuente: documentacion de fases del mod curriculum-mapping vs su contexto para agentes._

## Archivos candidatos (tentativo, no mandato)

En el repositorio del MCP:
- `src/mods/curriculum-mapping/index.ts` (paquete nuevo) y `src/mods/index.ts:17` (registro).
- `src/contracts/registry.ts` (contratos de los objetos a exponer).
- `src/mods/curriculum-mapping/*.ts` (operaciones de dominio, solo si el generico no alcanza).
- `test/*.test.ts` (tests de la logica nueva).
- `manifest.json`, `docs/TOOLS.md`, `docs/CAPABILITIES.md`, `docs/ROADMAP.md` (catalogo y documentacion).
