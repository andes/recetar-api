# Skill: Refactorización de recetar-api

## Descripción
Skill que guía la escritura de código nuevo en `src/` durante la refactorización de `recetar-api`. Se aplica cuando se crean o modifican archivos dentro de `src/` (no en `src-legacy/`).

## Activación
Cargar este skill cuando el agente necesite:
- Crear un nuevo módulo en `src/modules/`
- Refactorizar un controlador legacy a la nueva arquitectura
- Escribir un service, repository, mapper o DTO
- Manejar errores o respuestas HTTP
- Integrar con ANDES u otros sistemas externos

## Estructura del proyecto

### Árbol completo de `src/`
```
src/
├── modules/                         # Dominios de negocio
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.repository.ts
│   │   ├── auth.routes.ts
│   │   ├── auth.dto.ts             # Schemas Zod
│   │   └── auth.errors.ts          # Errores específicos
│   ├── prescriptions/
│   │   ├── prescription.controller.ts
│   │   ├── prescription.service.ts
│   │   ├── prescription.repository.ts
│   │   ├── prescription.routes.ts
│   │   ├── prescription.dto.ts
│   │   └── prescription.errors.ts
│   ├── patients/
│   │   └── ...
│   ├── professionals/
│   │   └── ...
│   ├── pharmacists/
│   │   └── ...
│   ├── certificates/
│   │   └── ...
│   ├── practices/
│   │   └── ...
│   ├── supplies/
│   │   └── ...
│   └── stock/
│       └── ...
│
├── integrations/                    # Sistemas externos
│   ├── andes/
│   │   ├── andes.client.ts         # Llamadas HTTP a ANDES (sin req/res)
│   │   ├── andes.mapper.ts         # Transformación bidireccional
│   │   ├── andes.types.ts          # Tipos específicos de ANDES
│   │   └── index.ts
│   ├── email/
│   │   └── ...
│   └── index.ts
│
├── shared/                          # Infraestructura común
│   ├── lang/
│   │   ├── es.ts                     # Textos centralizados (errores, logs, etc.)
│   │   └── index.ts                 # Función t(path) para resolver textos por key
│   ├── errors/
│   │   ├── base.error.ts            # ApiError abstracto (usa messageKey)
│   │   ├── not-found.error.ts
│   │   ├── validation.error.ts
│   │   ├── auth.error.ts
│   │   ├── forbidden.error.ts
│   │   ├── internal.error.ts
│   │   ├── business.error.ts
│   │   └── index.ts
│   ├── logger/
│   │   ├── logger.interface.ts
│   │   └── logger.ts
│   ├── middlewares/
│   │   ├── error-handler.ts
│   │   ├── auth.middleware.ts
│   │   ├── roles.middleware.ts
│   │   └── validate.middleware.ts
│   └── api-response.ts
│
├── models/                          # Schemas Mongoose (contenido no se modifica)
│   ├── prescription.model.ts
│   ├── patient.model.ts
│   ├── user.model.ts
│   └── ...
│
├── routes/
│   └── routes.ts                    # Compositor de rutas
│
├── config/
│   └── config.ts
├── database/
│   └── dbconfig.ts
└── server.ts
```

## Reglas de arquitectura

### Capas y responsabilidades

| Capa | Responsabilidad | NO debe hacer |
|---|---|---|
| **Controller** | Extraer datos de `req`, llamar al service, devolver `res` con `ApiResponse` | Lógica de negocio, queries a DB, importar modelos |
| **Service** | Lógica de negocio, orquestar repos + mappers + otras integraciones | Importar `Request`/`Response` de Express, hacer queries directas |
| **Repository** | Queries a MongoDB (find, save, aggregate, paginate) | Lógica de negocio, transformaciones, llamadas HTTP |
| **Mapper** | Transformar datos entre formatos (ANDES ↔ local) | Llamadas HTTP, acceso a DB, lógica de negocio |
| **Routes** | Definir método + path + middlewares + controlador | Lógica de negocio |
| **Model** | Schema Mongoose. Su contenido (campos, tipos, índices) **no se modifica**. Si hay lógica de negocio incrustada, se extrae a services/repositories | No debe contener lógica de negocio, transformaciones ni llamadas externas |

### Convenciones por capa

