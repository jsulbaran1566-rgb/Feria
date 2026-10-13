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
  actualizarUbicacionEntrega,
} from '../../services/api';

const ESTADOS_VENTA = ['Todas', 'Pendiente', 'Confirmada', 'En tránsito', 'Entregada'];

export default function SalesAndPaymentsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [ventas, setVentas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtro, setFiltro] = useState('Todas');
  const [alert, setAlert] = useState<{ type: string; message: string } | null>(null);

  // Modal Despacho / GPS
  const [modalGpsVisible, setModalGpsVisible] = useState(false);
  const [ventaParaGps, setVentaParaGps] = useState<any | null>(null);
  const [latInput, setLatInput] = useState('6.2442');
  const [lonInput, setLonInput] = useState('-75.5812');
  const [actualizandoGps, setActualizandoGps] = useState(false);

  const cargarVentas = useCallback(async () => {
    try {
      const data = await obtenerReservas();
      const lista = Array.isArray(data) ? data : (data as any)?.reservas || [];

      // Filtramos por las reservas de los lotes de este productor si vienen mapeadas
      const delProductor = lista.filter(
        (r: any) =>
          !user?.id ||
          r.productor_id === user.id ||
          r.lote?.productor_id === user.id ||
          r.lote?.usuario_id === user.id
      );

      setVentas(delProductor.length > 0 ? delProductor : lista);
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.message || 'Error al cargar ventas y reservas.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    cargarVentas();
  }, [cargarVentas]);

  const onRefresh = () => {
    setRefreshing(true);
    cargarVentas();
  };

  const handleCambiarEstado = async (reservaId: number, nuevoEstado: string) => {
    try {
      await editarEstadoReserva(reservaId, { estado: nuevoEstado });
      setAlert({
        type: 'ok',
        message: `Reserva #${reservaId} actualizada a "${nuevoEstado}".`,
      });
      cargarVentas();
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Error al actualizar pedido.' });
    }
  };

  const abrirModalGps = (item: any) => {
    setVentaParaGps(item);
    setLatInput(user?.latitud ? String(user.latitud) : '6.2442');
    setLonInput(user?.longitud ? String(user.longitud) : '-75.5812');
    setModalGpsVisible(true);
  };

  const handleGuardarGps = async () => {
    if (!ventaParaGps) return;
    setActualizandoGps(true);
    try {
      const entregaId = ventaParaGps.entrega_id || ventaParaGps.id;
      await actualizarUbicacionEntrega(
        entregaId,
        parseFloat(latInput),
        parseFloat(lonInput)
      );
      setAlert({
        type: 'ok',
        message: `Ubicación GPS de envío para Reserva #${ventaParaGps.id} transmitida con éxito.`,
      });
      setModalGpsVisible(false);
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Error al transmitir ubicación GPS.' });
    } finally {
      setActualizandoGps(false);
    }
  };

  const ventasFiltradas = ventas.filter((v) => {
    if (filtro === 'Todas') return true;
    return (v.estado || '').toLowerCase() === filtro.toLowerCase();
  });

  const getBadgeVariant = (estado: string) => {
    const est = (estado || '').toLowerCase();
    if (est === 'entregada' || est === 'confirmada') return 'success';
    if (est === 'en tránsito' || est === 'en preparación') return 'info';
    if (est === 'pendiente') return 'warning';
    return 'default';
  };

  const renderVenta = ({ item }: { item: any }) => {
    const est = (item.estado || '').toLowerCase();
    const total = parseFloat(item.precio_total || item.total || 0);

    return (
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardId}>Orden #{item.id}</Text>
            <Text style={styles.cultivoSub}>
              {item.lote?.cultivo || item.cultivo || 'Cosecha'} • {item.cantidad || item.cantidad_kg} kg
            </Text>
          </View>
          <Badge text={item.estado || 'Pendiente'} variant={getBadgeVariant(item.estado)} />
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>👤 Comprador:</Text>
          <Text style={styles.infoVal}>
            {item.comprador_nombre || item.comprador?.nombre || 'Cliente AgroDirecto'}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>💰 Total Venta:</Text>
          <Text style={[styles.infoVal, { color: colors.primaryDark, fontWeight: '700' }]}>
            ${total.toLocaleString()} COP
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>🔑 Código Entrega:</Text>
          <Text style={styles.codeText}>AGRO-{String(item.id).padStart(5, '0')}</Text>
        </View>

        {/* Botones de acción según el estado */}
        <View style={styles.actionsBar}>
          {est === 'pendiente' && (
            <Button
              title="✓ Confirmar Pedido"
              variant="primary"
              size="small"
              onPress={() => handleCambiarEstado(item.id, 'Confirmada')}
            />
          )}

          {est === 'confirmada' && (
            <Button
              title="🚚 Marcar en Tránsito"
              variant="primary"
              size="small"
              onPress={() => handleCambiarEstado(item.id, 'En tránsito')}
            />
          )}

          {est === 'en tránsito' && (
            <>
              <Button
                title="📍 Actualizar GPS"
                variant="outline"
                size="small"
                onPress={() => abrirModalGps(item)}
              />
              <Button
                title="✓ Finalizar Entrega"
                variant="primary"
                size="small"
                onPress={() => handleCambiarEstado(item.id, 'Entregada')}
              />
            </>
          )}

          <Button
            title="Detalle"
            variant="outline"
            size="small"
            onPress={() => navigation.navigate('TrazabilidadTab', { loteId: item.lote_id })}
          />
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="💰 Ventas y Despacho"
        subtitle="Control de órdenes recibidas y logística de envío"
        showBack={navigation.canGoBack()}
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

        {/* Filtros */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
          {ESTADOS_VENTA.map((est) => {
            const active = filtro === est;
            return (
              <TouchableOpacity
                key={est}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setFiltro(est)}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {est}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loaderText}>Cargando ventas...</Text>
          </View>
        ) : (
          <FlatList
            data={ventasFiltradas}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderVenta}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
            }
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>💰</Text>
                <Text style={styles.emptyTitle}>No hay pedidos en esta sección</Text>
                <Text style={styles.emptySubtitle}>
                  {filtro !== 'Todas'
                    ? `No tienes órdenes con estado "${filtro}".`
                    : 'Aún no has recibido pedidos sobre tus cosechas.'}
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* Modal GPS */}
      <Modal visible={modalGpsVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>📍 Actualizar GPS de Despacho</Text>
            <Text style={styles.modalSub}>
              Transmite las coordenadas de la ruta para que el comprador pueda rastrearla.
            </Text>

            <InputField
              label="Latitud"
              value={latInput}
              onChangeText={setLatInput}
              keyboardType="numeric"
            />

            <InputField
              label="Longitud"
              value={lonInput}
              onChangeText={setLonInput}
              keyboardType="numeric"
            />

            <View style={styles.modalButtons}>
              <Button
                title="Cancelar"
                variant="outline"
                onPress={() => setModalGpsVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Transmitir GPS"
                variant="primary"
                loading={actualizandoGps}
                onPress={handleGuardarGps}
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  filtersScroll: {
    maxHeight: 38,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
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
  listContent: {
    paddingBottom: 24,
  },
  card: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardId: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cultivoSub: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  infoKey: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  infoVal: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  codeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
    letterSpacing: 1,
  },
  actionsBar: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
});
