---
id: DOC-kb-sp11-UPONE-1770-adendas-post-review-cm41
project: up1
type: doc
module: curriculum-mapping
tags:
  - UPONE-1770
  - adenda
  - post-review
  - tributacion
  - curriculum-mapping
---

# UPONE-1770: adendas post-review del PR curriculum-mapping #41

> Registro de las correcciones hechas después de la revisión del PR curriculum-mapping #41 (2026-09-24).
> Los tickets internos 149, 151 y 152 ya estaban **cerrados**, y un ticket cerrado no admite adendas
> (estado final del flujo). Por eso las adendas quedan acá como registro, no en el pedido de cada ticket.
> Commits: `d035a6f`, `10cd440`, `c1c57e8` en `feat/UPONE-1770-tributacion-peso-del-eje-1`.

## Origen

La revisión de código dio el veredicto **iterar**, con un hallazgo alto y seis medios, más varios menores.
Todos los que se decidió resolver en esta tanda quedaron aplicados y validados:
- typecheck sin errores
- lint sin errores ni warnings
- 3059 de 3059 tests en verde (21 nuevos)

## Adenda al ticket 149: editor de tributación y guardado en conjunto

1. **Mover de nivel quita el peso.** Una tributación que se mueve a otro nivel pierde su peso y el usuario
   recibe un aviso (decisión del dev: limpiar el peso y avisar). Aplica a los tres caminos para mover:
   - "+ Asignar acá", en los dos modos
   - el nivel del modal de detalle

   Antes el peso se arrastraba al grupo destino, y la suma del grupo podía pasar de 100 sin que nada lo
   frenara.
2. **Permisos en dos pasos.** El primero corre antes de leer nada: el usuario tiene que tener al menos
   crear, modificar o eliminar. Si no tiene ninguno, se rechaza y la denegación queda auditada. El segundo
   son los chequeos por operación, que ahora usan el contexto de fuera de la transacción: antes la
   auditoría de una denegación se perdía con el rollback.
3. **Retiro solo de lo conocido.** El editor manda los ids que cargó (`knownIds`) y el servidor retira
   únicamente esos. Lo que otra persona guardó después de la carga no se borra. Si el editor no manda
   `knownIds`, no se retira nada.
4. **Mensaje del tope de filas.** Ya no sugiere dividir el guardado en tandas: con reemplazo total, cada
   tanda retiraba las filas de las otras.
5. **Historial de retiros completo.** Los retiros quedan con la fila completa (asignatura, competencia,
   nivel, tipo y peso) y con el plan del guardado.
6. **Cambio de matriz sin carreras.** Si llega tarde la respuesta de la matriz anterior, se descarta. El
   selector de matriz queda bloqueado mientras se guarda.
7. **"Agregar competencias".** Saltea las competencias que no declaran el nivel elegido y avisa cuántas
   quedaron afuera.
8. **"Varias".** Solo se ofrece a quien tiene permiso de crear, porque la vía masiva solo agrega filas.
9. **Nivel efectivo.** Si una edición no manda el nivel, se conserva el que estaba guardado, y la regla de
   nivel declarado se valida sobre ese nivel.
10. **Vía masiva en el servidor.** Una falla de la base al validar el destino ya no se informa como un
    salteo por regla. Además, el plan de las asignaturas se lee en una sola consulta.
11. **Menores:**
    - un guardado exitoso con recarga fallida se informa como aviso, no como rechazo
    - el error del input de peso llega a los lectores de pantalla
    - un peso cargado se puede vaciar
    - comentarios desactualizados, corregidos
    - descripciones de permisos y doc de referencia, actualizadas
    - identificadores internos retirados del código y de los nombres de tests

## Adenda al ticket 151: tributación bloqueada en plan publicado

La doc de referencia ahora aclara el alcance de la regla de plan publicado (R-PL):
- aplica en las cinco vías **gobernadas** de escritura de tributación;
- el CRUD genérico no pasa por R-PL (ni por R-1 a R-6), así que un perfil con permiso de crear o modificar
  puede escribir por ahí la tributación de un plan publicado.

Esto queda declarado como deuda de alcance, enlazada a UPONE-1771 y al enganche componible en el core
(UPONE-1758). El guard no cambia de comportamiento.

## Adenda al ticket 152: peso numérico y texto

- El borrador del editor compara el peso por su valor numérico, igual que el servidor lo canoniza:
  escribir "50.0" sobre un "50" guardado ya no marca cambios pendientes.
- Vaciar el input de un peso cargado lo vuelve a "sin peso". Antes no había forma de quitarlo.

## Fuera de alcance y pendientes

- **Deuda:** partir `CompetencyAlignmentGridElement.vue` (4122 líneas) en piezas más chicas.
- **Candidato a extensión de core:** que el sync del layout permita compartir módulos entre carpetas de
  `modsComponents`. Hoy `weights.ts` está duplicado por esa limitación.
- **Consulta al PO:** cuál es el tamaño máximo real de tributaciones por plan y matriz, para confirmar si
  el tope de 500 filas por guardado alcanza.
- **Decisión del dev:** los mensajes de commit ya publicados que tienen identificadores internos no se
  reescriben.
