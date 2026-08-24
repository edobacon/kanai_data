# UPONE-1615 - Evidencia extendida de Aduana (frontera core/mod)

> **Interno, no pegar en Jira.** El resultado condensado (tabla por artefacto + veredicto global) vive
> en la seccion "Frontera core/mod (Aduana)" de `UPONE-1615-detalle.md`. Aqui queda el rastro de la
> pasada: que se busco, que excepciones se aplicaron y que razonamiento se descarto.
> Modo: analisis. No se invoco `core-extension-writer` ni se creo ningun ticket.

## Veredicto global

`mal-encuadrado`. El enunciado "Implementar logica de Roles internos" sugiere construir un mecanismo, y
ese mecanismo **ya existe integro en el core**. Ningun artefacto requiere tocar el core.

**Encuadre correcto propuesto** (como Decision abierta, sin reescribir el request del PO): es un ticket
de **migracion mod-only**. Declarar los roles internos en los dos mods, decidir y cargar el mapeo
institucional a interno con la administracion existente, y completar la capability faltante de lectura
de institucion en el rol de disenador curricular.

## Que se busco

- El mecanismo de RBAC en el core: los servicios de autorizacion y la documentacion del sistema de
  RBAC.
- Los objetos del core que modelan el rol interno, su tabla de capabilities y el campo que mapea el rol
  institucional al rol interno por aplicacion.
- La sincronizacion que lee las declaraciones de rol del mod y las materializa.
- El estado actual de roles y capabilities de los dos mods: catalogo de capabilities, seed de RBAC,
  declaraciones de rol y sus tests.
- El flujo concreto de creacion de un plan de estudio, para verificar el hueco de permisos sobre
  institucion que cita el PO. Confirmado de punta a punta: FK requerida en el objeto, select en el
  layout de creacion, listado de instancias, y la capability de lectura exigida por el guard de
  autorizacion.

## Excepciones por tipo de artefacto aplicadas

- **Capability / RBAC:** no es core-worthy si la capability ya existe (auto-generada por objeto o
  declarada para otro objeto Base) y solo falta referenciarla en el cableado del mod. Aplicada al hueco
  de lectura de institucion.
- **Objeto / campo:** el objeto de institucion ya es un objeto Base del core; el mod no necesita tocarlo
  ni extenderlo, solo consumir su capability auto-generada.
- **Mecanismo generico ya existente:** si la funcionalidad pedida ya esta implementada de forma generica
  en el core (rol interno, mapeo, UI de administracion), no corresponde escalar nada: no hay necesidad
  que justifique un artefacto nuevo. Es el filtro de necesidad y reuso antes del de genericidad.

## Razonamiento descartado

- **Escalar el "seguro" por orden de corrida como extension de core** (por ejemplo, pedir al
  orquestador de sync que garantice el orden entre mods). Se descarto porque la unicidad del rol interno
  por aplicacion ya resuelve el problema de raiz: el conflicto existe unicamente porque hoy los dos mods
  comparten un rol institucional por nombre global. Al migrar, desaparece por diseno sin tocar el sync.
- **Suponer que el mapeo institucional a interno necesita un objeto o una pantalla nueva.** Se descarto:
  el objeto del core que lo registra y la accion de asignacion en la consola de administracion ya
  cubren exactamente ese caso.
- **Interpretar "generar el rol" (frase del refinamiento) como construir mecanismo en el core.** Se
  descarto: la materializacion del rol interno ya la hace el sync leyendo las declaraciones del mod.
  "Generar el rol", en el contexto real, es escribir ese archivo de declaracion en el mod.

## Corroboracion independiente

La verificacion de codigo, corrida en un subagente distinto y sin conocer el veredicto de Aduana, llego
a la misma conclusion por otro camino: encontro que **coexisten dos sistemas de roles**, que los cuatro
roles curriculares reales viven como roles institucionales sembrados en codigo por cada mod, y que las
unicas declaraciones de rol interno existentes en el mod se autodescriben como *fixture* de la prueba
del mecanismo. Tambien confirmo que no existe ningun mapeo cargado para los cuatro roles reales ni
cobertura que lo ejercite. Dos pasadas independientes coincidiendo refuerzan el hallazgo de re-scope.
