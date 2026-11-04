const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../db');

// 1. Obtener Catálogos Generales (Servicios, Establecimientos, Años, etc.)
router.get('/catalogos', async (req, res) => {
    try {
        const pool = await getPool();
        const [serviciosRes, estabRes, aniosRes] = await Promise.all([
            pool.request().query(`
                SELECT RTRIM(CodSer) AS CodSer,
                       RTRIM(NombreSer) AS NombreSer,
                       RTRIM(ISNULL(Rut, '')) AS Rut,
                       RTRIM(ISNULL(Contacto, '')) AS Contacto,
                       RTRIM(ISNULL(Cuenta, '')) AS Cuenta,
                       RTRIM(ISNULL(Cuenta2, '')) AS Cuenta2,
                       RTRIM(ISNULL(DescCuenta2, '')) AS DescCuenta2,
                       ISNULL(Correlativo, 0) AS Correlativo
                FROM Servicios
                ORDER BY NombreSer, CodSer
            `),
            pool.request().query(`
                SELECT Rol,
                       CodUnidad,
                       RTRIM(ISNULL(CodCenco, '')) AS CodCenco,
                       RTRIM(ISNULL(Descripcion, '')) AS Descripcion,
                       RTRIM(ISNULL(Domicilio, '')) AS Domicilio,
                       RTRIM(ISNULL(Poblacion, '')) AS Poblacion,
                       RTRIM(ISNULL(Telefono, '')) AS Telefono,
                       RTRIM(ISNULL(CodSector, '')) AS CodSector,
                       RTRIM(ISNULL(Ccosto, '')) AS Ccosto,
                       RTRIM(ISNULL(financiamiento, '')) AS financiamiento
                FROM LIC_ESTABLECIMIENTO
                ORDER BY CodUnidad
            `),
            pool.request().query(`
                SELECT DISTINCT YEAR(FechaEmision) AS Anio
                FROM Documentos
                WHERE FechaEmision IS NOT NULL AND YEAR(FechaEmision) >= 2000 AND YEAR(FechaEmision) <= 2100
                ORDER BY Anio DESC
            `)
        ]);

        res.json({
            servicios: serviciosRes.recordset,
            establecimientos: estabRes.recordset,
            anios: aniosRes.recordset.map(r => r.Anio),
            sectores: ['Educacion', 'Salud', 'VTF'],
            tiposDocumento: ['FI', 'NC', 'ND', 'OT'],
            estadosDocumento: ['Vigente', 'Nulo', 'Pendiente', 'Enviada', 'Autorizada']
        });
    } catch (error) {
        console.error('Error al cargar catálogos de mantención:', error);
        res.status(500).json({ error: 'Error al cargar catálogos del sistema' });
    }
});

