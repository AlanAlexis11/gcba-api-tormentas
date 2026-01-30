import Fastify from 'fastify';
import cors from '@fastify/cors';
import 'dotenv/config';
import reportRoutes from './routes/reportRoutes.js';

const app = Fastify({
  logger: process.env.NODE_ENV === 'production' ? { level: 'error' } : { level: 'info' }
});

const isProd = process.env.NODE_ENV === 'production';
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()) 
  : [];

// 1. Registro de CORS
await app.register(cors, {
  origin: (origin, cb) => {
    if (!origin || !isProd) return cb(null, true);
    const hostname = new URL(origin).hostname;
    const isAllowed = allowedOrigins.some(o => o.includes(hostname));
    if (isAllowed) return cb(null, true);
    cb(new Error("CORS: Origen no permitido"), false);
  },
  exposedHeaders: ['Content-Disposition']
});

// El hook de Referer ajustado para ser flexible
app.addHook('preHandler', async (request, reply) => {
  if(request.url.includes("/health")) return;

  if (isProd) {
    const referer = request.headers.referer;
    // Verificamos si el inicio del referer coincide con alguno de nuestros permitidos
    const isAllowed = allowedOrigins.some(origin => referer?.startsWith(origin));

    if (!isAllowed) {
      return reply.code(403).send({ 
        error: 'Forbidden', 
        message: 'Acceso restringido a la aplicación oficial.' 
      });
    }
  }
});

// 4. Rutas
app.register(reportRoutes, { prefix: '/api/v1' });

const start = async () => {
  try {
    const PORT = process.env.PORT || 3000;
    // Importante: server.timeout para los 22 minutos de espera
    const address = await app.listen({ port: PORT, host: '0.0.0.0' });
    app.server.timeout = 1800000; // 30 minutos
    
    console.log(`🚀 Servidor en modo ${process.env.NODE_ENV} corriendo en ${address}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();