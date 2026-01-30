import PDFDocument from 'pdfkit';
import { THEME } from '../utils/theme.js';
import * as ui from '../utils/components.js';

export class PdfService {
    static async generateDashboard(res, data) {
        const processedData = this._prepareDashboardData(data);
        const doc = new PDFDocument({ size: 'A4', margin: 30, bufferPages: false, compress: true });

        doc.on('error', err => { throw err; });
        doc.pipe(res);

        const MARGIN = 15;
        const CONTENT_WIDTH = doc.page.width - (MARGIN * 2);
        const RIGHT_COL_X = 330;
        this._renderBackground(doc);

        // 1. Header
        ui.drawHeader(doc, "Tablero CUCC", `Fecha: ${data.fecha}`, processedData.filtroComunas);

        // 2. Métricas Principales
        this._renderTopMetrics(doc, MARGIN, CONTENT_WIDTH, data.totales);

        // 3. Sección Media: Mapa y Derivados
        this._renderMapAndDerivations(doc, data, MARGIN);

        // 4. Sección Inferior: Tabla Estado y Gráfico
        this._renderStreetCutsAndCharts(doc, data, processedData, MARGIN, RIGHT_COL_X);

        // --- PÁGINA 2: ARBOLADO ---
        doc.addPage();
        this._renderArboladoTable(doc, data, processedData);

        doc.end();
    }

    static _prepareDashboardData(data) {
        // Pre-procesamiento para que el renderizado sea lineal y rápido
        return {
            filtroComunas: data.comunas?.length ? `Comunas: ${data.comunas}` : null,

            chartData: (data.arbolado || [])
                .filter(item => item.totalIncidencias > 0)
                .map(item => ({
                    label: item.comuna.replace('Comuna ', 'C'),
                    value: item.totalIncidencias
                })),

            rowsArbolado: (data.arbolado || []).map(c => [
                c.nombre || `${c.comuna}`,
                (c.arbolado?.arbolPeligro ?? 0).toString(),
                (c.arbolado?.arbolCaido ?? 0).toString(),
                (c.arbolado?.ramaColgante ?? 0).toString(),
                (c.arbolado?.ramaCaida ?? 0).toString(),
                (c.arbolado?.totalIncidencias ?? 0).toString()
            ])
        };
    }

    static _renderBackground(doc) {
        ui.setFill(doc, THEME.colors.white);
        doc.rect(0, 0, doc.page.width, doc.page.height).fill();
    }

    static _renderTopMetrics(doc, margin, contentWidth, totales) {
        ui.drawMetricCard(doc, margin, 55, contentWidth, 45, 'Ingresos CUCC', totales.ingresos);

        const gap = 10;
        const secW = (contentWidth - (gap * 3)) / 4;
        const y = 110;

        ui.drawMetricCard(doc, margin, y, secW, 35, 'Ingresos Reales', totales.reales);
        ui.drawMetricCard(doc, margin + (secW + gap), y, secW, 35, 'No hay Incidencias', totales.noIncidencias);
        ui.drawMetricCard(doc, margin + (secW + gap) * 2, y, secW, 35, 'No corresponde', totales.noCorresponde);
        ui.drawMetricCard(doc, margin + (secW + gap) * 3, y, secW, 35, 'Repetidos', totales.repetidos);
    }

