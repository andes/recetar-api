# Integración Praxys · Notificación de dispensa (eventos RPE)

Guía de integración y puesta en marcha del servicio que recibe los eventos de ciclo de vida
que Praxys envía a RecetAR (contrato **RPE - Envío de prescripciones a servicios REST**).

> Documento de entrega para el equipo de Praxys y para pruebas internas.
> El detalle técnico del contrato vive en [`docs/praxys-events.md`](./praxys-events.md).

## 1. Qué resuelve

RecetAR envía recetas a Praxys por la API v2 (outbound). Este servicio cubre el camino inverso
(inbound): Praxys notifica el alta, la anulación y la dispensa para que RecetAR y SIFAHO
reflejen el estado real de la receta.

Sin este servicio, una receta anulada o dispensada en Praxys seguiría figurando como disponible
en RecetAR.

## 2. Base URL y endpoints

Praxys configura una única dirección base:

```
https://recetartest.andes.gob.ar/api/praxys
```

> Entorno de pruebas: `recetartest`. En producción se usa el host productivo que defina
> infraestructura; las rutas relativas son las mismas.

| Método | Ruta | Operación | Respuesta esperada |
|---|---|---|---|
| `POST` | `/prescripciones` | Prescripción emitida | `201` (nueva) / `200` (repetida) |
| `DELETE` | `/prescripciones/{hash}` | Anulación de prescripción | `200` |
| `DELETE` | `/recetas/{hash}` | Anulación de receta | `200` |
| `POST` | `/recetas/{hash}/dispensa` | Dispensa de receta | `200` |
| `DELETE` | `/recetas/{hash}/dispensa` | Anulación de dispensa | `200` |

Los `hash` son los que devuelve Praxys al crear la prescripción:

- **hash de prescripción** → se usa en `/prescripciones/{hash}`.
- **hash de receta** (`recetasEmitidas[].hash`) → se usa en `/recetas/{hash}` y en la dispensa.

### Formato de respuesta

Éxito:

```json
{
  "status": "success",
  "data": {
    "hash": "a153a3a4...",
    "duplicate": false,
    "estado": "procesado",
    "linked": true,
    "affected": 1
  }
}
```

Error:

```json
{
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Datos inválidos",
    "details": [{ "field": "dispensa.numeroAutorizacion", "message": "Requerido" }]
  }
}
```

Códigos de error relevantes:

| HTTP | `code` | Cuándo |
|---|---|---|
| `403` | `FORBIDDEN` | IP no autorizada, `x-api-key` inválida o HTTPS requerido |
| `404` | `RECURSO_NOT_FOUND` | Hash desconocido o recepción deshabilitada |
| `422` | `VALIDATION_ERROR` | Payload inválido |
| `500` | `INTERNAL_ERROR` | Error inesperado del servidor |

## 3. Seguridad

La recepción se protege con tres controles, configurables por entorno:

1. **HTTPS**: el servicio escucha HTTP detrás de un proxy con TLS. En producción, configurar
   `PRAXYS_INBOUND_ENFORCE_HTTPS=true` para exigir `https` o `x-forwarded-proto: https`.
2. **Allowlist de IPs de egreso de Praxys**: lista de IPs o rangos CIDR separados por coma.
   En producción, si la lista está vacía, se rechaza todo (**fail closed**).
3. **`x-api-key` compartida**: si está configurada, todas las requests deben enviarla.
   Recomendado: mantenerla siempre activa, incluso con allowlist.

Variables de entorno:

| Variable | Default | Descripción |
|---|---|---|
| `PRAXYS_INBOUND_ENABLED` | `true` | `false` deshabilita la superficie y responde `404` |
| `PRAXYS_INBOUND_ALLOWED_IPS` | vacío | IPs o CIDR separados por coma. Ej: `1.2.3.4,10.0.0.0/8` |
| `PRAXYS_INBOUND_API_KEY` | vacío | Si se define, exige `x-api-key` |
| `PRAXYS_INBOUND_ENFORCE_HTTPS` | `false` | `true` exige HTTPS |
| `PRAXYS_INBOUND_EVENTS_TTL_DAYS` | `180` | Retención del payload en la colección `praxysevents` |
| `TRUST_PROXY` | vacío | `true`, cantidad de hops (`1`) o subred. En producción preferir hops/CIDR exactos antes que `true` |

