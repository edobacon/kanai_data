# Guía de implementación · TAO-008 / HU-00-01

> Estructura del monorepo, `CODEOWNERS`, plantillas de issue y PR y archivos base de colaboración.
> Fuente: maqueta estática aprobada. Esta guía describe **artefactos de repositorio**, no interfaz de producto: las "vistas" son superficies que GitHub renderiza a partir de archivos versionados, más las salidas de consola que los criterios de aceptación exigen como evidencia.

---

## 0 · Naturaleza del entregable

La maqueta se lee como un documento de verificación de once vistas. Solo tres tipos de artefacto son **implementables**:

| Tipo | Vistas de la maqueta | Qué se escribe |
|---|---|---|
| Archivos versionados | 1, 2, 3, 4, 5, 6, 7 | `README.md`, `CONTRIBUTING.md`, `.gitignore`, `.nvmrc`, `package.json`, `pnpm-workspace.yaml`, `.github/**` |
| Evidencia reproducible | 8, 9, 10 | Comandos que el autor ejecuta y pega en el PR |
| Estados observables | 11 | Condiciones de falla a reconocer; no se codifican, se documentan y verifican |

Ninguna vista requiere CSS, componentes ni build de frontend. La maqueta usa HTML solo para **representar** cómo GitHub renderiza los archivos. No se entrega la maqueta como página.

**Inventario de archivos a entregar:**

```
.nvmrc
package.json                 (modificado: packageManager)
pnpm-workspace.yaml
pnpm-lock.yaml               (versionado)
.gitignore
README.md                    (modificado)
CONTRIBUTING.md              (nuevo)
.github/CODEOWNERS
.github/pull_request_template.md
.github/ISSUE_TEMPLATE/config.yml
.github/ISSUE_TEMPLATE/epica.yml
.github/ISSUE_TEMPLATE/historia.yml
.github/ISSUE_TEMPLATE/task.yml
.github/ISSUE_TEMPLATE/bug.yml
.github/ISSUE_TEMPLATE/content-asset.yml
.github/ISSUE_TEMPLATE/spike.yml
server/package.json          (propio, fuera del workspace)
server/pnpm-lock.yaml        (propio, versionado)
```

---

## 1 · Vista 1 — README raíz (REQ-06, REQ-01, DEC-160)

**Archivo:** `README.md` en la raíz. Vista **modificada**.

### Jerarquía

1. `# Tao Mangalam` + párrafo de encuadre
2. `## Mapa de carpetas` → tabla de tres columnas
3. `## Inicio rápido` → bloque de código de cuatro pasos comentados
4. Callout informativo: por qué `server/` se instala aparte
5. `## Convenciones` → lista de tres enlaces

### Textos exactos

**Párrafo de encuadre:**

> Monorepo de la aplicacion. La app cliente vive en `app/`, el backend en `server/` y la documentacion canonica en `docs/`. El contrato de API es la fuente de verdad compartida.

**Tabla `Mapa de carpetas`** — columnas: `Carpeta` | `Contenido` | `Instalacion`. Seis filas, en este orden:

| Carpeta | Contenido | Instalacion |
|---|---|---|
| `app/` | Aplicacion cliente. Incluye `app/assets/`, que se preserva sin cambios. | Workspace `pnpm` de la raiz |
| `server/` | Backend. Tiene su propio `package.json` y `pnpm-lock.yaml`. | **Fuera** del workspace raiz |
| `server/contract/` | Contrato de API (`openapi.yaml`). Area con owner declarado. | Incluido en `server/` |
| `docs/` | Documentacion canonica. Ninguna ruta se renombra ni se mueve. | No aplica |
| `scripts/` | Gates documentales y utilidades (`check_*.py`, `build_*.py`). | Python del entorno local |
| `tests/` | Pruebas del repositorio. | Workspace `pnpm` de la raiz |

**Bloque `Inicio rápido`** — literal, con los comentarios numerados:

```bash
# 1. Node de la minor fijada en .nvmrc
nvm use

# 2. Habilitar el pnpm que declara packageManager
corepack enable

# 3. Instalar el workspace de la raiz (app/, tests/)
pnpm install --frozen-lockfile

# 4. Instalar el backend por separado: server/ no es parte del workspace
cd server && pnpm install --frozen-lockfile
```

**Callout informativo** (en markdown: blockquote o `> [!NOTE]`):

> **Por que `server/` se instala aparte**
> El backend es autoinstalable y no depende de nada fuera de `server/`. Un `pnpm install` en la raiz no crea ni modifica `server/pnpm-lock.yaml`.

**`Convenciones`** — tres ítems:

- Ramas, squash merge y proceso de PR: `CONTRIBUTING.md` (enlace relativo)
- Revision obligatoria por area: `.github/CODEOWNERS`
- Formularios de issue y plantilla de PR: `.github/`