    static _renderMapAndDerivations(doc, data, margin) {
        const y = 155;
        const cardW = 95; // Reducimos de 110 a 100 para ganar 20px de espacio central
        const cardH = 30;

        // Derivados
        ui.drawMetricCard(doc, margin, y, cardW, cardH, 'Derivado empresa', data.totales.derivadoEmpresa || "0");
        ui.drawMetricCard(doc, margin + 110, y, cardW, cardH, 'Derivado comuna', data.totales.derivadoComuna || "0");
        ui.drawMetricCard(doc, margin, y + 40, cardW, cardH, 'Realizado', data.totales.realizado || "0");

        // Mapa
        if (data.mapaBuffer) {
            const [mX, mY, mW, mH] = [225, 150, 355, 210];
            doc.roundedRect(mX, mY, mW, mH, 8).lineWidth(1).strokeColor('#e0e0e0').stroke();
            doc.image(data.mapaBuffer, mX + 2, mY + 2, {
                fit: [mW - 4, mH - 4], // Reducimos el padding interno del image
                align: 'center',
                valign: 'center'
            });
        }
    }
    static _renderStreetCutsAndCharts(doc, data, processed, margin, rightX) {
        const tableStartY = 385;

        // 1. Extraemos reporteCortes con valores por defecto (Garantía contra undefined)
        const cortes = data?.cortes || {
            totalConCorte: 0,
            cortesTotales: 0,
            totalesFinalizados: 0,
            totalesEnProceso: 0,
            cortesParciales: 0,
            parcialesFinalizados: 0,
            parcialesEnProceso: 0
        };
        console.log("🚀 ~ PdfService ~ _renderStreetCutsAndCharts ~ cortes:", cortes)

        // 2. Chip Principal (Uso de || 0 para evitar fallos si la propiedad viene vacía)
        ui.drawMetricCard(
            doc,
            rightX + 25,
            370,
            150,
            35,
            'Cortes de calle',
            cortes.totalConCorte ?? 0
        );

        // 3. Filas de estados con lógica de renderizado limpio
        const drawStatusRow = (y, label, total, fin, proc) => {
            // Aseguramos que los valores sean numéricos para evitar el error de .toString()
            const valTotal = total ?? 0;
            const valFin = fin ?? 0;
            const valProc = proc ?? 0;

            ui.drawStatusCard(doc, rightX, y, label, valTotal);
            ui.drawStatusCard(doc, rightX + 85, y, 'Finalizado', valFin);
            ui.drawStatusCard(doc, rightX + 170, y, 'En proceso', valProc, 'warning');
        };

        // 4. Renderizado de Filas 
        // Fila para Cortes Totales
        drawStatusRow(
            420,
            'Corte Total',
            cortes.cortesTotales,
            cortes.totalesFinalizados,
            cortes.totalesEnProceso
        );

        // Fila para Cortes Parciales
        drawStatusRow(
            465,
            'Corte Parcial',
            cortes.cortesParciales,
            cortes.parcialesFinalizados,
            cortes.parcialesEnProceso
        );

        // 5. Tabla dinámica y Gráfico
        const tablaData = data.tablaEstado || [];

        // Ajuste dinámico de altura para que la tabla no pise otros elementos
        const dynamicRowHeight = Math.max(16, Math.min(25, 350 / (tablaData.length || 1)));
        ui.drawDataTable(
            doc,
            margin,
            tableStartY,
            300,
            'ESTADO DE INCIDENCIAS',
            data.headers || [],
            tablaData,
            dynamicRowHeight,
            16
        );

        // Gráfico de barras inferior
        if (processed.chartData) {
            ui.drawBarChart(doc, rightX, 520, 245, processed.chartData, 'Estado Finalizado');
        }
    }

    static _renderArboladoTable(doc, data) {
        const headers = ["COMUNA", "ÁRBOL INCLINADO", "ÁRBOL CAÍDO", "RAMA COLGANTE", "RAMA CAÍDA", "TOTAL"];
        const tv = data.totalesVerticales || {};

        // 1. Transformar el array de objetos en un array de arrays (filas)
        const rows = (data.arbolado || []).map(item => [
            item.comuna || "-",
            (item.arbolPeligro ?? 0).toString(),
            (item.arbolCaido ?? 0).toString(),
            (item.ramaColgante ?? 0).toString(),
            (item.ramaCaida ?? 0).toString(),
            (item.totalIncidencias ?? 0).toString()
        ]);

        // 2. Crear la fila de totales
        const totalRow = [
            "TOTAL",
            (tv.arbolPeligro ?? 0).toString(),
            (tv.arbolCaido ?? 0).toString(),
            (tv.ramaColgante ?? 0).toString(),
            (tv.ramaCaida ?? 0).toString(),
            ((tv.arbolPeligro ?? 0) + (tv.arbolCaido ?? 0) + (tv.ramaColgante ?? 0) + (tv.ramaCaida ?? 0)).toString()
        ];

        // 3. Dibujar la tabla con las filas mapeadas + el total
        ui.drawDataTable(
            doc,
            10,
            50,
            doc.page.width - 20,
            "Detalle de Incidencias de Arbolado",
            headers,
            [...rows, totalRow], // Aquí pasamos las filas ya procesadas
            12
        );
    }
}