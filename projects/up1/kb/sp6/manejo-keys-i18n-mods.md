# Manejo de keys de i18n en los mods de up1

> Cómo un mod declara sus traducciones, cómo el sync las lleva a Suite, y qué pasa
> cuando una key ya existe en otro mod o en core.
>
> Fuente de verdad del comportamiento: `suite/scripts/sync-i18n.js`.
> Ejemplos tomados del mod `curriculum-design` (cd).

---

## 1. Dónde y cómo declara sus keys un mod

Las traducciones de un mod viven en su carpeta `lang/`, como **archivos JSON planos**
(no árbol de carpetas). El nombre del archivo define locale, país y — opcionalmente —
el objeto/target al que aplican.

```
mods/<mod>/lang/
```

### Convención de nombres

| Patrón | Alcance | Ejemplo (cd) |
|--------|---------|--------------|
| `{locale}_{country}.json` | Traducciones base del mod (componentes custom) | `es_CL.json` |
| `{locale}_{country}@{target}.json` | Traducciones por objeto / componente / relación | `es_CL@activity.json` |

Los archivos por target sobrescriben al base para ese target.

### Tres tipos de `target` (observados en cd)

`curriculum-design` usa el `@target` para tres cosas distintas, no solo objetos:

- **Objetos** (PascalCase): `@AcademicProgram`, `@Curriculum`, `@CurricularSection`,
  `@CurricularLink`, `@BibliographyReference`, `@Offering`.
- **Componentes / layouts custom** (camelCase): `@activity`, `@requirement`,
  `@requirementCategory`, `@planEntry`, `@changeLog`, `@workflowStatus`,
  `@activityStatusBadge`.
- **Relaciones embebidas** — prefijo `rt__Child__Parent`: `@rt__Session__curricularsection`,
  `@rt__Bibliography__curricularsection`, `@rt__Group__requirement`, etc. Traducen las
  columnas de las listas embebidas dentro del RecordDetail del padre.

### Cobertura de idiomas en cd

`es_CL` es el idioma canónico y completo (24 archivos). `en_CL` y `pt_BR` solo cubren
las superficies core (3 archivos cada uno: base + `@activity` + `@Offering`).

---

## 2. Ejemplos reales de curriculum-design

### 2.1 Archivo base — namespaces por componente custom

El archivo base **no** usa `column`/`tabs`; agrupa las strings bajo un objeto top-level
por cada componente Vue custom del mod. Esto es clave para no chocar con otros mods
(ver §5).

```jsonc
// mods/curriculum-design/lang/es_CL.json
{
  "_source_module": "curriculum-design",
  "compositeSectionTree": {
    "loading": "Cargando árbol...",
    "empty": "No hay elementos cargados.",
    "summary": "{total} en total — {roots} de nivel raíz",
    "buttons": { "createFirst": "Crear primer componente", "save": "Guardar" },
    "form": {
      "labels": { "name": "Nombre", "position": "Orden" },
      "modalTitles": { "createChild": "Crear hijo de \"{parent}\"" }
    }
  },
  "richTextRenderer": { /* ... */ },
  "colorPicker": { /* ... */ },
  "iconPicker": { /* ... */ },
  "curriculumMesh": { /* ... */ }
}
```

### 2.2 Archivo por objeto — `column`, `tabs`, `enums`

```jsonc
// mods/curriculum-design/lang/es_CL@activity.json
{
  "_source_module": "curriculum-design",
  "column": {
    "name": "Nombre",
    "code": "Código",
    "programLevel": "Nivel",
    "credits": "Créditos"
  },
  "tabs": { "versions": "Versiones" },
  "enums": {
    "programLevel": {
      "Undergraduate": "Pregrado",
      "Postgraduate": "Postgrado",
      "TechnicalProfessional": "Técnico profesional"
    },
    "purpose": { "Academic": "Académico", "Formative": "Formativo" }
  }
}
```

> La sección `enums` (traducción de valores de un enum) es un patrón que cd agregó y que
> conviene reutilizar; la guía genérica de i18n no la documentaba.

### 2.3 Archivo de relación embebida (`rt__`)

```jsonc
// mods/curriculum-design/lang/es_CL@rt__Session__curricularsection.json
{
  "_source_module": "curriculum-design",
  "column": {
    "name": "Actividad",
    "week": "Semana",
    "activityType": "Tipo",
    "duration": "Duración"
  }
}
```

### Interpolación

Placeholders con `{name}`, `{total}`, `{parent}` en strings de componentes, y el patrón
`[record.name]` en títulos de row actions (ej. `"createChildTitle": "Crear Hijo para [record.name]"`).

---

## 3. Flujo del sync (mod → Suite)

El comando `npm run sync` de la raíz corre, entre otras fases, el sync de i18n del
workspace `suite`:

```
npm run sync  (raíz)
   └─ npm run sync --workspace=suite
        └─ npm run sync-styles
        └─ node scripts/sync-i18n.js      ← el que nos interesa
```

Qué hace `sync-i18n.js`:

1. **Descubre mods con `lang/`.** Recorre los workspaces del `package.json` raíz.
   Excluye los que están en `ignoredMods` y se salta el propio `suite`.
2. **Por cada archivo `.json` del mod**, calcula el destino en `suite/lang/<mismo-nombre>`.
   Es decir, **el destino se resuelve por nombre de archivo**: dos mods que declaran
   `es_CL@Person.json` aterrizan en el **mismo** archivo de Suite.
