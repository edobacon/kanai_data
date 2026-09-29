---
id: TAO-160-SPEC
project: taomangalam
ticket: TAO-160
status: approved
---

# HU-00-13 · Comandos raíz, configuración de editor versionada, .env.example y acceso móvil al backend local

## Resumen ejecutivo

Entrega los comandos raíz (doctor, bootstrap, dev:services, dev, generate, check, test) invocables desde cualquier subdirectorio con reporte del comando fallido y enlace de troubleshooting, la configuración de editor versionada, los .env.example en paridad con el schema zod y los docs de development/. No incluye dev:catalog, qa:bundle, db:*, docs:* ni Dev Container (otros tickets de EP-00). Se verifica observando: doctor marca Docker detenido con enlace y sale !=0, informa el puerto 54329 ocupado, la app development alcanza GET /health/live desde emulador Android sin editar código, y la paridad .env<->schema falla nombrando la variable faltante. Tamaño: 4 sesiones (2 T2 + 2 T1), ~13 tasks; cabe en el techo de entrada de 4 sesiones.

## Requirements

### REQ-01 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:579

El package.json raíz expone bootstrap, doctor, dev:services, dev, generate, check y test, resolubles desde cualquier subdirectorio del monorepo; cuando un script falla imprime el comando exacto y un enlace a su sección de troubleshooting, y NO existe un script setup.

### REQ-02 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:119

pnpm run doctor valida Flutter (versión de FVM), Dart, Node (.nvmrc), pnpm (packageManager), Docker, Java 17, Xcode o Android SDK y los puertos 54329, backend y Mailpit; cada fallo se marca con su enlace de solución y el proceso sale con código distinto de 0.

### REQ-03 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:579

pnpm run bootstrap instala dependencias, valida la configuración, ejecuta generate y prepara hooks opcionales, todo desde el script del repositorio y no desde el pnpm setup propio de pnpm.

### REQ-04 `confirmed`
> Fuente: taomangalam/docs/product/tecnologia/18_experiencia_de_desarrollo_y_qa_humana.md:72

pnpm dev:services levanta el stack Compose de HU-00-05 y pnpm dev inicia el backend en tsx watch y la app en flavor development, imprimiendo URLs y dispositivo; resuelve el acceso móvil al backend (10.0.2.2 en emulador Android, loopback en iOS Simulator, adb reverse en Android físico por USB, IP de red en otro dispositivo) sin direcciones fijas en la lógica de producto.

### REQ-05 `confirmed`
> Fuente: taomangalam/.github/workflows/ci-pr.yml:58

pnpm check corre formato, lint, tipado y unitarias afectadas, y pnpm test corre la suite local no nativa; ambos ejecutan los mismos controles desde cualquier subdirectorio.

### REQ-06 `confirmed`
> Fuente: taomangalam/.gitignore:39

Se versionan .editorconfig y .vscode/ con extensions.json, settings.json, launch.json (depuración compuesta) y tasks.json, sin tokens, IDs de equipos Apple ni rutas absolutas, con los archivos generados excluidos de búsqueda.

### REQ-07 `confirmed`
> Fuente: taomangalam/.env.example:4

Existen .env.example raíz y server/.env.example con nombre y explicación de cada variable y sin credenciales, en paridad bidireccional con el schema zod de configuración del backend.

### REQ-08 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:119

Existen docs/development/setup.md, commands.md, configuration.md y debugging.md que documentan el entorno y los comandos, incluyendo la invocación con pnpm run (DEC-230).

### REQ-09 `confirmed`
> Fuente: taomangalam/.github/workflows/ci-pr.yml:408

La CI comprueba que los comandos documentados existen en el package.json y que la ayuda de doctor (doctor --help) responde, fallando el job cuando alguna de las dos no se cumple.

### REQ-E01 `inferred` `enforcement`
> Fuente: taomangalam/docs/product/tecnologia/18_experiencia_de_desarrollo_y_qa_humana.md:72

pnpm dev reutiliza el stack Compose de HU-00-05 vía dev:services y el endpoint de salud existente GET /health/live (saludVivo) para confirmar disponibilidad, sin duplicar el compose ni la lógica de salud.

### REQ-E02 `inferred` `enforcement`
> Fuente: taomangalam/.env.example:4

La prueba de paridad de configuración deriva del schema zod del backend como única fuente de verdad (no de una lista mantenida a mano) y los nuevos scripts reutilizan los comandos de workspace existentes en vez de duplicarlos.
## Tasks

#### S1.T1 — Parametrizar el package.json raíz con los scripts bootstrap, doctor, dev:services, dev, generate, check y test, resolubles al root desde cualquier subdirectorio, que imprimen el comando fallido y un enlace de troubleshooting; sin script setup. Archivos: package.json raíz y helpers de script. Validación: ejecutar cada comando desde la raíz y desde app/lib/ y verificar exit codes.
Contrato: rollback: Revertir el package.json raíz al estado previo y eliminar los helpers de script agregados.. Status: done

#### S1.T2 — Implementar pnpm run doctor: valida Flutter (versión FVM), Dart, Node (.nvmrc), pnpm (packageManager), Docker, Java 17, Xcode o Android SDK y los puertos 54329, backend y Mailpit; marca cada fallo con enlace de solución y sale !=0. Validación: correr con Docker detenido y con 54329 ocupado.
Contrato: rollback: Eliminar el script de doctor y su entrada en el package.json raíz.. Status: done

