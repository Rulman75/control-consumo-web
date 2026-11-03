const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../db');

// 1. Listar Nóminas Recientes (Resumen para seguimiento rápido)
router.get('/nominas/recientes', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT TOP 60
                d.Nomina,
                RTRIM(ISNULL(MAX(c.Codser), '')) AS Codser,
                RTRIM(ISNULL(MAX(s.NombreSer), MAX(c.Codser))) AS NombreSer,
                RTRIM(ISNULL(MAX(c.Sector), '')) AS Sector,
                RTRIM(ISNULL(MAX(d.Tipo), '')) AS Tipo,
                COUNT(*) AS TotalDocumentos,
                SUM(ISNULL(d.Monto, 0)) AS MontoTotal,
                RTRIM(ISNULL(MAX(d.Estado), '')) AS Estado,
                MAX(ISNULL(d.Autorizada, 0)) AS Autorizada,
                MAX(d.FechaRecep) AS FechaProceso,
                MAX(d.FechaPago) AS FechaPago,
                RTRIM(ISNULL(MAX(d.NCpbte), '0')) AS NCpbte
            FROM Documentos d
            LEFT JOIN Clientes c ON CAST(c.ncliente AS VARCHAR(50)) = RTRIM(d.NCliente)
            OUTER APPLY (
                SELECT TOP 1 CodSer, NombreSer
                FROM Servicios srv
                WHERE RTRIM(srv.NombreSer) = RTRIM(c.Codser) OR RTRIM(srv.CodSer) = RTRIM(c.Codser)
                ORDER BY srv.CodSer
            ) s
            WHERE ISNULL(d.Nomina, 0) > 0
            GROUP BY d.Nomina
            ORDER BY d.Nomina DESC
        `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Error al consultar nóminas recientes:', error);
        res.status(500).json({ error: 'Error al consultar el historial de nóminas.' });
    }
});

// 2. Buscar Documentos Pendientes sin Nómina (GeneraNomina.vb -> Button1_Click)
router.get('/nominas/pendientes', async (req, res) => {
    const { codser, tipo, sector } = req.query;
    if (!codser || !tipo || !sector) {
        return res.status(400).json({ error: 'Debe seleccionar Servicio, Tipo de Documento y Área/Sector.' });
    }

    try {
        const pool = await getPool();
        const request = pool.request();
        request.input('codser', sql.VarChar, codser.trim());
        request.input('tipo', sql.VarChar, tipo.trim());
        request.input('sector', sql.VarChar, sector.trim());

        const result = await request.query(`
            SELECT
                c.ncliente,
                RTRIM(ISNULL(c.codunidad, '')) AS codunidad,
                RTRIM(ISNULL(e.Descripcion, c.nombre)) AS unidadDescripcion,
                RTRIM(ISNULL(c.nombre, '')) AS nombre,
                RTRIM(d.NDocto) AS NDocto,
                d.FechaEmision,
                d.FechaRecep,
                d.FechaVen,
                ISNULL(d.Monto, 0) AS Monto,
                ISNULL(d.Consumo, 0) AS Consumo,
                RTRIM(ISNULL(d.Estado, '')) AS Estado,
                ISNULL(d.Nomina, 0) AS Nomina,
                RTRIM(ISNULL(c.Codser, '')) AS Codser,
                RTRIM(ISNULL(s.NombreSer, c.Codser)) AS NombreSer,
                RTRIM(ISNULL(d.Tipo, '')) AS Tipo,
                RTRIM(ISNULL(c.Sector, '')) AS Sector
            FROM Clientes c
            INNER JOIN Documentos d ON CAST(c.ncliente AS VARCHAR(50)) = RTRIM(d.NCliente)
            LEFT JOIN LIC_ESTABLECIMIENTO e ON TRY_CAST(RTRIM(c.codunidad) AS INT) = e.CodUnidad
            OUTER APPLY (
                SELECT TOP 1 CodSer, NombreSer
                FROM Servicios srv
                WHERE RTRIM(srv.NombreSer) = RTRIM(c.Codser) OR RTRIM(srv.CodSer) = RTRIM(c.Codser)
                ORDER BY srv.CodSer
            ) s
            WHERE ISNULL(d.Nomina, 0) = 0
              AND (RTRIM(c.Codser) = @codser OR RTRIM(ISNULL(s.CodSer, '')) = @codser OR RTRIM(ISNULL(s.NombreSer, '')) = @codser)
              AND RTRIM(d.Tipo) = @tipo
              AND RTRIM(c.Sector) = @sector
            ORDER BY TRY_CAST(RTRIM(c.codunidad) AS INT), c.ncliente, d.FechaEmision
        `);

        res.json(result.recordset);
    } catch (error) {
        console.error('Error al buscar documentos pendientes para nómina:', error);
        res.status(500).json({ error: 'Error al consultar documentos pendientes de nómina.' });
    }
});

// 3. Generar Nueva Nómina (GeneraNomina.vb -> Button2_Click)
router.post('/nominas/generar', async (req, res) => {
    const { codser, tipo, sector } = req.body;
    if (!codser || !tipo || !sector) {
        return res.status(400).json({ error: 'Debe especificar Servicio, Tipo de Documento y Sector para generar la nómina.' });
    }

    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    try {
        await transaction.begin();

        const corrReq = new sql.Request(transaction);
        const corrRes = await corrReq.query('SELECT ISNULL(MAX(Nomina), 0) + 1 AS SiguienteNomina FROM Documentos');
        const nuevaNomina = corrRes.recordset[0].SiguienteNomina;

        const updReq = new sql.Request(transaction);
        updReq.input('nuevaNomina', sql.Int, nuevaNomina);
        updReq.input('codser', sql.VarChar, codser.trim());
        updReq.input('tipo', sql.VarChar, tipo.trim());
        updReq.input('sector', sql.VarChar, sector.trim());

        const updRes = await updReq.query(`
            UPDATE d
            SET d.Nomina = @nuevaNomina,
                d.Estado = 'Enviada'
            FROM Documentos d
            INNER JOIN Clientes c ON CAST(c.ncliente AS VARCHAR(50)) = RTRIM(d.NCliente)
            OUTER APPLY (
                SELECT TOP 1 CodSer, NombreSer
                FROM Servicios srv
                WHERE RTRIM(srv.NombreSer) = RTRIM(c.Codser) OR RTRIM(srv.CodSer) = RTRIM(c.Codser)
                ORDER BY srv.CodSer
            ) s
            WHERE ISNULL(d.Nomina, 0) = 0
              AND (RTRIM(c.Codser) = @codser OR RTRIM(ISNULL(s.CodSer, '')) = @codser OR RTRIM(ISNULL(s.NombreSer, '')) = @codser)
              AND RTRIM(d.Tipo) = @tipo
              AND RTRIM(c.Sector) = @sector
        `);

        const totalActualizados = updRes.rowsAffected[0] || 0;
        if (totalActualizados === 0) {
            await transaction.rollback();
            return res.status(400).json({ error: 'No se encontraron documentos pendientes para incluir en la nómina.' });
        }

        await transaction.commit();
        res.json({
            success: true,
            nomina: nuevaNomina,
            documentosAsignados: totalActualizados,
            message: `Nómina Nº ${nuevaNomina} generada exitosamente con ${totalActualizados} documentos.`
        });
    } catch (error) {
        try { await transaction.rollback(); } catch (_) {}
        console.error('Error al generar nómina:', error);
        res.status(500).json({ error: 'Error al generar la nómina en la base de datos.' });
    }
});

// 4. Autorizar Nómina para Traspaso Softland (Autorizar.vb -> Button2_Click)
router.post('/nominas/autorizar', async (req, res) => {
    const { nomina } = req.body;
    if (!nomina || isNaN(Number(nomina))) {
        return res.status(400).json({ error: 'Debe ingresar un Nº de Nómina válido.' });
    }

    try {
        const pool = await getPool();
        const request = pool.request();
        request.input('nomina', sql.Int, Number(nomina));

        const result = await request.query(`
            UPDATE Documentos
            SET Autorizada = 1,
                Estado = 'Autorizada'
            WHERE Nomina = @nomina
        `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: `No existen documentos asociados a la Nómina Nº ${nomina}.` });
        }

        res.json({
            success: true,
            nomina: Number(nomina),
            documentosAutorizados: result.rowsAffected[0],
            message: `Nómina Nº ${nomina} autorizada para descarga en Softland.`
        });
    } catch (error) {
        console.error('Error al autorizar nómina:', error);
        res.status(500).json({ error: 'Error al autorizar la nómina.' });
    }
});

// 5. Consultar Nómina para Pagos Masivos (IngresoPagos.vb -> Button1_Click)
router.get('/pagos/:nomina', async (req, res) => {
    const { nomina } = req.params;
    if (!nomina || isNaN(Number(nomina))) {
        return res.status(400).json({ error: 'El Nº de Nómina debe ser numérico.' });
    }

    try {
        const pool = await getPool();
        const request = pool.request();
        request.input('nomina', sql.Int, Number(nomina));

        const result = await request.query(`
            SELECT
                RTRIM(d.NDocto) AS NDocto,
                RTRIM(d.NCliente) AS NCliente,
                RTRIM(ISNULL(c.codunidad, '')) AS codunidad,
                RTRIM(ISNULL(e.Descripcion, c.nombre)) AS unidadDescripcion,
                RTRIM(ISNULL(c.nombre, '')) AS nombreCliente,
                d.FechaEmision,
                ISNULL(d.Monto, 0) AS Monto,
                d.FechaPago,
                RTRIM(ISNULL(d.NCpbte, '0')) AS NCpbte,
                ISNULL(d.Nomina, 0) AS Nomina,
                RTRIM(ISNULL(d.Estado, '')) AS Estado,
                RTRIM(ISNULL(d.Tipo, '')) AS Tipo,
                ISNULL(d.Autorizada, 0) AS Autorizada,
                RTRIM(ISNULL(s.CodSer, c.Codser)) AS CodSer,
                RTRIM(ISNULL(s.NombreSer, c.Codser)) AS NombreSer,
                RTRIM(ISNULL(c.Sector, '')) AS Sector
            FROM Documentos d
            LEFT JOIN Clientes c ON CAST(c.ncliente AS VARCHAR(50)) = RTRIM(d.NCliente)
            OUTER APPLY (
                SELECT TOP 1 CodSer, NombreSer
                FROM Servicios srv
                WHERE RTRIM(srv.NombreSer) = RTRIM(c.Codser) OR RTRIM(srv.CodSer) = RTRIM(c.Codser)
                ORDER BY srv.CodSer
            ) s
            LEFT JOIN LIC_ESTABLECIMIENTO e ON TRY_CAST(RTRIM(c.codunidad) AS INT) = e.CodUnidad
            WHERE d.Nomina = @nomina
            ORDER BY TRY_CAST(RTRIM(c.codunidad) AS INT), d.NDocto
        `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: `No se encontraron documentos para la Nómina Nº ${nomina}.` });
        }

        const first = result.recordset[0];
        const montoTotal = result.recordset.reduce((acc, r) => acc + (r.Monto || 0), 0);

        res.json({
            resumen: {
                nomina: Number(nomina),
                codser: first.CodSer,
                nombreServicio: first.NombreSer,
                sector: first.Sector,
                tipo: first.Tipo,
                estado: first.Estado,
                autorizada: first.Autorizada,
                fechaPagoActual: first.FechaPago,
                ncpbteActual: first.NCpbte,
                totalDocumentos: result.recordset.length,
                montoTotal
            },
            documentos: result.recordset
        });
    } catch (error) {
        console.error('Error al buscar nómina para pagos:', error);
        res.status(500).json({ error: 'Error al consultar la nómina.' });
    }
});

// 6. Registrar Pagos Masivos por Nómina (IngresoPagos.vb -> Button2_Click)
router.post('/pagos', async (req, res) => {
    const { nomina, fechaPago, ncpbte } = req.body;
    if (!nomina || isNaN(Number(nomina))) {
        return res.status(400).json({ error: 'Debe indicar un Nº de Nómina válido.' });
    }
    if (!ncpbte || !String(ncpbte).trim()) {
        return res.status(400).json({ error: 'Debe ingresar el Nº de Comprobante (NCpbte).' });
    }

    try {
        const pool = await getPool();
        const request = pool.request();
        request.input('nomina', sql.Int, Number(nomina));
        request.input('fechapago', sql.DateTime, fechaPago ? new Date(fechaPago) : new Date());
        request.input('ncpbte', sql.VarChar, String(ncpbte).trim());

        const result = await request.query(`
            UPDATE Documentos
            SET FechaPago = @fechapago,
                NCpbte = @ncpbte
            WHERE Nomina = @nomina
        `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: `No se encontraron documentos en la Nómina Nº ${nomina}.` });
        }

        res.json({
            success: true,
            documentosActualizados: result.rowsAffected[0],
            message: `Pagos actualizados correctamente para los ${result.rowsAffected[0]} documentos de la Nómina Nº ${nomina}.`
        });
    } catch (error) {
        console.error('Error al registrar pagos masivos:', error);
        res.status(500).json({ error: 'Error al actualizar los pagos de la nómina.' });
    }
});

// Columnas estándar de 52 posiciones de Softland (CapturaSoftland.rdlc y CapturaSoftlandF.rdlc)
const SOFTLAND_52_HEADERS = [
    'Codigo Plan Cta',
    'Monto al Debe',
    'Monto al Haber',
    'Descripcion Movimiento',
    'Equivalencia Moneda',
    'Monto Al Debe Moneda Adicional',
    'Monto Al Haber Moneda Adicional',
    'Codigo Condición de Venta',
    'Codigo Vendedor',
    'Codigo Ubicación',
    'Codigo Concepto de Caja',
    'Codigo instrumento Financiero',
    'Cantidad Instrumento Financiero',
    'Codigo Detalle de Gasto',
    'Cantidad Concepto de Gasto',
    'Codigo Centro Costo',
    'Tipo Docto Conciliacion',
    'Nº Docto Conciliación',
    'Codigo Auxiliar',
    'Tipo Docto',
    'Nº Docto',
    'Fecha Emision Docto',
    'Fecha Vencimiento Docto',
    'Tipo Docto Referencia',
    'Nro. Docto Referencia',
    'Nro. Correlativo',
    'Monto 1 Detalle Libro',
    'Monto 2 Detalle Libro',
    'Monto 3 Detalle Libro',
    'Monto 4 Detalle Libro',
    'Monto 5 Detalle Libro',
    'Monto 6 Detalle Libro',
    'Monto 7 Detalle Libro',
    'Monto 8 Detalle Libro',
    'Monto 9 Detalle Libro',
    'Suma Detalle Libro',
    'Numero Docto Desde',
    'Numero Docto Hasta',
    'Nº Agrupacion en igual comprobante',
    'Graba el Detalle de Libro(S/N)',
    'Documento Nulo (S/N)',
    'Codigo Flujo Efectivo 1',
    'Monto Flujo 1',
    'Codigo Flujo Efectivo 2',
    'Monto Flujo 2',
    'Codigo Flujo Efectivo 3',
    'Monto Flujo 3',
    'Codigo Flujo Efectivo 4',
    'Monto Flujo efectivo 4',
    'Codigo Flujo Efectivo 5',
    'Monto Flujo efectivo 5',
    'Codigo Flujo Efectivo 6'
];

const formatShortDate = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '';
    const day = String(dt.getDate()).padStart(2, '0');
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const year = dt.getFullYear();
    return `${day}-${month}-${year}`;
};

// 7. Consultar Captura / Archivo Softland por Nº Nómina (CapturaSoftland.vb + RDLC 52 columnas)
router.get('/softland/:nomina', async (req, res) => {
    const { nomina } = req.params;
    if (!nomina || isNaN(Number(nomina))) {
        return res.status(400).json({ error: 'El Nº de Nómina debe ser numérico.' });
    }

    try {
        const pool = await getPool();
        const request = pool.request();
        request.input('nomina', sql.Int, Number(nomina));

        const result = await request.query(`
            SELECT
                c.ncliente,
                RTRIM(ISNULL(c.nombre, '')) AS nombre,
                RTRIM(ISNULL(c.codunidad, '')) AS codunidad,
                RTRIM(ISNULL(c.Codser, '')) AS Codser,
                RTRIM(ISNULL(c.Sector, '')) AS Sector,
                RTRIM(d.NDocto) AS NDocto,
                ISNULL(d.Monto, 0) AS Monto,
                RTRIM(ISNULL(d.Estado, '')) AS Estado,
                RTRIM(ISNULL(d.Tipo, '')) AS Tipo,
                d.FechaEmision,
                d.FechaVen,
                ISNULL(d.Nomina, 0) AS Nomina,
                ISNULL(d.Autorizada, 0) AS Autorizada,
                RTRIM(ISNULL(s.NombreSer, c.Codser)) AS NombreSer,
                RTRIM(ISNULL(e.Ccosto, '')) AS Expr1,
                RTRIM(ISNULL(s.Cuenta, '5-1-02-001')) AS Expr2,
                RTRIM(ISNULL(s.Rut, '')) AS Expr3,
                RTRIM(ISNULL(s.Cuenta2, '2-1-02-002')) AS Cuenta2,
                RTRIM(ISNULL(s.DescCuenta2, '')) AS DescCuenta2,
                RTRIM(ISNULL(e.CodCenco, c.codunidad)) AS CodCenco,
                RTRIM(ISNULL(e.Descripcion, c.nombre)) AS DescripcionUnidad
            FROM Clientes c
            INNER JOIN Documentos d ON CAST(c.ncliente AS VARCHAR(50)) = RTRIM(d.NCliente)
            OUTER APPLY (
                SELECT TOP 1 CodSer, NombreSer, Rut, Cuenta, Cuenta2, DescCuenta2
                FROM Servicios srv
                WHERE RTRIM(srv.NombreSer) = RTRIM(c.Codser) OR RTRIM(srv.CodSer) = RTRIM(c.Codser)
                ORDER BY srv.CodSer
            ) s
            LEFT JOIN LIC_ESTABLECIMIENTO e ON TRY_CAST(RTRIM(c.codunidad) AS INT) = e.CodUnidad
            WHERE d.Nomina = @nomina
            ORDER BY TRY_CAST(RTRIM(c.codunidad) AS INT), d.NDocto
        `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: `No se encontraron registros para la Nómina Nº ${nomina}.` });
        }

        const rows = result.recordset;
        const first = rows[0];
        const autorizada = rows.some(r => r.Autorizada === 1);
        const tipoPredominante = (first.Tipo || 'OT').trim().toUpperCase();
        const esFactura = tipoPredominante === 'FI' || tipoPredominante === 'NC' || tipoPredominante === 'ND';
        const montoTotal = rows.reduce((sum, r) => sum + (r.Monto || 0), 0);

        const today = new Date();
        const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
        const todayStr = formatShortDate(today);
        const in30DaysStr = formatShortDate(in30Days);

        const softlandMatrix = [];
        const createEmpty52Row = () => new Array(52).fill('');

        if (!esFactura) {
            for (const r of rows) {
                const line = createEmpty52Row();
                line[0] = r.Expr2;
                line[1] = r.Monto;
                line[3] = `${r.CodCenco} B/${r.NDocto} ${formatShortDate(r.FechaEmision)}`.trim();
                line[13] = 1;
                line[15] = r.Expr1;
                line[38] = 1;
                softlandMatrix.push(line);
            }
            const creditLine = createEmpty52Row();
            creditLine[0] = first.Cuenta2 || '2-1-02-002';
            creditLine[2] = montoTotal;
            creditLine[3] = `Nº ${first.Nomina} ${first.NombreSer}`;
            creditLine[18] = first.Expr3;
            creditLine[19] = 'OT';
            creditLine[20] = String(first.Nomina);
            creditLine[21] = todayStr;
            creditLine[22] = todayStr;
            creditLine[38] = 1;
            creditLine[39] = 'N';
            creditLine[40] = 'N';
            softlandMatrix.push(creditLine);
        } else {
            for (const r of rows) {
                const debitLine = createEmpty52Row();
                debitLine[0] = r.Expr2;
                debitLine[1] = r.Monto;
                debitLine[3] = `${r.codunidad} F/${r.NDocto}`.trim();
                debitLine[14] = 1;
                debitLine[15] = r.Expr1;
                debitLine[38] = 1;
                softlandMatrix.push(debitLine);

                const neto = Math.round(r.Monto / 1.19);
                const iva = Math.round((r.Monto / 1.19) * 0.19);
                const creditLine = createEmpty52Row();
                creditLine[0] = '2-1-01-002';
                creditLine[2] = r.Monto;
                creditLine[3] = `${first.CodCenco} ${r.NombreSer}`.trim();
                creditLine[18] = r.Expr3;
                creditLine[19] = r.Tipo;
                creditLine[20] = r.NDocto;
                creditLine[21] = todayStr;
                creditLine[22] = in30DaysStr;
                creditLine[26] = neto;
                creditLine[27] = iva;
                creditLine[35] = r.Monto;
                creditLine[38] = 1;
                creditLine[39] = 'S';
                softlandMatrix.push(creditLine);
            }
        }

        res.json({
            resumen: {
                nomina: Number(nomina),
                autorizada,
                mensajeAutorizacion: autorizada
                    ? null
                    : 'La nómina aún NO ha sido autorizada para descarga en Softland.',
                codser: first.Codser,
                nombreServicio: first.NombreSer,
                rutProveedor: first.Expr3,
                cuentaGasto: first.Expr2,
                cuentaPasivo: esFactura ? '2-1-01-002' : (first.Cuenta2 || '2-1-02-002'),
                descCuentaPasivo: first.DescCuenta2,
                sector: first.Sector,
                tipo: tipoPredominante,
                formatoSoftland: esFactura ? 'FACTURA (CapturaSoftlandF - 2-1-01-002)' : 'BOLETA / OT (CapturaSoftland - 2-1-02-002)',
                totalDocumentos: rows.length,
                montoTotal
            },
            detalles: rows,
            softlandHeaders: SOFTLAND_52_HEADERS,
            softlandMatrix
        });
    } catch (error) {
        console.error('Error al generar captura Softland:', error);
        res.status(500).json({ error: 'Error al procesar los datos para Softland.' });
    }
});

module.exports = router;
