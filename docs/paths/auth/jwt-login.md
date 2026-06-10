## GET /auth/jwt-login

Verifica que el token JWT sea válido y devuelve un nuevo par (`jwt` + `refreshToken`).

### Detalle

- El token se envía como `Authorization: Bearer <token>`.
- Si el token es inválido o expiró, responde 401.
- Si es válido, genera un nuevo refreshToken y actualiza `lastLogin` del usuario.

### Diferencia con POST /auth/login

- `POST /auth/login` autentica con credenciales (identifier + password).
- `GET /auth/jwt-login` solo verifica el JWT, no requiere contraseña.
