const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../db');

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// 1. Dashboard & Estadísticas Ejecutivas
router.get('/dashboard', async (req, res) => {
    const { anio, codser, sector } = req.query;
    try {
        const pool = await getPool();
        const request = pool.request();

        let conditions = ["UPPER(RTRIM(ISNULL(d.Estado, ''))) <> 'NULO'"];
        if (anio && anio !== 'TODOS' && !isNaN(Number(anio))) {
            request.input('anio', sql.Int, Number(anio));
            conditions.push('YEAR(d.FechaEmision) = @anio');
        }
        if (codser && codser !== 'TODOS') {
            request.input('codser', sql.VarChar, codser.trim());
            conditions.push('(RTRIM(c.Codser) = @codser OR RTRIM(ISNULL(s.CodSer, \'\')) = @codser OR RTRIM(ISNULL(s.NombreSer, \'\')) = @codser)');
        }
        if (sector && sector !== 'TODOS') {
            request.input('sector', sql.VarChar, sector.trim());
            conditions.push('RTRIM(c.Sector) = @sector');
        }

        const whereClause = conditions.join(' AND ');
        const srvApply = `
            OUTER APPLY (
                SELECT TOP 1 CodSer, NombreSer
                FROM Servicios srv
                WHERE RTRIM(srv.NombreSer) = RTRIM(c.Codser) OR RTRIM(srv.CodSer) = RTRIM(c.Codser)
                ORDER BY srv.CodSer
            ) s
        `;

        const [kpiRes, mensualRes, srvRes, sectorRes, estabRes, estadoRes] = await Promise.all([
            request.query(`
                SELECT
                    COUNT(*) AS TotalDocumentos,
                    ISNULL(SUM(CAST(ISNULL(d.Monto, 0) AS BIGINT)), 0) AS MontoTotal,
                    ISNULL(SUM(CAST(ISNULL(d.Consumo, 0) AS BIGINT)), 0) AS ConsumoTotal,
                    COUNT(DISTINCT d.NCliente) AS ClientesConMovimiento,
                    COUNT(DISTINCT CASE WHEN ISNULL(d.Nomina, 0) > 0 THEN d.Nomina END) AS TotalNominas,
                    SUM(CASE WHEN ISNULL(d.Nomina, 0) = 0 THEN 1 ELSE 0 END) AS PendientesNomina
                FROM Documentos d
                INNER JOIN Clientes c ON CAST(c.ncliente AS VARCHAR(50)) = RTRIM(d.NCliente)
                ${srvApply}
                WHERE ${whereClause}
            `),
            request.query(`
                SELECT
                    MONTH(d.FechaEmision) AS Mes,
                    COUNT(*) AS Documentos,
                    ISNULL(SUM(CAST(ISNULL(d.Monto, 0) AS BIGINT)), 0) AS Monto,
                    ISNULL(SUM(CAST(ISNULL(d.Consumo, 0) AS BIGINT)), 0) AS Consumo
                FROM Documentos d
                INNER JOIN Clientes c ON CAST(c.ncliente AS VARCHAR(50)) = RTRIM(d.NCliente)
                ${srvApply}
                WHERE d.FechaEmision IS NOT NULL AND ${whereClause}
                GROUP BY MONTH(d.FechaEmision)
                ORDER BY Mes
            `),
            request.query(`
                SELECT TOP 10
                    RTRIM(ISNULL(c.Codser, 'S/I')) AS CodSer,
                    RTRIM(ISNULL(MAX(s.NombreSer), RTRIM(ISNULL(c.Codser, 'S/I')))) AS NombreSer,
                    COUNT(*) AS Documentos,
                    ISNULL(SUM(CAST(ISNULL(d.Monto, 0) AS BIGINT)), 0) AS Monto,
                    ISNULL(SUM(CAST(ISNULL(d.Consumo, 0) AS BIGINT)), 0) AS Consumo
                FROM Documentos d
                INNER JOIN Clientes c ON CAST(c.ncliente AS VARCHAR(50)) = RTRIM(d.NCliente)
                ${srvApply}
                WHERE ${whereClause}
                GROUP BY RTRIM(ISNULL(c.Codser, 'S/I'))
                ORDER BY Monto DESC
            `),
            request.query(`
                SELECT
                    CASE
                        WHEN RTRIM(ISNULL(c.Sector, '')) = '' THEN 'Sin Sector'
                        ELSE RTRIM(c.Sector)
                    END AS Sector,
                    COUNT(*) AS Documentos,
                    ISNULL(SUM(CAST(ISNULL(d.Monto, 0) AS BIGINT)), 0) AS Monto
                FROM Documentos d
                INNER JOIN Clientes c ON CAST(c.ncliente AS VARCHAR(50)) = RTRIM(d.NCliente)
                ${srvApply}
                WHERE ${whereClause}
                GROUP BY CASE WHEN RTRIM(ISNULL(c.Sector, '')) = '' THEN 'Sin Sector' ELSE RTRIM(c.Sector) END
                ORDER BY Monto DESC
            `),
            request.query(`
                SELECT TOP 12
                    RTRIM(ISNULL(c.codunidad, 'S/U')) AS CodUnidad,
                    RTRIM(ISNULL(MAX(e.Descripcion), MAX(c.nombre))) AS Establecimiento,
                    RTRIM(ISNULL(MAX(c.Sector), '')) AS Sector,
                    COUNT(*) AS Documentos,
                    ISNULL(SUM(CAST(ISNULL(d.Monto, 0) AS BIGINT)), 0) AS Monto
                FROM Documentos d
                INNER JOIN Clientes c ON CAST(c.ncliente AS VARCHAR(50)) = RTRIM(d.NCliente)
                ${srvApply}
                LEFT JOIN LIC_ESTABLECIMIENTO e ON TRY_CAST(RTRIM(c.codunidad) AS INT) = e.CodUnidad
                WHERE ${whereClause}
                GROUP BY RTRIM(ISNULL(c.codunidad, 'S/U'))
                ORDER BY Monto DESC
            `),
            request.query(`
                SELECT
                    CASE
                        WHEN RTRIM(ISNULL(d.Estado, '')) = '' THEN 'Sin Estado'
                        ELSE RTRIM(d.Estado)
                    END AS Estado,
                    COUNT(*) AS Documentos,
                    ISNULL(SUM(CAST(ISNULL(d.Monto, 0) AS BIGINT)), 0) AS Monto
                FROM Documentos d
                INNER JOIN Clientes c ON CAST(c.ncliente AS VARCHAR(50)) = RTRIM(d.NCliente)
                ${srvApply}
                WHERE 1=1
                  ${anio && anio !== 'TODOS' && !isNaN(Number(anio)) ? 'AND YEAR(d.FechaEmision) = @anio' : ''}
                  ${codser && codser !== 'TODOS' ? 'AND (RTRIM(c.Codser) = @codser OR RTRIM(ISNULL(s.CodSer, \'\')) = @codser OR RTRIM(ISNULL(s.NombreSer, \'\')) = @codser)' : ''}
                  ${sector && sector !== 'TODOS' ? 'AND RTRIM(c.Sector) = @sector' : ''}
                GROUP BY CASE WHEN RTRIM(ISNULL(d.Estado, '')) = '' THEN 'Sin Estado' ELSE RTRIM(d.Estado) END
                ORDER BY Documentos DESC
            `)
        ]);

        const evolucionMensual = MESES_CORTOS.map((nombre, idx) => {
            const found = mensualRes.recordset.find(m => m.Mes === idx + 1);
            return {
                mesNumero: idx + 1,
                mes: nombre,
                Documentos: found ? Number(found.Documentos) : 0,
                Monto: found ? Number(found.Monto) : 0,
                Consumo: found ? Number(found.Consumo) : 0
            };
        });

        const kpiRaw = kpiRes.recordset[0] || {};
        const kpis = {
            TotalDocumentos: Number(kpiRaw.TotalDocumentos || 0),
            MontoTotal: Number(kpiRaw.MontoTotal || 0),
            ConsumoTotal: Number(kpiRaw.ConsumoTotal || 0),
            ClientesConMovimiento: Number(kpiRaw.ClientesConMovimiento || 0),
            TotalNominas: Number(kpiRaw.TotalNominas || 0),
            PendientesNomina: Number(kpiRaw.PendientesNomina || 0)
        };

        const porServicio = srvRes.recordset.map(r => ({
            ...r,
            Documentos: Number(r.Documentos || 0),
            Monto: Number(r.Monto || 0),
            Consumo: Number(r.Consumo || 0)
        }));

        const porSector = sectorRes.recordset.map(r => ({
            ...r,
            Documentos: Number(r.Documentos || 0),
            Monto: Number(r.Monto || 0)
        }));

        const topEstablecimientos = estabRes.recordset.map(r => ({
            ...r,
            Documentos: Number(r.Documentos || 0),
            Monto: Number(r.Monto || 0)
        }));

        const porEstado = estadoRes.recordset.map(r => ({
            ...r,
            Documentos: Number(r.Documentos || 0),
            Monto: Number(r.Monto || 0)
        }));

        res.json({
            kpis,
            evolucionMensual,
            porServicio,
            porSector,
            topEstablecimientos,
            porEstado
        });
    } catch (error) {
        console.error('Error al cargar dashboard de consumos:', error);
        res.status(500).json({ error: 'Error al generar estadísticas de consumos.' });
    }
});

