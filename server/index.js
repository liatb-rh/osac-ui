import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { logger } from './logger.js';
import { metrics } from './metrics.js';
import { checkHealth, checkBasicHealth } from './health.js';
import { createMockApiRouters } from './mock-api.js';
import { registerCatalogApi } from './catalog-api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

const STANDALONE_MOCK = process.env.OSAC_STANDALONE_MOCK === 'true' || process.env.OSAC_STANDALONE_MOCK === '1';

// Validate required environment variables (relaxed for local mock standalone)
if (!STANDALONE_MOCK) {
  if (!process.env.FULFILLMENT_API_URL) {
    logger.error('FULFILLMENT_API_URL environment variable is not set in ConfigMap');
    process.exit(1);
  }
  if (!process.env.KEYCLOAK_URL) {
    logger.error('KEYCLOAK_URL environment variable is not set in ConfigMap');
    process.exit(1);
  }
}

const FULFILLMENT_API = process.env.FULFILLMENT_API_URL || '';
const KEYCLOAK_URL = process.env.KEYCLOAK_URL || '';
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'innabox';
const OIDC_CLIENT_ID = process.env.OIDC_CLIENT_ID || 'osac-ui';
const NAMESPACE = process.env.NAMESPACE || 'innabox-devel';
const GENERIC_TEMPLATE_ID = process.env.GENERIC_TEMPLATE_ID || 'osac.templates.ocp_virt_vm';
const REACT_STRICT_MODE = process.env.REACT_STRICT_MODE === 'true';

// Security Headers Middleware
app.use((req, res, next) => {
  // Prevent clickjacking attacks
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Enable HSTS (HTTP Strict Transport Security)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // Control referrer information
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Disable legacy XSS protection (modern CSP is better)
  res.setHeader('X-XSS-Protection', '0');

  // Permissions Policy (formerly Feature-Policy)
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // Content Security Policy
  // Allow inline scripts for React, allow styles from PatternFly CDN, allow images from data: and CDN
  const connectExtra = STANDALONE_MOCK ? '' : `${KEYCLOAK_URL} ${FULFILLMENT_API}`.trim();
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'", // unsafe-inline needed for Vite HMR and inline configs
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net", // PatternFly uses inline styles
    "img-src 'self' data: https://cdn.jsdelivr.net", // Allow data URIs and CDN images
    "font-src 'self' data:", // Allow embedded fonts
    "connect-src 'self'" + (connectExtra ? ' ' + connectExtra : ''), // Mock mode: APIs are same-origin
    "frame-ancestors 'none'", // Equivalent to X-Frame-Options: DENY
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');
  res.setHeader('Content-Security-Policy', csp);

  next();
});

// Middleware
app.use(express.json());

if (STANDALONE_MOCK) {
  logger.info('OSAC_STANDALONE_MOCK enabled — serving in-memory fulfillment/private API stubs');
  const { fulfillment, private: privateRouter } = createMockApiRouters();
  app.use('/api/fulfillment/v1', fulfillment);
  app.use('/api/private/v1', privateRouter);
}

// Request logging and metrics middleware
app.use((req, res, next) => {
  const start = Date.now();

  // Log and record metrics on response finish
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'debug';

    // Record metrics (skip health and metrics endpoints to avoid noise)
    if (req.path !== '/health' && req.path !== '/metrics') {
      metrics.recordRequest(res.statusCode, duration);
    }

    logger[logLevel]('HTTP Request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('user-agent')?.substring(0, 50)
    });
  });

  next();
});

// Configuration endpoint - provides runtime config to frontend
// This allows the frontend to discover API URLs without hardcoding
app.get('/api/config', (req, res) => {
  logger.debug('Serving runtime configuration');
  if (STANDALONE_MOCK) {
    const proto = req.get('x-forwarded-proto') || req.protocol;
    const host = req.get('host');
    const origin = `${proto}://${host}`;
    return res.json({
      keycloakUrl: origin,
      keycloakRealm: 'standalone',
      oidcClientId: 'standalone-mock',
      fulfillmentApiUrl: origin,
      namespace: 'standalone',
      genericTemplateId: GENERIC_TEMPLATE_ID
    });
  }
  res.json({
    keycloakUrl: KEYCLOAK_URL,
    keycloakRealm: KEYCLOAK_REALM,
    oidcClientId: OIDC_CLIENT_ID,
    fulfillmentApiUrl: FULFILLMENT_API,
    namespace: NAMESPACE,
    genericTemplateId: GENERIC_TEMPLATE_ID
  });
});

registerCatalogApi(app, (message, err) => logger.error(message, err));

// Health check endpoint - enhanced with dependency checks
// Accepts optional ?deep=true query parameter for deep health checks
app.get('/health', async (req, res) => {
  const deep = req.query.deep === 'true';

  if (deep) {
    if (STANDALONE_MOCK) {
      return res.json({
        status: 'healthy',
        checks: { standalone_mock: { status: 'healthy', note: 'No external dependencies' } },
        timestamp: new Date().toISOString(),
      });
    }
    // Deep health check - verify external dependencies
    try {
      const healthStatus = await checkHealth(FULFILLMENT_API, KEYCLOAK_URL, KEYCLOAK_REALM);

      // Return 503 if any dependency is unhealthy, 200 otherwise
      const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(healthStatus);
    } catch (error) {
      logger.error('Health check failed', error);
      res.status(503).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  } else {
    // Basic health check - just verify the service is running
    res.json(checkBasicHealth());
  }
});

// Metrics endpoint - Prometheus-compatible metrics
app.get('/metrics', (req, res) => {
  const format = req.query.format || 'prometheus';

  if (format === 'json') {
    res.json(metrics.getMetrics());
  } else {
    // Default: Prometheus text format
    res.set('Content-Type', 'text/plain; version=0.0.4');
    res.send(metrics.getPrometheusMetrics());
  }
});

// Serve static files from the dist directory with caching for assets
app.use(express.static(path.join(__dirname, '../dist'), {
  setHeaders: (res, path) => {
    // Cache assets (JS, CSS, images) for 1 year since they have content hashes
    if (path.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

// SPA fallback - serve index.html for all other routes with no-cache
app.get('*', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  // Read index.html and inject runtime configuration
  const indexPath = path.join(__dirname, '../dist/index.html');
  fs.readFile(indexPath, 'utf8', (err, html) => {
    if (err) {
      logger.error('Error reading index.html', err);
      return res.status(500).send('Internal Server Error');
    }

    // Inject runtime config as inline script before the main app script
    const configScript = `
    <script>
      window.__OSAC_UI_CONFIG__ = {
        strictMode: ${REACT_STRICT_MODE}
      };
    </script>`;

    // Insert config script right before </head>
    const modifiedHtml = html.replace('</head>', `${configScript}\n  </head>`);
    res.send(modifiedHtml);
  });
});

app.listen(PORT, () => {
  logger.info(`OSAC UI server listening on port ${PORT}`);
});
