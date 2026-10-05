---
id: KT-013-SPEC
project: kanai_test
ticket: KT-013
status: draft
---

# Prueba de punta a punta: verificacion obligatoria con un item no ejecutable y su motivo

## Resumen ejecutivo

Se prueba, sobre el caso inline kanai-verificacion-obligatoria (fase F5), que con la verificacion en modo OBLIGATORIA la corrida aporta resultado item por item, que un item que no se puede correr queda NO EJECUTADO con causa y nota, y que el cierre informa que quedo sin correr y por que, exigiendo reconocimiento auditado si el dev cierra igual. NO se toca codigo de producto: es un ticket de datos que ejercita el flujo existente. Se verifica observando la corrida del caso en kanai_test (proyecto sin baseUrl de verificacion, por lo que el smoke con Playwright es el item no ejecutable real) y el aviso de cierre resultante. ADVERTENCIA (fuera de alcance, no es requirement): si durante la prueba aparece un defecto del motor de verificacion o del cierre, se reporta como hallazgo y se trata en un ticket aparte, no se corrige aca.

Datos a confirmar antes de ejecutar:
- Como se activa el modo OBLIGATORIA de verificacion en la corrida (flag, campo de la sesion o config del caso inline): confirmar en el contrato de la fase F5 del caso inline kanai-verificacion-obligatoria.
- Valor literal de la causa que Kanai acepta para un item no ejecutado (p.ej. falta de baseUrl) y el campo de la nota: confirmar en el contrato de la verificacion por item.
- Mecanismo exacto de reconocimiento del motivo al cerrar con items sin resolver y donde queda auditado: confirmar en el flujo de cierre del caso inline.

## Requirements

### REQ-01 `inferred`
> Fuente: kanai_test/README.md:1

Con la verificacion en modo OBLIGATORIA, la sesion de verificacion aporta un resultado declarado para CADA item del plan: ningun item queda mudo ni se da por aprobado por omision.

### REQ-02 `inferred`
> Fuente: kanai_test/README.md:1

Un item que no se puede ejecutar queda registrado como NO EJECUTADO con su causa y su nota; en kanai_test el smoke con Playwright es ese caso, porque el proyecto no tiene baseUrl de verificacion configurado.

### REQ-03 `inferred`
> Fuente: kanai_test/README.md:1

El cierre informa QUE quedo sin correr y POR QUE; si el dev decide cerrar igual, debe reconocer el motivo y ese reconocimiento queda auditado en la sesion.

### REQ-04 `confirmed` `enforcement`
> Fuente: kanai_test/README.md:1

La prueba corre sobre el flujo existente del caso inline kanai-verificacion-obligatoria y del proyecto kanai_test: no se agrega, modifica ni elimina codigo de producto ni archivos del repo kanai-app.
## Tasks

#### S1.T1 — Preparar y correr la sesion de verificacion del caso inline kanai-verificacion-obligatoria sobre kanai_test con la verificacion en modo OBLIGATORIA, y registrar el resultado item por item hasta que ningun item quede mudo. Dejar anotado en la sesion el estado declarado de cada item.
Contrato: rollback: Descartar la corrida de verificacion de la sesion (volver la sesion al estado previo a registrar resultados); no hay cambios de codigo que revertir.. Status: pending

#### S1.T2 — Registrar el smoke con Playwright como NO EJECUTADO con causa y nota: la causa es que kanai_test no tiene baseUrl de verificacion configurado, por lo que el navegador no tiene a donde apuntar. Verificar que el item no queda ni aprobado ni fallido y que la causa y la nota quedan persistidas.
Contrato: rollback: Borrar el resultado NO EJECUTADO registrado para ese item y dejarlo sin estado como antes de la task.. Status: pending

#### S1.T3 — Disparar el cierre de la sesion y comprobar el comportamiento del gate: primero intentar cerrar sin reconocer el motivo (debe informar el item no ejecutado y no cerrar), y despues cerrar reconociendo explicitamente el motivo, dejando el reconocimiento auditado en la sesion. Capturar el texto del aviso de cierre como evidencia.
Contrato: rollback: Reabrir la sesion al estado previo al cierre y eliminar el reconocimiento registrado.. Status: pending

#### S1.T4 — Regresion y evidencia de la prueba: consolidar en la sesion los casos observados (resultado por item, item no ejecutado con causa y nota, aviso de cierre y reconocimiento auditado) y confirmar que el repo de codigo kanai-app no quedo con cambios de producto por este ticket.
Contrato: rollback: Eliminar la nota de evidencia agregada a la sesion; no hay archivos de codigo que revertir.. Status: pending
## Sessions

### Session 1 · T1 · open

**Tasks:**
- [ ] S1.T1
- [ ] S1.T2
- [ ] S1.T3
- [ ] S1.T4

**Gate (auto)**: En el caso inline kanai-verificacion-obligatoria sobre kanai_test se ve la corrida con verificacion OBLIGATORIA: todos los items con resultado declarado, el smoke con Playwright como NO EJECUTADO con causa y nota, y el aviso de cierre listando ese pendiente con su motivo y el reconocimiento auditado.

### Session 2 · T0 · continue

**Gate (auto)**: La sesion cierra con cada item reportado: paso, o no ejecutado CON su motivo (causa y nota).