**Controller:**
- Métodos como arrow functions: `public create = async (req, res, next) => { ... }`
- Máximo 10 líneas por método
- Usar `next` para que Express capture errores automáticos
- NO usar `try/catch` (los errores fluyen al error handler vía `next`)

```typescript
public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const dto = req.body as CreatePrescriptionDTO;
    const prescription = await this.prescriptionService.create(dto, req.user);
    res.status(201).json(ApiResponse.success(prescription));
};
```

**Service:**
- Recibir datos tipados, devolver datos tipados
- No depender de Express (`req`, `res`, `next`)
- Usar repositorios para persistencia, mappers para transformaciones

```typescript
public async create(dto: CreatePrescriptionDTO, user: UserToken): Promise<Prescription> {
    const patient = await this.patientService.findOrCreate(dto.patient);
    const prescription = await this.prescriptionRepository.create({ ...dto, patient: patient.id });
    if (dto.scope === 'public') {
        await this.andesClient.sendPrescription(this.andesMapper.toAndes(prescription));
    }
    return prescription;
}
```

**Repository:**
- Métodos CRUD con nombres semánticos: `findById`, `findByUser`, `create`, `update`, `delete`
- Devolver documentos Mongoose o planos (lean)

```typescript
public async findById(id: string): Promise<IPrescription | null> {
    return this.prescriptionModel.findById(id).lean().exec();
}
```

**Mapper (integraciones):**
- Clase con métodos estáticos, sin estado
- Mapeo bidireccional: `toLocal(payload)` y `toAndes(entity)`
- Testeable unitariamente

## Textos centralizados (lang)

Todos los mensajes (errores, logs, etc.) se definen en `src/shared/lang/es.ts` organizados por key jerárquica. El handler los resuelve automáticamente:

```typescript
import { t } from '../lang';
t('errors.notFound.patient');            // "Paciente no encontrado"
t('errors.validation.default');          // "Error de validación"
t('errors.internal.default');            // "Error interno del servidor"
t('ruta.inexistente', 'fallback');       // "fallback" si la key no existe
```

## Manejo de errores

### Jerarquía de errores

```
ApiError (abstracta) — usa messageKey en vez de texto directo
├── NotFoundError      → 404, code: 'RECURSO_NOT_FOUND'
├── ValidationError    → 422, code: 'VALIDATION_ERROR', incluye details[]
├── AuthError          → 401, code: 'UNAUTHORIZED'
├── ForbiddenError      → 403, code: 'FORBIDDEN'
├── InternalError      → 500, code: 'INTERNAL_ERROR'
└── BusinessError      → 409, code: 'BUSINESS_RULE_VIOLATION'
```

### Uso en services
```typescript
throw new NotFoundError('errors.notFound.patient');
throw new ValidationError('errors.validation.invalidDni', [{ field: 'dni', message: 'Debe tener 6-11 caracteres' }]);
```

### Formato de respuesta único

Éxito:
```json
{ "status": "success", "data": { ... } }
```

Error (el texto se resuelve desde lang/es.ts):
```json
{ "status": "error", "error": { "code": "NOT_FOUND", "message": "Paciente no encontrado", "details": [] } }
```

### Error handler middleware
- Si es `ApiError` → resolver `messageKey` con `t()` y devolver formato estándar con su status
- Si NO es `ApiError` → loguear, devolver `InternalError` (500) sin stack trace

## Validación con Zod

- Cada módulo tiene su `*.dto.ts` con schemas Zod
- Usar `validate.middleware.ts` para validar body/params/query antes de llegar al controller

```typescript
// auth.dto.ts
export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});
export type LoginDTO = z.infer<typeof loginSchema>;
```

## Logger
- `shared/logger/logger.interface.ts` define el contrato: `logError`, `logInfo`, `logWarn`
- `shared/logger/logger.ts` implementa con Sentry en prod, console en dev
- Los services reciben el logger por inyección, nunca usan `console.log` directamente
- La tecnología concreta (Sentry, DataDog, etc.) se configura en el wrapper, no se filtra al negocio

## Integraciones (ANDES, email, futuras)

- Cada integración en `integrations/<nombre>/`
- `*.client.ts` → llamadas HTTP (usa `needle`, `axios`, etc.)
- `*.mapper.ts` → transformación de datos
- `*.types.ts` → tipos específicos de la integración
- Los módulos importan desde `integrations/andes/`; nunca al revés

