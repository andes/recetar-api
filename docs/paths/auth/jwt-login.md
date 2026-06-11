## GET /auth/jwt-login

Verifica que el token JWT sea válido y devuelve un nuevo par (`jwt` + `refreshToken`).

### Detalle

- El token se envía como `Authorization: Bearer <token>`.
- Si el token es inválido o expiró, responde 401.
- Si es válido, genera un nuevo refreshToken y actualiza `lastLogin` del usuario.
- Al igual que `POST /auth/login`, sincroniza (best-effort) los datos del usuario con ANDES (matrícula, CUIL y nombre/apellido). Si ANDES no responde, la operación continúa con los datos previos.

### Diferencia con POST /auth/login

- `POST /auth/login` autentica con credenciales (identifier + password).
- `GET /auth/jwt-login` solo verifica el JWT, no requiere contraseña.