// 2. Informe: Documentos por Servicio (FiltraporServicio.vb + Informe_presupuesto3.rdlc)
router.get('/por-servicio', async (req, res) => {
    const { codser, desde, hasta } = req.query;
    if (!codser || !desde || !hasta) {
        return res.status(400).json({ error: 'Debe seleccionar el Servicio y el rango de fechas (Desde / Hasta).' });
    }

    try {
        const pool = await getPool();
        const request = pool.request();
        request.input('codser', sql.VarChar, codser.trim());
        request.input('desde', sql.DateTime, new Date(`${desde}T00:00:00`));
        request.input('hasta', sql.DateTime, new Date(`${hasta}T23:59:59`));

        const result = await request.query(`
            SELECT
                c.ncliente,
                RTRIM(ISNULL(c.codunidad, '')) AS codunidad,
                RTRIM(ISNULL(e.Descripcion, c.nombre)) AS Descripcion,
                RTRIM(ISNULL(e.CodCenco, '')) AS CodCenco,
                RTRIM(ISNULL(e.Domicilio, '')) AS Domicilio,
                RTRIM(ISNULL(e.CodSector, c.Sector)) AS CodSector,
                RTRIM(ISNULL(e.financiamiento, '')) AS financiamiento,
                RTRIM(d.NDocto) AS NDocto,
                RTRIM(ISNULL(d.Tipo, '')) AS Tipo,
                ISNULL(d.SubTotal, 0) AS SubTotal,
                ISNULL(d.Intereses, 0) AS Intereses,
                ISNULL(d.Otro, 0) AS Otro,
                ISNULL(d.Monto, 0) AS Monto,
                RTRIM(ISNULL(d.ULectura, '0')) AS ULectura,
                RTRIM(ISNULL(d.ALectura, '0')) AS ALectura,
                ISNULL(d.Consumo, 0) AS Consumo,
                d.FechaLectura,
                d.FechaProxLec,
                d.FechaEmision,
                d.FechaRecep,
                d.FechaVen,
                d.FechaPago,
                RTRIM(ISNULL(d.NCpbte, '0')) AS NCpbte,
                ISNULL(d.Nomina, 0) AS Nomina,
                RTRIM(ISNULL(c.Codser, '')) AS Codser,
                RTRIM(ISNULL(s.NombreSer, c.Codser)) AS NombreSer,
                RTRIM(ISNULL(s.Contacto, '')) AS Contacto
            FROM Clientes c
            INNER JOIN Documentos d ON CAST(c.ncliente AS VARCHAR(50)) = RTRIM(d.NCliente)
            LEFT JOIN LIC_ESTABLECIMIENTO e ON TRY_CAST(RTRIM(c.codunidad) AS INT) = e.CodUnidad
            OUTER APPLY (
                SELECT TOP 1 CodSer, NombreSer, Contacto
                FROM Servicios srv
                WHERE RTRIM(srv.NombreSer) = RTRIM(c.Codser) OR RTRIM(srv.CodSer) = RTRIM(c.Codser)
                ORDER BY srv.CodSer
            ) s
            WHERE (RTRIM(c.Codser) = @codser OR RTRIM(ISNULL(s.CodSer, '')) = @codser OR RTRIM(ISNULL(s.NombreSer, '')) = @codser)
              AND d.FechaRecep >= @desde
              AND d.FechaRecep <= @hasta
            ORDER BY TRY_CAST(RTRIM(c.codunidad) AS INT), c.ncliente, d.FechaEmision
        `);

        res.json(result.recordset);
    } catch (error) {
        console.error('Error en informe por servicio:', error);
        res.status(500).json({ error: 'Error al consultar informe de documentos por servicio.' });
    }
});

