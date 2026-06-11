# RecetAR API

API de prescripciones médicas electrónicas. Sistema de recetas electrónicas de la provincia de Neuquén, integrado con ANDES.

## Requisitos

- **Node.js 24.x** (ver `.nvmrc`)
- **MongoDB** 4.x+

## Instalación

```bash
git clone <repo-url>
cd recetar-api
npm install
```

## Vademecum MS

El vademécum (consulta de medicamentos, drogas, acciones) se delega en un microservicio separado [`vademecum-ms`](https://github.com/eugesma/vademecum-ms). recetar-api se comunica con él vía HTTP.

Consultar la documentación de `vademecum-ms` para:

- Instalación y configuración de Redis
- Seed y sync de datos desde Alfabeta
- Seed de datos de prueba (`npm run seed:test`)

Variables de entorno en recetar-api:

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| `VADEMECUM_MS_URL` | URL base del microservicio | `http://localhost:4001` |

## Ejecución

```bash
# Desarrollo con recarga automática
npm run dev

# Producción
npm run build
npm start
```

API en `http://localhost:4000/api`, documentación interactiva en `http://localhost:4000/api-docs`.

## Tests

```bash
npm test                # todos
npm run test:watch      # modo watch
npm run test:coverage   # con cobertura
```

## Linter

```bash
npm run lint
npm run lint:fix
```

## Variables de entorno

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| `PORT` | Puerto del servidor API | `4000` |
| `API_URI_PREFIX` | Prefijo de rutas API | `/api` |
| `MONGODB_CONNECTION` | URI de MongoDB | `mongodb://localhost/recetar` |
| `JWT_SECRET` | Secreto para JWT | *(requerido)* |
| `ANDES_ENDPOINT` | Endpoint de ANDES | *(requerido)* |
| `JWT_MPI_TOKEN` | Token para ANDES | *(requerido)* |
| `TOKEN_LIFETIME` | Horas de validez del token | `12` |

## Autenticación

La API usa JWT (JSON Web Token) con algoritmo HS256. Los tokens se envían mediante el header `Authorization: Bearer <token>`.

## Formato de respuesta

Todas las respuestas siguen el formato:

```json
{
  "status": "success" | "error",
  "data": { ... },
  "error": {
    "code": "ERROR_CODE",
    "message": "Descripción del error"
  }
}
```
