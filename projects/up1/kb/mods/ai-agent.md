---
id: SPEC-mods-ai-agent
project: up1
type: spec
module: mods
category: mods
fecha: 2026-08-03
ticket: UPONE-1361/1362/1426
tags: [ai-agent, yupi, bridge, whatsapp, telegram, twilio, langfuse, rbac, multicanal, seguridad]
sources:
  - mods/ai-agent/bridge/index.js
  - mods/ai-agent/bridge/core/dispatcher.js
  - mods/ai-agent/bridge/channels/whatsapp.js
  - mods/ai-agent/bridge/channels/telegram.js
  - mods/ai-agent/logic/channelAuth.js
  - mods/ai-agent/logic/aiChat.resolver.js
  - mods/ai-agent/logic/tools/listInstancesTool.js
  - mods/ai-agent/bridge/package.json
  - mods/ai-agent/docs/poc-whatsapp-kapso.md
  - mods/ai-agent/README.md
---
# Mod ai-agent: Yupi, el bridge multicanal

Guia practica sobre el bridge de canales de Yupi (el agente conversacional de UP1), como enruta mensajes de Telegram y WhatsApp hacia el mismo resolver GraphQL, y como resuelve autenticacion/RBAC segun el canal de origen.

## Indice

1. [TLDR](#1-tldr)
2. [Arquitectura multicanal](#2-arquitectura-multicanal)
3. [Auth por canal](#3-auth-por-canal)
4. [Endpoint /health](#4-endpoint-health)
5. [Langfuse: tracing y scoring](#5-langfuse-tracing-y-scoring)
6. [Kapso descartado, Twilio en produccion](#6-kapso-descartado-twilio-en-produccion)
7. [Deuda documentada: README desactualizado](#7-deuda-documentada-readme-desactualizado)
8. [Gate de objectType queryable en el fallback accent-insensitive](#8-gate-de-objecttype-queryable-en-el-fallback-accent-insensitive)

---

## 1. TLDR

Yupi es el agente conversacional de UP1 (mod `ai-agent`), orquestado con LangGraph y expuesto via la mutation GraphQL `aiChat` (`mods/ai-agent/logic/aiChat.resolver.js`). El bridge (`mods/ai-agent/bridge/`) es un proceso Node.js separado que conecta canales externos (Telegram, WhatsApp) con esa mutation: recibe el mensaje del canal, arma sesion e identidad, llama a Yupi, y responde por el mismo canal.

El bridge se elige en runtime por variable de entorno `BRIDGE_CHANNEL` (`telegram` o `whatsapp`), y ambos canales comparten el mismo flujo (comandos, sesion, identidad, llamada a Yupi) via un dispatcher agnostico de canal.

## 2. Arquitectura multicanal

### Selector de canal (entry point)

`mods/ai-agent/bridge/index.js:19-53` es el punto de entrada. Flujo:

1. Lee `BRIDGE_CHANNEL` (default `telegram`), lo normaliza a minusculas (linea 19).
2. Hace lazy-import del adapter correspondiente (`ADAPTERS`, lineas 23-26): solo se carga la dependencia del canal elegido (ej. `twilio` no se importa si el canal es Telegram).
3. Crea el identity store solo si `adapter.features.identity` es true (linea 37-39): Telegram lo usa, WhatsApp no.
4. Crea el session store con el `idPrefix` del adapter (linea 42-49): el `threadId` (= sessionId de Langfuse) queda prefijado por canal.
5. Cablea el dispatcher con `cfg, adapter, sessions, identities, features` y arranca la recepcion (`adapter.start(handleMessage)`, lineas 51-52).

### Contrato ChannelAdapter

Todo adapter de canal implementa la misma forma (documentada en `mods/ai-agent/bridge/channels/telegram.js:4`):

```
{ name, idPrefix, features, start(onMessage), send(convId, text), identityHeaders(userId) }
```

`features` es el interruptor que preserva el comportamiento historico de cada canal (`mods/ai-agent/bridge/core/dispatcher.js:7-9`):

| Feature | Telegram (`telegram.js:78`) | WhatsApp (`whatsapp.js:43`) |
|---|---|---|
| `commands` | true | false |
| `greeting` | true | false |
| `identity` | true | false |
| `selectedRole` | true | false |

WhatsApp queda "bare": solo threadId por numero + responder, replicando el comportamiento del PoC original (comentario en `whatsapp.js:4-5`). Agregar un canal nuevo significa escribir un adapter nuevo en `channels/` y registrarlo en `ADAPTERS`; el resto (sesion, identidad, comandos, llamada a Yupi) se reutiliza.

### Dispatcher agnostico de canal

`mods/ai-agent/bridge/core/dispatcher.js:1-102` fue extraido de `telegram.js` para que el flujo no dependa de un canal en particular. Orquesta, en orden:

1. **Comandos** (linea 67-70): solo si `features.commands` es true (Telegram). Interpreta `/start`, `/end`, `/identidad`, opciones.
2. **Sesion** (linea 73-81): si no hay sesion activa la crea, sin requerir `/start`.
3. **Identidad** (linea 84-90): si el canal usa identidad (Telegram) y el mensaje anterior pedia identificarse, este mensaje se toma como la respuesta.
4. **`askYupi`** (linea 92-96): mensaje normal, se llama a Yupi con el `threadId` de la sesion y los headers armados en `buildHeaders` (linea 24-31).
5. **`adapter.send`**: la respuesta vuelve por el mismo canal.

## 3. Auth por canal

`mods/ai-agent/logic/channelAuth.js:36-76` centraliza como cada canal se traduce a un `core_User` real para que RBAC corra como esa persona (`applyChannelAuth`, invocado desde el resolver en `aiChat.resolver.js:60`).

| Canal | Header | Resolucion | RBAC real |
|---|---|---|---|
| WhatsApp | `x-whatsapp-phone` | `prisma.core_User.findFirst({ where: { phone: value } })` (`channelAuth.js:40-41`) | Si: `context.user` queda seteado al usuario encontrado |
| Telegram | (ninguno registrado) | No resuelve usuario real; identidad autoreportada solo para Langfuse | No: corre con el usuario del contexto previo (service account) |

Puntos a notar:

- El comentario en `channelAuth.js:32-35` es explicito: Telegram no mapea `telegramId` a `core_User`; su identidad (`/identidad <valor>`, guardada en el identity store del bridge) solo sirve para etiquetar traces de Langfuse, no para autenticar.
- Tras resolver el usuario, `channelAuth.js:66-67` nulea `context.getContextFilter`. El comentario explica por que: ese campo es un closure armado por la middleware con `user=undefined` (el JWT del service token no resuelve usuario); si no se nulea, `withObjectAuth` aplicaria ese filtro vacio y `listInstances` devolveria 0 resultados para el usuario real recien resuelto.
- `getLangfuseUserId` (`channelAuth.js:86-88`) usa el header `x-yupi-user` (identidad autoreportada del bridge) o, si no esta, `context.user?.id`.
- Agregar un canal nuevo con auth real es agregar una entrada a `CHANNEL_USER_RESOLVERS` (header a como encontrar el `core_User`), sin tocar `aiChat.resolver.js`.

## 4. Endpoint /health

Ambos adapters exponen un `GET /health` pensado para el health check de un ALB/ECS (el webhook real siempre es `POST`):

- WhatsApp: `mods/ai-agent/bridge/channels/whatsapp.js:29` responde `200 { status: 'ok' }`.
- Telegram (solo en modo `webhook`): `mods/ai-agent/bridge/channels/telegram.js:49` responde `200 'ok'`. En modo `polling` (default, `TELEGRAM_MODE`) no hay servidor HTTP, por lo que no aplica.

Ambos webhooks (`whatsapp.js:31`, `telegram.js:50-51`) hacen `ack` inmediato (`res.status(200).end()`) antes de procesar el mensaje de forma asincrona, para no bloquear al proveedor con la latencia de Yupi.

## 5. Langfuse: tracing y scoring

El resolver `aiChat` (`mods/ai-agent/logic/aiChat.resolver.js`) envuelve toda la ejecucion del grafo en `withLangfuseSession` (lineas 107-108) con:

- `sessionId: threadId` - el mismo `threadId` que arma el bridge, ya prefijado por canal (`tg-`/`wa-` segun `idPrefix` del adapter en `index.js:42-49`). Esto permite ver, en la vista "Sessions" de Langfuse, una sesion completa por conversacion de canal.
- `userId: langfuseUserId` - resuelto por `getLangfuseUserId` (`channelAuth.js:86-88`, seccion 3).
- `tenantId: context.tenantId`.

Dentro de esa sesion se crea un tracer request-scoped (`createTracer`, lineas 112-117) y, al finalizar el grafo exitosamente, corre heuristicas de scoring (`runHeuristics`, lineas 226-241) que anotan cada trace con score y metadata (intent, tool usado, tokens). Si el grafo termina en error, el catch (lineas 253-259) igual cierra el trace con `error/resolver-error`.

## 6. Kapso descartado, Twilio en produccion

`mods/ai-agent/bridge/package.json:2` todavia dice `"name": "yupi-kapso-bridge"`, pero el adapter de WhatsApp en produccion (`mods/ai-agent/bridge/channels/whatsapp.js:11,20`) usa **Twilio** (`import twilio from 'twilio'`, `client.messages.create(...)`), no Kapso.

Kapso quedo solo como PoC/plan documentado en `mods/ai-agent/docs/poc-whatsapp-kapso.md` (Kapso cloud + ngrok) y fue descartado a favor de Twilio para produccion. El nombre del `package.json` es un remanente de esa decision anterior; no refleja la dependencia real (`twilio`, declarada en `bridge/package.json:15`).

## 7. Deuda documentada: README desactualizado

`mods/ai-agent/README.md` describe una arquitectura que ya no corresponde al mod actual: menciona integracion con OpenAI GPT-4 (linea 3, 8), Express + Vite como stack de frontend/backend, y puertos 3001/6006. El mod real usa AWS Bedrock (no OpenAI) para el modelo, y el bridge multicanal (Telegram/WhatsApp) descrito en este documento no aparece en el README. No bloqueante, pero conviene tenerlo presente al orientarse por ese archivo.

## 8. Gate de objectType queryable en el fallback accent-insensitive

`listInstancesTool` (herramienta de Yupi para listar instancias por lenguaje natural) trae un fallback
de busqueda insensible a acentos que arma SQL crudo con `context.prisma.$queryRawUnsafe`,
interpolando `objectType` en el nombre de tabla (`tryAccentInsensitiveFallback`,
`mods/ai-agent/logic/tools/listInstancesTool.js:128-160`). Antes de UPONE-1426, el unico filtro sobre
`objectType` era una regex de caracteres (`/^[a-zA-Z_]+$/`) pensada para bloquear SQL injection; esa
regex sigue admitiendo identificadores validos de tablas internas del sistema (ej. `core_Capability`).

El fix agrega un segundo gate, previo a la interpolacion: `objectType` debe estar en la lista de
objetos queryable del tenant (`fetchQueryableObjectNames(context)`,
`listInstancesTool.js:290-302`), que consulta `core_ObjectDefinition` y excluye explicitamente los
nombres con prefijo `core_`. Si `objectType` no esta en esa lista, el fallback se aborta (`return null`)
sin llegar al `$queryRawUnsafe`. Ambas funciones (`fetchQueryableObjectNames` y
`tryAccentInsensitiveFallback`) quedaron exportadas, con suite de tests nueva
(`tests/unit/tools/listInstancesTool.test.js`).

Nota de diseno documentada en el propio comentario del codigo (`listInstancesTool.js:286-288`): el
filtro es por prefijo `core_`, no por RBAC real (objetos que el usuario puede ver); si se prefiere
honrar RBAC o un flag explicito `isCore`/`system`, esta implementacion se puede reemplazar.

---

## Historial de cambios

| Fecha | Descripcion |
|-------|-------------|
| 2026-07-16 | Documento inicial: arquitectura del bridge multicanal de Yupi (ai-agent), auth por canal, health checks, Langfuse y nota sobre Kapso/Twilio |
| 2026-08-03 | UPONE-1426: gate de objectType queryable (exclusion de `core_*`) antes de interpolar en raw SQL del fallback accent-insensitive de `listInstancesTool` |
