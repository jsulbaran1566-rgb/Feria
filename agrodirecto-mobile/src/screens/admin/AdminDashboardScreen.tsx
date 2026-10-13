import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from 'react-native';
import colors from '../../theme/colors';
import Card from '../../components/common/Card';
import StatCard from '../../components/common/StatCard';
import Header from '../../components/common/Header';
import Button from '../../components/common/Button';
import InputField from '../../components/common/InputField';
import AlertBanner from '../../components/common/AlertBanner';
import { useAuth } from '../../context/AuthContext';
import {
  obtenerUsuarios,
  obtenerRoles,
  obtenerProveedores,
  obtenerLotes,
  obtenerComision,
  actualizarComision,
} from '../../services/api';

export default function AdminDashboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alert, setAlert] = useState<{ type: string; message: string } | null>(null);

  // Estadísticas
  const [usuariosCount, setUsuariosCount] = useState(0);
  const [rolesCount, setRolesCount] = useState(0);
  const [proveedoresCount, setProveedoresCount] = useState(0);
  const [lotesCount, setLotesCount] = useState(0);

  // Comisión Plataforma
  const [comisionPct, setComisionPct] = useState(5);
  const [modalComisionVisible, setModalComisionVisible] = useState(false);
  const [nuevaComisionInput, setNuevaComisionInput] = useState('5');
  const [guardandoComision, setGuardandoComision] = useState(false);

  const cargarDatos = useCallback(async () => {
    try {
      const [uRes, rRes, pRes, lRes, cRes] = await Promise.allSettled([
        obtenerUsuarios(),
        obtenerRoles(),
        obtenerProveedores(),
        obtenerLotes(),
        obtenerComision(),
      ]);

      if (uRes.status === 'fulfilled') {
        const data = Array.isArray(uRes.value) ? uRes.value : (uRes.value as any)?.usuarios || [];
        setUsuariosCount(data.length);
      }
      if (rRes.status === 'fulfilled') {
        const data = Array.isArray(rRes.value) ? rRes.value : (rRes.value as any)?.roles || [];
        setRolesCount(data.length);
      }
      if (pRes.status === 'fulfilled') {
        const data = Array.isArray(pRes.value) ? pRes.value : (pRes.value as any)?.proveedores || [];
        setProveedoresCount(data.length);
      }
      if (lRes.status === 'fulfilled') {
        const data = Array.isArray(lRes.value) ? lRes.value : (lRes.value as any)?.lotes || [];
        setLotesCount(data.length);
      }
      if (cRes.status === 'fulfilled') {
        const val = (cRes.value as any)?.comision_pct ?? 5;
        setComisionPct(val);
        setNuevaComisionInput(String(val));
      }
    } catch {
      // Ignorar
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const onRefresh = () => {
    setRefreshing(true);
    cargarDatos();
  };

  const handleGuardarComision = async () => {
    const val = parseFloat(nuevaComisionInput);
    if (isNaN(val) || val < 0 || val > 50) {
      setAlert({ type: 'error', message: 'Ingresa un porcentaje de comisión válido entre 0% y 50%.' });
      return;
    }
    setGuardandoComision(true);
    try {
      await actualizarComision(val);
      setComisionPct(val);
      setAlert({ type: 'ok', message: `Comisión institucional actualizada a ${val}%.` });
      setModalComisionVisible(false);
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Error al actualizar comisión.' });
    } finally {
      setGuardandoComision(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Panel Administrador"
        subtitle={`Admin: ${user?.nombre || 'Administrador General'}`}
        rightAction={{
          label: '🔔',
          onPress: () => navigation.navigate('Notificaciones'),
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {alert && (
          <AlertBanner
            type={alert.type as any}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        )}

        {/* Banner Admin */}
        <Card style={styles.adminBanner}>
          <View style={styles.adminHeader}>
            <View>
              <Text style={styles.bannerTitle}>Control y Gobernanza AgroDirecto</Text>
              <Text style={styles.bannerSub}>
                Supervisa transacciones, usuarios, trazabilidad y resolución de mediaciones
              </Text>
            </View>
            <Text style={styles.bannerEmoji}>🛡️</Text>
          </View>
        </Card>

        {/* Métricas Principales */}
        <Text style={styles.sectionTitle}>Métricas del Sistema</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="Usuarios Totales"
            value={usuariosCount}
            icon="👥"
            variant="default"
          />
          <StatCard
            title="Roles y Permisos"
            value={rolesCount}
            icon="🔐"
            variant="info"
          />
          <StatCard
            title="Proveedores"
            value={proveedoresCount}
            icon="🚚"
            variant="warning"
          />
          <StatCard
            title="Lotes Activos"
            value={lotesCount}
            icon="🌱"
            variant="success"
          />
        </View>

        {/* Tarjeta de Configuración de Comisión */}
        <Card style={styles.comisionCard}>
          <View style={styles.comisionTop}>
            <View>
              <Text style={styles.comisionTitle}>Comisión por Transacción</Text>
              <Text style={styles.comisionDesc}>
                Tarifa institucional aplicada automáticamente a cada reserva confirmada
              </Text>
            </View>
            <View style={styles.comisionBadge}>
              <Text style={styles.comisionValorText}>{comisionPct}%</Text>
            </View>
          </View>
          <Button
            title="⚙️ Ajustar Porcentaje de Comisión"
            variant="outline"
            size="small"
            onPress={() => setModalComisionVisible(true)}
            style={{ marginTop: 8 }}
          />
        </Card>

        {/* Módulos Administrativos */}
        <Text style={styles.sectionTitle}>Módulos de Gestión</Text>
        <View style={styles.modulesGrid}>
          <TouchableOpacity
            style={styles.moduleCard}
            onPress={() => navigation.navigate('UsuariosTab')}
          >
            <Text style={styles.moduleIcon}>👥</Text>
            <Text style={styles.moduleTitle}>Usuarios</Text>
            <Text style={styles.moduleSub}>Altas, bajas y roles</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.moduleCard}
            onPress={() => navigation.navigate('LotesTab')}
          >
            <Text style={styles.moduleIcon}>🌱</Text>
            <Text style={styles.moduleTitle}>Lotes Agrícolas</Text>
            <Text style={styles.moduleSub}>Moderación de cosechas</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.moduleCard}
            onPress={() => navigation.navigate('Roles')}
          >
            <Text style={styles.moduleIcon}>🔐</Text>
            <Text style={styles.moduleTitle}>Roles y Permisos</Text>
            <Text style={styles.moduleSub}>Control de acceso</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.moduleCard}
            onPress={() => navigation.navigate('Categorias')}
          >
            <Text style={styles.moduleIcon}>🗂️</Text>
            <Text style={styles.moduleTitle}>Categorías</Text>
            <Text style={styles.moduleSub}>Taxonomía de productos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.moduleCard}
            onPress={() => navigation.navigate('Proveedores')}
          >
            <Text style={styles.moduleIcon}>🚚</Text>
            <Text style={styles.moduleTitle}>Proveedores</Text>
            <Text style={styles.moduleSub}>Insumos y transporte</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.moduleCard}
            onPress={() => navigation.navigate('Historial')}
          >
            <Text style={styles.moduleIcon}>📋</Text>
            <Text style={styles.moduleTitle}>Historial Auditoría</Text>
            <Text style={styles.moduleSub}>Logs y transacciones</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.moduleCard}
            onPress={() => navigation.navigate('Disputas')}
          >
            <Text style={styles.moduleIcon}>⚖️</Text>
            <Text style={styles.moduleTitle}>Disputas</Text>
            <Text style={styles.moduleSub}>Mediación y reembolsos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.moduleCard}
            onPress={() => navigation.navigate('Soporte')}
          >
            <Text style={styles.moduleIcon}>📨</Text>
            <Text style={styles.moduleTitle}>Tickets Soporte</Text>
            <Text style={styles.moduleSub}>Atención al cliente</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.moduleCard}
            onPress={() => navigation.navigate('ReportesTab')}
          >
            <Text style={styles.moduleIcon}>📈</Text>
            <Text style={styles.moduleTitle}>Reporte Financiero</Text>
            <Text style={styles.moduleSub}>Facturación institucional</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.moduleCard}
            onPress={() => navigation.navigate('PerfilTab')}
          >
            <Text style={styles.moduleIcon}>👤</Text>
            <Text style={styles.moduleTitle}>Mi Cuenta</Text>
            <Text style={styles.moduleSub}>Perfil y clave</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal Ajustar Comisión */}
      <Modal visible={modalComisionVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>⚙️ Configurar Comisión Institucional</Text>
            <Text style={styles.modalSub}>
              Este porcentaje se descuenta de las transacciones para sostener la plataforma.
            </Text>

            <InputField
              label="Porcentaje de Comisión (%)"
              value={nuevaComisionInput}
              onChangeText={setNuevaComisionInput}
              placeholder="Ej: 5"
              keyboardType="numeric"
            />

            <View style={styles.modalButtons}>
              <Button
                title="Cancelar"
                variant="outline"
                onPress={() => setModalComisionVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Guardar Cambio"
                variant="primary"
                loading={guardandoComision}
                onPress={handleGuardarComision}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  adminBanner: {
    backgroundColor: '#eff4fc',
    borderColor: '#bcd0f7',
    marginBottom: 20,
  },
  adminHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a365d',
    marginBottom: 4,
  },
  bannerSub: {
    fontSize: 12,
    color: colors.textSecondary,
    maxWidth: 240,
    lineHeight: 16,
  },
  bannerEmoji: {
    fontSize: 34,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  comisionCard: {
    marginBottom: 20,
    backgroundColor: colors.surface,
  },
  comisionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  comisionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  comisionDesc: {
    fontSize: 12,
    color: colors.textMuted,
    maxWidth: 220,
    marginTop: 2,
  },
  comisionBadge: {
    backgroundColor: '#eff8f2',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  comisionValorText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  moduleCard: {
    width: '48%',
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  moduleIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  moduleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  moduleSub: {
    fontSize: 11,
    color: colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
});
