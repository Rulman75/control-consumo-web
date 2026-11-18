const sql = require('mssql');
require('dotenv').config();

let PgPool = null;
try {
    const pgMod = require('pg');
    PgPool = pgMod.Pool;
    // Convertir INT8 / BIGINT y NUMERIC a Number de JS igual que mssql
    pgMod.types.setTypeParser(20, val => (val === null ? null : parseInt(val, 10)));
    pgMod.types.setTypeParser(1700, val => (val === null ? null : Number(val)));
    // Evitar desfase de -1 día por zona horaria (UTC-3 / UTC-4) en TIMESTAMP y DATE de PostgreSQL
    pgMod.types.setTypeParser(1114, val => {
        if (!val) return null;
        const datePart = String(val).slice(0, 10);
        return `${datePart}T12:00:00.000Z`;
    });
    pgMod.types.setTypeParser(1082, val => {
        if (!val) return null;
        const datePart = String(val).slice(0, 10);
        return `${datePart}T12:00:00.000Z`;
    });
} catch (e) {
    console.warn('[AVISO] Paquete pg no disponible; usando SQL Server como respaldo.');
}

const DB_ENGINE = PgPool ? (process.env.DB_ENGINE || 'dual').toLowerCase() : 'mssql';

const KNOWN_PASCAL_KEYS = {
    number: 'number',
    usuario: 'usuario',
    tipo: 'Tipo',
    codunidad: 'codunidad',
    sector: 'Sector',
    codser: 'CodSer',
    nombreser: 'NombreSer',
    rut: 'Rut',
    contacto: 'Contacto',
    cuenta: 'Cuenta',
    cuenta2: 'Cuenta2',
    desccuenta2: 'DescCuenta2',
    correlativo: 'Correlativo',
    rol: 'Rol',
    codcenco: 'CodCenco',
    descripcion: 'Descripcion',
    domicilio: 'Domicilio',
    poblacion: 'Poblacion',
    telefono: 'Telefono',
    codsector: 'CodSector',
    ccosto: 'Ccosto',
    financiamiento: 'financiamiento',
    anio: 'Anio',
    ncliente: 'ncliente',
    nombre: 'nombre',
    unidaddescripcion: 'unidadDescripcion',
    nmedidor: 'nmedidor',
    promedio: 'promedio',
    nombreservicio: 'nombreServicio',
    nclienteantiguo: 'nclienteAntiguo',
    totalclientes: 'TotalClientes',
    ndocto: 'NDocto',
    monto: 'Monto',
    estado: 'Estado',
    fecharecep: 'FechaRecep',
    ulectura: 'ULectura',
    alectura: 'ALectura',
    fechalectura: 'FechaLectura',
    consumo: 'Consumo',
    fechaemision: 'FechaEmision',
    fechapago: 'FechaPago',
    ncpbte: 'NCpbte',
    subtotal: 'SubTotal',
    demanda: 'Demanda',
    iva: 'Iva',
    intereses: 'Intereses',
    otro: 'Otro',
    fechaven: 'FechaVen',
    fechaproxlec: 'FechaProxLec',
    nomina: 'Nomina',
    autorizada: 'Autorizada',
    clienteid: 'clienteId',
    totaldocumentos: 'TotalDocumentos',
    montototal: 'MontoTotal',
    fechaproceso: 'FechaProceso',
    siguientenomina: 'SiguienteNomina',
    nombrecliente: 'nombreCliente',
    expr1: 'Expr1',
    expr2: 'Expr2',
    expr3: 'Expr3',
    descripcionunidad: 'DescripcionUnidad',
    consumototal: 'ConsumoTotal',
    clientesconmovimiento: 'ClientesConMovimiento',
    totalnominas: 'TotalNominas',
    pendientesnomina: 'PendientesNomina',
    mes: 'Mes',
    documentos: 'Documentos',
    establecimiento: 'Establecimiento',
    mesdescripcion: 'mesDescripcion'
};