// 2. Listar y Filtrar Clientes (NIC)
router.get('/clientes', async (req, res) => {
    const { search, codser, sector } = req.query;
    try {
        const pool = await getPool();
        const request = pool.request();
        let conditions = ['1=1'];

        if (codser && codser.trim() !== '') {
            request.input('codser', sql.VarChar, codser.trim());
            conditions.push('(RTRIM(c.Codser) = @codser OR RTRIM(ISNULL(s.CodSer, \'\')) = @codser OR RTRIM(ISNULL(s.NombreSer, \'\')) = @codser)');
        }
        if (sector && sector.trim() !== '') {
            request.input('sector', sql.VarChar, sector.trim());
            conditions.push('RTRIM(c.Sector) = @sector');
        }
        if (search && search.trim() !== '') {
            request.input('search', sql.VarChar, `%${search.trim()}%`);
            conditions.push(`(
                CAST(c.ncliente AS VARCHAR(50)) LIKE @search
                OR RTRIM(c.nombre) LIKE @search
                OR RTRIM(c.codunidad) LIKE @search
                OR RTRIM(ISNULL(c.NMedidor, '')) LIKE @search
                OR RTRIM(ISNULL(e.Descripcion, '')) LIKE @search
            )`);
        }

        const query = `
            SELECT TOP 500
                c.ncliente,
                RTRIM(ISNULL(c.nombre, '')) AS nombre,
                RTRIM(ISNULL(c.codunidad, '')) AS codunidad,
                RTRIM(ISNULL(e.Descripcion, '')) AS unidadDescripcion,
                RTRIM(ISNULL(e.Ccosto, '')) AS ccosto,
                RTRIM(ISNULL(c.NMedidor, '')) AS nmedidor,
                ISNULL(c.Promedio, 0) AS promedio,
                RTRIM(ISNULL(c.Codser, '')) AS codser,
                RTRIM(ISNULL(s.NombreSer, c.Codser)) AS nombreServicio,
                RTRIM(ISNULL(c.Sector, '')) AS sector,
                ISNULL(c.NclienteAntiguo, 0) AS nclienteAntiguo
            FROM Clientes c
            LEFT JOIN LIC_ESTABLECIMIENTO e ON TRY_CAST(RTRIM(c.codunidad) AS INT) = e.CodUnidad
            OUTER APPLY (
                SELECT TOP 1 CodSer, NombreSer
                FROM Servicios srv
                WHERE RTRIM(srv.NombreSer) = RTRIM(c.Codser) OR RTRIM(srv.CodSer) = RTRIM(c.Codser)
                ORDER BY srv.CodSer
            ) s
            WHERE ${conditions.join(' AND ')}
            ORDER BY c.ncliente ASC
        `;

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (error) {
        console.error('Error al listar clientes:', error);
        res.status(500).json({ error: 'Error al consultar clientes' });
    }
});

// 3. Buscar un Cliente por Nº de Cliente (NIC)
router.get('/clientes/:ncliente', async (req, res) => {
    const { ncliente } = req.params;
    const { codser } = req.query;
    try {
        const pool = await getPool();
        const request = pool.request();
        request.input('ncliente', sql.Numeric(18, 0), Number(ncliente));

        let extraWhere = '';
        if (codser && codser.trim() !== '') {
            request.input('codser', sql.VarChar, codser.trim());
            extraWhere = 'AND (RTRIM(c.Codser) = @codser OR RTRIM(ISNULL(s.CodSer, \'\')) = @codser)';
        }

        const result = await request.query(`
            SELECT
                c.ncliente,
                RTRIM(ISNULL(c.nombre, '')) AS nombre,
                RTRIM(ISNULL(c.codunidad, '')) AS codunidad,
                RTRIM(ISNULL(e.Descripcion, '')) AS unidadDescripcion,
                RTRIM(ISNULL(c.NMedidor, '')) AS nmedidor,
                ISNULL(c.Promedio, 0) AS promedio,
                RTRIM(ISNULL(c.Codser, '')) AS codser,
                RTRIM(ISNULL(c.Sector, '')) AS sector,
                ISNULL(c.NclienteAntiguo, 0) AS nclienteAntiguo
            FROM Clientes c
            LEFT JOIN LIC_ESTABLECIMIENTO e ON TRY_CAST(RTRIM(c.codunidad) AS INT) = e.CodUnidad
            OUTER APPLY (
                SELECT TOP 1 CodSer, NombreSer
                FROM Servicios srv
                WHERE RTRIM(srv.NombreSer) = RTRIM(c.Codser) OR RTRIM(srv.CodSer) = RTRIM(c.Codser)
                ORDER BY srv.CodSer
            ) s
            WHERE c.ncliente = @ncliente ${extraWhere}
        `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        res.json(result.recordset[0]);
    } catch (error) {
        console.error('Error al buscar cliente:', error);
        res.status(500).json({ error: 'Error al buscar cliente' });
    }
});

// 4. Crear o Actualizar Cliente (Frm_clientes.vb -> Btn_Grabar_Click)
router.post('/clientes', async (req, res) => {
    const { ncliente, nombre, codunidad, nmedidor, codser, sector } = req.body;
    if (!ncliente || isNaN(Number(ncliente))) {
        return res.status(400).json({ error: 'El Nº de Cliente (NIC) es obligatorio y debe ser numérico.' });
    }

    try {
        const pool = await getPool();
        const checkReq = pool.request();
        checkReq.input('ncliente', sql.Numeric(18, 0), Number(ncliente));
        const checkRes = await checkReq.query('SELECT ncliente FROM Clientes WHERE ncliente = @ncliente');

        const saveReq = pool.request();
        saveReq.input('ncliente', sql.Numeric(18, 0), Number(ncliente));
        saveReq.input('nombre', sql.VarChar, (nombre || '').trim());
        saveReq.input('codunidad', sql.VarChar, String(codunidad || '').trim());
        saveReq.input('nmedidor', sql.VarChar, String(nmedidor || '').trim());
        saveReq.input('codser', sql.VarChar, String(codser || '').trim());
        saveReq.input('sector', sql.VarChar, String(sector || '').trim());

        if (checkRes.recordset.length > 0) {
            await saveReq.query(`
                UPDATE Clientes
                SET nombre = @nombre,
                    codunidad = @codunidad,
                    NMedidor = @nmedidor,
                    Codser = @codser,
                    Sector = @sector
                WHERE ncliente = @ncliente
            `);
            res.json({ success: true, mode: 'updated', message: 'Datos del cliente actualizados correctamente.' });
        } else {
            await saveReq.query(`
                INSERT INTO Clientes (ncliente, nombre, codunidad, NMedidor, Promedio, Codser, Sector, NclienteAntiguo)
                VALUES (@ncliente, @nombre, @codunidad, @nmedidor, 0, @codser, @sector, 0)
            `);
            res.json({ success: true, mode: 'created', message: 'Cliente ingresado correctamente.' });
        }
    } catch (error) {
        console.error('Error al guardar cliente:', error);
        res.status(500).json({ error: 'Error al guardar datos del cliente en la base de datos.' });
    }
});

// 5. Trasladar NIC (Frm_clientes.vb -> Button1_Click)
router.post('/clientes/trasladar', async (req, res) => {
    const { nclienteActual, nclienteNuevo, trasladarDocumentos = true } = req.body;
    if (!nclienteActual || !nclienteNuevo || isNaN(Number(nclienteActual)) || isNaN(Number(nclienteNuevo))) {
        return res.status(400).json({ error: 'Debe indicar el Nº de Cliente actual y el nuevo Nº de Cliente numérico.' });
    }

    try {
        const pool = await getPool();

        const checkActual = pool.request();
        checkActual.input('actual', sql.Numeric(18, 0), Number(nclienteActual));
        const resActual = await checkActual.query('SELECT ncliente FROM Clientes WHERE ncliente = @actual');
        if (resActual.recordset.length === 0) {
            return res.status(404).json({ error: `El Nº de Cliente actual (${nclienteActual}) no existe.` });
        }

        const checkNuevo = pool.request();
        checkNuevo.input('nuevo', sql.Numeric(18, 0), Number(nclienteNuevo));
        const resNuevo = await checkNuevo.query('SELECT ncliente FROM Clientes WHERE ncliente = @nuevo');
        if (resNuevo.recordset.length > 0) {
            return res.status(400).json({ error: `El nuevo Nº de Cliente (${nclienteNuevo}) ya se encuentra registrado.` });
        }

        const updateCli = pool.request();
        updateCli.input('actual', sql.Numeric(18, 0), Number(nclienteActual));
        updateCli.input('nuevo', sql.Numeric(18, 0), Number(nclienteNuevo));
        await updateCli.query(`
            UPDATE Clientes
            SET ncliente = @nuevo,
                NclienteAntiguo = @actual
            WHERE ncliente = @actual
        `);

        let docsActualizados = 0;
        if (trasladarDocumentos) {
            const updateDocs = pool.request();
            updateDocs.input('actualStr', sql.VarChar, String(nclienteActual).trim());
            updateDocs.input('nuevoStr', sql.VarChar, String(nclienteNuevo).trim());
            const docRes = await updateDocs.query(`
                UPDATE Documentos
                SET NCliente = @nuevoStr
                WHERE RTRIM(NCliente) = @actualStr
            `);
            docsActualizados = docRes.rowsAffected[0] || 0;
        }

        res.json({
            success: true,
            docsActualizados,
            message: `NIC trasladado exitosamente de ${nclienteActual} a ${nclienteNuevo}.`
        });
    } catch (error) {
        console.error('Error al trasladar NIC:', error);
        res.status(500).json({ error: 'Error al realizar el traslado de NIC.' });
    }
});

// 6. Listar Servicios Básicos (Frm_Servicios.vb)
router.get('/servicios', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT
                RTRIM(s.CodSer) AS CodSer,
                RTRIM(ISNULL(s.NombreSer, '')) AS NombreSer,
                RTRIM(ISNULL(s.Rut, '')) AS Rut,
                RTRIM(ISNULL(s.Contacto, '')) AS Contacto,
                RTRIM(ISNULL(s.Cuenta, '')) AS Cuenta,
                RTRIM(ISNULL(s.Cuenta2, '')) AS Cuenta2,
                RTRIM(ISNULL(s.DescCuenta2, '')) AS DescCuenta2,
                ISNULL(s.Correlativo, 0) AS Correlativo,
                (SELECT COUNT(*) FROM Clientes c WHERE RTRIM(c.Codser) = RTRIM(s.NombreSer) OR RTRIM(c.Codser) = RTRIM(s.CodSer)) AS TotalClientes
            FROM Servicios s
            ORDER BY s.NombreSer ASC, s.CodSer ASC
        `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Error al listar servicios:', error);
        res.status(500).json({ error: 'Error al obtener la lista de servicios' });
    }
});

// 7. Crear o Actualizar Servicio (Frm_Servicios.vb -> Btn_grabar_Click)
router.post('/servicios', async (req, res) => {
    const { CodSer, NombreSer, Contacto, Rut, Cuenta, Cuenta2, DescCuenta2 } = req.body;
    if (!CodSer || !CodSer.trim()) {
        return res.status(400).json({ error: 'El Código de Servicio es obligatorio.' });
    }

    try {
        const pool = await getPool();
        const checkReq = pool.request();
        checkReq.input('codser', sql.VarChar, CodSer.trim());
        const checkRes = await checkReq.query('SELECT CodSer FROM Servicios WHERE RTRIM(CodSer) = @codser');

        const saveReq = pool.request();
        saveReq.input('codser', sql.VarChar, CodSer.trim());
        saveReq.input('nombreser', sql.VarChar, (NombreSer || '').trim());
        saveReq.input('contacto', sql.VarChar, (Contacto || '').trim());
        saveReq.input('rut', sql.VarChar, (Rut || '').trim());
        saveReq.input('cuenta', sql.VarChar, (Cuenta || '').trim());
        saveReq.input('cuenta2', sql.VarChar, (Cuenta2 || '').trim());
        saveReq.input('desccuenta2', sql.VarChar, (DescCuenta2 || '').trim());

        if (checkRes.recordset.length > 0) {
            await saveReq.query(`
                UPDATE Servicios
                SET NombreSer = @nombreser,
                    Contacto = @contacto,
                    Rut = @rut,
                    Cuenta = @cuenta,
                    Cuenta2 = @cuenta2,
                    DescCuenta2 = @desccuenta2
                WHERE RTRIM(CodSer) = @codser
            `);
            res.json({ success: true, mode: 'updated', message: 'Servicio actualizado correctamente.' });
        } else {
            await saveReq.query(`
                INSERT INTO Servicios (CodSer, NombreSer, Rut, Contacto, Cuenta, Cuenta2, DescCuenta2, Correlativo)
                VALUES (@codser, @nombreser, @rut, @contacto, @cuenta, @cuenta2, @desccuenta2, 0)
            `);
            res.json({ success: true, mode: 'created', message: 'Servicio creado correctamente.' });
        }
    } catch (error) {
        console.error('Error al guardar servicio:', error);
        res.status(500).json({ error: 'Error al guardar el servicio.' });
    }
});

// 8. Consultar Cliente e Historial de Documentos por Servicio + NIC (+ Año opcional) (Documentos.vb -> TabPage1)
router.get('/documentos/cliente', async (req, res) => {
    const { codser, ncliente, anio } = req.query;
    if (!ncliente) {
        return res.status(400).json({ error: 'Debe ingresar el Nº de Cliente (NIC).' });
    }

    try {
        const pool = await getPool();
        const cliReq = pool.request();
        cliReq.input('ncliente', sql.Numeric(18, 0), Number(ncliente));

        let srvFilter = '';
        if (codser && codser.trim() !== '') {
            cliReq.input('codser', sql.VarChar, codser.trim());
            srvFilter = 'AND (RTRIM(c.Codser) = @codser OR RTRIM(ISNULL(s.CodSer, \'\')) = @codser OR RTRIM(ISNULL(s.NombreSer, \'\')) = @codser)';
        }

        const cliRes = await cliReq.query(`
            SELECT
                c.ncliente,
                RTRIM(ISNULL(c.codunidad, '')) AS codunidad,
                RTRIM(ISNULL(e.Descripcion, '')) AS unidadDescripcion,
                RTRIM(ISNULL(c.nombre, '')) AS nombre,
                RTRIM(ISNULL(c.NMedidor, '')) AS nmedidor,
                RTRIM(ISNULL(c.Codser, '')) AS codser,
                RTRIM(ISNULL(s.NombreSer, c.Codser)) AS nombreServicio,
                RTRIM(ISNULL(c.Sector, '')) AS sector,
                ISNULL(c.NclienteAntiguo, 0) AS nclienteAntiguo
            FROM Clientes c
            LEFT JOIN LIC_ESTABLECIMIENTO e ON TRY_CAST(RTRIM(c.codunidad) AS INT) = e.CodUnidad
            OUTER APPLY (
                SELECT TOP 1 CodSer, NombreSer
                FROM Servicios srv
                WHERE RTRIM(srv.NombreSer) = RTRIM(c.Codser) OR RTRIM(srv.CodSer) = RTRIM(c.Codser)
                ORDER BY srv.CodSer
            ) s
            WHERE c.ncliente = @ncliente ${srvFilter}
        `);

        if (cliRes.recordset.length === 0) {
            return res.status(404).json({ error: 'Cliente no existe para el servicio seleccionado.' });
        }

        const cliente = cliRes.recordset[0];

        const docReq = pool.request();
        docReq.input('nclienteStr', sql.VarChar, String(cliente.ncliente).trim());
        docReq.input('codserDoc', sql.VarChar, cliente.codser);

        let anioCondition = '';
        if (anio && anio !== 'TODOS' && !isNaN(Number(anio))) {
            docReq.input('anio', sql.Int, Number(anio));
            anioCondition = 'AND YEAR(d.FechaEmision) = @anio';
        }

        const docsRes = await docReq.query(`
            SELECT
                RTRIM(d.NDocto) AS NDocto,
                RTRIM(d.NCliente) AS NCliente,
                ISNULL(d.Monto, 0) AS Monto,
                RTRIM(ISNULL(d.Estado, '')) AS Estado,
                RTRIM(ISNULL(d.Tipo, '')) AS Tipo,
                d.FechaRecep,
                RTRIM(ISNULL(d.ULectura, '0')) AS ULectura,
                RTRIM(ISNULL(d.ALectura, '0')) AS ALectura,
                d.FechaLectura,
                ISNULL(d.Consumo, 0) AS Consumo,
                d.FechaEmision,
                d.FechaPago,
                RTRIM(ISNULL(d.NCpbte, '0')) AS NCpbte,
                ISNULL(d.SubTotal, 0) AS SubTotal,
                ISNULL(d.Demanda, 0) AS Demanda,
                ISNULL(d.Iva, 0) AS Iva,
                ISNULL(d.Intereses, 0) AS Intereses,
                ISNULL(d.Otro, 0) AS Otro,
                d.FechaVen,
                d.FechaProxLec,
                ISNULL(d.Nomina, 0) AS Nomina,
                ISNULL(d.Autorizada, 0) AS Autorizada
            FROM Documentos d
            INNER JOIN Clientes c ON RTRIM(d.NCliente) = CAST(c.ncliente AS VARCHAR(50))
            WHERE RTRIM(d.NCliente) = @nclienteStr
              AND RTRIM(c.Codser) = @codserDoc
              ${anioCondition}
            ORDER BY d.FechaEmision DESC, d.NDocto DESC
        `);

        res.json({
            cliente,
            documentos: docsRes.recordset
        });
    } catch (error) {
        console.error('Error al consultar documentos del cliente:', error);
        res.status(500).json({ error: 'Error al consultar historial de documentos del cliente.' });
    }
});

// 9. Buscar Documento Específico para Edición (Documentos.vb -> Button10_Click)
router.get('/documentos/buscar', async (req, res) => {
    const { ndocto, codser, ncliente } = req.query;
    if (!ndocto) {
        return res.status(400).json({ error: 'Debe ingresar el Nº de Documento (Boleta o Factura).' });
    }

    try {
        const pool = await getPool();
        const request = pool.request();
        request.input('ndocto', sql.VarChar, String(ndocto).trim());

        let extraFilters = '';
        if (codser && codser.trim() !== '') {
            request.input('codser', sql.VarChar, codser.trim());
            extraFilters += ' AND (RTRIM(c.Codser) = @codser OR RTRIM(ISNULL(s.CodSer, \'\')) = @codser OR RTRIM(ISNULL(s.NombreSer, \'\')) = @codser)';
        }
        if (ncliente && String(ncliente).trim() !== '') {
            request.input('ncliente', sql.VarChar, String(ncliente).trim());
            extraFilters += ' AND RTRIM(d.NCliente) = @ncliente';
        }

        const result = await request.query(`
            SELECT
                RTRIM(d.NDocto) AS NDocto,
                RTRIM(d.NCliente) AS NCliente,
                ISNULL(d.Monto, 0) AS Monto,
                RTRIM(ISNULL(d.Estado, '')) AS Estado,
                RTRIM(ISNULL(d.Tipo, '')) AS Tipo,
                d.FechaRecep,
                RTRIM(ISNULL(d.ULectura, '0')) AS ULectura,
                RTRIM(ISNULL(d.ALectura, '0')) AS ALectura,
                d.FechaLectura,
                ISNULL(d.Consumo, 0) AS Consumo,
                d.FechaEmision,
                d.FechaPago,
                RTRIM(ISNULL(d.NCpbte, '0')) AS NCpbte,
                ISNULL(d.SubTotal, 0) AS SubTotal,
                ISNULL(d.Demanda, 0) AS Demanda,
                ISNULL(d.Iva, 0) AS Iva,
                ISNULL(d.Intereses, 0) AS Intereses,
                ISNULL(d.Otro, 0) AS Otro,
                d.FechaVen,
                d.FechaProxLec,
                ISNULL(d.Nomina, 0) AS Nomina,
                ISNULL(d.Autorizada, 0) AS Autorizada,
                c.ncliente AS clienteId,
                RTRIM(ISNULL(c.codunidad, '')) AS codunidad,
                RTRIM(ISNULL(e.Descripcion, '')) AS unidadDescripcion,
                RTRIM(ISNULL(c.nombre, '')) AS nombre,
                RTRIM(ISNULL(c.NMedidor, '')) AS nmedidor,
                RTRIM(ISNULL(c.Codser, '')) AS codser,
                RTRIM(ISNULL(s.NombreSer, c.Codser)) AS nombreServicio,
                RTRIM(ISNULL(c.Sector, '')) AS sector
            FROM Clientes c
            INNER JOIN Documentos d ON CAST(c.ncliente AS VARCHAR(50)) = RTRIM(d.NCliente)
            LEFT JOIN LIC_ESTABLECIMIENTO e ON TRY_CAST(RTRIM(c.codunidad) AS INT) = e.CodUnidad
            OUTER APPLY (
                SELECT TOP 1 CodSer, NombreSer
                FROM Servicios srv
                WHERE RTRIM(srv.NombreSer) = RTRIM(c.Codser) OR RTRIM(srv.CodSer) = RTRIM(c.Codser)
                ORDER BY srv.CodSer
            ) s
            WHERE RTRIM(d.NDocto) = @ndocto ${extraFilters}
        `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'No existe el documento consultado.' });
        }

        const doc = result.recordset[0];
        res.json({
            documento: doc,
            alertaNomina: doc.Nomina && doc.Nomina !== 0
                ? `Precaución: Esta Boleta o Factura está ingresada en la nómina Nº ${doc.Nomina}`
                : null
        });
    } catch (error) {
        console.error('Error al buscar documento:', error);
        res.status(500).json({ error: 'Error al buscar el documento.' });
    }
});

// 10. Guardar (Insertar o Actualizar) Documento (Documentos.vb -> Button5_Click)
router.post('/documentos', async (req, res) => {
    const {
        NDocto,
        NCliente,
        Monto = 0,
        Estado = 'Vigente',
        Tipo = 'FI',
        ULectura = '0',
        ALectura = '0',
        FechaLectura,
        Consumo = 0,
        FechaEmision,
        FechaPago,
        NCpbte = '0',
        Demanda = 0,
        Iva = 0,
        Intereses = 0,
        Otro = 0,
        FechaVen,
        FechaProxLec,
        Nomina = 0,
        NDoctoOriginal,
        NClienteOriginal
    } = req.body;

    if (!NDocto || !String(NDocto).trim() || !NCliente || !String(NCliente).trim()) {
        return res.status(400).json({ error: 'El Nº de Cliente y el Nº de Documento son obligatorios.' });
    }

    try {
        const pool = await getPool();
        const targetDocto = String(NDoctoOriginal || NDocto).trim();
        const targetCliente = String(NClienteOriginal || NCliente).trim();

        const checkReq = pool.request();
        checkReq.input('ndoctoCheck', sql.VarChar, targetDocto);
        checkReq.input('nclienteCheck', sql.VarChar, targetCliente);
        const checkRes = await checkReq.query(`
            SELECT NDocto, NCliente
            FROM Documentos
            WHERE RTRIM(NDocto) = @ndoctoCheck AND RTRIM(NCliente) = @nclienteCheck
        `);

        const nowDate = new Date();
        const parseDateOrDefault = (d) => (d ? new Date(d) : nowDate);

        const saveReq = pool.request();
        saveReq.input('ndocto', sql.VarChar, String(NDocto).trim());
        saveReq.input('ncliente', sql.VarChar, String(NCliente).trim());
        saveReq.input('monto', sql.Int, Number(Monto) || 0);
        saveReq.input('estado', sql.VarChar, String(Estado || 'Vigente').trim());
        saveReq.input('tipo', sql.VarChar, String(Tipo || 'FI').trim());
        saveReq.input('ulectura', sql.VarChar, String(ULectura || '0').trim());
        saveReq.input('alectura', sql.VarChar, String(ALectura || '0').trim());
        saveReq.input('fechalectura', sql.DateTime, parseDateOrDefault(FechaLectura));
        saveReq.input('consumo', sql.Int, Number(Consumo) || 0);
        saveReq.input('fechaemision', sql.DateTime, parseDateOrDefault(FechaEmision));
        saveReq.input('fechapago', sql.DateTime, parseDateOrDefault(FechaPago));
        saveReq.input('ncpbte', sql.VarChar, String(NCpbte || '0').trim());
        saveReq.input('demanda', sql.Int, Number(Demanda) || 0);
        saveReq.input('iva', sql.Int, Number(Iva) || 0);
        saveReq.input('intereses', sql.Int, Number(Intereses) || 0);
        saveReq.input('otro', sql.Int, Number(Otro) || 0);
        saveReq.input('fechaven', sql.DateTime, parseDateOrDefault(FechaVen));
        saveReq.input('fechaproxlec', sql.DateTime, parseDateOrDefault(FechaProxLec));
        saveReq.input('nomina', sql.Int, Number(Nomina) || 0);

        if (checkRes.recordset.length > 0) {
            saveReq.input('ndoctoOrig', sql.VarChar, targetDocto);
            saveReq.input('nclienteOrig', sql.VarChar, targetCliente);

            await saveReq.query(`
                UPDATE Documentos
                SET NDocto = @ndocto,
                    NCliente = @ncliente,
                    Monto = @monto,
                    Estado = @estado,
                    Tipo = @tipo,
                    ULectura = @ulectura,
                    ALectura = @alectura,
                    FechaLectura = @fechalectura,
                    Consumo = @consumo,
                    FechaEmision = @fechaemision,
                    FechaPago = @fechapago,
                    NCpbte = @ncpbte,
                    SubTotal = 0,
                    Demanda = @demanda,
                    Iva = @iva,
                    Intereses = @intereses,
                    Otro = @otro,
                    FechaVen = @fechaven,
                    FechaProxLec = @fechaproxlec,
                    Nomina = @nomina
                WHERE RTRIM(NDocto) = @ndoctoOrig AND RTRIM(NCliente) = @nclienteOrig
            `);
            res.json({ success: true, mode: 'updated', message: 'Datos de facturación actualizados correctamente.' });
        } else {
            await saveReq.query(`
                INSERT INTO Documentos (
                    NDocto, NCliente, Monto, Estado, Tipo, FechaRecep,
                    ULectura, ALectura, FechaLectura, Consumo, FechaEmision,
                    FechaPago, NCpbte, SubTotal, Demanda, Iva, Intereses, Otro,
                    FechaVen, FechaProxLec, Cuenta, Rut, CCosto, Nomina, Autorizada
                ) VALUES (
                    @ndocto, @ncliente, @monto, @estado, @tipo, GETDATE(),
                    @ulectura, @alectura, @fechalectura, @consumo, @fechaemision,
                    @fechapago, @ncpbte, 0, @demanda, @iva, @intereses, @otro,
                    @fechaven, @fechaproxlec, '0', '0', '0', 0, 0
                )
            `);
            res.json({ success: true, mode: 'created', message: 'Documento ingresado exitosamente.' });
        }
    } catch (error) {
        console.error('Error al guardar documento:', error);
        res.status(500).json({ error: 'Error al guardar el documento de facturación.' });
    }
});

// 11. Eliminar Documento (Documentos.vb -> Button11_Click)
router.delete('/documentos', async (req, res) => {
    const { ndocto, ncliente, nomina } = req.query;
    if (!ndocto || !ncliente) {
        return res.status(400).json({ error: 'Debe especificar el Nº de Documento y Nº de Cliente a eliminar.' });
    }

    try {
        const pool = await getPool();
        const request = pool.request();
        request.input('ndocto', sql.VarChar, String(ndocto).trim());
        request.input('ncliente', sql.VarChar, String(ncliente).trim());

        let nominaFilter = '';
        if (nomina !== undefined && nomina !== null && nomina !== '') {
            request.input('nomina', sql.Int, Number(nomina));
            nominaFilter = 'AND ISNULL(Nomina, 0) = @nomina';
        }

        const result = await request.query(`
            DELETE FROM Documentos
            WHERE RTRIM(NDocto) = @ndocto AND RTRIM(NCliente) = @ncliente ${nominaFilter}
        `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'No se encontró el documento especificado para eliminar.' });
        }

        res.json({ success: true, message: 'Documento eliminado correctamente.' });
    } catch (error) {
        console.error('Error al eliminar documento:', error);
        res.status(500).json({ error: 'Error al eliminar el documento.' });
    }
});

module.exports = router;
