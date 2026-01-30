// schemas/reportSchema.js
export const generateReportSchema = {
  summary: 'Generar reporte PDF de tormentas',
  description: 'Valida los parámetros de fecha y comunas antes de procesar el PDF',
  querystring: {
    type: 'object',
    required: ['fechaInicio', 'fechaFin'],
    properties: {
      fechaInicio: { 
        type: 'string', 
        description: 'ISO String de inicio' 
      },
      fechaFin: { 
        type: 'string', 
        description: 'ISO String de fin' 
      },
      comunas: { 
        type: 'string', 
        pattern: '^[0-9,]*$', // Seguridad: solo permite números y comas
        description: 'IDs de comunas separados por coma'
      }
    }
  },
  response: {
    200: {
      description: 'Archivo PDF',
      type: 'string',
      format: 'binary'
    },
    500: {
      type: 'object',
      properties: {
        error: { type: 'string' }
      }
    }
  }
};