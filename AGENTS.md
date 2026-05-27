# AGENTS

## Runtime y entrypoints
- Hay dos procesos separados: API en `src/server.ts` y Agenda UI en `src/agenda-ui.ts`.
- `npm run dev` levanta solo la API; `npm run dev:agenda-ui` levanta solo Agenda UI; `npm run dev:all` corre ambos.
- `npm start` ejecuta `dist/src/server.js`; `npm run start:agenda-ui:prod` ejecuta `dist/src/agenda-ui.js`.
- TypeScript compila a `dist/src`, no a `dist` plano.

## Verificacion
- No hay script de tests en `package.json`.
- La verificacion normal es `npm run lint` y, si el cambio toca compilacion o imports, `npm run build`.

## Entorno y prerequisitos
- El repo fija Node `24.x` en `package.json`; `.nvmrc` usa `24.15.0` y `.envrc` hace `nvm use`.
- `src/config/config.ts` carga `.env` con `dotenv.config()`; defaults importantes: `API_URI_PREFIX=/api` y Mongo local `mongodb://localhost/recetar`.
- La conexion usa `MONGODB_URI`; `MONGO_URI` aparece en docs de Agenda pero no es la variable que consume `src/database/dbconfig.ts`.
- La API usa `PORT` y Agenda UI usa `AGENDA_UI_PORT`.
- Integraciones con ANDES dependen de variables como `ANDES_ENDPOINT`, `ANDES_MPI_ENDPOINT` y `JWT_MPI_TOKEN`; sin ellas fallan varios controladores y jobs.

## Routing y auth
- El prefijo real de la API sale de `process.env.API_URI_PREFIX || process.env.API_URI_PRFIX || env.API_URI_PREFIX`; existe el typo heredado `API_URI_PRFIX`.
- El router raiz vive en `src/routes/routes.ts`: monta `/auth`, rutas publicas, `/andes`, y despues protege todo lo demas con `checkAuth` via `router.all('*', checkAuth, privateRoutes)`.
- Para rutas privadas, reutilizar `checkAuth` y `hasPermissionIn(...)`; no mover chequeos de permisos adentro de controladores si ya existe middleware.

## Agenda
- Agenda UI y jobs requieren Mongo activo antes de inicializarse; `AgendaService` espera la conexion de Mongoose y usa la coleccion `agendaJobs`.
- Si tocas jobs o dashboard, revisa ambos caminos: `src/agenda/agenda.service.ts` y `src/agenda-ui.ts`.
- El dashboard monta Agendash en `/`, pero tambien expone endpoints JSON en `/api/jobs` y `/api/info`.

## Convenciones de codigo
- ESLint impone 4 espacios, comillas simples y sin `console`, salvo donde ya esta deshabilitado inline.
- Este repo no tiene una capa de servicios profunda: para seguir un flujo, ir de `src/routes/*` al controller y de ahi al modelo/helper usado.
- Los errores HTTP compartidos usan `HttpException` + `errorHandler`, pero `checkAuth` responde directo desde Passport cuando falla autenticacion; mantener ese patron mixto existente.
- Mantener cambios acotados: no hacer refactors amplios ni limpieza incidental fuera del requerimiento.

## Referencias utiles
- Comandos y arquitectura resumidos tambien estan en `.github/copilot-instructions.md`.
- Operacion de Agenda: `src/agenda/AGENDA_README.md`.
- Convenciones de PR: `.github/pull_request_template.md`.
