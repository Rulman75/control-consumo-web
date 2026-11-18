const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const { sql, getPool } = require('./db');
require('dotenv').config();

const {
    JWT_SECRET,
    BCRYPT_ROUNDS,
    invalidateUserCache,
    securityHeadersMiddleware,
    apiRateLimiter,
    checkLoginIpRateLimit,
    recordLoginIpResult,
    registrarAuditoriaAcceso,
    ensureSecuritySchema,
    authenticateJWT
} = require('./middleware/authMiddleware');

const app = express();
app.set('trust proxy', 1);
app.use(securityHeadersMiddleware);
app.use(cors());
app.use(express.json({ limit: '20mb' }));

// Inicializar esquema de seguridad y hashes Bcrypt al arrancar
getPool()
    .then(pool => ensureSecuritySchema(pool))
    .catch(err => console.error('[SEGURIDAD CONSUMOS] Error inicializando al arranque:', err.message));

const pkg = require('./package.json');
app.get('/api/version', (req, res) => {
    res.json({ version: pkg.version || '1.1.0' });
});

app.get('/api/health', async (req, res) => {
    try {
        await getPool();
        res.json({ status: 'ok', message: 'Backend Control de Consumos OK' });
    } catch {
        res.status(500).json({ status: 'error', message: 'Error conectando a BD' });
    }
});

app.use('/api', apiRateLimiter);

