import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import colors from '../../theme/colors';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Header from '../../components/common/Header';
import Button from '../../components/common/Button';
import InputField from '../../components/common/InputField';
import AlertBanner from '../../components/common/AlertBanner';
import { useAuth } from '../../context/AuthContext';
import {
  obtenerReservas,
  editarEstadoReserva,
  obtenerHistorialLote,
} from '../../services/api';

const ESTADOS_TABS = ['Todas', 'Pendiente', 'Confirmada', 'En tránsito', 'Entregada', 'Cancelada'];

export default function MyReservationsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [reservas, setReservas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tabActual, setTabActual] = useState('Todas');
  const [alert, setAlert] = useState<{ type: string; message: string } | null>(null);

  // Modal Cancelar
  const [modalCancelarVisible, setModalCancelarVisible] = useState(false);
  const [reservaParaCancelar, setReservaParaCancelar] = useState<any | null>(null);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [cancelando, setCancelando] = useState(false);

  // Modal Timeline / Seguimiento
  const [modalTimelineVisible, setModalTimelineVisible] = useState(false);
  const [reservaTimeline, setReservaTimeline] = useState<any | null>(null);
  const [eventosLote, setEventosLote] = useState<any[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  const cargarReservas = useCallback(async () => {
    try {
      const data = await obtenerReservas({ comprador_id: user?.id });
      const lista = Array.isArray(data) ? data : (data as any)?.reservas || [];
      setReservas(lista);
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.message || 'Error al cargar tus reservas.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    cargarReservas();
  }, [cargarReservas]);

  const onRefresh = () => {
    setRefreshing(true);
    cargarReservas();
  };

  const reservasFiltradas = reservas.filter((r) => {
    if (tabActual === 'Todas') return true;
    return (r.estado || '').toLowerCase() === tabActual.toLowerCase();
  });

  const abrirModalCancelar = (reserva: any) => {
    setReservaParaCancelar(reserva);
    setMotivoCancelacion('');
    setModalCancelarVisible(true);
  };

  const handleConfirmarCancelacion = async () => {
    if (!reservaParaCancelar) return;
    if (!motivoCancelacion.trim()) {
      setAlert({ type: 'error', message: 'Por favor indica el motivo de la cancelación.' });
      return;
    }

    setCancelando(true);
    try {
      await editarEstadoReserva(reservaParaCancelar.id, {
        estado: 'Cancelada',
        motivo_cancelacion: motivoCancelacion.trim(),
      });
      setAlert({ type: 'ok', message: `Reserva #${reservaParaCancelar.id} cancelada.` });
      setModalCancelarVisible(false);
      cargarReservas();
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Error al cancelar la reserva.' });
    } finally {
      setCancelando(false);
    }
  };

  const abrirTimeline = async (reserva: any) => {
    setReservaTimeline(reserva);
    setModalTimelineVisible(true);
    setLoadingTimeline(true);
    try {
      const loteId = reserva.lote_id || reserva.lote?.id;
      if (loteId) {
        const evs = await obtenerHistorialLote(loteId);
        setEventosLote(Array.isArray(evs) ? evs : []);
      } else {
        setEventosLote([]);
      }
    } catch {
      setEventosLote([]);
    } finally {
      setLoadingTimeline(false);
    }
  };

  const getBadgeVariant = (estado: string) => {
    const est = (estado || '').toLowerCase();
    if (est === 'confirmada' || est === 'entregada') return 'success';
    if (est === 'en tránsito' || est === 'en preparación') return 'info';
    if (est === 'pendiente') return 'warning';
    if (est === 'cancelada') return 'danger';
    return 'default';
  };

  const renderReserva = ({ item }: { item: any }) => {
    const total = parseFloat(item.precio_total || item.total || 0);
    const anticipo = total * 0.3;
    const pendiente = total * 0.7;
    const esCancelable = (item.estado || '').toLowerCase() === 'pendiente';

    return (
      <Card style={styles.reservaCard}>
        <View style={styles.cardTop}>
          <View>
            <Text style={styles.reservaId}>Reserva #{item.id}</Text>
            <Text style={styles.cultivoNombre}>
              {item.lote?.cultivo || item.cultivo || 'Cosecha AgroDirecto'}
            </Text>
          </View>
          <Badge text={item.estado || 'Pendiente'} variant={getBadgeVariant(item.estado)} />
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>⚖️ Cantidad:</Text>
          <Text style={styles.metaVal}>{item.cantidad || item.cantidad_kg || 0} kg</Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>💰 Total pactado:</Text>
          <Text style={styles.metaValBold}>${total.toLocaleString()} COP</Text>
        </View>

        <View style={styles.anticipoGrid}>
          <View style={styles.anticipoItem}>
            <Text style={styles.anticipoLabel}>Anticipo (30%):</Text>
            <Text style={styles.anticipoVal}>${anticipo.toLocaleString()}</Text>
          </View>
          <View style={styles.anticipoItem}>
            <Text style={styles.anticipoLabel}>Contra-entrega (70%):</Text>
            <Text style={styles.anticipoVal}>${pendiente.toLocaleString()}</Text>
          </View>
        </View>

        {item.fecha_creacion && (
          <Text style={styles.fechaText}>
            Creada el: {new Date(item.fecha_creacion).toLocaleDateString('es-CO')}
          </Text>
        )}

        {/* Acciones */}
        <View style={styles.actionsBar}>
          <TouchableOpacity
            style={styles.actionBtnSec}
            onPress={() => abrirTimeline(item)}
          >
            <Text style={styles.actionBtnSecText}>🌱 Seguimiento</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtnSec}
            onPress={() => navigation.navigate('Pagos', { reservaId: item.id })}
          >
            <Text style={styles.actionBtnSecText}>💳 Pagos</Text>
          </TouchableOpacity>

          {esCancelable && (
            <TouchableOpacity
              style={styles.actionBtnDanger}
              onPress={() => abrirModalCancelar(item)}
            >
              <Text style={styles.actionBtnDangerText}>Cancelar</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.actionBtnSec}
            onPress={() => navigation.navigate('Disputas', { reservaId: item.id })}
          >
            <Text style={styles.actionBtnSecText}>⚖️ Reclamar</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="📋 Mis Reservas"
        subtitle="Monitorea tus pedidos agrícolas y pagos"
        showBack={navigation.canGoBack()}
        onBack={() => navigation.goBack()}
        rightAction={{
          label: '+ Explorar',
          onPress: () => navigation.navigate('Explorar'),
        }}
      />

      <View style={styles.content}>
        {alert && (
          <AlertBanner
            type={alert.type as any}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        )}

        {/* Tabs de estado */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
          {ESTADOS_TABS.map((tab) => {
            const active = tabActual === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tabChip, active && styles.tabChipActive]}
                onPress={() => setTabActual(tab)}
              >
                <Text style={[styles.tabChipText, active && styles.tabChipTextActive]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loaderText}>Cargando tus reservas...</Text>
          </View>
        ) : (
          <FlatList
            data={reservasFiltradas}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderReserva}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
            }
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📦</Text>
                <Text style={styles.emptyTitle}>No hay reservas en esta categoría</Text>
                <Text style={styles.emptySubtitle}>
                  {tabActual !== 'Todas'
                    ? `No tienes pedidos con estado "${tabActual}".`
                    : 'Aún no has realizado ninguna reserva de cosecha.'}
                </Text>
                {tabActual === 'Todas' && (
                  <Button
                    title="Ir al Catálogo de Lotes"
                    variant="primary"
                    size="small"
                    onPress={() => navigation.navigate('Explorar')}
                    style={{ marginTop: 14 }}
                  />
                )}
              </View>
            }
          />
        )}
      </View>

      {/* Modal Cancelación */}
      <Modal visible={modalCancelarVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cancelar Reserva #{reservaParaCancelar?.id}</Text>
            <Text style={styles.modalSub}>
              Esta acción liberará la cantidad reservada nuevamente al stock del productor.
            </Text>

            <InputField
              label="Motivo de Cancelación"
              value={motivoCancelacion}
              onChangeText={setMotivoCancelacion}
              placeholder="Indica el motivo por el cual cancelas este pedido..."
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <Button
                title="Volver"
                variant="outline"
                onPress={() => setModalCancelarVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Confirmar Cancelación"
                variant="danger"
                loading={cancelando}
                onPress={handleConfirmarCancelacion}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Seguimiento y Trazabilidad */}
      <Modal visible={modalTimelineVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🌱 Trazabilidad de la Cosecha</Text>
            <Text style={styles.modalSub}>
              Reserva #{reservaTimeline?.id} • Lote #{reservaTimeline?.lote_id || '—'}
            </Text>

            {loadingTimeline ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ margin: 20 }} />
            ) : eventosLote.length === 0 ? (
              <View style={styles.timelineEmpty}>
                <Text style={styles.timelineEmptyText}>
                  El cultivo avanza conforme al calendario agrícola programado.
                </Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 240, marginVertical: 10 }}>
                {eventosLote.map((ev, idx) => (
                  <View key={String(ev.id || idx)} style={styles.timelineEvent}>
                    <View style={styles.timelineDot} />
                    <View style={styles.timelineEventBody}>
                      <Text style={styles.timelineEventTitle}>{ev.estado || ev.titulo || 'Actualización'}</Text>
                      <Text style={styles.timelineEventDesc}>{ev.descripcion || ev.comentario || ''}</Text>
                      <Text style={styles.timelineEventDate}>
                        {ev.fecha ? new Date(ev.fecha).toLocaleDateString('es-CO') : ''}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}

            <Button
              title="Cerrar"
              variant="outline"
              onPress={() => setModalTimelineVisible(false)}
              style={{ marginTop: 12 }}
            />
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  tabsScroll: {
    maxHeight: 38,
    marginBottom: 12,
  },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  tabChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabChipTextActive: {
    color: '#ffffff',
  },
  listContent: {
    paddingBottom: 24,
  },
  reservaCard: {
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reservaId: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cultivoNombre: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  metaLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  metaVal: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  metaValBold: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  anticipoGrid: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    padding: 8,
    borderRadius: 8,
    marginVertical: 8,
  },
  anticipoItem: {
    flex: 1,
  },
  anticipoLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  anticipoVal: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  fechaText: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 10,
  },
  actionsBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionBtnSec: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.surfaceMuted,
  },
  actionBtnSecText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  actionBtnDanger: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#fde8e8',
  },
  actionBtnDangerText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.danger,
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
    marginBottom: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  timelineEmpty: {
    padding: 16,
    alignItems: 'center',
  },
  timelineEmptyText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  timelineEvent: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginTop: 4,
    marginRight: 10,
  },
  timelineEventBody: {
    flex: 1,
  },
  timelineEventTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  timelineEventDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginVertical: 2,
  },
  timelineEventDate: {
    fontSize: 10,
    color: colors.textMuted,
  },
});
