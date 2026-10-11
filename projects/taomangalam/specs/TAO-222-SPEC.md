---
id: TAO-222-SPEC
project: taomangalam
ticket: TAO-222
status: approved
---

# TAO-222 · Términos de uso v1 en español: texto completo, resumen para V-51, copias empaquetadas con hash coincidente y registro de aprobaciones

## Resumen ejecutivo

Se redacta el texto de los términos de uso v1 en docs/legal/ con apartados para cada tema de la cobertura mínima (DEC-212, 208/225, 213, 020/056, 216, 054/128/224, 086, 094), versión, fecha de vigencia y hash, más un resumen breve para V-51. El texto se copia a app/assets/legal/terminos-v1.0.md y a server/legal/ para que el chequeo de hash que ya corre en CI (ci-pr.yml:100-117) dé verde, y se agrega a docs/legal/ el registro de aprobación legal y de aceptación de Producto. NO se toca: el código de empaquetado y registro (HU-03a-10), la presentación de V-51 (HU-01-13), la política de privacidad (HU-03a-15), las declaraciones de tienda (HU-17-10) ni las traducciones. Criterios observables: cada tema tiene su apartado (QA-03a-14-03), el hash de docs/legal coincide con el de la app y con el del servidor en las suites de CI, cambiar una palabra hace fallar el chequeo de hash (QA-03a-14-02), el texto no tiene guion largo ni voseo, y los registros de aprobación quedan con fecha, versión y observaciones. Tamaño: 2 sesiones (3 puntos). ADVERTENCIA: la aprobación legal, la aceptación de Producto y la identidad legal del titular dependen de pendientes externos; mientras no se resuelvan, el texto queda marcado como provisional con marcadores sin datos reales y M1a no cierra. ADVERTENCIA: verificar el hash contra documento_legal de staging requiere que el pipeline de HU-03a-10 haya registrado la versión; si no lo hizo, ese criterio queda pendiente fuera de esta historia.
Datos a confirmar antes de ejecutar: (1) el nombre exacto del archivo fuente en docs/legal/ (se supone docs/legal/terminos-v1.0.md, ver docs/legal/README.md) y el de la copia en server/legal/; (2) si app/assets/legal/terminos-v1.0.md ya tiene un hash 1.0 registrado en documento_legal de staging o aceptado por usuarios: si es así, el texto nuevo debe salir como versión 1.1 (cambia versionTerminosEmpaquetada y rutaTerminos en textos_legales_empaquetados.dart:13 y :36) en lugar de reemplazar 1.0; (3) el formato de los metadatos (frontmatter de terminos-v1.0.md:2-9) y el algoritmo de hash que usa el chequeo (sha256 vía package:crypto en textos_legales_empaquetados.dart:3) y si el hash se calcula con o sin el frontmatter; (4) el comando exacto del chequeo de hash en las suites de la app y del servidor (nombre del test); (5) la fecha de vigencia que fija Producto; (6) la razón social, domicilio y jurisdicción del titular, y quién es la asesoría legal designada.

## Requirements

### REQ-01 `confirmed`
> Fuente: Request: Alcance/Incluye y Adenda 1 (decisiones 1 y 2)

Existe el texto completo de los términos de uso en español, en Markdown en docs/legal/terminos-v1.0.md (reemplaza el contenido de la 1.0 actual, que es un fixture técnico sin aprobación jurídica; no se crea versión 1.1), con número de versión, hash y fecha de vigencia (vigente_desde). La fecha NO se inventa: el encabezado lleva un marcador provisional explícito (por ejemplo VIGENTE_DESDE: PROVISIONAL) hasta que Producto y la asesoría legal la fijen, y el hash se recalcula en el momento de fijarla. El texto tiene un apartado con título propio para cada tema de la cobertura mínima: cuenta de dispositivo y cuenta completa y qué habilita cada una (DEC-212); aceptación versionada y reaceptación que detiene el servicio (DEC-208, DEC-225); códigos de producto de un solo uso validados en línea (DEC-213); limitación y suspensión administrativa (DEC-020, DEC-056); soporte solo con cuenta completa (DEC-216); cierre de sesión, borrado de datos y eliminación de cuenta (DEC-054, DEC-128, DEC-224); versión mínima y actualizaciones (DEC-086); contenido del método entregado con la app (DEC-094). Ningún apartado contradice la DEC citada.

### REQ-02 `confirmed`
> Fuente: Request: Alcance/Incluye (resumen breve para V-51)

El resumen breve de los términos para la tarjeta de V-51 en smartphone es una sección con título propio dentro del mismo archivo docs/legal/terminos-v1.0.md (no un archivo aparte). Por estar dentro del archivo, entra en el hash y viaja en las copias app/assets/legal/terminos-v1.0.md y server/legal/terminos-v1.0.md. Es coherente con el texto completo y no agrega obligaciones que este no contenga. La lectura en teléfono con escala de texto 200 % y en tablet en horizontal, sin cortes, es revisión humana de QA-03a-14-01 fuera del gate automático.

### REQ-03 `confirmed`
> Fuente: Pedido de cambio, punto 4; Adenda 1 decisión (1)

La redacción del texto y del resumen en terminos-v1.0.md está en español neutro, trata de tú, no usa guion largo (U+2014), usa títulos Markdown jerárquicos para lector de pantalla y no incluye datos personales ni correos reales; lo que depende de pendientes externos (identidad legal del titular) va con marcadores explícitos de provisional. ADVERTENCIA para el ejecutor: no se puede verificar desde el spec si app/lib/features/legal/data/textos_legales_empaquetados.dart, scripts/ci/ep01-legal-provider.mjs o legal:registrar (pnpm -C server run legal:registrar) (server/scripts/registrar-version-legal.ts) fallan con vigente_desde provisional, ni si el hash autorreferente funciona. La tarea de lectura S1.T1.3 lo confirma leyendo el código y, si falla, lo reporta al dev antes de continuar.

### REQ-04 `confirmed`
> Fuente: Request: Criterios de aceptación (hash) y QA-03a-14-02

El hash del texto final coincide entre las tres copias: fuente docs/legal/terminos-v1.0.md, copia de la app app/assets/legal/terminos-v1.0.md y copia del servidor server/legal/terminos-v1.0.md, y la copia al servidor se hace junto con la de la app en el mismo commit que la redacción. El algoritmo de hash y si incluye o no el frontmatter se toman del código existente (app/lib/features/legal/data/textos_legales_empaquetados.dart y app/test/legal/empaquetado_test.dart), no se asumen. Los chequeos de hash pasan con cd app && flutter test test/legal/ (app) y node scripts/ci/ep01-legal-provider.mjs (servidor). Cualquier cambio posterior del texto hace fallar el chequeo y exige versión nueva y nueva aprobación.