### Restricción dura

No se renombra ni se mueve ninguna ruta bajo `docs/`. Todo enlace existente hacia `docs/` debe seguir resolviendo tras el PR (lo valida `check_citas.py`, vista 10).

---

## 2 · Vista 2 — CONTRIBUTING.md (REQ-05)

**Archivo:** `CONTRIBUTING.md` en la raíz. Vista **nueva**.

### Jerarquía

1. `# Guia de contribucion`
2. `## Modelo de ramas` → frase + tabla de cuatro prefijos
3. `## Integracion` → lista de tres reglas
4. `## Que ignora el repositorio` → tabla de dos columnas
5. Callout de privacidad

### Textos exactos

**Modelo de ramas** — frase de apertura, con el énfasis tal como está en la maqueta:

> Todo sale de `main` y vuelve a `main`. **No existe rama `develop`.**

Tabla — columnas `Prefijo` | `Cuando se usa` | `Ejemplo`:

| Prefijo | Cuando se usa | Ejemplo |
|---|---|---|
| `feature/*` | Funcionalidad nueva o historia del backlog. | `feature/hu-00-01-monorepo` |
| `fix/*` | Correccion de un defecto reportado. | `fix/sesion-expira-antes` |
| `chore/*` | Mantenimiento, dependencias, tooling, documentacion. | `chore/bump-node-24` |
| `hotfix/*` | Correccion urgente sobre lo publicado. | `hotfix/login-500` |

**Integracion** — tres viñetas literales:

- **Squash merge** como unica estrategia. Un PR deja un commit en `main`.
- El titulo del squash describe el cambio completo, no el ultimo commit de la rama.
- La rama se borra al mergear.

**Que ignora el repositorio** — tabla de dos columnas, una sola fila, cada celda con lista vertical:

| Siempre excluido | Siempre versionado |
|---|---|
| `.env` y `.env.local` en cualquier carpeta<br>Binarios compilados y artefactos de build<br>Certificados y claves<br>Perfiles de firma<br>Generados temporales y caches | `pnpm-lock.yaml` de la raiz<br>`server/pnpm-lock.yaml`<br>`server/prisma/migrations/**`<br>`server/contract/openapi.yaml`<br>`.nvmrc` y `pnpm-workspace.yaml` |

**Callout de privacidad:**

> **Privacidad al abrir issues y PR**
> No incluyas correos reales, nombres completos ni datos de consultantes en titulos, descripciones ni capturas. Usa datos ficticios o anonimizados.

### Contrato con `.gitignore`

La tabla anterior **es la especificación** de `.gitignore`. La columna izquierda produce reglas de ignore; la derecha produce negaciones explícitas (`!`) donde una regla ancha pudiera capturarlas. El par `.env` en cualquier carpeta debe usar patrón sin ancla de directorio (`.env`, `.env.local`), no `/.env`, para que `server/.env` y `app/.env.local` queden cubiertos — es lo que verifica QA-00-01-04.

---

## 3 · Vista 3 — Selector de issues (REQ-04)

**Archivos:** `.github/ISSUE_TEMPLATE/config.yml` + seis `.yml`. Vista **nueva**.

La pantalla `issues/new/choose` la renderiza GitHub; se controla vía el `name` y `description` de cada plantilla y el orden de los archivos.

### Orden y contenido de las seis filas

El orden mostrado es **el orden de trabajo del backlog**, no alfabético. GitHub ordena las plantillas alfabéticamente por nombre de archivo; para conservar este orden hay que nombrar los archivos con prefijo numérico o aceptar el orden alfabético como desviación. **Recomendación:** prefijar (`1-epica.yml`, `2-historia.yml`, …) manteniendo el `name` limpio, o declarar el orden mediante los nombres de archivo ya elegidos si el equipo prefiere rutas legibles. Decidir antes de crear los archivos; cambiar el nombre después rompe las URL `?template=`.

| # | Icono maqueta | `name` | `description` |
|---|---|---|---|
| 1 | ◈ | Epica | Agrupa historias bajo un mismo resultado de negocio. ID estable `EP-nn`. |
| 2 | ▤ | Historia | Unidad entregable con criterios de aceptacion y casos de prueba. ID estable `HU-nn-nn`. |
| 3 | ✓ | Task | Trabajo tecnico u operativo que no produce valor observable por si solo. |
| 4 | ! | Bug | Comportamiento observado distinto del esperado, con pasos de reproduccion. |
| 5 | ▣ | Content / asset | Alta o cambio de contenido, texto o recurso grafico. Incluye estado del asset y licencia. |
| 6 | ? | Spike | Investigacion acotada en tiempo para resolver una incognita antes de comprometer alcance. |

