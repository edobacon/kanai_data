# Contexto del ticket TAO-206 (GH-79), lo pedido y lo decidido

Alcance (ticket_scope): whole_ticket. Repo: /Users/edobacon/Workspace/taomangalam. Base 203384c, head 4aca1a0.

## Pedido
Catalogo versionado de los 22 arcanos (ids 0..21, content_key estable, alias 22 solo El Loco, palabra magica con sourceRefs, casa(s), invitacion tm-src-tablero#p0128, id de lamina en app/assets/manifest.json). 8 = La Fuerza, 11 = La Justicia. Sin campo de interpretacion (el esquema lo rechaza). Coherencia con docs/content/catalogos/casas.v1.json (nombre y palabra magica). Esquema editorial comun para Acerca de e Instructivo (apartados con content_key, texto y fuente; referencias por content_key a procedimientos de otros catalogos, a terminos del glosario y a laminas del manifiesto). Validador que falla ante referencias rotas nombrando el apartado. catalogVersion como content_version, copia a app/assets/catalogos/ y cargador Dart.

Criterios: 22 arcanos ids 0..21; El Loco numero 0 alias 22 Casa 12; arcanos 8 y 11 con sus palabras; cada arcano en exactamente una casa y la Casa 2 tiene 2 y 12; nombre y palabra magica coinciden con casas; esquema rechaza campo de interpretacion; id de lamina existe en manifiesto; validador falla nombrando el apartado ante content_key, termino o ilustracion inexistente; cargador Dart entrega arcanos ordenados por numero con content_key y content_version. Un cambio de texto sin subir catalogVersion debe hacer fallar --check (hash del contenido).

## Decidido (adendas)
- Glosario real: glosario.v1.json con 16 terminos desde docs/content/10_registro_cierre_y_glosario.md; no se inventan explicacion ampliada, sinonimos, relacionados ni contextos (se omiten, no null).
- Acerca de: 8 bloques intro-* desde docs/content/fuentes/01_que_es_tao_mangalam.md, marca provisional.
- Instructivo: 9 capitulos instructivo-cap-01..09 con titulos de HU-10-04, referencias por content_key a ritual_sesion.v1.json (y practica.v1.json si existe), solo con lo que las fuentes declaran, provisional lo no declarado.
- editorialStatus "provisional" opcional por nodo en el esquema editorial comun; aprobacion en correcciones_editoriales_<catalogo>.v1.json lista approvals {nodeKeys|"all", approvedBy, approvedAt, reference}; el catalogo no guarda nombres de personas.
- Correcciones de nombres/palabras magicas entre 01_arcanos.md y casas: docs/content/catalogos/correcciones_editoriales_arcanos.v1.json; el generador las aplica y traza; discrepancia no registrada falla nombrando el arcano.
- Validacion de casas y manifiesto vive en un solo lugar (scripts/catalog_common.py), no duplicada en el validador editorial. El validador editorial valida solo manifiesto, glosario y procedimientos (lista explicita de catalogos de procedimientos, no glob).
- Linter de docs: DOCS_DIFF_BASE=origin/main node scripts/dev/docs.mjs check. El job docs de ci-pr.yml incluye los --check de cada generador.
- Fuera de alcance: marcado de terminos (HU-10-02), derivados de laminas (HU-02-12), UI de EP-10.
- Aprobacion editorial de Contenido (marca provisional, textos redactados) queda pendiente por decision del dev (TAO-216), no es defecto.
- Entorno: Python local 3.9 (CI usa 3.12); 5 errores preexistentes de la suite en tests ajenos (zip strict, f-string).
