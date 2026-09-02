---
id: SPEC-ui-copy-improve-orthography
project: pehuen
ticket: PEH-030
status: draft
---

# SPEC — Correccion ortografica del copy de UI (tildes/acentos)

# SPEC — Correccion ortografica del copy de UI (tildes/acentos)

## Purpose

- **Que se mejora:** el copy visible al usuario en pehuen-nuxt tiene tildes/acentos omitidos de forma sistematica (`Descripcion`, `Codigo`, `Guia`, `Contrasena`, `Sesion`, `Estadisticas`, etc.). No hay capa i18n: el copy esta hardcodeado en templates `.vue` y strings `.ts`.
- **Por que:** calidad de UI y consistencia. El caso disparador `Ano Plantacion` cambia de significado sin la tilde (`Año`). La UI ya renderiza tildes bien (`/importer` usa "Año"), asi que es inconsistencia de copy, no limitacion tecnica.
- **Para quien:** usuarios finales del sistema forestal.

## Delta

- **Antes:** 182 strings de copy visible sin la ortografia correcta, dispersos en 10 modulos + strings transversales.
- **Despues:** los 182 strings con ortografia correcta; 0 identificadores de codigo tocados; 0 cambio de comportamiento; suite de tests verde (asserts que tocaban el texto viejo actualizados en lockstep).
- **Alcance (que SE toca):** texto entre `>...<` en templates, `label=`/`placeholder=`/`title=`/`header:`/`description=`/`empty-message`, labels de botones, titulos de modales, toasts, y mensajes de error mostrados al usuario (Zod messages + `createError({ statusMessage })`).
- **Alcance (que NO se toca):** keys de objeto/campo, `accessorKey`, `name=` de campos, valores de enum, IDs, rutas, clases CSS, nombres de columna de CSV (`RUMA`, `TIPO`, `FECHA_GUIA`...), variables/props/composables, comentarios de codigo, logs internos. `periodo` (RAE valida sin tilde) y plurales que pierden tilde (`Dimensiones`) NO se tocan.

## Gate de necesidad/reuso (DET-32)

Cascada barato-primero sobre el enfoque:
1. **YAGNI:** el copy es visible al usuario; corregirlo es el objetivo del ticket → necesario.
2. **KB/codigo:** no existe copy correcto reusable ni tabla central.
3. **Framework/nativo:** no hay capa i18n instalada; introducir i18n seria un proyecto aparte (fuera de alcance — el ticket es ortografia, no arquitectura de traduccion).
4. **Config/reduccion:** no reducible; son strings hardcodeados individuales.
5. **Build:** editar in-place string por string.

**Veredicto:** `build` (correccion in-place). Introducir i18n = `drop` para este ticket (deuda futura separada, se puede anotar como follow-up). Registrar via `dkc-record-decision --step necessity-assessment`.

## Requirements

### REQ-IMPROVE-01 — Ortografia correcta en copy visible

> **Que cambia:** los 182 strings de copy visible pasan a su ortografia correcta (tildes/acentos).
> **Por que:** consistencia y correccion; `Ano`→`Año` corrige un cambio de significado.

El sistema MUST mostrar el copy visible con la ortografia correcta segun el inventario clasificado de este spec.

- GIVEN el form de guia (seccion Anexos) WHEN el usuario lo abre THEN el label dice "Año Plantación" (no "Ano Plantacion").
- Scope C (dev, 2026-07-20): cubre todos los modulos + strings internos visibles (errores/toasts).

### REQ-PRESERVE-01 — Cero cambio de identificadores/contratos (DET-7)

El sistema MUST mantener intactos todos los identificadores de codigo: keys de objeto/campo, `accessorKey`, `name=`, enums, IDs, rutas, clases, nombres de columna CSV, variables/props. Ningun contrato API/DB/Zod (shape, keys) cambia — solo el `message` de display de los Zod schemas.

### REQ-PRESERVE-02 — Suite de tests verde en lockstep (DET-7)

El sistema MUST mantener la suite verde. Cada string corregido que un test (e2e/unit) asertaba se actualiza en el MISMO lote. Gate: unit del modulo + gate e2e desktop (`test:e2e:ci`) verdes.

