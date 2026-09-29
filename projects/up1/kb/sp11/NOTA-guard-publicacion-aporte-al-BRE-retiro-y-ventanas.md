---
id: DOC-kb-sp11-NOTA-guard-publicacion-aporte-al-BRE-retiro-y-ventanas
project: up1
type: doc
module: curriculum-design
tags:
  - sp11
  - curriculum-design
  - curriculum-mapping
  - UPONE-1770
  - D1
  - G-2
  - BRE
  - motor-de-reglas
  - interino
  - deuda-tecnica
  - condicion-de-retiro
  - nota
---

# Nota: guard de suma al publicar (D1), aporte al BRE, lista de retiro y ventanas del interino

> **Qué es esta nota:** el complemento operativo de la decisión `DECISION-guard-publicacion-interino-y-retiro-con-BRE` (misma carpeta sp11). La decisión explica **por qué** existe un guard interino; esta nota deja escrito **qué le aporta el caso al BRE**, **qué hay que borrar exactamente** el día que el BRE asuma la regla, **en qué orden se mergea** y **qué huecos quedan abiertos** mientras tanto.
>
> **En una frase:** el guard de D1 (derivado de UPONE-1770) es una pieza puente; todo lo que aquí figura como "interino" se borra junto, y las ventanas que deja abiertas las cierra el BRE.

## Glosario rápido

- **Guard:** una verificación que corre en el servidor antes de guardar un cambio y lo rechaza si no cumple una regla. Aquí, frena la publicación de un plan de estudios.
- **Publicar un plan:** pasar el plan del estado Aprobado al estado Vigente. Es una **transición de estado**: un cambio de estado controlado, no una edición cualquiera.
- **Tributación:** cada fila que dice "esta asignatura aporta a esta competencia en este nivel, con este peso". Vive en curriculum-mapping.
- **Grupo:** el conjunto de filas de tributación de un mismo plan, una misma competencia y un mismo nivel de desarrollo. La regla se evalúa por grupo.
- **Adopción vigente:** que el plan tenga adoptada hoy la matriz de competencias (estado Adoptada, con fecha de inicio ya cumplida y sin vencer).
- **BRE (motor de reglas del core):** el mecanismo del core, en desarrollo, que permitirá que cada módulo registre sus reglas de negocio y que el core las ejecute antes de cualquier escritura, venga de donde venga.
- **Interino / deprecable:** código que existe solo hasta que llegue la solución definitiva, y que ya está marcado para borrarse.

## Aporte al BRE: el caso que su diseño debe cubrir

Este guard es un caso real que el BRE necesita soportar para poder reemplazarlo. Si el diseño del BRE no lo contempla, esta sección es el requerimiento a entregarle.

**El tipo de caso:** un **agregado cross-table evaluado en una transición de estado**. Dicho en llano:

- **Agregado:** la regla no mira una fila sola, sino que **suma varias filas** (todas las de un grupo).
- **Cross-table:** esas filas están en **otra tabla** (la tributación de curriculum-mapping), no en el registro que se está cambiando (el plan de curriculum-design).
- **Evaluado en una transición:** la regla se dispara cuando el plan **cambia de estado** (Aprobado a Vigente), no en cualquier edición.

Las validaciones declarativas que el core ya tiene no alcanzan: solo miran los campos del propio registro y no pueden juntar filas hermanas ni leer otra tabla.

**La regla concreta, tal como la aplica hoy el interino:**

