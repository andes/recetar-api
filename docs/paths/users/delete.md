## DELETE /users/{id}

Elimina definitivamente un usuario del sistema y lo desvincula de sus roles.

### Detalle

- Elimina el documento del usuario (borrado físico).
- Quita al usuario del arreglo `users` de todos los roles a los que estaba asociado.
- No se permite eliminar el propio usuario autenticado (responde `403`).
- Si el usuario no existe, responde `404`.

### Ejemplo cURL

```bash
curl -s -X DELETE http://localhost:4000/api/users/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer <token>"
```
