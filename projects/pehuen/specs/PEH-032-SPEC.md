---
id: PEH-032-SPEC
project: pehuen
ticket: PEH-032
status: approved
---

# Ajuste MR correcto y gráficos de stats por m3sec (legacy + nuxt) + fixes de stats legacy

## Resumen ejecutivo

Corrige tres puntos acotados: (1) el volMR de la ruma se ajusta con valorAjusteMR (hoy usa valorAjuste) en el método vivo fillRumaDataMap de legacy y nuxt; (2) los gráficos de stats pasan a graficar el m3sec (volumenMSSC = MII VOLUMEN_M3_RECEPCION) en vez del volumen crudo, con ajustes mapeados por valorAjusteM3, en legacy y nuxt; (3) se portan al legacy los dos fixes de stats ya resueltos en nuxt (signo del bucket de antigüedad y validación de origen en volumen-por-especie). NO se toca nada del registro SALIDA / despacho / materialización MII, ni backfills, recálculos o métricas de performance: los volúmenes se calculan al vuelo (RULE-RUMA-005), así que el fix de código alcanza. Verificación: asserts numéricos puntuales (volMR con valorAjusteMR distinto de valorAjuste, gráfico cuadrando con el total m3sec de la vista de rumas para una misma cancha, despacho de 150 días restando) más smoke de que los endpoints de stats responden y su contrato queda intacto. ADVERTENCIA (no es REQ): el m3sec solo existe para el 22.1% de las guías de rumas activas por el hueco de MII 2025, así que los gráficos quedarán consistentes con la vista de rumas pero heredan ese hueco; el join con MII usa $unwind sobre mii.data y puede pesar en los endpoints de stats sobre rumas activas.

## Requirements

#### REQ-01 `confirmed`
> Fuente: pehuen-server/src/services/ruma.service.ts:176,184 (espejos 422/430, 650/662); pehuen-nuxt/server/services/ruma.service.ts:247,251 (espejos 451/455)
> Necesidad: build
Al calcular la ruma, el volMR se ajusta con valorAjusteMR (ADD suma, REDUCE resta) en vez de valorAjuste, tanto en legacy como en nuxt, sin alterar el cálculo del volM3 (que sigue usando valorAjusteM3) ni el de volCalculado. El cálculo permanece al vuelo, sin persistencia.

#### REQ-02 `confirmed`
> Fuente: pehuen-server/src/helpers/stats.helper.ts (reducers) + stats.controller.ts (5 endpoints) + mapAjustesToGuiasLike; pehuen-nuxt/server/helpers/stats.ts + server/api/stats
> Necesidad: build
Los endpoints/gráficos de stats grafican el m3sec (volumenMSSC = MII VOLUMEN_M3_RECEPCION, sumado por movimiento) en vez del volumen crudo de la guía (volumenRecepcion/volumenDespacho), uniendo cada guía con MII vía el fillGuiaDataWithMii existente y mapeando los ajustes con valorAjusteM3, en legacy y nuxt.

#### REQ-03 `confirmed`
> Fuente: pehuen-server/src/helpers/stats.helper.ts:172-180 (bucket antigüedad) y ~292-296 (calcularVolumenEnCanchaPorEspecie); referencia nuxt: applyDayBucket con valor firmado en pehuen-nuxt/server/helpers/stats.ts
> Necesidad: build
El legacy incorpora los dos fixes de stats ya resueltos en nuxt: el bucket de stock por antigüedad resta (no suma) el volumen de los despachos de madera con más de ~120 días y elimina la condición duplicada inalcanzable; y calcularVolumenEnCanchaPorEspecie valida que el origen sea la cancha antes de restar el despacho también en la rama de item nuevo.

## Tasks

#### S1.T1 — Fijar el baseline con tests de regresión ANTES de tocar código: unit de fillRumaDataMap (legacy y nuxt) capturando volMR/volM3/volCalculado y el contrato de respuesta actual para rumas con y sin ajuste divergente; unit de los reducers de stats legacy (buckets de antigüedad y calcularVolumenEnCanchaPorEspecie) fijando el comportamiento vigente; snapshot de la forma del payload de los 5 endpoints de stats legacy y sus equivalentes nuxt. Estos tests documentan el estado previo y deben seguir pasando salvo los asserts explícitamente marcados como 'bug actual'.
Contrato: rollback: Eliminar los archivos de test añadidos; no toca código de producción. Status: pending