// 1. Ruta de Autenticación (Tabla Usuarios con Bcrypt + Bloqueo Anti-Fuerza Bruta + Auditoría)
const handleLoginRequest = async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Debe ingresar usuario y contraseña', message: 'Debe ingresar usuario y contraseña' });
    }

    const cleanUser = String(username).trim();
    const cleanPass = String(password).trim();

    try {
        const pool = await getPool();
        const result = await pool
            .request()
            .input('usuario', sql.VarChar, cleanUser)
            .query(`
                SELECT TOP 1
                    LTRIM(RTRIM(usuario)) AS usuario,
                    LTRIM(RTRIM(ISNULL(clave, ''))) AS clave,
                    LTRIM(RTRIM(ISNULL(PasswordHash, ''))) AS PasswordHash,
                    LTRIM(RTRIM(ISNULL(NombreCompleto, ''))) AS NombreCompleto,
                    LTRIM(RTRIM(ISNULL(tipo, 'U'))) AS tipo,
                    LTRIM(RTRIM(ISNULL(codunidad, '00'))) AS codunidad,
                    LTRIM(RTRIM(ISNULL(Sector, ''))) AS sector,
                    ISNULL(Activo, 1) AS Activo,
                    ISNULL(DebeCambiarClave, 0) AS DebeCambiarClave,
                    ISNULL(IntentosFallidos, 0) AS IntentosFallidos,
                    BloqueadoHasta
                FROM Usuarios
                WHERE LOWER(LTRIM(RTRIM(usuario))) = LOWER(@usuario)
            `);

        if (!result.recordset || result.recordset.length === 0) {
            recordLoginIpResult(req, false);
            await registrarAuditoriaAcceso(pool, {
                usuario: cleanUser,
                evento: 'LOGIN_FAIL',
                detalle: 'Usuario no existe',
                req,
                exitoso: false
            });
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos', message: 'Usuario o contraseña incorrectos' });
        }

        const dbUser = result.recordset[0];

        if (Number(dbUser.Activo) !== 1) {
            await registrarAuditoriaAcceso(pool, {
                usuario: dbUser.usuario,
                evento: 'LOGIN_FAIL',
                detalle: 'Intento de acceso en cuenta suspendida',
                req,
                exitoso: false
            });
            return res.status(403).json({
                error: 'Su cuenta de usuario se encuentra suspendida. Contacte al Administrador.',
                message: 'Su cuenta de usuario se encuentra suspendida. Contacte al Administrador.'
            });
        }

        const now = new Date();
        if (dbUser.BloqueadoHasta) {
            const lockUntil = new Date(dbUser.BloqueadoHasta);
            if (!isNaN(lockUntil.getTime()) && lockUntil > now) {
                const minsLeft = Math.max(1, Math.ceil((lockUntil.getTime() - now.getTime()) / 60000));
                return res.status(429).json({
                    error: `Cuenta bloqueada temporalmente por seguridad tras múltiples intentos fallidos. Intente en ${minsLeft} minuto(s).`,
                    message: `Cuenta bloqueada temporalmente por seguridad tras múltiples intentos fallidos. Intente en ${minsLeft} minuto(s).`
                });
            }
        }

        let passwordValida = false;
        if (dbUser.PasswordHash && dbUser.PasswordHash.startsWith('$2')) {
            passwordValida = await bcrypt.compare(cleanPass, dbUser.PasswordHash);
        }
        if (!passwordValida && dbUser.clave && dbUser.clave === cleanPass) {
            passwordValida = true;
            const newHash = await bcrypt.hash(cleanPass, BCRYPT_ROUNDS);
            await pool
                .request()
                .input('Hash', sql.NVarChar, newHash)
                .input('User', sql.NVarChar, dbUser.usuario)
                .query(`UPDATE Usuarios SET PasswordHash = @Hash WHERE LOWER(LTRIM(RTRIM(usuario))) = LOWER(@User)`);
        }

        if (!passwordValida) {
            recordLoginIpResult(req, false);
            const nuevosIntentos = Number(dbUser.IntentosFallidos || 0) + 1;
            const bloquear = nuevosIntentos >= 5;
            const lockUntilDate = bloquear ? new Date(Date.now() + 15 * 60 * 1000) : null;

            await pool
                .request()
                .input('Intentos', sql.Int, nuevosIntentos)
                .input('BloqueadoHasta', sql.DateTime, lockUntilDate)
                .input('User', sql.NVarChar, dbUser.usuario)
                .query(`
                    UPDATE Usuarios
                    SET IntentosFallidos = @Intentos,
                        BloqueadoHasta = @BloqueadoHasta
                    WHERE LOWER(LTRIM(RTRIM(usuario))) = LOWER(@User)
                `);

            await registrarAuditoriaAcceso(pool, {
                usuario: dbUser.usuario,
                evento: bloquear ? 'LOCKOUT' : 'LOGIN_FAIL',
                detalle: bloquear
                    ? `Cuenta bloqueada por 15 minutos tras ${nuevosIntentos} intentos fallidos`
                    : `Contraseña incorrecta (intento ${nuevosIntentos} de 5)`,
                req,
                exitoso: false
            });

            if (bloquear) {
                return res.status(429).json({
                    error: 'Ha superado los 5 intentos fallidos. Su cuenta ha sido bloqueada preventivamente por 15 minutos.',
                    message: 'Ha superado los 5 intentos fallidos. Su cuenta ha sido bloqueada preventivamente por 15 minutos.'
                });
            }
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos', message: 'Usuario o contraseña incorrectos' });
        }

        recordLoginIpResult(req, true);
        await pool
            .request()
            .input('User', sql.NVarChar, dbUser.usuario)
            .query(`
                UPDATE Usuarios
                SET IntentosFallidos = 0,
                    BloqueadoHasta = NULL,
                    UltimoAcceso = GETDATE()
                WHERE LOWER(LTRIM(RTRIM(usuario))) = LOWER(@User)
            `);

        invalidateUserCache(dbUser.usuario);

        const roleMap = {
            A: 'Administrador Consumos',
            C: 'Contabilidad / Softland',
            D: 'Dirección Sectorial',
            U: 'Unidad / Establecimiento'
        };
        const tipoClean = String(dbUser.tipo || 'U').trim().toUpperCase();
        const userPayload = {
            username: dbUser.usuario,
            nombreCompleto: dbUser.NombreCompleto || dbUser.codunidad || dbUser.usuario,
            role: tipoClean,
            tipo: tipoClean,
            roleLabel: roleMap[tipoClean] || 'Usuario Sistema',
            codunidad: dbUser.codunidad,
            sector: dbUser.sector,
            debeCambiarClave: Number(dbUser.DebeCambiarClave) === 1
        };

        const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '12h' });

        await registrarAuditoriaAcceso(pool, {
            usuario: dbUser.usuario,
            evento: 'LOGIN_OK',
            detalle: `Inicio de sesión exitoso (Rol: ${userPayload.roleLabel}, Unidad: ${dbUser.codunidad})`,
            req,
            exitoso: true
        });

        return res.json({
            status: 'ok',
            token,
            user: userPayload,
            ...userPayload
        });
    } catch (error) {
        console.error('Error en autenticación:', error);
        return res.status(500).json({ error: 'Error al validar credenciales con el servidor' });
    }
};

