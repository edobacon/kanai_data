---
id: DOC-kb-sp9-PLAN-mcp-testing-automatizado
project: up1
type: doc
---

# Plan de ejecucion - Testing automatizado de Elric (MCP up1)

> Estado: **ejecutado** (todas las fases completas, suites verdes). Pendiente: OK del dev para commit/push
> y coordinacion con el dueno del MCP sobre la linea "up1 efimero / CI". Documento vivo.
> Origen: `sp9/FOLLOWUP-mcp-testing-automatizado.md`. Inicio: 2026-08-18. Rama: `feat/mcp-e2e-testing`.
> Repositorio objetivo: `uplanner/mcp` (paquete `up1-mcp`, alias Elric).

## 1. Objetivo

Dejar **listo el testing automatizado E2E de Elric**: una mecanica que ejecute operaciones reales
del MCP contra una instancia de up1 y verifique el **efecto en la plataforma** (no solo el retorno de
la funcion), cubriendo las cuatro fronteras del contrato del MCP (permisos, preview -> commit,
resolucion semantica, higiene de salida).

Ademas, dos objetivos permanentes que sobreviven a este plan:

- **Exigencia**: toda funcionalidad nueva del MCP (tool o mod) debe traer su prueba automatizada. El
  gate queda escrito en el checklist de extension, no como costumbre.
- **Documentacion doble**: ampliar la guia a todo lo que se puede **instruir** (como se escribe una
  prueba) y todo lo que se debe **exigir** (que prueba es obligatoria antes de commitear).

## 2. Definicion de terminado (el plan cierra cuando)

- [x] Existe `npm run test:e2e` que corre contra up1 local, separado de `npm test` (los unit siguen
      corriendo sin backend, intactos: 170 verdes, no toman los `.e2e.ts`).
- [x] El harness autentica sin humano en el loop (Clerk test mode + OTP fijo `424242`).
- [x] Hay helpers que verifican el efecto en plataforma por el **path real** del usuario y las 4
      fronteras del contrato.
- [x] Un dominio piloto (curriculum-design) tiene su suite E2E verde como ejemplo vivo (9/9).
- [x] El checklist de `docs/EXTENDING.md` y `CONTRIBUTING.md` exigen E2E para toda tool/mod de escritura.
- [x] `docs/DEVELOPMENT.md` §5.1 documenta como escribir un E2E de dominio.
- [x] El ROADMAP del MCP refleja que el paso 1 (local) esta hecho y que "up1 efimero / CI" queda como
      linea siguiente abierta.

## 3. Decisiones fijadas (no re-litigar)

| Decision | Eleccion | Razon / costo asumido |
|---|---|---|
| Entorno | **up1 local del dev** | Cero infra nueva, arranque rapido. Costo: no es CI-able y ensucia datos locales (se mitiga con teardown obligatorio). |
| Auth | **Clerk test mode + OTP fijo** (`+clerk_test`, OTP `424242`) | Automatizable de punta a punta, ya probado en dev. Riesgo: verificar que el backend acepte el test mode por el path `authenticate` del MCP (no solo Suite). |
| Formalizacion | **Plan vivo en sp9** (este archivo) | Registra ejecucion incremental. No hay ticket Jira todavia; su creacion requiere OK del dev + coordinacion con el dueno del MCP. |
| Piloto | **curriculum-design** (`cd_*`) | Dominio vivo, rico en escrituras, carga el riesgo RT/ext. (No hay mod `curriculum-mapping` aun.) |

## 4. Fuera de alcance

- **up1 efimero / integracion en CI**: queda como linea siguiente del ROADMAP, no se cierra aca.
- **Hospedado HTTP + OAuth**: ajeno a este plan.
- Cambios de logica de dominio del MCP: este plan solo agrega pruebas y documentacion, no toca
  comportamiento salvo bugs de runtime que el E2E destape (esos se reportan y clasifican).

## 5. Listado de ejecucion (fases)

> Orden: primero las pruebas (Fases 0-3), luego la exigencia (Fase 4) y la documentacion (Fase 5).
> Cada fase deja el repo funcional. Marcar `[x]` al completar y anotar en el Registro (seccion 7).

### Fase 0 - Spike de auth (desbloqueante)

Valida el unico riesgo tecnico real antes de construir el harness.

