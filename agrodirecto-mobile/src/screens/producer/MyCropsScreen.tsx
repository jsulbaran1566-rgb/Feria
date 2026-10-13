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
  Alert,
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
  obtenerLotes,
  registrarLote,
  editarLoteApi,
  eliminarLoteApi,
  actualizarEstadoCultivo,
  crearIncidencia,
  obtenerCategorias,
} from '../../services/api';

const ESTADOS_BIOLOGICOS = ['Siembra', 'Crecimiento', 'Floración', 'Cosecha', 'Cosechado'];

export default function MyCropsScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const [lotes, setLotes] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alert, setAlert] = useState<{ type: string; message: string } | null>(null);

  // Modal Lote (Crear / Editar)
  const [modalLoteVisible, setModalLoteVisible] = useState(false);
  const [loteEnEdicion, setLoteEnEdicion] = useState<any | null>(null);
  const [cultivo, setCultivo] = useState('');
  const [variedad, setVariedad] = useState('');
  const [categoria, setCategoria] = useState('');
  const [cantidadTotal, setCantidadTotal] = useState('');
  const [precioKg, setPrecioKg] = useState('');
  const [fechaCosecha, setFechaCosecha] = useState('');
  const [ubicacion, setUbicacion] = useState(user?.ciudad || '');
  const [guardandoLote, setGuardandoLote] = useState(false);

  // Modal Cambiar Estado Biológico
  const [modalEstadoVisible, setModalEstadoVisible] = useState(false);
  const [loteParaEstado, setLoteParaEstado] = useState<any | null>(null);
  const [nuevoEstado, setNuevoEstado] = useState('Floración');
  const [guardandoEstado, setGuardandoEstado] = useState(false);

  // Modal Incidencia
  const [modalIncidenciaVisible, setModalIncidenciaVisible] = useState(false);
  const [loteParaIncidencia, setLoteParaIncidencia] = useState<any | null>(null);
  const [tipoIncidencia, setTipoIncidencia] = useState('Clima');
  const [descIncidencia, setDescIncidencia] = useState('');
  const [guardandoIncidencia, setGuardandoIncidencia] = useState(false);

  const cargarDatos = useCallback(async () => {
    try {
      const [resLotes, resCats] = await Promise.allSettled([
        obtenerLotes({ usuario_id: user?.id }),
        obtenerCategorias(),
      ]);

      if (resLotes.status === 'fulfilled') {
        const dataL = Array.isArray(resLotes.value)
          ? resLotes.value
          : (resLotes.value as any)?.lotes || [];
        const misLotes = dataL.filter(
          (l: any) => !user?.id || l.usuario_id === user.id || l.productor_id === user.id
        );
        setLotes(misLotes.length > 0 ? misLotes : dataL);
      }

      if (resCats.status === 'fulfilled') {
        const dataC = Array.isArray(resCats.value)
          ? resCats.value
          : (resCats.value as any)?.categorias || [];
        setCategorias(dataC);
      }
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.message || 'Error al cargar lotes agrícolas.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    cargarDatos();
    if (route?.params?.openModal) {
      abrirModalCrear();
    }
  }, [cargarDatos, route?.params?.openModal]);

  const onRefresh = () => {
    setRefreshing(true);
    cargarDatos();
  };

  const abrirModalCrear = () => {
    setLoteEnEdicion(null);
    setCultivo('');
    setVariedad('');
    setCategoria(categorias[0]?.nombre || 'Café');
    setCantidadTotal('');
    setPrecioKg('');
    setFechaCosecha('');
    setUbicacion(user?.ciudad || '');
    setModalLoteVisible(true);
  };

  const abrirModalEditar = (lote: any) => {
    setLoteEnEdicion(lote);
    setCultivo(lote.cultivo || '');
    setVariedad(lote.variedad || '');
    setCategoria(lote.categoria || lote.categoria_nombre || '');
    setCantidadTotal(String(lote.cantidad_total || ''));
    setPrecioKg(String(lote.precio_por_kilo || lote.precio_kg || ''));
    setFechaCosecha(lote.fecha_cosecha_estimada || '');
    setUbicacion(lote.ciudad || lote.ubicacion || '');
    setModalLoteVisible(true);
  };

  const handleGuardarLote = async () => {
    if (!cultivo.trim() || !cantidadTotal || !precioKg) {
      setAlert({ type: 'error', message: 'Completa los campos obligatorios: cultivo, cantidad y precio.' });
      return;
    }

    setGuardandoLote(true);
    try {
      const payload: any = {
        cultivo: cultivo.trim(),
        variedad: variedad.trim(),
        categoria: categoria || 'General',
        cantidad_total: parseFloat(cantidadTotal),
        precio_por_kilo: parseFloat(precioKg),
        fecha_cosecha_estimada: fechaCosecha.trim() || new Date().toISOString().split('T')[0],
        ciudad: ubicacion.trim(),
        usuario_id: user?.id,
      };

      if (loteEnEdicion?.id) {
        await editarLoteApi(loteEnEdicion.id, payload);
        setAlert({ type: 'ok', message: `Lote #${loteEnEdicion.id} actualizado exitosamente.` });
      } else {
        await registrarLote(payload);
        setAlert({ type: 'ok', message: `¡Nuevo lote de ${cultivo} registrado!` });
      }

      setModalLoteVisible(false);
      cargarDatos();
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Error al guardar el lote.' });
    } finally {
      setGuardandoLote(false);
    }
  };

  const handleEliminarLote = (loteId: number) => {
    Alert.alert(
      'Eliminar Lote',
      `¿Estás seguro de que deseas eliminar el Lote #${loteId}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await eliminarLoteApi(loteId);
              setAlert({ type: 'ok', message: `Lote #${loteId} eliminado.` });
              cargarDatos();
            } catch (err: any) {
              setAlert({ type: 'error', message: err.message || 'Error al eliminar el lote.' });
            }
          },
        },
      ]
    );
  };

  const abrirModalEstado = (lote: any) => {
    setLoteParaEstado(lote);
    setNuevoEstado(lote.estado_cultivo || 'Floración');
    setModalEstadoVisible(true);
  };

  const handleActualizarEstado = async () => {
    if (!loteParaEstado?.id) return;
    setGuardandoEstado(true);
    try {
      await actualizarEstadoCultivo(loteParaEstado.id, nuevoEstado);
      setAlert({
        type: 'ok',
        message: `Estado de Lote #${loteParaEstado.id} actualizado a "${nuevoEstado}".`,
      });
      setModalEstadoVisible(false);
      cargarDatos();
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Error al actualizar estado biológico.' });
    } finally {
      setGuardandoEstado(false);
    }
  };

  const abrirModalIncidencia = (lote: any) => {
    setLoteParaIncidencia(lote);
    setTipoIncidencia('Clima');
    setDescIncidencia('');
    setModalIncidenciaVisible(true);
  };

  const handleRegistrarIncidencia = async () => {
    if (!loteParaIncidencia?.id || !descIncidencia.trim()) {
      setAlert({ type: 'error', message: 'Ingresa la descripción de la incidencia.' });
      return;
    }

    setGuardandoIncidencia(true);
    try {
      await crearIncidencia({
        lote_id: loteParaIncidencia.id,
        tipo: tipoIncidencia,
        descripcion: descIncidencia.trim(),
      });
      setAlert({
        type: 'ok',
        message: `Incidencia registrada para el Lote #${loteParaIncidencia.id}. Compradores notificados.`,
      });
      setModalIncidenciaVisible(false);
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Error al reportar incidencia.' });
    } finally {
      setGuardandoIncidencia(false);
    }
  };

  const renderLote = ({ item }: { item: any }) => {
    const disp = item.cantidad_disponible ?? item.cantidad_total ?? 0;
    const total = item.cantidad_total ?? disp ?? 1;

    return (
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cultivoTitulo}>{item.cultivo}</Text>
            <Text style={styles.variedadSub}>
              {item.variedad ? `Variedad: ${item.variedad}` : 'Estándar'} • #{item.id}
            </Text>
          </View>
          <Badge
            text={item.estado_cultivo || 'Siembra'}
            variant={
              item.estado_cultivo === 'Cosecha'
                ? 'success'
                : item.estado_cultivo === 'Floración'
                ? 'warning'
                : 'info'
            }
          />
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>⚖️ Cantidad Total:</Text>
          <Text style={styles.infoVal}>{total} kg</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>📦 Stock Disponible:</Text>
          <Text style={[styles.infoVal, { color: colors.primary, fontWeight: '700' }]}>
            {disp} kg
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>💰 Precio / kg:</Text>
          <Text style={styles.infoVal}>
            ${parseFloat(item.precio_por_kilo || item.precio_kg || 0).toLocaleString()} COP
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>📅 Cosecha Estimada:</Text>
          <Text style={styles.infoVal}>{item.fecha_cosecha_estimada || 'Pendiente'}</Text>
        </View>

        {/* Acciones del Lote */}
        <View style={styles.actionsBar}>
          <TouchableOpacity
            style={styles.actionBtnPrimary}
            onPress={() => abrirModalEstado(item)}
          >
            <Text style={styles.actionBtnPrimaryText}>🌱 Fase Biológica</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtnSec}
            onPress={() => abrirModalIncidencia(item)}
          >
            <Text style={styles.actionBtnSecText}>⚠️ Incidencia</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtnSec}
            onPress={() => abrirModalEditar(item)}
          >
            <Text style={styles.actionBtnSecText}>✏️ Editar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtnDanger}
            onPress={() => handleEliminarLote(item.id)}
          >
            <Text style={styles.actionBtnDangerText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="🌱 Mis Cultivos y Lotes"
        subtitle="Administra parcelas, fechas de cosecha y disponibilidad"
        showBack={navigation.canGoBack()}
        onBack={() => navigation.goBack()}
        rightAction={{
          label: '+ Nuevo Lote',
          onPress: abrirModalCrear,
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

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loaderText}>Cargando lotes...</Text>
          </View>
        ) : (
          <FlatList
            data={lotes}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderLote}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
            }
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🌾</Text>
                <Text style={styles.emptyTitle}>No tienes cultivos registrados</Text>
                <Text style={styles.emptySubtitle}>
                  Registra tus parcelas y siembras para que los compradores puedan reservarlas.
                </Text>
                <Button
                  title="+ Registrar Primer Lote"
                  variant="primary"
                  onPress={abrirModalCrear}
                  style={{ marginTop: 14 }}
                />
              </View>
            }
          />
        )}
      </View>

      {/* Modal Crear / Editar Lote */}
      <Modal visible={modalLoteVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {loteEnEdicion ? `Editar Lote #${loteEnEdicion.id}` : '🌱 Registrar Nuevo Lote'}
              </Text>
              <Text style={styles.modalSub}>
                Ingresa los datos agronómicos y el precio por kilo para venta.
              </Text>

              <InputField
                label="Cultivo / Producto *"
                value={cultivo}
                onChangeText={setCultivo}
                placeholder="Ej: Café Especial, Aguacate Hass, Tomate..."
              />

              <InputField
                label="Variedad"
                value={variedad}
                onChangeText={setVariedad}
                placeholder="Ej: Castillo, Lorena, Chonto..."
              />

              <InputField
                label="Cantidad Total (kg) *"
                value={cantidadTotal}
                onChangeText={setCantidadTotal}
                placeholder="Ej: 500"
                keyboardType="numeric"
              />

              <InputField
                label="Precio por Kilo (COP) *"
                value={precioKg}
                onChangeText={setPrecioKg}
                placeholder="Ej: 8500"
                keyboardType="numeric"
              />

              <InputField
                label="Fecha Estimada Cosecha (YYYY-MM-DD)"
                value={fechaCosecha}
                onChangeText={setFechaCosecha}
                placeholder="Ej: 2026-11-30"
              />

              <InputField
                label="Municipio / Ubicación"
                value={ubicacion}
                onChangeText={setUbicacion}
                placeholder="Ej: Fredonia, Antioquia"
              />

              <View style={styles.modalButtons}>
                <Button
                  title="Cancelar"
                  variant="outline"
                  onPress={() => setModalLoteVisible(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  title={loteEnEdicion ? 'Actualizar' : 'Guardar Lote'}
                  variant="primary"
                  loading={guardandoLote}
                  onPress={handleGuardarLote}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal Cambiar Estado Biológico */}
      <Modal visible={modalEstadoVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🌱 Ciclo Biológico del Cultivo</Text>
            <Text style={styles.modalSub}>
              Lote #{loteParaEstado?.id} • {loteParaEstado?.cultivo}
            </Text>

            <Text style={styles.stateSelectorLabel}>Selecciona la fase fenológica actual:</Text>
            <View style={styles.statesWrap}>
              {ESTADOS_BIOLOGICOS.map((est) => (
                <TouchableOpacity
                  key={est}
                  style={[
                    styles.stateBtn,
                    nuevoEstado.toLowerCase() === est.toLowerCase() && styles.stateBtnActive,
                  ]}
                  onPress={() => setNuevoEstado(est)}
                >
                  <Text
                    style={[
                      styles.stateBtnText,
                      nuevoEstado.toLowerCase() === est.toLowerCase() && styles.stateBtnTextActive,
                    ]}
                  >
                    {est}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <Button
                title="Cancelar"
                variant="outline"
                onPress={() => setModalEstadoVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Guardar Fase"
                variant="primary"
                loading={guardandoEstado}
                onPress={handleActualizarEstado}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Incidencias */}
      <Modal visible={modalIncidenciaVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>⚠️ Reportar Incidencia Agrícola</Text>
            <Text style={styles.modalSub}>
              Lote #{loteParaIncidencia?.id} • Notifica eventos que puedan afectar la cosecha.
            </Text>

            <Text style={styles.stateSelectorLabel}>Tipo de Incidencia:</Text>
            <View style={styles.statesWrap}>
              {['Clima / Helada', 'Plaga / Enfermedad', 'Riego / Sequía', 'Logística'].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.stateBtn, tipoIncidencia === t && styles.stateBtnActive]}
                  onPress={() => setTipoIncidencia(t)}
                >
                  <Text style={[styles.stateBtnText, tipoIncidencia === t && styles.stateBtnTextActive]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <InputField
              label="Descripción de lo ocurrido"
              value={descIncidencia}
              onChangeText={setDescIncidencia}
              placeholder="Explica qué ocurrió, porcentaje estimado de afectación y medidas tomadas..."
              multiline
              numberOfLines={4}
            />

            <View style={styles.modalButtons}>
              <Button
                title="Cancelar"
                variant="outline"
                onPress={() => setModalIncidenciaVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Reportar Incidencia"
                variant="danger"
                loading={guardandoIncidencia}
                onPress={handleRegistrarIncidencia}
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
  cultivoTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  variedadSub: {
    fontSize: 12,
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
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  actionsBar: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionBtnPrimary: {
    backgroundColor: '#eff8f2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  actionBtnPrimaryText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  actionBtnSec: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionBtnSecText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  actionBtnDanger: {
    backgroundColor: '#fde8e8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionBtnDangerText: {
    fontSize: 12,
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
  modalScroll: {
    flexGrow: 1,
    justifyContent: 'center',
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
  stateSelectorLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  statesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  stateBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
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
    marginTop: 14,
  },
});
