---
id: DOC-kb-sp13-atlas-reglas-mcp-plan
project: up1
type: doc
module: mcp
tags:
  - sp13
  - mcp
  - atlas
  - herramienta-dev
  - mcp-readiness
  - plan
  - idea
  - up1-mcp
---

# Atlas de reglas del MCP: idea, plan y decisiones abiertas

Idea de una herramienta de desarrollo que lee el código de los mods de up1 y el código de up1/mcp, compara las reglas de los dos lados y mide el estado de cada mod por dimensiones, sin depender de un LLM. Este documento guarda la idea, el plan propuesto y las decisiones abiertas. El contexto y los datos verificados están en el documento hermano "Atlas de reglas del MCP: contexto y datos verificados".

**Estado: idea con muestra navegable. No hay código implementado ni plan aprobado.** Todo lo de las fases es una propuesta para discutir.

## Problema

- Los contratos del MCP (`mods/<mod>/ai/contracts.js`) replican a mano reglas que viven en los archivos de cada mod (`objects/*.json`, `capabilities.json`, perfiles, vistas). Mientras no exista una comprobación automática, la sincronización depende de que alguien lo note.
- Hay evidencia de que el drift ocurre. El contrato de Elric declaraba `code` como único y la transición Active a Draft sin capability. Alguien lo corrigió leyendo archivos a mano al portarlo a up1/mcp, y el propio comentario de `mods/curriculum-design/ai/contracts.js` lo documenta.
- El estado de cada mod frente al MCP se midió en sp11 con cuatro pasadas manuales de auditoría. Esa matriz quedó desactualizada: curriculum-mapping figuraba en 27% y el código de hoy dice otra cosa (ver documento hermano).
- Hoy, para saber cómo está un mod, el dev depende de lo que un LLM le diga al leer los archivos. Eso no es repetible ni sirve de puerta en CI.

## Idea

Un comando de solo lectura, llamado "atlas de reglas", que:
1. Extrae las reglas de la plataforma (objetos, record types, capabilities, perfiles, vistas, esquema GraphQL) y las del MCP (contratos y tools) a un modelo común.
2. Compara en las dos direcciones:
   - **Fidelidad (MCP hacia mod):** lo que el MCP afirma, ¿es cierto en el mod? Una diferencia es un error de sincronización.
   - **Cobertura (mod hacia MCP):** lo que el mod tiene, ¿qué parte expone el MCP? Una diferencia es un hueco, que puede ser intencional hasta que alguien lo decida.
3. Calcula un tablero por mod con dimensiones, porcentaje, fórmula, fuente y confianza, y lo publica como informe HTML, resumen en consola y JSON.
4. Compara cada corrida con la anterior (hallazgos nuevos, resueltos o persistentes) usando identificadores estables.

El mod es la fuente de verdad. El MCP es un consumidor que lo refleja.

## Por qué antes que preguntarle a un LLM

- Es repetible y revisa todo en cada corrida. No se salta partes por contexto limitado.
- Cada hallazgo apunta a un archivo y un campo, y puede fallar un PR de forma objetiva.
- Distingue lo nuevo de lo que ya estaba, porque los hallazgos tienen identificador estable.
- Cuesta segundos y ningún token.
- No reemplaza el juicio: no sabe si una descripción está bien escrita ni si una ausencia es intencional. El orden propuesto es que el atlas detecte y un dev o un LLM interprete y proponga el arreglo, con el atlas confirmando después que el hallazgo desapareció.

## Dimensiones

Parte de las 5 dimensiones de "MCP-ready" de sp11, con sus pesos como valor inicial editable, y agrega dos nuevas:

| Dimensión | Peso inicial | Origen del dato |
|---|---|---|
| Escritura segura | 20 | mixto: bloqueo declarado (código) y reglas en el servidor (inventario) |
| Escritura completa | 25 | semiautomático: mutations del esquema contra tools, más equivalencias declaradas |
| Integridad | 20 | declarado: reglas que viven solo en el cliente, con referencia archivo:línea |
| Lectura | 20 | semiautomático: queries del esquema contra tools, más lecturas esperadas declaradas |
| Guía | 15 | automático: objetos con contrato / objetos propios |
| Fidelidad (nueva) | 0 | automático: comprobaciones sin diferencia / evaluadas |
| Acceso (nueva) | 0 | automático: tools de escritura con capability / tools de escritura |

