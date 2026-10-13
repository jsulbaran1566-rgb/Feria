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
  obtenerLotes,
  obtenerCategorias,
  crearReserva,
} from '../../services/api';

export default function ExploreLotsScreen({ navigation }: any) {
  const { user } = useAuth();

  const [lotes, setLotes] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');
  const [alert, setAlert] = useState<{ type: string; message: string } | null>(null);

  // Modal de Reserva
  const [modalReservaVisible, setModalReservaVisible] = useState(false);
  const [loteParaReservar, setLoteParaReservar] = useState<any | null>(null);
  const [cantidadKg, setCantidadKg] = useState('');
  const [reservando, setReservando] = useState(false);

  const cargarDatos = useCallback(async () => {
    try {
      const [dataLotes, dataCats] = await Promise.allSettled([
        obtenerLotes(),
        obtenerCategorias(),
      ]);

      if (dataLotes.status === 'fulfilled') {
        const lista = Array.isArray(dataLotes.value)
          ? dataLotes.value
          : (dataLotes.value as any)?.lotes || [];
        setLotes(lista);
      }

      if (dataCats.status === 'fulfilled') {
        const listaCat = Array.isArray(dataCats.value)
          ? dataCats.value
          : (dataCats.value as any)?.categorias || [];
        setCategorias(listaCat);
      }
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.message || 'Error al cargar catálogo de productos.',
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

  // Filtrado de lotes
  const lotesFiltrados = lotes.filter((lote) => {
    // Si el lote no está activo o disponible, ignorar
    const estadoCultivo = (lote.estado_cultivo || '').toLowerCase();
    if (estadoCultivo === 'cosechado' && lote.cantidad_disponible <= 0) return false;

    if (categoriaSeleccionada) {
      const catLote = (lote.categoria || lote.categoria_nombre || '').toLowerCase();
      if (catLote !== categoriaSeleccionada.toLowerCase()) return false;
    }

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      const matchCultivo = (lote.cultivo || '').toLowerCase().includes(q);
      const matchVariedad = (lote.variedad || '').toLowerCase().includes(q);
      const matchProductor = (lote.productor_nombre || lote.usuario?.nombre || '')
        .toLowerCase()
        .includes(q);
      const matchCiudad = (lote.ciudad || lote.ubicacion || '').toLowerCase().includes(q);
      if (!matchCultivo && !matchVariedad && !matchProductor && !matchCiudad) return false;
    }

    return true;
  });

  const abrirModalReserva = (lote: any) => {
    setLoteParaReservar(lote);
    setCantidadKg('10');
    setModalReservaVisible(true);
  };

  const handleConfirmarReserva = async () => {
    if (!loteParaReservar) return;
    const kg = parseFloat(cantidadKg);
    const maxKg = loteParaReservar.cantidad_disponible ?? loteParaReservar.cantidad_total ?? 1000;

    if (isNaN(kg) || kg <= 0) {
      setAlert({ type: 'error', message: 'Por favor ingresa una cantidad válida en kg.' });
      return;
    }

    if (kg > maxKg) {
      setAlert({
        type: 'error',
        message: `La cantidad solicitada (${kg} kg) supera el stock disponible (${maxKg} kg).`,
      });
      return;
    }

    setReservando(true);
    try {
      const precioKg = parseFloat(loteParaReservar.precio_por_kilo || loteParaReservar.precio_kg || 0);
      const subtotal = kg * precioKg;

      await crearReserva({
        lote_id: loteParaReservar.id,
        comprador_id: user?.id,
        cantidad: kg,
        precio_total: subtotal,
      });

      setAlert({
        type: 'ok',
        message: `¡Reserva de ${kg} kg de ${loteParaReservar.cultivo} creada con éxito!`,
      });
      setModalReservaVisible(false);
      cargarDatos();
      navigation.navigate('ReservasTab');
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Error al procesar la reserva.' });
    } finally {
      setReservando(false);
    }
  };

  // Cálculos dinámicos en el modal de reserva
  const kgNumber = parseFloat(cantidadKg) || 0;
  const precioUnitario = loteParaReservar
    ? parseFloat(loteParaReservar.precio_por_kilo || loteParaReservar.precio_kg || 0)
    : 0;
  const totalCalculado = kgNumber * precioUnitario;
  const anticipoRequerido = totalCalculado * 0.3; // 30% anticipo

  const renderLote = ({ item }: { item: any }) => {
    const disp = item.cantidad_disponible ?? item.cantidad_total ?? 0;
    const total = item.cantidad_total ?? disp ?? 1;
    const pctDisponible = Math.min(100, Math.max(0, Math.round((disp / total) * 100)));

    return (
      <Card style={styles.loteCard}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cultivoTitulo}>{item.cultivo}</Text>
            {item.variedad && <Text style={styles.variedadSub}>Variedad: {item.variedad}</Text>}
          </View>
          <Badge
            text={item.categoria || item.categoria_nombre || 'General'}
            variant="secondary"
          />
        </View>

        <TouchableOpacity
          style={styles.productorRow}
          onPress={() => {
            const prodId = item.productor_id || item.usuario_id;
            if (prodId) {
              navigation.navigate('PerfilPublico', { productorId: prodId });
            }
          }}
        >
          <Text style={styles.productorLabel}>👨‍🌾 Productor:</Text>
          <Text style={styles.productorNombre}>
            {item.productor_nombre || item.usuario?.nombre || 'Productor Verificado'} →
          </Text>
        </TouchableOpacity>

        <View style={styles.infoGrid}>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Ubicación</Text>
            <Text style={styles.infoValue}>
              📍 {item.ciudad || item.ubicacion || 'Colombia'}
            </Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Cosecha Estimada</Text>
            <Text style={styles.infoValue}>
              📅 {item.fecha_cosecha_estimada || 'En ciclo'}
            </Text>
          </View>
        </View>

        {/* Barra de Disponibilidad */}
        <View style={styles.disponibilidadContainer}>
          <View style={styles.dispHeader}>
            <Text style={styles.dispText}>
              Disponible: <Text style={{ fontWeight: '700' }}>{disp} kg</Text> de {total} kg
            </Text>
            <Text style={styles.dispPct}>{pctDisponible}%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${pctDisponible}%` }]} />
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.precioLabel}>Precio por Kilo</Text>
            <Text style={styles.precioValor}>
              ${parseFloat(item.precio_por_kilo || item.precio_kg || 0).toLocaleString()} COP
            </Text>
          </View>

          <Button
            title="Reservar Lote"
            variant="primary"
            size="small"
            onPress={() => abrirModalReserva(item)}
            disabled={disp <= 0}
          />
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="🔍 Catálogo de Lotes"
        subtitle="Productos agrícolas directos de la finca a tu mesa"
        showBack={navigation.canGoBack()}
        onBack={() => navigation.goBack()}
        rightAction={{
          label: '🔔',
          onPress: () => navigation.navigate('Notificaciones'),
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

        {/* Buscador */}
        <InputField
          label=""
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="🔍 Buscar por cultivo, productor o municipio..."
        />

        {/* Filtro por Categorías */}
        <View style={styles.categoriesSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[
                styles.catChip,
                categoriaSeleccionada === '' && styles.catChipActive,
              ]}
              onPress={() => setCategoriaSeleccionada('')}
            >
              <Text
                style={[
                  styles.catChipText,
                  categoriaSeleccionada === '' && styles.catChipTextActive,
                ]}
              >
                Todas
              </Text>
            </TouchableOpacity>

            {categorias.map((cat: any) => {
              const nombre = cat.nombre || cat;
              const active = categoriaSeleccionada.toLowerCase() === nombre.toLowerCase();
              return (
                <TouchableOpacity
                  key={String(cat.id || nombre)}
                  style={[styles.catChip, active && styles.catChipActive]}
                  onPress={() => setCategoriaSeleccionada(active ? '' : nombre)}
                >
                  <Text
                    style={[
                      styles.catChipText,
                      active && styles.catChipTextActive,
                    ]}
                  >
                    {cat.icono || '🌱'} {nombre}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loaderText}>Cargando catálogo...</Text>
          </View>
        ) : (
          <FlatList
            data={lotesFiltrados}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderLote}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
            }
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🌾</Text>
                <Text style={styles.emptyTitle}>No se encontraron lotes</Text>
                <Text style={styles.emptySubtitle}>
                  Prueba modificando tus términos de búsqueda o seleccionando otra categoría.
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* Modal de Confirmación de Reserva */}
      <Modal visible={modalReservaVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>📦 Reservar Cosecha</Text>
            <Text style={styles.modalSub}>
              {loteParaReservar?.cultivo} • {loteParaReservar?.variedad || 'Variedad estándar'}
            </Text>

            <View style={styles.modalPriceHighlight}>
              <Text style={styles.highlightText}>
                Precio: ${precioUnitario.toLocaleString()} COP / kg
              </Text>
              <Text style={styles.highlightStock}>
                Disponible: {loteParaReservar?.cantidad_disponible ?? loteParaReservar?.cantidad_total ?? 0} kg
              </Text>
            </View>

            <InputField
              label="Cantidad a Reservar (kg)"
              value={cantidadKg}
              onChangeText={setCantidadKg}
              placeholder="Ej: 50"
              keyboardType="numeric"
            />

            {/* Resumen de costos */}
            <View style={styles.costSummary}>
              <View style={styles.costRow}>
                <Text style={styles.costLabel}>Subtotal cosecha:</Text>
                <Text style={styles.costVal}>${totalCalculado.toLocaleString()} COP</Text>
              </View>
              <View style={styles.costRow}>
                <Text style={styles.costLabel}>Anticipo requerido (30%):</Text>
                <Text style={[styles.costVal, { color: colors.primary, fontWeight: '700' }]}>
                  ${anticipoRequerido.toLocaleString()} COP
                </Text>
              </View>
              <Text style={styles.anticipoNote}>
                * El 70% restante se cancela al momento del despacho/entrega.
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <Button
                title="Cancelar"
                variant="outline"
                onPress={() => setModalReservaVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Confirmar Reserva"
                variant="primary"
                loading={reservando}
                onPress={handleConfirmarReserva}
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
  categoriesSection: {
    marginBottom: 12,
    maxHeight: 38,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  catChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  catChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  catChipTextActive: {
    color: '#ffffff',
  },
  listContent: {
    paddingBottom: 24,
  },
  loteCard: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  cultivoTitulo: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  variedadSub: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  productorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  productorLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  productorNombre: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceMuted,
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  disponibilidadContainer: {
    marginBottom: 12,
  },
  dispHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  dispText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  dispPct: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  precioLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  precioValor: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryDark,
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
  modalPriceHighlight: {
    backgroundColor: '#eff8f2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  highlightText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  highlightStock: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  costSummary: {
    backgroundColor: colors.surfaceMuted,
    padding: 12,
    borderRadius: 8,
    marginVertical: 12,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  costLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  costVal: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  anticipoNote: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 6,
    fontStyle: 'italic',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
});
