import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { DialogosProvider } from "./context/DialogosProvider";
import ProtectedRoute from "./components/common/ProtectedRoute";

// Layouts
import PublicLayout from "./components/layout/PublicLayout";
import DashboardLayout from "./components/layout/DashboardLayout";

// Páginas Públicas
const HomePage = lazy(() => import("./pages/public/HomePage"));
const AboutPage = lazy(() => import("./pages/public/AboutPage"));
const ContactPage = lazy(() => import("./pages/public/ContactPage"));
const LoginPage = lazy(() => import("./pages/public/LoginPage"));
const RegisterPage = lazy(() => import("./pages/public/RegisterPage"));
const RecoverPasswordPage = lazy(() => import("./pages/public/RecoverPasswordPage"));

// Páginas Comprador
const BuyerDashboardPage = lazy(() => import("./pages/buyer/BuyerDashboardPage"));
const ExploreLotsPage = lazy(() => import("./pages/buyer/ExploreLotsPage"));
const MyReservationsPage = lazy(() => import("./pages/buyer/MyReservationsPage"));
const DeliveriesPage = lazy(() => import("./pages/buyer/DeliveriesPage"));
const PaymentsPage = lazy(() => import("./pages/buyer/PaymentsPage"));
const FavoriteProducersPage = lazy(() => import("./pages/buyer/FavoriteProducersPage"));
const PublicProfilePage = lazy(() => import("./pages/buyer/PublicProfilePage"));

// Páginas Productor
const ProducerDashboardPage = lazy(() => import("./pages/producer/ProducerDashboardPage"));
const MyCropsPage = lazy(() => import("./pages/producer/MyCropsPage"));
const TraceabilityPage = lazy(() => import("./pages/producer/TraceabilityPage"));
const SalesAndPaymentsPage = lazy(() => import("./pages/producer/SalesAndPaymentsPage"));
const ProducerReportsPage = lazy(() => import("./pages/producer/ProducerReportsPage"));

// Páginas Administrador
const AdminDashboardPage = lazy(() => import("./pages/admin/AdminDashboardPage"));
const UsersPage = lazy(() => import("./pages/admin/UsersPage"));
const RolesPage = lazy(() => import("./pages/admin/RolesPage"));
const ProvidersPage = lazy(() => import("./pages/admin/ProvidersPage"));
const LotsAdminPage = lazy(() => import("./pages/admin/LotsAdminPage"));
const CategoriesPage = lazy(() => import("./pages/admin/CategoriesPage"));
const HistoryAdminPage = lazy(() => import("./pages/admin/HistoryAdminPage"));
const ReportsAdminPage = lazy(() => import("./pages/admin/ReportsAdminPage"));
const SupportAdminPage = lazy(() => import("./pages/admin/SupportAdminPage"));

// Páginas Compartidas
const ProfilePage = lazy(() => import("./pages/shared/ProfilePage"));
const DisputesPage = lazy(() => import("./pages/shared/DisputesPage"));
const NotificationsPage = lazy(() => import("./pages/shared/NotificationsPage"));

export default function App() {
  return (
    <AuthProvider>
      <DialogosProvider>
      <BrowserRouter>
        <Suspense fallback={<p className="celda-vacia" style={{ padding: "40px" }}>Cargando...</p>}>
        <Routes>
          {/* Rutas Públicas */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/nosotros" element={<AboutPage />} />
            <Route path="/contacto" element={<ContactPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/registro" element={<RegisterPage />} />
            <Route path="/recuperar-clave" element={<RecoverPasswordPage />} />
          </Route>

          {/* Rutas Protegidas de Comprador */}
          <Route
            element={
              <ProtectedRoute allowedRoles={["Comprador"]}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/comprador" element={<BuyerDashboardPage />} />
            <Route path="/comprador/explorar-lotes" element={<ExploreLotsPage />} />
            <Route path="/comprador/mis-reservas" element={<MyReservationsPage />} />
            <Route path="/comprador/entregas" element={<DeliveriesPage />} />
            <Route path="/comprador/pagos" element={<PaymentsPage />} />
            <Route path="/comprador/productores-favoritos" element={<FavoriteProducersPage />} />
          </Route>

          {/* Rutas Protegidas de Productor */}
          <Route
            element={
              <ProtectedRoute allowedRoles={["Productor"]}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/productor" element={<ProducerDashboardPage />} />
            <Route path="/productor/mis-cultivos" element={<MyCropsPage />} />
            <Route path="/productor/trazabilidad" element={<TraceabilityPage />} />
            <Route path="/productor/ventas-pagos" element={<SalesAndPaymentsPage />} />
            <Route path="/productor/reportes" element={<ProducerReportsPage />} />
          </Route>

          {/* Rutas Protegidas de Administrador */}
          <Route
            element={
              <ProtectedRoute allowedRoles={["Administrador"]}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/usuarios" element={<UsersPage />} />
            <Route path="/admin/roles" element={<RolesPage />} />
            <Route path="/admin/proveedores" element={<ProvidersPage />} />
            <Route path="/admin/lotes" element={<LotsAdminPage />} />
            <Route path="/admin/categorias" element={<CategoriesPage />} />
            <Route path="/admin/historial" element={<HistoryAdminPage />} />
            <Route path="/admin/reportes" element={<ReportsAdminPage />} />
            <Route path="/admin/soporte" element={<SupportAdminPage />} />
          </Route>

          {/* Rutas Compartidas (Cualquier usuario autenticado) */}
          <Route
            element={
              <ProtectedRoute allowedRoles={["Administrador", "Productor", "Comprador"]}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/perfil" element={<ProfilePage />} />
            <Route path="/perfil-publico" element={<PublicProfilePage />} />
            <Route path="/perfil-publico/:id" element={<PublicProfilePage />} />
            <Route path="/disputas" element={<DisputesPage />} />
            <Route path="/notificaciones" element={<NotificationsPage />} />
          </Route>

          {/* Redirección por defecto */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
      </DialogosProvider>
    </AuthProvider>
  );
}