Los iconos de la maqueta son decorativos del documento de verificación. GitHub no renderiza iconos por plantilla; si se quiere señal visual, va como emoji al inicio del `name`. La maqueta no lo pide — **no agregar emoji** salvo decisión explícita.

### Encabezado de la pantalla

Título: `Elige el tipo de trabajo`. Bajada:

> Cada formulario carga los campos canonicos del backlog. Completalos antes de enviar: el gate `check_backlog.py` valida despues la misma estructura.

Este texto no tiene lugar propio en `config.yml`; GitHub no permite subtítulo en el chooser. Se pierde en la superficie real. **Trasladarlo** al `description` del primer bloque `markdown` de cada formulario, o al `CONTRIBUTING.md`. Registrar la desviación en el PR.

### `config.yml`

```yaml
blank_issues_enabled: false
```

Esto produce la fila "Issue en blanco · deshabilitado" de la maqueta. `contact_links` queda vacío salvo que el equipo quiera enlaces externos: la maqueta no muestra ninguno.

---

## 4 · Vista 4 — Formulario "Historia" (REQ-04, DEC-237)

**Archivo:** `.github/ISSUE_TEMPLATE/historia.yml`. Vista **nueva**. Es el formulario de referencia; los otros cinco heredan su esqueleto.

La maqueta muestra el formulario **precargado** con el contenido de HU-00-01 para verificar que cada sección del doc 48 (§2 a §7) tiene su campo. Esos valores son **ejemplo de verificación, no defaults**: los campos se entregan vacíos, con `placeholder` y `description` que guían. La única excepción son los `dropdown` y `checkboxes`, cuyas opciones sí son parte del contrato.

### Estructura por secciones

Ocho bloques, separados en la maqueta por divisores. En GitHub Issue Forms el divisor se representa con un bloque `markdown` que lleva el título de sección en mayúsculas pequeñas (`### Identidad`, etc.) o con `---`.

#### 4.1 Identidad

| Campo | Tipo | Obligatorio | Ayuda / opciones |
|---|---|---|---|
| Titulo | `input` | sí | — |
| ID estable | `input` | sí | "Formato `HU-nn-nn`. No cambia aunque cambie el titulo." |
| Epica | `dropdown` | sí | Lista de épicas. Ejemplo mostrado: `EP-00 · Fundaciones` |
| Estado | `dropdown` | sí | Ejemplo mostrado: `Ready` |
| Orden recomendado | `input` | no | Numérico |

Disposición en la maqueta: Titulo e ID estable en dos columnas; Epica / Estado / Orden en tres. **GitHub Issue Forms no tiene layout en columnas** — todos los campos se apilan verticalmente. Mantener el **orden** de lectura de la maqueta (izquierda a derecha, luego siguiente fila) es lo que se conserva.

#### 4.2 Objetivo y alcance

- **Objetivo** — `textarea`, obligatorio. Ayuda: "Resultado observable y quien lo consume."
- **Alcance · incluye** — `textarea`, obligatorio. Lista con guiones.
- **Alcance · no incluye** — `textarea`, obligatorio. Lista con guiones, típicamente derivando a otras historias.

#### 4.3 Referencias canónicas

Seis `input`, todos opcionales, con placeholder `ninguna` / `ninguno` según género:

`Vistas` · `Decisiones` · `Datos` · `API` · `Capacidades` · `Contenido / assets`

#### 4.4 Criterios de aceptación

Un único `textarea`, obligatorio. Ayuda literal:

> Uno por linea, en formato Dado / cuando / entonces. El gate valida que haya al menos uno.

Formato de cada línea: `- [ ] Dado …, cuando …, entonces ….` El `value` por defecto puede traer la casilla vacía `- [ ] ` como semilla de formato.

#### 4.5 Requisitos transversales

Seis `input`, opcionales, con placeholder `No aplica`:

`Permisos` · `Offline / sync` · `Seguridad / privacidad` · `Accesibilidad / responsive` · `Observabilidad` · `Compatibilidad / migracion`

#### 4.6 Casos de prueba y evidencia

- **Casos `QA-nn-nn-nn`** — `textarea`, **obligatorio**. Formato por línea: `- [ ] QA-nn-nn-nn · <descripcion>`
- **Unitarias**, **Integracion / E2E**, **QA humana y dispositivos**, **Preview / artifact** — cuatro `input` opcionales, placeholder `No aplica`.

#### 4.7 Planificación

| Campo | Tipo | Opciones visibles en maqueta |
|---|---|---|
| Hito | `dropdown` | `M0`, … |
| Prioridad | `dropdown` | `P1`, … |
| Puntos | `dropdown` | `3`, … (escala del equipo) |
| Riesgo | `dropdown` | `Bajo`, … |
| Bloqueada por | `input` | placeholder `ninguna` |
| Bloquea a | `input` | — |