0. **Permiso primero:** antes de leer nada, el guard verifica que quien publica tenga permiso de edición (modify) sobre el plan, con el mismo chequeo y sobre el mismo tipo de objeto que usará el core al guardar (el plan base o su tipo Plan/Minor). Sin permiso responde el error estándar de autorización, sin revelar nada de la tributación y sin hacer ninguna lectura.
1. **Solo cuentan las filas que rigen:** se descartan las filas cuya competencia ya no existe y las de matrices que el plan no tiene adoptadas hoy (adopción en estado Adoptada, ya iniciada y no vencida). Una matriz Exenta, vencida o con inicio futuro no cuenta. Es la misma vigencia que usa curriculum-mapping.
2. **Exención Max:** si la matriz consolida por `Max` (toma el valor más alto en vez de promediar), sus grupos quedan **eximidos**; no se exige suma. Una matriz sin configuración explícita cuenta como promedio ponderado (`WeightedAvg`), que es el valor por defecto.
3. **Regla R-6:** solo participan las filas que **evalúan**, es decir las de tipo Evalúa (`Evaluates`) o Ambas (`Both`). Las filas que solo desarrollan (`Develops`) no cuentan.
4. **Toda fila que evalúa debe tener peso:** una fila Evalúa/Ambas sin peso cargado es un problema por sí sola, aunque el resto sume bien.
5. **Suma exacta de 100, en centésimos:** el peso se valida con la misma regla que usa curriculum-mapping al guardar (número válido entre 0 y 100 con hasta 2 decimales; por ejemplo '.5', '50.' o '33.340000000000003' son válidos) y recién después se pasa a centésimos enteros. El grupo debe sumar exactamente 10000, sin coma flotante y sin tolerancia, para que 33,33 + 33,33 + 33,33 **no** pase como 100. Un peso que curriculum-mapping rechazaría se informa como "peso no válido" (cita el valor recibido) y no entra en la suma del grupo. Si las demás filas suman 100, solo aparece ese aviso; si no, también el de suma descuadrada con la suma de las filas válidas.

## Disparador de retiro

**Cuándo:** cuando el BRE esté disponible en el core, soporte el caso de arriba y la regla quede registrada ahí **desde curriculum-mapping** (su módulo dueño), con la exención Max y R-6.

**Qué se borra (lista completa, todo en `curriculum-design`):**

