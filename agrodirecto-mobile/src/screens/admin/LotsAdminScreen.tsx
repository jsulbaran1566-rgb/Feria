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
  obtenerLotes,
  editarLoteApi,
  eliminarLoteApi,
} from '../../services/api';

export default function LotsAdminScreen({ navigation }: any) {
  const [lotes, setLotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [alert, setAlert] = useState<{ type: string; message: string } | null>(null);

  // Modal Moderación
  const [modalVisible, setModalVisible] = useState(false);
  const [loteEnMod, setLoteEnMod] = useState<any | null>(null);
  const [precioKg, setPrecioKg] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargarLotes = useCallback(async () => {
    try {
      const data = await obtenerLotes();
      const lista = Array.isArray(data) ? data : (data as any)?.lotes || [];
      setLotes(lista);
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.message || 'Error al cargar lotes para moderación.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    cargarLotes();
  }, [cargarLotes]);

  const onRefresh = () => {
    setRefreshing(true);
    cargarLotes();
  };

  const abrirModeracion = (lote: any) => {
    setLoteEnMod(lote);
    setPrecioKg(String(lote.precio_por_kilo || lote.precio_kg || ''));
    setModalVisible(true);
  };

  const handleGuardarModeracion = async () => {
    if (!loteEnMod?.id) return;
    setGuardando(true);
    try {
      await editarLoteApi(loteEnMod.id, {
        precio_por_kilo: parseFloat(precioKg) || loteEnMod.precio_por_kilo,
      });
      setAlert({ type: 'ok', message: `Lote #${loteEnMod.id} moderado correctamente.` });
      setModalVisible(false);
      cargarLotes();
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Error al moderar lote.' });
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarLote = (lote: any) => {
    Alert.alert(
      'Remover Lote',
      `¿Deseas dar de baja el Lote #${lote.id} (${lote.cultivo}) de la plataforma?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              await eliminarLoteApi(lote.id);
              setAlert({ type: 'ok', message: `Lote #${lote.id} removido del catálogo.` });
              cargarLotes();
            } catch (err: any) {
              setAlert({ type: 'error', message: err.message || 'Error al remover lote.' });
            }
          },
        },
      ]
    );
  };

  const lotesFiltrados = lotes.filter((l) => {
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase();
    return (
      (l.cultivo || '').toLowerCase().includes(q) ||
      (l.productor_nombre || l.usuario?.nombre || '').toLowerCase().includes(q) ||
      (l.ciudad || '').toLowerCase().includes(q)
    );
  });

  const renderLote = ({ item }: { item: any }) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cultivoTitulo}>{item.cultivo}</Text>
          <Text style={styles.subText}>
            Lote #{item.id} • Productor: {item.productor_nombre || item.usuario?.nombre || 'Productor'}
          </Text>
        </View>
        <Badge text={item.estado_cultivo || 'Activo'} variant="success" />
      </View>

      <View style={styles.infoGrid}>
        <View style={styles.col}>
          <Text style={styles.label}>Cantidad Total:</Text>
          <Text style={styles.val}>{item.cantidad_total} kg</Text>
        </View>
        <View style={styles.col}>
          <Text style={styles.label}>Disponible:</Text>
          <Text style={styles.val}>{item.cantidad_disponible ?? item.cantidad_total} kg</Text>
        </View>
        <View style={styles.col}>
          <Text style={styles.label}>Precio / kg:</Text>
          <Text style={[styles.val, { color: colors.primaryDark }]}>
            ${parseFloat(item.precio_por_kilo || item.precio_kg || 0).toLocaleString()}
          </Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <Button
          title="⚙️ Moderar"
          variant="outline"
          size="small"
          onPress={() => abrirModeracion(item)}
        />
        <Button
          title="🗑️ Dar de Baja"
          variant="danger"
          size="small"
          onPress={() => handleEliminarLote(item)}
        />
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Header
        title="🌱 Moderación de Lotes"
        subtitle="Supervisión del catálogo de cosechas en oferta"
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

        <InputField
          label=""
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="🔍 Buscar lote por cultivo, productor o ubicación..."
        />

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loaderText}>Cargando lotes...</Text>
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
          />
        )}
      </View>

      {/* Modal Moderar */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>⚙️ Moderar Lote #{loteEnMod?.id}</Text>
            <Text style={styles.modalSub}>{loteEnMod?.cultivo} • {loteEnMod?.productor_nombre}</Text>

            <InputField
              label="Precio Oficial por Kilo (COP)"
              value={precioKg}
              onChangeText={setPrecioKg}
              keyboardType="numeric"
            />

            <View style={styles.modalButtons}>
              <Button
                title="Cancelar"
                variant="outline"
                onPress={() => setModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Guardar"
                variant="primary"
                loading={guardando}
                onPress={handleGuardarModeracion}
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
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cultivoTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  infoGrid: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    padding: 8,
    borderRadius: 8,
    marginVertical: 8,
  },
  col: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 2,
  },
  val: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 6,
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
    marginTop: 12,
  },
});