Las opciones completas de cada `dropdown` no están en la maqueta (solo el valor seleccionado del ejemplo). Definirlas con el equipo antes de escribir el YAML; el valor mostrado debe existir en la lista.

#### 4.8 Handoff a Kanai — **selectivo** (DEC-237)

Esta es la interacción no trivial del formulario. Se compone de:

1. Un `checkboxes` de una sola opción: **"Enviar esta historia a Kanai"**, con la aclaración:
   > Selectivo: si queda sin marcar, los campos siguientes se omiten y el issue vive solo en GitHub.
2. Un bloque de campos dependientes, marcado visualmente en la maqueta con una barra vertical de acento a la izquierda:

| Campo | Tipo | Nota |
|---|---|---|
| Tipo de trabajo | `dropdown` | Ejemplo: `implement` |
| Modulo | `input` | Ejemplo: `EP-00` |
| Estimacion publicada | `input` | Ejemplo: `3 puntos · tier por intake` |
| Fuentes por criterio y caso | `input` | — |
| Referencia externa | `input` | Ayuda: "Se completa al tomar el issue." Placeholder: `GH-<numero> y URL` |
| Rollback | `textarea` | — |
| Diseno | `input` | — |

**Limitación que hay que resolver explícitamente:** GitHub Issue Forms **no soporta campos condicionales**. No existe forma de ocultar el bloque dependiente cuando la casilla está sin marcar. Implementación fiel al comportamiento, no al pixel:

- Todos los campos del bloque se declaran **opcionales** (`required: false`).
- Un bloque `markdown` inmediatamente antes del grupo reproduce la semántica: "Los campos siguientes **solo** se completan si marcaste *Enviar esta historia a Kanai*. Si no, déjalos vacíos."
- El consumidor aguas abajo (automatización de handoff) lee la casilla como el interruptor; si está sin marcar, ignora el bloque aunque traiga texto.

Esta es la desviación de mayor peso entre maqueta y superficie real. Debe quedar anotada en el PR.

#### 4.9 Confirmación de privacidad

`checkboxes` con una opción **obligatoria** (`required: true`):

> Confirmo que este issue no contiene correos reales, nombres completos ni datos de consultantes.

Va al final, después del handoff, separada por divisor.

#### Botones

`Vista previa` y `Crear issue` los aporta GitHub. No se implementan.

---

## 5 · Vista 5 — Los otros cinco formularios (REQ-04)

Todos comparten con Historia: **identidad**, **referencias canónicas**, **planificación**, **handoff selectivo a Kanai** y **confirmación de privacidad**. Abajo va solo lo propio de cada uno, que es exactamente lo que la maqueta muestra.

### 5.1 `epica.yml` — ◈ Epica

| Campo | Tipo | Oblig. | Placeholder / ayuda |
|---|---|---|---|
| ID estable | `input` | — | `EP-nn` |
| Resultado de negocio | `textarea` | **sí** | Que cambia para quien cuando la epica cierra. |
| Historias que agrupa | `textarea` | no | HU-nn-nn, una por linea. Se puede dejar vacio y completar despues. |
| Criterio de cierre | `textarea` | **sí** | Condicion observable que permite dar la epica por terminada. |
| Hito | `dropdown` | no | `Selecciona` |
| Handoff a Kanai | `checkboxes` | no | Enviar a Kanai |

**Regla:** sin criterios de aceptación ni casos QA. Viven en sus historias.

### 5.2 `task.yml` — ✓ Task

| Campo | Tipo | Oblig. | Placeholder / ayuda |
|---|---|---|---|
| Historia o epica asociada | `input` | no | HU-nn-nn o EP-nn. Vacio si es trabajo independiente. |
| Trabajo a realizar | `textarea` | **sí** | Pasos concretos. Sin valor observable de usuario. |
| Definicion de hecho | `textarea` | **sí** | `- [ ] Condicion verificable` |
| Es operativa (fuera del codigo) | `checkboxes` | no | Se resuelve en GitHub, en un panel o en un servicio, no en el repositorio. |
| Handoff a Kanai | `checkboxes` | no | Enviar a Kanai |

**Regla:** la marca de tarea operativa evita que un trabajo sin código espere un PR. El consumidor aguas abajo debe respetarla.

### 5.3 `bug.yml` — ! Bug

| Campo | Tipo | Oblig. | Placeholder / ayuda |
|---|---|---|---|
| Comportamiento observado | `textarea` | **sí** | Que pasa hoy. |
| Comportamiento esperado | `textarea` | **sí** | Que deberia pasar y por que (referencia canonica si existe). |
| Pasos para reproducir | `textarea` | **sí** | `1.` / `2.` / `3.` en líneas separadas |
| Severidad | `dropdown` | no | `Selecciona` |
| Frecuencia | `dropdown` | no | `Selecciona` |
| Entorno y dispositivo | `input` | no | Version, sistema, dispositivo |
| Evidencia | `textarea` | no | Capturas o logs, sin correos reales ni datos de consultantes. |

