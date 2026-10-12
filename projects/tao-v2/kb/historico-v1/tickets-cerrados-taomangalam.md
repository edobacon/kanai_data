---
id: DOC-kb-historico-v1-tickets-cerrados-taomangalam
project: tao-v2
type: doc
tags:
  - historico
  - taomangalam
  - referencia
  - cerrados
---

# Histórico de tickets cerrados de taomangalam (TAO-)

Índice de consulta de los 65 tickets cerrados del proyecto `taomangalam` (prefijo `TAO-`), generado el 2026-10-12. El proyecto `taomangalam` sigue vivo como respaldo y se lee en vivo con `projectId=taomangalam` (por ejemplo `get_ticket` con `TAO-249`) para ver spec, sesiones, decisiones y commits completos.

Reglas de lectura:
- Solo están los tickets cerrados. Los descartados, sin empezar, bloqueados y lo proyectado quedan fuera a propósito.
- Las referencias `GH-n` son issues del repo `edobacon/taomangalam`, no de `tao-v2`.
- Los commits citados existen en el historial de `main` de este repo (`tao-v2` se duplicó desde `main` de taomangalam en 1e828ca).

| Ticket | Ref | Título | Cierre | Commits |
|---|---|---|---|---|
| TAO-008 | GH-2 | [HU-00-01] Estructura del monorepo con workspace `pnpm`, `CODEOWNERS`, plantillas de issue y PR y archivos base de colaboración | 2026-09-27 | 3 |
| TAO-091 | GH-4 | [HU-00-02] Esqueleto Flutter con sabores aislados, configuración tipada por entorno, capas Atomic Design, Riverpod y analyzer estricto | 2026-09-27 | 4 |
| TAO-092 | GH-5 | [HU-00-04] Esqueleto Express + TypeScript autónomo en `server/` con capas, `zod`, `pino`, health y errores `problem+json` | 2026-09-27 | 2 |
| TAO-153 | GH-6 | [HU-00-05] PostgreSQL 18 local en Docker con Mailpit, cuatro roles de conexión y perfiles opcionales de fallo | 2026-09-27 | 3 |
| TAO-154 | GH-10 | [HU-00-03][Spike] Prueba vertical del baseline: compilar iOS Simulator y Android con todos los plugins nativos juntos | 2026-09-27 | 3 |
| TAO-155 | GH-9 | [HU-00-06] Prisma 7 con migración desde cero por el rol migrador, seeds nombrados idempotentes y reinicio local protegido | 2026-09-27 | 4 |
| TAO-156 | GH-7 | [HU-00-08] Contrato como fuente única: Spectral, openapi-diff, tipos TS, cliente Dart generado y validación de peticiones | 2026-09-28 | 4 |
| TAO-157 | GH-8 | [TASK-EP-00-DEC-236] Convenciones y fuentes para las sondas de intake de DEC-236 | 2026-09-28 | 5 |
| TAO-158 | GH-11 | [HU-00-09] Workflow de PR con jobs paralelos, PostgreSQL de servicio, cobertura publicada y `quality-gate` obligatorio | 2026-09-28 | 1 |
| TAO-159 | GH-12 | [HU-00-07] Cola `pg-boss` en schema propio con trabajo de ejemplo idempotente, reintentos y entrypoint de worker separable | 2026-09-28 | 1 |
| TAO-160 | GH-13 | [HU-00-13] Comandos únicos desde la raíz, configuración de editor versionada, `.env.example` y acceso móvil al backend local | 2026-09-29 | 4 |
| TAO-161 | GH-14 | [HU-00-17] Script operativo que escribe una nueva versión de configuración con autor, motivo y fecha sin borrar el historial | 2026-09-29 | 2 |
| TAO-162 | GH-15 | [HU-00-12] Widgetbook como app separada con fixtures compartidas y catálogo estático publicado por PR | 2026-09-29 | 3 |
| TAO-163 | GH-16 | [HU-00-14] Despliegue Railway aislado desde `server/` con `railway.toml`, staging por workflow manual, migración previa y smoke | 2026-09-30 | 3 |
| TAO-164 | GH-17 | [HU-00-11] Build instalable de prueba por PR (APK `development` y Simulator iOS selectivo) y paquete `qa:bundle` | 2026-09-30 | 2 |
| TAO-165 | GH-18 | [HU-00-16] Documentación como código validada en CI: MkDocs, markdownlint, Vale, cspell, Lychee y render del contrato | 2026-09-30 | 3 |
| TAO-166 | GH-19 | [HU-00-10] Workflows de `main`, `nightly`, CodeQL y Dependabot con Actions fijadas por SHA y permisos mínimos | 2026-09-30 | 2 |
| TAO-167 | GH-20 | [HU-00-19] Dev Container opcional para servidor y contrato, y panel interno de desarrollo solo en `development` | 2026-09-30 | 3 |
| TAO-168 | GH-21 | [HU-00-15] Fastlane base con lanes de build sin firma para PR y estructura de lanes internas sin credenciales | 2026-09-30 | 3 |
| TAO-169 | GH-22 | [HU-00-18] Documentación como código completa: frontmatter con Ajv, Mermaid a SVG, `dart doc`, TypeDoc y detección de huérfanos | 2026-10-01 | 4 |
| TAO-170 | GH-48 | [HU-01-01] Tema claro forzado generado desde los tokens, con tokens semánticos y barras del sistema en contraste claro | 2026-10-01 | 3 |
| TAO-171 | GH-49 | [HU-01-06] Infraestructura de i18n por claves con ARB en la app, catálogo `i18next` en el servidor y lint de textos fijos | 2026-10-01 | 5 |
| TAO-172 | GH-50 | [HU-01-07] Tokens de movimiento y servicio de reducción de movimiento | 2026-10-02 | 3 |
| TAO-173 | GH-51 | [HU-01-02] Resolvedor de imágenes por familia, tamaño, orientación y tema con superficie de respaldo | 2026-10-02 | 2 |
| TAO-174 | GH-52 | [HU-01-03] Átomos del sistema de diseño: tipografía, botones en cinco variantes, íconos y campos | 2026-10-02 | 3 |
| TAO-175 | GH-53 | [HU-01-04] Moléculas del sistema de diseño: tarjetas, filas navegables, formularios con error accionable, chips y etiquetas | 2026-10-02 | 3 |
| TAO-176 | GH-54 | [HU-01-05] Overlays y feedback: diálogo, hoja inferior, pantalla completa, banner, snackbar, estado vacío y skeleton | 2026-10-02 | 3 |
| TAO-177 | GH-55 | [HU-01-08] Menú desde el encabezado y navegación a los destinos principales en smartphone y tablet | 2026-10-03 | 3 |
| TAO-178 | GH-56 | [HU-01-10] Plantillas de pantalla responsive: lista y detalle, formulario por etapas y tablero con panel lateral | 2026-10-03 | 2 |
| TAO-179 | GH-57 | [HU-01-09] Rutas con enlaces profundos, retorno conservado y transiciones de navegación | 2026-10-02 | 0 |
| TAO-180 | GH-58 | [HU-01-15] Auditoría y pruebas automáticas de accesibilidad: semántica, contraste AA, escalado de texto, foco y objetivos táctiles | 2026-10-03 | 2 |
| TAO-181 | GH-59 | [HU-01-17] Ajustes: reducir movimiento, contraste aumentado y legibilidad, con vista previa y persistencia en el dispositivo | 2026-10-05 | 4 |
| TAO-182 | GH-60 | [HU-01-16] Verificación responsive con goldens de componentes, shell y plantillas en teléfono y tablet | 2026-10-05 | 3 |
| TAO-183 | GH-61 | [HU-01-12] Apertura de la app con la identidad de Tao Mangalam sin esperas artificiales | 2026-10-08 | 7 |
| TAO-184 | GH-62 | [HU-01-18] Aviso no cerrable cuando la versión de la app ya no está admitida | 2026-10-08 | 2 |
| TAO-185 | GH-63 | [HU-01-13] Aceptación de términos y privacidad en el primer uso o ante una versión nueva | 2026-10-08 | 3 |
| TAO-186 | GH-64 | [HU-01-11] Menú y rutas solo con las funciones que la cuenta puede usar, también sin conexión | 2026-10-06 | 3 |
| TAO-187 | GH-65 | [HU-01-19] Aviso posponible de versión recomendada más nueva | 2026-10-09 | 4 |
| TAO-188 | GH-66 | [HU-01-14] Revisión de documentos aceptados y cambio del consentimiento de analítica | 2026-10-09 | 6 |
| TAO-189 | sin GH | Preparación de consentimiento para V-51: política regional y persistencia sin UI | 2026-10-06 | 2 |
| TAO-190 | sin GH | Preparación de EP-01: inventario, pipeline y derivados de arte M1a | 2026-10-07 | 9 |
| TAO-191 | sin GH | Preparación de EP-01: versión mínima, recomendada y configuración pública | 2026-10-05 | 5 |
| TAO-192 | sin GH | Preparación de EP-01: identidad, autorización, manifiesto y contratos legales | 2026-10-06 | 4 |
| TAO-193 | sin GH | Preparación M2 de EP-01: cuenta y antecedentes de registro y acceso | 2026-10-08 | 15 |
| TAO-194 | sin GH | Mailjet en staging y prueba de entrega real con SPF, DKIM y DMARC | 2026-10-10 | 0 |
| TAO-198 | GH-71 | [HU-02-04] Pipeline de catálogos versionados desde `docs/content/` con verificación en CI y carga de solo lectura en la app | 2026-10-09 | 8 |
| TAO-199 | GH-72 | [HU-02-05] Catálogo de las doce casas con contenido Estándar y Avanzado y arcanos | 2026-10-09 | 4 |
| TAO-202 | GH-75 | [HU-02-17] Catálogo del ritual de consulta y de los materiales de Preparar sesión | 2026-10-10 | 8 |
| TAO-203 | GH-76 | [HU-02-06] Catálogo de signos y personalidades con rasgos y procedimiento del cálculo | 2026-10-10 | 3 |
| TAO-204 | GH-77 | [HU-02-09] Descarga bajo demanda y caché local de assets no esenciales con verificación por hash | 2026-10-09 | 10 |
| TAO-206 | GH-79 | [HU-02-11] Catálogo de los 22 arcanos y esquema de los catálogos editoriales de Acerca de e Instructivo | 2026-10-10 | 3 |
| TAO-207 | GH-80 | [HU-02-10] Catálogo de anillos, procedimientos de práctica y reparación, minerales y materiales | 2026-10-10 | 6 |
| TAO-211 | GH-84 | [HU-02-15] Tope de caché por tipo de dispositivo con reserva mínima y LRU que nunca borra assets esenciales | 2026-10-10 | 3 |
| TAO-212 | GH-85 | [HU-02-16] Derivado de referencia del contenido en `server/` con verificación de vigencia en CI | 2026-10-10 | 3 |
| TAO-213 | GH-69 | [HU-02-01][Seguimiento] Evidencia de DEC-240: latencia remota desde Railway y comparación del origen de assets | 2026-10-09 | 3 |
| TAO-222 | GH-93 | [HU-03a-14] Redacción de los términos de uso v1 | 2026-10-11 | 3 |
| TAO-223 | GH-94 | [HU-03a-15] Redacción de la política de privacidad v1 | 2026-10-11 | 3 |
| TAO-239 | GH-98 | [HU-03a-08] La app conoce las vistas y acciones habilitadas y las respeta sin conexión | 2026-10-11 | 4 |
| TAO-244 | GH-90 | [HU-03a-02, HU-03a-07] Sesión con vigencias configurables y autorización por capacidad con denegación por defecto | 2026-10-11 | 3 |
| TAO-249 | GH-148 | [HU-06-01, HU-06-02] Base Drift local con migración del plan sin tirada y capa de repositorios con transacciones | 2026-10-11 | 3 |
| TAO-250 | GH-150 | [HU-06-05] Generación del plan de energización para avance y permanencia desde el contenido compilado | 2026-10-11 | 4 |
| TAO-251 | GH-151 | [HU-06-03, HU-06-15] Ciclo de vida de la consulta: inicio en Casa 1, descarte, propósito inmutable y cierre en Casa 12 | 2026-10-11 | 3 |
| TAO-252 | GH-153 | [HU-06-14, HU-06-04] Retroceso con anillo y fuerza del kipot, y registro de una tirada de tres dados | 2026-10-11 | 3 |
| TAO-253 | GH-156 | [HU-06-08, HU-06-07] Proyecciones reactivas de consulta y corrección de la última tirada por supersede | 2026-10-11 | 5 |
| TAO-254 | GH-152 | [HU-06-06] Conteo de días continuados con fecha local y detección de día omitido | 2026-10-11 | 3 |
