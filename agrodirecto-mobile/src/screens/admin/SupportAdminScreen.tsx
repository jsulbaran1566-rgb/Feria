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
  Alert,
} from 'react-native';
import colors from '../../theme/colors';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Header from '../../components/common/Header';
import Button from '../../components/common/Button';
import InputField from '../../components/common/InputField';
import AlertBanner from '../../components/common/AlertBanner';
import {
  obtenerTicketsSoporte,
  actualizarEstadoSoporte,
  eliminarTicketSoporte,
} from '../../services/api';

const ESTADOS_SOPORTE = ['Todos', 'Abierto', 'En proceso', 'Resuelto', 'Cerrado'];

export default function SupportAdminScreen({ navigation }: any) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtro, setFiltro] = useState('Todos');
  const [alert, setAlert] = useState<{ type: string; message: string } | null>(null);

  // Modal Atender Ticket
  const [modalVisible, setModalVisible] = useState(false);
  const [ticketSeleccionado, setTicketSeleccionado] = useState<any | null>(null);
  const [nuevoEstado, setNuevoEstado] = useState('Resuelto');
  const [respuesta, setRespuesta] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargarTickets = useCallback(async () => {
    try {
      const data = await obtenerTicketsSoporte();
      const lista = Array.isArray(data) ? data : (data as any)?.tickets || [];
      setTickets(lista);
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.message || 'Error al cargar tickets de soporte.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    cargarTickets();
  }, [cargarTickets]);

  const onRefresh = () => {
    setRefreshing(true);
    cargarTickets();
  };

  const abrirModalAtender = (ticket: any) => {
    setTicketSeleccionado(ticket);
    setNuevoEstado(ticket.estado || 'Resuelto');
    setRespuesta('');
    setModalVisible(true);
  };

  const handleGuardarEstado = async () => {
    if (!ticketSeleccionado?.id) return;
    setGuardando(true);
    try {
      await actualizarEstadoSoporte(ticketSeleccionado.id, nuevoEstado);
      setAlert({
        type: 'ok',
        message: `Ticket #${ticketSeleccionado.id} actualizado a "${nuevoEstado}".`,
      });
      setModalVisible(false);
      cargarTickets();
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Error al actualizar ticket.' });
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = (ticket: any) => {
    Alert.alert(
      'Eliminar Ticket',
      `¿Deseas descartar el ticket #${ticket.id}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await eliminarTicketSoporte(ticket.id);
              setAlert({ type: 'ok', message: `Ticket #${ticket.id} eliminado.` });
              cargarTickets();
            } catch (err: any) {
              setAlert({ type: 'error', message: err.message || 'Error al eliminar ticket.' });
            }
          },
        },
      ]
    );
  };

  const ticketsFiltrados = tickets.filter((t) => {
    if (filtro === 'Todos') return true;
    return (t.estado || '').toLowerCase() === filtro.toLowerCase();
  });

  const getBadgeVariant = (estado: string) => {
    const est = (estado || '').toLowerCase();
    if (est === 'abierto') return 'warning';
    if (est === 'en proceso') return 'info';
    if (est === 'resuelto') return 'success';
    return 'secondary';
  };

  const renderTicket = ({ item }: { item: any }) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.ticketAsunto}>
            {item.asunto || item.motivo || `Ticket #${item.id}`}
          </Text>
          <Text style={styles.ticketUser}>
            De: {item.nombre || item.usuario?.nombre || 'Usuario'} ({item.correo || item.email || 'Sin correo'})
          </Text>
        </View>
        <Badge text={item.estado || 'Abierto'} variant={getBadgeVariant(item.estado)} />
      </View>

      <Text style={styles.mensajeText}>
        {item.mensaje || item.descripcion || 'Sin mensaje especificado.'}
      </Text>

      <View style={styles.footerRow}>
        <Text style={styles.fechaText}>
          {item.fecha ? new Date(item.fecha).toLocaleString('es-CO') : ''}
        </Text>
        <View style={styles.btnRow}>
          <Button
            title="Responder / Gestionar"
            variant="outline"
            size="small"
            onPress={() => abrirModalAtender(item)}
          />
          <Button
            title="🗑️"
            variant="danger"
            size="small"
            onPress={() => handleEliminar(item)}
          />
        </View>
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Header
        title="📨 Tickets de Soporte"
        subtitle="Atención de consultas, incidencias y reclamos técnicos"
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

        {/* Filtros */}
        <View style={styles.filterRow}>
          {ESTADOS_SOPORTE.map((est) => {
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
        </View>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loaderText}>Cargando tickets de soporte...</Text>
          </View>
        ) : (
          <FlatList
            data={ticketsFiltrados}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderTicket}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
            }
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🎉</Text>
                <Text style={styles.emptyTitle}>Bandeja al día</Text>
                <Text style={styles.emptySubtitle}>
                  No hay tickets de soporte pendientes con este estado.
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* Modal Atender */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Gestionar Ticket #{ticketSeleccionado?.id}</Text>
            <Text style={styles.modalSub}>
              {ticketSeleccionado?.asunto} • {ticketSeleccionado?.correo}
            </Text>

            <Text style={styles.labelState}>Actualizar Estado:</Text>
            <View style={styles.statesWrap}>
              {['Abierto', 'En proceso', 'Resuelto', 'Cerrado'].map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[
                    styles.stateBtn,
                    nuevoEstado === st && styles.stateBtnActive,
                  ]}
                  onPress={() => setNuevoEstado(st)}
                >
                  <Text
                    style={[
                      styles.stateBtnText,
                      nuevoEstado === st && styles.stateBtnTextActive,
                    ]}
                  >
                    {st}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <InputField
              label="Respuesta / Observación de Soporte"
              value={respuesta}
              onChangeText={setRespuesta}
              placeholder="Escribe la solución brindada al usuario..."
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <Button
                title="Cancelar"
                variant="outline"
                onPress={() => setModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Guardar Estado"
                variant="primary"
                loading={guardando}
                onPress={handleGuardarEstado}
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
  filterRow: {
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
    color: '#fff',
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
    marginBottom: 8,
  },
  ticketAsunto: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  ticketUser: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  mensajeText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginVertical: 4,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  fechaText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 6,
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
  labelState: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  statesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  stateBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stateBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stateBtnText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  stateBtnTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
});
