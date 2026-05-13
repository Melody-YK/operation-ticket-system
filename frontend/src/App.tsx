import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthLayout } from './layouts/AuthLayout';
import { MainLayout } from './layouts/MainLayout';
import { LoginPage } from './pages/LoginPage';
import { WorkbenchPage } from './pages/WorkbenchPage';
import { TicketCreatePage } from './pages/TicketCreatePage';
import { TicketQueryPage } from './pages/TicketQueryPage';
import { TicketReviewPage } from './pages/TicketReviewPage';
import { TicketExecutePage } from './pages/TicketExecutePage';
import { TicketMonitorPage } from './pages/TicketMonitorPage';
import { TicketVerifyPage } from './pages/TicketVerifyPage';
import './App.css';

function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 6,
        },
      }}
    >
      <AntApp>
        <AuthProvider>
          <BrowserRouter>
            <ErrorBoundary>
              <Routes>
                <Route path="/login" element={<AuthLayout />}>
                  <Route index element={<LoginPage />} />
                </Route>

                <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                  <Route index element={<Navigate to="/workbench" replace />} />
                  <Route path="workbench" element={<WorkbenchPage />} />
                  <Route path="tickets/create" element={<TicketCreatePage />} />
                  <Route path="tickets/query" element={<TicketQueryPage />} />
                  <Route path="tickets/:id/execute" element={<TicketExecutePage />} />
                  <Route path="tickets/:id/monitor" element={<TicketMonitorPage />} />
                  <Route path="tickets/:id/verify" element={<TicketVerifyPage />} />
                  <Route path="tickets/:id" element={<TicketReviewPage />} />
                </Route>

                <Route path="*" element={<Navigate to="/workbench" replace />} />
              </Routes>
            </ErrorBoundary>
          </BrowserRouter>
        </AuthProvider>
      </AntApp>
    </ConfigProvider>
  );
}

export default App;
