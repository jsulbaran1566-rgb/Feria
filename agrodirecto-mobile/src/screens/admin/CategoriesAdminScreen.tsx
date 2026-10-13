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
  obtenerCategorias,
  registrarCategoria,
  editarCategoriaApi,
  eliminarCategoriaApi,
} from '../../services/api';

export default function CategoriesAdminScreen({ navigation }: any) {
  const [categorias, setCategorias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alert, setAlert] = useState<{ type: string; message: string } | null>(null);

  // Modal Categoría
  const [modalVisible, setModalVisible] = useState(false);
  const [catEnEdicion, setCatEnEdicion] = useState<any | null>(null);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargarCategorias = useCallback(async () => {
    try {
      const data = await obtenerCategorias();
      const lista = Array.isArray(data) ? data : (data as any)?.categorias || [];
      setCategorias(lista);
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.message || 'Error al cargar categorías.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    cargarCategorias();
  }, [cargarCategorias]);

  const onRefresh = () => {
    setRefreshing(true);
    cargarCategorias();
  };

  const abrirModalCrear = () => {
    setCatEnEdicion(null);
    setNombre('');
    setDescripcion('');
    setModalVisible(true);
  };

  const abrirModalEditar = (cat: any) => {
    setCatEnEdicion(cat);
    setNombre(cat.nombre || '');
    setDescripcion(cat.descripcion || '');
    setModalVisible(true);
  };

  const handleGuardar = async () => {
    if (!nombre.trim()) {
      setAlert({ type: 'error', message: 'El nombre de la categoría es obligatorio.' });
      return;
    }

    setGuardando(true);
    try {
      const payload = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
      };

      if (catEnEdicion) {
        await editarCategoriaApi(catEnEdicion.nombre || catEnEdicion.id, payload);
        setAlert({ type: 'ok', message: `Categoría "${nombre}" actualizada.` });
      } else {
        await registrarCategoria(payload);
        setAlert({ type: 'ok', message: `Categoría "${nombre}" creada.` });
      }

      setModalVisible(false);
      cargarCategorias();
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Error al guardar categoría.' });
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = (cat: any) => {
    Alert.alert(
      'Eliminar Categoría',
      `¿Deseas eliminar la categoría "${cat.nombre}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await eliminarCategoriaApi(cat.nombre || cat.id);
              setAlert({ type: 'ok', message: `Categoría eliminada.` });
              cargarCategorias();
            } catch (err: any) {
              setAlert({ type: 'error', message: err.message || 'Error al eliminar categoría.' });
            }
          },
        },
      ]
    );
  };

  const renderCategoria = ({ item }: { item: any }) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.catNombre}>{item.nombre}</Text>
          <Text style={styles.catSub}>Taxonomía AgroDirecto</Text>
        </View>
        <Badge text="Activa" variant="success" />
      </View>

      <Text style={styles.descText}>
        {item.descripcion || 'Sin descripción detallada para esta categoría de productos.'}
      </Text>

      <View style={styles.actionsRow}>
        <Button
          title="✏️ Editar"
          variant="outline"
          size="small"
          onPress={() => abrirModalEditar(item)}
        />
        <Button
          title="🗑️ Eliminar"
          variant="danger"
          size="small"
          onPress={() => handleEliminar(item)}
        />
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Header
        title="🗂️ Categorías de Cultivos"
        subtitle="Clasificación taxonómica de productos agrícolas"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={{
          label: '+ Nueva',
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
            <Text style={styles.loaderText}>Cargando categorías...</Text>
          </View>
        ) : (
          <FlatList
            data={categorias}
            keyExtractor={(item, idx) => String(item.id || item.nombre || idx)}
            renderItem={renderCategoria}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
            }
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>

      {/* Modal Categoría */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {catEnEdicion ? `Editar Categoría "${catEnEdicion.nombre}"` : '🗂️ Nueva Categoría'}
            </Text>

            <InputField
              label="Nombre de Categoría *"
              value={nombre}
              onChangeText={setNombre}
              placeholder="Ej: Granos y Café, Frutas Tropicales..."
            />

            <InputField
              label="Descripción"
              value={descripcion}
              onChangeText={setDescripcion}
              placeholder="Describe qué tipos de alimentos o cosechas pertenecen aquí..."
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
                title="Guardar"
                variant="primary"
                loading={guardando}
                onPress={handleGuardar}
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
  catNombre: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  catSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  descText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
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
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
});
