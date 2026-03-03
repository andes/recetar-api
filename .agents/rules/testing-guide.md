# Guía de Testing para API Recetar

Esta guía establece las convenciones y configuraciones obligatorias para escribir pruebas de integración en el proyecto `recetar-api`. Cualquier agente de IA que genere tests debe seguir estas directrices para asegurar estabilidad, consistencia y evitar que los tests se cuelguen o interactúen con servicios externos.

## 1. Entorno y Herramientas

- **Framework:** `jest` junto con `ts-jest`.
- **Peticiones HTTP:** `supertest`.
- **Base de Datos:** Se utiliza `testcontainers` para levantar una instancia efímera de MongoDB (versión 4.4) en memoria.

## 2. Configuración Base (`tests/setup.ts`)

Todos los tests de integración utilizan la conexión a MongoDB provista por Testcontainers.
- Nunca inicialices una conexión manual a una base de datos real en tus tests.
- Asegúrate de limpiar las colecciones en el hook `afterAll()` para evitar fugas de memoria y cruce de datos entre suites de pruebas (e.g., `await User.deleteMany({})`).
- Limpia los mocks en `afterEach()` usando `jest.clearAllMocks()`.

## 3. Instanciación de Express (`app-test-helper.ts`)

Para probar endpoints con `supertest`, **NO importes ni inicies `server.ts` directamente**, ya que esto levantará el servidor en un puerto real e intentará conectarse a configuraciones globales de base de datos.
- Utiliza y/o actualiza `tests/integration/app-test-helper.ts`. Este archivo expone el router de Express sin invocar `app.listen()`, ideal para inyectar requests en memoria.

## 4. Middlewares de Autenticación y Permisos

Para testear controladores que están bajo protección (`private.ts`), es obligatorio mockear los middlewares de Passport y roles para simular una sesión válida:

```typescript
// Mock auth and permissions
jest.mock('../../src/middlewares/passport-config.middleware', () => ({
    checkAuth: (req: any, res: any, next: any) => next(),
}));
jest.mock('../../src/middlewares/roles.middleware', () => ({
    hasPermissionIn: () => (req: any, res: any, next: any) => next()
}));
```

**Atención:** Ciertos controladores pueden causar conflictos de dependencias transversales con las rutas. Si observas un error indicando que `Route.post()` requiere un callback al importar rutas en el app helper, mockea módulos enteros que no estés probando (por ejemplo, el router o controlador de autenticación).

## 5. Mocking de APIs Externas (ANDES MPI & Core)

**NUNCA PERMITAS LLAMADAS HTTP REALES EN TUS TESTS.** El sistema depende constantemente de APIs externas (ANDES) mediante bibliotecas como `needle` o `axios`. Si no son mockeadas correctamente, los tests experimentarán *timeouts* (Jest colapsará tras 20s/120s) y dejarán promesas sin resolver.

**Regla de Oro para el Mocking:**
No dependas de `.mockResolvedValueOnce()` o intercepciones secuenciales en escenarios complejos, porque Testcontainers y la base de persistencia pueden desalinear el orden esperado de respuestas.
- Implementa mocks agnósticos iterativos basados en la evaluación de la URL en el hook `beforeEach()`.

**Ejemplo de Mocking Correcto (`beforeEach`):**

```typescript
import needle from 'needle';
import axios from 'axios';

jest.mock('needle');
jest.mock('axios', () => ({
    post: jest.fn(),
    get: jest.fn(),
    patch: jest.fn()
}));

// Setup en beforeEach
beforeEach(() => {
    // Aisla el mock de Needle
    (needle as any).mockImplementation((method: string, url: string) => {
        if (url.includes('profesionales')) {
            return Promise.resolve({
                statusCode: 200,
                body: [{ id: 'andes-id', nombre: 'Test', profesiones: [{ profesional: 'Médico' }] }]
            });
        }
        return Promise.resolve({ statusCode: 200, body: [] });
    });

    // Aisla Axios evaluando la URL
    (axios.post as jest.Mock).mockImplementation((url: string, data: any) => {
        if (url && url.includes('/modules/recetas')) {
            return Promise.resolve({ statusText: 'OK', status: 200 });
        }
        // Identificador por defecto genérico (ej. creación de paciente)
        return Promise.resolve({ status: 200, data: { id: 'new-mpi' } });
    });
});
```

Si requieres probar un flujo de falla en infraestructura (simular que ANDES se cayó), sobreescribe el mock excepcionalmente dentro de la clausula del test `it`:
```typescript
(axios.post as jest.Mock).mockImplementationOnce((url: string, data: any) => {
    if (url && url.includes('/modules/recetas')) {
         return Promise.reject(new Error('ANDES connection failed'));
    }
    return Promise.resolve({ status: 200, data: { id: '123' }});
});
```

## 6. Generación de Test Data

- Utiliza los esquemas de Mongoose para crear datos reales simulados (Paciente, Usuario, Medicamentos) al inicio de tu test y asegúrate de insertarlos en la BD para probar integridad referencial, en vez de mandar mocks vacíos.

## 7. Ejecución y Debugging

- Ejecuta las pruebas en banda local para evitar colisiones de puerto en MongoDB Testcontainers usando bandera `--runInBand` y limpia el proceso explícitamente con `--forceExit` (debido a Mongoose).
```bash
npx jest tests/integration/[nombre] --runInBand --forceExit
```
- Si tu test de supertest experimenta timeout y asumes un Infinite Loop o Unhandled Promise Rejection, localiza el método `controller` e inserta traces de consola (`console.log`) antes del retorno fallido para atrapar excepciones ocultas (debido a `try-catch` limitantes sin logs, como se vio en `findOrCreate` de `patient.model.ts`).

## 8. Limpieza de Archivos Temporales

- **CRÍTICO:** Si durante el proceso de debugging o ejecución de tests decides volcar la salida (logs) de Jest a archivos de texto u otros formatos (por ejemplo, `jest_out.txt` o `jest_publico_utf8.txt`) para analizar stack traces o errores, **DEBES eliminar estos archivos basura inmediatamente después de resolver el problema**. No dejes artefactos residuales en el árbol de trabajo.