### REQ-PRESERVE-03 — Delta vs legacy sancionado (RULE-MIGRATION-004)

El legacy tiene el copy sin tildes. Corregir solo nuxt es un delta deliberado (mejora sancionada, patron DEC-009/DEC-022), no una regresion. Registrar como decision del ticket.

## Inventario clasificado (fuente de verdad — 182 items)

> Producido por S1 (subagente sonnet, 2026-07-21). `position` indica donde vive el string. Cada fila es una edicion. Los `${...}` son interpolaciones — corregir solo las palabras, no romper la interpolacion.

### guias (~45)

| file | line | current → proposed | position |
|------|------|--------------------|----------|
| app/pages/guias/[id]/editar.vue | 19 | Editar/Ver **Guia**→**Guía** | template |
| app/pages/guias/crear.vue | 14 | Crear **Guia**→**Guía** | title var |
| app/pages/guias/index.vue | 131 | Buscar **guia**→**guía**... | label= |
| app/pages/guias/index.vue | 342 | **Guias**→**Guías** | template |
| app/pages/guias/index.vue | 353 | Crear **Guia**→**Guía** | label= |
| app/pages/guias/index.vue | 367 | ...la **busqueda especifica**→**búsqueda específica**... | template |
| app/pages/guias/index.vue | 392 | Eliminar **Guia**→**Guía** | title= |
| app/pages/guias/index.vue | 393 | Esta **accion**→**acción** no se puede deshacer... | description= |
| app/pages/guias/index.vue | 401 | ...**Guia**→**Guía** (title interpolado) | title= |
| app/pages/guias/index.vue | 402 | ¿Deseas ${...} esta **guia**→**guía**? | description= |
| app/pages/guias/index.vue | 408 | Generar Reporte de **Guias**→**Guías** | title= |
| app/pages/guias/index.vue | 411 | La **generacion**→**generación**...**Estara**→**Estará**...**seccion**→**sección** | template |
| app/components/guides/GuideAjusteSection.vue | 59 | **Descripcion**→**Descripción** Zona | label= |
| app/components/guides/GuideAjusteSection.vue | 62 | **Descripcion**→**Descripción** de zona | placeholder= |
| app/components/guides/GuideAnexosSection.vue | 51 | **Ano Plantacion**→**Año Plantación** | label= |
| app/components/guides/GuideAnexosSection.vue | 57 | Fecha es anterior a 31 **dias**→**días** | template |
| app/components/guides/GuideAnexosSection.vue | 60 | **Intervencion**→**Intervención** | label= |
| app/components/guides/GuideAnexosSection.vue | 94 | **Guias**→**Guías** Anexas | label= |
| app/components/guides/GuideProveedorSection.vue | 44 | **Guia**→**Guía** Proveedor | label= |
| app/components/guides/GuideGeneralSection.vue | 159 | Fecha **Guia**→**Guía** | label= |
| app/components/guides/GuideGeneralSection.vue | 168 | **Guia**→**Guía** Arauco | label= |
| app/components/guides/GuideGeneralSection.vue | 171 | **Guia**→**Guía** Arauco | placeholder= |
| app/components/guides/GuideMedicionSection.vue | 37 | **Medicion**→**Medición** | template |
| app/components/guides/GuideMedicionSection.vue | 66 | Peso Bruto **Recepcion**→**Recepción** | label= |
| app/components/guides/GuideMedicionSection.vue | 75 | Peso Neto **Recepcion**→**Recepción** | label= |
| app/components/guides/GuideMedicionSection.vue | 84 | Volumen **Recepcion**→**Recepción** | label= |
| app/components/guides/GuideTransporteSection.vue | 52 | Patente **Camion**→**Camión** | label= |
| app/components/guides/GuideTransporteSection.vue | 58 | **Grua**→**Grúa** | label= |
| app/components/guides/GuideForm.vue | 184 | **Guia**→**Guía** creada correctamente | toast |
| app/components/guides/GuideForm.vue | 188 | **Guia**→**Guía** actualizada correctamente | toast |
| app/components/guides/GuideForm.vue | 225 | **Navegacion**→**Navegación** por teclado | template |
| app/components/guides/GuideForm.vue | 238 | Abrir selector / Confirmar **opcion**→**opción** | template |
| app/components/guides/GuideForm.vue | 313 | Crear **Guia**→**Guía** | label= |
| app/components/guides/GuideForm.vue | 321 | Se **perdera la informacion**→**perderá la información**... | description= |
| app/components/guides/GuideForm.vue | 332 | ¿**Esta**→**Está** seguro...limpiar todos los campos...? | description= |
| app/components/guides/GuideForm.vue | 342 | ¿**Esta**→**Está** seguro que desea salir? La **informacion...perdera**→**información...perderá**. | description= |
| app/components/guides/GuideForm.vue | 352 | ...¿**Esta**→**Está** seguro que desea salir? | description= |
| app/composables/useGuideList.ts | 119 | **Guia**→**Guía** eliminada correctamente | toast |
| app/composables/useGuideList.ts | 131 | **Guia**→**Guía** ${...} correctamente | toast |
| app/composables/useReportList.ts | 56 | Reporte de **guias**→**guías** generado... | toast |
| server/schemas/guia.schema.ts | 29 | **Guia**→**Guía** Arauco requerida | error |
| server/schemas/guia.schema.ts | 30 | Fecha de **guia**→**guía** requerida | error |
| server/schemas/guia.schema.ts | 49 | Patente **camion**→**camión** requerida | error |
| server/schemas/guia.schema.ts | 125 | **Guia**→**Guía** proveedor requerida para COMPRA | error |
| server/schemas/guia.schema.ts | 157 | Peso bruto **recepcion**→**recepción** requerido | error |
| server/schemas/guia.schema.ts | 163 | Peso neto **recepcion**→**recepción** requerido | error |
| server/schemas/guia.schema.ts | 169 | Volumen **recepcion**→**recepción** requerido | error |
| server/api/guias/customs.get.ts | 9 | Debe incluir **termino**→**término** a buscar | error |
| server/api/guias/customs.get.ts | 18 | **Parametros**→**Parámetros** no **validos**→**válidos** | error |
| server/api/guias/[id]/index.patch.ts | 11 | Id de **guia**→**guía** no **valido**→**válido** | error |
| server/api/guias/[id]/index.get.ts | 9 | Id de **guia**→**guía** no **valido**→**válido** | error |
| server/api/guias/[id]/index.delete.ts | 10 | Id de **guia**→**guía** no **valido**→**válido** | error |
| server/api/guias/[id]/status.patch.ts | 14 | Id de **guia**→**guía** no **valido**→**válido** | error |
| server/api/guias/index.post.ts | 25 | Esta **guia ya esta**→**guía ya está** asociada a este tipo de movimiento | error |
| server/api/guias/[id]/index.patch.ts | 37 | Esta **guia ya esta**→**guía ya está** asociada... | error |
| server/api/guias/[id]/status.patch.ts | 35 | Esta **guia ya esta**→**guía ya está** asociada... | error |

