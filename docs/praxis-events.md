# Praxis - eventos inbound (RPE)

Recepción de los eventos de ciclo de vida que Praxis envía al servicio REST descrito en "RPe - Envío de prescripciones a servicios REST".

## Base URL

Praxis configura la URL base del servicio:

```
https://<host>/api/praxis
```

Las rutas son relativas a esa base:

| Método | Ruta | Operación |
|---|---|---|
| POST | `/prescripciones` | Prescripción emitida |
| DELETE | `/prescripciones/:hash` | Anulación de prescripción |
| DELETE | `/recetas/:hash` | Anulación de receta |
| POST | `/recetas/:hash/dispensa` | Dispensa de receta |
| DELETE | `/recetas/:hash/dispensa` | Anulación de dispensa |

## Seguridad

- HTTPS en el borde (el servicio escucha HTTP detrás del proxy).
- Allowlist de IPs de egreso de Praxis.
- Opcionalmente, header `x-api-key` compartido.
- En producción, si la allowlist está vacía, se rechaza todo (fail closed).
- `PRAXIS_INBOUND_ENABLED=false` deshabilita la superficie y devuelve 404.

Variables:

| Variable | Default | Descripción |
|---|---|---|
| `PRAXIS_INBOUND_ENABLED` | `true` | Prende/apaga la recepción |
| `PRAXIS_INBOUND_ALLOWED_IPS` | vacío | IPs o CIDR separados por coma (`1.2.3.4,10.0.0.0/8`); `*` permite todo |
| `PRAXIS_INBOUND_API_KEY` | vacío | Si se define, exige `x-api-key` |
| `PRAXIS_INBOUND_ENFORCE_HTTPS` | `false` | Exige `https` o `x-forwarded-proto: https` |
| `PRAXIS_INBOUND_EVENTS_TTL_DAYS` | `180` | Retención del payload en `praxisEvents` |
| `TRUST_PROXY` | vacío | `true`, cantidad de hops (`1`) o subred; necesario detrás de un proxy para IP y HTTPS |

`trust proxy` debe estar configurado en el despliegue para que `req.ip` y `x-forwarded-proto` reflejen al cliente real. Sin `TRUST_PROXY`, el servicio usa `req.ip` y no confía en `x-forwarded-for`.

## Idempotencia

- Clave por evento: `tipo:hash` y, para dispensa, `dispensa:hash:numeroAutorizacion`.
- Los reintentos de Praxis (hasta 5) no duplican altas, anulaciones ni dispensas.
- Un hash desconocido en anulación o dispensa responde 404; Praxis reintenta.
- Un alta desconocida se guarda en `praxisEvents` con estado `desconocido` y responde 2xx; si luego llega la prescripción local, el reintento la vincula.

## Efectos de estado

| Evento | `estadoActual` | `estadoDispensaActual` | `status` |
|---|---|---|---|
| Dispensa total | `finalizada` | `dispensada` | `Dispensada` |
| Dispensa parcial | sin cambio | `dispensa-parcial` | `Dispensada` (el job reconcilia) |
| Anulación de prescripción/receta | `eliminada` | sin cambio | `Rechazada` |
| Anulación de dispensa | sin cambio | `sin-dispensa` + `cancelada` | `Pendiente` si no está eliminada |

La receta anulada se expone como `estadoActual.tipo = 'eliminada'` y no aparece en las consultas por estado vigente/pendiente que usa SIFAHO. La dispensa guarda `numeroAutorizacion` y `sistema = 'praxis'`.

## Resolución de hashes

- `identificadoresExternos`:
  - `praxis` = hash de prescripción.
  - `praxis-receta` = hash de receta.
- `syncExterno.praxis` guarda `idPrescripcion`, `idAtencion`, `idReceta`, `numeroReceta`, `cuirs` y `contenidoQR`.
- El alta busca por hash de prescripción; si no aparece, por `idAtencion` y, como fallback de transición, por `idPrescripcion`.

## Inbox

Colección `praxisEvents`, con:

- `claveIdempotencia` única.
- `payload` con TTL (`PRAXIS_INBOUND_EVENTS_TTL_DAYS`).
- `estado`: `procesado`, `desconocido` o `error`.
- `prescriptionId` cuando se pudo vincular.

No se expone por API pública.

## Ejemplos

Alta:

```bash
curl -X POST https://<host>/api/praxis/prescripciones \
  -H "Content-Type: application/json" \
  -H "x-api-key: <key>" \
  -d '{
    "hash": "hash-prescripcion",
    "idAtencion": "AT-1",
    "recetas": [{ "hash": "hash-receta-1", "numero": "10015", "id": 123 }],
    "renglones": [{ "cantidadEnvases": 1, "cuir": "CUIR-1" }]
  }'
```

Dispensa:

```bash
curl -X POST https://<host>/api/praxis/recetas/hash-receta-1/dispensa \
  -H "Content-Type: application/json" \
  -H "x-api-key: <key>" \
  -d '{
    "fecha": "2026-10-29T10:00:00",
    "receta": { "fecha": "2026-10-01", "numero": "10015" },
    "dispensa": {
      "numeroAutorizacion": "00301003244905",
      "renglones": [{ "producto": { "descripcion": "Ibuprofeno" }, "cantidadEnvases": 1 }]
    }
  }'
```

Anulación de receta:

```bash
curl -X DELETE https://<host>/api/praxis/recetas/hash-receta-1 \
  -H "x-api-key: <key>"
```