// 3. Informe: Documentos por Cliente / NIC (FiltraPorCliente.vb + InformePorCliente2.rdlc)
router.get('/por-cliente', async (req, res) => {
    const { ncliente, desde, hasta } = req.query;
    if (!ncliente) {
        return res.status(400).json({ error: 'Debe ingresar el Nº de Cliente (NIC).' });
    }

    try {
        const pool = await getPool();
        const request = pool.request();
        request.input('nclienteStr', sql.VarChar, String(ncliente).trim());

        let dateFilter = '';
        if (desde && hasta) {
            request.input('desde', sql.DateTime, new Date(`${desde}T00:00:00`));
            request.input('hasta', sql.DateTime, new Date(`${hasta}T23:59:59`));
            dateFilter = 'AND d.FechaRecep >= @desde AND d.FechaRecep <= @hasta';
        }

        const result = await request.query(`
            SELECT
                RTRIM(d.NCliente) AS NCliente,
                RTRIM(ISNULL(c.nombre, '')) AS nombre,
                RTRIM(ISNULL(c.codunidad, '')) AS codunidad,
                RTRIM(ISNULL(e.Descripcion, c.nombre)) AS unidadDescripcion,
                RTRIM(ISNULL(c.Codser, '')) AS Codser,
                RTRIM(ISNULL(s.NombreSer, c.Codser)) AS NombreSer,
                RTRIM(ISNULL(c.NMedidor, '')) AS NMedidor,
                RTRIM(ISNULL(c.Sector, '')) AS Sector,
                RTRIM(d.NDocto) AS NDocto,
                RTRIM(ISNULL(d.Tipo, '')) AS Tipo,
                RTRIM(ISNULL(d.Estado, '')) AS Estado,
                d.FechaEmision,
                d.FechaRecep,
                d.FechaLectura,
                d.FechaProxLec,
                d.FechaVen,
                d.FechaPago,
                RTRIM(ISNULL(d.ULectura, '0')) AS ULectura,
                RTRIM(ISNULL(d.ALectura, '0')) AS ALectura,
                ISNULL(d.Consumo, 0) AS Consumo,
                ISNULL(d.Monto, 0) AS Monto,
                RTRIM(ISNULL(d.NCpbte, '0')) AS NCpbte,
                ISNULL(d.Nomina, 0) AS Nomina
            FROM Clientes c
            INNER JOIN Documentos d ON CAST(c.ncliente AS VARCHAR(50)) = RTRIM(d.NCliente)
            LEFT JOIN LIC_ESTABLECIMIENTO e ON TRY_CAST(RTRIM(c.codunidad) AS INT) = e.CodUnidad
            OUTER APPLY (
                SELECT TOP 1 CodSer, NombreSer
                FROM Servicios srv
                WHERE RTRIM(srv.NombreSer) = RTRIM(c.Codser) OR RTRIM(srv.CodSer) = RTRIM(c.Codser)
                ORDER BY srv.CodSer
            ) s
            WHERE RTRIM(d.NCliente) = @nclienteStr
              ${dateFilter}
            ORDER BY d.FechaEmision DESC, d.NDocto DESC
        `);

        res.json(result.recordset);
    } catch (error) {
        console.error('Error en informe por cliente:', error);
        res.status(500).json({ error: 'Error al consultar informe de documentos por cliente.' });
    }
});

