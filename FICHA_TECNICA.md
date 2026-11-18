# Ficha Técnica del Proyecto — `update-sistema-control-consumo`

**Fecha de actualización:** Noviembre 2026  
**Versión:** `1.0.0`  
**Ruta Local:** `C:\Users\rhormazabal\.gemini\antigravity\scratch\update-sistema-control-consumo`  
**Repositorio GitHub:** `https://github.com/Rulman75/control-consumo-web.git`

---

## 1. Tecnología de Desarrollo (Stack Técnico)

- **Backend (`backend/`):**
  - **Runtime y Framework:** Node.js (`v22.22.1`) + Express `^5.2.1` (CommonJS).
  - **Drivers de Base de Datos:** `pg` `^8.23.1` (PostgreSQL) y `mssql` `^12.7.0` (SQL Server), unificados mediante el adaptador **Dual-Engine** en `backend/db.js`.
  - **Seguridad y Librerías:** `jsonwebtoken` `^9.0.3`, `cors` `^2.8.6`, `dotenv` `^17.3.1`, `xlsx` `^0.18.5`.
- **Frontend (`frontend/`):**
  - **Framework y Lenguaje:** React `^19.2.4` + TypeScript `~5.9.3` + Vite `^8.0.5`.
  - **Estilos y Gráficos:** Tailwind CSS `^4.3.3` (`@tailwindcss/vite`), Recharts `^3.8.1`, React Router DOM `^7.18.2`, Axios `^1.15.0`, `xlsx` `^0.18.5`.
  - **Empaquetado:** El build de producción se aloja en `backend/public/` y es servido por el mismo proceso Express.

---

## 2. Dónde Reside el Aplicativo

- **Servidor de Producción:** Servidor Linux interno **`srvcmdslm01`**.
- **Dirección IP:** `192.168.30.45`
- **Ruta en Disco Linux:** `/var/www/html/control-consumo-web` (punto de entrada: `/var/www/html/control-consumo-web/backend/server.js`).
- **Puerto de Escucha:** `3003` (`http://192.168.30.45:3003`)
- **Gestor de Procesos (PM2):**
  - **Nombre del Proceso:** `control-consumo-web` (ID PM2: `2`)
  - **Usuario de Sistema Operativo:** `rhormazabal`

---

## 3. Motor y Residencia de Base de Datos

El sistema opera actualmente en **Modo Marcha Blanca Dual (`DB_ENGINE=dual`)**, sincronizado además en tiempo real por el demonio `marcha-blanca-archivo`.

### 3.1. Motor Principal — PostgreSQL Centralizado CMDS
- **Servidor / IP:** `192.168.30.47`
- **Motor y Versión:** PostgreSQL `18.6` sobre Ubuntu 26.04.1 LTS
- **Puerto:** `5432`
- **Nombre de la Base de Datos:** `bd_control_servicios` (9 tablas, ~90.068 registros)
- **Usuario:** `cmds_admin`
- **Contraseña:** `CmdsPostgres2026!`

### 3.2. Motor Legado — SQL Server (`SRVCMDSAGENDA01`)
- **Servidor / Instancia:** `192.168.3.159\BASE`
- **Motor y Versión:** Microsoft SQL Server 2012 SP4 Standard sobre Windows Server 2012 R2
- **Nombre de la Base de Datos:** `ControlServicios`
- **Usuario:** `base`
- **Contraseña:** `base2014`

---

## 4. Usuarios, Contraseñas y Secretos

- **Credenciales BD PostgreSQL (`192.168.30.47`):** `cmds_admin` / `CmdsPostgres2026!`
- **Credenciales BD SQL Server (`192.168.3.159\BASE`):** `base` / `base2014`
- **Secreto JWT (`JWT_SECRET` en `backend/.env`):** `cmds_control_consumos_secret_key_2026`
- **Credencial Administrativa Directa del Aplicativo (`backend/server.js`):**
  - **Usuario:** `rc`
  - **Contraseña:** `1595`
  - **Rol:** `A` (`Administrador Consumos`)
- **Usuarios de Base de Datos (Tabla `Usuarios`):**
  - Validados contra la tabla `Usuarios` (`usuario`, `clave`, `tipo`, `unidad`).
  - **Perfiles (`tipo`):** `A` (Administrador), `C` (Contabilidad / Softland), `D` (Dirección Sectorial), `U` (Unidad / Establecimiento).
