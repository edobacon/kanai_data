---
id: DOC-kb-EP-01-Correcciones-del-review-de-PR-kn-dredd-sobre-EP-01-S1-y-S2
project: taomangalam
type: doc
module: EP-01
tags:
  - review
  - dredd
  - goldens
  - contraste-aumentado
  - epica
  - tao-181
  - tao-182
---

# Correcciones del review de PR (kn-dredd) sobre EP-01: S1 y S2

## Contexto

El review `kn-dredd` del PR #127 (rama acumuladora `epic/EP-01` → `main`) devolvió veredicto **`iterar`** con **1 S1 y 7 S2**. Todos se corrigieron sobre la rama de la épica con el CI local como verificación. Este documento deja la traza hallazgo → corrección → commit, para que los arreglos no queden como cambios huérfanos de la rama.

## S1 (bloqueaba el CI)

**Los goldens nuevos corrían en Linux contra baselines generadas en macOS.** Las suites de `app/test/golden/**` no tenían el guard de plataforma que sí tienen sus 11 hermanas de `app/test/goldens/**` (`_skipGoldenOutsideMacOs = !Platform.isMacOS`), así que en el runner Linux cada caso de píxel fallaba: medido en el log del run, **62 pasan / 2198 fallan** (diffs de 0,01–12 %, sin `GoldenFontsException` → era plataforma, no regresión). Con eso caían `flutter-test`, `flutter-goldens` y el check obligatorio `quality-gate`.

- El guard se agregó a los **20 registros** que producían esos fallos (mapeados 1:1 desde el log; la suma cuadra con los 2198).
- Verificación: emulando Linux (guard forzado a `true`) la suite pasa con **42 pasan / 2218 omitidos**; en macOS los 2260 casos siguen corriendo.
- Se corrigieron las afirmaciones que el hallazgo desmentía: el job `flutter-goldens` y `docs/development/visual-review.md` ahora dicen que las referencias se generan **y se comparan en macOS**, y que un job de Linux no protege los píxeles.
- Commit `11a54b6`.

## S2 corregidos

| Hallazgo | Causa real | Corrección |
|---|---|---|
| **APP-LIB-01** | El arte de fondo usaba la constante del tema claro (0.18) y `appOpacityDataOf` no tenía **ningún consumidor** | La opacidad sale del contrato del tema; con contraste aumentado vale 0 y el arte se oculta |
| **APP-LIB-02** | Deshabilitado (0.38) y velo (0.65) hardcodeados en botón, tarjeta, chip y overlay | Los cuatro leen el contrato del tema; el objetivo del velo se pasa al controlador y se refresca si el tema cambia con el overlay abierto |
| **TEXT-FIELD-DISABLED** | `border`, `enabledBorder` y `disabledBorder` con el mismo `borderSide` y `style` que ignoraba `enabled` | El campo deshabilitado usa trazo tenue (`divider`) y texto atenuado |
| **APP-LIB-06** | El `Opacity(0.18)` envolvía todo el `TaoResolvedImage`, así que la superficie de respaldo del `errorBuilder` heredaba el 18 % | La opacidad viaja al arte por el `frameBuilder` del `Image`, que no se aplica al camino de error: el respaldo queda opaco |
| **VALE-NO-BLOQUEA** | El `continue-on-error` del paso de Vale era siempre verdadero (el workflow solo corre en PRs a `main`) | Ahora depende del límite real de la API (`changed_files > 300`): bloquea en un PR normal y es best-effort solo en el gigante |
| **UI-TEXT-HARDCODEADO** | 'Continuar', 'Retirar ' y 'Abrir' como literales (el lint solo mira argumentos, no valores por defecto) | Claves `taoStepFormNext` (ya existía), `taoFilterChipRemove` y `taoNavigationRowOpen` |
| **SLEEP-FIJO-200MS** | `Future.delayed(200 ms)` para esperar la resolución del respaldo | Espera acotada al cache de imágenes, con tope y fallo explícito |
| **GOLDENS-SIN-ASERCIÓN-DIFERENCIAL** | La matriz solo verificaba unicidad de nombre; las escenas de átomos forzaban el estado sin preparar la interacción, así que los 5 estados `pressed` del botón salían idénticos al `default` | Las escenas de átomos preparan el puntero real (como ya hacían las moléculas) y la matriz **exige** que cada estado declarado difiera de su base en los 20 casos, con excepciones explícitas y auto-verificadas |

Commits `0bc2933` (los siete S2 de producto y tests) y `8ae4229` (el puntero real, la aserción diferencial y la higiene de artefactos).

## Consecuencias que conviene tener presentes

1. **Los widgets que ahora leen el tema y la i18n exigen ese cableado en el árbol**: se actualizaron los hosts de 9 archivos de prueba (tema con el contrato de opacidades y delegado de traducciones).
2. **Se regeneraron 152 baselines** en el commit de producto (92 del corpus nuevo + 60 del heredado): 72 de plantillas por el respaldo opaco (diffs del 87-98 %, que es el bug), el campo deshabilitado y los estados presionados. En el commit del guard se regeneraron 100 más (los `pressed` del botón).
3. **Las imágenes de diferencias de `failures/` dejan de versionarse** (556 archivos, 21 MB) y quedan ignoradas: son salida de diagnóstico de la corrida.
4. **Queda una deuda de accesibilidad registrada, no oculta**: el chip presionado del catálogo solo expresa la presión con la escala del movimiento y el AC fuerza movimiento reducido, así que su captura coincide con la del seleccionado. Distinguirlo exige una señal que no dependa del movimiento (borde, superficie o patrón), como ya hace la tarjeta: es una decisión de Diseño. La aserción diferencial lo tiene como excepción explícita y **exige quitarla si se corrige**.
5. **El CI de GitHub está apagado** (minutos de Actions agotados, se renuevan el 01/11/2026), así que la verificación es **local**: `pnpm run check` y `pnpm run test` en verde (3211 pruebas de Flutter, 235 del servidor contra PostgreSQL, 379 transversales, 173 de los comandos raíz).
6. **Trazabilidad**: TAO-182 (cerrado) recibió la **enmienda post-cierre** con estos arreglos. TAO-181 está `in_progress`: un cambio antes del cierre va como adenda al pedido, y como estos arreglos **restauran lo que sus REQ ya pedían** (no cambian el alcance), se deja la traza acá y los commits quedan como evidencia de su cierre.
