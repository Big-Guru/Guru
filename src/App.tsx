/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ClientsList from './components/ClientsList';
import ClientDetails from './components/ClientDetails';
import ProjectDetails from './components/ProjectDetails';
import ClientForm from './components/ClientForm';
import ProjectList from './components/ProjectList';
import AlertsList from './components/AlertsList';
import MissionsList from './components/MissionsList';
import EncaissementsList from './components/EncaissementsList';

import AuthWrapper from './components/AuthWrapper';
import FirebaseSync from './components/FirebaseSync';

export default function App() {
  return (
    <AuthWrapper>
      <FirebaseSync />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="clients" element={<ClientsList />} />
            <Route path="clients/new" element={<ClientForm />} />
            <Route path="clients/:id" element={<ClientDetails />} />
            <Route path="clients/:id/edit" element={<ClientForm />} />
            <Route path="projects" element={<ProjectList />} />
            <Route path="projects/:id" element={<ProjectDetails />} />
            <Route path="alerts" element={<AlertsList />} />
            <Route path="encaissements" element={<EncaissementsList />} />
            <Route path="missions" element={<MissionsList />} />
            <Route path="*" element={<div className="p-8">Oups ! Page introuvable.</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthWrapper>
  );
}
