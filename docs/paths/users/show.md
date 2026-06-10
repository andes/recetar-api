## GET /users/{id}

Obtiene los datos completos de un usuario por su ID.

### Detalle

- Si el usuario está inactivo (`isActive: false`), responde 404.
- Retorna roles populados con `role` y `description`.

### Ejemplo cURL

```bash
curl -s -X GET http://localhost:4000/api/users/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer <token>"
```
