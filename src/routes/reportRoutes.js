import { ReportsController } from "../controllers/reportController.js";
import { generateReportSchema } from "../schemas/reportSchema.js";

export default async function (fastify, opts) {
    fastify.get('/generar-reporte', {
        schema: generateReportSchema,
        config: {
            rateLimit: {
                max: 2,
                timeWindow: '10 minutes',
                keyGenerator: (request) => {
                    return request.headers?.authorization || request.ip;
                },
                errorResponseBuilder: (request, context) => {
                    return {
                        statusCode: 429,
                        error: 'Too Many Requests',
                        message: `Límite excedido, reintente en ${Math.ceil(context.ttl / 1000)} segundos`
                    };
                }
            }
        },
        handler: ReportsController.generateReport 
    });
}