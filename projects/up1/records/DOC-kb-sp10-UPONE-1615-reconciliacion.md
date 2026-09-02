---
id: DOC-kb-sp10-UPONE-1615-reconciliacion
project: up1
type: doc
module: curriculum-design
tags:
  - sp10
  - curriculum-design
  - curriculum-mapping
  - reconciliacion
  - UPONE-1615
  - rbac
  - roles-perfiles
  - nuevo-intake
  - visibilidad-apps
---

# UPONE-1615 Reconciliacion (sp9 a sp10)

> Reconciliacion del ticket UPONE-1615 al pasar de sp9 a sp10. Es el archivo **aparte del analisis inicial** (el detalle/pre-intake de sp9 viven en `sp9/UPONE-1615-*`): aqui se concentra **todo el contexto de lo que cambio** en el tema de roles, **que hay que considerar antes de ejecutar**, y por que esto obliga a **un nuevo intake y a re-validar el spec**. Verificado contra el working copy: `curriculum-design@8a151e7`, `curriculum-mapping@584499e`, `object-manager@7662190`, `suite@5c4711b`.

## 1. Delta de reconciliacion (estado del dato)

| Punto | Origen (sp9) decia | Estado hoy | Veredicto | Evidencia |
|---|---|---|---|---|
| `cd/_data-rbac.js`: 4 roles + mapa directo | Permisos colgados directo del rol; nada de sets | Igual en el mecanismo (directo al rol), pero **UPONE-1619 agrego `instructionalcomponenttype:*` directo a los 4 roles** | corregido | `mods/curriculum-design/seed/_data-rbac.js:82,93-119,139-171` |
| `cm/_data-rbac.js`: copia literal + test de paridad | Copia literal, test de paridad activo | Igual, pero **UPONE-1633 agrego `competencynode:adopt`/`exempt`**; el test de paridad solo compara `ROLE_DEFINITIONS`, no el mapa de caps | confirmado / corregido | `mods/curriculum-mapping/seed/_data-rbac.js:188,220-221`; `tests/unit/rbacRoles.test.js:139-149` |
| Fixtures + rol huerfano | 2 fixtures en `roles/` a retirar; rol huerfano a retirar | Carpeta hoy es `profiles/` (no `roles/`); los 2 fixtures siguen; el rol huerfano en el tenant es dato de runtime, no verificado | falta-precisar | `mods/curriculum-design/profiles/{GestorCurricular,LectorCurricular}.json` |
| Mecanismo de sets en core, "sin adoptar" | `core_ModRole`/`modRoleCapabilities.js` intactos; vinculo por UI admin; punto ciego de nombres | **Renombrado a "application profile", vinculo declarativo, gate de exclusividad, `validateModRoleNameCollisions` eliminado** (ver seccion 2). `modRoleCapabilities.js` intacto | corregido | ver seccion 2 |
| **Visibilidad de apps** | "app sin roles = publica; crear el primer vinculo privatiza" (H9) | **Superada:** una app profile-gated (`navByRole`) es visible solo a quien tiene su perfil, **nunca es publica**, y **borrar los mappings la oculta, no la abre** | corregido | `suite/logic/app.resolver.js:132-141` |
| Gap de institucion | 4 roles sin capability de institucion | Sigue sin resolver | confirmado | grep vacio en `_data-rbac.js` de ambos mods |

## 2. Cambios de RBAC de las ultimas 2 semanas (desde 2026-08-17)

Barrido de git sobre los archivos de roles/RBAC en `curriculum-design`, `curriculum-mapping`, `object-manager` y `suite`.

**UPONE-1699 (2026-08-24/25, object-manager):**
- `6b40cca7` "fin del auto-create de roles institucionales + fail-closed": la plataforma **ya no auto-crea roles institucionales desde el layout**. Es la causa raiz del rol huerfano `GestorCurricular`, ahora cerrada.
- `3af269d7` / `b1cd98ef` "reporte de convencion de naming en el sync (fail-closed, nombra el archivo)": el sync ahora **reporta** la convencion de nombres.

**UPONE-1700 (2026-08-26/27, object-manager + curriculum-design + suite):**
- `ec6e5be4` "rename mod-role concept to application profile": "rol interno / set" pasa a **"application profile"**.
- `e9f4a7c` (cd) "rename roles/ folder to profiles/": la carpeta del mod es `profiles/`.
- `fa0352c4` "declarative profile->role mapping in sync": el vinculo rol-perfil es **declarativo** en `app.json` (`profileRoleMapping`, `syncAppProfileMapping`), no por UI admin.
- `08708c1a` "exclusivity gate: roles XOR profiles in sync validation": un mod declara por roles **o** por perfiles, no ambos.
- `94082b40` "run-once gate for profile mapping materialization": la materializacion del mapeo corre una vez.
- `906c64cf` "remove dead RBAC code + document capability model": se **elimino `validateModRoleNameCollisions`**.
- `13ad970` (suite) "getAppsFiltered: profile-gated apps never fall open": **nuevo modelo de visibilidad** (ver seccion 3).

