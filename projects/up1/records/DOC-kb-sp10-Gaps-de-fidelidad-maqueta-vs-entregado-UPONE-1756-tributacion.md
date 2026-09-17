---
id: DOC-kb-sp10-Gaps-de-fidelidad-maqueta-vs-entregado-UPONE-1756-tributacion
project: up1
type: doc
module: curriculum-mapping
tags:
  - gap
  - tributacion
  - maqueta
  - curriculum-mapping
  - sp10
---

# Gaps de fidelidad maqueta vs entregado - UPONE-1756 (tributacion)

Registro de las affordances de la maqueta (autoridad visual) que NO llegaron al componente entregado, separando lo genuinamente perdido (se agrega ahora en 143) de lo deliberadamente diferido (otros tickets del sprint). Fuente de diseno: `kb/sp10/UPONE-1756-maqueta-slice.html` (Vistas 1 a 5 = dentro del corte 1756; Vistas 6 a 12 = diferidas). Componente: `mods/curriculum-mapping/modsComponents/CompetencyAlignmentGrid/`.

## Por que se perdio (causa raiz)

La maqueta estaba en el KB pero NO se inyectaba al brief de estructuracion/ejecucion/gate: el ruteo de KB solo entregaba reglas/bugs del modulo, no los docs de diseno. Ademas el detective-mode redujo la maqueta a REQs funcionales en prosa, perdiendo las affordances visuales, y no habia gate de fidelidad que exigiera reproducirlas. Ver correccion en "Prevencion".

## Genuinamente perdido (AGREGAR AHORA en 143)

Lo que la maqueta muestra dentro del corte 1756 y el componente no tiene. Ordenado por impacto:

1. **Confirmacion al retirar** (alto). AC explicito de 1756 ("retirar con confirmacion simple"). Hoy el chip "x" borra de inmediato sin dialogo. Copy literal de la maqueta: "Retirar la tributacion de {codigo} - {competencia}? La quita del plan." con botones "Cancelar" / "Retirar".
2. **Tipo de contribucion visible en la ficha** (alto). La maqueta muestra en cada ficha "Develops" / "Evaluates" / "Both". El chip entregado solo muestra el codigo; la contribucion queda escondida en el aria-label.
3. **Color semantico por contribucion + leyenda** (alto, atado al 2). Develops = neutro, Evaluates = teal claro, Both = teal solido, con leyenda al pie: "Develops (desarrolla)", "Evaluates (evalua)", "Both (ambos)", "Bloqueada (motivo)". El chip entregado usa un unico color.
4. **Celda bloqueada "Consolida"** (alto; corazon de R-3). La maqueta marca las competencias que consolidan con la celda bloqueada y el motivo literal "Consolida". El componente solo suprime el boton "+ Asignar aca" cuando isValidTarget=false, sin marca ni motivo visible: el usuario no ve por que no puede tributar ahi.
5. **Celda bloqueada "Nivel no declarado"** (medio, R-4). Motivo literal "Nivel no declarado" en las celdas cuyo nivel la competencia no declaro. Hoy solo se acota el select de Cobertura; la celda no comunica el bloqueo.
6. **Jerarquia visual padre / sub-competencia** (medio, con salvedad). La maqueta indenta las sub-competencias bajo su padre con un conector. La grilla entregada es plana. Salvedad: verificar si `competencyAlignmentView` devuelve los nodos que consolidan como filas; si no, la jerarquia y el punto 4 dependen de ampliar la vista, no solo el componente.
7. **Menores**: pill "Adoptada" junto a la matriz en el selector; "+" persistente en celdas vacias asignables; campo "Matriz" en el detalle (redundante con el selector, valor bajo).

## Deliberadamente diferido (NO agregar ahora)

Lo que la maqueta muestra ensombrecido y los docs de particion asignan a otro ticket:

- **Barra de guardado global** ("Cambios sin guardar", "Tributar", "Guardar", upsert de conjunto transaccional) -> UPONE-1770. El componente persiste por operacion a proposito (REQ-09).
- **Malla por periodo (Forma B)** y **via masiva ("Varias")** -> UPONE-1770.
- **Peso / porcentaje del eje 1** (grupo de peso, suma 100, repartir, manual/automatico; R-6/R-9) -> UPONE-1770.
- **Indicadores de cobertura (dashboard KPIs)**: "Competencias con evaluador", "Asignaturas sin tributar", "Fuera del diseno (R-12)" -> UPONE-1771.
- **Ficha "Fuera del diseno" marcada (R-12)** -> UPONE-1771.
- **Versionado del plan (R-8)** ("Replicar mapa / Empezar limpio") -> UPONE-1771.
- **Retiro con aviso de dependientes (R-7)** -> UPONE-1772. El retiro simple de 1756 es seguro solo porque outcomeAlignment esta fuera; hay un seam marcado en deleteCompetencyAlignment.
- **outcomeAlignment a nivel de RA (F6)** ("Sostiene / No sostiene") -> UPONE-1772.
- **Drag and drop para asignar**: NO diferido sino REEMPLAZADO por decision de spec (seleccion lateral + click, REQ-17, test que prohibe draggable).

## Reglas de negocio de la consolidacion (contexto de R-3)

- **R-1**: solo se tributan competencias de matrices con adopcion vigente para el plan del planEntry.
- **R-2**: el par (asignatura, competencia) es unico.
- **R-3 (consolidacion)**: un nodo que consolida NO es destino de tributacion. Destino valido = sinHijos OR isHolistic, con "sin hijos" derivado del arbol, no de una bandera. Un nodo con isHolistic=false y cero hijos es invalido. Motivo de la celda "Consolida": los nodos padre tributan a traves de sus hijos, no directamente.
- **R-4**: el nivel debe ser uno declarado por la competencia (contra CompetencyNodeDevelopmentLevel). Motivo de "Nivel no declarado". Los nodos que consolidan no declaran niveles, lo que refuerza R-3.
- **R-5**: contributionType enum obligatorio, default Develops.
- **R-10**: mover una tributacion actualiza la fila, nunca crea una segunda.

## Prevencion (mejora de Kanai aplicada)

Correccion en kanai-app (commit 0b5a6f3, rama setup) para que esto no se repita:
1. Los KB docs de diseno del modulo (tags design/maqueta/mockup/wireframe/ux, incluido multi-modulo) se INYECTAN al brief de ejecucion y gate, y aparte al planner.
2. El planner DECOMPONE cada affordance de la maqueta en un REQ con caso de test kind:"fidelity" (no la resume a prosa).
3. Gate de fidelidad: los casos de fidelidad sin verificar generan finding (warning por defecto; KANAI_FIDELITY_GATE=strict lo eleva a critical y frena la aprobacion).

Los items "genuinamente perdido" de arriba se incorporan como nuevos REQ de fidelidad + tareas en la proxima sesion de 143, con una revision visual humana como ultimo paso.
