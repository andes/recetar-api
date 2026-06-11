## GET /auth/professionals-andes/matriculas

Devuelve el **estado de matrícula de grado** de un profesional consultando ANDES.

### Detalle

- Requiere JWT (`Authorization: Bearer <token>`).
- Consulta a ANDES `GET /core/tm/profesionales/guia?documento=...` y calcula el estado de cada matrícula a partir de `profesiones[].matriculacion` (última matriculación de cada profesión).
- Estados posibles: `vigente`, `vencida`, `suspendida`, `sin-matricula`, `baja`.
  - `sin-matricula`: el profesional no tiene profesiones con matriculación.
  - `suspendida`: la profesión no está `matriculado`.
  - `baja`: la última matrícula tiene `baja.fecha`.
  - `vencida`: `fin` de la última matrícula anterior a hoy.
  - `vigente`: caso contrario.
- `estadoGeneral`: `vigente` si al menos una matrícula está vigente; si no, prioridad `vencida` → `suspendida` → `baja` → `sin-matricula` (con `matriculas: []` cuando no hay profesiones matriculadas).
- Si ANDES no responde, responde `502` (`BAD_GATEWAY`).

### Parámetros

| Nombre | Ubicación | Requerido | Descripción |
|---|---|---|---|
| `documento` | query | Sí | Documento del profesional |

### Respuesta 200

```json
{
  "status": "success",
  "data": {
    "documento": "30123456",
    "nombre": "Ana",
    "apellido": "Pérez",
    "profesionalMatriculado": true,
    "estadoGeneral": "vigente",
    "matriculas": [
      {
        "profesion": "Médico",
        "codigo": 1,
        "numero": 12345,
        "inicio": "2019-01-01T00:00:00.000Z",
        "fin": "2029-01-01T00:00:00.000Z",
        "baja": null,
        "estado": "vigente"
      }
    ]
  }
}
```

### Ejemplo cURL

```bash
curl -s "http://localhost:4000/api/auth/professionals-andes/matriculas?documento=30123456" \
  -H "Authorization: Bearer $TOKEN"
```
