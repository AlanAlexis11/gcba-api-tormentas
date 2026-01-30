import axios from "axios";
import { generateHeatmapBuffer } from "../services/mapaCalor.js";
import { PdfService } from "../services/pdfService.js";
import { getPerformanceMetrics } from "../utils/performance.js";

export class ReportsController {
    static async generateReport(request, reply) {
        const startTime = process.hrtime.bigint();
        const startMemory = process.memoryUsage().rss;
        const { fechaInicio = '2025-11-01', fechaFin = '2025-12-31', comunas } = request.query;
        const listaComunas = comunas
            ? (Array.isArray(comunas) ? comunas : comunas.split(','))
            : [];

        if (!fechaInicio || !fechaFin) {
            return res.status(400).json({ status: 'ERROR', message: 'Faltan parámetros de fecha' });
        }

        const apiUrl = `${process.env.API_URL_RELEVAMIENTOS}/api/v1/suceso/reportes-sucesos?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}&comunas=${listaComunas}`;
        console.log("🚀 ~ ReportsController ~ generateReport ~ apiUrl:", apiUrl)

        try {
            // 2. Llamada a la API interna
            const response = await axios.get(apiUrl, {
                timeout: 10000 // 10 segundos de margen para agregaciones pesadas
            });

            const dbData = response.data?.data;

            if (!dbData) throw new Error("No data received from API");

            const [mapaBuffer, processedTableData] = await Promise.all([
                generateHeatmapBuffer((dbData.puntosMapa || []).map(p => ({
                    lat: p.lat,
                    lon: p.lon,
                    intensidad: p.intensidad,
                    comuna: `Comuna ${p.comuna}`,
                    estado: p.intensidad > 0.7 ? "Crítico" : "Normal"
                }))),
                ReportsController._transformDbData(dbData, fechaInicio, fechaFin, listaComunas)
            ]);

            const finalData = { ...processedTableData, mapaBuffer };

            const corsHeaders = reply.getHeaders();
            for (const [key, value] of Object.entries(corsHeaders)) {
                if (value !== undefined) reply.raw.setHeader(key, value);
            }

            reply.raw.setHeader('Content-Type', 'application/pdf');
            reply.raw.setHeader('Content-Disposition', 'attachment; filename=reporte.pdf');
            reply.raw.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

            await PdfService.generateDashboard(reply.raw, finalData);

            const metrics = getPerformanceMetrics(startTime, startMemory);
            console.table({ FRAMEWORK: 'FASTIFY', API_CALL: 'SUCCESS', ...metrics });

            return reply;

        } catch (error) {
            console.error("Error obteniendo datos de la API:", error.message);
            if (reply.raw.headersSent) {
                reply.raw.end();
                return;
            }
            return reply.status(500).send({ error: "Error al obtener datos para el reporte" });
        }
    }

    static _transformDbData(dbData, fechaInicio, fechaFin, listaComunas) {
        // 1. Pre-formatear fechas fuera de la lógica de retorno
        const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
        const fInicio = new Date(fechaInicio).toLocaleDateString('es-AR', options);
        const fFin = new Date(fechaFin).toLocaleDateString('es-AR', options);
        const estadosMap = new Map((dbData.resumenEstados || []).map(e => [e.nombre, e.cantidad]));

        // 2. Cachear totales para evitar accesos repetidos al objeto dbData
        const tv = dbData.totalesVerticales || {};

        // 3. Procesar arrays en un solo paso con mejor manejo de strings
        const { tablaEstado, arbolado } = (dbData.comunasDetalle || []).reduce((acc, c) => {
            // Usamos coerción rápida a String y evitamos padStart si no es necesario
            const idComuna = `C${c.comuna.length === 1 ? '0' + c.comuna : c.comuna}`;

            acc.tablaEstado.push([
                idComuna,
                c.realizado?.toString() || "-",
                c.derivadoEmpresa?.toString() || "-",
                c.derivadoComuna?.toString() || "-",
                c.total?.toString() || "0"
            ]);

            acc.arbolado.push({
                comuna: c.nombre,
                ...c.arbolado
            });

            return acc;
        }, { tablaEstado: [], arbolado: [] });

        // 4. Agregar fila de total (sin recalcular)
        tablaEstado.push([
            "Total",
            tv.realizado?.toString() || "0",
            tv.derivadoEmpresa?.toString() || "0",
            tv.derivadoComuna?.toString() || "0",
            tv.totalGeneral?.toString() || "0"
        ]);

        return {
            fecha: `${fInicio} - ${fFin}`,
            headers: ["COMUNA", "Realizado", "Deriv. Empresa", "Deriv. Comuna", "Total"],
            comunas: listaComunas,
            totales: {
                ingresos: dbData.totalRegistros || 0,
                reales: tv.totalGeneral || 0,
                noIncidencias: estadosMap.get("No Incidencia") || 0,
                noCorresponde: estadosMap.get("No Corresponde") || 0,
                repetidos: estadosMap.get("Repetido") || 0,
                derivadoEmpresa: tv.derivadoEmpresa || 0,
                derivadoComuna: tv.derivadoComuna || 0,
                realizado: tv.realizado || 0
            },
            tablaEstado,
            arbolado,
            totalesVerticales: tv,
            cortes: dbData.reporteCortes || {}
        };
    }

}