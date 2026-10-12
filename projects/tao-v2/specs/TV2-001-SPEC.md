---
id: TV2-001-SPEC
project: tao-v2
ticket: TV2-001
status: approved
---

# X01: DEC del MVP para la web de administración y productor, y recordatorios

## Resumen ejecutivo

Se agrega en docs/decisiones/ una DEC nueva que fija las decisiones D-01 a D-12 de la ficha mvp/00-alcance-y-decisiones. La DEC lista con enlace las decisiones que supera o precisa y registra cuatro efectos: el backoffice pasa a la web en la matriz de superficies, D-11 abre la excepción de línea visual web, D-12 define el portal público de eliminación como vista del servidor (precisa DEC-229 y DEC-129) y la purga de cuentas de dispositivo inactivas de DEC-224 queda fuera del MVP con su clave de configuración declarada. También se agrega una nota de vuelta en DEC-105, DEC-229, DEC-153, DEC-163, DEC-129 y DEC-224. No se toca código del app (app/), el contenido de las fichas del KB ni lo diferido a v1 (21-extensiones-v1). Para verificarlo, `DOCS_DIFF_BASE=main pnpm docs:check` debe quedar verde con Node 24 y cada decisión superada o precisada debe tener su enlace en la DEC y la nota de vuelta en la DEC anterior. ADVERTENCIA: la nota de diseño sobre la web como superficie ampliable se deja como texto de la DEC y no agrega alcance. Si Producto exige revisión previa, eso es una espera fuera de la sesión y no una tarea.
Datos a confirmar antes de ejecutar: (1) el número de la DEC nueva, que es el siguiente libre en docs/decisiones/ de tao-v2@origin/main; (2) los nombres exactos de archivo de DEC-105, DEC-229, DEC-153, DEC-163, DEC-129 y DEC-224 en docs/decisiones/; (3) el nombre literal de la clave de configuración de la purga de DEC-224, que debe salir de mvp/00-alcance-y-decisiones o de la propia DEC-224 y no inventarse; (4) si mkdocs.yml (nav, cerca de la línea 17) lista las DEC una por una o las toma por carpeta, para saber si hay que agregar la entrada; (5) la plantilla o el frontmatter que exige docs:check para una DEC (copiarlo de la DEC más reciente).

## Requirements

### REQ-01 `inferred`
> Fuente: tao-v2/mkdocs.yml:17 (sitio de docs que publica docs/decisiones/; la ruta exacta de la DEC nueva se confirma al ejecutar)

Existe una DEC nueva en docs/decisiones/ que fija D-01 a D-12 de mvp/00-alcance-y-decisiones. Tiene una sección de decisiones superadas o precisadas con enlace relativo a DEC-105, DEC-229, DEC-153, DEC-163, DEC-129 y DEC-224, y registra cuatro efectos: el backoffice en la web y no solo en el app (matriz de superficies), la excepción de línea visual web (D-11), el portal público de eliminación como vista del servidor (D-12, que precisa DEC-229 y DEC-129) y la purga programada de DEC-224 fuera del MVP con su clave de configuración declarada.

### REQ-02 `inferred`
> Fuente: Request TV2-001, sección Repo y rutas (ajustes a DEC-105, DEC-229, DEC-153, DEC-163, DEC-129 y DEC-224)

Cada DEC anterior afectada (DEC-105, DEC-229, DEC-153, DEC-163, DEC-129 y DEC-224) recibe una nota breve que indica que la DEC nueva la supera o la precisa, con un enlace de vuelta, sin reescribir su decisión original.

### REQ-03 `confirmed`
> Fuente: Request TV2-001, Criterios de aceptación; tao-v2/mkdocs.yml:17

Con Node 24, `DOCS_DIFF_BASE=main pnpm docs:check` queda verde sobre el cambio y el sitio de docs sigue construyendo con la DEC nueva incluida.

### REQ-04 `inferred` `enforcement`
> Fuente: tao-v2/mkdocs.yml:17

La DEC nueva sigue la plantilla, el frontmatter y la convención de nombre de las DEC existentes en docs/decisiones/. Si mkdocs.yml lista las DEC una por una, se registra en su nav. No incluye contraseñas, tokens, OTP ni códigos de prueba.
## Tasks

#### S1.T1 — Crear la DEC nueva en docs/decisiones/ con el siguiente número libre y la plantilla de la DEC más reciente. Contenido: D-01 a D-12 tomadas de mvp/00-alcance-y-decisiones; una sección de decisiones superadas o precisadas con enlace relativo a DEC-105, DEC-229, DEC-153, DEC-163, DEC-129 y DEC-224; la matriz de superficies con el backoffice en la web; la excepción de línea visual web (D-11); el portal público de eliminación como vista del servidor (D-12, que precisa DEC-229 y DEC-129); la purga programada de DEC-224 fuera del MVP con el nombre literal de su clave de configuración; y una nota de diseño sobre la web como superficie ampliable. Si mkdocs.yml (nav, cerca de la línea 17) lista las DEC una por una, agregar la entrada.
Contrato: rollback: Borrar el archivo de la DEC nueva y revertir la entrada de mkdocs.yml si se agregó (git checkout de mkdocs.yml).. Status: done

#### S1.T2 — Agregar en DEC-105, DEC-229, DEC-153, DEC-163, DEC-129 y DEC-224 una nota breve que diga si la DEC nueva la supera o la precisa (DEC-229 y DEC-129: precisadas por D-12; DEC-224: purga fuera del MVP), con un enlace relativo a la DEC nueva. No modificar el texto de la decisión original.
Contrato: rollback: git checkout de los 6 archivos DEC modificados.. Status: done

#### S1.T3 — Regresión de docs: con Node 24 en el PATH (binario de ~/.nvm/versions/node/v24.*), correr `DOCS_DIFF_BASE=main pnpm docs:check` y, si corresponde, `pnpm run check`. Revisar en el diff contra main que las 6 DEC anteriores solo agregan la nota y que no hay secretos. Registrar el SHA, el comando, la salida y lo pendiente. Si una corrida no se pudo hacer, queda pendiente y no aprobada.
Contrato: rollback: No modifica archivos; si encuentra fallas, se corrigen en la task que las introdujo.. Status: done
## Cambios al modelo de datos

Ninguno.

## Sessions

### Session 1 · T1 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2
- [x] S1.T3

**Gate (auto)**: En docs/decisiones/ está la DEC nueva, enlazada de ida y vuelta con DEC-105, DEC-229, DEC-153, DEC-163, DEC-129 y DEC-224, y `DOCS_DIFF_BASE=main pnpm docs:check` queda verde con Node 24.