| Pieza | Ruta | Qué es |
|---|---|---|
| Helper del guard | `logic/helpers/curriculumAlignmentWeights.js` | La función única de cálculo y el guard que bloquea la publicación. |
| Cargador de permisos | `logic/helpers/authCheckerLoader.js` | Resuelve el chequeo de permisos del core para el guard y la consulta; hoy no tiene otros consumidores. |
| Consulta de anticipación (resolver) | `logic/curriculum-alignment-weights.resolver.js` | La query de solo lectura `validateCurriculumAlignmentWeights`. |
| Consulta de anticipación (schema) | `logic/curriculum-alignment-weights.schema.graphql` | Su declaración de tipos. |
| Ficha MCP | `ai/tools.js`, entrada `cd_validate_curriculum_alignment_weights` | La herramienta del asistente que expone la consulta. |
| Test de la ficha MCP | `tests/unit/aiPack.curriculumAlignmentWeights.test.js` | |
| Tests del guard | `tests/unit/curriculumAlignmentWeights.test.js` | |
| Tests de la consulta | `tests/unit/curriculumAlignmentWeightsQuery.test.js` | |
| Test de integración | `tests/integration/curriculum-publish-weights-guard.test.js` | |
| Enganche 1 | `logic/curriculum-update.resolver.js`, la línea `assertCurriculumWeightsOnPublish` dentro de `updateCurriculumWithRecordType` (más su import, `resolveCoreWriteObjectType` y comentario) | Publicación desde el formulario de edición del plan. |
| Enganche 2 | `logic/polymorphicUpdate.resolver.js`, la línea `assertCurriculumWeightsOnPublish` en la rama `!RT_PATTERN` de `updateInstance` (más su import y comentario) | Publicación por la mutación genérica, incluidos los alias de tipo de plan. |
| Documentación del gate | `CLAUDE.md`, `docs/architecture/server-side-integrity.md` (I6), `docs/reference/error-codes.md`, `docs/reference/graphql-mutations.md` (#9), `docs/reference/mcp-object-contract.md` | Las entradas marcadas como INTERINO (UPONE-1770 D1). |

**Piezas interinas que no son el guard, pero se van con él:** la **consulta de anticipación** y su **ficha MCP**. Sirven para que la persona (o el asistente) sepa **antes** de intentar publicar si el plan va a ser rechazado, y devuelven exactamente los mismos problemas que el guard, porque usan la misma función de cálculo. Sin guard no tienen sentido, así que se retiran juntas.

**Después de borrar:** verifica que el bloqueo sigue firme por todas las puertas (ahora a cargo del BRE) y que el asistente MCP ya no duplica la regla.

Cada una de estas piezas lleva en su código la marca INTERINO / DEPRECABLE, y la cabecera del helper repite esta lista de retiro.

## Orden de merge

**Regla:** UPONE-1770 se mergea **antes** que este guard, o **a la par** (en el mismo tren de merges). Nunca el guard primero.

**Por qué:** el guard exige que cada grupo sume 100, pero quien permite **cargar y corregir** esos pesos de forma ordenada es UPONE-1770 (la edición de tributación en curriculum-mapping). Si el guard llega solo, un plan con pesos incompletos queda **bloqueado para publicar** y la persona no tiene todavía la herramienta para arreglarlo. Con 1770 presente, el rechazo del guard siempre tiene una salida clara.

## Ventanas conocidas del interino

Son huecos que el interino deja abiertos **a sabiendas**. No son descuidos; son el precio del puente.

1. **G-2: frena la publicación, no la escritura.** El guard solo actúa al publicar. Un peso inválido escrito por GraphQL directo o por la edición masiva del core **entra igual a la base**, y el problema recién aparece cuando alguien intenta publicar, tarde y lejos de su causa. El asistente MCP ya tiene bloqueada la escritura genérica, así que el vector real es acotado.
2. **Un plan ya Vigente puede quedar descuadrado.** Como el guard solo mira la transición de Aprobado a Vigente, si después de publicado alguien edita las tributaciones del plan, sus grupos pueden dejar de sumar 100 y nada lo impide. Esto es el criterio de aceptación pedido (validar **al publicar**), no un olvido.
3. **La edición masiva del core publica sin pasar por el guard** (hallada en la review del 2026-09-24). La edición masiva (`updateBulkInstances`, en object-manager `src/graphql/resolvers/instance.resolver.js`) llama al `updateInstance` interno del core, no a la versión que curriculum-design sobrescribe, así que no corre este guard ni ninguno de sus hermanos de esa cadena. La lista de planes deja cambiar el Estado en línea (usa esa edición masiva) y también se llega por GraphQL directo. Quien tenga permiso de publicar puede pasar un plan Aprobado a Vigente por ahí aunque los pesos no sumen 100. Mitigación posible sin tocar el core: bloquear la edición en línea del Estado en la lista de planes (cierra el camino de la app, no el de GraphQL directo).
4. **La lectura no comparte transacción con la escritura.** El guard lee el estado y los pesos antes de que el core escriba, por fuera de su transacción. Una edición de pesos concurrente, en esos milisegundos, podría colarse. Es el mismo patrón de los guards hermanos del mod.

**Todas estas ventanas las cierra el BRE:** al correr la regla antes de **toda** escritura (crear, editar, borrar) y por **toda** puerta, incluida la edición masiva del core, el peso inválido no puede entrar por ninguna vía, y un plan Vigente tampoco puede quedar descuadrado.

## Documentos hermanos

- `DECISION-guard-publicacion-interino-y-retiro-con-BRE` (la decisión que esta nota complementa).
- `Pendiente cross-mod - Guard de suma al publicar el plan (D1, derivado de 1770)` (análisis del caso y alternativas).
- `UPONE-1770 - cierre de alcance y correcciones` (por qué D1 sale de 1770).
- `ANALISIS-mcp-compilador-fichas-enums-de-mod` (por qué la ficha MCP lleva su selección escrita a mano).

## Vigencia

Verificado el 2026-09-24 contra la rama de trabajo del guard en curriculum-design, incluidos la review de kn-dredd, el permiso antes de leer, el formato del peso igual a curriculum-mapping y el filtro por adopción vigente. Re-verificar la lista de retiro si se agregan piezas nuevas al interino o cuando el BRE llegue a `develop`.
