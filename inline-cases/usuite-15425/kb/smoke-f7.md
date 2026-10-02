# Smoke F7: salida real del logger con authLog (USUITE-15425)

Corrida del 2026-10-02 por el dev, desde la raíz de sandbox-api (rama `USUITE-15425-logs-auth-seguros` en sandbox-api y user-api), en Docker con `node:10.24.1-alpine3.11`. Incluye la corrección de apellidos de F7.5 (en el árbol de trabajo al momento de la corrida).

## Resultado por escenario

| Escenario | Qué se esperaba | Qué salió |
|---|---|---|
| 1. Sin `LOG_MASKING` ni `loggerLevel` (como los clientes hoy) | Claves en `[OCULTO]`, correos e identificadores en nivel ligero, nombres visibles, sin avisos, la línea debug visible (nivel `silly` por defecto), errores reenviados a Sentry ya ofuscados | Igual a lo esperado: 0 claves ficticias, 0 avisos, debug visible, 4 eventos a Sentry ofuscados. `pin_acceso` visible a propósito (el patrón `^pin` no es del catálogo) |
| 2. `LOG_MASKING` mal formado | Un único aviso con lo ignorado y el resto igual al escenario 1 | Un único aviso con 7 problemas (`enabled`, estrategia `inventada`, expresión `([`, nivel `maximo`, `maskChar` vacío, `textDetection` no objeto, `maxDepth` 999 ajustado a 50); resto idéntico al escenario 1; 0 claves ficticias |
| 3. `loggerLevel: 'info'`, `email: medium`, `id: strong` (+ `ds_name`), `text: light`, `block.addPatterns: ['^pin']` | Niveles más fuertes aplicados, `pin_acceso` oculto, nombres y apellidos ocultos parcialmente, la línea debug no aparece | Igual a lo esperado: RUT y `ds_name` totalmente ocultos, correos `an********@`, nombres `ANA MA***`, apellido SAML `Ficti***` (con la corrección de F7.5), `pin_acceso` en `[OCULTO]`, debug no impreso, 0 claves ficticias |

En los tres: ninguna excepción, 11 logs de `authLog` impresos y 4 eventos de Sentry (uno por cada `authLog.error`).

## Visible por diseño (no son bugs)

- El número de documento dentro del texto libre de univalle ("documento 1098765432") queda visible porque la detección de documentos en texto está apagada por defecto (`textDetection.id: false`).
- El usuario en la URL de axios (`.../autenticar/luis.ficticio`) y el campo `nombre` del cuerpo quedan visibles: es la decisión pendiente sobre datos no sensibles visibles por defecto (F8).
- `sessionIndex`, `issuer` y `PIDM` quedan visibles: no están en el catálogo.

## Hallazgo corregido en la fase

Con `text` en `light`, el claim SAML `surname` salía completo porque el catálogo solo tenía `sn` (LDAP). Se sumaron `surname`, `familyname` y `lastname` a las keys de `text` (tarea F7.5).

## Cómo repetirlo

El script vive fuera del repo; para repetirlo (por ejemplo en F10 sobre la rama secure), copiar el contenido de abajo a `smoke-f7.js` en una carpeta y montarla en `/smoke`:

```bash
for s in 1 2 3; do docker run --rm --platform linux/amd64 -v "$PWD":/w -v <carpeta del script>:/smoke -w /w node:10.24.1-alpine3.11 node /smoke/smoke-f7.js $s > /tmp/smoke-f7-$s.txt 2>&1; echo "escenario $s exit=$?"; tail -1 /tmp/smoke-f7-$s.txt; done
```

```js
'use strict'

// Smoke F7.3 de USUITE-15425: carga el logger real de suite-api (server/config/logger.js) y authLog con un
// local.env simulado por escenario, pasa los fixtures de los tests y busca las claves ficticias en la salida.
// Uso (desde la raíz de sandbox-api, en Docker con Node 10): node /smoke/smoke-f7.js <1|2|3>

const path = require('path')

const ROOT = '/w'
const USER_API = path.join(ROOT, 'server/api/user-api')
const FIXTURES = path.join(USER_API, 'test/helpers/fixtures')

const SCENARIOS = {
	1: { title: 'sin LOG_MASKING ni loggerLevel (como los clientes hoy)', env: {} },
	2: {
		title: 'LOG_MASKING mal formado',
		env  : {
			LOG_MASKING: {
				enabled      : 'quizas',
				strategies   : { email: { level: 'maximo' }, inventada: {}, block: { addPatterns: [ '([' ] } },
				maskChar     : '',
				textDetection: 'si',
				maxDepth     : 999,
			},
		},
	},
	3: {
		title: "loggerLevel 'info', niveles por estrategia y patrones personalizados",
		// El patrón ^pin solo existe en este escenario: en los otros pin_acceso queda visible a propósito
		extraSecrets: [ 'pin-ficticio-000' ],
		env  : {
			loggerLevel: 'info',
			LOG_MASKING: {
				strategies: {
					block: { addPatterns: [ '^pin' ] },
					email: { level: 'medium' },
					id   : { level: 'strong', add: [ 'ds_name' ] },
					text : { level: 'light' },
				},
			},
		},
	},
}

function fakeLocalEnv(env) {
	const file = path.join(ROOT, 'server/config/local.env.js')

	require.cache[file] = { id: file, filename: file, loaded: true, exports: env }
}

function captureStdout() {
	const chunks = []
	const original = process.stdout.write.bind(process.stdout)

	process.stdout.write = (chunk, ...rest) => {
		chunks.push(String(chunk))

		return original(chunk, ...rest)
	}

	return () => chunks.join('')
}

function fixture(name) {
	return require(path.join(FIXTURES, name))
}

function secrets(scenario) {
	return [
		fixture('uvmcl-wsdl').PASSWORD,
		fixture('axios-error').PASSWORD,
		fixture('token-error').PASSWORD,
		fixture('token-error').INTEGRATION_SECRET,
		'token-ficticio-abc123',
		'token-ficticio-xyz789',
	].concat(scenario.extraSecrets || [])
}

function runLogs(authLog, winston) {
	const uvmcl = fixture('uvmcl-wsdl')
	const univalle = fixture('univalle-post')
	const users = fixture('users-response')

	authLog.info('Login user response', uvmcl.loginUserResponse())
	authLog.info('Login user response XML', uvmcl.loginUserResponseXml())
	authLog.info('Usuario encontrado', users.usersResponse(users.DS_NAME_VARIANTS.rut))
	authLog.info('Respuesta univalle', univalle.loginResponse())
	authLog.warn('Login rechazado', univalle.loginRejected())
	authLog.info('Perfil SAML', fixture('saml-profile').samlProfile())
	authLog.info('Campo con patrón personalizado', { pin_acceso: 'pin-ficticio-000', usuario: uvmcl.USERNAME })
	authLog.error('Error de autenticación externa', { err: fixture('axios-error').axiosError() })
	authLog.error('Error con cuerpo en texto', fixture('axios-error').axiosErrorWithTextBody())
	authLog.error('Error al pedir token', fixture('token-error').tokenRequestError())
	authLog.error('Error en login con token', fixture('token-error').tokenLoginError())
	winston.debug('Línea debug fuera de authLog: solo visible con loggerLevel silly o debug')
}

function main() {
	const scenario = SCENARIOS[process.argv[2]]

	if (!scenario) {
		process.stderr.write('Escenario inexistente: usa 1, 2 o 3\n')
		process.exit(2)
	}

	const sentryEvents = []

	global.Sentry = {
		captureException: (err, ctx) => sentryEvents.push({ type: 'exception', message: err.message, extra: ctx.extra }),
		captureMessage  : (msg, ctx) => sentryEvents.push({ type: 'message', message: msg, extra: ctx.extra }),
	}

	fakeLocalEnv(scenario.env)
	const readOutput = captureStdout()

	process.stdout.write('### Escenario ' + process.argv[2] + ': ' + scenario.title + '\n')
	require(path.join(ROOT, 'server/config/logger.js'))
	// El script vive fuera del repo: winston se resuelve desde node_modules de sandbox-api, el mismo que usa logger.js
	const winston = require(require.resolve('winston', { paths: [ ROOT ] }))
	const authLog = require(path.join(USER_API, 'helpers/authLog'))

	runLogs(authLog, winston)

	setImmediate(() => {
		process.stdout.write('--- Eventos enviados a Sentry: ' + sentryEvents.length + '\n')
		process.stdout.write(JSON.stringify(sentryEvents, null, 2) + '\n')

		const output = readOutput()
		const leaks = secrets(scenario).filter(secret => output.indexOf(secret) !== -1)

		process.stdout.write('--- Claves ficticias encontradas en la salida: ' + leaks.length
			+ (leaks.length ? ' -> ' + leaks.join(', ') : '') + '\n')
		process.exit(leaks.length ? 1 : 0)
	})
}

main()
```

