import { THEME } from './theme.js';

// --- HELPERS ---
export const setFill = (doc, color) => {
   if (color.startsWith('#') && color.length === 9) {
      const opacity = parseInt(color.substring(7, 9), 16) / 255;
      doc.fillColor(color.substring(0, 7)).fillOpacity(opacity);
   } else {
      doc.fillColor(color).fillOpacity(1);
   }
};

// --- COMPONENTES MODERNOS ---

export const drawHeader = (doc, title, dateRange, timeFilter) => {
    const x = 20, y = 15;
    const width = doc.page.width - 40;
    
    // 1. Título principal
    doc.fillColor(THEME.colors.primaryDark)
       .font(THEME.fonts.bold)
       .fontSize(18)
       .text(title.toUpperCase(), x, y);

    // 2. Línea decorativa
    doc.moveTo(x, y + 22)
       .lineTo(x + 60, y + 22) // Un poco más larga para que se vea mejor
       .lineWidth(2)
       .strokeColor(THEME.colors.brand)
       .stroke();

    // 3. Fecha y Filtros (Ajuste de visibilidad)
    // Validamos explícitamente que existan los valores para evitar strings vacíos
    const datePart = dateRange || '';
    const timePart = (timeFilter && timeFilter !== '') ? `  |  ${timeFilter}` : '';
    const infoText = `${datePart}${timePart}`;

    // Dibujamos el texto con un ancho definido para asegurar el alineado a la derecha
    doc.fillColor(THEME.colors.textMuted)
       .font(THEME.fonts.normal)
       .fontSize(8)
       .text(infoText, x, y + 5, { 
           width: width, 
           align: 'right' 
       });
};

export const drawMetricCard = (doc, x, y, w, h, label, value) => {
   // Fondo blanco con borde muy suave (Estilo Card Moderna)
   doc.save();
   doc.roundedRect(x, y, w, h, 6)
      .fillColor('#FFFFFF')
      .strokeColor(THEME.colors.surface)
      .lineWidth(1)
      .fillAndStroke();

   // Etiqueta superior en gris
   doc.fillColor('#718096').font(THEME.fonts.normal).fontSize(7)
      .text(label.toUpperCase(), x, y + 8, { width: w, align: 'center' });

   // Valor central destacado en color principal
   doc.fillColor(THEME.colors.surface).font(THEME.fonts.bold).fontSize(h * 0.4)
      .text(value.toString(), x, y + 16, { width: w, align: 'center' });
   doc.restore();
};

