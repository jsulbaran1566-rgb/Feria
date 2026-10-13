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
import Button from '../../components/common/Button';
import AlertBanner from '../../components/common/AlertBanner';
import {
  obtenerNotificaciones,
  marcarNotificacionLeida,
  marcarTodasNotificacionesLeidas,
} from '../../services/api';

const TIPOS_NOTIFICACION: { [key: string]: { label: string; icon: string; variant: any } } = {
  NuevaReserva: { label: 'Nueva Reserva', icon: '🛒', variant: 'info' },
  CambioEstadoCultivo: { label: 'Estado de Cultivo', icon: '🌱', variant: 'success' },
  PagoRecibido: { label: 'Pago Recibido', icon: '💰', variant: 'success' },
  RecordatorioEntrega: { label: 'Entrega Próxima', icon: '🚚', variant: 'warning' },
  AlertaIncidencia: { label: 'Incidencia', icon: '⚠️', variant: 'danger' },
  ReembolsoProcesado: { label: 'Reembolso', icon: '↩️', variant: 'secondary' },
};

export default function NotificationsScreen({ navigation }: any) {
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState<string>('');
  const [alert, setAlert] = useState<{ type: string; message: string } | null>(null);

  const cargarNotificaciones = useCallback(async () => {
    try {
      const res = await obtenerNotificaciones();
      const lista = Array.isArray(res) ? res : res?.notificaciones || [];
      setNotificaciones(lista);
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.message || 'Error al cargar notificaciones.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    cargarNotificaciones();
  }, [cargarNotificaciones]);

  const onRefresh = () => {
    setRefreshing(true);
    cargarNotificaciones();
  };

  const handleMarcarLeida = async (id: number) => {
    try {
      await marcarNotificacionLeida(id);
      setNotificaciones((prev) =>
        prev.map((n) => (n.id === id ? { ...n, leida: true } : n))
      );
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Error al marcar como leída.' });
    }
  };

  const handleMarcarTodasLeidas = async () => {
    try {
      await marcarTodasNotificacionesLeidas();
      setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
      setAlert({ type: 'ok', message: 'Todas las notificaciones marcadas como leídas.' });
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Error al actualizar notificaciones.' });
    }
  };

  const filtradas = notificaciones.filter((n) => {
    if (!filtroTipo) return true;
    return n.tipo === filtroTipo;
  });

  const noLeidasCount = notificaciones.filter((n) => !n.leida).length;

  const renderItem = ({ item }: { item: any }) => {
    const meta = TIPOS_NOTIFICACION[item.tipo] || {
      label: item.tipo || 'Notificación',
      icon: '🔔',
      variant: 'default',
    };

    return (
      <Card style={[styles.itemCard, !item.leida && styles.itemCardUnread]}>
        <View style={styles.itemHeader}>
          <View style={styles.iconContainer}>
            <Text style={styles.iconEmoji}>{meta.icon}</Text>
          </View>
          <View style={styles.itemHeaderMeta}>
            <View style={styles.typeBadgeRow}>
              <Badge text={meta.label} variant={meta.variant} />
              {!item.leida && (
                <View style={styles.unreadDotBadge}>
                  <Text style={styles.unreadDotText}>NUEVA</Text>
                </View>
              )}
            </View>
            <Text style={styles.timestamp}>
              {item.fecha ? new Date(item.fecha).toLocaleString('es-CO') : ''}
            </Text>
          </View>
        </View>

        <Text style={styles.itemMensaje}>{item.mensaje || item.contenido || 'Sin detalle'}</Text>

        {!item.leida && (
          <View style={styles.itemActions}>
            <TouchableOpacity
              onPress={() => handleMarcarLeida(item.id)}
              style={styles.markBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.markBtnText}>✓ Marcar como leída</Text>
            </TouchableOpacity>
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="🔔 Notificaciones"
        subtitle={
          noLeidasCount > 0
            ? `Tienes ${noLeidasCount} notificaciones sin leer`
            : 'Todas tus notificaciones están al día'
        }
        showBack
        onBack={() => navigation?.goBack()}
      />

      <View style={styles.content}>
        {alert && (
          <AlertBanner
            type={alert.type as any}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        )}

        {/* Filtros rápidos */}
        <View style={styles.filtersBar}>
          <TouchableOpacity
            style={[styles.filterChip, filtroTipo === '' && styles.filterChipActive]}
            onPress={() => setFiltroTipo('')}
          >
            <Text
              style={[
                styles.filterChipText,
                filtroTipo === '' && styles.filterChipTextActive,
              ]}
            >
              Todas ({notificaciones.length})
            </Text>
          </TouchableOpacity>

          {Object.keys(TIPOS_NOTIFICACION).map((key) => {
            const meta = TIPOS_NOTIFICACION[key];
            const isActive = filtroTipo === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setFiltroTipo(isActive ? '' : key)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isActive && styles.filterChipTextActive,
                  ]}
                >
                  {meta.icon} {meta.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {noLeidasCount > 0 && (
          <View style={styles.batchActions}>
            <Button
              title="Marcar todas como leídas"
              onPress={handleMarcarTodasLeidas}
              variant="outline"
              size="small"
            />
          </View>
        )}

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loaderText}>Cargando notificaciones...</Text>
          </View>
        ) : (
          <FlatList
            data={filtradas}
            keyExtractor={(item, index) => String(item.id || index)}
            renderItem={renderItem}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
            }
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📭</Text>
                <Text style={styles.emptyTitle}>No hay notificaciones</Text>
                <Text style={styles.emptySubtitle}>
                  {filtroTipo
                    ? 'No hay notificaciones que coincidan con el filtro seleccionado.'
                    : 'Aún no has recibido notificaciones en tu cuenta.'}
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
  filtersBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  batchActions: {
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  listContent: {
    paddingBottom: 24,
  },
  itemCard: {
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: colors.border,
  },
  itemCardUnread: {
    borderLeftColor: colors.primary,
    backgroundColor: '#f6fbf7',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  iconEmoji: {
    fontSize: 18,
  },
  itemHeaderMeta: {
    flex: 1,
  },
  typeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  unreadDotBadge: {
    backgroundColor: colors.danger,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  unreadDotText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  timestamp: {
    fontSize: 11,
    color: colors.textMuted,
  },
  itemMensaje: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  itemActions: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'flex-end',
  },
  markBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  markBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
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
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