### REQ-05 `inferred`
> Fuente: Fuente: Request: Criterios de aceptación (aprobación legal y de Producto)

Queda en docs/legal/ un registro de aprobación docs/legal/aprobaciones-terminos-v1.0.md, creado por la tarea S1.T4 (no depende de la fecha de vigencia) con estado pendiente, versión, hash provisional que coincide con el encabezado del texto vigente en ese momento, fecha y observaciones (fecha, versión revisada, observaciones y su resolución de la asesoría legal, y la confirmación escrita de la aceptación funcional de Producto). S2.T1 lo actualiza con la versión y el hash finales; mientras falte la aprobación, el texto se marca como provisional. El ejecutor confirma LEYENDO el código del script de legal:registrar (server), sin ejecutarlo, que ignora los archivos que no siguen el patrón terminos-vX.Y.md / privacidad-vX.Y.md, de modo que aprobaciones-terminos-v1.0.md no se registra como documento legal. Los criterios de aprobación legal y de aceptación de Producto dependen de pendientes externos (designar la asesoría legal, identidad legal del titular y fecha de vigencia que fija Producto), por lo que la historia no cierra completa solo con código. Adjuntar los registros al issue GH-93 no es parte del trabajo automático: lo confirma y lo hace el dev.

### REQ-06 `confirmed`
> Fuente: Pedido de cambio, punto 1 y punto 11; Adenda 1 decisión (2)

Regla de versión única. Por defecto se REEMPLAZA la 1.0: el texto definitivo se escribe en docs/legal/terminos-v1.0.md y sus copias app/assets/legal/terminos-v1.0.md y server/legal/terminos-v1.0.md, sin versión 1.1 ni exige_reaceptacion. La verificación en staging, SOLO LECTURA, por el túnel (railway connect postgres --tunnel-only), de si la 1.0 está registrada en documento_legal o tiene aceptaciones en aceptacion_documento_legal es un item de verificación humana de la sesión 5 (requiere acceso externo), fuera del gate automático. Decisión del dev: si no hay acceso a staging, se continúa con el reemplazo de la 1.0 y se reporta al dev que la verificación quedó pendiente (no se detiene el trabajo). Si la persona confirma que la 1.0 está registrada o tiene aceptaciones, el dev decide la contingencia antes de publicar. Nunca se usan credenciales de escritura ni se ejecuta legal:registrar. La verificación de la 1.0 en staging, el hash registrado en staging y la lectura en V-51 son items humanos de la sesión 5, fuera del gate de la sesión 1. NOTA DE CONTINGENCIA: la rama 1.1 tocaría versionTerminosEmpaquetada y rutaTerminos (código de empaquetado de HU-03a-10, sin modificar ColaLegalDrift) y marcaría exige_reaceptacion; requiere aprobación explícita del dev antes de aplicarse. No hay migración ni se borran registros.

### REQ-07 `confirmed`
> Fuente: Ticket TAO-222, Alcance/Cobertura mínima (DEC-212); Adenda 1 punto 2

docs/legal/terminos-v1.0.md tiene un apartado con título Markdown propio sobre cuenta de dispositivo y cuenta completa, y explica qué habilita cada una (DEC-212). Su contenido no contradice DEC-212.

### REQ-08 `confirmed`
> Fuente: Ticket TAO-222, Cobertura mínima (DEC-208, DEC-225); Adenda 1 punto 2

El texto tiene un apartado con título propio sobre aceptación versionada y reaceptación que detiene el servicio hasta aceptar (DEC-208, DEC-225). No contradice esas DEC.

### REQ-09 `confirmed`
> Fuente: Ticket TAO-222, Cobertura mínima (DEC-213)

El texto tiene un apartado con título propio sobre códigos de producto de un solo uso validados en línea (DEC-213). No contradice DEC-213.

### REQ-10 `confirmed`
> Fuente: Ticket TAO-222, Cobertura mínima (DEC-020, DEC-056)

El texto tiene un apartado con título propio sobre limitación y suspensión administrativa (DEC-020, DEC-056). No contradice esas DEC.

### REQ-11 `confirmed`
> Fuente: Ticket TAO-222, Cobertura mínima (DEC-216)

El texto tiene un apartado con título propio que dice que el soporte se presta solo con cuenta completa (DEC-216). No contradice DEC-216.

### REQ-12 `confirmed`
> Fuente: Ticket TAO-222, Cobertura mínima (DEC-054, DEC-128, DEC-224)

El texto tiene un apartado con título propio sobre cierre de sesión, borrado de datos y eliminación de cuenta (DEC-054, DEC-128, DEC-224). No contradice esas DEC.

### REQ-13 `confirmed`
> Fuente: Ticket TAO-222, Cobertura mínima (DEC-086)

El texto tiene un apartado con título propio sobre versión mínima y actualizaciones (DEC-086). No contradice DEC-086.

### REQ-14 `confirmed`
> Fuente: Ticket TAO-222, Cobertura mínima (DEC-094)

El texto tiene un apartado con título propio sobre el contenido del método entregado con la app (DEC-094). No contradice DEC-094.
## Tasks

#### S1.T1 — Redactar el texto definitivo en docs/legal/terminos-v1.0.md reemplazando el fixture, con encabezado de versión 1.0, hash y marcador provisional VIGENTE_DESDE: PROVISIONAL, sin versión 1.1 ni exige_reaceptacion. Incluye los 8 apartados de cobertura mínima con título ## propio (REQ-07 a REQ-14) y una sección '## Resumen' (resumen breve para la tarjeta de V-51) dentro del mismo archivo. No consulta staging (eso es la verificación humana de la sesión 5).
Contrato: rollback: git revert del commit que reescribe docs/legal/terminos-v1.0.md; sin migración ni borrado de registros.. Status: done

#### S1.T1.2 — Leer el código existente para fijar el algoritmo de hash y si incluye o no el frontmatter: app/lib/features/legal/data/textos_legales_empaquetados.dart y app/test/legal/empaquetado_test.dart. Aplica a docs/legal/terminos-v1.0.md, app/assets/legal/terminos-v1.0.md y server/legal/terminos-v1.0.md. Confirmar además que versionTerminosEmpaquetada y rutaTerminos ya apuntan a la versión 1.0. No modificar código.
Contrato: rollback: Tarea de solo lectura: no modifica archivos, no hay nada que revertir.. Status: done

#### S1.T1.3 — Leer el código de textos_legales_empaquetados.dart, scripts/ci/ep01-legal-provider.mjs y legal:registrar (pnpm -C server run legal:registrar, sin ejecutarlo) para confirmar si fallan con vigente_desde provisional en docs/legal/terminos-v1.0.md, app/assets/legal/terminos-v1.0.md y server/legal/terminos-v1.0.md, y si el hash autorreferente funciona. Si falla, reportarlo al dev antes de continuar.
Contrato: rollback: Tarea de solo lectura: no modifica archivos, no hay nada que revertir.. Status: done

