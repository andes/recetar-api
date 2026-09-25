# Documentación de Endpoints - Praxis

## Endpoints disponibles

| Método | Endpoint | Descripción | Documentación |
|--------|----------|-------------|---------------|
| POST | `/prescriptions/praxis` | Crear prescripción en Praxis | [create.md](create.md) |
| GET | `/prescriptions/praxis/:id/pdf` | Obtener PDF de prescripción | [pdf.md](pdf.md) |
| DELETE | `/prescriptions/praxis/:id` | Anular prescripción | [annul.md](annul.md) |

## Autenticación

Todos los endpoints requieren un token JWT válido en el header:

```
Authorization: Bearer <token>
```

## Formato de respuesta

Todos los endpoints retornan respuestas en el formato estándar de RecetAR:

**Éxito:**
```json
{
  "status": "success",
  "data": { ... }
}
```

**Error:**
```json
{
  "status": "error",
  "error": {
    "code": "ERROR_CODE",
    "message": "Mensaje descriptivo"
  }
}
```

## Variables de entorno requeridas

```bash
PRAXYS_ENDPOINT=http://localhost:4000/
PRAXYS_API_KEY=tu-api-key-aqui
```

## Errores comunes

| Código HTTP | Descripción |
|-------------|-------------|
| 401 | Token inválido o no proporcionado |
| 404 | Prescripción no encontrada |
| 422 | Error de validación |
| 500 | Error de conexión con Praxis |

## Ejemplos de uso

Ver los archivos de documentación individuales para ejemplos cURL y código de ejemplo.