#### S1.T2 — Corregir el ajuste del volMR en el método vivo fillRumaDataMap para que consuma valorAjusteMR (ADD suma / REDUCE resta) en legacy (pehuen-server/src/services/ruma.service.ts:176,184 y espejos 422/430, 650/662) y en nuxt (pehuen-nuxt/server/services/ruma.service.ts:247,251 y espejos 451/455), dejando intactos volM3 (valorAjusteM3) y volCalculado, sin persistir volúmenes (RULE-RUMA-005) y sin reintroducir la divergencia de producto/productQty del bug conocido de nuxt.
Contrato: rollback: git revert del commit; los volúmenes se calculan al vuelo, así que revertir el código restaura el comportamiento previo sin tocar datos. Status: pending

#### S1.T3 — Portar al legacy los dos fixes de stats ya resueltos en nuxt: signo del bucket de antigüedad (usar el valor firmado como en applyDayBucket, quitando la condición duplicada inalcanzable) en pehuen-server/src/helpers/stats.helper.ts:172-180 y su espejo en la rama de item nuevo; y la validación de origen antes de restar el despacho en calcularVolumenEnCanchaPorEspecie (~292-296), alineando la parentización con la rama 'encontrado'.
Contrato: rollback: git revert del commit; cambio local a stats.helper.ts sin efectos persistidos. Status: pending

#### S1.T4 — Cambiar el eje de los gráficos de stats a m3sec (volumenMSSC) en legacy y nuxt, reutilizando fillGuiaDataWithMii para unir guía con MII y mapeando los ajustes por valorAjusteM3, sin alterar el contrato de los endpoints.
Contrato: rollback: git revert del commit padre completo; sin migraciones ni datos escritos. Status: pending
Subtasks: 4 (ejecutar hojas; el padre espera a todas)

#### S1.T4.1 — Legacy: adaptar los reducers de pehuen-server/src/helpers/stats.helper.ts para consumir volumenMSSC en vez de volumenRecepcion/volumenDespacho, y mapAjustesToGuiasLike para usar valorAjusteM3.
Contrato: rollback: git revert del cambio en stats.helper.ts. Status: pending

#### S1.T4.2 — Legacy: enganchar el join con MII vía fillGuiaDataWithMii en los 5 endpoints de pehuen-server/src/services/stats.controller.ts, manteniendo la forma del payload de respuesta sin cambios.
Contrato: rollback: git revert del cambio en stats.controller.ts. Status: pending

#### S1.T4.3 — Nuxt: aplicar el mismo cambio de eje en pehuen-nuxt/server/helpers/stats.ts y los handlers de pehuen-nuxt/server/api/stats, reutilizando el fillGuiaDataWithMii de nuxt y valorAjusteM3.
Contrato: rollback: git revert de los cambios en server/helpers/stats.ts y server/api/stats. Status: pending

#### S1.T4.4 — Verificar el cuadre: para una misma cancha, comparar el total graficado contra el total m3sec de la vista de rumas y contra el otro stack (paridad legacy↔nuxt), documentando el resultado.
Contrato: rollback: No aplica (verificación, no modifica código). Status: pending

#### S1.T5 — Tests y regresión finales de los tres puntos: unit del volMR con valorAjusteMR (ADD/REDUCE/ausente/igual a valorAjuste) y regresión de volM3/volCalculado/contrato/no-persistencia; tests de stats con m3sec (cuadre con la vista de rumas, guía sin MII aporta 0, ajuste por valorAjusteM3, contrato intacto); tests de los reducers legacy (despacho de 150 días resta, origen respetado en volumen-por-especie); paridad legacy↔nuxt extendiendo pehuen-nuxt/tests/e2e/migration-paridad/api-rumas/rumas-volume-parity.spec.ts; smoke de que los endpoints de stats responden 200.
Contrato: rollback: Eliminar/revertir los archivos de test añadidos o modificados. Status: pending

## Verificacion runtime

1. **Qué:** Smoke de la vista afectada por Ajuste MR correcto y gráficos de stats por m3sec (legacy + nuxt) + fixes de stats legacy
   - **Se debe ver:** La vista carga y responde sin errores.
   - **Dónde:** vista afectada por el ticket
