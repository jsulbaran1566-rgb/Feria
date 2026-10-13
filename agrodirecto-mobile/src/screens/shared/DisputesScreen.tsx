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
import StatCard from '../../components/common/StatCard';
import AlertBanner from '../../components/common/AlertBanner';
import { useAuth } from '../../context/AuthContext';
import {
  obtenerDisputas,
  actualizarDisputa,
  crearDisputa,
} from '../../services/api';

const ESTADOS_DISPUTA = ['Todos', 'Abierta', 'En revisión', 'Resuelta', 'Cerrada'];

export default function DisputesScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const esAdmin = user?.rol === 'Administrador';

  const [disputas, setDisputas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<string>('Todos');
  const [alert, setAlert] = useState<{ type: string; message: string } | null>(null);

  // Modal Resolver Disputa (Admin)
  const [modalResolverVisible, setModalResolverVisible] = useState(false);
  const [disputaSeleccionada, setDisputaSeleccionada] = useState<any | null>(null);
  const [nuevoEstado, setNuevoEstado] = useState('Resuelta');
  const [resolucionTexto, setResolucionTexto] = useState('');
  const [savingResolucion, setSavingResolucion] = useState(false);

  // Modal Nueva Disputa (Comprador)
  const [modalNuevaVisible, setModalNuevaVisible] = useState(false);
  const [reservaIdInput, setReservaIdInput] = useState(
    route?.params?.reservaId ? String(route.params.reservaId) : ''
  );
  const [motivoInput, setMotivoInput] = useState('');
  const [descripcionInput, setDescripcionInput] = useState('');
  const [creandoDisputa, setCreandoDisputa] = useState(false);

  const cargarDisputas = useCallback(async () => {
    try {
      const data: any = await obtenerDisputas();
      const lista = Array.isArray(data) ? data : data?.disputas || [];
      setDisputas(lista);
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.message || 'Error al cargar el listado de disputas.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    cargarDisputas();
  }, [cargarDisputas]);

  const onRefresh = () => {
    setRefreshing(true);
    cargarDisputas();
  };

  // Filtrado
  const disputasFiltradas = disputas.filter((d) => {
    if (filtroEstado !== 'Todos') {
      if ((d.estado || '').toLowerCase() !== filtroEstado.toLowerCase()) return false;
    }
    // Si no es admin, filtramos por sus reservas si viene d.comprador_id o d.usuario_id
    if (!esAdmin && user?.id) {
      if (d.comprador_id && d.comprador_id !== user.id) return false;
    }
    return true;
  });

  // Métricas
  const totalCount = disputas.length;
  const abiertasCount = disputas.filter(
    (d) => (d.estado || '').toLowerCase() === 'abierta'
  ).length;
  const revisionCount = disputas.filter(
    (d) => (d.estado || '').toLowerCase() === 'en revisión'
  ).length;
  const resueltasCount = disputas.filter(
    (d) =>
      (d.estado || '').toLowerCase() === 'resuelta' ||
      (d.estado || '').toLowerCase() === 'cerrada'
  ).length;

  const abrirModalResolver = (item: any) => {
    setDisputaSeleccionada(item);
    setNuevoEstado(item.estado || 'Resuelta');
    setResolucionTexto(item.resolucion || '');
    setModalResolverVisible(true);
  };

  const handleGuardarResolucion = async () => {
    if (!disputaSeleccionada?.id) return;
    setSavingResolucion(true);
    try {
      await actualizarDisputa(disputaSeleccionada.id, {
        estado: nuevoEstado,
        resolucion: resolucionTexto.trim(),
      });
      setAlert({ type: 'ok', message: `Disputa #${disputaSeleccionada.id} actualizada con éxito.` });
      setModalResolverVisible(false);
      cargarDisputas();
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Error al resolver disputa.' });
    } finally {
      setSavingResolucion(false);
    }
  };

  const handleCrearDisputa = async () => {
    if (!reservaIdInput || !descripcionInput.trim()) {
      setAlert({ type: 'error', message: 'Por favor completa el ID de reserva y la descripción del reclamo.' });
      return;
    }
    setCreandoDisputa(true);
    try {
      await crearDisputa({
        reserva_id: parseInt(reservaIdInput, 10),
        motivo: motivoInput.trim() || 'Incumplimiento de entrega / calidad',
        descripcion: descripcionInput.trim(),
      });
      setAlert({ type: 'ok', message: 'Disputa abierta correctamente. Nuestro equipo de soporte la revisará.' });
      setModalNuevaVisible(false);
      setMotivoInput('');
      setDescripcionInput('');
      cargarDisputas();
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Error al abrir la disputa.' });
    } finally {
      setCreandoDisputa(false);
    }
  };

  const getBadgeVariant = (estado: string) => {
    const est = (estado || '').toLowerCase();
    if (est === 'abierta') return 'warning';
    if (est === 'en revisión') return 'info';
    if (est === 'resuelta') return 'success';
    if (est === 'cerrada') return 'secondary';
    return 'default';
  };

  const renderDisputa = ({ item }: { item: any }) => (
    <Card style={styles.disputaCard}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.disputaId}>Disputa #{item.id}</Text>
          <Text style={styles.reservaRef}>Reserva #{item.reserva_id || item.reserva?.id || '—'}</Text>
        </View>
        <Badge text={item.estado || 'Abierta'} variant={getBadgeVariant(item.estado)} />
      </View>

      <Text style={styles.motivoText}>
        {item.motivo ? `📌 ${item.motivo}` : 'Reclamo sobre reserva'}
      </Text>
      <Text style={styles.descText}>{item.descripcion || 'Sin descripción'}</Text>

      {item.resolucion && (
        <View style={styles.resolucionBox}>
          <Text style={styles.resolucionLabel}>⚖️ Dictamen / Resolución:</Text>
          <Text style={styles.resolucionText}>{item.resolucion}</Text>
        </View>
      )}

      <View style={styles.cardFooter}>
        <Text style={styles.dateText}>
          {item.fecha_creacion ? new Date(item.fecha_creacion).toLocaleDateString('es-CO') : ''}
        </Text>
        {esAdmin && (
          <Button
            title="Resolver / Gestionar"
            variant="outline"
            size="small"
            onPress={() => abrirModalResolver(item)}
          />
        )}
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Header
        title="⚖️ Disputas y Reclamos"
        subtitle={
          esAdmin
            ? 'Panel de mediación y resolución de reclamos (RF-25)'
            : 'Historial y estado de tus reclamos'
        }
        showBack
        onBack={() => navigation?.goBack()}
        rightAction={
          !esAdmin
            ? {
                label: '+ Abrir Reclamo',
                onPress: () => setModalNuevaVisible(true),
              }
            : undefined
        }
      />

      <View style={styles.content}>
        {alert && (
          <AlertBanner
            type={alert.type as any}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard title="Total" value={totalCount} icon="⚖️" variant="default" />
          <StatCard title="Abiertas" value={abiertasCount} icon="🕓" variant="warning" />
          <StatCard title="Revisión" value={revisionCount} icon="🔄" variant="info" />
          <StatCard title="Resueltas" value={resueltasCount} icon="✅" variant="success" />
        </View>

        {/* Filtros */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
          {ESTADOS_DISPUTA.map((est) => {
            const active = filtroEstado === est;
            return (
              <TouchableOpacity
                key={est}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setFiltroEstado(est)}
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
            <Text style={styles.loaderText}>Cargando disputas...</Text>
          </View>
        ) : (
          <FlatList
            data={disputasFiltradas}
            keyExtractor={(item, index) => String(item.id || index)}
            renderItem={renderDisputa}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
            }
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🎉</Text>
                <Text style={styles.emptyTitle}>No hay disputas en esta sección</Text>
                <Text style={styles.emptySubtitle}>
                  {filtroEstado !== 'Todos'
                    ? `No se encontraron disputas con estado "${filtroEstado}".`
                    : 'Todo se encuentra en orden sin reclamos pendientes.'}
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* Modal Resolver (Admin) */}
      <Modal visible={modalResolverVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Resolver Disputa #{disputaSeleccionada?.id}
            </Text>
            <Text style={styles.modalSub}>
              Reserva #{disputaSeleccionada?.reserva_id} • Comprador vs Productor
            </Text>

            <Text style={styles.fieldLabel}>Estado de la Disputa</Text>
            <View style={styles.stateSelector}>
              {['Abierta', 'En revisión', 'Resuelta', 'Cerrada'].map((est) => (
                <TouchableOpacity
                  key={est}
                  style={[
                    styles.stateBtn,
                    nuevoEstado === est && styles.stateBtnActive,
                  ]}
                  onPress={() => setNuevoEstado(est)}
                >
                  <Text
                    style={[
                      styles.stateBtnText,
                      nuevoEstado === est && styles.stateBtnTextActive,
                    ]}
                  >
                    {est}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <InputField
              label="Resolución / Explicación del fallo"
              value={resolucionTexto}
              onChangeText={setResolucionTexto}
              placeholder="Detalla el veredicto, si aplica reembolso al comprador o liberación de fondos..."
              multiline
              numberOfLines={4}
            />

            <View style={styles.modalButtons}>
              <Button
                title="Cancelar"
                variant="outline"
                onPress={() => setModalResolverVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Guardar Dictamen"
                variant="primary"
                loading={savingResolucion}
                onPress={handleGuardarResolucion}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Nueva Disputa (Comprador) */}
      <Modal visible={modalNuevaVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>⚖️ Abrir Nueva Disputa</Text>
            <Text style={styles.modalSub}>
              Explica el motivo del reclamo para que el equipo de soporte medie.
            </Text>

            <InputField
              label="ID de Reserva"
              value={reservaIdInput}
              onChangeText={setReservaIdInput}
              placeholder="Ej: 14"
              keyboardType="numeric"
            />

            <InputField
              label="Motivo del Reclamo"
              value={motivoInput}
              onChangeText={setMotivoInput}
              placeholder="Ej: Producto en mal estado, no entregado, etc."
            />

            <InputField
              label="Descripción Detallada"
              value={descripcionInput}
              onChangeText={setDescripcionInput}
              placeholder="Describe lo ocurrido con fecha, evidencias o acuerdos no cumplidos..."
              multiline
              numberOfLines={4}
            />

            <View style={styles.modalButtons}>
              <Button
                title="Cancelar"
                variant="outline"
                onPress={() => setModalNuevaVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Enviar Reclamo"
                variant="danger"
                loading={creandoDisputa}
                onPress={handleCrearDisputa}
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
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  filtersScroll: {
    maxHeight: 40,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
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
  listContainer: {
    paddingBottom: 24,
  },
  disputaCard: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  disputaId: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  reservaRef: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  motivoText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  descText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  resolucionBox: {
    backgroundColor: '#eff8f2',
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  resolucionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: 2,
  },
  resolucionText: {
    fontSize: 12,
    color: colors.textPrimary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dateText: {
    fontSize: 12,
    color: colors.textMuted,
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
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  stateSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
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
    marginTop: 16,
  },
});