// 4. Informe: Documentos por Nómina (FiltraporNomina.vb + InformeNomina2.rdlc)
router.get('/por-nomina', async (req, res) => {
    const { nomina } = req.query;
    if (!nomina || isNaN(Number(nomina))) {
        return res.status(400).json({ error: 'Debe ingresar un Nº de Nómina válido.' });
    }

    try {
        const pool = await getPool();
        const request = pool.request();
        request.input('nomina', sql.Int, Number(nomina));

        const result = await request.query(`
            SELECT
                RTRIM(ISNULL(e.CodSector, c.Sector)) AS CodSector,
                RTRIM(ISNULL(d.Tipo, '')) AS Tipo,
                RTRIM(ISNULL(e.Descripcion, c.nombre)) AS Descripcion,
                RTRIM(ISNULL(e.CodCenco, '')) AS CodCenco,
                RTRIM(ISNULL(e.Domicilio, '')) AS Domicilio,
                RTRIM(ISNULL(c.codunidad, '')) AS codunidad,
                c.ncliente,
                RTRIM(d.NDocto) AS NDocto,
                ISNULL(d.SubTotal, 0) AS SubTotal,
                ISNULL(d.Intereses, 0) AS Intereses,
                ISNULL(d.Otro, 0) AS Otro,
                ISNULL(d.Monto, 0) AS Monto,
                RTRIM(ISNULL(d.ULectura, '0')) AS ULectura,
                RTRIM(ISNULL(d.ALectura, '0')) AS ALectura,
                ISNULL(d.Consumo, 0) AS Consumo,
                d.FechaLectura,
                d.FechaProxLec,
                d.FechaEmision,
                d.FechaRecep,
                d.FechaVen,
                d.FechaPago,
                RTRIM(ISNULL(d.NCpbte, '0')) AS NCpbte,
                ISNULL(d.Nomina, 0) AS Nomina,
                ISNULL(d.Autorizada, 0) AS Autorizada,
                RTRIM(ISNULL(d.Estado, '')) AS Estado,
                RTRIM(ISNULL(c.Codser, '')) AS Codser,
                RTRIM(ISNULL(s.NombreSer, c.Codser)) AS NombreSer,
                RTRIM(ISNULL(s.Contacto, '')) AS Contacto,
                RTRIM(ISNULL(e.financiamiento, '')) AS financiamiento
            FROM Clientes c
            INNER JOIN Documentos d ON CAST(c.ncliente AS VARCHAR(50)) = RTRIM(d.NCliente)
            LEFT JOIN LIC_ESTABLECIMIENTO e ON TRY_CAST(RTRIM(c.codunidad) AS INT) = e.CodUnidad
            OUTER APPLY (
                SELECT TOP 1 CodSer, NombreSer, Contacto
                FROM Servicios srv
                WHERE RTRIM(srv.NombreSer) = RTRIM(c.Codser) OR RTRIM(srv.CodSer) = RTRIM(c.Codser)
                ORDER BY srv.CodSer
            ) s
            WHERE d.Nomina = @nomina
            ORDER BY TRY_CAST(RTRIM(c.codunidad) AS INT), c.ncliente, d.NDocto
        `);

        res.json(result.recordset);
    } catch (error) {
        console.error('Error en informe por nómina:', error);
        res.status(500).json({ error: 'Error al consultar informe por nómina.' });
    }
});