app.post('/api/login', checkLoginIpRateLimit, handleLoginRequest);
app.post('/api/auth/login', checkLoginIpRateLimit, handleLoginRequest);

// Protección global JWT para todas las rutas /api/* posteriores
app.use('/api', authenticateJWT);

app.get('/api/auth/me', (req, res) => {
    res.json({ status: 'ok', user: req.user });
});

app.post('/api/auth/change-password', async (req, res) => {
    try {
        const { passwordActual, passwordNueva } = req.body;
        const pActual = String(passwordActual || '').trim();
        const pNueva = String(passwordNueva || '').trim();

        if (!pActual || !pNueva) {
            return res.status(400).json({ status: 'error', message: 'Debe ingresar su contraseña actual y la nueva contraseña.' });
        }
        if (pNueva.length < 6) {
            return res.status(400).json({ status: 'error', message: 'La nueva contraseña debe tener al menos 6 caracteres.' });
        }
        if (pActual === pNueva) {
            return res.status(400).json({ status: 'error', message: 'La nueva contraseña debe ser distinta a la actual.' });
        }

        const pool = await getPool();
        const dbRes = await pool
            .request()
            .input('u', sql.NVarChar, req.user.username)
            .query(`
                SELECT
                    LTRIM(RTRIM(usuario)) AS Usuario,
                    LTRIM(RTRIM(ISNULL(clave, ''))) AS Clave,
                    LTRIM(RTRIM(ISNULL(PasswordHash, ''))) AS PasswordHash
                FROM Usuarios
                WHERE LOWER(LTRIM(RTRIM(usuario))) = LOWER(@u)
            `);

        if (!dbRes.recordset || dbRes.recordset.length === 0) {
            return res.status(404).json({ status: 'error', message: 'Usuario no encontrado.' });
        }

        const uRow = dbRes.recordset[0];
        let actualOk = false;
        if (uRow.PasswordHash && uRow.PasswordHash.startsWith('$2')) {
            actualOk = await bcrypt.compare(pActual, uRow.PasswordHash);
        }
        if (!actualOk && uRow.Clave && uRow.Clave === pActual) {
            actualOk = true;
        }

        if (!actualOk) {
            await registrarAuditoriaAcceso(pool, {
                usuario: req.user.username,
                evento: 'PASSWORD_CHANGE_FAIL',
                detalle: 'Intento de cambio de contraseña con clave actual incorrecta',
                req,
                exitoso: false
            });
            return res.status(401).json({ status: 'error', message: 'La contraseña actual ingresada no es correcta.' });
        }

        const nuevoHash = await bcrypt.hash(pNueva, BCRYPT_ROUNDS);
        const claveLegada = pNueva.slice(0, 10);

        await pool
            .request()
            .input('Clave', sql.NVarChar, claveLegada)
            .input('PasswordHash', sql.NVarChar, nuevoHash)
            .input('User', sql.NVarChar, uRow.Usuario)
            .query(`
                UPDATE Usuarios
                SET clave = @Clave,
                    PasswordHash = @PasswordHash,
                    DebeCambiarClave = 0,
                    UltimoCambioClave = GETDATE()
                WHERE LOWER(LTRIM(RTRIM(usuario))) = LOWER(@User)
            `);

        invalidateUserCache(uRow.Usuario);
        await registrarAuditoriaAcceso(pool, {
            usuario: uRow.Usuario,
            evento: 'PASSWORD_CHANGE',
            detalle: 'El usuario actualizó su contraseña personal',
            req,
            exitoso: true
        });

        res.json({ status: 'ok', message: 'Su contraseña ha sido actualizada exitosamente.' });
    } catch (err) {
        console.error('Error en POST /api/auth/change-password (Consumos):', err);
        res.status(500).json({ status: 'error', message: 'Error al cambiar la contraseña.' });
    }
});

app.use('/api/usuarios', async (req, res, next) => {
    try {
        req.db = await getPool();
        next();
    } catch {
        res.status(500).json({ error: 'DB connection error' });
    }
}, require('./routes/usuarios'));

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
