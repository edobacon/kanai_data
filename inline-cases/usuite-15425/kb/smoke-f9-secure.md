# Smoke F9: salida real del logger con authLog en la línea secure (USUITE-15425)

Corrida del 2026-10-02 por el dev, desde la raíz de sandbox-api, con las ramas `USUITE-15425-logs-auth-seguros-secure`
de sandbox-api y user-api (después del cherry-pick de F9.2), en Docker con `node:10.24.1-alpine3.11`. Script:
`/Users/edobacon/Workspace/claude_temp/kanai-USUITE-15425-smoke/smoke-f7.js` (contenido en `smoke-f7.md`).

## Resultado por escenario

| Escenario | Qué se esperaba | Qué salió |
|---|---|---|
| 1. Sin `LOG_MASKING` ni `loggerLevel` | Lo mismo que en la línea normal (`smoke-f7.md`) | exit=0, 0 claves ficticias, 0 avisos, debug visible, 4 eventos a Sentry ocultos |
| 2. `LOG_MASKING` mal formado | Un único aviso y el resto igual al escenario 1 | exit=0, 0 claves ficticias, 1 aviso con los 7 valores ignorados |
| 3. `info` con niveles propios y `^pin` | Niveles más fuertes, `pin_acceso` oculto, sin debug | exit=0, 0 claves ficticias, `pin_acceso` en `[OCULTO]`, apellido SAML `Ficti***`, nombres `ANA MA***`, debug no impreso |

**Comparación con la línea normal:** las tres salidas son idénticas a las de F7 (`smoke-f7.md`) salvo la hora de
cada línea y las trazas de pila, comparadas línea a línea. El helper, `authLog` y el logger se comportan igual en
las dos líneas.

## Salida del escenario 1

