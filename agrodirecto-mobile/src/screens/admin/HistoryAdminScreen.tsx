import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import colors from '../../theme/colors';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Header from '../../components/common/Header';
import InputField from '../../components/common/InputField';
import AlertBanner from '../../components/common/AlertBanner';
import {
  obtenerHistorialSeguimiento,
  obtenerHistorialReservas,
} from '../../services/api';

export default function HistoryAdminScreen({ navigation }: any) {
  const [tabActual, setTabActual] = useState<'reservas' | 'seguimiento'>('reservas');
  const [historialReservas, setHistorialReservas] = useState<any[]>([]);
  const [historialSeguimiento, setHistorialSeguimiento] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [alert, setAlert] = useState<{ type: string; message: string } | null>(null);

  const cargarDatos = useCallback(async () => {
    try {
      const [resR, resS] = await Promise.allSettled([
        obtenerHistorialReservas(),
        obtenerHistorialSeguimiento(),
      ]);

      if (resR.status === 'fulfilled') {
        const data = Array.isArray(resR.value) ? resR.value : (resR.value as any)?.historial || [];
        setHistorialReservas(data);
      }
      if (resS.status === 'fulfilled') {
        const data = Array.isArray(resS.value) ? resS.value : (resS.value as any)?.historial || [];
        setHistorialSeguimiento(data);
      }
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.message || 'Error al cargar registros de auditoría.',
      });
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

  const listaActual = tabActual === 'reservas' ? historialReservas : historialSeguimiento;

  const filtrados = listaActual.filter((item) => {
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase();
    const str = JSON.stringify(item).toLowerCase();
    return str.includes(q);
  });

  const renderItem = ({ item }: { item: any }) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.itemTitle}>
            {tabActual === 'reservas'
              ? `Reserva #${item.reserva_id || item.id} • ${item.accion || item.estado || 'Evento'}`
              : `Lote #${item.lote_id || item.id} • ${item.evento || item.estado || 'Actualización'}`}
          </Text>
          <Text style={styles.itemDate}>
            📅 {item.fecha ? new Date(item.fecha).toLocaleString('es-CO') : 'Fecha registrada'}
          </Text>
        </View>
        <Badge
          text={item.estado || 'Auditado'}
          variant={item.estado === 'Cancelada' ? 'danger' : 'info'}
        />
      </View>

      <Text style={styles.detallesText}>
        {item.detalle || item.comentario || item.motivo || item.descripcion || 'Sin observaciones adicionales.'}
      </Text>

      {item.usuario_nombre && (
        <Text style={styles.usuarioActor}>Actor: {item.usuario_nombre}</Text>
      )}
    </Card>
  );

  return (
    <View style={styles.container}>
      <Header
        title="📋 Auditoría e Historial"
        subtitle="Registro inmutable de transacciones y estados"
        showBack
        onBack={() => navigation.goBack()}
      />

      <View style={styles.content}>
        {alert && (
          <AlertBanner
            type={alert.type as any}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        )}

        {/* Selector de Pestaña */}
        <View style={styles.tabSelector}>
          <TouchableOpacity
            style={[styles.tabBtn, tabActual === 'reservas' && styles.tabBtnActive]}
            onPress={() => setTabActual('reservas')}
          >
            <Text style={[styles.tabBtnText, tabActual === 'reservas' && styles.tabBtnTextActive]}>
              🛒 Órdenes ({historialReservas.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, tabActual === 'seguimiento' && styles.tabBtnActive]}
            onPress={() => setTabActual('seguimiento')}
          >
            <Text style={[styles.tabBtnText, tabActual === 'seguimiento' && styles.tabBtnTextActive]}>
              🌱 Cultivos ({historialSeguimiento.length})
            </Text>
          </TouchableOpacity>
        </View>

        <InputField
          label=""
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="🔍 Buscar en registros de auditoría..."
        />

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loaderText}>Cargando bitácora de auditoría...</Text>
          </View>
        ) : (
          <FlatList
            data={filtrados}
            keyExtractor={(item, idx) => String(item.id || idx)}
            renderItem={renderItem}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
            }
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyTitle}>Sin registros coincidentes</Text>
                <Text style={styles.emptySubtitle}>
                  No se encontraron eventos en este histórico.
                </Text>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  tabSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: '#eff8f2',
    borderColor: colors.primary,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabBtnTextActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  itemDate: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  detallesText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginVertical: 4,
  },
  usuarioActor: {
    fontSize: 11,
    color: colors.primaryDark,
    fontWeight: '600',
    marginTop: 4,
  },
  loaderContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 10,
    color: colors.textMuted,
    fontSize: 14,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 44,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