### rumas (~18)

| file | line | current → proposed | position |
|------|------|--------------------|----------|
| app/components/rumas/RumaForm.vue | 120 | **Numero**→**Número** Ruma | label= |
| app/components/rumas/RumaForm.vue | 124 | **Numero**→**Número** de ruma | placeholder= |
| app/components/rumas/RumaGuideDetails.vue | 200 | Cargando **guias**→**guías**... | template |
| app/components/rumas/RumaGuideDetails.vue | 205 | **Guias**→**Guías** ({{...}}) | template |
| app/components/rumas/RumaGuideDetails.vue | 208 | No hay **guias**→**guías** asociadas | template |
| app/components/rumas/RumaGuideDetails.vue | 220 | {{...}} **guias**→**guías** | template |
| app/components/rumas/RumaGuideDetails.vue | 305 | Total **Guias**→**Guías** MR: {{...}} | template |
| app/components/rumas/RumaMapFull.vue | 52 | No hay rumas con **ubicacion**→**ubicación** definida | template |
| app/pages/rumas/index.vue | 421 | Se **cambiara**→**cambiará** el estado de la ruma... | description= |
| app/pages/rumas/index.vue | 430 | La **generacion...Estara...seccion**→**generación...Estará...sección** | template |
| server/schemas/ruma.schema.ts | 10 | **Numero**→**Número** requerido | error |
| server/api/rumas/index.post.ts | 22 | Ya existe ruma activa con ese **numero**→**número** en esa cancha | error |
| server/api/rumas/[id]/index.patch.ts | 11 | Id de ruma no **valido**→**válido** | error |
| server/api/rumas/[id]/guias.get.ts | 11 | Id de ruma no **valido**→**válido** | error |
| server/api/rumas/[id]/guias-count.get.ts | 12 | Id de ruma no **valido**→**válido** | error |
| server/api/rumas/[id]/bulk-edit-guias.patch.ts | 14 | Id de ruma no **valido**→**válido** | error |
| server/api/rumas/[id]/index.get.ts | 9 | Id de ruma no **valido**→**válido** | error |
| server/api/rumas/[id]/status.patch.ts | 10 | Id de ruma no **valido**→**válido** | error |