**Regla:** el recordatorio de privacidad va **en la ayuda del campo Evidencia**, además de la casilla obligatoria común del pie.

### 5.4 `content-asset.yml` — ▣ Content / asset

| Campo | Tipo | Oblig. | Opciones / placeholder |
|---|---|---|---|
| Tipo | `dropdown` | **sí** | `Texto`, `Imagen`, `Audio`, `Icono` |
| Ubicacion destino | `input` | no | `app/assets/...` |
| Estado del contenido | `dropdown` | **sí** | `Pendiente`, `Borrador`, `Aprobado` |
| Origen y licencia | `textarea` | **sí** | De donde sale y bajo que licencia se puede usar. |
| Criterio de aceptacion del asset | `textarea` | no | Formato, dimensiones, peso maximo, texto alternativo. |
| Reemplaza a | `input` | no | Ruta del asset anterior, si aplica. |

**Regla:** `app/assets/` existente se preserva sin cambios; este formulario cubre altas y reemplazos futuros.

### 5.5 `spike.yml` — ? Spike

| Campo | Tipo | Oblig. | Opciones / placeholder |
|---|---|---|---|
| Pregunta a responder | `textarea` | **sí** | Una sola incognita, formulada como pregunta cerrada. |
| Decision que desbloquea | `textarea` | **sí** | Que se puede decidir cuando el spike termine. DEC-nnn si ya existe. |
| Tiempo maximo | `dropdown` | **sí** | `4 h`, `1 dia`, `2 dias` |
| Hito | `dropdown` | no | `Selecciona` |
| Bloquea a | `input` | no | `HU-nn-nn` |
| Entregable | `textarea` | **sí** | Que queda escrito al terminar: nota en docs/, prototipo desechable, comparativa. El codigo de un spike no se mergea. |
| Handoff a Kanai | `checkboxes` | no | Enviar a Kanai (tipo de trabajo: `research`) |

**Regla:** el tiempo máximo es obligatorio — un spike sin tope deja de ser un spike.

---

## 6 · Vista 6 — Plantilla de PR (REQ-04)

**Archivo:** `.github/pull_request_template.md`. Vista **nueva**.

### Contenido literal

Se entrega exactamente este markdown. Los comentarios HTML son parte del entregable: guían al autor y desaparecen del PR renderizado.

```markdown
## Proposito
<!-- Que resuelve este PR y para quien. Enlaza el issue: Closes #nn -->

## Riesgo
<!-- Bajo / Medio / Alto + que puede romperse y como se detecta -->
- Nivel:
- Que puede fallar:
- Como se revierte:

## Pruebas
- [ ] Unitarias
- [ ] Integracion o E2E
- [ ] Verificacion manual descrita abajo

<!-- Pega la salida relevante (por ejemplo pnpm install --frozen-lockfile) -->

## Capturas
<!-- Antes / despues. Sin correos reales ni datos de consultantes. -->

## docs-impact
<!-- Elige exactamente uno -->
- [ ] required        <!-- hay que escribir o actualizar documentacion a mano -->
- [ ] generated-only  <!-- la documentacion se regenera con los build_*.py -->
- [ ] none            <!-- el cambio no toca documentacion -->

## QA humana
- Resultado: <!-- Aprobada / Aprobada con observaciones / Rechazada / No aplica -->
- Quien la ejecuto:
- Dispositivos o entornos:
- Observaciones:
```

### Invariantes

- **Seis secciones**, siempre presentes, en este orden: Proposito, Riesgo, Pruebas, Capturas, docs-impact, QA humana.
- **`docs-impact` admite exactamente un valor** de tres: `required`, `generated-only`, `none`. La plantilla lo dice en el comentario; no hay validación automática en esta historia (queda para HU-00-09).
- **QA humana queda visible aunque no aplique.** El valor `No aplica` es una respuesta legítima; borrar la sección no lo es.
- La alineación de los comentarios inline en `docs-impact` (columna fija) es intencional para lectura en modo raw.

### Ejemplo completado

La maqueta incluye un segundo bloque, "Como queda una vez completado", como **referencia para el autor del PR de esta historia** — no forma parte del archivo. Es la evidencia esperada para este PR concreto:

- **Proposito:** Deja el monorepo con workspace `pnpm`, revision por area y plantillas de colaboracion. Closes #2.
- **Riesgo:** Nivel bajo. *Que puede fallar:* si `pnpm-workspace.yaml` incluyera `server/`, un install en la raiz reescribiria `server/pnpm-lock.yaml`. *Como se revierte:* revert del squash; los issues ya publicados no se borran.
- **Pruebas:** Integracion o E2E (gates documentales en local) + Verificacion manual (QA-00-01-01 a QA-00-01-05).
- **docs-impact:** `generated-only` — los `build_*.py --check` cubren el cambio.
- **QA humana:** Aprobada, con capturas de los seis formularios y del revisor requerido.

---

## 7 · Vista 7 — CODEOWNERS y su efecto en el PR (REQ-03, QA-00-01-02)

**Archivo:** `.github/CODEOWNERS`. Vista **nueva** en cuanto a efecto observable; la pantalla de PR la renderiza GitHub.

### Reglas declaradas

Cinco áreas críticas, en este orden:

| Patrón | Área |
|---|---|
| `/server/contract/` | Contrato de API |
| `/server/prisma/migrations/` | Migraciones de base de datos |
| `/.github/workflows/` | Workflows de CI |
| `/server/src/auth/`, `/server/src/permissions/` | Autenticacion y permisos |
| `/app/native/` | Codigo nativo de respaldo |

Los patrones van anclados con `/` inicial (ruta desde la raíz del repo), no como glob suelto: evita capturar rutas homónimas anidadas.

### Owners

Los usuarios y equipos concretos son **variable operativa** (doc 46 §1) y se completan al publicar el repositorio. La maqueta usa el marcador `owner-contrato`.

**Restricción funcional crítica:** un owner declarado que no tenga acceso de escritura al repositorio hace que **la regla se ignore silenciosamente** y el área quede sin revisión requerida (ver estado de error, vista 11). Al completar los owners reales hay que verificar la pestaña de `CODEOWNERS` en GitHub: reporta errores por línea. Mientras el repo no esté publicado, dejar los marcadores documentados como pendiente explícito en el PR, no como owners inventados.

### Comportamiento esperado a verificar

Un PR que toca **solo** `server/contract/openapi.yaml`:

- El archivo aparece en "Archivos modificados · 1", con diff `+4 / -2` en el ejemplo.
- GitHub agrega el owner del contrato al panel **Reviewers** con la marca `requerido`, **sin que nadie lo pida**.
- Nota en el cuerpo del PR: *Este PR toca `server/contract/`. La regla de `CODEOWNERS` solicito automaticamente la revision de su owner. El PR no se puede mergear sin esa aprobacion.*

La última frase — "no se puede mergear sin esa aprobacion" — **requiere protección de rama con *Require review from Code Owners* activada**, que es alcance de HU-00-09. En esta historia se verifica únicamente que el revisor **se solicita** automáticamente. Al redactar el PR, no afirmar el bloqueo de merge como ya vigente.

El resto del panel lateral de la maqueta (Assignees, Labels `contract` y `docs-impact: none`, Projects "Tao Mangalam · Backlog") es contexto de GitHub y de la operación DEC-203, no archivo a entregar.

---

## 8 · Vista 8 — Evidencia de instalación reproducible (REQ-01, REQ-02, DEC-205, DEC-230)

Cuatro corridas de consola. Son **la evidencia que se pega en el PR**, por lo que su forma también se verifica: cada bloque debe mostrar el comando, la salida y el código de salida.

### 8.1 QA-00-01-01 · Clon limpio, raíz — éxito

```console
$ node -v
v24.8.0
$ corepack enable
$ pnpm install --frozen-lockfile
Lockfile is up to date, resolution step is skipped
Packages: +312
Progress: resolved 312, reused 312, downloaded 0, done

Done in 6.2s
$ echo $?
0
$ git status --porcelain
(sin salida: arbol limpio)
```

Lectura: código 0 y `git status` limpio → el lockfile no se reescribió.

### 8.2 QA-00-01-03 · Borde, lockfile desactualizado — **fallo esperado**

```console
$ pnpm install --frozen-lockfile
ERR_PNPM_OUTDATED_LOCKFILE
Cannot install with "frozen-lockfile" because
pnpm-lock.yaml is not up to date with package.json

Failure reason:
specifiers in the lockfile don't match specifiers
in package.json

$ echo $?
1
```

Lectura: el fallo es el comportamiento correcto — el gate protege la reproducibilidad. Este caso **debe** aparecer en la evidencia; un PR que solo muestre casos verdes no cubre el criterio.

### 8.3 `server/` copiado solo a otra ubicación — éxito (DEC-205)

```console
$ cp -R server /tmp/server-aislado
$ cd /tmp/server-aislado
$ pnpm install --frozen-lockfile
Lockfile: /tmp/server-aislado/pnpm-lock.yaml
Lockfile is up to date, resolution step is skipped
Packages: +187

Done in 4.1s
$ echo $?
0

# No leyo nada fuera de server/
```

Lectura: `server/` es autoinstalable.

