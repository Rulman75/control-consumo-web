const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');
const { sql, getPool } = require('./db');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// 1. Ruta de Autenticación (Tabla Usuarios + soporte credencial histórica rc/1595)
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Debe ingresar usuario y contraseña' });
    }

    const cleanUser = String(username).trim();
    const cleanPass = String(password).trim();

    try {
        let userPayload = null;

        // Soporte directo credencial histórica de login.vb (rc / 1595)
        if (cleanUser.toLowerCase() === 'rc' && cleanPass === '1595') {
            userPayload = {
                username: 'rc',
                role: 'A',
                roleLabel: 'Administrador Consumos',
                codunidad: '00',
                sector: 'Administracion'
            };
        } else {
            const pool = await getPool();
            const request = pool.request();
            request.input('usuario', sql.VarChar, cleanUser);
            request.input('clave', sql.VarChar, cleanPass);

            const result = await request.query(`
                SELECT
                    RTRIM(usuario) AS usuario,
                    RTRIM(ISNULL(tipo, 'U')) AS tipo,
                    RTRIM(ISNULL(codunidad, '00')) AS codunidad,
                    RTRIM(ISNULL(Sector, '')) AS sector
                FROM Usuarios
                WHERE LOWER(RTRIM(usuario)) = LOWER(@usuario)
                  AND RTRIM(clave) = @clave
            `);

            if (result.recordset.length > 0) {
                const dbUser = result.recordset[0];
                const roleMap = {
                    A: 'Administrador Consumos',
                    C: 'Contabilidad / Softland',
                    D: 'Dirección Sectorial',
                    U: 'Unidad / Establecimiento'
                };
                userPayload = {
                    username: dbUser.usuario,
                    role: dbUser.tipo,
                    roleLabel: roleMap[dbUser.tipo] || 'Usuario Sistema',
                    codunidad: dbUser.codunidad,
                    sector: dbUser.sector
                };
            }
        }

        if (!userPayload) {
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
        }

        const token = jwt.sign(
            userPayload,
            process.env.JWT_SECRET || 'cmds_control_consumos_secret_key_2026',
            { expiresIn: '12h' }
        );

        return res.json({
            token,
            ...userPayload
        });
    } catch (error) {
        console.error('Error en autenticación:', error);
        return res.status(500).json({ error: 'Error al validar credenciales con el servidor' });
    }
});

// 2. Rutas Modulares de la API
const mantencionRouter = require('./routes/mantencion');
const procesosRouter = require('./routes/procesos');
const informesRouter = require('./routes/informes');

app.use('/api/mantencion', mantencionRouter);
app.use('/api/procesos', procesosRouter);
app.use('/api/informes', informesRouter);

// 3. Servir archivos estáticos del Frontend compilado (Producción)
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
    console.log(`Servidor Backend de Control de Consumos corriendo en http://localhost:${PORT}`);
});