## Salida del escenario 1

```text
### Escenario 1: sin LOG_MASKING ni loggerLevel (como los clientes hoy)
26-10-02 18:25:12 -	-	[info]: 	Login user response {
  "data": {
    "CLAVE": "[OCULTO]",
    "NRRUTUSER": "18456***",
    "DVRUTALU": "K",
    "EMAILUVM": "ana.pru***@uvm.cl",
    "NMEMAIL": "ana.prueba.perso***@example.com",
    "CORREOS": [
      "ana.pru***@uvm.cl",
      "ana.prueba.perso***@example.com"
    ],
    "NMNOMBRS": "ANA MARIA",
    "NMAPEPAT": "PRUEBA",
    "NMAPEMAT": "FICTICIA",
    "NMUSERDOM": "ana.pru***",
    "CODERROR": "0",
    "CODIGOERROR": "0",
    "NRESTADO": "1",
    "AAMATRIC": "2024",
    "CDCARRER": "ING-101",
    "PIDM": "1234567",
    "USERALUM": "S",
    "USERAPO": "N",
    "USEREGRE": "N",
    "USERFUN": "N",
    "USERPOST": "N",
    "USERPROF": "N"
  }
}
26-10-02 18:25:12 -	-	[info]: 	Login user response XML {
  "data": "<RESPUESTA><NMUSERDOM>ana.pru***</NMUSERDOM><CLAVE>[OCULTO]</CLAVE><NRRUTUSER>18456***</NRRUTUSER><EMAILUVM>ana.pru***@uvm.cl</EMAILUVM><NMNOMBRS>ANA MARIA</NMNOMBRS><CODERROR>0</CODERROR></RESPUESTA>"
}
26-10-02 18:25:12 -	-	[info]: 	Usuario encontrado {
  "data": [
    {
      "id_code": 1,
      "ds_mail": "pablo.perez.ficti***@uvm.cl",
      "ds_name": "184567***",
      "ds_picture": null,
      "pictureExtension": null,
      "ds_fullname": "Pablo Pérez Ficticio",
      "id_sub_enterprise": null,
      "is_active": 1
    }
  ]
}
26-10-02 18:25:12 -	-	[info]: 	Respuesta univalle {
  "data": {
    "codigo": "1",
    "mensaje": "Autenticación correcta para luis.ficti***@correounivalle.edu.co, documento 1098765432",
    "datosPersona": {
      "nombres": "LUIS ALBERTO",
      "apellidos": "FICTICIO PRUEBA",
      "numero_documento": "1098765***",
      "tipo_documento": "CC",
      "documento": "1098765***",
      "correo_institucional": "luis.ficti***@correounivalle.edu.co",
      "correo_alterno": "luis.ficti***@example.com",
      "rol": "ESTUDIANTE",
      "dependencia": "FACULTAD DE INGENIERIA"
    }
  }
}
26-10-02 18:25:12 -	-	[warn]: 	Login rechazado {
  "data": {
    "codigo": "0",
    "mensaje": "Usuario o clave incorrectos para luis.ficti***@correounivalle.edu.co"
  }
}
26-10-02 18:25:12 -	-	[info]: 	Perfil SAML {
  "data": {
    "issuer": "https://sts.windows.net/00000000-0000-0000-0000-000000000000/",
    "sessionIndex": "_ficticio-session-index-0001",
    "nameID": "maria.ficti***@udla.edu.ec",
    "nameIDFormat": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress": "maria.ficti***@udla.edu.ec",
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name": "maria.ficti***@udla.edu.ec",
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname": "María",
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname": "Ficticia"
  }
}
26-10-02 18:25:12 -	-	[info]: 	Campo con patrón personalizado {
  "data": {
    "pin_acceso": "pin-ficticio-000",
    "usuario": "ana.pru***@uvm.cl"
  }
}
26-10-02 18:25:12 -	-	[error]: 	Error de autenticación externa {
  "data": {
    "err": {
      "stack": "Error: connect ETIMEDOUT 10.0.0.1:443\n    at buildError (/w/server/api/user-api/test/helpers/fixtures/axios-error.js:9:16)\n    at Object.axiosError (/w/server/api/user-api/test/helpers/fixtures/axios-error.js:34:9)\n    at runLogs (/smoke/smoke-f7.js:91:80)\n    at main (/smoke/smoke-f7.js:122:2)\n    at Object.<anonymous> (/smoke/smoke-f7.js:137:1)\n    at Module._compile (internal/modules/cjs/loader.js:778:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:789:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)\n    at Function.Module._load (internal/modules/cjs/loader.js:585:3)",
      "message": "connect ETIMEDOUT 10.0.0.1:443",
      "code": "ETIMEDOUT",
      "config": {
        "url": "https://login.example.edu.co/api/autenticar/luis.ficticio",
        "method": "post",
        "headers": {
          "content-type": "multipart/form-data; boundary=----ficticio",
          "Authorization": "[OCULTO]"
        },
        "data": {
          "nombre": "luis.ficticio",
          "clave": "[OCULTO]"
        }
      },
      "response": {
        "status": 504,
        "data": {
          "mensaje": "Tiempo de espera agotado para luis.ficti***@correounivalle.edu.co"
        }
      },
      "name": "Error"
    }
  }
}
26-10-02 18:25:12 -	-	[error]: 	Error con cuerpo en texto {
  "data": {
    "stack": "Error: connect ETIMEDOUT 10.0.0.1:443\n    at buildError (/w/server/api/user-api/test/helpers/fixtures/axios-error.js:9:16)\n    at Object.axiosErrorWithTextBody (/w/server/api/user-api/test/helpers/fixtures/axios-error.js:42:9)\n    at runLogs (/smoke/smoke-f7.js:92:68)\n    at main (/smoke/smoke-f7.js:122:2)\n    at Object.<anonymous> (/smoke/smoke-f7.js:137:1)\n    at Module._compile (internal/modules/cjs/loader.js:778:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:789:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)\n    at Function.Module._load (internal/modules/cjs/loader.js:585:3)",
    "message": "connect ETIMEDOUT 10.0.0.1:443",
    "code": "ETIMEDOUT",
    "config": {
      "url": "https://login.example.edu.co/api/autenticar/luis.ficticio",
      "method": "post",
      "headers": {
        "content-type": "multipart/form-data; boundary=----ficticio",
        "Authorization": "[OCULTO]"
      },
      "data": "nombre=luis.ficticio&clave=[OCULTO]"
    },
    "response": {
      "status": 504,
      "data": {
        "mensaje": "Tiempo de espera agotado para luis.ficti***@correounivalle.edu.co"
      }
    },
    "name": "Error"
  }
}
26-10-02 18:25:12 -	-	[error]: 	Error al pedir token {
  "data": {
    "stack": "Error: Command failed: curl\n    at Object.tokenRequestError (/w/server/api/user-api/test/helpers/fixtures/token-error.js:18:16)\n    at runLogs (/smoke/smoke-f7.js:93:63)\n    at main (/smoke/smoke-f7.js:122:2)\n    at Object.<anonymous> (/smoke/smoke-f7.js:137:1)\n    at Module._compile (internal/modules/cjs/loader.js:778:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:789:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)\n    at Function.Module._load (internal/modules/cjs/loader.js:585:3)\n    at Function.Module.runMain (internal/modules/cjs/loader.js:831:12)",
    "message": "Command failed: curl",
    "code": 7,
    "killed": false,
    "cmd": "curl  -u integracion-ficticia:[OCULTO] -H \"Accept: application/json\" -X POST https://auth.example.edu/oauth/token -d \"grant_type=client_credentials\"",
    "name": "Error"
  }
}
26-10-02 18:25:12 -	-	[error]: 	Error en login con token {
  "data": {
    "stack": "Error: Command failed: curl\n    at Object.tokenLoginError (/w/server/api/user-api/test/helpers/fixtures/token-error.js:34:16)\n    at runLogs (/smoke/smoke-f7.js:94:67)\n    at main (/smoke/smoke-f7.js:122:2)\n    at Object.<anonymous> (/smoke/smoke-f7.js:137:1)\n    at Module._compile (internal/modules/cjs/loader.js:778:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:789:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)\n    at Function.Module._load (internal/modules/cjs/loader.js:585:3)\n    at Function.Module.runMain (internal/modules/cjs/loader.js:831:12)",
    "message": "Command failed: curl",
    "code": 7,
    "killed": false,
    "cmd": "curl -H \"Authorization: Bearer [OCULTO]\" -H \"Content-Type: application/json\" -X POST https://auth.example.edu/api/login --data \" {\\\"username\\\":\\\"jperez\\\",\\\"password\\\":\\\"[OCULTO]\\\"}\"",
    "name": "Error"
  }
}
26-10-02 18:25:12 -	-	[debug]: 	Línea debug fuera de authLog: solo visible con loggerLevel silly o debug 
--- Eventos enviados a Sentry: 4
[
  {
    "type": "exception",
    "message": "connect ETIMEDOUT 10.0.0.1:443",
    "extra": {
      "message": "Error de autenticación externa",
      "data": {
        "err": {
          "stack": "Error: connect ETIMEDOUT 10.0.0.1:443\n    at buildError (/w/server/api/user-api/test/helpers/fixtures/axios-error.js:9:16)\n    at Object.axiosError (/w/server/api/user-api/test/helpers/fixtures/axios-error.js:34:9)\n    at runLogs (/smoke/smoke-f7.js:91:80)\n    at main (/smoke/smoke-f7.js:122:2)\n    at Object.<anonymous> (/smoke/smoke-f7.js:137:1)\n    at Module._compile (internal/modules/cjs/loader.js:778:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:789:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)\n    at Function.Module._load (internal/modules/cjs/loader.js:585:3)",
          "message": "connect ETIMEDOUT 10.0.0.1:443",
          "code": "ETIMEDOUT",
          "config": {
            "url": "https://login.example.edu.co/api/autenticar/luis.ficticio",
            "method": "post",
            "headers": {
              "content-type": "multipart/form-data; boundary=----ficticio",
              "Authorization": "[OCULTO]"
            },
            "data": {
              "nombre": "luis.ficticio",
              "clave": "[OCULTO]"
            }
          },
          "response": {
            "status": 504,
            "data": {
              "mensaje": "Tiempo de espera agotado para luis.ficti***@correounivalle.edu.co"
            }
          },
          "name": "Error"
        }
      }
    }
  },
  {
    "type": "exception",
    "message": "connect ETIMEDOUT 10.0.0.1:443",
    "extra": {
      "message": "Error con cuerpo en texto",
      "data": {
        "stack": "Error: connect ETIMEDOUT 10.0.0.1:443\n    at buildError (/w/server/api/user-api/test/helpers/fixtures/axios-error.js:9:16)\n    at Object.axiosErrorWithTextBody (/w/server/api/user-api/test/helpers/fixtures/axios-error.js:42:9)\n    at runLogs (/smoke/smoke-f7.js:92:68)\n    at main (/smoke/smoke-f7.js:122:2)\n    at Object.<anonymous> (/smoke/smoke-f7.js:137:1)\n    at Module._compile (internal/modules/cjs/loader.js:778:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:789:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)\n    at Function.Module._load (internal/modules/cjs/loader.js:585:3)",
        "message": "connect ETIMEDOUT 10.0.0.1:443",
        "code": "ETIMEDOUT",
        "config": {
          "url": "https://login.example.edu.co/api/autenticar/luis.ficticio",
          "method": "post",
          "headers": {
            "content-type": "multipart/form-data; boundary=----ficticio",
            "Authorization": "[OCULTO]"
          },
          "data": "nombre=luis.ficticio&clave=[OCULTO]"
        },
        "response": {
          "status": 504,
          "data": {
            "mensaje": "Tiempo de espera agotado para luis.ficti***@correounivalle.edu.co"
          }
        },
        "name": "Error"
      }
    }
  },
  {
    "type": "exception",
    "message": "Command failed: curl",
    "extra": {
      "message": "Error al pedir token",
      "data": {
        "stack": "Error: Command failed: curl\n    at Object.tokenRequestError (/w/server/api/user-api/test/helpers/fixtures/token-error.js:18:16)\n    at runLogs (/smoke/smoke-f7.js:93:63)\n    at main (/smoke/smoke-f7.js:122:2)\n    at Object.<anonymous> (/smoke/smoke-f7.js:137:1)\n    at Module._compile (internal/modules/cjs/loader.js:778:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:789:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)\n    at Function.Module._load (internal/modules/cjs/loader.js:585:3)\n    at Function.Module.runMain (internal/modules/cjs/loader.js:831:12)",
        "message": "Command failed: curl",
        "code": 7,
        "killed": false,
        "cmd": "curl  -u integracion-ficticia:[OCULTO] -H \"Accept: application/json\" -X POST https://auth.example.edu/oauth/token -d \"grant_type=client_credentials\"",
        "name": "Error"
      }
    }
  },
  {
    "type": "exception",
    "message": "Command failed: curl",
    "extra": {
      "message": "Error en login con token",
      "data": {
        "stack": "Error: Command failed: curl\n    at Object.tokenLoginError (/w/server/api/user-api/test/helpers/fixtures/token-error.js:34:16)\n    at runLogs (/smoke/smoke-f7.js:94:67)\n    at main (/smoke/smoke-f7.js:122:2)\n    at Object.<anonymous> (/smoke/smoke-f7.js:137:1)\n    at Module._compile (internal/modules/cjs/loader.js:778:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:789:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)\n    at Function.Module._load (internal/modules/cjs/loader.js:585:3)\n    at Function.Module.runMain (internal/modules/cjs/loader.js:831:12)",
        "message": "Command failed: curl",
        "code": 7,
        "killed": false,
        "cmd": "curl -H \"Authorization: Bearer [OCULTO]\" -H \"Content-Type: application/json\" -X POST https://auth.example.edu/api/login --data \" {\\\"username\\\":\\\"jperez\\\",\\\"password\\\":\\\"[OCULTO]\\\"}\"",
        "name": "Error"
      }
    }
  }
]
--- Claves ficticias encontradas en la salida: 0
```