## Seguridad

- **NUNCA** hardcodear secrets (JWT_SECRET, API keys) en el código
- Leer variables de entorno con `process.env.VAR` y validar en startup
- CORS explícito con orígenes permitidos según entorno
- Rate limiting en endpoints sensibles (login, register)
- Sanitizar parámetros de query antes de usarlos en URLs externas

## Nomenclatura

| Elemento | Convención | Ejemplo |
|---|---|---|
| Archivo controller | `*.controller.ts` | `prescription.controller.ts` |
| Archivo service | `*.service.ts` | `prescription.service.ts` |
| Archivo repository | `*.repository.ts` | `prescription.repository.ts` |
| Archivo routes | `*.routes.ts` | `auth.routes.ts` |
| Archivo DTO | `*.dto.ts` | `prescription.dto.ts` |
| Archivo errors | `*.errors.ts` | `auth.errors.ts` |
| Archivo mapper | `*.mapper.ts` | `andes.mapper.ts` |
| Clase controller | PascalCase + `Controller` | `PrescriptionController` |
| Clase service | PascalCase + `Service` | `PrescriptionService` |
| Clase repository | PascalCase + `Repository` | `PrescriptionRepository` |
| Métodos controller | create, show, index, update, delete | `public create = async` |
| Métodos service | verbos de negocio | `findOrCreate`, `dispense`, `cancelDispense` |

## Orden de refactorización

Seguir este orden respetando las dependencias entre módulos. Cada módulo queda "completo" (controller + service + repository + dto + routes + errors) antes de pasar al siguiente.

### Fases

| Fase | Módulos | Justificación |
|---|---|---|
| 0 | `shared/` (errores, logger, middlewares, api-response) | Base de todo, nada depende de esto |
| 1 | `integrations/andes/`, `integrations/email/` | Requeridos por los módulos de negocio |
| 2 | `modules/auth/`, `modules/patients/`, `modules/professionals/`, `modules/pharmacists/`, `modules/supplies/`, `modules/practices/` | Módulos semilla sin dependencias entre sí |
| 3 | `modules/prescriptions/`, `modules/certificates/`, `modules/stock/` | Módulos compuestos que dependen de fase 2 |

### Checklist de progreso

```
[ ] shared/                  — Fase 0
[x] integrations/andes/      — Fase 1
[x] integrations/email/      — Fase 1
[x] modules/auth/            — Fase 2
[x] modules/patients/        — Fase 2
[x] modules/professionals/   — Fase 2
[x] modules/pharmacists/     — Fase 2
[x] modules/supplies/        — Fase 2
[x] modules/practices/       — Fase 2
[ ] modules/prescriptions/   — Fase 3
[ ] modules/certificates/    — Fase 3
[ ] modules/stock/           — Fase 3
```

## Flujo de migración (src-legacy → src)

0. **Los modelos Mongoose no cambian de contenido.** Si un modelo tiene lógica de negocio incrustada (ej: `findOrCreatePatient`, hooks `post('save')`), se extrae al service/repository. Los schemas (campos, tipos, índices) se mantienen igual. Su ubicación puede ser `src/models/` (centralizado) o dentro de `src/modules/*/` si se prefiere.
1. Identificar el controller/funcionalidad en `src-legacy/`
2. Si el módulo no existe en `src/modules/`, crearlo con la estructura estándar
3. **Revisar endpoints del módulo contra REST**:
   - `GET /recurso` → listar/index
   - `GET /recurso/:id` → show
   - `POST /recurso` → create
   - `PATCH /recurso/:id` → update
   - `DELETE /recurso/:id` → delete
   - Acciones como `dispense`, `cancel-dispense`, `search` → evaluar si son sub-recursos (`POST /:id/dispense`) o filtros de query (`GET /?search=...`)
   - Mantener rutas existentes que estén bien; rediseñar las que no cumplan
4. Extraer lógica de negocio al service
5. Extraer queries al repository (si aplica)
6. Definir DTOs de entrada/salida
7. Refactorizar el controller a 5-10 líneas
8. Verificar con `npm run build && npm run lint`
9. No borrar ni modificar archivos en `src-legacy/`

## Verificación manual de endpoints

Después de refactorizar un módulo, verificar que los endpoints funcionan antes de darlo por completo.

