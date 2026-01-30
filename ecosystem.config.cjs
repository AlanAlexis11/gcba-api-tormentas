module.exports = {
  apps: [{
    name: "api-pdf-tormentas",
    script: "./src/app.js",
    instances: 1, // En 4GB de RAM, mejor 1 instancia estable que 2 peleando por memoria
    exec_mode: "fork",
    max_memory_restart: "3G",
    env_file: ".env",
    env: {
      NODE_ENV: "development",
    },
    env_production: {
      NODE_ENV: "production",
    }
  }]
}