// 5. Informe: Consolidado Anual de Consumos (Consolidado.vb + consolidado.rdlc)
router.get('/consolidado', async (req, res) => {
    const { codser, anio, sector } = req.query;
    if (!codser || !anio) {
        return res.status(400).json({ error: 'Debe seleccionar el Servicio y el Año a consolidar.' });
    }

    try {
        const pool = await getPool();
        const request = pool.request();
        request.input('codser', sql.VarChar, codser.trim());
        request.input('anio', sql.Int, Number(anio));

        let sectorFilter = '';
        if (sector && sector !== 'TODOS') {
            request.input('sector', sql.VarChar, sector.trim());
            sectorFilter = 'AND RTRIM(c.Sector) = @sector';
        }

        const result = await request.query(`
            SELECT
                YEAR(d.FechaEmision) AS anio,
                MONTH(d.FechaEmision) AS mes,
                RTRIM(ISNULL(m.descripcion, '')) AS mesDescripcion,
                c.ncliente,
                RTRIM(ISNULL(c.codunidad, '')) AS codunidad,
                RTRIM(ISNULL(e.Descripcion, c.nombre)) AS unidadDescripcion,
                RTRIM(ISNULL(c.Sector, '')) AS sector,
                ISNULL(d.Monto, 0) AS Monto,
                ISNULL(d.Consumo, 0) AS Consumo,
                RTRIM(ISNULL(c.Codser, '')) AS Codser,
                RTRIM(ISNULL(s.NombreSer, c.Codser)) AS NombreSer,
                RTRIM(d.NDocto) AS NDocto,
                RTRIM(ISNULL(d.Estado, '')) AS Estado,
                d.FechaEmision
            FROM Clientes c
            INNER JOIN Documentos d ON CAST(c.ncliente AS VARCHAR(50)) = RTRIM(d.NCliente)
            LEFT JOIN Meses m ON MONTH(d.FechaEmision) = m.mes
            LEFT JOIN LIC_ESTABLECIMIENTO e ON TRY_CAST(RTRIM(c.codunidad) AS INT) = e.CodUnidad
            OUTER APPLY (
                SELECT TOP 1 CodSer, NombreSer
                FROM Servicios srv
                WHERE RTRIM(srv.NombreSer) = RTRIM(c.Codser) OR RTRIM(srv.CodSer) = RTRIM(c.Codser)
                ORDER BY srv.CodSer
            ) s
            WHERE YEAR(d.FechaEmision) = @anio
              AND (RTRIM(c.Codser) = @codser OR RTRIM(ISNULL(s.CodSer, '')) = @codser OR RTRIM(ISNULL(s.NombreSer, '')) = @codser)
              AND UPPER(RTRIM(ISNULL(d.Estado, ''))) <> 'NULO'
              ${sectorFilter}
            ORDER BY MONTH(d.FechaEmision), TRY_CAST(RTRIM(c.codunidad) AS INT), c.ncliente
        `);

        res.json(result.recordset);
    } catch (error) {
        console.error('Error en informe consolidado:', error);
        res.status(500).json({ error: 'Error al generar el informe consolidado.' });
    }
});

