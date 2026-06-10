## PATCH /users/{id}

Actualiza los datos de un usuario existente.

### Detalle

- Solo se actualizan los campos enviados (PATCH parcial).
- Si se cambia `email`, se verifica unicidad.
- Si se cambia `isActive`, se registra quién y cuándo en el campo `activation`.
- Si el usuario es `pharmacist` y se cambia el email, el username se actualiza al nuevo email.
- Los roles se reemplazan completamente si se envía `roles`.

### Ejemplo cURL

```bash
curl -s -X PATCH http://localhost:4000/api/users/507f1f77bcf86cd799439011 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"businessName":"Nombre Actualizado","isActive":true}'
```
