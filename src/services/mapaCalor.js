import { createCanvas } from 'canvas';
import * as d3 from 'd3-geo';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const geoDataPath = path.join(__dirname, 'barrios.geojson');
const cabaGeoJson = JSON.parse(fs.readFileSync(geoDataPath, 'utf8'));
const geoData = JSON.parse(fs.readFileSync(geoDataPath, 'utf8'));

let cachedBaseCanvas = null;

export const generateHeatmapBuffer2 = async (puntos) => {
    const width = 1000;
    const height = 1100; // Aumentamos la altura para dar espacio a la leyenda abajo
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // La proyección solo ocupa los primeros 1000px de altura
    const padding = -80;
    const projection = d3.geoMercator()
        .fitExtent([
            [padding, padding],
            [width - padding, 1000 - padding]
        ], cabaGeoJson);
    const geoPath = d3.geoPath().projection(projection).context(ctx);

    // 1. Fondo
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // 2. Dibujar Barrios y Nombres (Igual que antes)
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#fdfdfd';
    ctx.beginPath();
    geoPath(cabaGeoJson);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#666666';
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = 'center';
    cabaGeoJson.features.forEach(f => {
        const [lon, lat] = d3.geoCentroid(f);
        const [x, y] = projection([lon, lat]);
        const nombre = f.properties.BARRIO || f.properties.barrio;
        if (nombre) ctx.fillText(nombre, x, y);
    });

    // 3. Puntos de Calor con lógica Verde-Amarillo-Rojo
    puntos.forEach(p => {
        const [x, y] = projection([p.lon, p.lat]);
        if (!x || !y) return;

        const radius = 50;
        const i = p.intensidad; // 0 a 1

        const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);

        // Lógica de colores según intensidad
        let color;
        if (i < 0.4) color = `0, 255, 0`;     // Verde (Bajo)
        else if (i < 0.7) color = `255, 255, 0`; // Amarillo (Medio)
        else color = `255, 0, 0`;              // Rojo (Alto)

        grad.addColorStop(0, `rgba(${color}, ${i * 0.8})`);
        grad.addColorStop(1, `rgba(${color}, 0)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    });

    // 4. DIBUJAR LA LEYENDA (Debajo del mapa)
    const legendY = 1030;
    const legendX = 250;
    const legendWidth = 500;
    const legendHeight = 20;

    // Crear el gradiente visual de la leyenda
    const legendGrad = ctx.createLinearGradient(legendX, 0, legendX + legendWidth, 0);
    legendGrad.addColorStop(0, 'rgba(0, 255, 0, 0.8)');   // Verde
    legendGrad.addColorStop(0.5, 'rgba(255, 255, 0, 0.8)'); // Amarillo
    legendGrad.addColorStop(1, 'rgba(255, 0, 0, 0.8)');   // Rojo

    ctx.fillStyle = legendGrad;
    ctx.fillRect(legendX, legendY, legendWidth, legendHeight);

    // Etiquetas de la leyenda
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Bajo (Normal)', legendX, legendY + 45);

    ctx.textAlign = 'center';
    ctx.fillText('Medio (Alerta)', legendX + (legendWidth / 2), legendY + 45);

    ctx.textAlign = 'right';
    ctx.fillText('Alto (Crítico)', legendX + legendWidth, legendY + 45);

    return canvas.toBuffer('image/png', { compressionLevel: 3 });
};
function getBaseMap() {
    if (cachedBaseCanvas) return cachedBaseCanvas;
    const width = 1000;
    const height = 1100;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    const padding = 20;
    const projection = d3.geoMercator()
        .fitExtent([
            [padding, padding],
            [width - padding, 950]
        ], cabaGeoJson);
         const geoPath = d3.geoPath().projection(projection).context(ctx);

    // Fondo y Barrios (Solo se hace una vez)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#fdfdfd';
    ctx.beginPath();
    geoPath(cabaGeoJson);
    ctx.fill();
    ctx.stroke();

    // Nombres de barrios
    ctx.fillStyle = '#666666';
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = 'center';
    cabaGeoJson.features.forEach(f => {
        const [lon, lat] = d3.geoCentroid(f);
        const [x, y] = projection([lon, lat]);
        const nombre = f.properties.BARRIO || f.properties.barrio;
        if (nombre) ctx.fillText(nombre, x, y);
    });

    cachedBaseCanvas = canvas;
    return canvas;
}

export const generateHeatmapBuffer = async (puntos) => {
    const baseCanvas = getBaseMap();
    const width = baseCanvas.width;
    const height = baseCanvas.height;

    // Crear canvas dinámico rápido
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Dibujamos el fondo ya procesado
    ctx.drawImage(baseCanvas, 0, 0);
const padding = 40;
    const projection = d3.geoMercator()
    .fitExtent([
        [padding, padding], 
        [width - padding, 1000 - padding] // 1000 es el área del mapa antes de la leyenda
    ], cabaGeoJson);

    // Dibujar puntos de calor (Única parte dinámica)
    puntos.forEach(p => {
        const [x, y] = projection([p.lon, p.lat]);
        if (!x || !y) return;

        const radius = 50;
        const i = p.intensidad;
        let color = i < 0.4 ? '0, 255, 0' : (i < 0.7 ? '255, 255, 0' : '255, 0, 0');

        const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
        grad.addColorStop(0, `rgba(${color}, ${i * 0.8})`);
        grad.addColorStop(1, `rgba(${color}, 0)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    });

    // 4. DIBUJAR LA LEYENDA (Debajo del mapa)
    const legendY = 1030;
    const legendX = 250;
    const legendWidth = 500;
    const legendHeight = 20;

    // Crear el gradiente visual de la leyenda
    const legendGrad = ctx.createLinearGradient(legendX, 0, legendX + legendWidth, 0);
    legendGrad.addColorStop(0, 'rgba(0, 255, 0, 0.8)');   // Verde
    legendGrad.addColorStop(0.5, 'rgba(255, 255, 0, 0.8)'); // Amarillo
    legendGrad.addColorStop(1, 'rgba(255, 0, 0, 0.8)');   // Rojo

    ctx.fillStyle = legendGrad;
    ctx.fillRect(legendX, legendY, legendWidth, legendHeight);

    // Etiquetas de la leyenda
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Bajo (Normal)', legendX, legendY + 45);

    ctx.textAlign = 'center';
    ctx.fillText('Medio (Alerta)', legendX + (legendWidth / 2), legendY + 45);

    ctx.textAlign = 'right';
    ctx.fillText('Alto (Crítico)', legendX + legendWidth, legendY + 45);
    return canvas.toBuffer('image/png', { compressionLevel: 6 });
};
