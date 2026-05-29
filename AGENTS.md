# AGENTS

## Contexto de refactorización
- El proyecto está en proceso de refactorización hacia una arquitectura modular por dominio.
- `src/` contendrá el código nuevo siguiendo la nueva arquitectura.
- `src-legacy/` es referencia documental del código anterior; **no se modifica**.
- El objetivo es separar responsabilidades en módulos (features), integraciones y capas compartidas.

## Runtime y entrypoints
- Hay dos procesos separados: API en `src/server.ts` y Agenda UI en `src/agenda-ui.ts`.
- `npm run dev` levanta solo la API; `npm run dev:agenda-ui` levanta solo Agenda UI; `npm run dev:all` corre ambos.
- `npm start` ejecuta `dist/src/server.js`; `npm run start:agenda-ui:prod` ejecuta `dist/src/agenda-ui.js`.
- TypeScript compila a `dist/src`, no a `dist` plano.

## Verificacion
- Los tests se definen por módulo en `tests/modules/` y se ejecutan con `npm test`. Ver `.opencode/skills/recetar-api-tests/SKILL.md`.
- La verificacion normal es `npm run lint` y, si el cambio toca compilacion o imports, `npm run build`.
- Si el cambio agrega o modifica funcionalidad, verificar que `npm test` pase.

## Entorno y prerequisitos
- El repo fija Node `24.x` en `package.json`; `.nvmrc` usa `24.15.0` y `.envrc` hace `nvm use`.
- `src/config/config.ts` carga `.env` con `dotenv.config()`; defaults importantes: `API_URI_PREFIX=/api` y Mongo local `mongodb://localhost/recetar`.
- La conexion usa `MONGODB_URI`; `MONGO_URI` aparece en docs de Agenda pero no es la variable que consume `src/database/dbconfig.ts`.
- La API usa `PORT` y Agenda UI usa `AGENDA_UI_PORT`.
- Integraciones con ANDES dependen de variables como `ANDES_ENDPOINT`, `ANDES_MPI_ENDPOINT` y `JWT_MPI_TOKEN`; sin ellas fallan varios controladores y jobs.
- Integración email usa `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_SECURE`, `EMAIL_USERNAME`, `EMAIL_PASSWORD` y opcional `TEMPLATES_PATH`.

## Routing y auth
- El prefijo real de la API sale de `process.env.API_URI_PREFIX || process.env.API_URI_PRFIX || env.API_URI_PREFIX`; existe el typo heredado `API_URI_PRFIX`.
- Las rutas se definen dentro de cada módulo en `src/modules/*/` y se componen en `src/routes/routes.ts`.
- Para rutas privadas, reutilizar `checkAuth` y `hasPermissionIn(...)`; no mover chequeos de permisos adentro de controladores si ya existe middleware.

## Agenda
- Agenda UI y jobs requieren Mongo activo antes de inicializarse; `AgendaService` espera la conexion de Mongoose y usa la coleccion `agendaJobs`.
- Si tocas jobs o dashboard, revisa ambos caminos: `src/agenda/agenda.service.ts` y `src/agenda-ui.ts`.
- El dashboard monta Agendash en `/`, pero tambien expone endpoints JSON en `/api/jobs` y `/api/info`.

## Convenciones de codigo
- ESLint impone 4 espacios, comillas simples y sin `console`, salvo donde ya esta deshabilitado inline.
- **En el nuevo `src/`** se sigue la arquitectura modular descrita en `.opencode/skills/recetar-api-refactor/SKILL.md`.
- Mantener cambios acotados: no hacer refactors amplios ni limpieza incidental fuera del requerimiento.

## Patrón de rutas (nuevo `src/`)
Cada módulo exporta un `Router` de Express como default en su `*.routes.ts`:

```typescript
// modules/auth/auth.routes.ts
const router = Router();
router.post('/login', ..., controller.login);
export default router;
```

Las rutas NO crean dependencias (logger, repository, service). El `index.ts` del módulo es el composition root que las crea y exporta el controller ya armado:

