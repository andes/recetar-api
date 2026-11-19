import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildOpenApiSpec } from '../src/config/openapi';

/**
 * Genera el paquete de documentación que se entrega a Praxys:
 *  - openapi.json: spec acotado a las rutas /praxys (contrato inbound RPE)
 *  - api-reference.html: referencia autocontenida (Scalar) para abrir sin servidor
 *
 * Uso:
 *   npm run docs:build:praxys
 *   PRAXYS_DOCS_SERVER_URL=https://recetartest.andes.gob.ar/api npm run docs:build:praxys
 */

const PRAXYS_PATH_PREFIX = '/praxys';
const OUT_DIR = process.env.PRAXYS_DOCS_OUT || join(process.cwd(), 'dist/praxys-docs');
const SERVER_URL = process.env.PRAXYS_DOCS_SERVER_URL || 'https://<host>/api';
const SCALAR_CDN = 'https://cdn.jsdelivr.net/npm/@scalar/api-reference@1';

type JsonObject = Record<string, unknown>;

const fullSpec = buildOpenApiSpec() as JsonObject;
const fullPaths = (fullSpec.paths || {}) as Record<string, unknown>;

const paths = Object.fromEntries(
    Object.entries(fullPaths).filter(([path]) => path.startsWith(PRAXYS_PATH_PREFIX)),
);

const refs = new Set<string>();
collectRefs(paths, refs);

let previousSize = -1;
while (refs.size !== previousSize) {
    previousSize = refs.size;
    for (const ref of [...refs]) {
        const component = resolveComponent(fullSpec, ref);
        if (component) { collectRefs(component, refs); }
    }
}

const components: Record<string, JsonObject> = {};
for (const ref of refs) {
    const match = /^#\/components\/([^/]+)\/([^/]+)$/.exec(ref);
    if (!match) { continue; }
    const [, kind, name] = match;
    const component = resolveComponent(fullSpec, ref);
    if (!component) { continue; }
    components[kind] = components[kind] || {};
    components[kind][name] = component;
}

const securitySchemeNames = new Set<string>();
collectSecuritySchemes(paths, securitySchemeNames);
for (const name of securitySchemeNames) {
    const scheme = getSecurityScheme(fullSpec, name);
    if (!scheme) { continue; }
    components.securitySchemes = components.securitySchemes || {};
    components.securitySchemes[name] = scheme;
}

const spec = {
    openapi: '3.0.3',
    info: {
        title: 'RecetAR API · Notificación de dispensa (Praxys RPE)',
        version: '1.0.0',
        description: [
            'Recepción de eventos de ciclo de vida enviados por Praxys (RPE).',
            '',
            'Base URL que configura Praxys: `https://<host>/api/praxys`.',
            'Seguridad: allowlist de IPs de egreso y header `x-api-key`.',
            'Los reintentos de Praxys son idempotentes (2xx); un hash desconocido responde 404.',
            '',
            'Documentación de integración: `docs/praxys-inbound-integracion.md`.',
        ].join('\n'),
    },
    servers: [
        {
            url: SERVER_URL,
            description: SERVER_URL.includes('<host>')
                ? 'Configurar antes de entregar'
                : 'Entorno de pruebas',
        },
    ],
    tags: [
        {
            name: 'Praxys Eventos',
            description: 'Eventos inbound del contrato RPE de Praxys.',
        },
    ],
    paths,
    components,
};

mkdirSync(OUT_DIR, { recursive: true });
const jsonPath = join(OUT_DIR, 'openapi.json');
writeFileSync(jsonPath, JSON.stringify(spec, null, 2), 'utf-8');

const htmlPath = join(OUT_DIR, 'api-reference.html');
writeFileSync(htmlPath, buildHtml(spec), 'utf-8');

// eslint-disable-next-line no-console
console.log(`OpenAPI Praxys generado: ${jsonPath}`);
// eslint-disable-next-line no-console
console.log(`Referencia HTML generada: ${htmlPath}`);

function collectRefs(node: unknown, acc: Set<string>): void {
    if (!node || typeof node !== 'object') { return; }
    if (Array.isArray(node)) {
        node.forEach(item => collectRefs(item, acc));
        return;
    }
    const record = node as JsonObject;
    if (typeof record.$ref === 'string') {
        acc.add(record.$ref);
    }
    Object.values(record).forEach(value => collectRefs(value, acc));
}

function resolveComponent(source: JsonObject, ref: string): unknown {
    const match = /^#\/components\/([^/]+)\/([^/]+)$/.exec(ref);
    if (!match) { return undefined; }
    const [, kind, name] = match;
    const sourceComponents = (source.components || {}) as Record<string, Record<string, unknown>>;
    return sourceComponents[kind]?.[name];
}

function collectSecuritySchemes(node: unknown, acc: Set<string>): void {
    if (!node || typeof node !== 'object') { return; }
    if (Array.isArray(node)) {
        node.forEach(item => collectSecuritySchemes(item, acc));
        return;
    }
    const record = node as JsonObject;
    if (Array.isArray(record.security)) {
        for (const requirement of record.security) {
            if (requirement && typeof requirement === 'object') {
                Object.keys(requirement as JsonObject).forEach(name => acc.add(name));
            }
        }
    }
    Object.values(record).forEach(value => collectSecuritySchemes(value, acc));
}

function getSecurityScheme(source: JsonObject, name: string): unknown {
    const sourceComponents = (source.components || {}) as Record<string, Record<string, unknown>>;
    return sourceComponents.securitySchemes?.[name];
}

function buildHtml(document: JsonObject): string {
    const embeddedSpec = JSON.stringify(document).replace(/</g, '\\u003c');
    return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>RecetAR API · Notificación de dispensa (Praxys RPE)</title>
  <style>body { margin: 0; }</style>
</head>
<body>
  <script id="api-reference" type="application/json">${embeddedSpec}</script>
  <script src="${SCALAR_CDN}"></script>
</body>
</html>
`;
}