function translateSingleTSqlToPostgres(queryText, paramsMap) {
    let q = String(queryText);

    const SQL_KEYWORDS = new Set([
        'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'IS', 'NULL', 'AS', 'ON', 'JOIN',
        'LEFT', 'RIGHT', 'INNER', 'OUTER', 'FULL', 'CROSS', 'GROUP', 'BY', 'ORDER', 'ASC', 'DESC',
        'HAVING', 'LIMIT', 'OFFSET', 'TOP', 'DISTINCT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE',
        'INSERT', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'CAST', 'CONVERT', 'COALESCE', 'ISNULL',
        'LTRIM', 'RTRIM', 'TRIM', 'UPPER', 'LOWER', 'REPLACE', 'SUBSTRING', 'LEN', 'LENGTH', 'CONCAT',
        'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'ROW_NUMBER', 'OVER', 'PARTITION', 'VARCHAR', 'NVARCHAR',
        'CHAR', 'NCHAR', 'INT', 'INTEGER', 'BIGINT', 'SMALLINT', 'DECIMAL', 'NUMERIC', 'FLOAT', 'DATE',
        'DATETIME', 'TIMESTAMP', 'TEXT', 'GETDATE', 'CURRENT_TIMESTAMP', 'LIKE', 'BETWEEN', 'EXISTS',
        'WITH', 'NULLIF', 'ROWS', 'FETCH', 'NEXT', 'ONLY', 'APPLY', 'LATERAL', 'TRUE', 'EXTRACT', 'YEAR', 'MONTH'
    ]);
    const aliasMap = { ...KNOWN_PASCAL_KEYS };
    const identRegex = /\b([A-Za-z_][A-Za-z0-9_]*)\b/g;
    let m;
    while ((m = identRegex.exec(q)) !== null) {
        const word = m[1];
        const upper = word.toUpperCase();
        if (!SQL_KEYWORDS.has(upper) && /[A-Z]/.test(word) && /[a-z]/.test(word)) {
            aliasMap[word.toLowerCase()] = word;
        }
    }
    const aliasRegex = /\bAS\s+([A-Za-z_][A-Za-z0-9_]*)\b/gi;
    while ((m = aliasRegex.exec(q)) !== null) {
        const word = m[1];
        if (!SQL_KEYWORDS.has(word.toUpperCase())) {
            aliasMap[word.toLowerCase()] = word;
        }
    }

    // 1. Esquema dbo. y corchetes [Col]
    q = q.replace(/\bdbo\./gi, '');
    q = q.replace(/\[([^\]]+)\]/g, (_, ident) => `"${ident.toLowerCase()}"`);

    // 2. OUTER APPLY (SELECT TOP 1 ... ORDER BY ...) alias -> LEFT JOIN LATERAL (SELECT ... LIMIT 1) alias ON TRUE
    q = q.replace(
        /\bOUTER\s+APPLY\s*\(\s*SELECT\s+TOP\s+\(?\s*(\d+)\s*\)?\s+([\s\S]*?ORDER\s+BY\s+[^\n\r)]+)\s*\)\s*([A-Za-z_][A-Za-z0-9_]*)/gi,
        (_, limitNum, subBody, aliasName) => {
            return `LEFT JOIN LATERAL (SELECT ${subBody.trim()} LIMIT ${limitNum}) ${aliasName} ON TRUE`;
        }
    );

    // 3. TRY_CAST(expr AS INT) -> CASE WHEN RTRIM(CAST(expr AS TEXT)) ~ '^[0-9]+$' THEN ...::INT ELSE NULL END
    q = q.replace(
        /\bTRY_CAST\s*\(\s*([\s\S]*?)\s+AS\s+INT\s*\)/gi,
        (_, expr) => `(CASE WHEN RTRIM(CAST(${expr} AS TEXT)) ~ '^[0-9]+$' THEN RTRIM(CAST(${expr} AS TEXT))::INT ELSE NULL END)`
    );

    // 4. Funciones comunes T-SQL -> PostgreSQL
    q = q.replace(/\bISNULL\s*\(/gi, 'COALESCE(');
    q = q.replace(/\bGETDATE\s*\(\s*\)/gi, 'CURRENT_TIMESTAMP');
    q = q.replace(/\bLEN\s*\(/gi, 'LENGTH(');
    q = q.replace(/\bYEAR\s*\(\s*CURRENT_TIMESTAMP\s*\)/gi, 'EXTRACT(YEAR FROM CURRENT_TIMESTAMP)::INT');
    q = q.replace(/\bYEAR\s*\(\s*([^()]+)\s*\)/gi, 'EXTRACT(YEAR FROM $1)::INT');
    q = q.replace(/\bMONTH\s*\(\s*([^()]+)\s*\)/gi, 'EXTRACT(MONTH FROM $1)::INT');
    q = q.replace(/\bCONVERT\s*\(\s*varchar(?:\(\d+\))?\s*,\s*([^,]+?)\s*,\s*23\s*\)/gi, "TO_CHAR($1, 'YYYY-MM-DD')");
    q = q.replace(/\bCONVERT\s*\(\s*varchar(?:\(\d+\))?\s*,\s*([^,]+?)\s*,\s*103\s*\)/gi, "TO_CHAR($1, 'DD/MM/YYYY')");
    q = q.replace(/\bCONVERT\s*\(\s*varchar(?:\(\d+\))?\s*,\s*([^,]+?)\s*,\s*105\s*\)/gi, "TO_CHAR($1, 'DD-MM-YYYY')");

    // 5. Paginación OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY -> LIMIT @pageSize OFFSET @offset
    q = q.replace(
        /\bOFFSET\s+(@[A-Za-z0-9_]+|\d+)\s+ROWS\s+FETCH\s+NEXT\s+(@[A-Za-z0-9_]+|\d+)\s+ROWS\s+ONLY/gi,
        'LIMIT $2 OFFSET $1'
    );

    // 6. Transformar SELECT TOP (N) o SELECT TOP N a LIMIT N al final de la consulta
    q = q.replace(
        /^\s*SELECT\s+(DISTINCT\s+)?TOP\s*\(?\s*(\d+)\s*\)?\s+([\s\S]*?)\s*;?\s*$/i,
        (match, distinctPart, limitNum, body) => {
            return `SELECT ${distinctPart || ''}${body.trim()} LIMIT ${limitNum}`;
        }
    );

    // 7. Reemplazar parámetros @param por $1, $2...
    const values = [];
    const paramIndexMap = new Map();

    q = q.replace(/@([A-Za-z0-9_]+)/g, (fullMatch, paramName) => {
        const key = paramName.toLowerCase();
        if (!paramsMap.has(key)) {
            return fullMatch;
        }
        if (!paramIndexMap.has(key)) {
            values.push(paramsMap.get(key));
            paramIndexMap.set(key, values.length);
        }
        return `$${paramIndexMap.get(key)}`;
    });

    return { text: q, values, aliasMap };
}

function normalizePgRows(rows, aliasMap) {
    if (!Array.isArray(rows)) return [];
    return rows.map(r => {
        const out = {};
        for (const [k, v] of Object.entries(r)) {
            const lower = k.toLowerCase();
            const mappedKey = aliasMap[lower] || KNOWN_PASCAL_KEYS[lower] || k;
            out[mappedKey] = v;
            if (mappedKey !== k) {
                out[k] = v;
            }
        }
        return out;
    });
}

class PgRequestWrapper {
    constructor(pgPool) {
        this.pgPool = pgPool;
        this.params = new Map();
    }

    input(name, typeOrVal, val) {
        const value = arguments.length === 2 ? typeOrVal : val;
        this.params.set(String(name).toLowerCase(), value);
        return this;
    }

    async query(queryText) {
        const { text, values, aliasMap } = translateSingleTSqlToPostgres(queryText, this.params);
        const res = await this.pgPool.query(text, values);
        const normalized = normalizePgRows(res.rows, aliasMap);
        return {
            recordset: normalized,
            recordsets: [normalized],
            rowsAffected: [res.rowCount || 0]
        };
    }
}

class DualRequestWrapper {
    constructor(mssqlPool, pgPool) {
        this.mssqlReq = mssqlPool.request();
        this.pgReq = new PgRequestWrapper(pgPool);
    }

    input(name, typeOrVal, val) {
        if (arguments.length === 2) {
            this.mssqlReq.input(name, typeOrVal);
            this.pgReq.input(name, typeOrVal);
        } else {
            this.mssqlReq.input(name, typeOrVal, val);
            this.pgReq.input(name, typeOrVal, val);
        }
        return this;
    }

    async query(queryText) {
        const qTrim = String(queryText).trim();
        const isWrite = /^\s*(INSERT|UPDATE|DELETE)\b/i.test(qTrim);
        const isMaxQuery = /\bMAX\s*\(/i.test(qTrim) && /^\s*SELECT\b/i.test(qTrim);

        if (isWrite) {
            const [pgOutcome, mssqlOutcome] = await Promise.allSettled([
                this.pgReq.query(queryText),
                this.mssqlReq.query(queryText)
            ]);
            if (pgOutcome.status === 'rejected') {
                console.error('[DUAL-WRITE] Error en PostgreSQL:', pgOutcome.reason?.message);
            }
            if (mssqlOutcome.status === 'rejected') {
                console.error('[DUAL-WRITE] Error en SQL Server:', mssqlOutcome.reason?.message);
            }
            if (pgOutcome.status === 'fulfilled') return pgOutcome.value;
            if (mssqlOutcome.status === 'fulfilled') return mssqlOutcome.value;
            throw pgOutcome.reason || mssqlOutcome.reason;
        }

        if (isMaxQuery) {
            const [pgRes, mssqlRes] = await Promise.all([
                this.pgReq.query(queryText),
                this.mssqlReq.query(queryText)
            ]);
            const rowPg = (pgRes.recordset && pgRes.recordset[0]) || {};
            const rowMs = (mssqlRes.recordset && mssqlRes.recordset[0]) || {};
            const merged = { ...rowPg };
            for (const key of Object.keys(rowMs)) {
                const vPg = Number(merged[key]);
                const vMs = Number(rowMs[key]);
                if (!isNaN(vPg) && !isNaN(vMs)) {
                    merged[key] = Math.max(vPg, vMs);
                }
            }
            return {
                recordset: [merged],
                recordsets: [[merged]],
                rowsAffected: [1]
            };
        }

        try {
            return await this.pgReq.query(queryText);
        } catch (err) {
            console.warn('[DUAL-READ] Fallback a SQL Server por:', err.message);
            return await this.mssqlReq.query(queryText);
        }
    }
}

// ============================================================================
// SINCRONIZADOR BIDIRECCIONAL AUTOMÁTICO (SQL SERVER <-> POSTGRESQL)
// Garantiza que las acciones realizadas en el sistema antiguo (VB.NET -> SQL Server)
// se reflejen automáticamente en el sistema nuevo (PostgreSQL) y viceversa.
// ============================================================================
let currentSyncPromise = null;

function toNoonDateOrNull(val) {
    if (!val) return null;
    if (typeof val === 'string') {
        const m = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m) return `${m[1]}-${m[2]}-${m[3]} 12:00:00`;
    }
    const d = new Date(val);
    if (isNaN(d.getTime())) return null;
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} 12:00:00`;
}

async function syncDualDatabases(mssqlPool, pgPool) {
    if (!mssqlPool || !pgPool) return { skipped: true };
    if (currentSyncPromise) return currentSyncPromise;

    currentSyncPromise = (async () => {
    const stats = {
        clientesInsertadosPg: 0,
        clientesInsertadosMs: 0,
        docsInsertadosPg: 0,
        docsInsertadosMs: 0,
        docsActualizadosPg: 0,
        docsActualizadosMs: 0,
        fechasCorregidasPg: 0
    };

    try {
        // 0. Corregir cualquier documento en PostgreSQL que haya quedado con hora 20:00/21:00 por desfase UTC-3/UTC-4
        const fixDatesRes = await pgPool.query(`
            UPDATE documentos
            SET fechaemision = CASE WHEN EXTRACT(HOUR FROM fechaemision) IN (20, 21) THEN DATE_TRUNC('day', fechaemision + INTERVAL '4 hours') + INTERVAL '12 hours' ELSE fechaemision END,
                fechalectura = CASE WHEN EXTRACT(HOUR FROM fechalectura) IN (20, 21) THEN DATE_TRUNC('day', fechalectura + INTERVAL '4 hours') + INTERVAL '12 hours' ELSE fechalectura END,
                fechaproxlec = CASE WHEN EXTRACT(HOUR FROM fechaproxlec) IN (20, 21) THEN DATE_TRUNC('day', fechaproxlec + INTERVAL '4 hours') + INTERVAL '12 hours' ELSE fechaproxlec END,
                fechaven     = CASE WHEN EXTRACT(HOUR FROM fechaven) IN (20, 21) THEN DATE_TRUNC('day', fechaven + INTERVAL '4 hours') + INTERVAL '12 hours' ELSE fechaven END,
                fechapago    = CASE WHEN EXTRACT(HOUR FROM fechapago) IN (20, 21) THEN DATE_TRUNC('day', fechapago + INTERVAL '4 hours') + INTERVAL '12 hours' ELSE fechapago END
            WHERE EXTRACT(HOUR FROM fechaemision) IN (20, 21)
               OR EXTRACT(HOUR FROM fechalectura) IN (20, 21)
               OR EXTRACT(HOUR FROM fechaproxlec) IN (20, 21)
               OR EXTRACT(HOUR FROM fechaven) IN (20, 21)
        `);
        stats.fechasCorregidasPg = fixDatesRes.rowCount || 0;
        // 1. Sincronizar Clientes
        const [msCliRes, pgCliRes] = await Promise.all([
            mssqlPool.request().query(`
                SELECT ncliente,
                       RTRIM(ISNULL(nombre, '')) AS nombre,
                       RTRIM(ISNULL(codunidad, '')) AS codunidad,
                       RTRIM(ISNULL(NMedidor, '')) AS nmedidor,
                       ISNULL(Promedio, 0) AS promedio,
                       RTRIM(ISNULL(Codser, '')) AS codser,
                       RTRIM(ISNULL(Sector, '')) AS sector,
                       ISNULL(NclienteAntiguo, 0) AS nclienteantiguo
                FROM Clientes
            `),
            pgPool.query(`
                SELECT ncliente,
                       RTRIM(COALESCE(nombre, '')) AS nombre,
                       RTRIM(COALESCE(codunidad, '')) AS codunidad,
                       RTRIM(COALESCE(nmedidor, '')) AS nmedidor,
                       COALESCE(promedio, 0) AS promedio,
                       RTRIM(COALESCE(codser, '')) AS codser,
                       RTRIM(COALESCE(sector, '')) AS sector,
                       COALESCE(nclienteantiguo, 0) AS nclienteantiguo
                FROM clientes
            `)
        ]);

        const msCliMap = new Map();
        for (const c of msCliRes.recordset) msCliMap.set(String(c.ncliente), c);
        const pgCliMap = new Map();
        for (const c of pgCliRes.rows) pgCliMap.set(String(c.ncliente), c);

        for (const [nic, c] of msCliMap.entries()) {
            if (!pgCliMap.has(nic)) {
                await pgPool.query(
                    `INSERT INTO clientes (ncliente, nombre, codunidad, nmedidor, promedio, codser, sector, nclienteantiguo)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                    [c.ncliente, c.nombre, c.codunidad, c.nmedidor, c.promedio, c.codser, c.sector, c.nclienteantiguo]
                );
                stats.clientesInsertadosPg++;
            }
        }

        for (const [nic, c] of pgCliMap.entries()) {
            if (!msCliMap.has(nic)) {
                const req = mssqlPool.request();
                req.input('ncliente', sql.Numeric(18, 0), Number(c.ncliente));
                req.input('nombre', sql.VarChar, c.nombre);
                req.input('codunidad', sql.VarChar, c.codunidad);
                req.input('nmedidor', sql.VarChar, c.nmedidor);
                req.input('promedio', sql.Int, Number(c.promedio) || 0);
                req.input('codser', sql.VarChar, c.codser);
                req.input('sector', sql.VarChar, c.sector);
                req.input('nclienteantiguo', sql.Numeric(18, 0), Number(c.nclienteantiguo) || 0);
                await req.query(`
                    INSERT INTO Clientes (ncliente, nombre, codunidad, NMedidor, Promedio, Codser, Sector, NclienteAntiguo)
                    VALUES (@ncliente, @nombre, @codunidad, @nmedidor, @promedio, @codser, @sector, @nclienteantiguo)
                `);
                stats.clientesInsertadosMs++;
            }
        }

        // 2. Sincronizar Documentos activos / recientes (2025 en adelante, nóminas >= 10500 o pendientes nomina=0)
        const [msDocRes, pgDocRes] = await Promise.all([
            mssqlPool.request().query(`
                SELECT
                    RTRIM(NDocto) AS NDocto,
                    RTRIM(NCliente) AS NCliente,
                    ISNULL(Monto, 0) AS Monto,
                    RTRIM(ISNULL(Estado, '')) AS Estado,
                    UPPER(RTRIM(ISNULL(Tipo, ''))) AS Tipo,
                    FechaRecep,
                    RTRIM(ISNULL(ULectura, '0')) AS ULectura,
                    RTRIM(ISNULL(ALectura, '0')) AS ALectura,
                    FechaLectura,
                    ISNULL(Consumo, 0) AS Consumo,
                    FechaEmision,
                    FechaPago,
                    RTRIM(ISNULL(NCpbte, '0')) AS NCpbte,
                    ISNULL(SubTotal, 0) AS SubTotal,
                    ISNULL(Demanda, 0) AS Demanda,
                    ISNULL(Iva, 0) AS Iva,
                    ISNULL(Intereses, 0) AS Intereses,
                    ISNULL(Otro, 0) AS Otro,
                    FechaVen,
                    FechaProxLec,
                    RTRIM(ISNULL(Cuenta, '0')) AS Cuenta,
                    RTRIM(ISNULL(Rut, '0')) AS Rut,
                    RTRIM(ISNULL(CCosto, '0')) AS CCosto,
                    ISNULL(Nomina, 0) AS Nomina,
                    ISNULL(Autorizada, 0) AS Autorizada
                FROM Documentos
                WHERE YEAR(FechaRecep) >= 2025 OR ISNULL(Nomina, 0) >= 10500 OR ISNULL(Nomina, 0) = 0
            `),
            pgPool.query(`
                SELECT
                    RTRIM(ndocto) AS ndocto,
                    RTRIM(ncliente) AS ncliente,
                    COALESCE(monto, 0) AS monto,
                    RTRIM(COALESCE(estado, '')) AS estado,
                    UPPER(RTRIM(COALESCE(tipo, ''))) AS tipo,
                    fecharecep,
                    RTRIM(COALESCE(ulectura, '0')) AS ulectura,
                    RTRIM(COALESCE(alectura, '0')) AS alectura,
                    fechalectura,
                    COALESCE(consumo, 0) AS consumo,
                    fechaemision,
                    fechapago,
                    RTRIM(COALESCE(ncpbte, '0')) AS ncpbte,
                    COALESCE(subtotal, 0) AS subtotal,
                    COALESCE(demanda, 0) AS demanda,
                    COALESCE(iva, 0) AS iva,
                    COALESCE(intereses, 0) AS intereses,
                    COALESCE(otro, 0) AS otro,
                    fechaven,
                    fechaproxlec,
                    RTRIM(COALESCE(cuenta, '0')) AS cuenta,
                    RTRIM(COALESCE(rut, '0')) AS rut,
                    RTRIM(COALESCE(ccosto, '0')) AS ccosto,
                    COALESCE(nomina, 0) AS nomina,
                    COALESCE(autorizada, 0) AS autorizada
                FROM documentos
                WHERE EXTRACT(YEAR FROM fecharecep) >= 2025 OR COALESCE(nomina, 0) >= 10500 OR COALESCE(nomina, 0) = 0
            `)
        ]);

        const msDocMap = new Map();
        for (const d of msDocRes.recordset) {
            msDocMap.set(`${d.NDocto}|${d.NCliente}`, d);
        }
        const pgDocMap = new Map();
        for (const d of pgDocRes.rows) {
            pgDocMap.set(`${d.ndocto}|${d.ncliente}`, d);
        }

        // 2.a Documentos que están en SQL Server (ingresados en el sistema antiguo) pero no en PostgreSQL
        for (const [key, d] of msDocMap.entries()) {
            const p = pgDocMap.get(key);
            if (!p) {
                await pgPool.query(
                    `INSERT INTO documentos (
                        ndocto, ncliente, monto, estado, tipo, fecharecep,
                        ulectura, alectura, fechalectura, consumo, fechaemision,
                        fechapago, ncpbte, subtotal, demanda, iva, intereses, otro,
                        fechaven, fechaproxlec, cuenta, rut, ccosto, nomina, autorizada
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6,
                        $7, $8, $9, $10, $11,
                        $12, $13, $14, $15, $16, $17, $18,
                        $19, $20, $21, $22, $23, $24, $25
                    )`,
                    [
                        d.NDocto, d.NCliente, d.Monto, d.Estado, d.Tipo, toNoonDateOrNull(d.FechaRecep) || new Date(),
                        d.ULectura, d.ALectura, toNoonDateOrNull(d.FechaLectura), d.Consumo, toNoonDateOrNull(d.FechaEmision),
                        toNoonDateOrNull(d.FechaPago), d.NCpbte, d.SubTotal, d.Demanda, d.Iva, d.Intereses, d.Otro,
                        toNoonDateOrNull(d.FechaVen), toNoonDateOrNull(d.FechaProxLec), d.Cuenta, d.Rut, d.CCosto, d.Nomina, d.Autorizada
                    ]
                );
                stats.docsInsertadosPg++;
            } else {
                // Ambos existen: verificar si alguno avanzó de estado/nómina/autorización/comprobante
                const msNom = Number(d.Nomina || 0);
                const pgNom = Number(p.nomina || 0);
                const msAut = Number(d.Autorizada || 0);
                const pgAut = Number(p.autorizada || 0);
                const msCpb = d.NCpbte && d.NCpbte !== '0' ? d.NCpbte : '';
                const pgCpb = p.ncpbte && p.ncpbte !== '0' ? p.ncpbte : '';

                // Si SQL Server tiene cambios más avanzados (ej. nómina generada o autorizada en el sistema antiguo)
                if (
                    msNom > pgNom ||
                    msAut > pgAut ||
                    (msCpb && !pgCpb) ||
                    (msNom === pgNom && (d.Tipo !== p.tipo || d.Monto !== Number(p.monto) || d.Estado !== p.estado))
                ) {
                    const finalNom = Math.max(msNom, pgNom);
                    const finalAut = Math.max(msAut, pgAut);
                    const finalEstado = finalAut === 1 ? 'Autorizada' : (finalNom > 0 && d.Estado === 'Vigente' ? 'Enviada' : d.Estado);
                    const finalCpb = msCpb || pgCpb || '0';
                    await pgPool.query(
                        `UPDATE documentos
                         SET nomina = $1,
                             autorizada = $2,
                             estado = $3,
                             tipo = $4,
                             monto = $5,
                             ncpbte = $6,
                             fechapago = COALESCE($7, fechapago)
                         WHERE RTRIM(ndocto) = $8 AND RTRIM(ncliente) = $9`,
                        [finalNom, finalAut, finalEstado, d.Tipo, d.Monto, finalCpb, toNoonDateOrNull(d.FechaPago), d.NDocto, d.NCliente]
                    );
                    stats.docsActualizadosPg++;
                } else if (pgNom > msNom || pgAut > msAut || (pgCpb && !msCpb)) {
                    // Si PostgreSQL tiene cambios más avanzados que SQL Server
                    const finalNom = Math.max(msNom, pgNom);
                    const finalAut = Math.max(msAut, pgAut);
                    const finalEstado = finalAut === 1 ? 'Autorizada' : (finalNom > 0 && p.estado === 'Vigente' ? 'Enviada' : p.estado);
                    const finalCpb = pgCpb || msCpb || '0';
                    const req = mssqlPool.request();
                    req.input('nomina', sql.Int, finalNom);
                    req.input('autorizada', sql.Int, finalAut);
                    req.input('estado', sql.VarChar, finalEstado);
                    req.input('tipo', sql.VarChar, p.tipo);
                    req.input('monto', sql.Int, Number(p.monto) || 0);
                    req.input('ncpbte', sql.VarChar, finalCpb);
                    req.input('ndocto', sql.VarChar, p.ndocto);
                    req.input('ncliente', sql.VarChar, p.ncliente);
                    await req.query(`
                        UPDATE Documentos
                        SET Nomina = @nomina,
                            Autorizada = @autorizada,
                            Estado = @estado,
                            Tipo = @tipo,
                            Monto = @monto,
                            NCpbte = @ncpbte
                        WHERE RTRIM(NDocto) = @ndocto AND RTRIM(NCliente) = @ncliente
                    `);
                    stats.docsActualizadosMs++;
                }
            }
        }

        // 2.b Documentos que están en PostgreSQL pero no en SQL Server
        for (const [key, p] of pgDocMap.entries()) {
            if (!msDocMap.has(key)) {
                const req = mssqlPool.request();
                req.input('ndocto', sql.VarChar, p.ndocto);
                req.input('ncliente', sql.VarChar, p.ncliente);
                req.input('monto', sql.Int, Number(p.monto) || 0);
                req.input('estado', sql.VarChar, p.estado);
                req.input('tipo', sql.VarChar, p.tipo);
                req.input('fecharecep', sql.DateTime, p.fecharecep ? new Date(p.fecharecep) : new Date());
                req.input('ulectura', sql.VarChar, p.ulectura);
                req.input('alectura', sql.VarChar, p.alectura);
                req.input('fechalectura', sql.DateTime, p.fechalectura ? new Date(p.fechalectura) : new Date());
                req.input('consumo', sql.Int, Number(p.consumo) || 0);
                req.input('fechaemision', sql.DateTime, p.fechaemision ? new Date(p.fechaemision) : new Date());
                req.input('fechapago', sql.DateTime, p.fechapago ? new Date(p.fechapago) : new Date());
                req.input('ncpbte', sql.VarChar, p.ncpbte);
                req.input('subtotal', sql.Int, Number(p.subtotal) || 0);
                req.input('demanda', sql.Int, Number(p.demanda) || 0);
                req.input('iva', sql.Int, Number(p.iva) || 0);
                req.input('intereses', sql.Int, Number(p.intereses) || 0);
                req.input('otro', sql.Int, Number(p.otro) || 0);
                req.input('fechaven', sql.DateTime, p.fechaven ? new Date(p.fechaven) : new Date());
                req.input('fechaproxlec', sql.DateTime, p.fechaproxlec ? new Date(p.fechaproxlec) : new Date());
                req.input('cuenta', sql.VarChar, p.cuenta);
                req.input('rut', sql.VarChar, p.rut);
                req.input('ccosto', sql.VarChar, p.ccosto);
                req.input('nomina', sql.Int, Number(p.nomina) || 0);
                req.input('autorizada', sql.Int, Number(p.autorizada) || 0);
                await req.query(`
                    INSERT INTO Documentos (
                        NDocto, NCliente, Monto, Estado, Tipo, FechaRecep,
                        ULectura, ALectura, FechaLectura, Consumo, FechaEmision,
                        FechaPago, NCpbte, SubTotal, Demanda, Iva, Intereses, Otro,
                        FechaVen, FechaProxLec, Cuenta, Rut, CCosto, Nomina, Autorizada
                    ) VALUES (
                        @ndocto, @ncliente, @monto, @estado, @tipo, @fecharecep,
                        @ulectura, @alectura, @fechalectura, @consumo, @fechaemision,
                        @fechapago, @ncpbte, @subtotal, @demanda, @iva, @intereses, @otro,
                        @fechaven, @fechaproxlec, @cuenta, @rut, @ccosto, @nomina, @autorizada
                    )
                `);
                stats.docsInsertadosMs++;
            }
        }

        const totalChanges =
            stats.clientesInsertadosPg +
            stats.clientesInsertadosMs +
            stats.docsInsertadosPg +
            stats.docsInsertadosMs +
            stats.docsActualizadosPg +
            stats.docsActualizadosMs +
            stats.fechasCorregidasPg;

        if (totalChanges > 0) {
            console.log('[SYNC DUAL SQL<->PG] Sincronización completada:', stats);
        }
        return stats;
    } catch (err) {
        console.error('[SYNC DUAL SQL<->PG] Error en sincronización automática:', err.message);
        return { error: err.message };
    } finally {
        currentSyncPromise = null;
    }
    })();

    return currentSyncPromise;
}