## Salida del escenario 2

```text
### Escenario 2: LOG_MASKING mal formado
26-10-02 18:25:13 -	-	[warn]: 	LOG_MASKING: se ignoraron valores inválidos y se usaron los defaults: enabled debe ser true o false; strategies.inventada: estrategia inexistente; strategies.block: expresión inválida "(["; strategies.email.level: nivel inexistente "maximo"; maskChar debe ser un texto no vacío; textDetection debe ser un objeto; maxDepth fuera de rango, se usa 50 
26-10-02 18:25:14 -	-	[info]: 	Login user response {
  "data": {
    "CLAVE": "[OCULTO]",
    "NRRUTUSER": "18456***",
    "DVRUTALU": "K",
    "EMAILUVM": "ana.pru***@uvm.cl",
    "NMEMAIL": "ana.prueba.perso***@example.com",
    "CORREOS": [
      "ana.pru***@uvm.cl",
      "ana.prueba.perso***@example.com"
    ],
    "NMNOMBRS": "ANA MARIA",
    "NMAPEPAT": "PRUEBA",
    "NMAPEMAT": "FICTICIA",
    "NMUSERDOM": "ana.pru***",
    "CODERROR": "0",
    "CODIGOERROR": "0",
    "NRESTADO": "1",
    "AAMATRIC": "2024",
    "CDCARRER": "ING-101",
    "PIDM": "1234567",
    "USERALUM": "S",
    "USERAPO": "N",
    "USEREGRE": "N",
    "USERFUN": "N",
    "USERPOST": "N",
    "USERPROF": "N"
  }
}
26-10-02 18:25:14 -	-	[info]: 	Login user response XML {
  "data": "<RESPUESTA><NMUSERDOM>ana.pru***</NMUSERDOM><CLAVE>[OCULTO]</CLAVE><NRRUTUSER>18456***</NRRUTUSER><EMAILUVM>ana.pru***@uvm.cl</EMAILUVM><NMNOMBRS>ANA MARIA</NMNOMBRS><CODERROR>0</CODERROR></RESPUESTA>"
}
26-10-02 18:25:14 -	-	[info]: 	Usuario encontrado {
  "data": [
    {
      "id_code": 1,
      "ds_mail": "pablo.perez.ficti***@uvm.cl",
      "ds_name": "184567***",
      "ds_picture": null,
      "pictureExtension": null,
      "ds_fullname": "Pablo Pérez Ficticio",
      "id_sub_enterprise": null,
      "is_active": 1
    }
  ]
}
26-10-02 18:25:14 -	-	[info]: 	Respuesta univalle {
  "data": {
    "codigo": "1",
    "mensaje": "Autenticación correcta para luis.ficti***@correounivalle.edu.co, documento 1098765432",
    "datosPersona": {
      "nombres": "LUIS ALBERTO",
      "apellidos": "FICTICIO PRUEBA",
      "numero_documento": "1098765***",
      "tipo_documento": "CC",
      "documento": "1098765***",
      "correo_institucional": "luis.ficti***@correounivalle.edu.co",
      "correo_alterno": "luis.ficti***@example.com",
      "rol": "ESTUDIANTE",
      "dependencia": "FACULTAD DE INGENIERIA"
    }
  }
}
26-10-02 18:25:14 -	-	[warn]: 	Login rechazado {
  "data": {
    "codigo": "0",
    "mensaje": "Usuario o clave incorrectos para luis.ficti***@correounivalle.edu.co"
  }
}
26-10-02 18:25:14 -	-	[info]: 	Perfil SAML {
  "data": {
    "issuer": "https://sts.windows.net/00000000-0000-0000-0000-000000000000/",
    "sessionIndex": "_ficticio-session-index-0001",
    "nameID": "maria.ficti***@udla.edu.ec",
    "nameIDFormat": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress": "maria.ficti***@udla.edu.ec",
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name": "maria.ficti***@udla.edu.ec",
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname": "María",
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname": "Ficticia"
  }
}
26-10-02 18:25:14 -	-	[info]: 	Campo con patrón personalizado {
  "data": {
    "pin_acceso": "pin-ficticio-000",
    "usuario": "ana.pru***@uvm.cl"
  }
}
26-10-02 18:25:14 -	-	[error]: 	Error de autenticación externa {
  "data": {
    "err": {
      "stack": "Error: connect ETIMEDOUT 10.0.0.1:443\n    at buildError (/w/server/api/user-api/test/helpers/fixtures/axios-error.js:9:16)\n    at Object.axiosError (/w/server/api/user-api/test/helpers/fixtures/axios-error.js:34:9)\n    at runLogs (/smoke/smoke-f7.js:91:80)\n    at main (/smoke/smoke-f7.js:122:2)\n    at Object.<anonymous> (/smoke/smoke-f7.js:137:1)\n    at Module._compile (internal/modules/cjs/loader.js:778:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:789:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)\n    at Function.Module._load (internal/modules/cjs/loader.js:585:3)",
      "message": "connect ETIMEDOUT 10.0.0.1:443",
      "code": "ETIMEDOUT",
      "config": {
        "url": "https://login.example.edu.co/api/autenticar/luis.ficticio",
        "method": "post",
        "headers": {
          "content-type": "multipart/form-data; boundary=----ficticio",
          "Authorization": "[OCULTO]"
        },
        "data": {
          "nombre": "luis.ficticio",
          "clave": "[OCULTO]"
        }
      },
      "response": {
        "status": 504,
        "data": {
          "mensaje": "Tiempo de espera agotado para luis.ficti***@correounivalle.edu.co"
        }
      },
      "name": "Error"
    }
  }
}
26-10-02 18:25:14 -	-	[error]: 	Error con cuerpo en texto {
  "data": {
    "stack": "Error: connect ETIMEDOUT 10.0.0.1:443\n    at buildError (/w/server/api/user-api/test/helpers/fixtures/axios-error.js:9:16)\n    at Object.axiosErrorWithTextBody (/w/server/api/user-api/test/helpers/fixtures/axios-error.js:42:9)\n    at runLogs (/smoke/smoke-f7.js:92:68)\n    at main (/smoke/smoke-f7.js:122:2)\n    at Object.<anonymous> (/smoke/smoke-f7.js:137:1)\n    at Module._compile (internal/modules/cjs/loader.js:778:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:789:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)\n    at Function.Module._load (internal/modules/cjs/loader.js:585:3)",
    "message": "connect ETIMEDOUT 10.0.0.1:443",
    "code": "ETIMEDOUT",
    "config": {
      "url": "https://login.example.edu.co/api/autenticar/luis.ficticio",
      "method": "post",
      "headers": {
        "content-type": "multipart/form-data; boundary=----ficticio",
        "Authorization": "[OCULTO]"
      },
      "data": "nombre=luis.ficticio&clave=[OCULTO]"
    },
    "response": {
      "status": 504,
      "data": {
        "mensaje": "Tiempo de espera agotado para luis.ficti***@correounivalle.edu.co"
      }
    },
    "name": "Error"
  }
}
26-10-02 18:25:14 -	-	[error]: 	Error al pedir token {
  "data": {
    "stack": "Error: Command failed: curl\n    at Object.tokenRequestError (/w/server/api/user-api/test/helpers/fixtures/token-error.js:18:16)\n    at runLogs (/smoke/smoke-f7.js:93:63)\n    at main (/smoke/smoke-f7.js:122:2)\n    at Object.<anonymous> (/smoke/smoke-f7.js:137:1)\n    at Module._compile (internal/modules/cjs/loader.js:778:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:789:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)\n    at Function.Module._load (internal/modules/cjs/loader.js:585:3)\n    at Function.Module.runMain (internal/modules/cjs/loader.js:831:12)",
    "message": "Command failed: curl",
    "code": 7,
    "killed": false,
    "cmd": "curl  -u integracion-ficticia:[OCULTO] -H \"Accept: application/json\" -X POST https://auth.example.edu/oauth/token -d \"grant_type=client_credentials\"",
    "name": "Error"
  }
}
26-10-02 18:25:14 -	-	[error]: 	Error en login con token {
  "data": {
    "stack": "Error: Command failed: curl\n    at Object.tokenLoginError (/w/server/api/user-api/test/helpers/fixtures/token-error.js:34:16)\n    at runLogs (/smoke/smoke-f7.js:94:67)\n    at main (/smoke/smoke-f7.js:122:2)\n    at Object.<anonymous> (/smoke/smoke-f7.js:137:1)\n    at Module._compile (internal/modules/cjs/loader.js:778:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:789:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)\n    at Function.Module._load (internal/modules/cjs/loader.js:585:3)\n    at Function.Module.runMain (internal/modules/cjs/loader.js:831:12)",
    "message": "Command failed: curl",
    "code": 7,
    "killed": false,
    "cmd": "curl -H \"Authorization: Bearer [OCULTO]\" -H \"Content-Type: application/json\" -X POST https://auth.example.edu/api/login --data \" {\\\"username\\\":\\\"jperez\\\",\\\"password\\\":\\\"[OCULTO]\\\"}\"",
    "name": "Error"
  }
}
26-10-02 18:25:14 -	-	[debug]: 	Línea debug fuera de authLog: solo visible con loggerLevel silly o debug 
--- Eventos enviados a Sentry: 4
[
  {
    "type": "exception",
    "message": "connect ETIMEDOUT 10.0.0.1:443",
    "extra": {
      "message": "Error de autenticación externa",
      "data": {
        "err": {
          "stack": "Error: connect ETIMEDOUT 10.0.0.1:443\n    at buildError (/w/server/api/user-api/test/helpers/fixtures/axios-error.js:9:16)\n    at Object.axiosError (/w/server/api/user-api/test/helpers/fixtures/axios-error.js:34:9)\n    at runLogs (/smoke/smoke-f7.js:91:80)\n    at main (/smoke/smoke-f7.js:122:2)\n    at Object.<anonymous> (/smoke/smoke-f7.js:137:1)\n    at Module._compile (internal/modules/cjs/loader.js:778:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:789:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)\n    at Function.Module._load (internal/modules/cjs/loader.js:585:3)",
          "message": "connect ETIMEDOUT 10.0.0.1:443",
          "code": "ETIMEDOUT",
          "config": {
            "url": "https://login.example.edu.co/api/autenticar/luis.ficticio",
            "method": "post",
            "headers": {
              "content-type": "multipart/form-data; boundary=----ficticio",
              "Authorization": "[OCULTO]"
            },
            "data": {
              "nombre": "luis.ficticio",
              "clave": "[OCULTO]"
            }
          },
          "response": {
            "status": 504,
            "data": {
              "mensaje": "Tiempo de espera agotado para luis.ficti***@correounivalle.edu.co"
            }
          },
          "name": "Error"
        }
      }
    }
  },
  {
    "type": "exception",
    "message": "connect ETIMEDOUT 10.0.0.1:443",
    "extra": {
      "message": "Error con cuerpo en texto",
      "data": {
        "stack": "Error: connect ETIMEDOUT 10.0.0.1:443\n    at buildError (/w/server/api/user-api/test/helpers/fixtures/axios-error.js:9:16)\n    at Object.axiosErrorWithTextBody (/w/server/api/user-api/test/helpers/fixtures/axios-error.js:42:9)\n    at runLogs (/smoke/smoke-f7.js:92:68)\n    at main (/smoke/smoke-f7.js:122:2)\n    at Object.<anonymous> (/smoke/smoke-f7.js:137:1)\n    at Module._compile (internal/modules/cjs/loader.js:778:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:789:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)\n    at Function.Module._load (internal/modules/cjs/loader.js:585:3)",
        "message": "connect ETIMEDOUT 10.0.0.1:443",
        "code": "ETIMEDOUT",
        "config": {
          "url": "https://login.example.edu.co/api/autenticar/luis.ficticio",
          "method": "post",
          "headers": {
            "content-type": "multipart/form-data; boundary=----ficticio",
            "Authorization": "[OCULTO]"
          },
          "data": "nombre=luis.ficticio&clave=[OCULTO]"
        },
        "response": {
          "status": 504,
          "data": {
            "mensaje": "Tiempo de espera agotado para luis.ficti***@correounivalle.edu.co"
          }
        },
        "name": "Error"
      }
    }
  },
  {
    "type": "exception",
    "message": "Command failed: curl",
    "extra": {
      "message": "Error al pedir token",
      "data": {
        "stack": "Error: Command failed: curl\n    at Object.tokenRequestError (/w/server/api/user-api/test/helpers/fixtures/token-error.js:18:16)\n    at runLogs (/smoke/smoke-f7.js:93:63)\n    at main (/smoke/smoke-f7.js:122:2)\n    at Object.<anonymous> (/smoke/smoke-f7.js:137:1)\n    at Module._compile (internal/modules/cjs/loader.js:778:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:789:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)\n    at Function.Module._load (internal/modules/cjs/loader.js:585:3)\n    at Function.Module.runMain (internal/modules/cjs/loader.js:831:12)",
        "message": "Command failed: curl",
        "code": 7,
        "killed": false,
        "cmd": "curl  -u integracion-ficticia:[OCULTO] -H \"Accept: application/json\" -X POST https://auth.example.edu/oauth/token -d \"grant_type=client_credentials\"",
        "name": "Error"
      }
    }
  },
  {
    "type": "exception",
    "message": "Command failed: curl",
    "extra": {
      "message": "Error en login con token",
      "data": {
        "stack": "Error: Command failed: curl\n    at Object.tokenLoginError (/w/server/api/user-api/test/helpers/fixtures/token-error.js:34:16)\n    at runLogs (/smoke/smoke-f7.js:94:67)\n    at main (/smoke/smoke-f7.js:122:2)\n    at Object.<anonymous> (/smoke/smoke-f7.js:137:1)\n    at Module._compile (internal/modules/cjs/loader.js:778:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:789:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)\n    at Function.Module._load (internal/modules/cjs/loader.js:585:3)\n    at Function.Module.runMain (internal/modules/cjs/loader.js:831:12)",
        "message": "Command failed: curl",
        "code": 7,
        "killed": false,
        "cmd": "curl -H \"Authorization: Bearer [OCULTO]\" -H \"Content-Type: application/json\" -X POST https://auth.example.edu/api/login --data \" {\\\"username\\\":\\\"jperez\\\",\\\"password\\\":\\\"[OCULTO]\\\"}\"",
        "name": "Error"
      }
    }
  }
]
--- Claves ficticias encontradas en la salida: 0
```

