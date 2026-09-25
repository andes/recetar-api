## GET /prescriptions/praxis/{id}/pdf

Obtiene el PDF de una prescripción electrónica generada en Praxis.

### Detalle

Este endpoint permite descargar el PDF de una prescripción que fue previamente creada en el sistema Praxis. El PDF se retorna en formato base64 para facilitar su manejo.

**Flujo interno:**
1. Envía GET a `/api/prescripciones/{id}/pdf` en Praxis
2. Recibe el PDF como buffer
3. Convierte a base64
4. Retorna el PDF junto con el content type

### Ejemplo cURL

```bash
curl -s -X GET http://localhost:4000/api/prescriptions/praxis/12345/pdf \
  -H "Authorization: Bearer $TOKEN"
```

### Respuesta exitosa (200)

```json
{
  "status": "success",
  "data": {
    "pdf": "JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PC9UeXBlL1hPYmplY3...</base64>",
    "contentType": "application/pdf"
  }
}
```

### Uso del PDF

Para usar el PDF en el frontend:

```typescript
// Decodificar base64 a Blob
const base64Response = await fetch(`data:application/pdf;base64,${response.data.pdf}`);
const blob = await base64Response.blob();

// Crear URL para descarga
const url = window.URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = `prescripcion-${id}.pdf`;
link.click();
```

### Errores comunes

| Código | Descripción |
|--------|-------------|
| 404 | Prescripción no encontrada en Praxis |
| 500 | Error de conexión con Praxis |