### productos (~15)

| file | line | current → proposed | position |
|------|------|--------------------|----------|
| app/pages/productos/index.vue | 54 | Buscar por **codigo**→**código**... | label= |
| app/pages/productos/index.vue | 86 | **Codigo**→**Código** | header |
| app/pages/productos/index.vue | 198 | Esta **accion**→**acción** no se puede deshacer... | description= |
| app/components/products/ProductForm.vue | 143 | **Identificacion**→**Identificación** | template |
| app/components/products/ProductForm.vue | 146 | **Codigo**→**Código** | label= |
| app/components/products/ProductForm.vue | 150 | **Codigo**→**Código** producto | placeholder= |
| app/components/products/ProductForm.vue | 154 | **Codigo**→**Código** Adicional | label= |
| app/components/products/ProductForm.vue | 157 | **Codigo**→**Código** SAP | label= |
| app/components/products/ProductForm.vue | 160 | **Codigo**→**Código** SISCOP | label= |
| app/components/products/ProductForm.vue | 168 | **Clasificacion**→**Clasificación** | template |
| server/schemas/producto.schema.ts | 4 | **Codigo**→**Código** requerido | error |
| server/schemas/producto.schema.ts | 14 | **Codigo**→**Código** adicional requerido | error |
| server/schemas/producto.schema.ts | 15 | **Codigo**→**Código** SISCOP requerido | error |
| server/api/productos/index.post.ts | 19 | Ya existe un producto con ese **codigo**→**código** | error |
| server/api/productos/[id]/index.delete.ts | 18 | ...referenciado por ${...} **guia(s)**→**guía(s)** y ${...} ajuste(s) | error |

### canchas (~11)

| file | line | current → proposed | position |
|------|------|--------------------|----------|
| app/pages/canchas.vue | 28 | Buscar **codigo**→**código** o nombre... | label= |
| app/pages/canchas.vue | 57 | **Codigo**→**Código** | header |
| app/pages/canchas.vue | 58 | **Descripcion**→**Descripción** | header |
| app/pages/canchas.vue | 181 | Esta **accion**→**acción** no se puede deshacer... | description= |
| app/components/ui/CanchaForm.vue | 73 | **Descripcion**→**Descripción** | label= |
| app/components/ui/CanchaForm.vue | 77 | **Codigo**→**Código** | label= |
| app/components/ui/CanchaForm.vue | 80 | **Codigo**→**Código** SISCOP | label= |
| server/schemas/cancha.schema.ts | 8 | **Descripcion**→**Descripción** requerida | error |
| server/schemas/cancha.schema.ts | 9 | **Codigo**→**Código** requerido | error |
| server/api/canchas/index.post.ts | 12 | Ya existe una cancha con ese **codigo**→**código** | error |
| server/api/canchas/[id]/index.delete.ts | 22 | ...referenciada por ${...} ruma(s) y ${...} **guia(s)**→**guía(s)** | error |

### usuarios (~16)