> **Importante:** `TRUST_PROXY` debe reflejar la topología real del despliegue. Si no se configura,
> `req.ip` no verá la IP de Praxys detrás del proxy y la allowlist rechazará las requests.
> Usar un número de hops (`1`) o un CIDR. `true` también funciona, pero en producción es preferible
> limitar la confianza a la cantidad exacta de proxies.

## 4. Idempotencia y reintentos

Praxys puede reintentar hasta 5 veces. El servicio registra cada evento en la colección
`praxysevents` con una clave de idempotencia única:

| Evento | Clave |
|---|---|
| Alta de prescripción | `alta:{hash}` |
| Anulación de prescripción | `anulacion-prescripcion:{hash}` |
| Anulación de receta | `anulacion-receta:{hash}` |
| Dispensa | `dispensa:{hash}:{numeroAutorizacion}` |
| Anulación de dispensa | `anulacion-dispensa:{hash}` |

Comportamiento:

- Repetir un alta o una anulación responde `2xx` sin duplicar efectos.
- Repetir la misma dispensa (mismo `numeroAutorizacion`) responde `200` sin duplicar renglones.
- Un hash desconocido en anulación o dispensa responde `404`; Praxys puede reintentar.
- Un alta con hash desconocido responde `201/200` con `estado: "desconocido"` y queda guardada
  en el inbox. Si después llega la receta local, un reintento la vincula.
- Nunca se responde `500` por un duplicado.

## 5. Efectos sobre el estado de la receta

| Evento | `estadoActual` | `estadoDispensaActual` | `status` para SIFAHO |
|---|---|---|---|
| Dispensa total | `finalizada` | `dispensada` | `Dispensada` |
| Dispensa parcial | sin cambio | `dispensa-parcial` | `Dispensada` (el job reconcilia) |
| Anulación de prescripción/receta | `eliminada` | sin cambio | `Rechazada` |
| Anulación de dispensa | sin cambio | `sin-dispensa` + `cancelada` | `Pendiente` si no está eliminada |

La dispensa guarda `numeroAutorizacion` y `sistema: "praxys"`. La receta anulada deja de
aparecer en las consultas por estado vigente/pendiente que usa SIFAHO.

## 6. Checklist de puesta en marcha

### 6.1 Datos que necesitamos de Praxys

- [ ] IPs o rangos CIDR de **egreso** desde donde se van a conectar (producción y pruebas).
      Incluir todas las IPs de NAT/proxy/salida y un contacto para cambios.
- [ ] Ambiente(s) que van a usar (pruebas y/o producción) y ventana de pruebas.
- [ ] Confirmación de la versión del contrato RPE que implementan (fecha del documento).
- [ ] Volumen estimado de eventos y horario de operación.
- [ ] Política de timeout y reintentos de su cliente HTTP.
- [ ] Contacto técnico y canal para incidentes.
- [ ] Canal seguro para recibir la `x-api-key` (no enviarla por email ni chat).

### 6.2 Lo que RecetAR entrega

- [ ] URL base HTTPS del entorno de pruebas (`https://recetartest.andes.gob.ar/api/praxys`).
- [ ] `x-api-key` generada y entregada por canal seguro.
- [ ] Este documento, el OpenAPI acotado y la referencia HTML/Navegable.
- [ ] Coordinación de datos de prueba (hashes de prescripción y receta existentes).
- [ ] Contacto técnico de RecetAR.

Generar una API key (32 bytes en hexadecimal):

```bash
openssl rand -hex 32
```

Configurarla en el entorno y reiniciar el servicio:

```bash
PRAXYS_INBOUND_ENABLED=true
PRAXYS_INBOUND_ALLOWED_IPS=<ips-de-praxys>
PRAXYS_INBOUND_API_KEY=<api-key-generada>
PRAXYS_INBOUND_ENFORCE_HTTPS=true
TRUST_PROXY=<hops-o-subred-del-proxy>
```

### 6.3 Verificación del despliegue

Antes de avisarle a Praxys que el entorno está listo:

1. Desde una IP autorizada, un `POST` con payload inválido debe responder `422`, no `417` ni HTML.
2. Desde una IP no autorizada debe responder `403`.
3. Con `x-api-key` incorrecta debe responder `403`.
4. Con la clave correcta y un hash desconocido, `DELETE /recetas/{hash}` debe responder `404`
   con el envelope de RecetAR.
5. El log del servicio debe mostrar la request y la IP resuelta.