### Setup

```bash
# 1. Compilar y levantar servidor
npm run build; if ($?) { npm run dev }
```

> Las rutas en los ejemplos curl son **tentativas** y pueden cambiar durante la refactorización de cada módulo según el análisis REST. Actualizar los ejemplos cuando se modifique una ruta.

### Obtener token JWT

```bash
# Login exitoso → extraer token
curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"profesional@test.com","password":"123456"}' | jq -r '.data.token'
```

Guardar para usar en requests protegidos:

```bash
TOKEN="eyJhbGciOiJSUzI1NiIs..."
```

### Ejemplos curl por módulo

#### shared/ (errores y ApiResponse)

```bash
# Ruta inexistente → 404 con formato estándar
curl -s http://localhost:8080/api/ruta-inexistente | jq .

# Sin cabecera Content-Type → 422
curl -s -X POST http://localhost:8080/api/patients \
  -H "Authorization: Bearer $TOKEN" \
  -d 'invalido' | jq .
```

#### auth/

```bash
# POST /auth/login → 200 + token
curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"profesional@test.com","password":"123456"}' | jq .

# POST /auth/login → 401 (credenciales inválidas)
curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"mal@test.com","password":"xxx"}' | jq .

# POST /auth/login → 422 (body incompleto)
curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test"}' | jq .

# POST /auth/register → 201
curl -s -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nuevo@test.com",
    "password": "123456",
    "nombre": "Nuevo",
    "apellido": "Profesional",
    "matricula": "MAT001"
  }' | jq .

# POST /auth/register → 422 (datos inválidos)
curl -s -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"invalido"}' | jq .

# GET /auth/jwt-login → 401 (sin token)
curl -s http://localhost:8080/api/auth/jwt-login | jq .

# GET /auth/jwt-login → 200 (con token)
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/auth/jwt-login | jq .
```

#### patients/

```bash
# GET /patients → 200 + lista paginada
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/patients?skip=0&limit=10" | jq .

# GET /patients → 401 (sin token)
curl -s "http://localhost:8080/api/patients" | jq .

# GET /patients/:id → 200 + paciente
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/patients/ID_DEL_PACIENTE" | jq .

# GET /patients/:id → 404 (id inexistente)
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/patients/000000000000000000000000" | jq .

# GET /patients/get-by-dni/12345678 → 200 + paciente | [] si no existe
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/patients/get-by-dni/12345678" | jq .

# POST /patients → 201 + paciente creado
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "documento": "12345678",
    "sexo": "masculino",
    "nombre": "Juan",
    "apellido": "Perez",
    "fechaNacimiento": "1990-01-15"
  }' "http://localhost:8080/api/patients" | jq .

# POST /patients → 422 (validación falla)
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"documento":""}' "http://localhost:8080/api/patients" | jq .
```

#### professionals/

```bash
# GET /professionals → 200
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/professionals" | jq .

# GET /professionals/:id → 200
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/professionals/ID_DEL_PROFESIONAL" | jq .

# GET /professionals/:id → 404
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/professionals/000000000000000000000000" | jq .

# POST /professionals → 201
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Carlos",
    "apellido": "Gomez",
    "matricula": "MAT002",
    "especialidad": "medicina_general"
  }' "http://localhost:8080/api/professionals" | jq .

# POST /professionals → 422
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nombre":""}' "http://localhost:8080/api/professionals" | jq .
```

#### pharmacists/

```bash
# GET /pharmacists → 200
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/pharmacists" | jq .

# POST /pharmacists → 201
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Maria",
    "apellido": "Lopez",
    "matricula": "FARM001",
    "farmacia": "Farmacia Central"
  }' "http://localhost:8080/api/pharmacists" | jq .
```

#### supplies/

```bash
# GET /supplies → 200
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/supplies" | jq .

# GET /supplies/:id → 200
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/supplies/ID_DEL_INSUMO" | jq .

# POST /supplies → 201
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Ibuprofeno 400mg",
    "codigo": "IBU400",
    "presentacion": "comprimidos"
  }' "http://localhost:8080/api/supplies" | jq .
```

#### practices/