- [x] Levantar up1 local (object-manager + tenant de pruebas).
- [x] Llamar `authenticate` del MCP con un email `<user>+clerk_test@...` del tenant local.
- [x] Confirmar `submit_otp` con `424242` -> sesion cifrada valida.
- [x] Ejecutar una lectura real (ej. `cd_search_programs`) y confirmar retorno con datos del tenant.
- [x] **Gate**: si el backend local no acepta el test mode de Clerk por el path del MCP, detener y
      escalar (define si se ajusta config del tenant o se cambia la estrategia de auth). No seguir a
      Fase 1 sin esto verde.

### Fase 1 - Harness E2E (scaffold)

- [x] `test/e2e/` separado de los unit; `vitest.e2e.config.ts` con su propio `include`.
- [x] Script `test:e2e` en `package.json` (no incluido en `test`).
- [x] `setup` de sesion reutilizable entre casos de una corrida (auth una vez, reusar sesion cifrada).
- [x] Guard de entorno: si faltan credenciales/backend, el E2E hace **skip explicito** con mensaje, no
      falla como si fuera un bug (para que `npm test` de otros devs no se rompa).
- [x] Politica de limpieza (**obligatoria**): cada caso que escribe limpia lo suyo en teardown o marca
      lo creado con un prefijo identificable. Sin esto no se acepta un caso de escritura.

### Fase 2 - Helpers de asercion

- [x] Helper "efecto en plataforma": tras escribir, releer por el **path real** del usuario (la tool de
      dominio con su alias RecordType / override del mod, no el atajo API base) y asertar el estado
      persistido.
- [x] Cobertura de las 4 fronteras del contrato como helpers reutilizables:
  - [x] **Permisos**: sin sesion la tool protegida es rechazada, no ejecutada (gate de auth). Nota: el
        usuario de prueba entra como Admin (776 caps) y no hay rol inferior en el tenant, asi que la
        variante "rol sin capability -> PERMISSION_DENIED" queda como mejora futura (requiere un rol
        acotado de pruebas o un objeto no allowlisted).
  - [x] **Preview -> commit**: sin `confirm:true` devuelve preview y **no** muta; con `confirm:true` muta.
  - [x] **Resolucion semantica**: nombre/codigo -> id; enum-label -> token; ambiguedad -> `candidates`.
  - [x] **Higiene**: la salida pasa por `publicFields`, no fuga tools/objetos/campos internos.

### Fase 3 - Piloto: curriculum-design

- [x] Caso de lectura: `cd_search_programs` + `cd_get_program` con aserciones de forma y datos.
- [x] Caso de escritura con ciclo completo: create con preview -> commit -> read-back por path real ->
      teardown. Cubrir un objeto con proyeccion RT/ext (donde el mock no probaria correctitud).
- [x] Caso de versionado o transicion (una operacion de estado del dominio).
- [x] Suite piloto verde. Documentar cualquier bug de runtime destapado (clasificar introducido vs
      preexistente; los preexistentes se reportan, no se corrigen sin aprobacion).

### Fase 4 - Exigencia para funcionalidad nueva (el gate)