> Si recibís `417` con `{"message":"Debe iniciar sesión"}`, el entorno todavía no está expuesto
> correctamente para este servicio. Reportalo a RecetAR antes de continuar con las pruebas.

## 7. Ejemplos

### Alta de prescripción

```bash
curl -i -X POST https://recetartest.andes.gob.ar/api/praxys/prescripciones \
  -H "Content-Type: application/json" \
  -H "x-api-key: <api-key>" \
  -d '{
    "id": 1,
    "hash": "hash-prescripcion",
    "fecha": "2026-10-29T10:00:00",
    "idAtencion": "AT-1",
    "prescriptor": {
      "nombre": "Nombre del médico",
      "matricula": "12345",
      "tipoMatricula": "P",
      "idProvinciaMatricula": "S",
      "cuit": "20223598276"
    },
    "beneficiario": {
      "numero": "1894390300",
      "nombre": "JUAN PEREZ",
      "tipoDocumento": "DNI",
      "numeroDocumento": 18943903
    },
    "recetas": [
      { "hash": "hash-receta-1", "fecha": "2026-10-29", "numero": "10015", "id": 123 }
    ],
    "renglones": [
      {
        "numeroRenglon": 1,
        "tipoPrescripcion": "G",
        "cantidadEnvases": 1,
        "cuir": "CUIR-1"
      }
    ]
  }'
```

### Dispensa

```bash
curl -i -X POST https://recetartest.andes.gob.ar/api/praxys/recetas/hash-receta-1/dispensa \
  -H "Content-Type: application/json" \
  -H "x-api-key: <api-key>" \
  -d '{
    "fecha": "2026-10-29T10:00:00",
    "receta": { "fecha": "2026-10-01", "numero": "10015" },
    "dispensa": {
      "numeroAutorizacion": "00301003244905",
      "renglones": [
        { "producto": { "descripcion": "Ibuprofeno" }, "cantidadEnvases": 1 }
      ]
    }
  }'
```

### Anulación de receta

```bash
curl -i -X DELETE https://recetartest.andes.gob.ar/api/praxys/recetas/hash-receta-1 \
  -H "x-api-key: <api-key>"
```

### Anulación de dispensa

```bash
curl -i -X DELETE https://recetartest.andes.gob.ar/api/praxys/recetas/hash-receta-1/dispensa \
  -H "x-api-key: <api-key>"
```

## 8. Matriz de pruebas sugerida

| # | Caso | Request | Resultado esperado |
|---|---|---|---|
| 1 | IP no autorizada | Cualquier endpoint desde otra IP | `403 FORBIDDEN` |
| 2 | API key ausente/incorrecta | Cualquier endpoint | `403 FORBIDDEN` |
| 3 | Alta desconocida | `POST /prescripciones` con hash nuevo | `201`, `estado: desconocido` |
| 4 | Alta repetida | Repetir el caso 3 | `200`, `duplicate: true` |
| 5 | Alta vinculada | `POST /prescripciones` con hash local existente | `201`, `linked: true` |
| 6 | Dispensa total | `POST /recetas/{hash}/dispensa` | `200`, receta `Dispensada` |
| 7 | Dispensa repetida | Repetir con mismo `numeroAutorizacion` | `200`, sin duplicar |
| 8 | Dispensa desconocida | `POST` con hash inexistente | `404 RECURSO_NOT_FOUND` |
| 9 | Anulación de receta | `DELETE /recetas/{hash}` | `200`, receta `eliminada`/`Rechazada` |
| 10 | Anulación de dispensa | `DELETE /recetas/{hash}/dispensa` | `200`, `Pendiente` salvo eliminada |
| 11 | Payload inválido | `POST` sin `dispensa` o sin `renglones` | `422 VALIDATION_ERROR` |
| 12 | Superficie deshabilitada | `PRAXYS_INBOUND_ENABLED=false` | `404` |

## 9. Pruebas en local (repositorio público)

El repositorio es público: <https://github.com/andes/recetar-api>.
La rama de trabajo es `refactor-mati`.

### Requisitos

- Node.js 24.x (ver `.nvmrc`).
- MongoDB 4.x+ local o en contenedor.
- `npm` 10+.

### Pasos