```text
### Escenario 1: sin LOG_MASKING ni loggerLevel (como los clientes hoy)
26-10-02 19:46:00 -	-	[info]: 	Login user response {
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
26-10-02 19:46:01 -	-	[info]: 	Login user response XML {
  "data": "<RESPUESTA><NMUSERDOM>ana.pru***</NMUSERDOM><CLAVE>[OCULTO]</CLAVE><NRRUTUSER>18456***</NRRUTUSER><EMAILUVM>ana.pru***@uvm.cl</EMAILUVM><NMNOMBRS>ANA MARIA</NMNOMBRS><CODERROR>0</CODERROR></RESPUESTA>"
}
26-10-02 19:46:01 -	-	[info]: 	Usuario encontrado {
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
26-10-02 19:46:01 -	-	[info]: 	Respuesta univalle {
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
26-10-02 19:46:01 -	-	[warn]: 	Login rechazado {
  "data": {
    "codigo": "0",
    "mensaje": "Usuario o clave incorrectos para luis.ficti***@correounivalle.edu.co"
  }
}
26-10-02 19:46:01 -	-	[info]: 	Perfil SAML {
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
26-10-02 19:46:01 -	-	[info]: 	Campo con patrón personalizado {
  "data": {
    "pin_acceso": "pin-ficticio-000",
    "usuario": "ana.pru***@uvm.cl"
  }
}
26-10-02 19:46:01 -	-	[error]: 	Error de autenticación externa {
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
26-10-02 19:46:01 -	-	[error]: 	Error con cuerpo en texto {
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
26-10-02 19:46:01 -	-	[error]: 	Error al pedir token {
  "data": {
    "stack": "Error: Command failed: curl\n    at Object.tokenRequestError (/w/server/api/user-api/test/helpers/fixtures/token-error.js:18:16)\n    at runLogs (/smoke/smoke-f7.js:93:63)\n    at main (/smoke/smoke-f7.js:122:2)\n    at Object.<anonymous> (/smoke/smoke-f7.js:137:1)\n    at Module._compile (internal/modules/cjs/loader.js:778:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:789:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)\n    at Function.Module._load (internal/modules/cjs/loader.js:585:3)\n    at Function.Module.runMain (internal/modules/cjs/loader.js:831:12)",
    "message": "Command failed: curl",
    "code": 7,
    "killed": false,
    "cmd": "curl  -u integracion-ficticia:[OCULTO] -H \"Accept: application/json\" -X POST https://auth.example.edu/oauth/token -d \"grant_type=client_credentials\"",
    "name": "Error"
  }
}
26-10-02 19:46:01 -	-	[error]: 	Error en login con token {
  "data": {
    "stack": "Error: Command failed: curl\n    at Object.tokenLoginError (/w/server/api/user-api/test/helpers/fixtures/token-error.js:34:16)\n    at runLogs (/smoke/smoke-f7.js:94:67)\n    at main (/smoke/smoke-f7.js:122:2)\n    at Object.<anonymous> (/smoke/smoke-f7.js:137:1)\n    at Module._compile (internal/modules/cjs/loader.js:778:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:789:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)\n    at Function.Module._load (internal/modules/cjs/loader.js:585:3)\n    at Function.Module.runMain (internal/modules/cjs/loader.js:831:12)",
    "message": "Command failed: curl",
    "code": 7,
    "killed": false,
    "cmd": "curl -H \"Authorization: Bearer [OCULTO]\" -H \"Content-Type: application/json\" -X POST https://auth.example.edu/api/login --data \" {\\\"username\\\":\\\"jperez\\\",\\\"password\\\":\\\"[OCULTO]\\\"}\"",
    "name": "Error"
  }
}
26-10-02 19:46:01 -	-	[debug]: 	Línea debug fuera de authLog: solo visible con loggerLevel silly o debug 
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
26-10-02 19:46:02 -	-	[warn]: 	LOG_MASKING: se ignoraron valores inválidos y se usaron los defaults: enabled debe ser true o false; strategies.inventada: estrategia inexistente; strategies.block: expresión inválida "(["; strategies.email.level: nivel inexistente "maximo"; maskChar debe ser un texto no vacío; textDetection debe ser un objeto; maxDepth fuera de rango, se usa 50 
26-10-02 19:46:03 -	-	[info]: 	Login user response {
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
26-10-02 19:46:03 -	-	[info]: 	Login user response XML {
  "data": "<RESPUESTA><NMUSERDOM>ana.pru***</NMUSERDOM><CLAVE>[OCULTO]</CLAVE><NRRUTUSER>18456***</NRRUTUSER><EMAILUVM>ana.pru***@uvm.cl</EMAILUVM><NMNOMBRS>ANA MARIA</NMNOMBRS><CODERROR>0</CODERROR></RESPUESTA>"
}
26-10-02 19:46:03 -	-	[info]: 	Usuario encontrado {
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
26-10-02 19:46:03 -	-	[info]: 	Respuesta univalle {
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
26-10-02 19:46:03 -	-	[warn]: 	Login rechazado {
  "data": {
    "codigo": "0",
    "mensaje": "Usuario o clave incorrectos para luis.ficti***@correounivalle.edu.co"
  }
}
26-10-02 19:46:03 -	-	[info]: 	Perfil SAML {
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
26-10-02 19:46:03 -	-	[info]: 	Campo con patrón personalizado {
  "data": {
    "pin_acceso": "pin-ficticio-000",
    "usuario": "ana.pru***@uvm.cl"
  }
}
26-10-02 19:46:03 -	-	[error]: 	Error de autenticación externa {
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
26-10-02 19:46:03 -	-	[error]: 	Error con cuerpo en texto {
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
26-10-02 19:46:03 -	-	[error]: 	Error al pedir token {
  "data": {
    "stack": "Error: Command failed: curl\n    at Object.tokenRequestError (/w/server/api/user-api/test/helpers/fixtures/token-error.js:18:16)\n    at runLogs (/smoke/smoke-f7.js:93:63)\n    at main (/smoke/smoke-f7.js:122:2)\n    at Object.<anonymous> (/smoke/smoke-f7.js:137:1)\n    at Module._compile (internal/modules/cjs/loader.js:778:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:789:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)\n    at Function.Module._load (internal/modules/cjs/loader.js:585:3)\n    at Function.Module.runMain (internal/modules/cjs/loader.js:831:12)",
    "message": "Command failed: curl",
    "code": 7,
    "killed": false,
    "cmd": "curl  -u integracion-ficticia:[OCULTO] -H \"Accept: application/json\" -X POST https://auth.example.edu/oauth/token -d \"grant_type=client_credentials\"",
    "name": "Error"
  }
}
26-10-02 19:46:03 -	-	[error]: 	Error en login con token {
  "data": {
    "stack": "Error: Command failed: curl\n    at Object.tokenLoginError (/w/server/api/user-api/test/helpers/fixtures/token-error.js:34:16)\n    at runLogs (/smoke/smoke-f7.js:94:67)\n    at main (/smoke/smoke-f7.js:122:2)\n    at Object.<anonymous> (/smoke/smoke-f7.js:137:1)\n    at Module._compile (internal/modules/cjs/loader.js:778:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:789:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)\n    at Function.Module._load (internal/modules/cjs/loader.js:585:3)\n    at Function.Module.runMain (internal/modules/cjs/loader.js:831:12)",
    "message": "Command failed: curl",
    "code": 7,
    "killed": false,
    "cmd": "curl -H \"Authorization: Bearer [OCULTO]\" -H \"Content-Type: application/json\" -X POST https://auth.example.edu/api/login --data \" {\\\"username\\\":\\\"jperez\\\",\\\"password\\\":\\\"[OCULTO]\\\"}\"",
    "name": "Error"
  }
}
26-10-02 19:46:03 -	-	[debug]: 	Línea debug fuera de authLog: solo visible con loggerLevel silly o debug 
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
26-10-02 19:46:04 -	-	[info]: 	Login user response {
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
26-10-02 19:46:05 -	-	[info]: 	Login user response XML {
  "data": "<RESPUESTA><NMUSERDOM>an********</NMUSERDOM><CLAVE>[OCULTO]</CLAVE><NRRUTUSER>********</NRRUTUSER><EMAILUVM>an********@uvm.cl</EMAILUVM><NMNOMBRS>ANA MA***</NMNOMBRS><CODERROR>0</CODERROR></RESPUESTA>"
}
26-10-02 19:46:05 -	-	[info]: 	Usuario encontrado {
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
26-10-02 19:46:05 -	-	[info]: 	Respuesta univalle {
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
26-10-02 19:46:05 -	-	[warn]: 	Login rechazado {
  "data": {
    "codigo": "0",
    "mensaje": "Usuario o clave incorrectos para lu***********@correounivalle.edu.co"
  }
}
26-10-02 19:46:05 -	-	[info]: 	Perfil SAML {
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
26-10-02 19:46:05 -	-	[info]: 	Campo con patrón personalizado {
  "data": {
    "pin_acceso": "[OCULTO]",
    "usuario": "an********@uvm.cl"
  }
}
26-10-02 19:46:05 -	-	[error]: 	Error de autenticación externa {
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
26-10-02 19:46:05 -	-	[error]: 	Error con cuerpo en texto {
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
26-10-02 19:46:05 -	-	[error]: 	Error al pedir token {
  "data": {
    "stack": "Error: Command failed: curl\n    at Object.tokenRequestError (/w/server/api/user-api/test/helpers/fixtures/token-error.js:18:16)\n    at runLogs (/smoke/smoke-f7.js:93:63)\n    at main (/smoke/smoke-f7.js:122:2)\n    at Object.<anonymous> (/smoke/smoke-f7.js:137:1)\n    at Module._compile (internal/modules/cjs/loader.js:778:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:789:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)\n    at Function.Module._load (internal/modules/cjs/loader.js:585:3)\n    at Function.Module.runMain (internal/modules/cjs/loader.js:831:12)",
    "message": "Command failed: curl",
    "code": 7,
    "killed": false,
    "cmd": "curl  -u integracion-ficticia:[OCULTO] -H \"Accept: application/json\" -X POST https://auth.example.edu/oauth/token -d \"grant_type=client_credentials\"",
    "name": "Error"
  }
}
26-10-02 19:46:05 -	-	[error]: 	Error en login con token {
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
