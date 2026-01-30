export const getPerformanceMetrics = (startTime, startMemory) => {
    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage().rss;

    // Tiempo en milisegundos
    const durationMs = Number(endTime - startTime) / 1_000_000;
    
    // RAM consumida en MB
    const ramUsed = (endMemory - startMemory) / 1024 / 1024;

    return {
        duration: `${durationMs.toFixed(2)} ms`,
        ram: `${ramUsed.toFixed(2)} MB`,
        totalRss: `${(endMemory / 1024 / 1024).toFixed(2)} MB`
    };
};