# RecetAR API

API de prescripciones médicas electrónicas. Sistema de recetas electrónicas de la provincia de Neuquén, integrado con ANDES.

## Autenticación

La API usa JWT (JSON Web Token) con algoritmo HS256. Los tokens se envían mediante el header `Authorization: Bearer <token>`.

## Formato de respuesta

Todas las respuestas siguen el formato:

```json
{
  "status": "success" | "error",
  "data": { ... },
  "error": {
    "code": "ERROR_CODE",
    "message": "Descripción del error"
  }
}
```