#### S1.T2 — Empaquetado del texto final, sin redactar. Copiar el texto final de docs/legal/terminos-v1.0.md a app/assets/legal/terminos-v1.0.md y a server/legal/terminos-v1.0.md, en el mismo commit que la redacción (S1.T1). No cambiar versionTerminosEmpaquetada ni rutaTerminos: ya apuntan a 1.0. Nota de contingencia: editarlos solo aplicaría a una rama 1.1 y requiere aprobación explícita del dev. La verificación visual en V-51 (QA-03a-14-01) es revisión humana fuera del gate.
Contrato: rollback: Restaurar los tres archivos terminos-v1.0.md (docs/legal, app/assets/legal y server/legal) con git revert del commit.. Status: done

#### S1.T3 — Regresión de la sesión: correr las pruebas de app/test/legal (chequeo de hash y cola-offline_test.dart) y el chequeo de hash del servidor; probar a mano QA-03a-14-02 (cambiar una palabra en docs/legal, confirmar que el chequeo falla y revertir) y revisar la redacción (guion largo, voseo, correos, jerarquía de títulos).
Contrato: rollback: No deja cambios en archivos: la prueba manual de QA-03a-14-02 (cambio de una palabra para comprobar que el hash no coincide) se revierte al terminar.. Status: done

#### S1.T4 — Crear docs/legal/aprobaciones-terminos-v1.0.md (registro de aprobación, no depende de la fecha de vigencia) con estado pendiente, versión 1.0, hash provisional que coincide con el encabezado de docs/legal/terminos-v1.0.md vigente en ese momento, fecha y observaciones (asesoría legal con su resolución y confirmación escrita de Producto). Confirmar LEYENDO el código del script de legal:registrar (server) que ignora archivos que no siguen el patrón terminos-vX.Y.md / privacidad-vX.Y.md; no ejecutar legal:registrar.
Contrato: rollback: git revert del commit que crea docs/legal/aprobaciones-terminos-v1.0.md; sin migración ni borrado de registros.. Status: done

#### S1.T5 — Recorrer docs/legal/terminos-v1.0.md contra la lista de cobertura mínima y confirmar que cada tema tiene su apartado con título ## propio y que ninguno contradice su DEC: cuenta de dispositivo y cuenta completa (DEC-212), aceptación versionada y reaceptación (DEC-208, DEC-225), códigos de un solo uso (DEC-213), limitación y suspensión (DEC-020, DEC-056), soporte solo con cuenta completa (DEC-216), cierre de sesión, borrado y eliminación de cuenta (DEC-054, DEC-128, DEC-224), versión mínima y actualizaciones (DEC-086), contenido del método (DEC-094). Si falta un tema o se contradice una DEC, corregir el texto en las tres copias a la vez o reportar al dev.
Contrato: rollback: Tarea de revisión: si no corrige el texto no modifica archivos; si lo corrige, git revert del commit restaura las tres copias de terminos-v1.0.md a la vez.. Status: done

#### S2.T1 — Actualizar el registro docs/legal/aprobaciones-terminos-v1.0.md (creado por S1.T4) con la versión y el hash finales del texto aprobado, y recalcular el hash en docs/legal/terminos-v1.0.md y sus copias app/assets/legal/terminos-v1.0.md y server/legal/terminos-v1.0.md cuando se fije la fecha de vigencia. No ejecutar legal:registrar.
Contrato: rollback: git revert del commit; el texto queda como en la sesión 1 marcado provisional. Status: pending

#### S2.T2 — Comprobar que el hash final coincide entre docs/legal/terminos-v1.0.md, app/assets/legal/terminos-v1.0.md y server/legal/terminos-v1.0.md y con el consignado en docs/legal/aprobaciones-terminos-v1.0.md (creado por S1.T4 y actualizado por S2.T1). No ejecutar legal:registrar.
Contrato: rollback: Tarea de solo lectura: no modifica archivos, no hay nada que revertir.. Status: pending

#### S2.T3 — Con la fecha real ya fijada (S2.T1), volver a recorrer la cobertura mínima en docs/legal/terminos-v1.0.md y confirmar que el hash coincide entre las tres copias.
Contrato: rollback: Tarea de solo lectura: no modifica archivos, no hay nada que revertir.. Status: pending
## Verificacion runtime

1. **Qué:** Verificar en runtime: La redacción del texto y del resumen está en español neutro, trata de tú, no usa guion largo (U+2014), usa títulos Markdown jerárquicos para lector de pantalla y no incluye datos personales ni correos reales; lo que depende de pendientes externos (identidad legal del titular) v
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket
   - **Requiere una persona:** revisar un correo real en una bandeja (inferido)

## Cambios al modelo de datos

Ninguno.

## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-01 (edit) `confirmed`: Existe el texto completo de los términos de uso v1 en español, en Markdown en docs/legal/terminos-v1.0.md (el archivo ya existe como fixture
- REQ-02 (edit) `inferred`: Junto al texto completo existe un resumen breve de los términos v1 para la tarjeta de V-51 en smartphone, coherente con el texto completo y 
- REQ-04 (edit) `confirmed`: El hash del texto final coincide entre las tres copias: fuente docs/legal/terminos-v1.0.md, copia de la app app/assets/legal/terminos-v1.0.m
- REQ-06 (edit) `confirmed`: Se reutiliza el empaquetado existente: la ruta app/assets/legal/terminos-v1.0.md (archivo ya existente, no faltante) y la constante versionT

**Task ops:**

- edit S1.T1 { desc="Reescribir docs/legal/terminos-v1.0.md (el archivo ya existe como fixture técnico en borrador: es una reescritura, no una creación) con el texto definitivo de los términos v1 y su resumen breve para V-51. Incluir los 8 apartados de la cobertura mínima, español neutro, trato de tú, sin guion largo. En el encabezado, la fecha de vigencia lleva un marcador provisional explícito (no se inventa fecha) y los pendientes externos (identidad legal del titular) van con marcadores de provisional. Entregar esta task en el MISMO commit que S1.T2 para que el chequeo de hash de CI no falle en un punto intermedio. El alcance de la revisión de S1 se limita a archivos y pruebas de hash; la presentación en V-51 es de HU-01-13.", rollback="Revertir el commit con git revert: se restaura el contenido previo de docs/legal/terminos-v1.0.md. Es un archivo de texto versionado, sin migración ni borrado de registros.", verify=["cd app && flutter test test/legal/"] }
- edit S1.T2 { desc="Sincronizar app/assets/legal/terminos-v1.0.md con la fuente docs/legal/terminos-v1.0.md y recalcular el hash. El algoritmo de hash y si incluye frontmatter se leen de app/lib/features/legal/data/textos_legales_empaquetados.dart y app/test/legal/empaquetado_test.dart; no asumirlos. Mantener versionTerminosEmpaquetada sin cambios. Entregar en el MISMO commit que S1.T1.", rollback="Revertir el commit con git revert: se restaura el texto previo de app/assets/legal/terminos-v1.0.md. Se reemplaza un archivo de texto versionado, sin migración ni borrado de registros.", verify=["cd app && flutter test test/legal/","node scripts/ci/ep01-legal-provider.mjs"] }
- edit S1.T3 { rollback="Revertir el commit con git revert: se restaura el texto previo de server/legal/terminos-v1.0.md. Se reemplaza un archivo de texto versionado, sin migración ni borrado de registros.", verify=["cd app && flutter test test/legal/","node scripts/ci/ep01-legal-provider.mjs"] }
- edit S2.T2 { verify=["cd app && flutter test test/legal/","node scripts/ci/ep01-legal-provider.mjs"] }