```bash
# GET /practices → 200
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/practices" | jq .

# POST /practices → 201
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Radiografía de tórax",
    "codigo": "RX001",
    "categoria": "diagnostico_por_imagenes"
  }' "http://localhost:8080/api/practices" | jq .
```

#### prescriptions/

```bash
# POST /prescriptions → 201 (ámbito privado)
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paciente": { "documento": "12345678", "sexo": "masculino" },
    "profesional": { "id": "ID_DEL_PROFESIONAL" },
    "ambito": "privado",
    "medicamentos": [
      { "nombre": "Ibuprofeno", "cantidad": 12, "presentacion": "comprimidos" }
    ]
  }' "http://localhost:8080/api/prescriptions" | jq .

# POST /prescriptions → 201 (ámbito público, llama a ANDES)
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paciente": { "documento": "12345678", "sexo": "masculino" },
    "profesional": { "id": "ID_DEL_PROFESIONAL" },
    "ambito": "publico",
    "medicamentos": [
      { "nombre": "Amoxicilina", "cantidad": 24, "presentacion": "comprimidos" }
    ]
  }' "http://localhost:8080/api/prescriptions" | jq .

# POST /prescriptions → 422 (datos inválidos)
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ambito":"publico"}' "http://localhost:8080/api/prescriptions" | jq .

# GET /prescriptions/user/:id → 200 + lista
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/prescriptions/user/ID_DEL_USUARIO" | jq .

# PATCH /prescriptions/:id/dispense → 200
curl -s -X PATCH -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/prescriptions/ID_DE_LA_RECETA/dispense" | jq .

# PATCH /prescriptions/:id/dispense → 422 (ya dispensada)
curl -s -X PATCH -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/prescriptions/ID_DE_LA_RECETA/dispense" | jq .

# PATCH /prescriptions/:id/cancel-dispense → 200
curl -s -X PATCH -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/prescriptions/ID_DE_LA_RECETA/cancel-dispense" | jq .

# DELETE /prescriptions/:id → 200 (receta pendiente)
curl -s -X DELETE -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/prescriptions/ID_DE_LA_RECETA" | jq .

# DELETE /prescriptions/:id → 422 (receta ya dispensada)
curl -s -X DELETE -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/prescriptions/ID_DE_LA_RECETA_DISPENSADA" | jq .
```

#### certificates/

```bash
# GET /certificates → 200
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/certificates" | jq .

# POST /certificates → 201
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paciente": { "documento": "12345678", "sexo": "masculino" },
    "profesional": { "id": "ID_DEL_PROFESIONAL" },
    "diagnostico": "Paciente presenta sintomas de..."
  }' "http://localhost:8080/api/certificates" | jq .
```

#### stock/

```bash
# GET /stock → 200
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/stock" | jq .

# PATCH /stock/:id → 200 (actualizar cantidad)
curl -s -X PATCH -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cantidad": 50}' \
  "http://localhost:8080/api/stock/ID_DEL_STOCK" | jq .
```

### Formato de respuesta esperado

**Éxito (200/201):**
```json
{ "status": "success", "data": { ... } }
```

**Error de validación (422):**
```json
{ "status": "error", "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [{"field": "dni", "message": "..."}] } }
```

**No encontrado (404):**
```json
{ "status": "error", "error": { "code": "RECURSO_NOT_FOUND", "message": "..." } }
```

**No autorizado (401):**
```json
{ "status": "error", "error": { "code": "UNAUTHORIZED", "message": "..." } }
```

**Prohibido (403):**
```json
{ "status": "error", "error": { "code": "FORBIDDEN", "message": "..." } }
```

**Conflicto (409):**
```json
{ "status": "error", "error": { "code": "PRESCRIPTION_ALREADY_DISPENSED", "message": "..." } }
```

### Checklist de verificación

Al terminar un módulo, marcar:

```
[ ] Compila sin errores (npm run build)
[ ] Linter pasa (npm run lint)
[ ] Endpoints GET (list/index) responden con formato esperado
[ ] Endpoints POST (create) responden 201 y crean el recurso
[ ] Endpoints PATCH/DELETE (update/delete) responden correctamente
[ ] Errores 401, 404, 422 tienen formato estándar (no strings planos)
[ ] Sin console.log en el código nuevo
[ ] Rutas revisadas contra REST y ajustadas si corresponde
[ ] Respuesta coincide con la del endpoint legacy (si aplica)
```