## Salida del escenario 3

```text
### Escenario 3: loggerLevel 'info', niveles por estrategia y patrones personalizados
26-10-02 18:25:15 -	-	[info]: 	Login user response {
  "data": {
    "CLAVE": "[OCULTO]",
    "NRRUTUSER": "********",
    "DVRUTALU": "K",
    "EMAILUVM": "an********@uvm.cl",
    "NMEMAIL": "an*****************@example.com",
    "CORREOS": [
      "an********@uvm.cl",
      "an*****************@example.com"
    ],
    "NMNOMBRS": "ANA MA***",
    "NMAPEPAT": "PRUE**",
    "NMAPEMAT": "FICTI***",
    "NMUSERDOM": "an********",
    "CODERROR": "0",
    "CODIGOERROR": "0",
    "NRESTADO": "1",
    "AAMATRIC": "2024",
    "CDCARRER": "ING-101",
    "PIDM": "1234567",
    "USERALUM": "S",
    "USERAPO": "N",
    "USEREGRE": "N",
    "USERFUN": "N",
    "USERPOST": "N",
    "USERPROF": "N"
  }
}
26-10-02 18:25:15 -	-	[info]: 	Login user response XML {
  "data": "<RESPUESTA><NMUSERDOM>an********</NMUSERDOM><CLAVE>[OCULTO]</CLAVE><NRRUTUSER>********</NRRUTUSER><EMAILUVM>an********@uvm.cl</EMAILUVM><NMNOMBRS>ANA MA***</NMNOMBRS><CODERROR>0</CODERROR></RESPUESTA>"
}
26-10-02 18:25:15 -	-	[info]: 	Usuario encontrado {
  "data": [
    {
      "id_code": 1,
      "ds_mail": "pa******************@uvm.cl",
      "ds_name": "*********",
      "ds_picture": null,
      "pictureExtension": null,
      "ds_fullname": "Pablo Pérez Ficti***",
      "id_sub_enterprise": null,
      "is_active": 1
    }
  ]
}
26-10-02 18:25:15 -	-	[info]: 	Respuesta univalle {
  "data": {
    "codigo": "1",
    "mensaje": "Autenticación correcta para lu***********@correounivalle.edu.co, documento 1098765432",
    "datosPersona": {
      "nombres": "LUIS ALBE***",
      "apellidos": "FICTICIO PRU***",
      "numero_documento": "**********",
      "tipo_documento": "CC",
      "documento": "**********",
      "correo_institucional": "lu***********@correounivalle.edu.co",
      "correo_alterno": "lu***********@example.com",
      "rol": "ESTUDIANTE",
      "dependencia": "FACULTAD DE INGENIERIA"
    }
  }
}
26-10-02 18:25:15 -	-	[warn]: 	Login rechazado {
  "data": {
    "codigo": "0",
    "mensaje": "Usuario o clave incorrectos para lu***********@correounivalle.edu.co"
  }
}
26-10-02 18:25:15 -	-	[info]: 	Perfil SAML {
  "data": {
    "issuer": "https://sts.windows.net/00000000-0000-0000-0000-000000000000/",
    "sessionIndex": "_ficticio-session-index-0001",
    "nameID": "ma************@udla.edu.ec",
    "nameIDFormat": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress": "ma************@udla.edu.ec",
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name": "ma************@udla.edu.ec",
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname": "Mar**",
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname": "Ficti***"
  }
}
26-10-02 18:25:15 -	-	[info]: 	Campo con patrón personalizado {
  "data": {
    "pin_acceso": "[OCULTO]",
    "usuario": "an********@uvm.cl"
  }
}
26-10-02 18:25:15 -	-	[error]: 	Error de autenticación externa {
  "data": {
    "err": {
      "stack": "Error: connect ETIMEDOUT 10.0.0.1:443\n    at buildError (/w/server/api/user-api/test/helpers/fixtures/axios-error.js:9:16)\n    at Object.axiosError (/w/server/api/user-api/test/helpers/fixtures/axios-error.js:34:9)\n    at runLogs (/smoke/smoke-f7.js:91:80)\n    at main (/smoke/smoke-f7.js:122:2)\n    at Object.<anonymous> (/smoke/smoke-f7.js:137:1)\n    at Module._compile (internal/modules/cjs/loader.js:778:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:789:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)\n    at Function.Module._load (internal/modules/cjs/loader.js:585:3)",
      "message": "connect ETIMEDOUT 10.0.0.1:443",
      "code": "ETIMEDOUT",
      "config": {
        "url": "https://login.example.edu.co/api/autenticar/luis.ficticio",
        "method": "post",
        "headers": {
          "content-type": "multipart/form-data; boundary=----ficticio",
          "Authorization": "[OCULTO]"
        },
        "data": {
          "nombre": "luis.ficticio",
          "clave": "[OCULTO]"
        }
      },
      "response": {
        "status": 504,
        "data": {
          "mensaje": "Tiempo de espera agotado para lu***********@correounivalle.edu.co"
        }
      },
      "name": "Error"
    }
  }
}
26-10-02 18:25:15 -	-	[error]: 	Error con cuerpo en texto {
  "data": {
    "stack": "Error: connect ETIMEDOUT 10.0.0.1:443\n    at buildError (/w/server/api/user-api/test/helpers/fixtures/axios-error.js:9:16)\n    at Object.axiosErrorWithTextBody (/w/server/api/user-api/test/helpers/fixtures/axios-error.js:42:9)\n    at runLogs (/smoke/smoke-f7.js:92:68)\n    at main (/smoke/smoke-f7.js:122:2)\n    at Object.<anonymous> (/smoke/smoke-f7.js:137:1)\n    at Module._compile (internal/modules/cjs/loader.js:778:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:789:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)\n    at Function.Module._load (internal/modules/cjs/loader.js:585:3)",
    "message": "connect ETIMEDOUT 10.0.0.1:443",
    "code": "ETIMEDOUT",
    "config": {
      "url": "https://login.example.edu.co/api/autenticar/luis.ficticio",
      "method": "post",
      "headers": {
        "content-type": "multipart/form-data; boundary=----ficticio",
        "Authorization": "[OCULTO]"
      },
      "data": "nombre=luis.ficticio&clave=[OCULTO]"
    },
    "response": {
      "status": 504,
      "data": {
        "mensaje": "Tiempo de espera agotado para lu***********@correounivalle.edu.co"
      }
    },
    "name": "Error"
  }
}
26-10-02 18:25:15 -	-	[error]: 	Error al pedir token {
  "data": {
    "stack": "Error: Command failed: curl\n    at Object.tokenRequestError (/w/server/api/user-api/test/helpers/fixtures/token-error.js:18:16)\n    at runLogs (/smoke/smoke-f7.js:93:63)\n    at main (/smoke/smoke-f7.js:122:2)\n    at Object.<anonymous> (/smoke/smoke-f7.js:137:1)\n    at Module._compile (internal/modules/cjs/loader.js:778:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:789:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)\n    at Function.Module._load (internal/modules/cjs/loader.js:585:3)\n    at Function.Module.runMain (internal/modules/cjs/loader.js:831:12)",
    "message": "Command failed: curl",
    "code": 7,
    "killed": false,
    "cmd": "curl  -u integracion-ficticia:[OCULTO] -H \"Accept: application/json\" -X POST https://auth.example.edu/oauth/token -d \"grant_type=client_credentials\"",
    "name": "Error"
  }
}
26-10-02 18:25:15 -	-	[error]: 	Error en login con token {
  "data": {
    "stack": "Error: Command failed: curl\n    at Object.tokenLoginError (/w/server/api/user-api/test/helpers/fixtures/token-error.js:34:16)\n    at runLogs (/smoke/smoke-f7.js:94:67)\n    at main (/smoke/smoke-f7.js:122:2)\n    at Object.<anonymous> (/smoke/smoke-f7.js:137:1)\n    at Module._compile (internal/modules/cjs/loader.js:778:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:789:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)\n    at Function.Module._load (internal/modules/cjs/loader.js:585:3)\n    at Function.Module.runMain (internal/modules/cjs/loader.js:831:12)",
    "message": "Command failed: curl",
    "code": 7,
    "killed": false,
    "cmd": "curl -H \"Authorization: Bearer [OCULTO]\" -H \"Content-Type: application/json\" -X POST https://auth.example.edu/api/login --data \" {\\\"username\\\":\\\"jperez\\\",\\\"password\\\":\\\"[OCULTO]\\\"}\"",
    "name": "Error"
  }
}
--- Eventos enviados a Sentry: 4
[
  {
    "type": "exception",
    "message": "connect ETIMEDOUT 10.0.0.1:443",
    "extra": {
      "message": "Error de autenticación externa",
      "data": {
        "err": {
          "stack": "Error: connect ETIMEDOUT 10.0.0.1:443\n    at buildError (/w/server/api/user-api/test/helpers/fixtures/axios-error.js:9:16)\n    at Object.axiosError (/w/server/api/user-api/test/helpers/fixtures/axios-error.js:34:9)\n    at runLogs (/smoke/smoke-f7.js:91:80)\n    at main (/smoke/smoke-f7.js:122:2)\n    at Object.<anonymous> (/smoke/smoke-f7.js:137:1)\n    at Module._compile (internal/modules/cjs/loader.js:778:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:789:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)\n    at Function.Module._load (internal/modules/cjs/loader.js:585:3)",
          "message": "connect ETIMEDOUT 10.0.0.1:443",
          "code": "ETIMEDOUT",
          "config": {
            "url": "https://login.example.edu.co/api/autenticar/luis.ficticio",
            "method": "post",
            "headers": {
              "content-type": "multipart/form-data; boundary=----ficticio",
              "Authorization": "[OCULTO]"
            },
            "data": {
              "nombre": "luis.ficticio",
              "clave": "[OCULTO]"
            }
          },
          "response": {
            "status": 504,
            "data": {
              "mensaje": "Tiempo de espera agotado para lu***********@correounivalle.edu.co"
            }
          },
          "name": "Error"
        }
      }
    }
  },
  {
    "type": "exception",
    "message": "connect ETIMEDOUT 10.0.0.1:443",
    "extra": {
      "message": "Error con cuerpo en texto",
      "data": {
        "stack": "Error: connect ETIMEDOUT 10.0.0.1:443\n    at buildError (/w/server/api/user-api/test/helpers/fixtures/axios-error.js:9:16)\n    at Object.axiosErrorWithTextBody (/w/server/api/user-api/test/helpers/fixtures/axios-error.js:42:9)\n    at runLogs (/smoke/smoke-f7.js:92:68)\n    at main (/smoke/smoke-f7.js:122:2)\n    at Object.<anonymous> (/smoke/smoke-f7.js:137:1)\n    at Module._compile (internal/modules/cjs/loader.js:778:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:789:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)\n    at Function.Module._load (internal/modules/cjs/loader.js:585:3)",
        "message": "connect ETIMEDOUT 10.0.0.1:443",
        "code": "ETIMEDOUT",
        "config": {
          "url": "https://login.example.edu.co/api/autenticar/luis.ficticio",
          "method": "post",
          "headers": {
            "content-type": "multipart/form-data; boundary=----ficticio",
            "Authorization": "[OCULTO]"
          },
          "data": "nombre=luis.ficticio&clave=[OCULTO]"
        },
        "response": {
          "status": 504,
          "data": {
            "mensaje": "Tiempo de espera agotado para lu***********@correounivalle.edu.co"
          }
        },
        "name": "Error"
      }
    }
  },
  {
    "type": "exception",
    "message": "Command failed: curl",
    "extra": {
      "message": "Error al pedir token",
      "data": {
        "stack": "Error: Command failed: curl\n    at Object.tokenRequestError (/w/server/api/user-api/test/helpers/fixtures/token-error.js:18:16)\n    at runLogs (/smoke/smoke-f7.js:93:63)\n    at main (/smoke/smoke-f7.js:122:2)\n    at Object.<anonymous> (/smoke/smoke-f7.js:137:1)\n    at Module._compile (internal/modules/cjs/loader.js:778:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:789:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)\n    at Function.Module._load (internal/modules/cjs/loader.js:585:3)\n    at Function.Module.runMain (internal/modules/cjs/loader.js:831:12)",
        "message": "Command failed: curl",
        "code": 7,
        "killed": false,
        "cmd": "curl  -u integracion-ficticia:[OCULTO] -H \"Accept: application/json\" -X POST https://auth.example.edu/oauth/token -d \"grant_type=client_credentials\"",
        "name": "Error"
      }
    }
  },
  {
    "type": "exception",
    "message": "Command failed: curl",
    "extra": {
      "message": "Error en login con token",
      "data": {
        "stack": "Error: Command failed: curl\n    at Object.tokenLoginError (/w/server/api/user-api/test/helpers/fixtures/token-error.js:34:16)\n    at runLogs (/smoke/smoke-f7.js:94:67)\n    at main (/smoke/smoke-f7.js:122:2)\n    at Object.<anonymous> (/smoke/smoke-f7.js:137:1)\n    at Module._compile (internal/modules/cjs/loader.js:778:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:789:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)\n    at Function.Module._load (internal/modules/cjs/loader.js:585:3)\n    at Function.Module.runMain (internal/modules/cjs/loader.js:831:12)",
        "message": "Command failed: curl",
        "code": 7,
        "killed": false,
        "cmd": "curl -H \"Authorization: Bearer [OCULTO]\" -H \"Content-Type: application/json\" -X POST https://auth.example.edu/api/login --data \" {\\\"username\\\":\\\"jperez\\\",\\\"password\\\":\\\"[OCULTO]\\\"}\"",
        "name": "Error"
      }
    }
  }
]
--- Claves ficticias encontradas en la salida: 0
```