**UPONE-1619 (2026-08-19, cd) y UPONE-1633 (2026-08-19, cm):** `8b0ce0a` "capabilities del catalogo + cableado RBAC a 4 roles" y `7071a40`: agregaron capabilities **directo a los 4 roles** en el mismo `_data-rbac.js` que 1615 reestructura.

**UPONE-1616 (2026-08-24, cd):** `a00bede`/`039ab6f` reordeno y nombro las 5 vistas del menu por app. Cerrado; se relaciona con la visibilidad (seccion 3).

**Lo que NO cambio:** `modRoleCapabilities.js` (herencia, dedupe, precedencia "rol gana") intacto desde julio; el gap de institucion (criterio 2 del PO) sin resolver.

## 3. El modelo de visibilidad de apps (detalle, porque supersede H9)

`suite/logic/app.resolver.js:126-153` hoy ramifica por si la app es **profile-gated** (tiene `navByRole` no vacio):

- **App profile-gated:** visible **solo** a quien tiene uno de sus application profiles. **Nunca es publica**; borrar los mappings la **oculta**, no la abre. Las cuentas de servicio ven todo.
- **App legacy institucional (sin `navByRole`):** conserva el comportamiento viejo (sin roles asignados -> publica; con roles -> match).

Consecuencia para 1615: la privatizacion la produce **declarar `navByRole`/perfiles**, no "crear la primera fila de vinculo". Y el riesgo de la leccion L2 del intake (perder una fila stale por el sync -> la app se re-abre) **se invierte**: borrar mappings ahora oculta, no abre.

## 4. Impacto en el intake de sp9 (que hay que reconsiderar)

| Punto del intake (sp9) | Estado con la data nueva |
|---|---|
| Paso 7: crear vinculos por **consola admin** | **Invalido.** Hoy es declarativo (`app.json` `profileRoleMapping`). |
| H8: la UI admin alcanza sin desarrollo | **Invalida.** El vinculo es config declarativa. |
| H9: "app sin roles = publica; crear vinculo privatiza" | **Superada** por el modelo de visibilidad de la seccion 3. |
| Retirar el rol huerfano `GestorCurricular` | Sigue, pero **su causa esta cerrada** (fin del auto-create). |
| Aviso a core por el punto ciego de nombres | **Obsoleto** (detector removido + reporte nuevo del sync). |
| Rutas `roles/*.json` | Hoy `profiles/*.json`. |
| Absorber caps de 1619/1633 | **Trabajo nuevo** no dimensionado en sp9. |
| Objetivo de fondo (directo-al-rol -> perfiles por modulo) | **Sigue valido**; cambia el "como", no el "que". |

## 5. Antes de ejecutar: hacia un nuevo intake y una nueva validacion del spec

El mecanismo que 1615 adopta **cambio de nombre, de forma de uso y de modelo de visibilidad** entre sp9 y hoy, y la superficie a migrar **crecio** (caps de 1619/1633). Eso invalida partes concretas del plan de sp9 (paso 7, H8, H9, rutas, aviso a core) sin invalidar el objetivo. **Recomendacion: re-correr el intake/design del ticket y re-validar el spec** antes de ejecutar, cubriendo:

1. **Reexpresar el cableado como declarativo** (`app.json` `profileRoleMapping` con perfiles), no por consola; y respetar el gate de exclusividad roles-XOR-profiles.
2. **Reencuadrar la privatizacion** al nuevo modelo (`navByRole` hace la app privada; nunca publica; borrar mappings oculta). Re-evaluar la coordinacion con UPONE-1616 bajo este modelo.
3. **Absorber las capabilities nuevas** que 1619 (cd) y 1633 (cm) dejaron directo al rol: decidir cuales entran a los perfiles y cuales quedan fuera con justificacion.
4. **Actualizar rutas** a `profiles/` y **retirar del plan el aviso a core** (obsoleto), dejando solo el retiro del huerfano (con su causa ya cerrada).
5. **Re-dimensionar** el ticket con la superficie nueva y el cableado declarativo (mas barato que la consola, pero mas superficie de caps): confirmar si sigue en 8 SP.
6. **Mantener** lo que no cambio: la herencia/dedupe de `modRoleCapabilities.js`, y el gap de institucion (criterio 2 del PO) como el caso a cerrar end-to-end.

Con estos seis puntos resueltos, el spec queda re-validado sobre el mecanismo vigente (perfiles de aplicacion) y listo para ejecutar.