3. **Si el archivo no existe en Suite → lo crea**, agregando `_source_module: <mod>`
   como atribución de origen.
4. **Si ya existe → hace un merge/upsert** key por key (ver §4).

Regla dura del proyecto: **nunca se edita `suite/lang/` a mano** — es un destino
regenerable. La fuente siempre es `mods/<mod>/lang/`.

### Granularidad de las colisiones

- La colisión es **por archivo** (mismo `{locale}_{country}[@target].json`) y luego
  **key por key** dentro de ese archivo.
- Dos mods solo pueden chocar si escriben en el **mismo archivo**. Si usan targets
  distintos (`es_CL@activity.json` vs `es_CL@requirement.json`), nunca se cruzan.

---

## 4. Lógica de merge (upsert fail-safe)

El diseño es **"upsert que nunca sobrescribe en silencio"**: o mergea keys disjuntas,
o aborta. **No hay precedencia de core ni last-write-wins.**

Para cada key del mod entrante, comparada contra lo que ya hay en el archivo de Suite:

| Situación | Resultado |
|-----------|-----------|
| La key **no existe** en destino | Se agrega (merge limpio) ✅ |
| La key existe con **el mismo valor** | Se omite, sin cambios ⏭️ |
| Ambos valores son **objetos** y sus hojas anidadas son **disjuntas** | **Deep-merge**: coexisten los sub-valores de ambos ✅ |
| Ambos son objetos pero chocan en una **hoja** (misma sub-key, distinto valor) | ❌ **Conflicto → aborta** |
| Valor **escalar/array distinto**, de otro origen | ❌ **Conflicto → aborta** |

### Fast-path del dueño

Existe una única excepción: si el archivo de Suite tiene `_source_module === <mod entrante>`
(o sea, ese archivo lo creó ese mismo mod), entonces el mod puede **actualizar sus propias
keys libremente**, sin evaluar conflictos. Es el caso normal de re-sincronizar tu propio mod
tras editar una traducción.

### Qué significa "aborta"

Al primer conflicto imprime `❌ Conflict on key "X"`, lanza un error y termina con
`process.exit(1)`. **Todo el sync de i18n se detiene** y el conflicto debe resolverse a mano
(renombrar la key en el mod, o alinear el valor). No se pisa el valor existente.

---

## 5. Casos de key repetida

### 5.1 La key existe en varios mods

Aplica la tabla de §4, con el archivo compartido como punto de cruce:

- **Namespaces distintos dentro del mismo archivo → conviven** vía deep-merge.
  Es lo que permite que cd tenga varios objetos top-level (`compositeSectionTree`,
  `curriculumMesh`, ...) sin chocar con lo que aporte otro mod al mismo archivo base.
- **Misma hoja con texto distinto → aborta.** Dos mods no pueden definir literalmente la
  misma key final con valores diferentes.
- **Misma hoja con el mismo texto → se omite**, inofensivo.

### 5.2 La key existe en un mod y en core

**Mismo mecanismo, sin trato especial.** "Core" aquí es simplemente lo que ya está en
`suite/lang/` (sea sembrado por core o por un mod anterior):

- Si el archivo destino fue creado por **tu propio mod** (`_source_module` coincide) →
  fast-path, puedes actualizar tus keys.
- Contra keys de **otro dueño** (core u otro mod) → rige la tabla de conflictos:
  deep-merge si son disjuntas, abort si chocan en una hoja.

No hay "core gana" ni "mod gana": el que llega segundo con un valor distinto **rompe el
sync** hasta que alguien lo resuelva.

---

## 6. Gotchas

- **La atribución `_source_module` salta al último que escribe.** Si el mod B agrega keys
  nuevas a un archivo creado por el mod A, tras el merge `_source_module` pasa a ser B.
  Efecto colateral: en el siguiente sync, A **ya no** entra al fast-path del dueño sobre
  ese archivo — sus cambios pasan a evaluarse bajo las reglas de conflicto. Borde real si
  dos mods comparten un archivo de objeto core.
- **El abort deja estado parcial.** Los mods se procesan en secuencia y cada archivo se
  escribe apenas se resuelve; si aborta en el mod 3, lo del 1 y 2 ya quedó escrito. No es
  transaccional. Re-correr el sync es seguro (los valores idénticos se omiten), pero el
  archivo en conflicto queda sin actualizar hasta resolverlo.
- **`ignoredMods` excluye del sync.** Un mod listado en `ignoredMods` del `package.json`
  raíz no aporta traducciones.

---

## 7. Recomendaciones

1. **Namespacear las keys por dominio del mod.** No meter strings sueltas en secciones
   genéricas que core ya llena. Es exactamente lo que hace cd con su archivo base
   (cada componente custom bajo su propio objeto top-level) — por eso convive con otros
   mods vía deep-merge sin abortar.
2. **No compartir archivos de objeto core entre mods** salvo que sea inevitable; si dos
   mods extienden el mismo objeto, coordinar los namespaces para evitar el salto de
   `_source_module` (§6).
3. **Marcar cada archivo con `_source_module`** (cd ya lo hace) para trazar el origen y
   habilitar el fast-path del dueño en re-syncs.
4. **Validar con `--dry-run`** antes de un sync real cuando se toquen archivos que otros
   mods o core también usan: `node scripts/sync-i18n.js --dry-run` reporta conflictos sin
   escribir.
