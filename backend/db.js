const sql = require('mssql');
require('dotenv').config();

const rawServer = process.env.DB_SERVER || '192.168.3.159\\BASE';
const [serverHost, instanceName] = rawServer.includes('\\')
    ? rawServer.split('\\')
    : [rawServer, undefined];

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    server: process.env.DB_PORT ? serverHost : rawServer,
    ...(process.env.DB_PORT ? { port: Number(process.env.DB_PORT) } : {}),
    database: process.env.DB_NAME,
    requestTimeout: 60000,
    connectionTimeout: 30000,
    options: {
        encrypt: false,
        trustServerCertificate: true,
        ...(!process.env.DB_PORT && instanceName ? { instanceName } : {})
    }
};

let poolPromise;

const getPool = async () => {
    if (!poolPromise) {
        poolPromise = new sql.ConnectionPool(dbConfig)
            .connect()
            .then(pool => {
                console.log('Conectado exitosamente a SQL Server (ControlServicios)');
                return pool;
            })
            .catch(err => {
                console.error('Error de conexión a la Base de Datos:', err);
                poolPromise = null;
                throw err;
            });
    }
    return poolPromise;
};

module.exports = {
    sql,
    getPool
};
