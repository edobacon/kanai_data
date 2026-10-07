---
id: TAO-190-SPEC
project: taomangalam
ticket: TAO-190
status: approved
---

# TAO-190 · Preparación del proveedor real de assets M1a para EP-01

## Resumen ejecutivo

Preparación en un ticket de cuatro historias proveedoras para splash: origen/presupuestos dentro de Railway, inventario, exportación WebP y arte M1a. Railway es el único proveedor por adenda 2; no se reabre S3/R2. Seis sesiones de código (S1,S2,S3,S4,S6,S7) y verificación final S8, con los criterios fuente conservados y gates por etapa. El número de sesiones responde al alcance original sin nuevos tickets. Autónomo con SkipTeach y trabajo en epic/EP-01a. Permanece sin empezar: iniciar únicamente después del otro trabajo y de comprobar commits integrados, árbol limpio y base de pruebas. Las mediciones remotas Railway requieren acceso disponible y autorizado. Licencia/autoría normativa y aprobación real de Producto/Diseño/Contenido son pendientes externos documentados, no inferencias aprobatorias.
## Requirements

### REQ-01 `confirmed`
> Fuente: /Users/edobacon/.kanai/data/kanai_data/projects/taomangalam/tickets/TAO-190.md

Ejecutar el flujo canónico implement con SkipTeach (solo teach-intake y teach-close omitidos) repartido en varias sesiones de este mismo ticket, sin crear tickets nuevos. El primer arranque se prepara como una LISTA OPERATIVA de verificación previa resuelta con los chequeos canónicos ya existentes (rama epic/EP-01a, trabajo concurrente terminado, árbol limpio, commits de EP-00 integrados y base de pruebas registrada): no se construye un control nuevo de Kanai ni se prueban sus máquinas de estado. Durante el intake el ticket permanece open y no se ejecutan tareas, pre-gate, checkout, stash, reset ni commit; cada proveedor consume la entrega real del anterior.

### REQ-02 `confirmed`
> Fuente: docs/backlog/EP-02_contenido_empaquetado_y_assets.md:145; TAO-190 adenda 2 (2026-10-06)