### 8.4 QA-00-01-05 · Dependencia nueva solo en `server/` — éxito (DEC-230)

```console
$ cat pnpm-workspace.yaml
packages:
  - "app"
  - "tests"
# server/ no aparece (DEC-230)

$ pnpm install   # en la raiz
Already up to date
Done in 1.1s

$ git status --porcelain
 M server/package.json
 M server/pnpm-lock.yaml
# pnpm-lock.yaml de la raiz: sin cambios
```

Lectura: el lockfile de la raíz no se toca cuando cambia una dependencia del backend.

### Contrato de configuración que estas salidas fijan

- `.nvmrc` fija una **minor concreta** (la maqueta muestra `v24.8.0`), no `24` a secas.
- `package.json` raíz declara `packageManager` con la versión exacta de pnpm — es lo que habilita `corepack enable`.
- `pnpm-workspace.yaml` contiene **exactamente** `app` y `tests`. `server` **no** aparece. Es el invariante que sostiene REQ-02 y el riesgo declarado en el PR.
- `server/package.json` y `server/pnpm-lock.yaml` son autosuficientes: ninguna ruta relativa sale de `server/`.

Los números (`+312`, `6.2s`, `v24.8.0`) son marcadores de la maqueta; la evidencia real los reemplaza. Lo que **no** cambia es la forma: comando, salida, `echo $?`, lectura de una línea.

---

## 9 · Vista 9 — `.gitignore` frente a secretos (REQ-05, QA-00-01-04)

Dos corridas complementarias: una verifica que lo prohibido **no** entra; la otra que lo necesario **sí** queda.

### 9.1 Secretos en cualquier carpeta

```console
$ printf 'TOKEN=ficticio\n' > server/.env
$ printf 'API=local\n' > app/.env.local
$ git add -A --dry-run
add 'CONTRIBUTING.md'
add 'README.md'
add '.github/CODEOWNERS'
add '.github/pull_request_template.md'
add '.nvmrc'
add 'pnpm-workspace.yaml'

server/.env y app/.env.local no aparecen
```

Los valores son **ficticios** por obligación: la prueba se ejecuta y se pega en un PR público.

### 9.2 Lo que sí debe versionarse

```console
$ git check-ignore -v \
    pnpm-lock.yaml \
    server/pnpm-lock.yaml \
    server/prisma/migrations/0001_init/migration.sql \
    server/contract/openapi.yaml

(sin salida: ninguno esta ignorado)
$ echo $?
1

# Codigo 1 = ningun archivo coincide con una regla
# de ignore. Es el resultado buscado.
```

Contraintuitivo y hay que anotarlo en el PR: **código 1 es el éxito** aquí. `git check-ignore` devuelve 0 cuando encuentra coincidencias, es decir cuando algo está ignorado — exactamente lo que no queremos para estos cuatro.

---

## 10 · Vista 10 — Gates documentales (REQ-07)

Corrida local que se adjunta como evidencia. No se agregan gates nuevos: se verifica que los archivos nuevos de colaboración **no rompen** los existentes.

| Gate | Estado esperado | Lectura |
|---|---|---|
| `check_citas.py` | ✓ | Todas las citas resuelven |
| `check_cobertura.py` | ✓ | Sin huecos nuevos |
| `build_*.py --check` | ✓ | Generados al dia |
| `unittest` | ✓ | Sin regresiones |
| `check_backlog.py` | ✓ | HU-00-01 con estructura valida |

Los tiempos de la maqueta (`0.8 s`, `1.2 s`, …) son marcadores.

Nota de continuidad: estos mismos cinco nombres se reutilizan en HU-00-09 como checks obligatorios de CI. Los nombres de script no deben cambiar en esta historia.

---

## 11 · Vista 11 — Estados vacío, de carga y de error (transversal: REQ-04, REQ-03, REQ-07)

Ninguno de estos estados se **implementa**: son condiciones observables que el verificador debe reconocer sin leer logs. Se documentan en el PR como lista de verificación.

### 11.1 Selector · vacío

> **Sin formularios disponibles**
> No hay archivos en `.github/ISSUE_TEMPLATE/`. Revisa que los seis `.yml` esten en la rama por defecto.

Si aparece esto, **la historia no está cumplida**. Causa típica: las plantillas se mergearon a una rama que no es la por defecto — GitHub solo lee `.github/ISSUE_TEMPLATE/` de la rama default.

### 11.2 Selector · carga

Estado transitorio mientras GitHub resuelve la carpeta de plantillas. Texto: `Cargando formularios...`. No accionable.

### 11.3 Selector · error — **modo de falla más probable**

> **Un formulario no se pudo cargar**
> `historia.yml`: el campo `id` de un input esta duplicado. El formulario no se ofrece hasta corregir el YAML.