| file | line | current → proposed | position |
|------|------|--------------------|----------|
| app/pages/usuarios.vue | 221 | Cambiar **Contrasena**→**Contraseña** | template |
| app/components/users/UserForm.vue | 125 | **Contrasena**→**Contraseña** | label= |
| app/components/users/UserPasswordForm.vue | 19 | La **contrasena**→**contraseña** debe tener al menos 8 caracteres | error |
| app/components/users/UserPasswordForm.vue | 20 | Confirmar **contrasena**→**contraseña** | error |
| app/components/users/UserPasswordForm.vue | 23 | Las **contrasenas**→**contraseñas** no coinciden | error |
| app/components/users/UserPasswordForm.vue | 43 | **Contrasena**→**Contraseña** actualizada correctamente | toast |
| app/components/users/UserPasswordForm.vue | 55 | Nueva **contrasena**→**contraseña** | label= |
| app/components/users/UserPasswordForm.vue | 58 | Confirmar **contrasena**→**contraseña** | label= |
| app/components/users/UserPasswordForm.vue | 70 | Cambiar **Contrasena**→**Contraseña** | label= |
| server/schemas/user.schema.ts | 9 | Email **invalido**→**inválido** | error |
| server/schemas/user.schema.ts | 10 | **Contrasena**→**Contraseña** debe tener al menos 8 caracteres | error |
| server/api/auth/users/index.post.ts | 20 | El email ya **esta**→**está** registrado | error |
| server/api/auth/users/index.post.ts | 25 | El RUT ya **esta**→**está** registrado | error |
| server/api/auth/users/[id]/index.patch.ts | 25 | El email ya **esta**→**está** registrado | error |
| server/api/auth/users/[id]/index.patch.ts | 35 | El RUT ya **esta**→**está** registrado | error |
| server/api/auth/users/[id]/password.patch.ts | 30 | **Contrasena**→**Contraseña** actual incorrecta | error |

### auth (~21)

| file | line | current → proposed | position |
|------|------|--------------------|----------|
| app/pages/password.vue | 22 | **Contrasena**→**Contraseña** actualizada correctamente | toast |
| app/pages/password.vue | 27 | Error al cambiar **contrasena**→**contraseña** | toast |
| app/pages/password.vue | 38 | Cambiar **Contrasena**→**Contraseña** | template |
| app/pages/password.vue | 42 | **Contrasena**→**Contraseña** actual | label= |
| app/pages/password.vue | 46 | Nueva **contrasena**→**contraseña** | label= |
| app/pages/password.vue | 50 | Confirmar nueva **contrasena**→**contraseña** | label= |
| app/pages/password.vue | 57 | Cambiar **Contrasena**→**Contraseña** | label= |
| app/components/auth/LoginForm.vue | 26 | Error al iniciar **sesion**→**sesión** | error |
| app/components/auth/LoginForm.vue | 39 | **Contrasena**→**Contraseña** | label= |
| app/components/ui/SessionExpiry.vue | 62 | **Sesion**→**Sesión** por expirar | title= |
| app/components/ui/SessionExpiry.vue | 65 | Tu **sesion**→**sesión** expira en | template |
| app/components/ui/SessionExpiry.vue | 74 | Cerrar **sesion**→**sesión** | label= |
| app/components/ui/SessionExpiry.vue | 79 | Renovar **sesion**→**sesión** | label= |
| server/schemas/user.schema.ts | 20 | **Contrasena**→**Contraseña** actual requerida | error |
| server/schemas/user.schema.ts | 21 | **Minimo**→**Mínimo** 8 caracteres | error |
| server/schemas/user.schema.ts | 26 | **Contrasena**→**Contraseña** requerida | error |
| server/api/auth/login.post.ts | 21 | Credenciales **invalidas**→**inválidas** | error |
| server/api/auth/refresh.post.ts | 14 | Refresh token **invalido**→**inválido** | error |
| server/api/auth/refresh.post.ts | 27 | **Sesion**→**Sesión** invalidada | error |
| server/middleware/auth.ts | 44 | Token **invalido**→**inválido** o expirado | error |
| server/middleware/auth.ts | 52 | **Sesion**→**Sesión** invalidada | error |

### ajustes (~15)

