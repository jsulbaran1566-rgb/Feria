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
  actualizarEntrega,
  crearCalificacion,
} from '../../services/api';

export default function DeliveriesScreen({ navigation }: any) {
  const { user } = useAuth();
  const [entregas, setEntregas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alert, setAlert] = useState<{ type: string; message: string } | null>(null);

  // Modal Calificar
  const [modalCalificarVisible, setModalCalificarVisible] = useState(false);
  const [entregaSeleccionada, setEntregaSeleccionada] = useState<any | null>(null);
  const [puntuacion, setPuntuacion] = useState(5);
  const [comentario, setComentario] = useState('');
  const [enviandoCalificacion, setEnviandoCalificacion] = useState(false);

  // Modal Confirmar Recepción
  const [confirmandoId, setConfirmandoId] = useState<number | null>(null);

  const cargarEntregas = useCallback(async () => {
    try {
      // En AgroDirecto las entregas están vinculadas a reservas
      const data = await obtenerReservas({ comprador_id: user?.id });
      const lista = Array.isArray(data) ? data : (data as any)?.reservas || [];

      // Filtramos las que ya están confirmadas, en tránsito o entregadas
      const conEnvio = lista.filter(
        (r) =>
          (r.estado || '').toLowerCase() === 'confirmada' ||
          (r.estado || '').toLowerCase() === 'en preparación' ||
          (r.estado || '').toLowerCase() === 'en tránsito' ||
          (r.estado || '').toLowerCase() === 'entregada'
      );
      setEntregas(conEnvio);
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.message || 'Error al cargar entregas.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    cargarEntregas();
  }, [cargarEntregas]);

  const onRefresh = () => {
    setRefreshing(true);
    cargarEntregas();
  };

  const handleConfirmarRecepcion = async (entrega: any) => {
    setConfirmandoId(entrega.id);
    try {
      if (entrega.entrega_id) {
        await actualizarEntrega(entrega.entrega_id, { estado: 'Entregada' });
      }
      setAlert({
        type: 'ok',
        message: `¡Entrega de Reserva #${entrega.id} confirmada con éxito! Ahora puedes calificar al productor.`,
      });
      abrirModalCalificar(entrega);
      cargarEntregas();
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Error al confirmar la recepción.' });
    } finally {
      setConfirmandoId(null);
    }
  };

  const abrirModalCalificar = (entrega: any) => {
    setEntregaSeleccionada(entrega);
    setPuntuacion(5);
    setComentario('');
    setModalCalificarVisible(true);
  };

  const handleEnviarCalificacion = async () => {
    if (!entregaSeleccionada) return;
    const productorId =
      entregaSeleccionada.productor_id ||
      entregaSeleccionada.lote?.productor_id ||
      entregaSeleccionada.lote?.usuario_id;

    if (!productorId) {
      setAlert({ type: 'error', message: 'No se encontró el ID del productor para calificar.' });
      setModalCalificarVisible(false);
      return;
    }

    setEnviandoCalificacion(true);
    try {
      await crearCalificacion({
        productor_id: productorId,
        comprador_id: user?.id,
        puntuacion,
        comentario: comentario.trim() || 'Excelente producto y puntualidad en la entrega.',
      });
      setAlert({ type: 'ok', message: '¡Calificación enviada con éxito! Gracias por tu opinión.' });
      setModalCalificarVisible(false);
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Error al registrar calificación.' });
    } finally {
      setEnviandoCalificacion(false);
    }
  };

  const renderEntrega = ({ item }: { item: any }) => {
    const estado = (item.estado || '').toLowerCase();
    const esEntregada = estado === 'entregada';
    const esEnTransito = estado === 'en tránsito';

    return (
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardTitle}>Entrega - Reserva #{item.id}</Text>
            <Text style={styles.cultivoSub}>
              {item.lote?.cultivo || item.cultivo || 'Cultivo Agrícola'} • {item.cantidad || item.cantidad_kg} kg
            </Text>
          </View>
          <Badge
            text={item.estado || 'Pendiente'}
            variant={esEntregada ? 'success' : esEnTransito ? 'info' : 'warning'}
          />
        </View>

        {/* Código de entrega seguro */}
        <View style={styles.codeBox}>
          <Text style={styles.codeLabel}>Código de Verificación para Entrega:</Text>
          <Text style={styles.codeValue}>AGRO-{String(item.id).padStart(5, '0')}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>🚚 Transporte / Despacho:</Text>
          <Text style={styles.infoVal}>
            {esEnTransito ? 'En ruta hacia tu destino' : esEntregada ? 'Entregado a conformidad' : 'En alistamiento'}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>📍 Destino:</Text>
          <Text style={styles.infoVal}>{user?.ciudad || 'Dirección registrada en perfil'}</Text>
        </View>

        {/* Acciones */}
        <View style={styles.cardActions}>
          {!esEntregada ? (
            <Button
              title="✓ Confirmar Recepción"
              variant="primary"
              size="small"
              loading={confirmandoId === item.id}
              onPress={() => handleConfirmarRecepcion(item)}
            />
          ) : (
            <Button
              title="⭐ Calificar Productor"
              variant="outline"
              size="small"
              onPress={() => abrirModalCalificar(item)}
            />
          )}

          <Button
            title="⚖️ Abrir Disputa"
            variant="danger"
            size="small"
            onPress={() => navigation.navigate('Disputas', { reservaId: item.id })}
          />
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="🚚 Próximas Entregas"
        subtitle="Monitoreo y confirmación de recepción de cosechas"
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

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loaderText}>Cargando entregas...</Text>
          </View>
        ) : (
          <FlatList
            data={entregas}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderEntrega}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
            }
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🚚</Text>
                <Text style={styles.emptyTitle}>No tienes entregas pendientes</Text>
                <Text style={styles.emptySubtitle}>
                  Cuando reserves lotes y el productor los confirme o despache, aparecerán aquí para su seguimiento.
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* Modal Calificar */}
      <Modal visible={modalCalificarVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>⭐ Calificar Cosecha y Productor</Text>
            <Text style={styles.modalSub}>
              Ayuda a la comunidad compartiendo tu experiencia de compra.
            </Text>

            {/* Selector de estrellas */}
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setPuntuacion(star)}
                  style={styles.starBtn}
                >
                  <Text style={styles.starIcon}>
                    {star <= puntuacion ? '⭐' : '☆'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.puntuacionLabel}>
              {puntuacion} de 5 estrellas ({puntuacion === 5 ? 'Excelente' : puntuacion >= 4 ? 'Muy bueno' : puntuacion >= 3 ? 'Aceptable' : 'Regular'})
            </Text>

            <InputField
              label="Comentario / Opinión"
              value={comentario}
              onChangeText={setComentario}
              placeholder="¿Qué tal la calidad del producto, empaque y tiempo de entrega?"
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <Button
                title="Omitir"
                variant="outline"
                onPress={() => setModalCalificarVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Publicar Calificación"
                variant="primary"
                loading={enviandoCalificacion}
                onPress={handleEnviarCalificacion}
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
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cultivoSub: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  codeBox: {
    backgroundColor: '#eff8f2',
    borderWidth: 1,
    borderColor: '#c3e6cb',
    padding: 10,
    borderRadius: 8,
    marginVertical: 10,
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 11,
    color: colors.primaryDark,
    fontWeight: '600',
    marginBottom: 4,
  },
  codeValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  infoKey: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  infoVal: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 10,
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
  starRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  starBtn: {
    padding: 6,
  },
  starIcon: {
    fontSize: 32,
  },
  puntuacionLabel: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
});
