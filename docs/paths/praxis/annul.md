## DELETE /prescriptions/praxis/{id}

Anula una prescripción electrónica existente en Praxis.

### Detalle

Este endpoint permite anular una prescripción que fue previamente creada en el sistema Praxis. Una vez anulada, la prescripción queda marcada como inválida y no puede ser dispensada.

**Reglas de negocio:**
- Solo se pueden anular prescripciones que existan en Praxis
- La anulación es definitiva
- Se recomienda registrar el motivo de anulación en el sistema local

**Flujo interno:**
1. Envía DELETE a `/api/prescripciones/{id}` en Praxis
2. Praxis marca la prescripción como anulada
3. Se retorna código 204 sin contenido

### Ejemplo cURL

```bash
curl -s -X DELETE http://localhost:4000/api/prescriptions/praxis/12345 \
  -H "Authorization: Bearer $TOKEN"
```

### Respuesta exitosa (204)

Sin contenido. La prescripción fue anulada exitosamente.

### Errores comunes

| Código | Descripción |
|--------|-------------|
| 404 | Prescripción no encontrada en Praxis |
| 500 | Error de conexión con Praxis |

### Notas para el frontend

```typescript
// Ejemplo de uso
const response = await fetch(`/api/prescriptions/praxis/${prescriptionId}`, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

if (response.status === 204) {
  // Prescripción anulada exitosamente
  showSuccess('Prescripción anulada');
} else {
  // Manejar error
  showError('Error al anular prescripción');
}
```