```typescript
// modules/auth/index.ts
const repository = new AuthRepository();
const service = new AuthService(repository, logger);
const controller = new AuthController(service);
export { controller as authController };
```

En `src/routes/routes.ts` solo se montan (sin repetir el prefix, que ya lo pone `server.ts`):
```typescript
import authRoutes from '../modules/auth/auth.routes';
router.use('/auth', authRoutes);
```

Cada módulo es autónomo sin mezclar responsabilidades.

## Estructura del proyecto (nuevo `src/`)
```
src/
├── modules/               # Un directorio por dominio de negocio
│   ├── auth/
│   ├── users/
│   ├── prescriptions/
│   ├── patients/
│   ├── professionals/
│   ├── pharmacists/
│   ├── certificates/
│   ├── practices/
│   ├── supplies/
│   └── stock/
├── integrations/          # Una carpeta por sistema externo
│   ├── andes/             # Fase 1 completada
│   ├── email/             # Fase 1 completada
│   └── ...
├── shared/                # Infraestructura común
│   ├── errors/
│   ├── logger/
│   ├── middlewares/
│   └── utils/
├── models/                # Schemas Mongoose (contenido no se modifica)
├── routes/
│   └── routes.ts
├── config/
│   └── config.ts
├── database/
│   └── dbconfig.ts
├── agenda/
│   ├── agenda.service.ts
│   └── jobs/
├── server.ts
└── agenda-ui.ts
```

## Plan de renovacion (API)
El refactoring se ejecuta en las siguientes etapas (sin tests, que son proyecto aparte):

| Etapa | Descripcion | Prioridad |
|---|---|---|
| 1 | Base técnica: eliminar secrets hardcodeados, corregir bugs críticos, limpiar controllers comentados | 🔴 Critica |
| 2 | Arquitectura: crear módulos con services/repositories, migrar lógica de negocio fuera de controllers | 🟡 Alta |
| 4 | DTOs y Mapper ANDES: `AndesToRecetarMapper` unificado en `integrations/andes/` | 🟡 Alta |
| 5 | Logger: interfaz en `shared/logger/`, implementación desacoplada | 🟢 Media |
| 7 | Seguridad: rate limiting, CORS explícito, sanitizar queries, TLS condicional | 🟡 Alta |

## Estado de refactorización
El progreso se lleva en el checklist del skill en `.opencode/skills/recetar-api-refactor/SKILL.md`. Cada módulo se completa en orden de fases antes de avanzar al siguiente.

### Progreso actual
- Fase 0 (shared/): Completada
- Fase 1 (integrations/andes/, integrations/email/): Completada
- Fase 2 (modules/auth/): Completada
- Fase 2 (modules/users/): Completada
- Fase 2 (modules/patients/, modules/professionals/, modules/pharmacists/): Completada
- Fase 2 (modules/supplies/, modules/practices/): Completada
- Fase 3 (modules/prescriptions/, modules/certificates/, modules/stock/): Completada

## Skills disponibles
- **recetar-api-refactor** (`.opencode/skills/recetar-api-refactor/SKILL.md`): reglas de implementación (controllers, services, repositories, mappers, errores, etc.) — se eliminará al terminar la refactorización.
- **recetar-api-docs** (`.opencode/skills/recetar-api-docs/SKILL.md`): guía de documentación OpenAPI con YAML + markdown.
- **recetar-api-tests** (`.opencode/skills/recetar-api-tests/SKILL.md`): guía para escribir tests con Jest + mongodb-memory-server.
- **recetar-api-maintenance** (`.opencode/skills/recetar-api-maintenance/SKILL.md`): reglas permanentes del proyecto — documentación sincronizada, convención REST, formato de respuestas, estructura de módulos, verificación pre-commit.

## Referencias utiles
- Operacion de Agenda: `src/agenda/AGENDA_README.md`.
- Convenciones de PR: `.github/pull_request_template.md`.
- Plan de renovacion completo: `RECETAR Plan de renovación.md`.