#### S1.T3 — Implementar pnpm run bootstrap: instala dependencias, valida la configuración, ejecuta generate y prepara hooks opcionales, sin depender del setup propio de pnpm. Validación: correr en clon limpio y con config inválida.
Contrato: rollback: Eliminar el script bootstrap y su entrada en el package.json raíz.. Status: done

#### S1.T4 — Implementar pnpm check (formato, lint, tipado y unitarias afectadas) y pnpm test (suite local no nativa) delegando en los comandos de workspace existentes. Validación: correr ambos desde la raíz y desde app/lib/.
Contrato: rollback: Revertir las entradas check y test del package.json raíz.. Status: done

#### S1.T5 — Tests de regresión de los comandos raíz: resolución desde subdirectorio, exit !=0 de doctor con Docker detenido, ausencia del script setup y equivalencia de check desde app/lib/.
Contrato: rollback: Eliminar los tests agregados.. Status: done

#### S2.T1 — Cablear pnpm dev:services al Compose existente de HU-00-05, sin duplicar el archivo compose. Validación: levantar y bajar los servicios.
Contrato: rollback: Revertir la entrada dev:services del package.json raíz.. Status: done

#### S2.T2 — Implementar pnpm dev: backend en tsx watch y app en flavor development, imprime URLs y dispositivo, resuelve el host por dispositivo (10.0.2.2 emulador Android, loopback iOS Simulator, adb reverse Android físico, IP de red otro dispositivo) sin direcciones fijas en la lógica de producto, y confirma disponibilidad con saludVivo (GET /health/live). Validación: emulador Android y Android físico por USB.
Contrato: rollback: Revertir el script dev y cualquier helper de resolución de host.. Status: done

#### S2.T3 — Tests de regresión del arranque: selección de host por tipo de dispositivo y uso del endpoint de salud existente (saludVivo) en lugar de un ping nuevo.
Contrato: rollback: Eliminar los tests agregados.. Status: done

#### S3.T1 — Agregar .editorconfig y .vscode/ (extensions.json, settings.json, launch.json con depuración compuesta, tasks.json) sin tokens, IDs de equipos Apple ni rutas absolutas, y excluir los generados de búsqueda. Validación: comprobación de CI de .vscode.
Contrato: rollback: Eliminar .editorconfig y .vscode/ y revertir las exclusiones de búsqueda.. Status: done

#### S3.T2 — Crear .env.example raíz y server/.env.example con nombre y explicación de cada variable, sin credenciales, y la prueba de paridad bidireccional contra el schema zod (REQ-E02). Validación: correr la prueba de paridad.
Contrato: rollback: Eliminar los .env.example y la prueba de paridad agregados.. Status: done

#### S3.T3 — Escribir docs/development/setup.md, commands.md, configuration.md y debugging.md documentando entorno y comandos con pnpm run (DEC-230). Validación: revisar cobertura de comandos documentados.
Contrato: rollback: Eliminar los docs de development agregados.. Status: done

#### S3.T4 — Tests de paridad de configuración (cada variable del schema zod figura en server/.env.example y viceversa) y guardas de .vscode (sin rutas absolutas ni tokens).
Contrato: rollback: Eliminar los tests agregados.. Status: done

#### S4.T1 — Agregar al workflow de CI la comprobación de que los comandos documentados existen en el package.json y de que doctor --help responde. Validación: correr el job en un caso que deba fallar.
Contrato: rollback: Revertir el job/pasos agregados al workflow de CI.. Status: done

#### S4.T2 — Regresión: CI falla si un comando documentado no existe, si doctor --help no responde o si .env.example diverge del schema zod.
Contrato: rollback: Eliminar los tests/verificaciones agregados al workflow de CI.. Status: done
## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2
- [x] S1.T3
- [x] S1.T4
- [x] S1.T5

**Gate (auto)**: Desde cualquier subdirectorio, pnpm run check/test corren igual que desde la raíz; pnpm run doctor reporta toolchain y puertos con enlaces y sale !=0 si Docker está caído; pnpm run bootstrap deja dependencias, config validada y generate corrido.

### Session 2 · T2 · continue

**Tasks:**
- [x] S2.T1
- [x] S2.T2
- [x] S2.T3

**Gate (auto)**: pnpm dev:services levanta y baja el Compose existente sin duplicarlo; pnpm dev arranca el backend real (tsx watch, leyendo server/.env) y resuelve el host por tipo de dispositivo (10.0.2.2 emulador Android, loopback iOS Simulator, adb reverse Android fisico por USB, IP de red en otro dispositivo) inyectandolo a la app por --dart-define=API_BASE_URL con precedencia sobre el JSON del sabor, e imprime URLs y dispositivo; la sonda de disponibilidad usa el endpoint existente saludVivo (GET /health/live). La parte observable en dispositivo (la app alcanza el backend en emulador/USB) queda como verificacion manual cuando exista la capa HTTP de la app (fuera de HU-00-13), porque hoy la app no tiene cliente HTTP.

### Session 3 · T1 · continue

**Tasks:**
- [x] S3.T1
- [x] S3.T2
- [x] S3.T3
- [x] S3.T4

**Gate (auto)**: .editorconfig y .vscode/ versionados sin tokens, IDs Apple ni rutas absolutas; .env.example raíz y server/.env.example en paridad con el schema zod; docs/development/*.md documentan los comandos.

### Session 4 · T1 · continue

**Tasks:**
- [x] S4.T1
- [x] S4.T2

**Gate (auto)**: La CI verifica que los comandos documentados existen y que doctor --help responde, y falla si .env.example diverge del schema zod.
