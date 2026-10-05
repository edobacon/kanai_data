# Antes del backup: qué sobrevive a un rearme de la DB

Fecha: 2026-10-05. Lo pidió el dev antes del backup: verificar que lo implementado no se pierda cuando se
rearme la DB. Es una medición previa, no una suposición.

## Qué verifiqué

| Pieza | ¿Sobrevive? | Por qué |
|---|---|---|
| **Casos inline y planes** | **Sí** | Viven en archivos del data repo: `case.md`, `plan.md`, `plan.yaml`, `kb/`, `case-log.ndjson`, `usage.ndjson`. Comprobado en `inline-cases/kanai-verificacion-obligatoria/` |
| **Esquema (la migración)** | **Sí** | Las migraciones son archivos versionados en `kanai-app` y `db:rebuild --fresh` las aplica |
| **`autopilot` del ticket** | **Sí** | Está en el **frontmatter** del `.md` (comprobado en `projects/kanai_test/tickets/KT-012.md`) |
| **`teachPolicy`, `draftPolicy`, `reviewPolicy`** | **NO consta** | **No están en el frontmatter.** Aparecen solo como registro del cambio en `KT-012.audit.ndjson` y `KT-012.decisions.ndjson`, no como estado actual en el texto |

`scripts/db-rebuild.mts` dice de sí mismo: *"Rearma la DB desde las fuentes de verdad en TEXTO... La DB deja de
ser sagrada: si se corrompe, este comando la regenera desde el texto del data repo."* Y `--fresh` **borra la DB
y la reconstruye desde cero**.

## La consecuencia

Si el rearme no reproduce el **último valor** de esas políticas, se pierden en silencio: vuelven a sus
defaults (`ask`/`ask`/`auto`). Nadie se entera, porque un default válido no falla — simplemente cambia el
comportamiento del ticket. Y **la política de verificación que vamos a agregar heredaría el mismo agujero**.

## Lo que esto cambia en F1

1. **La política tiene que quedar materializada en el TEXTO del ticket como ESTADO**, al lado de `autopilot` en
   el frontmatter — no alcanza con la columna ni con el evento de auditoría.
2. **El mismo arreglo aplica a las tres políticas que ya existen** (`teach`, `draft`, `review`): hoy tienen ese
   hueco y conviene cerrarlo en el mismo cambio, o al menos dejarlo medido y decidido.
3. **Verificación con rearme real**: un `pnpm db:rebuild --fresh` **sobre una copia** del store, antes y
   después, comprobando que el ticket conserva sus políticas.

## El orden que pidió el dev

1. **Medir el rearme primero**, sobre copia: qué sobrevive **hoy**, incluidas las tres políticas actuales.
   Convierte la sospecha en dato.
2. **Después el backup** del store vivo.
3. **Implementar** con la política en el frontmatter.
4. **Volver a medir**: `--fresh` sobre copia y el ticket conserva su política.

## Lo que NO está en riesgo

- El **caso y su plan** (archivos).
- El **esquema** (migraciones versionadas).
- Los **commits de código** de las seis mejoras: viven en el repo de código, no en la DB.
- Las **KB docs** de los casos: son archivos.