export const drawStatusCard = (doc, x, y, label, value, colorType = 'default') => {
    const w = 75, h = 38; // Un poco más alta para aire visual
    const isWarning = colorType === 'warning';
    const accentColor = isWarning ? '#F6AD55' : THEME.colors.brand;
    
    doc.save();

    // 1. SOMBRA SUTIL (Simulación de elevación)
    doc.roundedRect(x + 1, y + 1, w, h, 6)
       .fillColor('#000000').fillOpacity(0.05).fill();

    // 2. CUERPO DE LA TARJETA
    doc.roundedRect(x, y, w, h, 6)
       .fillOpacity(1)
       .fillColor('#FFFFFF')
       .fill();

    // 3. BORDE ESTRUCTURAL FINO (Usa tu color surface suavemente)
    doc.roundedRect(x, y, w, h, 6)
       .lineWidth(0.5)
       .strokeColor('#E2E8F0') // Un gris neutro muy claro para no saturar
       .stroke();

    // 4. ACENTO LATERAL REDONDEADO
    // En lugar de un rectángulo seco, usamos una línea con terminación circular
    doc.lineCap('round')
       .moveTo(x + 2, y + 6)
       .lineTo(x + 2, y + h - 6)
       .lineWidth(2.5)
       .strokeColor(accentColor)
       .stroke();

    // 5. TEXTO: ETIQUETA (Upper case y más espaciado)
    doc.fillColor('#718096') // Gris azulado moderno
       .font(THEME.fonts.normal)
       .fontSize(6)
       .text(label.toUpperCase(), x + 8, y + 10, { characterSpacing: 0.5 });

    // 6. TEXTO: VALOR (Color surface oscuro y tipografía grande)
    doc.fillColor(THEME.colors.primaryDark)
       .font(THEME.fonts.bold)
       .fontSize(14)
       .text(value.toString(), x + 8, y + 18);

    doc.restore();
};
export const drawDataTable = (doc, x, y, width, title, headers, rows, rowHeight = 16) => {
   const colWidth = width / (headers.length || 1);
   const titleHeight = 22;
   const COLOR_BORDE = '#001627';
   const headerHeight = 20;

   // Altura total dinámica
   const totalTableHeight = headerHeight + (rows.length * rowHeight);
   doc.save();

   // --- TÍTULO ---
   doc.fillColor(COLOR_BORDE)
      .roundedRect(x, y - titleHeight, width, titleHeight, 6)
      .fill();
   doc.rect(x, y - 5, width, 5).fill(COLOR_BORDE);

   doc.fillColor('#FFFFFF')
      .font(THEME.fonts.bold).fontSize(8.5)
      .text(title.toUpperCase(), x, y - 15, { width: width, align: 'center' });

   // --- CUERPO ---
   doc.rect(x, y, width, totalTableHeight)
      .lineWidth(1)
      .strokeColor(COLOR_BORDE)
      .stroke();

   // Header
   doc.rect(x, y, width, headerHeight).fillColor('#F7FAFC').fill();
   headers.forEach((h, i) => {
      doc.fillColor(COLOR_BORDE).font(THEME.fonts.bold).fontSize(7)
         .text(h.toUpperCase(), x + (i * colWidth), y + 7, { width: colWidth, align: 'center' });
   });

   // Filas
   let currentY = y + headerHeight;
   rows.forEach((row, index) => {
      const isTotal = row[0]?.toString().toLowerCase() === 'total';

      // Fondo de fila
      if (isTotal) {
          doc.rect(x, currentY, width, rowHeight).fillColor('#EDF2F7').fill();
      } else if (index % 2 !== 0) {
          doc.rect(x, currentY, width, rowHeight).fillColor('#F8FAFC').fill();
      }

      // Cálculo para centrar el texto verticalmente en la fila
      // Si la fila mide 16 y la fuente 7.5, el padding superior ideal es ~4.5
      const textPaddingTop = (rowHeight - 7.5) / 2;

      row.forEach((cell, i) => {
          const isFirst = i === 0;
          const xPos = x + (i * colWidth);
          
          doc.fillColor(isTotal ? '#2D3748' : '#4A5568')
             .font(isTotal || isFirst ? THEME.fonts.bold : THEME.fonts.normal)
             .fontSize(7.5)
             .text(cell?.toString() || '-', xPos + (isFirst ? 5 : 0), currentY + textPaddingTop, {
                width: isFirst ? colWidth - 5 : colWidth,
                align: isFirst ? 'left' : 'center',
                lineBreak: false // Evita que saltos de línea rompan la tabla
             });
      });

      // Línea divisoria
      doc.moveTo(x, currentY + rowHeight).lineTo(x + width, currentY + rowHeight)
          .lineWidth(0.3).strokeColor('#D1D5DB').stroke();

      currentY += rowHeight;
   });
   doc.restore();
};

export const drawBarChart = (doc, x, y, width, data = [], title = "Incidencias") => {
   const chartHeight = 180;
   const plotWidth = width - 60;
   const barHeight = 10;
   
   doc.save();
   
   // 1. Dibujar Contenedor Base
   doc.roundedRect(x, y, width, chartHeight, 8)
      .fillColor(THEME.colors.white)
      .strokeColor(THEME.colors.surface)
      .lineWidth(1)
      .fillAndStroke();

   // 2. Título del Gráfico
   doc.fillColor(THEME.colors.surface)
      .font(THEME.fonts.bold)
      .fontSize(8)
      .text(title, x + 15, y + 15);

   // 3. Validación de Datos Vacíos
   if (!data || data.length === 0) {
      doc.fillColor(THEME.colors.textMuted)
         .font(THEME.fonts.normal)
         .fontSize(10)
         .text("No existen datos", x, y + (chartHeight / 2), {
            width: width,
            align: 'center'
         });
      doc.restore();
      return; // Finaliza la ejecución si no hay datos
   }

   // 4. Cálculo del Máximo (Fuera del loop para optimizar)
   const maxVal = Math.max(...data.map(d => Number(d.value) || 0), 1);

   // 5. Renderizado de Barras
   data.forEach((item, i) => {
      const val = Number(item.value) || 0;
      const barW = (val / maxVal) * plotWidth;
      const barY = y + 40 + (i * 18);

      // Etiqueta Comuna
      doc.fillColor('#718096')
         .font(THEME.fonts.normal)
         .fontSize(7)
         .text(item.label, x + 15, barY + 2);

      // Barra: Fondo (Track)
      doc.roundedRect(x + 45, barY, plotWidth, barHeight, 2)
         .fillColor('#F7FAFC')
         .fill(); 

      // Barra: Progreso (Brand)
      if (barW > 0) {
         doc.roundedRect(x + 45, barY, barW, barHeight, 2)
            .fillColor(THEME.colors.brand)
            .fill();
      }

      // Valor Numérico
      doc.fillColor('#2D3748')
         .font(THEME.fonts.bold)
         .fontSize(7)
         .text(val.toString(), x + 45 + plotWidth + 5, barY + 2);
   });

   doc.restore();
};
