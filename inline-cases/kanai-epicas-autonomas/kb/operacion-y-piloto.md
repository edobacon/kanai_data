# Operación implementada y preparación del piloto

## Uso
La app incluye /epicas: seleccionar tickets de un proyecto/repo, rama base y rama acumuladora, confirmar alcance y decidir dependencias inferidas. Aprobar plan. Declarar capacidades comprobadas del host y autorizar acciones con caducidad. Crear rama. Elegir explícitamente Teach o Skip teach e iniciar. El host visible ejecuta las llamadas canónicas devueltas y consulta nuevamente hasta pausa o revisión. No hay un trabajador headless oculto. La validación integrada de A libera B sin cerrar A; el cierre se concentra al final.

## Límites explícitos
MVP secuencial y un repositorio. Capacidades del host declaradas y comprobadas por la persona; no se eleva permiso del harness. Planner combina referencias textuales y requisitos/proveedores con confirmación humana de alcance, no promete análisis semántico exhaustivo. GitHub es el verificador CI inicial; merge final conserva historia (squash no satisface ancestry). La política de CI del repositorio de destino sigue siendo efectiva. No se asegura autonomía universal ni ahorro antes del piloto.

## Métricas
En detalle: partición de calendario activo/pausa/revisión, fases, fallos, recuperación, muestra y fuente de CI, tokens, costos, retrabajo y defectos. JSON y CSV. Lo ausente es null. Línea base antes del inicio; mediciones con evidencia y clave idempotente, no datos simulados. Corridas fallidas/canceladas e historial conservados. Las fuentes no deben contener secretos. Datos locales bajo controles existentes de Kanai; retención conservadora sin eliminación automática.

## Validación de implementación
Ruta /Users/edobacon/Workspace/kanai/kanai-app. Suite completa: 2637/2637, 333 archivos. La primera corrida tuvo un fallo monorepo preexistente bajo carga; aislado 12/12 y repetición completa aprobada. Ver /private/tmp/kanai-epics-full-tests.txt. Pruebas dirigidas: 54/54 incluyendo gate canónico, y cadena A→B→C con Git temporal. E2E de navegación y métricas 1/1. typecheck, check:ui, docs:check y build aprobados. El alias #shared/session-policy corrige resolución SSR observada en build. Lint TS no cubierto por configuración existente, registrado como hallazgo F6. Fixtures no prueban compatibilidad de todos los hosts ni reemplazan piloto.

## Piloto F10 pendiente
Se requiere selección explícita de 3–5 tickets Tao Mangalam, rama base, Teach/Skip, host/versión, responsables, permisos efectivos y baseline comparable posterior a DEC-239. La solicitud de selección quedó presentada a la persona durante implementación. No se inicia automáticamente con tickets elegidos por el agente. Se deben incluir pausas/reanudación y confirmar cero efectos duplicados/avances fuera de permiso. Después del merge, observar defectos 14 días; la fecha se calcula desde la integración real. No existe todavía muestra para concluir aceleración ni decisión de expansión. El juez final del plan queda pendiente hasta que esos criterios puedan verificarse.