| file | line | current → proposed | position |
|------|------|--------------------|----------|
| app/pages/ajustes/index.vue | 115 | Fecha **Guia**→**Guía** | header |
| app/pages/ajustes/index.vue | 248 | Esta **accion**→**acción** no se puede deshacer... | description= |
| app/components/ajustes/BatchUpload.vue | 77 | Registros **validos**→**válidos** | template |
| app/components/ajustes/BatchUpload.vue | 81 | Registros **invalidos**→**inválidos** | template |
| server/services/ajuste.service.ts | 160 | TIPO **invalido**→**inválido** | error (TIPO=col CSV, intacto) |
| server/services/ajuste.service.ts | 173 | RUMA formato **invalido**→**inválido** | error (RUMA=col CSV, intacto) |
| server/services/ajuste.service.ts | 238 | FECHA_CORTA **invalida**→**inválida** | error |
| server/services/ajuste.service.ts | 240 | FECHA_GUIA **invalida**→**inválida** | error |
| server/services/ajuste.service.ts | 249 | VALOR_AJUSTE **invalido**→**inválido** | error |
| server/services/ajuste.service.ts | 250 | VALOR_AJUSTE_M3 **invalido**→**inválido** | error |
| server/services/ajuste.service.ts | 298 | Batch excede el **limite**→**límite** de ${...} filas... | error |
| server/api/ajustes/[id].delete.ts | 9 | Id de ajuste no **valido**→**válido** | error |
| server/api/ajustes/batch/[batch].delete.ts | 9 | Batch no **valido**→**válido** | error |
| server/api/ajustes/validate-batch.post.ts | 14 | Archivo **vacio**→**vacío** | error |
| server/api/ajustes/load.post.ts | 14 | Archivo **vacio**→**vacío** | error |

### stats (~13)

| file | line | current → proposed | position |
|------|------|--------------------|----------|
| app/pages/stats.vue | 21 | **Estadisticas**→**Estadísticas** | template |
| app/components/stats/Graph3.vue | 119 | 'Meses' : '**Dias**→**Días**' (chart title) | template |
| app/components/stats/Graph3.vue | 141 | **Dias**→**Días** | label= |
| server/api/stats/stock-proveedor.get.ts | 8 | **Parametro**→**Parámetro** cancha requerido | error |
| server/api/stats/stock-proveedor.get.ts | 11 | El **parametro**→**parámetro** cancha debe ser un id **valido**→**válido** | error |
| server/api/stats/stock-productos.get.ts | 8 | **Parametro**→**Parámetro** cancha requerido | error |
| server/api/stats/stock-productos.get.ts | 11 | El **parametro**→**parámetro**...id **valido**→**válido** | error |
| server/api/stats/volumen-especie.get.ts | 8 | **Parametro**→**Parámetro** cancha requerido | error |
| server/api/stats/volumen-especie.get.ts | 11 | El **parametro**→**parámetro**...id **valido**→**válido** | error |
| server/api/stats/stock-antiguedad.get.ts | 8 | **Parametro**→**Parámetro** cancha requerido | error |
| server/api/stats/stock-antiguedad.get.ts | 11 | El **parametro**→**parámetro**...id **valido**→**válido** | error |
| server/api/stats/compras-mensual.get.ts | 8 | **Parametro**→**Parámetro** date requerido (MM-YYYY) | error |
| server/api/stats/compras-mensual.get.ts | 11 | Formato de fecha **invalido**→**inválido**, usar MM-YYYY | error |

### mii/importer (~3)

| file | line | current → proposed | position |
|------|------|--------------------|----------|
| app/components/importer/MiiStatusPanel.vue | 93 | Vas a cargar los datos de este periodo a las **guias**→**guías** respectivas | template |
| app/components/importer/MiiStatusPanel.vue | 98 | Ya existen datos...a las **guias, con esta accion sobre-escribiras**→**guías, con esta acción sobrescribirás** los datos previos | template |
| server/api/guias/extra-data.post.ts | 9 | Formato **invalido**→**inválido**. Usar MM-YYYY | error |

### layout/nav (~5)

| file | line | current → proposed | position |
|------|------|--------------------|----------|
| app/components/ui/AppSidebar.vue | 65 | **Estadisticas**→**Estadísticas** | label= |
| app/components/ui/AppSidebar.vue | 75 | Crear **Guia**→**Guía** | label= |
| app/components/ui/AppSidebar.vue | 84 | **Guias**→**Guías** | label= |
| app/components/ui/AppSidebar.vue | 125 | Mi **Contrasena**→**Contraseña** | label= |
| app/components/ui/AppSidebar.vue | 263 | Cerrar **sesion**→**sesión** | label= |

