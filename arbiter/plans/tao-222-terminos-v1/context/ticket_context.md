# Ticket TAO-222 (GH-93) - [HU-03a-14][Content] Redaccion de los terminos de uso v1
work_type: implement · estado: en curso · modulo: EP-03a · spec: sin spec (request de GH)

## Pedido (request)

Objetivo: los terminos de uso v1 en espanol, redactados, revisados por asesoria legal, aprobados por Producto y publicados como `documento_legal` de tipo `terminos` junto con la version de la app que los incluye. Consumidor: V-51 (HU-01-13), HU-03a-10 (empaquetado y registro) y el portal (EP-16).

Incluye:
- Entregable: texto de terminos v1 en espanol (DEC-049), en Markdown en `docs/legal/` (fuente versionada de HU-03a-10, DEC-232), con numero de version, fecha de vigencia y hash.
- Responsable funcional: Contenido/legal redacta con asesoria legal; Producto da la aceptacion funcional (doc 46 §9).
- Cobertura minima derivada de las decisiones vigentes: cuenta de dispositivo y cuenta completa y que habilita cada una (DEC-212); aceptacion versionada y reaceptacion que detiene el servicio (DEC-208, DEC-225); codigos de producto de un solo uso validados en linea (DEC-213); limitacion y suspension administrativa (DEC-020, DEC-056); soporte solo con cuenta completa (DEC-216); cierre de sesion, borrado de datos y eliminacion de cuenta (DEC-054, DEC-128, DEC-224); version minima y actualizaciones (DEC-086); contenido del metodo entregado con la app (DEC-094).
- Resumen breve para la tarjeta de V-51 (smartphone) ademas del texto completo.
- Publicacion (DEC-222): el texto se empaqueta en la compilacion que lo incluye y el pipeline registra el `documento_legal`; se lee con `GET /legal/documentos` y en M4 se muestra en el portal.

No incluye: politica de privacidad (HU-03a-15); declaraciones de privacidad de tiendas y consentimiento UE (HU-17-10); traducciones (DEC-049); codigo de empaquetado y registro (HU-03a-10).

Decisiones citadas: DEC-020, DEC-049, DEC-054, DEC-056, DEC-086, DEC-094, DEC-128, DEC-208, DEC-212, DEC-213, DEC-216, DEC-222, DEC-224, DEC-225 (en docs/product/decisiones del repo).
Datos: `documento_legal` (`tipo = terminos`, `version`, `vigente_desde`, `hash_contenido`, `exige_reaceptacion`).

Criterios de aceptacion:
- Dado el borrador, cuando se revisa contra la cobertura minima, entonces cada tema listado tiene su apartado y ninguno contradice la DEC citada.
- Dado el texto, cuando lo revisa la asesoria legal, entonces queda un registro de aprobacion con fecha, version revisada y observaciones resueltas.
- Dado el texto aprobado, cuando Producto lo revisa, entonces confirma por escrito la aceptacion funcional.
- Dado el texto final, cuando se calcula su hash, entonces coincide con el empaquetado en la app y con el registrado en `documento_legal` de staging.
- Dado el texto, cuando se revisa la redaccion, entonces esta en espanol neutro, trata de tu, sin guion largo y con el resumen breve para V-51.

Requisitos transversales: el texto viaja en la app para el primer uso sin red (DEC-219); no incluye datos personales ni correos reales; estructura con titulos para lector de pantalla; una correccion posterior exige version nueva; si cambia derechos u obligaciones, se marca `exige_reaceptacion`.

Casos de prueba: QA-03a-14-01 (lectura a 200% en V-51, QA humana); QA-03a-14-02 (cambio de una palabra rompe el hash en CI); QA-03a-14-03 (cada tema de cobertura tiene su apartado).

Pendientes externos: designar la asesoria legal (sin ella el texto queda provisional y M1a no cierra); identidad legal del titular (razon social, domicilio, jurisdiccion), ningun documento del proyecto la fija.

## Adendas al request

### Adenda 1 - 2026-10-10 - dev
(1) la fecha de vigencia aun no esta fijada; el encabezado lleva un marcador provisional y el hash se recalcula cuando se fije. (2) La version 1.0 actual (docs/legal/terminos-v1.0.md) es un fixture tecnico en borrador sin aprobacion juridica; el texto definitivo la reemplaza, sin version 1.1 ni exige_reaceptacion. Supuesto a verificar: ninguna persona real acepto esa 1.0. (3) Rutas: fuente docs/legal/terminos-v1.0.md, copia app app/assets/legal/terminos-v1.0.md, copia servidor server/legal/terminos-v1.0.md; pruebas: cd app && flutter test test/legal/ y node scripts/ci/ep01-legal-provider.mjs.

## Decisiones del dev de esta corrida (NO son hallazgos)
- Sesion 2 fijo la fecha de vigencia 2026-11-01 (manda sobre el marcador provisional de la adenda 1) y recalculo el hash: 532812030967f76305b2d48c4c9c0538f8b5c5608bea773a2a9194ab5c54a9ef.
- El registro de aprobaciones vive en docs/legal/aprobaciones/terminos-v1.0.md (subcarpeta) porque archivosDeVersion falla ante .md de la raiz de docs/legal fuera del patron.
- El aviso PROVISIONAL queda hasta que asesoria legal y Producto aprueben (los criterios de aprobacion legal y de Producto quedan pendientes externos, no se juzgan como incumplidos del codigo).
- El frontmatter conserva exige_reaceptacion true y no lleva hash; el hash vive solo en el registro de aprobaciones.
- El texto pendiente externo (razon social, domicilio, jurisdiccion, causas de suspension, retencion, titularidad del contenido) va como marcadores entre corchetes.
- Limitacion conocida: el runner del servidor no detecta deriva entre docs/legal y server/legal (solo cmp la detecta).

## Alcance de esta corrida
ticket_scope: whole_ticket (sesion 1 commit a21dd18 + sesion 2 sin commitear).