```bash
git clone https://github.com/andes/recetar-api.git
cd recetar-api
git checkout refactor-mati

source "$HOME/.nvm/nvm.sh"
nvm use

npm ci

# MongoDB local (ejemplo con Docker)
docker run -d --name recetar-mongo -p 27017:27017 mongo:4.4

cp .env.example .env
```

Configuración mínima de `.env` para probar la recepción de eventos:

```bash
PORT=4000
API_URI_PREFIX=/api
MONGODB_URI=mongodb://localhost/recetar

PRAXYS_INBOUND_ENABLED=true
PRAXYS_INBOUND_ALLOWED_IPS=
PRAXYS_INBOUND_API_KEY=dev-praxys-key
PRAXYS_INBOUND_ENFORCE_HTTPS=false
TRUST_PROXY=
```

> En desarrollo, con `PRAXYS_INBOUND_ALLOWED_IPS` vacío y `NODE_ENV` distinto de `production`,
> el guard permite el acceso. En producción la lista vacía rechaza todo.

Levantar la API:

```bash
npm run dev
```

- API: <http://localhost:4000/api>
- Documentación interactiva (Scalar): <http://localhost:4000/api-docs>

Generar el OpenAPI completo en la raíz:

```bash
npm run docs:build
```

Generar el paquete acotado a Praxys (OpenAPI + HTML autocontenido):

```bash
npm run docs:build:praxys
# Salida por defecto: dist/praxys-docs/openapi.json y api-reference.html
```

Cuando la URL del entorno de pruebas esté definida, regenerar el paquete apuntando a esa URL:

```bash
PRAXYS_DOCS_SERVER_URL=https://recetartest.andes.gob.ar/api npm run docs:build:praxys
```

### Smoke test local

Un alta con un hash que no existe localmente valida la superficie y el envelope:

```bash
curl -i -X POST http://localhost:4000/api/praxys/prescripciones \
  -H "Content-Type: application/json" \
  -H "x-api-key: dev-praxys-key" \
  --data @tests/fixtures/praxys/prescripcion.json
```

Resultado esperado: `201` con `estado: "desconocido"`.

La dispensa con ese mismo hash responde `404` (no hay receta local asociada):

```bash
curl -i -X POST http://localhost:4000/api/praxys/recetas/1234567890/dispensa \
  -H "Content-Type: application/json" \
  -H "x-api-key: dev-praxys-key" \
  --data @tests/fixtures/praxys/dispensa.json
```

Para probar los efectos de dispensa/anulación hace falta una receta local con los
identificadores de Praxys. Se pueden inspeccionar con Mongo:

```bash
mongosh recetar --eval 'db.prescriptions.find(
  { "identificadoresExternos.entidad": "praxys" },
  { identificadoresExternos: 1, estadoActual: 1, estadoDispensaActual: 1 }
).limit(5)'
```

- `identificadoresExternos` con `entidad: "praxys"` → hash de prescripción.
- `identificadoresExternos` con `entidad: "praxys-receta"` → hash de receta.

También se puede correr el e2e del circuito, que usa una base en memoria:

```bash
npx jest tests/modules/prescriptions/praxys-events-e2e.test.ts
```

## 10. Operación y diagnóstico

Cada evento entrante queda en la colección `praxysevents`:

```bash
mongosh recetar --eval 'db.praxysevents.find(
  { hash: "hash-receta-1" },
  { tipo: 1, estado: 1, prescriptionId: 1, recibidoEn: 1, numeroAutorizacion: 1 }
).sort({ recibidoEn: -1 }).limit(10)'
```

- `estado: procesado` → evento aplicado.
- `estado: desconocido` → no se encontró la receta local; el alta queda guardada para un reintento.
- `estado: error` → falló la proyección; revisar `payload` y logs del servicio.

El payload se elimina automáticamente después de `PRAXYS_INBOUND_EVENTS_TTL_DAYS` días.
El inbox no se expone por API pública.

## 11. Limitaciones y follow-ups

- La `x-api-key` es única por entorno (no hay claves por consumidor).
- No hay mTLS ni firma de requests.
- El rate limiting es el global del servicio; no hay uno específico para `/praxys`.
- La allowlist usa IPs/CIDR IPv4.
- Con múltiples proxies, validar que la IP resuelta sea la de Praxys y no la del proxy.
- La creación local de prescripciones originadas exclusivamente en Praxys está fuera de alcance.
- El mapeo completo de obra social, matrícula, CIE10 y CUIT/CUIL del prescriptor queda como
  follow-up del circuito.