Principios de medición:
- Cada valor se etiqueta como medido, declarado o sin dato. No se inventa un número cuando falta información.
- Un total por mod solo se muestra si hay datos de al menos tres dimensiones con peso.
- Lo que el código no puede contar (lecturas que no existen, equivalencias entre mutations, qué queries son de la pantalla) vive en un inventario declarado por mod.

## Dónde vive

Decisión tomada con el dev: dentro del repositorio de up1/mcp, pero como **proyecto aparte** y fuera del código fuente del servidor.

Propuesta concreta: carpeta `mcp/atlas/` con su propio `package.json`, JavaScript ESM sin dependencias, fuera de `src/`. Lee `../mods/*` por ruta, igual que `scripts/sync-mods.js` resuelve la raíz del monorepo. Lee el origen (`mods/<mod>/ai/`), no la copia generada de `src/mods/`.

Condiciones a resolver:
- El `Dockerfile` copia toda la carpeta `mcp/` al runtime y no hay `.dockerignore`. `atlas/` hay que excluirlo de la imagen (`Dockerfile.dockerignore` junto al Dockerfile o una línea `RUN rm`). Toca el empaquetado de producción: lo debe revisar el equipo.
- `npm test` es una cadena fija de archivos. Las pruebas del atlas no corren solas; hay que agregarlas al CI si se quiere cobertura.
- up1 ignora la carpeta `mcp/` (es un repositorio propio, Bitbucket `uplanner/mcp`, rama `develop`). Lo que se confirme va a ese repositorio.
- El CI necesita un checkout del monorepo `up1` con los mods clonados.
- Alternativas descartadas: dentro de up1 (acopla up1 a un consumidor que no controla), proyecto externo con repositorio propio (tercer repositorio y mucha estructura para algo que aún no demostró valor), híbrido con catálogos JSON por lado (válido si se suma otro consumidor; el diseño en módulos lo permite sin reescribir).

## Diseño en módulos

Tres módulos unidos por un formato JSON común, para poder moverlos después:
1. Extractor de plataforma: objetos, record types, capabilities, perfiles, vistas, esquema GraphQL.
2. Extractor del MCP: contratos y tools, importados directamente (son módulos ESM, no hace falta compilar).
3. Comparador: cruza los dos catálogos, aplica excepciones y calcula dimensiones.

Para leer el esquema GraphQL se usa el parser de GraphQL que ya usa `up1/mcp` (`graphql` ^16). La primera prueba con expresiones regulares dio ruido (fragmentos de descripciones tomados como operaciones).

## No repetir lo que ya existe

El sync de up1/mcp ya corre `scripts/validate-fichas.js` (forma de las fichas) y `scripts/validate-governed-objects.js` (que los objetos de un mod estén cubiertos por el bloqueo de escritura genérica). El atlas cubre lo que ninguno mira: contenido de las reglas, capabilities, vistas, documentación de campos y dimensiones. Puede leer el resultado de esos dos chequeos como entrada, no repetirlos.

## Comprobaciones previstas

Resultado de la corrida de prueba entre paréntesis (detalle en el documento hermano):
- R01 obligatorios al crear contra `required` y `not_null` sin valor por defecto, omitido si el alta genérica está bloqueada (iguales).
- R02 unicidad del contrato contra `uniqueConstraints` (iguales).
- R03 campos descritos contra propiedades, incluidas las del record type (diferencias bajas).
- R04 columnas de la vista de lista contra campos descritos (diferencias bajas).
- R05 capabilities que exigen las tools existen, declaradas o implícitas de objeto o de campo (informativa).
- R06 capabilities que exigen las tools las concede algún perfil del repositorio (informativa).
- R07 tools de escritura sin capability (4 de 27, severidad media).
- R08 tools nombradas en las guías de los contratos existen (iguales).
- R09 caminos de estado nombrados en el texto contra las transiciones del objeto, heurística sobre prosa (diferencia baja).
- R10 cobertura de contratos contra objetos propios (informativa).

## Estado por corrida

- Cada hallazgo con identificador estable, por ejemplo `R07:as_run_scenario` o `R03:Activity.externalId`.
- Cada corrida guarda un JSON. El informe marca nuevo, resuelto o persistente y, con el historial, la tendencia por mod.
- Un archivo de excepciones por mod acepta diferencias a propósito, con motivo y responsable. Queda versionado.
- Nivel inicial recomendado: local, con los JSON en una carpeta ignorada por git. Después, corrida nocturna y por cambio de un mod en CI con el informe publicado.

