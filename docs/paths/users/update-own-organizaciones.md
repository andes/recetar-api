## PATCH /users/me/organizaciones

Actualiza las organizaciones del usuario autenticado.

### Detalle

- Solo el propio usuario puede modificar sus organizaciones.
- Reemplaza completamente el array de organizaciones.
- Cada organización puede tener `nombre` y `dirección`.

### Ejemplo cURL

```bash
curl -s -X PATCH http://localhost:4000/api/users/me/organizaciones \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"organizaciones":[{"nombre":"Hospital Central","direccion":"Calle 123"}]}'
```
