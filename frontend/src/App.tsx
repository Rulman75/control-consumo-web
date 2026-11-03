import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { DashboardEstadisticas } from './pages/DashboardEstadisticas';
import { MantencionDocumentos } from './pages/MantencionDocumentos';
import { MantencionClientes } from './pages/MantencionClientes';
import { MantencionServicios } from './pages/MantencionServicios';
import { ProcesosNominas } from './pages/ProcesosNominas';
import { ProcesosPagos } from './pages/ProcesosPagos';
import { ProcesosSoftland } from './pages/ProcesosSoftland';
import { InformesConsumos } from './pages/InformesConsumos';

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('cmds_consumos_token'));
  const [username, setUsername] = useState<string>(localStorage.getItem('cmds_consumos_user') || '');
  const [role, setRole] = useState<string>(localStorage.getItem('cmds_consumos_role') || 'A');
  const [roleLabel, setRoleLabel] = useState<string>(localStorage.getItem('cmds_consumos_role_label') || 'Administrador Consumos');
  const [sector, setSector] = useState<string>(localStorage.getItem('cmds_consumos_sector') || '');

  const handleLogin = (
    newToken: string,
    newUsername: string,
    newRole: string,
    newRoleLabel: string,
    newSector: string
  ) => {
    setToken(newToken);
    setUsername(newUsername);
    setRole(newRole);
    setRoleLabel(newRoleLabel);
    setSector(newSector);
    localStorage.setItem('cmds_consumos_token', newToken);
    localStorage.setItem('cmds_consumos_user', newUsername);
    localStorage.setItem('cmds_consumos_role', newRole);
    localStorage.setItem('cmds_consumos_role_label', newRoleLabel);
    localStorage.setItem('cmds_consumos_sector', newSector);
  };

  const handleLogout = () => {
    setToken(null);
    setUsername('');
    setRole('');
    setRoleLabel('');
    setSector('');
    localStorage.removeItem('cmds_consumos_token');
    localStorage.removeItem('cmds_consumos_user');
    localStorage.removeItem('cmds_consumos_role');
    localStorage.removeItem('cmds_consumos_role_label');
    localStorage.removeItem('cmds_consumos_sector');
  };

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <Layout
              username={username}
              role={role}
              roleLabel={roleLabel}
              sector={sector}
              onLogout={handleLogout}
            />
          }
        >
          <Route index element={<DashboardEstadisticas />} />
          <Route path="estadisticas" element={<DashboardEstadisticas />} />
          <Route path="mantencion/documentos" element={<MantencionDocumentos />} />
          <Route path="mantencion/clientes" element={<MantencionClientes />} />
          <Route path="mantencion/servicios" element={<MantencionServicios />} />
          <Route path="procesos/nominas" element={<ProcesosNominas />} />
          <Route path="procesos/pagos" element={<ProcesosPagos />} />
          <Route path="procesos/softland" element={<ProcesosSoftland />} />
          <Route path="informes" element={<InformesConsumos />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