function createPgConfig(defaultDbName) {
    return process.env.DATABASE_URL
        ? { connectionString: process.env.DATABASE_URL }
        : {
              host: process.env.PG_HOST || '192.168.30.47',
              port: parseInt(process.env.PG_PORT || '5432', 10),
              user: process.env.PG_USER || 'cmds_admin',
              password: process.env.PG_PASS || 'CmdsPostgres2026!',
              database: process.env.PG_DB || defaultDbName,
              max: 15,
              idleTimeoutMillis: 30000
          };
}

function createMssqlConfig() {
    const rawServer = process.env.DB_SERVER || '192.168.3.159\\BASE';
    const [serverHost, instanceName] = rawServer.includes('\\')
        ? rawServer.split('\\')
        : [rawServer, undefined];

    return {
        rawServer,
        config: {
            user: process.env.DB_USER,
            password: process.env.DB_PASS || process.env.DB_PASSWORD,
            server: process.env.DB_PORT ? serverHost : rawServer,
            ...(process.env.DB_PORT ? { port: Number(process.env.DB_PORT) } : {}),
            database: process.env.DB_NAME,
            requestTimeout: 60000,
            connectionTimeout: 30000,
            options: {
                encrypt: false,
                trustServerCertificate: true,
                enableArithAbort: true,
                ...(!process.env.DB_PORT && instanceName ? { instanceName } : {})
            },
            pool: {
                max: 10,
                min: 0,
                idleTimeoutMillis: 30000
            }
        }
    };
}