// 6. Informe: Planilla de Presupuesto (Presupuesto.vb + Informe_presupuesto2.rdlc)
router.get('/presupuesto', async (req, res) => {
    const { codser, desde, hasta, sector } = req.query;
    if (!codser || !desde || !hasta) {
        return res.status(400).json({ error: 'Debe seleccionar el Servicio y el rango de fechas.' });
    }

    try {
        const pool = await getPool();
        const request = pool.request();
        request.input('codser', sql.VarChar, codser.trim());
        request.input('desde', sql.DateTime, new Date(`${desde}T00:00:00`));
        request.input('hasta', sql.DateTime, new Date(`${hasta}T23:59:59`));

        let sectorFilter = '';
        if (sector && sector !== 'TODOS') {
            request.input('sector', sql.VarChar, sector.trim());
            sectorFilter = 'AND RTRIM(c.Sector) = @sector';
        }

        const result = await request.query(`
            SELECT
                c.ncliente,
                RTRIM(ISNULL(c.codunidad, '')) AS codunidad,
                RTRIM(ISNULL(e.Descripcion, c.nombre)) AS Descripcion,
                RTRIM(ISNULL(e.CodCenco, '')) AS CodCenco,
                RTRIM(ISNULL(e.Domicilio, '')) AS Domicilio,
                RTRIM(ISNULL(e.CodSector, c.Sector)) AS CodSector,
                RTRIM(ISNULL(e.financiamiento, '')) AS financiamiento,
                RTRIM(ISNULL(s.Contacto, s.NombreSer)) AS Contacto,
                RTRIM(ISNULL(c.Codser, '')) AS Codser,
                RTRIM(ISNULL(s.NombreSer, c.Codser)) AS NombreSer,
                RTRIM(d.NDocto) AS NDocto,
                RTRIM(ISNULL(d.Tipo, '')) AS Tipo,
                d.FechaEmision,
                d.FechaRecep,
                d.FechaVen,
                d.FechaLectura,
                d.FechaProxLec,
                d.FechaPago,
                RTRIM(ISNULL(d.NCpbte, '0')) AS NCpbte,
                ISNULL(d.SubTotal, 0) AS SubTotal,
                ISNULL(d.Intereses, 0) AS Intereses,
                ISNULL(d.Otro, 0) AS Otro,
                ISNULL(d.Monto, 0) AS Monto,
                ISNULL(d.Nomina, 0) AS Nomina
            FROM Clientes c
            INNER JOIN Documentos d ON CAST(c.ncliente AS VARCHAR(50)) = RTRIM(d.NCliente)
            LEFT JOIN LIC_ESTABLECIMIENTO e ON TRY_CAST(RTRIM(c.codunidad) AS INT) = e.CodUnidad
            OUTER APPLY (
                SELECT TOP 1 CodSer, NombreSer, Contacto
                FROM Servicios srv
                WHERE RTRIM(srv.NombreSer) = RTRIM(c.Codser) OR RTRIM(srv.CodSer) = RTRIM(c.Codser)
                ORDER BY srv.CodSer
            ) s
            WHERE (RTRIM(c.Codser) = @codser OR RTRIM(ISNULL(s.CodSer, '')) = @codser OR RTRIM(ISNULL(s.NombreSer, '')) = @codser)
              AND d.FechaRecep >= @desde
              AND d.FechaRecep <= @hasta
              ${sectorFilter}
            ORDER BY d.FechaEmision, TRY_CAST(RTRIM(c.codunidad) AS INT), d.NDocto
        `);

        let acumulado = 0;
        const rowsWithAcumulado = result.recordset.map((row, idx) => {
            acumulado += (row.Monto || 0);
            return {
                ...row,
                correlativoFila: idx + 1,
                MontoAcumulado: acumulado
            };
        });

        res.json(rowsWithAcumulado);
    } catch (error) {
        console.error('Error en informe de presupuesto:', error);
        res.status(500).json({ error: 'Error al consultar la planilla de presupuesto.' });
    }
});

module.exports = router;