- [x] Actualizar el **checklist de `docs/EXTENDING.md`** (Recetas 2 y 3 + "Checklist al sumar
      tool/mod"): agregar E2E obligatorio para toda tool/mod con escritura o con resolucion semantica.
- [x] Actualizar `CONTRIBUTING.md` con la misma exigencia y el comando (`npm run test:e2e`).
- [x] Dejar el criterio explicito de **que es obligatorio vs recomendado** (ver seccion 6).

### Fase 5 - Documentacion (instruir + exigir)

- [x] `docs/DEVELOPMENT.md` §5: nueva subseccion "Como escribo un E2E de dominio" (donde vive el
      harness, como declaro un caso, como corro, como limpio).
- [x] `docs/DEVELOPMENT.md` "Que NO cubren": actualizar (ya deja de ser cierto que "no hay e2e").
- [x] `docs/ROADMAP.md`: mover "Tests de integracion automatizados" a Hecho (alcance local) y dejar
      "up1 efimero / CI" como linea abierta.
- [x] Completar las dos tablas de la seccion 6 de este plan con lo que finalmente se instruye y exige.

## 6. Lo que se INSTRUYE vs lo que se EXIGE

Distincion pedida explicitamente. **Instruir** = la guia que ensena a hacerlo bien (recomendaciones,
patrones, ejemplos). **Exigir** = el gate no negociable antes de commitear/mergear.

### 6a. Lo que se instruye (guia, en docs)

| Tema | Donde | Contenido |
|---|---|---|
| Como declarar un caso E2E | DEVELOPMENT.md §5 | Estructura del archivo en `test/e2e/`, setup de sesion, naming por regla/TC. |
| Como verificar efecto real | DEVELOPMENT.md §5 | Read-back por path real del usuario, no por atajo API base. |
| Las 4 fronteras del contrato | DEVELOPMENT.md §5 + EXTENDING.md | Que asertar en permisos, preview->commit, resolucion, higiene. |
| Como limpiar datos | DEVELOPMENT.md §5 | Teardown y/o marca por prefijo; por que es obligatorio en local. |
| Como correr | DEVELOPMENT.md §5 | `npm run test:e2e`, skip cuando falta backend, un solo caso. |

### 6b. Lo que se exige (gate, en checklist)

| Regla | Aplica a | Verificacion |
|---|---|---|
| E2E obligatorio | Toda tool/mod nueva con **escritura** (create/update/delete/versionado/transicion) | No se acepta sin su caso E2E verde. |
| E2E obligatorio | Toda tool con **resolucion semantica** (nombre/codigo/enum -> id) | Caso que pruebe la resolucion contra datos reales. |
| Read-back por path real | Todo caso de escritura | La asercion lee por la tool de dominio, no por atajo. |
| Limpieza | Todo caso que escribe | Teardown o marca; no dejar basura en el tenant local. |
| Verde antes de commitear | Todo cambio del MCP | `npm run build` + `npm test` + (si toca dominio con escritura) `npm run test:e2e`. |

> Nota de calibracion: el E2E corre contra local, no en CI. La exigencia se cumple en la maquina del
> dev antes de commitear. Cuando exista up1 efimero (linea siguiente), este gate se puede mover a CI.

## 7. Registro de ejecucion (cronologico, inmutable)

> Anotar aca cada avance: fecha, fase, que se hizo, evidencia (archivo/comando/resultado). No reescribir
> entradas previas.

- 2026-08-18: Plan creado. Estado inicial verificado en el repo: 17 archivos unit (logica pura con
  dobles), 0 E2E. Deuda declarada en `docs/ROADMAP.md` y `docs/DEVELOPMENT.md` §5. Piloto elegido:
  curriculum-design (no existe mod curriculum-mapping aun). Decisiones de entorno y auth fijadas
  (seccion 3).

- 2026-08-18 (Fase 0, spike de auth): VERDE. Rama `feat/mcp-e2e-testing` creada en `uplanner/mcp`.
  Backend local vivo en `:4000` (tenant UPU). Clerk PK local `neutral-boxer-92.clerk.accounts.dev`.
  Spike (script temporal contra `dist/`): `authenticate('eduardo.bacon+clerk_test@uplanner.com')` +
  `submit_otp('424242')` -> sesion valida, token minteado, `getMyPermissions` respondio identidad
  `eduardo.bacon@uplanner.com`, rol **Admin**, 776 capabilities. El path del MCP acepta Clerk test mode
  contra local. El usuario `+clerk_test` entra como Admin (mejor que Consultor para casos de escritura).

- 2026-08-18 (Fases 1-3): harness + piloto implementados y verdes. Archivos nuevos en `uplanner/mcp`:
  `vitest.e2e.config.ts` (include `test/e2e/**`, serie, timeout 60s), `test/e2e/harness.ts` (clase
  `Elric` sobre el servidor MCP real via `StdioClientTransport`; `e2eReady()` preflight con skip;
  `E2E_MARK` para marcar/limpiar), `test/e2e/curriculum-design.e2e.ts` (9 casos: lectura, ciclo escritura preview->commit->read-back->teardown, transicion de estado, y las 4 fronteras). Script `test:e2e` agregado a
  `package.json`. Resultado: `npm run test:e2e` = 9/9 verde; `npm test` = 170/170 verde (unit intactos,
  no toman los `.e2e.ts`). El path real: create/get de programas y `delete_object` (Activity) para
  teardown, todo por nombre de tool contra el servidor. Hallazgo corregido: el fold de acentos de
  `cd_search_programs` solo pliega la QUERY (ILIKE no pliega el dato), asi que el caso de resolucion
  guarda sin acento y busca con acento. Teardown verificado aparte: 0 residuos con marcador `E2E-MCP`
  en el tenant. Skip explicito verificado apuntando a un backend inexistente (8 skipped, mensaje claro).

- 2026-08-18 (Fases 4-5): exigencia + documentacion. `docs/EXTENDING.md`: nueva seccion "Obligacion de
  E2E para tools de escritura" + item en el checklist + refs en Recetas 2/3. `CONTRIBUTING.md`: item de
  E2E en el checklist de PR. `docs/DEVELOPMENT.md`: nueva §5.1 (como escribo un E2E de dominio + tabla
  de las 4 fronteras) y actualizado "Que NO cubren" (ya no es cierto que no hay E2E). `docs/ROADMAP.md`:
  "Testing automatizado" movido a Hecho con alcance local; "up1 efimero / CI" queda como linea abierta.

- 2026-08-18 (ampliacion de cobertura, decision del dev "escritura de alto riesgo"): el piloto probaba
  que el mecanismo funciona, pero cubria 5/38 tools de cd. Se ampliaron las suites a la escritura de
  alto riesgo (donde los mocks esconden bugs RT/ext). Nuevos archivos:
  `test/e2e/cd-sections.e2e.ts` (RecordTypes rt__: create/get/list/update/reorder/delete),
  `test/e2e/cd-curriculum.e2e.ts` (clone/get/update/transition/version + version-chain),
  `test/e2e/cd-mesh.e2e.ts` (plan entries: add/get_mesh/update/move/remove),
  `test/e2e/cd-requirements.e2e.ts` (manage_requirement view/create/delete + get_prereqs +
  manage_formation_line create/delete), mas `test/e2e/cleanup.ts` (teardown out-of-band para objetos sin
  delete por MCP, ej. Curriculum). Resultado: **`npm run test:e2e` = 25/25 verde** (5 archivos);
  cobertura ~27/38 tools de cd (todo el set de escritura de alto riesgo). Residuos verificados: 0 en
  Activity y Curriculum. `npm test` sigue 170/170.
  - Dos hallazgos NO-bug (reglas de negocio correctas que el E2E confirmo, no fallos): (a) el fold de
    acentos solo pliega la query, no el dato (ILIKE); (b) `REQUIREMENT_ACTIVITY_LOCKED_BY_ACTIVE_PLAN`
    bloquea editar requisitos de una asignatura en plan publicado — la suite crea su propia asignatura.
  - Cobertura restante (menor riesgo, sin cubrir aun): bibliografia (search/get), silabos (create/list),
    perfil de egreso (get/set), programa academico (get/clone), y `cd_create_curriculum` directo (pide
    fixtures de institucion/carrera; el path de creacion ya queda cubierto por clone/version).

- PENDIENTE: (1) commit + push (requiere OK del dev; ver rama `feat/mcp-e2e-testing`). (2) Coordinar con
  el dueno del MCP que esto es el paso 1 (local), no el reemplazo de la linea "up1 efimero / CI".

## 8. Riesgos

- **Clerk test mode en el path del MCP**: verificado en Suite, no en `authenticate` del MCP. Es el gate
  de la Fase 0. Si falla, todo el plan depende de resolverlo primero.
- **Contaminacion de datos en local**: sin teardown disciplinado, el tenant local acumula basura. Por
  eso la limpieza es exigencia, no recomendacion.
- **Bugs de runtime destapados por el piloto**: es el objetivo (los mocks los ocultan), pero pueden
  ampliar el alcance. Clasificar introducido vs preexistente; los preexistentes se reportan, no se
  corrigen dentro de este plan sin aprobacion.
- **Deuda del ROADMAP no cerrada**: local resuelve verificacion de dev, no CI. Coordinar con el dueno
  del MCP que este es el paso 1, no el reemplazo total de la linea "up1 efimero".

## 9. Referencias

- Follow-up origen: `sp9/FOLLOWUP-mcp-testing-automatizado.md`.
- Estado actual de testing: `uplanner/mcp/docs/DEVELOPMENT.md` §5 ("Testing" y "Que NO cubren").
- Deuda declarada: `uplanner/mcp/docs/ROADMAP.md` ("Mejoras del propio MCP").
- Checklist de extension: `uplanner/mcp/docs/EXTENDING.md` (Recetas 2/3 y "Checklist al sumar tool/mod").
- Login autonomo Clerk test mode en dev: memoria `reference_clerk_test_login_dev`.
- Riesgo mocks vs runtime: memoria `feedback_mocked_tests_consecrate_runtime_bugs` y
  `feedback_verify_real_write_entry_path`.
