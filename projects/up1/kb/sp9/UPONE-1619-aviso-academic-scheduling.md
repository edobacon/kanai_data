# UPONE-1619 - Aviso a academic-scheduling (Hito 1)

> Interno. Texto listo para pasar por Slack al equipo de academic-scheduling **cuando se publique el Hito 1**
> (objetos publicados). Es un aviso de una via, no una aprobacion: cada mod implementa su parte. Confirmar la
> identidad final del objeto al momento de publicar antes de enviarlo (nombre canonico y campo id todavia se
> fijan en el Hito 1; ver "Decisiones tecnicas abiertas" del pre-intake).

## Mensaje

Equipo, ya publicamos la pieza de dictado (InstructionalComponent) que dejaron esperando con la FK diferida.
Con esto pueden avanzar su parte.

**Identidad del objeto (para enganchar su FK):**
- Es un RecordType de `CurricularSection`, colgado de la modalidad (`Modality`) por `parentId`.
- Nombre del RecordType: `rt__InstructionalComponent__curricularsection` (confirmar el nombre final publicado).
- Su id es el campo al que apunta la FK de `Section`.
- Ya esta publicado en `object-manager/objects/business/`, asi que sus tablas existen en los 18 schemas de
  tenant. Pueden reactivar su FK (la que dejaron diferida en `Section`).

**Como sumar lo que necesiten (su parte):**
- Si la pieza necesita campos adicionales para su modelo (por ejemplo los tipos de recurso que requiere cada
  pieza), los declaran **desde su propio mod**. El sync une los campos que varios mods declaran sobre el mismo
  objeto, igual que ya ocurre con `Offering` entre curriculum-design y uengagement. No dependen de que
  nosotros los agreguemos.
- El campo de **tipos de recurso** es de ustedes: nosotros no lo declaramos (curriculum-design no consume ese
  dato). Nos falta que definan cardinalidad, forma y valores; con eso queda listo desde su lado.

**Compromiso de nuestro lado:** no cambiamos la identidad del objeto (nombre, que sea RecordType de
`Modality`, el id) una vez publicado, para que su FK siga apuntando bien. Los atributos propios de la pieza
que agreguemos despues son aditivos y no los afectan.

Cualquier duda sobre la forma del objeto, nos dicen.
