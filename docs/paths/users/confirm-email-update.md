## POST /users/confirm-email-update

Confirma el cambio de email usando el token recibido por email.

### Detalle

- Endpoint público (no requiere token JWT) porque se accede desde un link en el email.
- Si el usuario es `pharmacist`, su `username` también se actualiza al nuevo email.
- El token expira a las 24 horas de generado.

### Ejemplo cURL

```bash
curl -s -X POST http://localhost:4000/api/users/confirm-email-update \
  -H "Content-Type: application/json" \
  -d '{"token":"abc123token..."}'
```