let poolPromise = null;
let syncTimer = null;

async function initPool() {
    const { rawServer, config: mssqlConfig } = createMssqlConfig();

    if (!PgPool || (DB_ENGINE !== 'dual' && DB_ENGINE !== 'ambos' && DB_ENGINE !== 'marcha_blanca' && DB_ENGINE !== 'postgres' && DB_ENGINE !== 'pg' && DB_ENGINE !== 'postgresql')) {
        const pool = await new sql.ConnectionPool(mssqlConfig).connect();
        console.log('Conectado exitosamente a SQL Server (' + rawServer + ' -> ' + process.env.DB_NAME + ')');
        return pool;
    }

    if (DB_ENGINE === 'postgres' || DB_ENGINE === 'pg' || DB_ENGINE === 'postgresql') {
        const pgConfig = createPgConfig('bd_control_servicios');
        const pgPool = new PgPool(pgConfig);
        await pgPool.query('SELECT 1');
        console.log(`Conectado a PostgreSQL exitosamente (${pgConfig.host || 'URL'} -> ${pgConfig.database || 'bd_control_servicios'})`);
        return {
            request: () => new PgRequestWrapper(pgPool),
            query: (q) => new PgRequestWrapper(pgPool).query(q),
            close: () => pgPool.end()
        };
    }

    // Modo DUAL (SQL Server + PostgreSQL) con sincronización bidireccional automática
    const pgConfig = createPgConfig('bd_control_servicios');
    const pgPool = new PgPool(pgConfig);

    const [mssqlOut, pgOut] = await Promise.allSettled([
        new sql.ConnectionPool(mssqlConfig).connect(),
        pgPool.query('SELECT 1')
    ]);

    if (mssqlOut.status === 'fulfilled' && pgOut.status === 'fulfilled') {
        const mssqlPool = mssqlOut.value;
        console.log(
            `[MODO MARCHA BLANCA DUAL] Conectado simultáneamente a SQL Server (${rawServer} -> ${mssqlConfig.database}) y PostgreSQL (${pgConfig.host} -> ${pgConfig.database})`
        );

        // Ejecutar sincronización inicial y programar sincronización periódica cada 20s
        syncDualDatabases(mssqlPool, pgPool).catch(() => {});
        if (!syncTimer) {
            syncTimer = setInterval(() => {
                syncDualDatabases(mssqlPool, pgPool).catch(() => {});
            }, 20000);
            if (syncTimer.unref) syncTimer.unref();
        }

        return {
            mssqlPool,
            pgPool,
            syncNow: () => syncDualDatabases(mssqlPool, pgPool),
            request: () => new DualRequestWrapper(mssqlPool, pgPool),
            query: (q) => new DualRequestWrapper(mssqlPool, pgPool).query(q),
            close: async () => {
                if (syncTimer) clearInterval(syncTimer);
                await Promise.allSettled([mssqlPool.close(), pgPool.end()]);
            }
        };
    }

    if (mssqlOut.status === 'fulfilled') {
        console.warn('[DB DUAL] PostgreSQL no disponible (' + (pgOut.reason?.message || 'error') + '). Operando con SQL Server.');
        pgPool.end().catch(() => {});
        return mssqlOut.value;
    }

    if (pgOut.status === 'fulfilled') {
        console.warn('[DB DUAL] SQL Server no disponible (' + (mssqlOut.reason?.message || 'error') + '). Operando con PostgreSQL.');
        return {
            request: () => new PgRequestWrapper(pgPool),
            query: (q) => new PgRequestWrapper(pgPool).query(q),
            close: () => pgPool.end()
        };
    }

    throw mssqlOut.reason || pgOut.reason;
}

async function getConnection() {
    if (!poolPromise) {
        poolPromise = initPool().catch(err => {
            console.error('Error de conexión a Base de Datos ControlServicios:', err.message);
            poolPromise = null;
            throw err;
        });
    }
    return poolPromise;
}

const getPool = getConnection;

getConnection().catch(() => {});

module.exports = {
    sql,
    get poolPromise() {
        return getConnection();
    },
    getPool,
    getConnection,
    syncDualDatabases,
    DB_ENGINE
};