Entregar la decisión de origen y presupuesto de HU-02-01 con Railway como ÚNICO proveedor (decidido por Eduardo en la adenda 2): lo que el spike decide no es el proveedor sino la MODALIDAD dentro de Railway, Storage Buckets frente a volumen persistente servido por un servicio, registrando la elegida y las alternativas internas descartadas con su motivo, citando las fuentes oficiales consultadas el 2026-10-06 (https://docs.railway.com/storage-buckets, https://docs.railway.com/storage-buckets/billing, https://docs.railway.com/volumes/reference). Son RESULTADO del spike, no supuestos previos: los presupuestos en MB de binario iOS y Android y del conjunto descargable medidos sobre WebP por familia, la regla esencial/descargable, las URLs versionadas por clave inmutable derivada del hash, la publicación del SHA-256 y el modo de acceso; para bucket privado se evalúan URLs firmadas frente a proxy, el costo total incluyendo servicio, egress y CDN, y la persistencia de versiones anteriores mediante claves inmutables aunque Railway no ofrezca versionado nativo. El prototipo es un servidor HTTP local que sirve un derivado real y verifica su SHA-256: no se asumen credenciales, no se crean recursos en Railway y no representa latencia remota. La medición remota desde Railway es evidencia obligatoria cuando haya entorno autorizado; si no lo hay se registra el bloqueo real y pendiente con la evidencia faltante, sin inventar resultados y sin volver a pedir candidatos ni credenciales para COMENZAR la comparación documental. Actualizar documentos y consumidores para que inventario y exportación usen una política real.

### REQ-03 `confirmed`
> Fuente: docs/backlog/EP-02_contenido_empaquetado_y_assets.md:252

Evolucionar el manifiesto único y su JSON Schema para registrar identidad estable, familia, maestro, estado, procedencia (fuente externa O BIEN autoría acompañada de un enlace resoluble al registro de creación, según el alcance de HU-02-02), destino, medidas, tema, plataforma, modo y alt. El validador comprueba PRESENCIA de esos campos y que la referencia al registro de creación resuelva; no evalúa contenido ni política de licencia ni normativa de autoría, y verifica coherencia de archivos y cobertura del inventario en CI para impedir referencias productivas inválidas.

### REQ-04 `confirmed`
> Fuente: docs/backlog/EP-02_contenido_empaquetado_y_assets.md:252

Aplicar los cinco estados y transiciones de DEC-230 sin fabricar aprobaciones: aprobado exige los registros reales de Diseño Y de Contenido (ambos, según el alcance de HU-02-02), la procedencia presente (fuente o autoría con registro de creación) y derivados registrados; un maestro aprobado sin derivados queda por-optimizar y faltante exige destino y medidas objetivo. El contrato del validador NO incluye exigencia de política de licencia ni de autoría normativa: esa definición es un followup externo del propietario que la fuente excluye resolver aquí. Ese pendiente bloquea nuevas promociones a aprobado, pero no bloquea construir ni validar el inventario y no degrada estados ni aprobaciones reales preexistentes.

### REQ-05 `confirmed`
> Fuente: docs/backlog/EP-02_contenido_empaquetado_y_assets.md:252

Migrar el inventario conservando los 64 ids y alt existentes e incorporar los maestros productivos hoy no inventariados; mantener permanencia provisional y los fondos de maqueta fuera de aprobado final para proteger registros y consumidores históricos.

### REQ-06 `confirmed`
> Fuente: docs/backlog/EP-02_contenido_empaquetado_y_assets.md:379

Entregar la exportación PNG → WebP sRGB por usos y densidades 1x/2x/3x de content/imagenes/12, preservando proporción y alfa, con nombres numerados y límites de peso por familia derivados de HU-02-01; rechazar ampliaciones y registrar ruta, medidas, bytes y SHA-256 por variante.

### REQ-07 `inferred`
> Fuente: docs/backlog/EP-02_contenido_empaquetado_y_assets.md:379

Hacer reproducible y verificable la exportación mediante --check, sin sobrescribir maestros: salida determinista, diagnóstico por asset (id y variante) ante maestro cambiado o derivado desactualizado, comparación de SHA-256 de maestros antes y después, y resumen por familia con cantidades, pesos y errores. El contrato no incluye límite de concurrencia ni opción de paralelismo: el exportador no los declara ni los acepta.

### REQ-08 `confirmed`
> Fuente: docs/backlog/EP-02_contenido_empaquetado_y_assets.md:379

Declarar en app/pubspec.yaml únicamente derivados manifestados con modo empaquetado y validar esa selección en CI; rechazar el directorio app/assets/ completo y los maestros PNG para que el binario respete el presupuesto y los assets esenciales estén disponibles offline.

### REQ-09 `confirmed`
> Fuente: docs/backlog/EP-02_contenido_empaquetado_y_assets.md:854

Entregar el inventario y los derivados reales de las 45 piezas de identidad, Ashura, llegadas, permanencia y perfiles según HU-02-07, consumiendo la política y pipeline previos; mantener permanencia sin aprobación como provisional sin derivados finales y conservar las rutas numéricas de Casa 5.

### REQ-10 `confirmed`
> Fuente: docs/backlog/EP-02_contenido_empaquetado_y_assets.md:379; docs/backlog/EP-02_contenido_empaquetado_y_assets.md:854

Conservar la aprobación externa real y la fidelidad visual de HU-02-03/07 antes de consumir piezas finales: hojas de contacto en teléfono 3x y tablet 2x deben preservar forma y color, y las ilustraciones deben integrarse con contain sobre papel ivory100 sin marcos, bordes, sombras ni recuadros.

### REQ-11 `confirmed`
> Fuente: docs/backlog/EP-02_contenido_empaquetado_y_assets.md:854

Entregar los iconos de lanzamiento B3 desde identidad conforme a DEC-151: iOS a sangre completa, Android adaptativo con primer plano, fondo papel #FAF7F0 y capa monocroma; verificar centrado y zona segura sin ampliar el alcance a iconos de tienda.

### REQ-12 `confirmed`
> Fuente: /Users/edobacon/.kanai/data/kanai_data/projects/taomangalam/tickets/TAO-190.md

Preparar ep01-assets-provider con trazabilidad de los casos de las cuatro fuentes a pruebas y evidencias reales; el consumo por EP-01 exige check ejecutado sobre commits integrados y aprobaciones humanas correspondientes, sin cerrar historias proveedoras por anticipado.

### REQ-13 `confirmed` `enforcement`
> Fuente: app/test/core/images/image_manifest_test.dart:99

El inventario productivo se consume DETRÁS de la interfaz existente de imágenes: el código de imágenes no lee app/assets/manifest.json directamente y conserva el resolvedor integrado y su token de respaldo. Adaptar el suministro para que la fuente productiva real se cargue a través de esa interfaz está permitido y esperado; la fixture de los tests sigue siendo fixture y no se exige como fuente de producción.

### REQ-14 `confirmed` `variant`
> Fuente: sonda:card-lint-de-docs-4d9deffd06

Los documentos realmente modificados por HU-02-01/02/03/07 deben cumplir docs:check:changed y el lint del proyecto, incluso si figuran en .docs-baseline.txt. La comparación usa la base de integración pertinente del paquete, epic/EP-01a (DOCS_DIFF_BASE=epic/EP-01a), no origin/main, que arrastra trabajo ajeno; se corrigen únicamente los archivos tocados, sin ampliar el trabajo al baseline completo.
## Tasks

#### S1.T1 — Dejar preparada la LISTA OPERATIVA del primer arranque usando los chequeos canónicos ya existentes: trabajo concurrente terminado, rama epic/EP-01a, árbol limpio, commits de EP-00 integrados (verificados, no reejecutados) y base de pruebas registrada, más la matriz de fuentes HU-02-01/02/03/07 y el registro de SkipTeach acotado a teach-intake y teach-close. NO construir un control de arranque nuevo en Kanai ni pruebas de su máquina de estados. Estas comprobaciones se ejecutan al arrancar, no durante el intake: el ticket permanece open y no se hace checkout, stash, reset, commit ni ejecución de tareas.
Contrato: rollback: Si cualquier precondición falla, conservar la lista y detener el arranque; no alterar rama, árbol, datos ni registros. Corregir únicamente el registro de preparación por el flujo canónico.. Status: done

#### S1.T2 — Realizar HU-02-01 con Railway como único proveedor (adenda 2): comparar DENTRO de Railway la modalidad Storage Buckets frente a volumen persistente servido por un servicio, citando las fuentes oficiales consultadas el 2026-10-06 (https://docs.railway.com/storage-buckets, https://docs.railway.com/storage-buckets/billing, https://docs.railway.com/volumes/reference) y registrando la modalidad elegida y las alternativas internas descartadas con su motivo. Para bucket privado evaluar URLs firmadas frente a proxy, costo total incluyendo servicio, egress y CDN, y persistencia de versiones anteriores mediante claves inmutables aunque no exista versionado nativo. Medir localmente el peso WebP por familia; de ahí salen los presupuestos en MB de binario iOS/Android y del conjunto descargable, con método reproducible, regla esencial/descargable, URLs versionadas por clave inmutable derivada del hash, publicación del SHA-256 y modo de acceso. Preparar en scripts/assets/ un prototipo descartable que sirva por HTTP local un derivado real y verifique su SHA-256, sin credenciales, sin crear recursos en Railway y sin caché productiva; dejar constancia de que no representa latencia remota. La medición remota desde Railway es evidencia obligatoria: obtenerla cuando haya entorno autorizado y, si no lo hay, registrar el bloqueo pendiente con la evidencia faltante, sin pedir candidatos ni credenciales para comenzar la comparación documental y sin inventar resultados. Publicar la DEC en docs/product/decisiones/ y actualizar doc 47 §5, doc 42 §4.4 y HU-02-02/09/15.
Contrato: rollback: Descartar el prototipo si se revierte el cambio técnico y comprobar que el build no depende de él; conservar DEC, tabla de mediciones, bloqueos registrados y evidencia. Si cambia la modalidad elegida, actualizar primero los consumidores como exige HU-02-01.. Status: done

#### S1.T3 — Crear tests/test_assets_origin.py con pruebas acotadas del prototipo de origen y su evidencia: derivado real íntegro aceptado por SHA-256, mismo archivo con un byte alterado rechazado, y ausencia de dependencia del build respecto del prototipo. Comprobar además que la DEC registra Railway como proveedor único con una modalidad elegida y sus alternativas internas descartadas, que la medición remota desde Railway figura como evidencia obtenida o como bloqueo pendiente explícito (nunca como valor fabricado) y que QA-02-01-01 queda registrada como revisión real de Producto y no como aserción textual. Usar temporales de prueba sin tocar maestros ni registros vivos y sin credenciales ni llamadas a Railway.
Contrato: rollback: Revertir únicamente el archivo de pruebas nuevo y sus temporales; conservar DEC, mediciones y bloqueos ya registrados.. Status: done

#### S2.T1 — Entregar HU-02-02 como unidad de esquema, manifiesto y validador consumiendo exclusivamente la DEC real de la sesión anterior. El padre no se ejecuta directamente.
Contrato: rollback: Revertir conjuntamente esquema, manifiesto y validador; restaurar la versión previa conservando maestros y registros, y comprobar ausencia de referencias al esquema retirado.. Status: done

#### S2.T1.1 — Definir o evolucionar el JSON Schema y el validador bajo scripts/assets/, tras comprobar qué existe hoy en scripts/. Incluir campos obligatorios (identidad, familia, maestro, estado, fuente o autoría con enlace al registro de creación, destino, medidas, tema, plataforma, modo y alt), ids únicos, inspección de medidas reales, cobertura de PNG y lista explícita de no productivos; rechazar dark en V1. La validación de fuente/autoría comprueba presencia y que el enlace al registro de creación resuelva: no evalúa tipo de licencia ni ninguna política normativa desconocida. Actualizar docs/content/SCHEMA.md solo en lo correspondiente al contrato de assets.
Contrato: rollback: Restaurar esquema, validador y documentación previos como parte del rollback unitario del inventario; conservar todos los archivos fuente.. Status: done

#### S2.T1.2 — Implementar en scripts/assets/ la validación de aprobado, provisional, por-corregir, por-optimizar y faltante conforme a DEC-230: aprobado exige registros reales de Diseño Y de Contenido más derivados registrados; aprobado sin derivados se indica como por-optimizar; faltante se acepta sin archivo solo con destino y medidas objetivo. No crear aprobaciones ni degradar estados o aprobaciones reales preexistentes. El validador no exige política de licencia ni autoría normativa (pendiente externo del propietario, excluido por la fuente): ese pendiente bloquea promociones NUEVAS a aprobado y no impide construir ni validar el inventario.
Contrato: rollback: Restaurar la lógica previa junto al esquema compatible, sin borrar ni modificar los registros reales de aprobación.. Status: done

#### S2.T1.3 — Migrar app/assets/manifest.json comparándolo con su versión integrada: conservar exactamente los 64 ids y alt, inventariar maestros productivos de arcanos/zodiaco/identidad, registrar originales no productivos y aplicar la política de modo de HU-02-01. Completar fuente o autoría y enlace al registro de creación donde exista y dejar explícito el pendiente donde no, sin bloquear la construcción del inventario. Clasificar permanencia como provisional y los fondos de 940/941 × 1672 fuera de aprobado final; presentar la clasificación a Diseño y Contenido sin fabricar aprobaciones.
Contrato: rollback: Restaurar manifiesto y clasificación anteriores junto al esquema/validador compatible, conservando maestros, procedencia y aprobaciones.. Status: done

#### S2.T2 — Añadir la regresión del inventario y los estados en tests/test_assets_manifest.py. El padre se completa por su subtask.
Contrato: rollback: Revertir solo los casos nuevos, conservando fixtures anteriores y registros de evidencia.. Status: done

#### S2.T2.1 — Escribir en tests/test_assets_manifest.py casos parametrizados que ejecuten el validador real sobre copias temporales: schema/id duplicado, estado listo, maestro ausente o medidas falsas, PNG huérfano, fuente/autoría ausente o enlace de registro de creación que no resuelve, aprobado sin Diseño o sin Contenido, aprobado sin derivados, faltante sin destino/medidas y dark en V1. Comprobar que los 64 ids y alt se conservan, que permanencias y fondos quedan fuera de aprobado final, que una entrada aprobada preexistente conserva su estado con la normativa de licencia pendiente y que una promoción nueva a aprobado se rechaza por ese pendiente. Registrar trazabilidad QA-02-02-01 a QA-02-02-04.
Contrato: rollback: Retirar casos y fixtures añadidos sin modificar el inventario productivo ni los maestros.. Status: done

#### S3.T1 — Entregar HU-02-03 en scripts/assets/ sobre el manifiesto validado y los presupuestos decididos; reutilizar el conversor disponible tras confirmar su versión y contrato. El padre se completa por sus subtasks.
Contrato: rollback: Restaurar derivados, manifiesto y declaración de assets previos; conservar todos los maestros PNG y comprobar sus hashes y el --check contra la versión restaurada.. Status: done

#### S3.T1.1 — Implementar la exportación en scripts/assets/ desde los usos del manifiesto: 1x, 2.0x/ y 3.0x/, sRGB, alfa, proporción y nombres numerados como arcano-08-la-fuerza. Usar los tamaños de content/imagenes/12 y los límites de peso medidos en HU-02-01; rechazar ampliación y sobrepeso indicando id y variante. Registrar ruta, medidas, bytes y SHA-256 por derivado.
Contrato: rollback: Restaurar exportador, derivados y metadatos anteriores sin sobrescribir ni borrar maestros.. Status: done

#### S3.T1.2 — Añadir --check al exportador de scripts/assets/ y el procesamiento por familia: verificar correspondencia de maestro, configuración, salidas y metadatos; salida determinista y diagnóstico de obsolescencia por id y variante. Comparar los SHA-256 de los maestros antes y después y emitir un resumen por familia con cantidades, pesos y errores.
Contrato: rollback: Restaurar el comportamiento y las salidas anteriores del exportador; mantener maestros intactos y toda evidencia registrada.. Status: done

#### S3.T1.3 — Actualizar app/pubspec.yaml para declarar solo derivados manifestados con modo empaquetado e implementar su comprobación en scripts/assets/. Rechazar app/assets/ completo, maestros PNG, derivados desconocidos y descargables declarados como empaquetados. No generar todavía piezas finales de permanencia sin aprobación.
Contrato: rollback: Restaurar declaración de assets y comprobación previas junto al conjunto compatible de derivados y manifiesto.. Status: done

#### S3.T2 — Añadir las pruebas del pipeline y del empaquetado en tests/test_assets_pipeline.py usando muestras pequeñas y temporales; la exportación completa queda para el gate. El padre se completa por su subtask.
Contrato: rollback: Revertir los casos y temporales añadidos, conservando resultados previos y maestros.. Status: done

#### S3.T2.1 — Cubrir en tests/test_assets_pipeline.py: 1254→320/640/960, lámina 1024×1536→256×384/512×768/768×1152, 800×800 con uso 418 rechazado, peso máximo por familia, alfa, nombres numerados, hashes de maestros antes/después, determinismo de dos corridas, --check ante maestro o derivado alterado, resumen por familia y declaraciones inválidas de pubspec. Ejecutar el conversor y --check reales, no una simulación; enlazar QA-02-03-01/02 y dejar QA-02-03-03 para la revisión de Diseño.
Contrato: rollback: Retirar únicamente casos y muestras de prueba nuevos; conservar evidencia y archivos productivos.. Status: done

#### S4.T1 — Etapa vertical 1 de HU-02-07: clasificación y derivados reales de las 45 piezas y sus hojas de contacto para revisión humana. El padre se completa por sus subtasks y no implica aprobación automática.
Contrato: rollback: Revertir los commits técnicos de esta etapa restaurando derivados y entradas previas; conservar maestros, aprobaciones reales, DEC, mediciones y registros, y comprobar que las piezas retiradas resuelven al respaldo del resolvedor.. Status: done

#### S4.T1.1 — Clasificar y exportar las 45 piezas de identidad (6), Ashura (12), llegadas (12), permanencia (12) y perfiles (3) con el pipeline real de scripts/assets/. Registrar medidas, bytes y SHA-256 por derivado, cerrar por-optimizar solo para piezas exportadas con aprobaciones reales de Diseño y Contenido, y mantener permanencia sin aprobación como provisional y sin derivados finales. Verificar las rutas numéricas llegadas-avance/casa-05 y permanencia/casa-05; si falta aprobación, conservar el respaldo y dejar el caso final pendiente.
Contrato: rollback: Restaurar derivados y entradas anteriores conservando maestros y aprobaciones; verificar que las piezas retiradas resuelven al respaldo existente.. Status: done

#### S4.T1.2 — Preparar las hojas de contacto por familia en teléfono 3x y tablet 2x sobre los fondos de referencia existentes (familia Recorrido) y tramitar la revisión real de Diseño y Contenido: QA-02-03-03 (sin deformaciones, bandas ni cambios de color respecto del maestro), QA-02-07-01 (llegadas y Ashura sin deformación ni cambio de color) y QA-02-07-04 (comparación con estados-avance-permanencia-retroceso.png y doc 43 §9: ninguna pieza con marco, borde, sombra ni recuadro, integración con contain sobre papel ivory100 según DEC-235). Registrar aprobaciones o defectos tal como los emitan las personas; el agente no aprueba ni declara aprobada una revisión pendiente.
Contrato: rollback: Retirar únicamente las presentaciones técnicas nuevas si se revierte el paquete; conservar hojas revisadas, comentarios y decisiones reales. No revocar ni fabricar aprobaciones.. Status: done

#### S4.T2 — Pruebas de la etapa de clasificación y derivados en tests/test_assets_m1a.py; la regresión completa queda para el cierre canónico. El padre se completa por su subtask.
Contrato: rollback: Revertir únicamente los casos añadidos, preservando suites y registros previos.. Status: done

#### S4.T2.1 — Crear tests/test_assets_m1a.py con la clasificación de las 45 piezas por familia, derivados y metadatos registrados (medidas, bytes, SHA-256), exclusión de derivados finales para permanencia provisional, resolución de las rutas Casa 5 y rechazo de incoherencias. Enlazar los casos visuales QA-02-03-03 y QA-02-07-01/04 a los registros reales de revisión y comprobar que, sin ese registro, el caso queda pendiente y no se convierte en aprobación automática.
Contrato: rollback: Retirar los casos nuevos conservando la evidencia y las aserciones previas.. Status: done

#### S6.T1 — Crear tests/test_assets_icons.py con la verificación automatizable de los iconos B3: presencia y formato de los recursos generados desde app/assets/identidad/ (iOS a sangre completa; Android con capas de primer plano, fondo #FAF7F0 y monocroma), geometría del sol dentro de la zona segura para máscara circular y squircle, y que la evidencia de instalación real en Android e iOS (QA-02-07-03) figure como pendiente humano mientras no exista, sin convertirla en aprobación automática. Usar temporales aislados, sin tocar maestros de identidad.
Contrato: rollback: Retirar únicamente el archivo de pruebas nuevo y sus temporales; conservar recursos de iconos, evidencia y registros de revisión existentes.. Status: done

#### S6.T2 — Etapa vertical 2: producir los iconos de lanzamiento B3 desde app/assets/identidad/ conforme a DEC-151: iOS a sangre completa y Android adaptativo con capa de primer plano, fondo papel #FAF7F0 y capa monocroma. Verificar centrado del sol y zona segura en máscara circular y squircle de Android y en iOS, y preparar la instalación real en Android e iOS para la revisión humana de QA-02-07-03 (el sol no queda recortado en el lanzador). Sin evidencia de instalación real el caso queda pendiente o fallido, sin aprobación registrada por el agente. No producir icono de Google Play ni fichas de tienda.
Contrato: rollback: Restaurar recursos y configuración de iconos anteriores conservando maestros de identidad y evidencia de revisión.. Status: done

#### S7.T1 — Crear tests/test_assets_provider.py con el contrato del check ep01-assets-provider: que scripts/ci/ep01-assets-provider.mjs encadene validador, --check del pipeline y comprobación de empaquetado, identifique el SHA evaluado y publique la trazabilidad de QA-02-01/02/03/07 a pruebas o evidencias humanas; que falle ante estado inválido, PNG huérfano, derivado obsoleto o maestro empaquetado; que con cero pruebas descubiertas, un comando omitido o evidencia humana pendiente no declare la entrega completa; y que un check preparado pero no ejecutado en CI real sobre un SHA integrado no habilite el consumo por EP-01. Mantener tests/test_build_artifacts.py solo para el contrato del workflow.
Contrato: rollback: Retirar el archivo de pruebas nuevo conservando las aserciones previas de artifacts y quality-gate y toda la evidencia registrada.. Status: done

#### S7.T2 — Etapa vertical 3: comprobar que la entrega se consume por la interfaz existente de imágenes, sin lecturas directas de app/assets/manifest.json en el código de imágenes y conservando el resolvedor integrado y su token de respaldo. Adaptar el suministro para que la fuente productiva real se lea detrás de esa interfaz está permitido; la fixture de los tests sigue siendo fixture y no se exige como fuente de producción. Cualquier cambio adyacente no autorizado queda como advertencia.
Contrato: rollback: Revertir exclusivamente la adaptación del suministro, preservando la interfaz, las fixtures y el respaldo anteriores.. Status: done

#### S7.T3 — Implementar el check como scripts/ci/ep01-assets-provider.mjs y enlazarlo en .github/workflows/ci-pr.yml reutilizando jobs y toolchain existentes: ejecutar el validador y el --check del pipeline de scripts/assets/, la comprobación de empaquetado y las suites tests/test_assets_*.py, identificar el SHA evaluado y publicar artifacts con la matriz de trazabilidad QA-02-01/02/03/07 a pruebas o evidencias humanas. Ajustar solo las aserciones afectadas del contrato de quality-gate en tests/test_build_artifacts.py. Registrar los pendientes humanos y exigir CI real sobre commits integrados antes del consumo por EP-01; no cerrar historias proveedoras ni ejecutar el gate durante el intake.
Contrato: rollback: Restaurar workflow, script de CI y contrato de gate previos conservando resultados históricos y evidencias; la retirada del check no habilita el consumo.. Status: done

#### S7.T4 — Aplicar la variante documental a los archivos realmente tocados del paquete, incluidos docs/PLAN.md, el backlog de EP-02 y docs/content/SCHEMA.md cuando correspondan. Reutilizar scripts/dev/docs.mjs con DOCS_DIFF_BASE=epic/EP-01a, la base de integración pertinente del paquete, en vez de origin/main, que arrastra trabajo ajeno; corregir lint únicamente en los documentos modificados.
Contrato: rollback: Revertir solo las correcciones documentales del paquete junto con sus cambios funcionales compatibles, conservando DEC, mediciones y registros exigidos por los rollback de las fuentes.. Status: done

#### S7.T5 — Ajustar app/test/core/images/image_manifest_test.dart solo si hace falta regresión adicional del handoff, preservando sus casos de acceso por interfaz, fixture y token de respaldo, y comprobando que el manifiesto productivo se lee detrás de la interfaz. Extender tests/test_docs_linters.py con un documento heredado modificado que falle por Markdown o cspell y con la exclusión de heredados intactos, usando DOCS_DIFF_BASE=epic/EP-01a y temporales aislados.
Contrato: rollback: Restaurar ambos archivos de prueba a su versión previa y eliminar temporales; no alterar código de imágenes ni documentos canónicos para forzar un resultado.. Status: done
## Verificacion runtime

Verificación final S8 después de arte S4, iconos S6 y CI S7: DEC/modalidad Railway/costos/presupuestos y SHA del prototipo; inventario 64 ids/alt y estados45 piezas; hojas contacto QA de Diseño/Contenido teléfono3x/tablet2x; iconos instalados Android circular/squircle e iOS; CI real ep01-assets-provider sobre SHA integrado. Todos los ítems humanos permanecen pending hasta revisión real. No hay una vista propia que verificar. Sesión definida con seis ítems concretos en el registro canónico de sesiones.
## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-01 (edit) `confirmed`: Ejecutar el flujo canónico implement con SkipTeach (solo teach-intake y teach-close omitidos) repartido en varias sesiones de este mismo tic
- REQ-02 (edit) `confirmed`: Entregar la decisión de origen y presupuesto de HU-02-01 comparando candidatos concretos (Amazon S3 y Cloudflare R2) con fuentes oficiales v
- REQ-03 (edit) `confirmed`: Evolucionar el manifiesto único y su JSON Schema para registrar identidad estable, familia, maestro, estado, fuente o autoría con enlace al 
- REQ-04 (edit) `confirmed`: Aplicar los cinco estados y transiciones de DEC-230 sin fabricar aprobaciones: aprobado exige registros reales de Diseño Y de Contenido (amb
- REQ-07 (edit) `inferred`: Hacer reproducible y verificable la exportación mediante --check, sin sobrescribir maestros: salida determinista, diagnóstico por asset (id 
- REQ-13 (edit) `confirmed`: El inventario productivo se consume DETRÁS de la interfaz existente de imágenes: el código de imágenes no lee app/assets/manifest.json direc
- REQ-14 (edit) `confirmed`: Los documentos realmente modificados por HU-02-01/02/03/07 deben cumplir docs:check:changed y el lint del proyecto, incluso si figuran en .d

**Tasks agregadas:**

- S6: Crear tests/test_assets_icons.py con la verificación automatizable de los iconos B3: presencia y formato de los recursos generados desde app/assets/identidad/ (iOS a sangre completa; Android con capas de primer plano, fondo #FAF7F0 y monocroma), geometría del sol dentro de la zona segura para máscara circular y squircle, y que la evidencia de instalación real en Android e iOS (QA-02-07-03) figure como pendiente humano mientras no exista, sin convertirla en aprobación automática. Usar temporales aislados, sin tocar maestros de identidad. (valida: REQ-11, test; rollback: Retirar únicamente el archivo de pruebas nuevo y sus temporales; conservar recursos de iconos, evidencia y registros de revisión existentes.)
- S7: Crear tests/test_assets_provider.py con el contrato del check ep01-assets-provider: que scripts/ci/ep01-assets-provider.mjs encadene validador, --check del pipeline y comprobación de empaquetado, identifique el SHA evaluado y publique la trazabilidad de QA-02-01/02/03/07 a pruebas o evidencias humanas; que falle ante estado inválido, PNG huérfano, derivado obsoleto o maestro empaquetado; que con cero pruebas descubiertas, un comando omitido o evidencia humana pendiente no declare la entrega completa; y que un check preparado pero no ejecutado en CI real sobre un SHA integrado no habilite el consumo por EP-01. Mantener tests/test_build_artifacts.py solo para el contrato del workflow. (valida: REQ-12, test; rollback: Retirar el archivo de pruebas nuevo conservando las aserciones previas de artifacts y quality-gate y toda la evidencia registrada.)

**Task ops:**

- edit S1.T1 { desc="Dejar preparada la LISTA OPERATIVA del primer arranque usando los chequeos canónicos ya existentes: trabajo concurrente terminado, rama epic/EP-01a, árbol limpio, commits de EP-00 integrados (verificados, no reejecutados) y base de pruebas registrada, más la matriz de fuentes HU-02-01/02/03/07 y el registro de SkipTeach acotado a teach-intake y teach-close. NO construir un control de arranque nuevo en Kanai ni pruebas de su máquina de estados. Estas comprobaciones se ejecutan al arrancar, no durante el intake: el ticket permanece open y no se hace checkout, stash, reset, commit ni ejecución de tareas.", rollback="Si cualquier precondición falla, conservar la lista y detener el arranque; no alterar rama, árbol, datos ni registros. Corregir únicamente el registro de preparación por el flujo canónico.", validates=["REQ-01"], isTest=false, verify=["git branch --show-current","git status --porcelain=v1","git log --oneline -8 epic/EP-01a"] }
- edit S1.T2 { desc="Realizar HU-02-01 comparando candidatos concretos Amazon S3 y Cloudflare R2 con sus fuentes oficiales vigentes citadas (almacenamiento, egress, URLs inmutables, invalidación, disponibilidad y operación desde Railway) y midiendo localmente el peso WebP por familia; de ahí salen el origen elegido y los presupuestos en MB de binario iOS/Android y del conjunto descargable, con método reproducible, regla esencial/descargable, versionado inmutable de URLs, publicación del SHA-256 y modo de acceso. Preparar en scripts/assets/ un prototipo descartable que sirva por HTTP local un derivado real y verifique su SHA-256, sin asumir credenciales ni contratar infraestructura y sin caché productiva; dejar constancia de que no representa latencia remota. La medición remota desde Railway es evidencia obligatoria: obtenerla cuando haya entorno autorizado y, si no lo hay, registrar el bloqueo real con la evidencia faltante en vez de inventar un resultado o frenar la comparación documental. Publicar la DEC en docs/product/decisiones/ y actualizar doc 47 §5, doc 42 §4.4 y HU-02-02/09/15.", rollback="Descartar el prototipo si se revierte el cambio técnico y comprobar que el build no depende de él; conservar DEC, tabla de mediciones, bloqueos registrados y evidencia. Si cambia la decisión, actualizar primero los consumidores como exige HU-02-01.", validates=["REQ-02"], isTest=false, verify=["DOCS_DIFF_BASE=epic/EP-01a pnpm docs:check:changed"] }
- edit S1.T3 { desc="Crear tests/test_assets_origin.py con pruebas acotadas del prototipo de origen y su evidencia: derivado real íntegro aceptado por SHA-256, mismo archivo con un byte alterado rechazado, y ausencia de dependencia del build respecto del prototipo. Comprobar además que la medición remota desde Railway figura como evidencia obtenida o como bloqueo pendiente explícito, y que QA-02-01-01 queda registrada como revisión real de Producto y no como aserción textual. Usar temporales de prueba sin tocar maestros ni registros vivos.", rollback="Revertir únicamente el archivo de pruebas nuevo y sus temporales; conservar DEC, mediciones y bloqueos ya registrados.", validates=["REQ-01","REQ-02"], isTest=true, verify=["python3 -m unittest discover -s tests -p test_assets_origin.py"] }
- edit S2.T1.1 { desc="Definir o evolucionar el JSON Schema y el validador bajo scripts/assets/, tras comprobar qué existe hoy en scripts/. Incluir campos obligatorios (identidad, familia, maestro, estado, fuente o autoría con enlace al registro de creación, destino, medidas, tema, plataforma, modo y alt), ids únicos, inspección de medidas reales, cobertura de PNG y lista explícita de no productivos; rechazar dark en V1. La validación de fuente/autoría comprueba presencia y que el enlace al registro de creación resuelva: no evalúa tipo de licencia ni ninguna política normativa desconocida. Actualizar docs/content/SCHEMA.md solo en lo correspondiente al contrato de assets.", rollback="Restaurar esquema, validador y documentación previos como parte del rollback unitario del inventario; conservar todos los archivos fuente.", validates=["REQ-03"], isTest=false, verify=["DOCS_DIFF_BASE=epic/EP-01a pnpm docs:check:changed"] }
- edit S2.T1.2 { desc="Implementar en scripts/assets/ la validación de aprobado, provisional, por-corregir, por-optimizar y faltante conforme a DEC-230: aprobado exige registros reales de Diseño Y de Contenido más derivados registrados; aprobado sin derivados se indica como por-optimizar; faltante se acepta sin archivo solo con destino y medidas objetivo. No crear aprobaciones ni degradar estados o aprobaciones reales preexistentes. El validador no exige política de licencia ni autoría normativa (pendiente externo del propietario, excluido por la fuente): ese pendiente bloquea promociones NUEVAS a aprobado y no impide construir ni validar el inventario.", rollback="Restaurar la lógica previa junto al esquema compatible, sin borrar ni modificar los registros reales de aprobación.", validates=["REQ-04"], isTest=false, verify=["python3 -m unittest discover -s tests -p test_assets_manifest.py"] }
- edit S2.T1.3 { desc="Migrar app/assets/manifest.json comparándolo con su versión integrada: conservar exactamente los 64 ids y alt, inventariar maestros productivos de arcanos/zodiaco/identidad, registrar originales no productivos y aplicar la política de modo de HU-02-01. Completar fuente o autoría y enlace al registro de creación donde exista y dejar explícito el pendiente donde no, sin bloquear la construcción del inventario. Clasificar permanencia como provisional y los fondos de 940/941 × 1672 fuera de aprobado final; presentar la clasificación a Diseño y Contenido sin fabricar aprobaciones.", rollback="Restaurar manifiesto y clasificación anteriores junto al esquema/validador compatible, conservando maestros, procedencia y aprobaciones.", validates=["REQ-05"], isTest=false, verify=["python3 -m unittest discover -s tests -p test_assets_manifest.py"] }
- edit S2.T2 { desc="Añadir la regresión del inventario y los estados en tests/test_assets_manifest.py. El padre se completa por su subtask.", rollback="Revertir solo los casos nuevos, conservando fixtures anteriores y registros de evidencia.", validates=["REQ-03","REQ-04","REQ-05"], isTest=true, verify=["python3 -m unittest discover -s tests -p test_assets_manifest.py"] }
- edit S2.T2.1 { desc="Escribir en tests/test_assets_manifest.py casos parametrizados que ejecuten el validador real sobre copias temporales: schema/id duplicado, estado listo, maestro ausente o medidas falsas, PNG huérfano, fuente/autoría ausente o enlace de registro de creación que no resuelve, aprobado sin Diseño o sin Contenido, aprobado sin derivados, faltante sin destino/medidas y dark en V1. Comprobar que los 64 ids y alt se conservan, que permanencias y fondos quedan fuera de aprobado final, que una entrada aprobada preexistente conserva su estado con la normativa de licencia pendiente y que una promoción nueva a aprobado se rechaza por ese pendiente. Registrar trazabilidad QA-02-02-01 a QA-02-02-04.", rollback="Retirar casos y fixtures añadidos sin modificar el inventario productivo ni los maestros.", validates=["REQ-03","REQ-04","REQ-05"], isTest=true, verify=["python3 -m unittest discover -s tests -p test_assets_manifest.py"] }
- edit S3.T1 { desc="Entregar HU-02-03 en scripts/assets/ sobre el manifiesto validado y los presupuestos decididos; reutilizar el conversor disponible tras confirmar su versión y contrato. El padre se completa por sus subtasks.", rollback="Restaurar derivados, manifiesto y declaración de assets previos; conservar todos los maestros PNG y comprobar sus hashes y el --check contra la versión restaurada.", validates=["REQ-06","REQ-07","REQ-08"], isTest=false, verify=["python3 -m unittest discover -s tests -p test_assets_pipeline.py"] }
- edit S3.T1.1 { desc="Implementar la exportación en scripts/assets/ desde los usos del manifiesto: 1x, 2.0x/ y 3.0x/, sRGB, alfa, proporción y nombres numerados como arcano-08-la-fuerza. Usar los tamaños de content/imagenes/12 y los límites de peso medidos en HU-02-01; rechazar ampliación y sobrepeso indicando id y variante. Registrar ruta, medidas, bytes y SHA-256 por derivado.", rollback="Restaurar exportador, derivados y metadatos anteriores sin sobrescribir ni borrar maestros.", validates=["REQ-06"], isTest=false, verify=["python3 -m unittest discover -s tests -p test_assets_pipeline.py"] }
- edit S3.T1.2 { desc="Añadir --check al exportador de scripts/assets/ y el procesamiento por familia: verificar correspondencia de maestro, configuración, salidas y metadatos; salida determinista y diagnóstico de obsolescencia por id y variante. Comparar los SHA-256 de los maestros antes y después y emitir un resumen por familia con cantidades, pesos y errores. Sin límite de concurrencia configurado: no forma parte del contrato.", rollback="Restaurar el comportamiento y las salidas anteriores del exportador; mantener maestros intactos y toda evidencia registrada.", validates=["REQ-07"], isTest=false, verify=["python3 -m unittest discover -s tests -p test_assets_pipeline.py"] }
- edit S3.T1.3 { desc="Actualizar app/pubspec.yaml para declarar solo derivados manifestados con modo empaquetado e implementar su comprobación en scripts/assets/. Rechazar app/assets/ completo, maestros PNG, derivados desconocidos y descargables declarados como empaquetados. No generar todavía piezas finales de permanencia sin aprobación.", rollback="Restaurar declaración de assets y comprobación previas junto al conjunto compatible de derivados y manifiesto.", validates=["REQ-08"], isTest=false, verify=["python3 -m unittest discover -s tests -p test_assets_pipeline.py"] }
- edit S3.T2 { desc="Añadir las pruebas del pipeline y del empaquetado en tests/test_assets_pipeline.py usando muestras pequeñas y temporales; la exportación completa queda para el gate. El padre se completa por su subtask.", rollback="Revertir los casos y temporales añadidos, conservando resultados previos y maestros.", validates=["REQ-06","REQ-07","REQ-08"], isTest=true, verify=["python3 -m unittest discover -s tests -p test_assets_pipeline.py"] }
- edit S3.T2.1 { desc="Cubrir en tests/test_assets_pipeline.py: 1254→320/640/960, lámina 1024×1536→256×384/512×768/768×1152, 800×800 con uso 418 rechazado, peso máximo por familia, alfa, nombres numerados, hashes de maestros antes/después, determinismo de dos corridas, --check ante maestro o derivado alterado, resumen por familia y declaraciones inválidas de pubspec. Ejecutar el conversor y --check reales, no una simulación; enlazar QA-02-03-01/02 y dejar QA-02-03-03 para la revisión de Diseño.", rollback="Retirar únicamente casos y muestras de prueba nuevos; conservar evidencia y archivos productivos.", validates=["REQ-06","REQ-07","REQ-08"], isTest=true, verify=["python3 -m unittest discover -s tests -p test_assets_pipeline.py"] }
- edit S4.T1 { desc="Etapa vertical 1 de HU-02-07: clasificación y derivados reales de las 45 piezas y sus hojas de contacto para revisión humana. El padre se completa por sus subtasks y no implica aprobación automática.", rollback="Revertir los commits técnicos de esta etapa restaurando derivados y entradas previas; conservar maestros, aprobaciones reales, DEC, mediciones y registros, y comprobar que las piezas retiradas resuelven al respaldo del resolvedor.", validates=["REQ-09","REQ-10"], isTest=false, verify=["python3 -m unittest discover -s tests -p test_assets_m1a.py"] }
- edit S4.T1.1 { desc="Clasificar y exportar las 45 piezas de identidad (6), Ashura (12), llegadas (12), permanencia (12) y perfiles (3) con el pipeline real de scripts/assets/. Registrar medidas, bytes y SHA-256 por derivado, cerrar por-optimizar solo para piezas exportadas con aprobaciones reales de Diseño y Contenido, y mantener permanencia sin aprobación como provisional y sin derivados finales. Verificar las rutas numéricas llegadas-avance/casa-05 y permanencia/casa-05; si falta aprobación, conservar el respaldo y dejar el caso final pendiente.", rollback="Restaurar derivados y entradas anteriores conservando maestros y aprobaciones; verificar que las piezas retiradas resuelven al respaldo existente.", validates=["REQ-09"], isTest=false, verify=["python3 -m unittest discover -s tests -p test_assets_m1a.py"] }
- edit S4.T1.2 { desc="Preparar las hojas de contacto por familia en teléfono 3x y tablet 2x sobre los fondos de referencia existentes (familia Recorrido) y tramitar la revisión real de Diseño y Contenido: QA-02-03-03 (sin deformaciones, bandas ni cambios de color respecto del maestro), QA-02-07-01 (llegadas y Ashura sin deformación ni cambio de color) y QA-02-07-04 (comparación con estados-avance-permanencia-retroceso.png y doc 43 §9: ninguna pieza con marco, borde, sombra ni recuadro, integración con contain sobre papel ivory100 según DEC-235). Registrar aprobaciones o defectos tal como los emitan las personas; el agente no aprueba ni declara aprobada una revisión pendiente.", rollback="Retirar únicamente las presentaciones técnicas nuevas si se revierte el paquete; conservar hojas revisadas, comentarios y decisiones reales. No revocar ni fabricar aprobaciones.", validates=["REQ-10"], isTest=false, verify=[] }
- edit S4.T2 { desc="Pruebas de la etapa de clasificación y derivados en tests/test_assets_m1a.py; la regresión completa queda para el cierre canónico. El padre se completa por su subtask.", rollback="Revertir únicamente los casos añadidos, preservando suites y registros previos.", validates=["REQ-09","REQ-10"], isTest=true, verify=["python3 -m unittest discover -s tests -p test_assets_m1a.py"] }
- edit S4.T2.1 { desc="Crear tests/test_assets_m1a.py con la clasificación de las 45 piezas por familia, derivados y metadatos registrados (medidas, bytes, SHA-256), exclusión de derivados finales para permanencia provisional, resolución de las rutas Casa 5 y rechazo de incoherencias. Enlazar los casos visuales QA-02-03-03 y QA-02-07-01/04 a los registros reales de revisión y comprobar que, sin ese registro, el caso queda pendiente y no se convierte en aprobación automática.", rollback="Retirar los casos nuevos conservando la evidencia y las aserciones previas.", validates=["REQ-09","REQ-10"], isTest=true, verify=["python3 -m unittest discover -s tests -p test_assets_m1a.py"] }
- edit S4.T1.3 { desc="Etapa vertical 2: producir los iconos de lanzamiento B3 desde app/assets/identidad/ conforme a DEC-151: iOS a sangre completa y Android adaptativo con capa de primer plano, fondo papel #FAF7F0 y capa monocroma. Verificar centrado del sol y zona segura en máscara circular y squircle de Android y en iOS, y preparar la instalación real en Android e iOS para la revisión humana de QA-02-07-03 (el sol no queda recortado en el lanzador). Sin evidencia de instalación real el caso queda pendiente o fallido, sin aprobación registrada por el agente. No producir icono de Google Play ni fichas de tienda.", rollback="Restaurar recursos y configuración de iconos anteriores conservando maestros de identidad y evidencia de revisión.", validates=["REQ-11"], isTest=false, verify=["python3 -m unittest discover -s tests -p test_assets_icons.py"] }
- edit S4.T1.4 { desc="Etapa vertical 3: comprobar que la entrega se consume por la interfaz existente de imágenes, sin lecturas directas de app/assets/manifest.json en el código de imágenes y conservando el resolvedor integrado y su token de respaldo. Adaptar el suministro para que la fuente productiva real se lea detrás de esa interfaz está permitido; la fixture de los tests sigue siendo fixture y no se exige como fuente de producción. Cualquier cambio adyacente no autorizado queda como advertencia.", rollback="Revertir exclusivamente la adaptación del suministro, preservando la interfaz, las fixtures y el respaldo anteriores.", validates=["REQ-13"], isTest=false, verify=["cd app && flutter test test/core/images/image_manifest_test.dart"] }
- edit S4.T1.5 { desc="Implementar el check como scripts/ci/ep01-assets-provider.mjs y enlazarlo en .github/workflows/ci-pr.yml reutilizando jobs y toolchain existentes: ejecutar el validador y el --check del pipeline de scripts/assets/, la comprobación de empaquetado y las suites tests/test_assets_*.py, identificar el SHA evaluado y publicar artifacts con la matriz de trazabilidad QA-02-01/02/03/07 a pruebas o evidencias humanas. Ajustar solo las aserciones afectadas del contrato de quality-gate en tests/test_build_artifacts.py. Registrar los pendientes humanos y exigir CI real sobre commits integrados antes del consumo por EP-01; no cerrar historias proveedoras ni ejecutar el gate durante el intake.", rollback="Restaurar workflow, script de CI y contrato de gate previos conservando resultados históricos y evidencias; la retirada del check no habilita el consumo.", validates=["REQ-12"], isTest=false, verify=["python3 -m unittest discover -s tests -p test_assets_provider.py","python3 -m unittest discover -s tests -p test_build_artifacts.py"] }
- edit S4.T1.6 { desc="Aplicar la variante documental a los archivos realmente tocados del paquete, incluidos docs/PLAN.md, el backlog de EP-02 y docs/content/SCHEMA.md cuando correspondan. Reutilizar scripts/dev/docs.mjs con DOCS_DIFF_BASE=epic/EP-01a, la base de integración pertinente del paquete, en vez de origin/main, que arrastra trabajo ajeno; corregir lint únicamente en los documentos modificados.", rollback="Revertir solo las correcciones documentales del paquete junto con sus cambios funcionales compatibles, conservando DEC, mediciones y registros exigidos por los rollback de las fuentes.", validates=["REQ-14"], isTest=false, verify=["DOCS_DIFF_BASE=epic/EP-01a pnpm docs:check:changed"] }
- edit S4.T2.2 { desc="Ajustar app/test/core/images/image_manifest_test.dart solo si hace falta regresión adicional del handoff, preservando sus casos de acceso por interfaz, fixture y token de respaldo, y comprobando que el manifiesto productivo se lee detrás de la interfaz. Extender tests/test_docs_linters.py con un documento heredado modificado que falle por Markdown o cspell y con la exclusión de heredados intactos, usando DOCS_DIFF_BASE=epic/EP-01a y temporales aislados.", rollback="Restaurar ambos archivos de prueba a su versión previa y eliminar temporales; no alterar código de imágenes ni documentos canónicos para forzar un resultado.", validates=["REQ-13","REQ-14"], isTest=true, verify=["cd app && flutter test test/core/images/image_manifest_test.dart","python3 -m unittest discover -s tests -p test_docs_linters.py"] }
- move S4.T1.3 → S6
- move S4.T1.4 → S7
- move S4.T1.5 → S7
- move S4.T1.6 → S7
- move S4.T2.2 → S7

### Enmienda 2
**REQs:**

- REQ-02 (edit) `confirmed`: Entregar la decisión de origen y presupuesto de HU-02-01 con Railway como ÚNICO proveedor (decidido por Eduardo en la adenda 2): lo que el s
- REQ-03 (edit) `confirmed`: Evolucionar el manifiesto único y su JSON Schema para registrar identidad estable, familia, maestro, estado, procedencia (fuente externa O B
- REQ-04 (edit) `confirmed`: Aplicar los cinco estados y transiciones de DEC-230 sin fabricar aprobaciones: aprobado exige los registros reales de Diseño Y de Contenido 
- REQ-07 (edit) `inferred`: Hacer reproducible y verificable la exportación mediante --check, sin sobrescribir maestros: salida determinista, diagnóstico por asset (id 
- REQ-14 (edit) `confirmed`: Los documentos realmente modificados por HU-02-01/02/03/07 deben cumplir docs:check:changed y el lint del proyecto, incluso si figuran en .d

**Tasks agregadas:**

- S5: Verificar la DEC publicada en docs/product/decisiones/: Railway figura como proveedor único, consta la modalidad elegida (Storage Buckets o volumen persistente servido por un servicio) con las alternativas internas descartadas y su motivo, los presupuestos en MB de binario iOS/Android y del conjunto descargable con su método, las URLs por clave inmutable derivada del hash y la publicación del SHA-256. Comprobar que la medición remota desde Railway aparece como evidencia real obtenida o como bloqueo pendiente explícito, nunca como dato supuesto. (valida: REQ-02; rollback: No modificar artefactos: si la verificación falla, registrar el defecto y dejar el ítem pendiente sin alterar la DEC, las mediciones ni los bloqueos registrados.)
- S5: Verificar sobre el manifiesto entregado que las 64 entradas migradas conservan exactamente su id y su alt, que la permanencia sin aprobación estética figura provisional y que los fondos de 940/941 × 1672 no quedan como aprobado para uso final. (valida: REQ-05, REQ-03; rollback: No modificar artefactos: si la verificación falla, registrar el defecto y dejar el ítem pendiente sin tocar manifiesto, maestros ni registros.)
- S5: Verificar que las 45 piezas (identidad 6, Ashura 12, llegadas 12, permanencia 12 y perfiles 3) tienen estado, destino, modo y alt válidos, que cada pieza aprobada registra derivados 1x/2x/3x con medidas, bytes y SHA-256, que ninguna aprobada y exportada queda por-optimizar y que las rutas llegadas-avance/casa-05 y permanencia/casa-05 resuelven. (valida: REQ-09; rollback: No modificar artefactos: si la verificación falla, registrar el defecto y dejar el ítem pendiente sin alterar derivados ni clasificaciones.)
- S5: Tramitar y verificar con Diseño y Contenido las hojas de contacto en teléfono 3x y tablet 2x: QA-02-03-03 (sin deformaciones, bandas ni cambios de color), QA-02-07-01 (llegadas y Ashura sin deformación ni cambio de color) y QA-02-07-04 (comparación con estados-avance-permanencia-retroceso.png y doc 43 §9: ninguna pieza con marco, borde, sombra ni recuadro). Registrar el veredicto tal como lo emitan las personas; sin ese registro las piezas no se consumen como finales. (valida: REQ-10; rollback: No revocar ni fabricar aprobaciones: si falta el veredicto o aparece un defecto, dejar el ítem pendiente o fallido conservando hojas, comentarios y decisiones reales.)
- S5: Verificar la evidencia real de los iconos B3 instalados: QA-02-07-03 en un Android con máscara circular y la revisión equivalente en squircle y en iOS, comprobando que el sol queda centrado dentro de la zona segura y no se recorta. Sin evidencia de instalación real el ítem queda pendiente o fallido, sin aprobación registrada por el agente. (valida: REQ-11; rollback: No modificar recursos de iconos ni registros de revisión: ante defecto o evidencia ausente, dejar el ítem pendiente y reportarlo.)
- S5: Verificar que ep01-assets-provider se ejecutó en CI real sobre un SHA integrado en epic/EP-01a y que su salida identifica ese SHA y traza QA-02-01/02/03/07 a pruebas automatizadas o a evidencias humanas registradas. Un check preparado sin corrida real, o corrido sobre un SHA no integrado, no habilita el consumo por EP-01 ni cierra las historias proveedoras. (valida: REQ-12; rollback: No modificar el check ni los registros: si la corrida falta o falla, dejar el ítem pendiente con el diagnóstico observado.)

**Task ops:**

- edit S1.T2 { desc="Realizar HU-02-01 con Railway como único proveedor (adenda 2): comparar DENTRO de Railway la modalidad Storage Buckets frente a volumen persistente servido por un servicio, citando las fuentes oficiales consultadas el 2026-10-06 (https://docs.railway.com/storage-buckets, https://docs.railway.com/storage-buckets/billing, https://docs.railway.com/volumes/reference) y registrando la modalidad elegida y las alternativas internas descartadas con su motivo. Para bucket privado evaluar URLs firmadas frente a proxy, costo total incluyendo servicio, egress y CDN, y persistencia de versiones anteriores mediante claves inmutables aunque no exista versionado nativo. Medir localmente el peso WebP por familia; de ahí salen los presupuestos en MB de binario iOS/Android y del conjunto descargable, con método reproducible, regla esencial/descargable, URLs versionadas por clave inmutable derivada del hash, publicación del SHA-256 y modo de acceso. Preparar en scripts/assets/ un prototipo descartable que sirva por HTTP local un derivado real y verifique su SHA-256, sin credenciales, sin crear recursos en Railway y sin caché productiva; dejar constancia de que no representa latencia remota. La medición remota desde Railway es evidencia obligatoria: obtenerla cuando haya entorno autorizado y, si no lo hay, registrar el bloqueo pendiente con la evidencia faltante, sin pedir candidatos ni credenciales para comenzar la comparación documental y sin inventar resultados. Publicar la DEC en docs/product/decisiones/ y actualizar doc 47 §5, doc 42 §4.4 y HU-02-02/09/15.", rollback="Descartar el prototipo si se revierte el cambio técnico y comprobar que el build no depende de él; conservar DEC, tabla de mediciones, bloqueos registrados y evidencia. Si cambia la modalidad elegida, actualizar primero los consumidores como exige HU-02-01.", validates=["REQ-02"], verify=["DOCS_DIFF_BASE=epic/EP-01a pnpm docs:check:changed"] }
- edit S1.T3 { desc="Crear tests/test_assets_origin.py con pruebas acotadas del prototipo de origen y su evidencia: derivado real íntegro aceptado por SHA-256, mismo archivo con un byte alterado rechazado, y ausencia de dependencia del build respecto del prototipo. Comprobar además que la DEC registra Railway como proveedor único con una modalidad elegida y sus alternativas internas descartadas, que la medición remota desde Railway figura como evidencia obtenida o como bloqueo pendiente explícito (nunca como valor fabricado) y que QA-02-01-01 queda registrada como revisión real de Producto y no como aserción textual. Usar temporales de prueba sin tocar maestros ni registros vivos y sin credenciales ni llamadas a Railway.", rollback="Revertir únicamente el archivo de pruebas nuevo y sus temporales; conservar DEC, mediciones y bloqueos ya registrados.", validates=["REQ-01","REQ-02"], verify=["python3 -m unittest discover -s tests -p test_assets_origin.py"] }
- edit S3.T1.2 { desc="Añadir --check al exportador de scripts/assets/ y el procesamiento por familia: verificar correspondencia de maestro, configuración, salidas y metadatos; salida determinista y diagnóstico de obsolescencia por id y variante. Comparar los SHA-256 de los maestros antes y después y emitir un resumen por familia con cantidades, pesos y errores.", rollback="Restaurar el comportamiento y las salidas anteriores del exportador; mantener maestros intactos y toda evidencia registrada.", validates=["REQ-07"], verify=["python3 -m unittest discover -s tests -p test_assets_pipeline.py"] }
## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2
- [x] S1.T3

**Gate (auto)**: DEC y tabla de mediciones revisables para HU-02-01, con prototipo que acepta el derivado íntegro y rechaza un byte alterado; precondiciones de ejecución documentadas sin arranque durante el intake.

### Session 2 · T3 · continue

**Tasks:**
- [x] S2.T1
- [x] S2.T1.1
- [x] S2.T1.2
- [x] S2.T1.3
- [x] S2.T2
- [x] S2.T2.1

**Gate (auto)**: El inventario migrado valida sin errores ni PNG huérfanos, conserva los 64 ids/alt y muestra permanencia provisional; las entradas deliberadamente inválidas producen diagnósticos por id o ruta.

### Session 3 · T3 · continue

**Tasks:**
- [x] S3.T1
- [x] S3.T1.1
- [x] S3.T1.2
- [x] S3.T1.3
- [x] S3.T2
- [x] S3.T2.1

**Gate (auto)**: Una muestra real produce WebP 1x/2x/3x con medidas, perfil, alfa y hashes comprobables; --check detecta desactualización y la validación rechaza empaquetar maestros.

### Session 4 · T3 · continue

**Tasks:**
- [x] S4.T1
- [x] S4.T1.1
- [x] S4.T1.2
- [x] S4.T2
- [x] S4.T2.1

**Gate (strong)**: Clasificación verificable de 45 piezas, derivados trazados únicamente para piezas realmente aprobadas y hojas de contacto preparadas para Diseño/Contenido. Permanencia provisional conserva respaldo. Esta etapa no exige los iconos ni CI de sesiones posteriores; las revisiones humanas finales se comprueban en la sesión final.

### Session 6 · continue

**Tasks:**
- [x] S6.T1
- [x] S6.T2

**Gate (strong)**: Recursos B3 iOS y Android (capas primer plano/fondo/monocroma) generados con formatos verificables, sol centrado en zona segura y pruebas automáticas verdes. Capturas/pruebas de instalación Android circular/squircle e iOS preparadas con pendientes humanos explícitos, sin fingir aprobaciones.

### Session 7 · continue

**Tasks:**
- [x] S7.T1
- [x] S7.T2
- [x] S7.T3
- [x] S7.T4
- [x] S7.T5

**Gate (strong)**: ep01-assets-provider ejecutable encadena validador, --check, empaquetado y suites reales, identifica SHA y publica trazabilidad QA. Pruebas negativas detectan incoherencias y quality-gate integra el job. Compatible con resolvedor existente y lint de documentos del paquete en verde usando SHA base capturado al primer arranque; consumo final depende de CI real y evidencia humana en sesión final.

### Session 8 · T0 · open

**Gate (strong)**: Verificación final del proveedor completo con resultados reales automáticos/humanos. Pendientes de Producto/Diseño/Contenido o acceso remoto se reportan con motivo; no pasan por defecto ni habilitan consumo final.
## Technical

Decisiones de implementación inferidas dentro del modo autónomo; no representan aprobaciones humanas nuevas.

1. Registro de creación: referencia estructurada {path, lineStart, lineEnd} a un archivo Markdown versionado del repositorio, ruta relativa normalizada sin '..', líneas 1-based existentes. Usar los registros reales docs/content/imagenes/05_registro_de_creacion_de_imagenes.md y 10_registro_ejecucion_assets_app_2026-09-17.md, u otro registro real existente de la pieza. Validar archivo dentro del repo y rango existente; no hacer peticiones de red en CI. Una URL externa se conserva como procedencia y para validación se usa su registro local versionado auténtico. Ausencia de evidencia se informa pendiente, no se inventa una fuente.

2. Formato de aprobación en cada entrada del manifiesto: approvals como lista de objetos {role:'diseno'|'contenido', by:string no vacío, date:fecha ISO, evidence:{path,lineStart,lineEnd}}. El schema y validador comprueban estructura, roles distintos y referencia local resoluble; el contenido debe ser evidencia real de una persona con esa responsabilidad. Estos son metadatos del contrato a implementar, NO aprobaciones ya emitidas. No crear registros aprobatorios ni sustituir autoría por aprobación. Ausencia de una aprobación mantiene provisional/por-corregir según estado; maestro con ambas pero sin derivados es por-optimizar.

3. HU-02-02 Alcance dice expresamente 'maestro aprobado por Diseño y Contenido' y 'la aprobación de Diseño y de Contenido registrada en la entrada'. Por eso se exigen ambas; el criterio que falla si falta Diseño 'o' Contenido enumera dos fallos, no permite elegir un aprobador. Esta es lectura textual de fuente canónica, no nueva decisión de producto.

4. Política de licencia/autoría normativa sigue siendo seguimiento externo del propietario, fuera del scope de definir aquí. Validador solo comprueba procedencia y evidencia: la promoción productiva nueva permanece impedida por el pendiente externo sin inventar normas. Estados/aprobaciones auténticas ya existentes se conservan. Documentar el pendiente como dato de revisión, no tratar evidencia de creación como licencia.

5. Railway es el único proveedor por adenda2. Comparación interna buckets versus volumes+servicio; presupuestos/latencia/configuración final se derivan de evidencia al ejecutar. Documentación oficial debe revisarse de nuevo al ejecutar, no congelar precios.

6. Base DOCS_DIFF_BASE: capturar el SHA de epic/EP-01a al primer arranque de TAO-190 después de terminar trabajo previo, y usar ese SHA fijo en todos comandos/checks del paquete. La rama viva cambia con los commits del propio ticket y no sirve como referencia fija; en las menciones estructuradas a DOCS_DIFF_BASE=epic/EP-01a debe entenderse el SHA capturado de esa rama. Nunca origin/main ni comparar HEAD contra la misma rama viva al cierre.

7. No código ejecutado durante intake. Primer arranque requiere trabajo previo terminado, árbol limpio, base de pruebas y commits integrados; no establecer pre-gate en esta preparación.