### Enmienda 2
**REQs:**

- REQ-02 (edit) `confirmed`: El resumen breve de los términos v1 para la tarjeta de V-51 en smartphone es una sección con título propio dentro de docs/legal/terminos-v1.
- REQ-03 (edit) `confirmed`: La redacción del texto y del resumen está en español neutro, trata de tú, no usa guion largo (U+2014), usa títulos Markdown jerárquicos para
- REQ-05 (edit) `inferred`: Queda en docs/legal/ un registro de aprobación de la asesoría legal (fecha, versión revisada, observaciones y su resolución) y una confirmac
- REQ-04 (edit) `confirmed`: El hash del texto final coincide entre las tres copias: fuente docs/legal/terminos-v1.0.md, copia de la app app/assets/legal/terminos-v1.0.m

**Task ops:**

- edit S1.T1 { desc="Reescribir docs/legal/terminos-v1.0.md (fixture técnico en borrador, se reemplaza el contenido de la versión 1.0, sin versión 1.1 ni exige_reaceptacion) con el texto definitivo de términos v1 en español neutro, de tú, sin guion largo. Incluye encabezado con versión, VIGENTE_DESDE: PROVISIONAL y hash, un apartado con título propio por cada tema de la cobertura mínima (DEC-212, DEC-208/DEC-225, DEC-213, DEC-020/DEC-056, DEC-216, DEC-054/DEC-128/DEC-224, DEC-086, DEC-094) y una sección con título propio de resumen breve para V-51 dentro del mismo archivo, de modo que entra en el hash y en las copias. La identidad legal del titular va con marcador provisional. Se commitea junto con S1.T2 en el mismo commit.", verify=["! grep -n '—' docs/legal/terminos-v1.0.md","grep -n '^## ' docs/legal/terminos-v1.0.md"] }
- edit S1.T1.1 { verify=["test \"$(grep -c '^## ' docs/legal/terminos-v1.0.md)\" -ge 8"] }
- edit S1.T1.3 { desc="Redactar dentro de docs/legal/terminos-v1.0.md la sección con título propio de resumen breve para la tarjeta de V-51 (no un archivo aparte ni una sección por acordar): coherente con el texto completo, sin obligaciones nuevas, corta para teléfono con escala de texto 200 %. Entra en el hash y en las copias.", verify=["grep -n -i '^## .*resumen' docs/legal/terminos-v1.0.md","ls docs/legal/"] }
- edit S1.T2 { desc="En el mismo commit que S1.T1, copiar el texto final a app/assets/legal/terminos-v1.0.md y a server/legal/terminos-v1.0.md (ambas copias idénticas a la fuente docs/legal/terminos-v1.0.md), manteniendo la constante versionTerminosEmpaquetada y FuenteTextosLegalesAsset sin cambios. Al leer app/lib/features/legal/data/textos_legales_empaquetados.dart, app/test/legal/empaquetado_test.dart y scripts/ci/ep01-legal-provider.mjs, confirmar el algoritmo de hash, si incluye el frontmatter y si vigente_desde se parsea como fecha y falla con el marcador PROVISIONAL (si falla, reportar al dev). reviewOutcome de S1: la fuente de textos legales de la app carga el texto nuevo y pasan cd app && flutter test test/legal/ y node scripts/ci/ep01-legal-provider.mjs; la verificación visual en V-51 (QA-03a-14-01) es revisión humana fuera del gate.", verify=["cmp docs/legal/terminos-v1.0.md app/assets/legal/terminos-v1.0.md && cmp docs/legal/terminos-v1.0.md server/legal/terminos-v1.0.md","cd app && flutter test test/legal/","node scripts/ci/ep01-legal-provider.mjs"] }
- edit S2.T1 { desc="Cuando se fije la fecha de vigencia, reemplazar el marcador PROVISIONAL en el encabezado de docs/legal/terminos-v1.0.md, recalcular el hash con el algoritmo del código existente y resincronizar ambas copias, app/assets/legal/terminos-v1.0.md y server/legal/terminos-v1.0.md, en el mismo commit. Comparar el hash del registro (documento_legal / constantes empaquetadas) con el del encabezado y verificar que coinciden. Esta sesión no adjunta nada al issue GH-93 automáticamente: adjuntar el registro de aprobación legal y de Producto es una acción que el dev confirma antes. Los criterios de aprobación legal y de Producto dependen de pendientes externos, por lo que la historia no cierra completa solo con código.", verify=["cmp docs/legal/terminos-v1.0.md app/assets/legal/terminos-v1.0.md && cmp docs/legal/terminos-v1.0.md server/legal/terminos-v1.0.md","cd app && flutter test test/legal/","node scripts/ci/ep01-legal-provider.mjs"] }

### Enmienda 3
**REQs:**