## Fases propuestas

Esfuerzo sin estimar. Calibrar con el proyecto antes de comprometerlo.

- **F0, decisiones previas:** resolver las decisiones abiertas de más abajo. Salida: respuestas registradas.
- **F1, núcleo:** estructura `mcp/atlas/`, extractores, modelo común, comparador, reglas R01 a R04 y R07, resumen en consola y JSON, código de salida con umbral, excepciones. Pruebas con Node y `assert` en el estilo del repositorio. Validación: corre sobre los 3 mods reales sin falsos positivos conocidos y reproduce los números de la corrida de prueba.
- **F2, informe y estado:** informe HTML por mod y portada, identificadores estables, diff contra la corrida anterior, historial local. Validación: dos corridas consecutivas con un cambio entre medio muestran el hallazgo como nuevo o resuelto.
- **F3, dimensiones de sp11:** Guía, Lectura, Escritura completa y Escritura segura leyendo el esquema con el parser de GraphQL, más el inventario declarado por mod (`mod-readiness` o nombre a decidir) con equivalencias y lecturas esperadas. Validación: Guía de cd y de cm coinciden con sp11 (1 de 13 y 3 de 10); el resto se contrasta con la matriz y se documentan las diferencias de instrumento.
- **F4, integridad declarada:** registro de reglas solo-cliente por mod con ancla archivo:línea y verificación de que el ancla siga existiendo. La matriz de sp11 se migra al inventario.
- **F5, CI y publicación (opcional):** corrida nocturna y por PR, informe publicado, aviso de hallazgos nuevos que introduce un PR. Depende de la infraestructura de CI de los repositorios, que no se revisó.

Antes de F1: excluir `atlas/` de la imagen Docker y acordar con el equipo de up1/mcp que la carpeta puede vivir ahí.

## Riesgos

- **Falsos positivos al calibrar.** La primera corrida de prueba dio falsos positivos de cinco tipos (capabilities implícitas de objeto, nombres con prefijo `mod/`, campos propios del record type, `recordType` en altas bloqueadas, tool registrada a mano). Cada uno pasa a ser una convención del extractor. Es el costo real de la herramienta.
- **Mezcla de instrumento y avance.** Las fórmulas del atlas no son idénticas al criterio manual de sp11. Un cambio frente a sp11 mezcla avance real y cambio de medición. No usar los totales como compromiso sin alinear antes.
- **Valores declarados desactualizados.** Lo declarado hereda lo que sp11 dijo el 14 de septiembre y no se verificó desde entonces.
- **Tools registradas a mano** (por ejemplo `as_set_rule_value`) solo se reconocen por nombre; su capability y su contenido no se leen.
- **Empaquetado.** Si `atlas/` entra en la imagen Docker por no excluirlo, llega a producción.
- **Dependencia entre repositorios.** Los mods y `mcp` son repositorios distintos; si cambia la estructura de archivos de los mods, el extractor se rompe.

## Decisiones abiertas

1. **Dónde vive el inventario declarado** por mod. Recomendación: el repositorio del mod, para que su equipo lo mantenga. Alternativas: el repositorio `mcp` (centralizado) o el KB.
2. **Pesos de Fidelidad y Acceso.** Parten en 0 para no alterar la comparación con sp11. Acordarlos con el PO si se consideran parte de "MCP-ready".
3. **Qué severidad bloquea.** Umbral inicial propuesto: media. A confirmar.
4. **Dónde se guarda el estado y se publica el informe.** Local al inicio; después JSON versionado, artefactos de CI o un sitio estático.
5. **Clasificación de queries y mutations de dominio** por mod, necesaria para que Lectura y Escritura completa puntúen en academic-scheduling (30 queries y 23 mutations sin clasificar).
6. **Relación con `validate-governed-objects`**: leer su resultado o reimplementar la parte común.
7. **Quién es dueño del atlas** y quién acepta cambios en el empaquetado de up1/mcp.

## Documentos relacionados

- Contexto y datos verificados de este atlas, en esta misma carpeta.
- Muestra navegable (HTML) del tablero, en esta misma carpeta.
- sp11: "Matriz MCP-readiness cm y cd: estado, dependencias, decisiones, esfuerzo y % de avance" y "Analisis cd para el MCP: paridad 1:1, postura blockGeneric y gaps client-side".
- sp10: "curriculum-design: huecos del CRUD generico a cerrar y como".
