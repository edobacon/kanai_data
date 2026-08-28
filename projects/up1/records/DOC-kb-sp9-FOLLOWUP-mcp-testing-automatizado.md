---
id: DOC-kb-sp9-FOLLOWUP-mcp-testing-automatizado
project: up1
type: doc
---

# Follow-up - MCP: pruebas automatizadas E2E (mecanica + documentacion)

> Estado: **follow-up, a evaluar despues**. No entra en SP9. Salio de la revision de SP9 al acotar
> UPONE-1530 a "solo anadir curriculum-mapping". Fecha: 2026-08-18.

## De donde sale

Durante la revision de UPONE-1530 (Curriculum Mapping | MCP sync) se evaluo aprovechar ese ticket como
**piloto** para dejar armada la mecanica de pruebas automatizadas del MCP y su documentacion. Se decidio
**no** hacerlo dentro de 1530: ese ticket se acota a exponer el dominio curriculum-mapping (objetos
estables mas la matriz en lectura), con la prueba de aceptacion por el estandar actual del MCP (logica
pura con dobles mas verificacion manual contra la plataforma). El piloto de testing se separa aca para
evaluarlo por su cuenta.

## El problema que este follow-up atiende

- El servidor MCP **no tiene integracion automatizada extremo a extremo** contra una instancia real de
  up1. Esta declarado como pendiente en su propia hoja de ruta.
- Las pruebas actuales del MCP cubren **logica pura**: importan las funciones puras de cada operacion e
  inyectan dobles de las escrituras. Un verde ahi no prueba que la operacion funcione contra la
  plataforma real (permisos del usuario real, vista previa antes de confirmar, resolucion de referencias
  y enums por nombre, higiene de salida).
- A medida que mas dominios y mas devs aporten al MCP, la falta de una mecanica y una guia comunes de
  pruebas automatizadas lleva a que cada quien resuelva la verificacion a su manera.

## Alcance del follow-up cuando se retome

1. **Mecanica / harness** de pruebas automatizadas E2E del MCP contra una instancia real de up1:
   autenticacion con usuario real, ejecucion de operaciones de consulta y escritura, y verificacion del
   efecto en la plataforma (no solo del retorno de la funcion).
2. **Documentacion / guia** para que futuros aportes al MCP escriban sus pruebas de forma homogenea,
   limpia y sin dudas: donde vive el harness, como se declara un caso, que protocolos del MCP hay que
   cubrir (permisos como frontera, vista previa, resolucion semantica, higiene), y como se corre.
3. **Un primer dominio como piloto** que estrene la mecanica y sirva de ejemplo en la guia. Candidato
   natural: el dominio que se exponga primero (curriculum-mapping via UPONE-1530), reusando su
   verificacion manual como base del primer caso automatizado.

## Coordinacion necesaria

- **Dueno / hoja de ruta del MCP**: alinear que este harness y su convencion son el **estandar oficial**
  del MCP, no una isla. El objetivo es que reemplace la deuda declarada de integracion E2E y que futuros
  devs lo adopten, asi que debe entrar a la hoja de ruta del MCP, no quedar como anexo de un ticket de
  dominio.

## Por que queda fuera de SP9

- 1530 entro al sprint de forma condicional y su valor directo es exponer el dominio. Cargarle ademas la
  mecanica y la documentacion del testing automatizado del MCP lo convierte en un ticket fundacional de
  otra escala (estimado en 5 a 8 SP frente a los 3 del alcance de dominio), y mezcla dos objetivos.
- Separarlo permite evaluarlo con su propio peso y su propia coordinacion con el dueno del MCP, cuando el
  equipo decida priorizarlo.

## Referencias

- Alcance de dominio de 1530: `sp9/UPONE-1530-detalle.md` (seccion Alcance, Estimacion y la advertencia
  sobre integracion E2E declarada como pendiente).
- Ubicacion del servidor MCP y su registro de dominios: repositorio del MCP (paquete up1-mcp), su guia de
  extension, arquitectura, convenciones, catalogo de operaciones y hoja de ruta.