- REQ-01 (edit) `confirmed`: Existe el texto completo de los términos de uso en español, en Markdown en docs/legal/terminos-vX.Y.md (X.Y por defecto 1.1; la regla de ver
- REQ-02 (edit) `confirmed`: El resumen breve de los términos para la tarjeta de V-51 en smartphone es una sección con título propio dentro del mismo archivo docs/legal/
- REQ-03 (edit) `confirmed`: La redacción del texto y del resumen en terminos-vX.Y.md está en español neutro, trata de tú, no usa guion largo (U+2014), usa títulos Markd
- REQ-04 (edit) `confirmed`: El hash del texto final coincide entre las tres copias: fuente docs/legal/terminos-vX.Y.md, copia de la app app/assets/legal/terminos-vX.Y.m
- REQ-05 (edit) `inferred`: Queda en docs/legal/ un registro de aprobación por versión, docs/legal/aprobaciones-terminos-vX.Y.md (X.Y igual a la versión del texto; por 
- REQ-06 (edit) `confirmed`: Regla de versión. docs/legal/README.md establece que una versión publicada no se edita y legal:registrar rechaza republicar otro texto bajo 

**Tasks agregadas:**

- S2: Bloqueada por el pendiente externo: Producto aún no fija la fecha real de vigencia ni designa la asesoría legal; se ejecuta junto con S2.T1. Crear el registro de aprobación legal y de Producto, un archivo por versión: docs/legal/aprobaciones-terminos-vX.Y.md (X.Y igual a la versión del texto; por defecto docs/legal/aprobaciones-terminos-v1.1.md), con estado pendiente, versión, hash, fecha y observaciones. Confirmar que legal:registrar (pnpm -C server run legal:registrar) ignora archivos que no sigan el patrón terminos-vX.Y.md / privacidad-vX.Y.md, de modo que este registro no se trate como texto legal. No adjuntar nada al issue GH-93: eso lo confirma el dev. (valida: REQ-05; rollback: Borrar el archivo docs/legal/aprobaciones-terminos-vX.Y.md con git revert del commit.)

**Task ops:**

- edit S1.T1 { desc="Redactar el texto completo de los términos en docs/legal/terminos-vX.Y.md (X.Y por defecto 1.1), aplicando antes la regla de versión de REQ-06: consultar documento_legal y aceptacion_documento_legal de staging; si la 1.0 está registrada o no se puede verificar, crear terminos-v1.1.md en docs/legal, app/assets/legal y server/legal y marcar exige_reaceptacion según cambien derechos u obligaciones; solo si no está registrada en ningún entorno, reemplazar la 1.0. Un apartado con título propio por cada tema de la cobertura mínima (DEC-212, DEC-208, DEC-225, DEC-213, DEC-020, DEC-056, DEC-216, DEC-054, DEC-128, DEC-224, DEC-086, DEC-094) más el resumen para V-51 como sección con título propio dentro del mismo archivo. Encabezado con versión, marcador provisional de vigencia (VIGENTE_DESDE: PROVISIONAL) y hash. ADVERTENCIA: confirmar si textos_legales_empaquetados.dart y legal:registrar parsean vigente_desde como fecha y fallan con un marcador no fecha como PROVISIONAL; si el hash va en el encabezado y el algoritmo hashea el archivo completo, es autorreferente (el hash declarado cambia el hash calculado): confirmar cómo el código lo resuelve y dejarlo advertido al dev. Español neutro, trato de tú, sin guion largo (U+2014).", verify=["test -f docs/legal/terminos-v1.1.md","! grep -n $'\\xe2\\x80\\x94' docs/legal/terminos-v1.1.md"] }
- edit S1.T1.1 { desc="Verificar la cobertura mínima en docs/legal/terminos-vX.Y.md (X.Y por defecto 1.1): cada tema tiene un título propio, ningún apartado contradice la DEC citada y el resumen para V-51 es una sección con título propio dentro del mismo archivo.", verify=["grep -n '^#' docs/legal/terminos-v1.1.md"] }
- edit S1.T1.2 { desc="Verificar la redacción de docs/legal/terminos-vX.Y.md (X.Y por defecto 1.1): español neutro, trato de tú, sin guion largo (U+2014), sin datos personales ni correos reales, con marcadores explícitos de provisional para lo que depende de pendientes externos.", verify=["! grep -n $'\\xe2\\x80\\x94' docs/legal/terminos-v1.1.md"] }
- edit S1.T1.3 { desc="Confirmar el comportamiento del código con el marcador provisional sobre terminos-vX.Y.md (X.Y por defecto 1.1): si textos_legales_empaquetados.dart o scripts/ci/ep01-legal-provider.mjs parsean vigente_desde como fecha y fallan, reportarlo al dev antes de continuar.", verify=["node scripts/ci/ep01-legal-provider.mjs"] }
- edit S1.T2 { desc="Copiar el texto final a app/assets/legal/terminos-vX.Y.md y server/legal/terminos-vX.Y.md (X.Y por defecto 1.1) en el mismo commit que la redacción. En la versión 1.1 actualizar versionTerminosEmpaquetada y rutaTerminos (nombre del asset) en el código de empaquetado y reportar al dev que eso toca en lo mínimo el código de empaquetado de HU-03a-10. reviewOutcome: incluye solo los archivos modificados, cmp entre las tres copias y las pruebas de hash (cd app && flutter test test/legal/ y node scripts/ci/ep01-legal-provider.mjs); la verificación visual en V-51 (QA-03a-14-01) es revisión humana fuera de este gate.", verify=["cmp docs/legal/terminos-v1.1.md app/assets/legal/terminos-v1.1.md","cmp docs/legal/terminos-v1.1.md server/legal/terminos-v1.1.md","node scripts/ci/ep01-legal-provider.mjs"] }
- edit S1.T3 { rollback="No deja cambios en archivos: la prueba manual de QA-03a-14-02 (cambio de una palabra para comprobar que el hash no coincide) se revierte al terminar." }
- edit S2.T1 { desc="Diferida: bloqueada por el pendiente externo de que Producto fije la fecha real de vigencia (decisión del dev). Cuando exista, reemplazar el marcador provisional por la fecha real en docs/legal/terminos-vX.Y.md (X.Y por defecto 1.1), recalcular el hash y actualizar las tres copias (docs/legal, app/assets/legal, server/legal) en el mismo commit, y actualizar el registro docs/legal/aprobaciones-terminos-vX.Y.md con la versión y el hash finales. Adjuntar los registros al issue GH-93 no es parte de esta tarea: lo confirma y lo hace el dev.", verify=["cmp docs/legal/terminos-v1.1.md app/assets/legal/terminos-v1.1.md","cmp docs/legal/terminos-v1.1.md server/legal/terminos-v1.1.md","node scripts/ci/ep01-legal-provider.mjs"] }

### Enmienda 4
**REQs:**

- REQ-05 (edit) `inferred`: Queda en docs/legal/ un registro de aprobación por versión, docs/legal/aprobaciones-terminos-vX.Y.md (X.Y igual a la versión del texto; por 

**Task ops:**

- edit S1.T2 { rollback="Revertir el commit de la tarea. Retirar la publicación nueva sin borrar su versión ni su hash: quitar terminos-vX.Y.md (X.Y por defecto 1.1) de docs/legal, app/assets/legal y server/legal solo si no fue registrado en ningún entorno, y restaurar versionTerminosEmpaquetada y rutaTerminos si se modificaron. Comprobación: cd app && flutter test test/legal/ y node scripts/ci/ep01-legal-provider.mjs pasan con el estado previo." }
- edit S2.T3 { desc="Crear docs/legal/aprobaciones-terminos-vX.Y.md (X.Y por defecto 1.1, igual a la versión del texto), un archivo por versión con estado pendiente, versión, hash, fecha y observaciones (fecha, versión revisada, observaciones y su resolución de la asesoría legal, confirmación escrita de Producto), asociado a la versión y hash exactos del texto. El ejecutor confirma que legal:registrar (pnpm -C server run legal:registrar) ignora archivos que no sigan el patrón terminos-vX.Y.md / privacidad-vX.Y.md. Esta tarea queda bloqueada junto con el resto de la sesión 2 por el pendiente externo de la fecha de vigencia que fija Producto. Cubre REQ-05.", validates=["REQ-05"] }

### Enmienda 5
**REQs:**

- REQ-01 (edit) `confirmed`: Existe el texto completo de los términos de uso en español, en Markdown en docs/legal/terminos-v1.0.md (reemplaza el contenido de la 1.0 act
- REQ-02 (edit) `confirmed`: El resumen breve de los términos para la tarjeta de V-51 en smartphone es una sección con título propio dentro del mismo archivo docs/legal/
- REQ-03 (edit) `confirmed`: La redacción del texto y del resumen en terminos-v1.0.md está en español neutro, trata de tú, no usa guion largo (U+2014), usa títulos Markd
- REQ-04 (edit) `confirmed`: El hash del texto final coincide entre las tres copias: fuente docs/legal/terminos-v1.0.md, copia de la app app/assets/legal/terminos-v1.0.m
- REQ-05 (edit) `inferred`: Queda en docs/legal/ un registro de aprobación docs/legal/aprobaciones-terminos-v1.0.md, creado por la tarea S1.T7 (no depende de la fecha d
- REQ-06 (edit) `confirmed`: Regla de versión única. Por defecto se REEMPLAZA la 1.0: el texto definitivo se escribe en docs/legal/terminos-v1.0.md y sus copias app/asse

**Tasks agregadas:**

- S1: Crear docs/legal/aprobaciones-terminos-v1.0.md (registro de aprobación, no depende de la fecha de vigencia) con estado pendiente, versión 1.0, hash provisional que coincide con el encabezado de docs/legal/terminos-v1.0.md vigente en ese momento, fecha y observaciones (asesoría legal con su resolución y confirmación escrita de Producto). Confirmar LEYENDO el código del script de legal:registrar (server) que ignora archivos que no siguen el patrón terminos-vX.Y.md / privacidad-vX.Y.md; no ejecutar legal:registrar. (valida: REQ-05; rollback: git revert del commit que crea docs/legal/aprobaciones-terminos-v1.0.md; sin migración ni borrado de registros.)

**Task ops:**

- edit S1.T1 { desc="Primero verificar en staging, SOLO LECTURA, por el túnel (railway connect postgres --tunnel-only), si la 1.0 está registrada en documento_legal o tiene aceptaciones en aceptacion_documento_legal; si está registrada, tiene aceptaciones o no se puede verificar, DETENERSE y consultar al dev (sin credenciales de escritura, sin ejecutar legal:registrar, sin asumir dry-run). Luego redactar el texto definitivo en docs/legal/terminos-v1.0.md reemplazando el fixture, con encabezado de versión 1.0, hash y marcador provisional de vigente_desde, sin versión 1.1 ni exige_reaceptacion.", rollback="Restaurar el contenido previo de docs/legal/terminos-v1.0.md con git revert del commit, sin migración ni borrado de registros.", validates=["REQ-01","REQ-03","REQ-06"], verify=["ls docs/legal/terminos-v1.0.md","grep -n 'PROVISIONAL' docs/legal/terminos-v1.0.md"] }
- edit S1.T1.1 { verify=["ls docs/legal/terminos-v1.0.md","grep -c '^#' docs/legal/terminos-v1.0.md"] }
- edit S1.T1.2 { verify=["ls docs/legal/terminos-v1.0.md","grep -n -i 'resumen' docs/legal/terminos-v1.0.md"] }
- edit S1.T1.3 { desc="Tarea de solo lectura: leer textos_legales_empaquetados.dart, scripts/ci/ep01-legal-provider.mjs y el script de legal:registrar (pnpm -C server run legal:registrar, sin ejecutarlo) y confirmar si parsean vigente_desde como fecha y fallan con el marcador provisional, y si el hash autorreferente funciona. No se puede verificar desde el spec; si falla, reportar al dev antes de continuar.", rollback="Tarea de solo lectura sin cambios que revertir; si dejó un archivo temporal, borrarlo.", validates=["REQ-03"] }
- edit S1.T2 { desc="Copiar docs/legal/terminos-v1.0.md a app/assets/legal/terminos-v1.0.md y a server/legal/terminos-v1.0.md en el mismo commit de la redacción, y comprobar que el hash coincide entre las tres copias según el algoritmo de textos_legales_empaquetados.dart. No se actualizan versionTerminosEmpaquetada ni rutaTerminos (con 1.0 ya apuntan a 1.0); esa actualización solo aplica a la nota de contingencia 1.1 y requiere aprobación del dev.", validates=["REQ-04","REQ-06"], verify=["cd app && flutter test test/legal/","node scripts/ci/ep01-legal-provider.mjs"] }
- edit S2.T1 { desc="Fijar la fecha real de vigencia en el encabezado de docs/legal/terminos-v1.0.md, recalcular el hash, actualizar las copias app/assets/legal/terminos-v1.0.md y server/legal/terminos-v1.0.md, y actualizar el registro docs/legal/aprobaciones-terminos-v1.0.md creado en S1.T7 con la versión y el hash finales.", validates=["REQ-01","REQ-04","REQ-05"], verify=["cd app && flutter test test/legal/","node scripts/ci/ep01-legal-provider.mjs"] }
- delete S2.T3

### Enmienda 6
**REQs:**

- REQ-05 (edit) `inferred`: Queda en docs/legal/ un registro de aprobación docs/legal/aprobaciones-terminos-v1.0.md, creado por la tarea S1.T4 (no depende de la fecha d

**Task ops:**

- edit S1.T1.1 { desc="Verificar en staging, SOLO LECTURA, por el túnel (railway connect postgres --tunnel-only), si la versión 1.0 de los términos está registrada en documento_legal o tiene aceptaciones en aceptacion_documento_legal. La versión a revisar corresponde al archivo docs/legal/terminos-v1.0.md (con sus copias app/assets/legal/terminos-v1.0.md y server/legal/terminos-v1.0.md). Si está registrada, tiene aceptaciones, o no se puede verificar (sin acceso), DETENERSE y consultar al dev. No usar credenciales de escritura, no ejecutar legal:registrar ni asumir dry-run." }
- edit S1.T1.2 { desc="Leer el código existente para fijar el algoritmo de hash y si incluye o no el frontmatter: app/lib/features/legal/data/textos_legales_empaquetados.dart y app/test/legal/empaquetado_test.dart. Aplica a docs/legal/terminos-v1.0.md, app/assets/legal/terminos-v1.0.md y server/legal/terminos-v1.0.md. Confirmar además que versionTerminosEmpaquetada y rutaTerminos ya apuntan a la versión 1.0. No modificar código." }
- edit S1.T1.3 { desc="Leer el código de textos_legales_empaquetados.dart, scripts/ci/ep01-legal-provider.mjs y legal:registrar (pnpm -C server run legal:registrar, sin ejecutarlo) para confirmar si fallan con vigente_desde provisional en docs/legal/terminos-v1.0.md, app/assets/legal/terminos-v1.0.md y server/legal/terminos-v1.0.md, y si el hash autorreferente funciona. Si falla, reportarlo al dev antes de continuar." }
- edit S1.T2 { desc="Redactar el texto definitivo de los términos de uso, con resumen breve para V-51 como sección propia, en docs/legal/terminos-v1.0.md (reemplaza el contenido de la 1.0 actual, sin versión 1.1). Copiar el mismo texto a app/assets/legal/terminos-v1.0.md y server/legal/terminos-v1.0.md en el mismo commit que la redacción. No cambiar versionTerminosEmpaquetada ni rutaTerminos (ya apuntan a 1.0). Nota de contingencia: la edición de versionTerminosEmpaquetada y rutaTerminos solo aplicaría a una rama 1.1 y requiere aprobación explícita del dev.", rollback="Restaurar los tres archivos terminos-v1.0.md (docs/legal/, app/assets/legal/ y server/legal/) a su contenido previo con git revert del commit de la redacción.", verify=["cmp docs/legal/terminos-v1.0.md app/assets/legal/terminos-v1.0.md ; cmp docs/legal/terminos-v1.0.md server/legal/terminos-v1.0.md ; node scripts/ci/ep01-legal-provider.mjs"] }
- edit S2.T1 { desc="Actualizar el registro docs/legal/aprobaciones-terminos-v1.0.md (creado por S1.T4) con la versión y el hash finales del texto aprobado, y recalcular el hash en docs/legal/terminos-v1.0.md y sus copias app/assets/legal/terminos-v1.0.md y server/legal/terminos-v1.0.md cuando se fije la fecha de vigencia. No ejecutar legal:registrar.", verify=["node scripts/ci/ep01-legal-provider.mjs","cd app && flutter test test/legal/"] }
- edit S2.T2 { desc="Comprobar que el hash final coincide entre docs/legal/terminos-v1.0.md, app/assets/legal/terminos-v1.0.md y server/legal/terminos-v1.0.md y con el consignado en docs/legal/aprobaciones-terminos-v1.0.md (creado por S1.T4 y actualizado por S2.T1). No ejecutar legal:registrar.", verify=["cmp docs/legal/terminos-v1.0.md app/assets/legal/terminos-v1.0.md ; cmp docs/legal/terminos-v1.0.md server/legal/terminos-v1.0.md ; node scripts/ci/ep01-legal-provider.mjs","cd app && flutter test test/legal/"] }

### Enmienda 7
**REQs:**

- REQ-05 (edit) `inferred`: Queda en docs/legal/ un registro de aprobación docs/legal/aprobaciones-terminos-v1.0.md, creado por la tarea S1.T4 (no depende de la fecha d

**Task ops:**

- edit S1.T2 { desc="Empaquetado del texto final, sin redactar. Copiar el texto final de docs/legal/terminos-v1.0.md a app/assets/legal/terminos-v1.0.md y a server/legal/terminos-v1.0.md, en el mismo commit que la redacción (S1.T1). No cambiar versionTerminosEmpaquetada ni rutaTerminos: ya apuntan a 1.0. Nota de contingencia: editarlos solo aplicaría a una rama 1.1 y requiere aprobación explícita del dev. La verificación visual en V-51 (QA-03a-14-01) es revisión humana fuera del gate.", rollback="Restaurar los tres archivos terminos-v1.0.md (docs/legal, app/assets/legal y server/legal) con git revert del commit.", validates=["REQ-04","REQ-06"], verify=["cmp docs/legal/terminos-v1.0.md app/assets/legal/terminos-v1.0.md && cmp docs/legal/terminos-v1.0.md server/legal/terminos-v1.0.md","node scripts/ci/ep01-legal-provider.mjs"] }

### Enmienda 8
**REQs:**

- REQ-07 (add) `confirmed`: docs/legal/terminos-v1.0.md tiene un apartado con título Markdown propio sobre cuenta de dispositivo y cuenta completa, y explica qué habili
- REQ-08 (add) `confirmed`: El texto tiene un apartado con título propio sobre aceptación versionada y reaceptación que detiene el servicio hasta aceptar (DEC-208, DEC-
- REQ-09 (add) `confirmed`: El texto tiene un apartado con título propio sobre códigos de producto de un solo uso validados en línea (DEC-213). No contradice DEC-213.
- REQ-10 (add) `confirmed`: El texto tiene un apartado con título propio sobre limitación y suspensión administrativa (DEC-020, DEC-056). No contradice esas DEC.
- REQ-11 (add) `confirmed`: El texto tiene un apartado con título propio que dice que el soporte se presta solo con cuenta completa (DEC-216). No contradice DEC-216.
- REQ-12 (add) `confirmed`: El texto tiene un apartado con título propio sobre cierre de sesión, borrado de datos y eliminación de cuenta (DEC-054, DEC-128, DEC-224). N
- REQ-13 (add) `confirmed`: El texto tiene un apartado con título propio sobre versión mínima y actualizaciones (DEC-086). No contradice DEC-086.
- REQ-14 (add) `confirmed`: El texto tiene un apartado con título propio sobre el contenido del método entregado con la app (DEC-094). No contradice DEC-094.

**Tasks agregadas:**

- S2: Recorrer docs/legal/terminos-v1.0.md contra la lista de cobertura mínima y confirmar que cada tema (REQ-07 a REQ-14) tiene su apartado con título propio y que ninguno contradice su DEC. Después, con el texto ya redactado y copiado, confirmar que el hash coincide entre docs/legal/terminos-v1.0.md, app/assets/legal/terminos-v1.0.md y server/legal/terminos-v1.0.md ejecutando cd app && flutter test test/legal/ y node scripts/ci/ep01-legal-provider.mjs. Si un tema falta o una DEC se contradice, reportar al dev. La aprobación de asesoría legal y de Producto, la identidad legal del titular y la fecha de vigencia son pendientes externos declarados, no parte de esta task. (valida: REQ-07, REQ-08, REQ-09, REQ-10, REQ-11, REQ-12, REQ-13, REQ-14, REQ-04, test; rollback: No hay cambios de código que revertir: es una task de verificación. Si implicó ajustes al texto, revertir con git restore de las tres copias de terminos-v1.0.md a la vez para mantener el hash idéntico.)

### Enmienda 9
**REQs:**

- REQ-06 (edit) `confirmed`: Regla de versión única. Por defecto se REEMPLAZA la 1.0: el texto definitivo se escribe en docs/legal/terminos-v1.0.md y sus copias app/asse
- REQ-03 (edit) `confirmed`: La redacción del texto y del resumen en terminos-v1.0.md está en español neutro, trata de tú, no usa guion largo (U+2014), usa títulos Markd

**Tasks agregadas:**

- S1: Recorrer docs/legal/terminos-v1.0.md contra la lista de cobertura mínima y confirmar que cada tema tiene su apartado con título ## propio y que ninguno contradice su DEC: cuenta de dispositivo y cuenta completa (DEC-212), aceptación versionada y reaceptación (DEC-208, DEC-225), códigos de un solo uso (DEC-213), limitación y suspensión (DEC-020, DEC-056), soporte solo con cuenta completa (DEC-216), cierre de sesión, borrado y eliminación de cuenta (DEC-054, DEC-128, DEC-224), versión mínima y actualizaciones (DEC-086), contenido del método (DEC-094). Si falta un tema o se contradice una DEC, corregir el texto en las tres copias a la vez o reportar al dev. (valida: REQ-07, REQ-08, REQ-09, REQ-10, REQ-11, REQ-12, REQ-13, REQ-14, REQ-01; rollback: Tarea de revisión: si no corrige el texto no modifica archivos; si lo corrige, git revert del commit restaura las tres copias de terminos-v1.0.md a la vez.)

**Task ops:**

- edit S1.T1 { desc="Redactar el texto definitivo en docs/legal/terminos-v1.0.md reemplazando el fixture, con encabezado de versión 1.0, hash y marcador provisional VIGENTE_DESDE: PROVISIONAL, sin versión 1.1 ni exige_reaceptacion. Incluye los 8 apartados de cobertura mínima con título ## propio (REQ-07 a REQ-14) y una sección '## Resumen' (resumen breve para la tarjeta de V-51) dentro del mismo archivo. No consulta staging (eso es la verificación humana de la sesión 5).", rollback="git revert del commit que reescribe docs/legal/terminos-v1.0.md; sin migración ni borrado de registros.", validates=["REQ-01","REQ-02","REQ-03","REQ-06"], verify=["test -f docs/legal/terminos-v1.0.md && grep -n 'PROVISIONAL' docs/legal/terminos-v1.0.md && grep -n -i '^## .*resumen' docs/legal/terminos-v1.0.md"] }
- edit S1.T1.2 { rollback="Tarea de solo lectura: no modifica archivos, no hay nada que revertir.", validates=["REQ-04","REQ-06"], verify=["grep -n 'sha256' app/lib/features/legal/data/textos_legales_empaquetados.dart && grep -n 'versionTerminosEmpaquetada\\|rutaTerminos' app/lib/features/legal/data/textos_legales_empaquetados.dart && grep -n -i 'hash' app/test/legal/empaquetado_test.dart"] }
- edit S1.T1.3 { rollback="Tarea de solo lectura: no modifica archivos, no hay nada que revertir.", verify=["grep -n -i 'vigente' app/lib/features/legal/data/textos_legales_empaquetados.dart scripts/ci/ep01-legal-provider.mjs server/scripts/registrar-version-legal.ts"] }
- edit S1.T2 { verify=["cmp docs/legal/terminos-v1.0.md app/assets/legal/terminos-v1.0.md && cmp docs/legal/terminos-v1.0.md server/legal/terminos-v1.0.md && node scripts/ci/ep01-legal-provider.mjs"] }
- edit S1.T3 { verify=["(cd app && flutter test test/legal/) && node scripts/ci/ep01-legal-provider.mjs"] }
- edit S1.T4 { verify=["test -f docs/legal/aprobaciones-terminos-v1.0.md && grep -n -i 'pendiente' docs/legal/aprobaciones-terminos-v1.0.md && grep -n -i 'terminos-v\\|privacidad-v' server/scripts/registrar-version-legal.ts"] }
- edit S2.T3 { desc="Con la fecha real ya fijada (S2.T1), volver a recorrer la cobertura mínima en docs/legal/terminos-v1.0.md y confirmar que el hash coincide entre las tres copias.", rollback="Tarea de solo lectura: no modifica archivos, no hay nada que revertir.", validates=["REQ-04"], verify=["(cd app && flutter test test/legal/) && node scripts/ci/ep01-legal-provider.mjs"] }
- edit S2.T2 { rollback="Tarea de solo lectura: no modifica archivos, no hay nada que revertir.", verify=["cmp docs/legal/terminos-v1.0.md app/assets/legal/terminos-v1.0.md && cmp docs/legal/terminos-v1.0.md server/legal/terminos-v1.0.md && node scripts/ci/ep01-legal-provider.mjs && (cd app && flutter test test/legal/)"] }
## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T1.2
- [x] S1.T1.3
- [x] S1.T2
- [x] S1.T3
- [x] S1.T4
- [x] S1.T5

**Gate (auto)**: docs/legal/terminos-v1.0.md con los 8 apartados de cobertura mínima con título ## propio (recorridos por S1.T5 contra sus DEC), la sección ## Resumen para V-51 y el marcador provisional de vigencia, copiado a app/assets/legal/ y server/legal/ con el mismo nombre; cmp entre las tres copias sin diferencias; pasan cd app && flutter test test/legal/ y node scripts/ci/ep01-legal-provider.mjs; existe docs/legal/aprobaciones-terminos-v1.0.md con estado pendiente y el hash del encabezado del texto, y la lectura de server/scripts/registrar-version-legal.ts confirma que ignora ese archivo (no se ejecuta legal:registrar). Esta sesión no depende de la fecha de vigencia ni de acceso a staging: la verificación de la 1.0 en staging, el hash registrado en staging y la lectura en V-51 son items humanos de la sesión 5, fuera de este gate.

### Session 2 · T1 · open

**Tasks:**
- [ ] S2.T1
- [ ] S2.T2
- [ ] S2.T3

**Gate (auto)**: SESIÓN DIFERIDA Y BLOQUEADA hasta que Producto fije la fecha real de vigencia (pendiente externo; decisión del dev). Cuando se desbloquee: el encabezado de docs/legal/terminos-v1.0.md lleva la fecha real, el hash se recalculó y las tres copias coinciden (cmp sin diferencias); pasan cd app && flutter test test/legal/ y node scripts/ci/ep01-legal-provider.mjs; docs/legal/aprobaciones-terminos-v1.0.md (creado en la sesión 1) queda actualizado con la versión y el hash finales. Adjuntar al issue GH-93 no es parte del gate: lo confirma el dev.

### Session 3 · T0 · open

### Session 4 · T0 · open

### Session 5 · T0 · open

**Gate (auto)**: Verificaciones humanas con acceso externo, fuera del gate automático: estado de la 1.0 en staging, hash_contenido registrado en staging y lectura en V-51. Si no hay acceso a staging, se continúa con el reemplazo de la 1.0 y se reporta al dev; no detiene el trabajo.