Los otros cinco siguen disponibles. **El error se ve solo en la pantalla del selector, no en el archivo** — es decir, un YAML inválido no rompe nada visible hasta que alguien intenta abrir un issue.

**Consecuencia para la implementación:** todos los `id` de campo deben ser únicos **dentro de cada archivo**. Conviene prefijarlos por sección (`ident-titulo`, `alcance-incluye`, `kanai-tipo`) y revisarlos antes de abrir el PR. Es el chequeo barato que evita la falla más probable de la historia.

### 11.4 Revisores · vacío

> **Sin revisor requerido**
> El PR no toca ninguna area con owner declarado. Se puede pedir revision manualmente.

Correcto para un PR que solo cambia, por ejemplo, `README.md`. Es un estado **válido**, no un error.

### 11.5 CODEOWNERS · error — falla silenciosa

> **CODEOWNERS tiene errores**
> Linea 7: el owner declarado no tiene acceso de escritura al repositorio. Esa regla se ignora y el area queda sin revision requerida.

Peligrosa porque el PR se puede mergear sin que nadie note que faltó el owner. Se verifica en la **pestaña del archivo `CODEOWNERS` en GitHub**, que lista los errores por línea. Incluir esa captura en la evidencia del PR.

### 11.6 Gates · error

Corrida parcial: `check_citas.py` ✓ → `check_cobertura.py` ✕ (1 hueco) → `build_*.py --check` omitido.

> **Cobertura incompleta**
> `CONTRIBUTING.md` introduce una afirmacion sin referencia canonica. Agrega la cita o excluye el archivo de la regla.

Estado que **bloquea el cierre** de la historia (REQ-07). Es el riesgo concreto de agregar `CONTRIBUTING.md`: texto nuevo sin cita canónica.

### 11.7 Plantilla de PR · antes / después

Contraste que verifica el criterio de precarga:

- **Antes:** cuadro en blanco (`Leave a comment`). Cada autor inventa su formato y `docs-impact` se olvida.
- **Después:** seis secciones siempre presentes — `## Proposito`, `## Riesgo`, `## Pruebas`, `## Capturas`, `## docs-impact`, `## QA humana` — aunque la respuesta sea "no aplica".

---

## 12 · Desviaciones entre maqueta y superficie real

La maqueta representa intención; GitHub impone límites. Estas cinco diferencias hay que declararlas en el PR, no resolverlas en silencio:

| # | Maqueta | Realidad | Resolución |
|---|---|---|---|
| 1 | Bloque Kanai oculto si el interruptor está apagado | Issue Forms no soporta campos condicionales | Campos opcionales + bloque `markdown` que explica la regla; el consumidor lee la casilla como interruptor |
| 2 | Campos en dos y tres columnas | Issue Forms apila verticalmente | Se conserva el **orden**, no el layout |
| 3 | Bajada "Elige el tipo de trabajo" | `config.yml` no admite subtítulo en el chooser | Trasladar al primer bloque `markdown` de cada formulario o a `CONTRIBUTING.md` |
| 4 | Orden de los seis formularios por backlog | GitHub ordena por nombre de archivo | Decidir prefijo numérico **antes** de crear los archivos; renombrar después rompe las URL `?template=` |
| 5 | "El PR no se puede mergear sin esa aprobacion" | Requiere protección de rama | Alcance de HU-00-09. Aquí solo se verifica que el revisor **se solicita** |

---

## 13 · Orden de implementación sugerido

Cada paso deja el repositorio funcional:

1. **Base de runtime** — `.nvmrc`, `packageManager` en `package.json` raíz, `pnpm-workspace.yaml` con `app` y `tests`. Validar con QA-00-01-01 y QA-00-01-05.
2. **`server/` autosuficiente** — su `package.json` y `pnpm-lock.yaml` propios. Validar con la copia a `/tmp`.
3. **`.gitignore`** — derivado de la tabla de CONTRIBUTING §2. Validar con QA-00-01-04 y `git check-ignore`.
4. **`CODEOWNERS`** — cinco reglas, owners como marcadores documentados. Validar abriendo el PR de prueba que toca `server/contract/openapi.yaml`.
5. **Plantillas** — `pull_request_template.md`, `config.yml`, seis `.yml`. Revisar unicidad de `id` antes de pushear. Validar en `issues/new/choose`.
6. **Documentos** — `CONTRIBUTING.md` y `README.md`. Validar con los gates documentales.
7. **Evidencia** — ejecutar las cuatro corridas de la vista 8, las dos de la vista 9 y los gates de la vista 10; pegar en el PR con el formato de la plantilla.

Los pasos 1 y 2 primero porque son los que pueden revelar un bloqueante temprano; los documentos al final porque `check_cobertura.py` los evalúa contra todo lo anterior.