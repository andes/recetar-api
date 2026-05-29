# Agenda.js UI - Gestión de Trabajos Programados

Esta es una implementación de la UI de Agenda.js para gestionar trabajos programados en la aplicación Recetar API.

## Características

- **Dashboard Web**: Interfaz visual para monitorear trabajos programados
- **Gestión de Jobs**: Ver, pausar, reanudar y eliminar trabajos
- **Jobs de Ejemplo**: Incluye varios trabajos predefinidos como envío de emails, limpieza de datos, etc.
- **Ejecución Independiente**: Se ejecuta en un proceso separado del API principal

## Configuración

### Variables de Entorno

Copia el archivo `.env.example` a `.env` y configura las siguientes variables:

```bash
# UI de Agenda.js
AGENDA_UI_PORT=3001

# Base de datos MongoDB (debe ser la misma que usa la API principal)
MONGO_URI=mongodb://localhost/recetar
```

### Instalación de Dependencias

Las dependencias necesarias ya están incluidas en el `package.json`:
- `agenda`: Para la gestión de trabajos programados
- `agendash`: Para la interfaz web
- `concurrently`: Para ejecutar múltiples procesos

## Uso

### Ejecutar solo la UI de Agenda

#### Desarrollo
```bash
npm run dev:agenda-ui
```

#### Producción
```bash
npm run build
npm run start:agenda-ui:prod
```

### Ejecutar API principal + UI de Agenda simultáneamente

#### Desarrollo
```bash
npm run dev:all
```

#### Producción
```bash
npm run build
npm run start:all
```

## Acceso a la UI

Una vez iniciado el servidor, puedes acceder a:

- **Agenda UI**: http://localhost:3001
- **API Principal**: http://localhost:4000/api


## Programar Jobs desde la API

Puedes programar jobs desde tu API principal creando una instancia de Agenda y programando trabajos:

```typescript
import Agenda from 'agenda';

const agenda = new Agenda({
    db: { address: 'mongodb://localhost/recetar', collection: 'agendaJobs' }
});

// Programar un email inmediatamente
await agenda.now('send email', {
    to: 'usuario@example.com',
    subject: 'Notificación importante',
    body: 'Este es el contenido del email'
});

// Programar un trabajo para más tarde
await agenda.schedule('in 1 hour', 'send notification', {
    userId: '12345',
    message: 'Recuerda completar tu perfil',
    type: 'reminder'
});
```

## Estructura de Archivos

```
src/
├── agenda-ui.ts          # Servidor de la UI de Agenda
├── server.ts             # API principal
└── config/
    └── config.ts         # Configuración compartida

nodemon.agenda.json       # Configuración de nodemon para Agenda UI
.env.example             # Variables de entorno de ejemplo
```

## Comandos Útiles

```bash
# Desarrollo - Solo API principal
npm run dev

# Desarrollo - Solo UI de Agenda
npm run dev:agenda-ui

# Desarrollo - Ambos servicios
npm run dev:all

# Producción - Construir proyecto
npm run build

# Producción - Solo API principal
npm start

# Producción - Solo UI de Agenda
npm run start:agenda-ui:prod

# Producción - Ambos servicios
npm run start:all

# Limpiar archivos compilados
npm run clean
```

## Puertos por Defecto

- **API Principal**: 4000
- **Agenda UI**: 3001

Puedes cambiar estos puertos modificando las variables de entorno `PORT` y `AGENDA_UI_PORT` respectivamente.

## Colección de MongoDB

Los trabajos de Agenda se almacenan en la colección `agendaJobs` de tu base de datos MongoDB, separada de las colecciones de tu API principal.

## Integración con la API Principal

Para integrar Agenda.js con tu API principal existente, puedes:

1. **Crear jobs desde tus controladores**:
```typescript
// En cualquier controlador
const agenda = new Agenda({ db: { address: mongoConnectionString, collection: 'agendaJobs' } });
await agenda.start();
await agenda.now('send email', emailData);
```

2. **Programar tareas recurrentes**:
```typescript
// Jobs que se ejecutan automáticamente
await agenda.every('0 9 * * *', 'send daily report'); // Diario a las 9 AM
await agenda.every('0 0 1 * *', 'monthly cleanup'); // Primer día del mes
```

3. **Gestionar trabajos dinámicamente**:
```typescript
// Cancelar trabajos
await agenda.cancel({ name: 'send email', 'data.userId': '12345' });

// Programar con delay
await agenda.schedule('in 30 minutes', 'reminder', { userId: '12345' });
```