### otros / transversales (~9)

| file | line | current → proposed | position |
|------|------|--------------------|----------|
| app/components/ui/FileUpload.vue | 12 | Arrastra un archivo **aqui**→**aquí**... | label= (default) |
| app/components/ui/FileUpload.vue | 38 | El archivo excede el **limite**→**límite** de ${...} MB | error (emit; sin consumer hoy) |
| server/utils/storage/validation.ts | 37 | Dominio de storage **invalido**→**inválido**: ${...} | error |
| server/utils/storage/validation.ts | 44 | Archivo excede el **tamano maximo**→**tamaño máximo** de ${...} MB | error |
| server/utils/storage/validation.ts | 62 | **Extension**→**Extensión** no permitida: ${...}... | error |
| server/api/storage/[...path].get.ts | 15 | Path **invalido**→**inválido** | error |
| server/api/storage/[...path].get.ts | 20 | Dominio de storage **invalido**→**inválido** | error |
| server/utils/validation.ts | 12 | Datos **invalidos**→**inválidos** | error |
| server/utils/validation.ts | 28 | **Parametros invalidos**→**Parámetros inválidos** | error |

### Ambiguo (1 — revisar)

- `server/api/productos/[id]/index.delete.ts:34` — respuesta `{ message: 'Producto eliminado' }`. No requiere tilde; incluir solo si un consumidor lo muestra literal (hoy `useProductList.ts` usa su propio toast). **Veredicto propuesto: no tocar.**

## Tasks / Plan de sessions (DET-20)

> Un commit por modulo (`{ticket} [pehuen-nuxt] fix(ui-copy): ...`). Tests en lockstep: por cada string corregido, `grep` en `tests/` (e2e + unit) el texto viejo y actualizar el assert en el mismo commit. Gate e2e desktop una vez por session (no por lote — correrlo 11 veces seria prohibitivo; el riesgo de assert roto se cubre con el grep + un e2e final por session).

- **S1 — Inventario clasificado** · T1 · ⚑ fuerte (gate revision dev). **[done]** — este spec.
- **S2 — guias + mii/importer** · T3. Tasks: S2.T1 guias, S2.T2 mii/importer, S2.GATE (unit afectados + e2e desktop).
- **S3 — rumas + productos + canchas** · T3. S3.T1 rumas, S3.T2 productos, S3.T3 canchas, S3.GATE.
- **S4 — auth + usuarios** · T3 (comparten strings de contraseña/sesión). S4.T1 auth, S4.T2 usuarios, S4.GATE.
- **S5 — ajustes + stats + layout/nav + otros** · T3. S5.T1 ajustes, S5.T2 stats, S5.T3 layout/nav, S5.T4 otros/transversales, S5.GATE.
- **S6 — Cierre** · T3. Verificacion runtime de muestra por pagina (screenshot/DOM), decision de delta vs legacy sancionado (RULE-MIGRATION-004), gate e2e desktop final completo, revertir el assert `guia-crear.spec.ts:79` a "Año Plantación" (cierra B7 de PEH-011).

## Risks

- **Assert de test rompe (alto):** varios e2e (auth/products/guias) y unit (Zod schemas) asertan el texto sin tilde. Mitigacion: grep obligatorio por string en cada lote + gate e2e por session.
- **Confundir copy con identificador (alto→mitigado):** el inventario ya clasifico; ante duda en ejecucion, NO tocar y marcar.
- **Zod message asertado en unit:** los `message` de `server/schemas/*.schema.ts` pueden estar en unit tests de validacion. Verificar por schema antes de commitear.
- **Interpolaciones `${...}`:** corregir solo palabras, no romper la interpolacion ni el template literal.

## Acceptance

- [ ] Los 182 items corregidos (o marcados como no-aplica con razon).
- [ ] `Año Plantación` verificado en runtime (no solo fuente).
- [ ] 0 identificadores/keys/enums/accessorKey/columnas CSV modificados.
- [ ] Unit + gate e2e desktop verdes tras cada session.
- [ ] `guia-crear.spec.ts:79` revertido a "Año Plantación".
- [ ] Delta vs legacy registrado como mejora sancionada (decision del ticket).
