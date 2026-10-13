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
  obtenerProveedores,
  registrarProveedor,
  editarProveedorApi,
  eliminarProveedorApi,
} from '../../services/api';

export default function ProvidersAdminScreen({ navigation }: any) {
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alert, setAlert] = useState<{ type: string; message: string } | null>(null);

  // Modal Proveedor
  const [modalVisible, setModalVisible] = useState(false);
  const [provEnEdicion, setProvEnEdicion] = useState<any | null>(null);
  const [nombre, setNombre] = useState('');
  const [servicio, setServicio] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargarProveedores = useCallback(async () => {
    try {
      const data = await obtenerProveedores();
      const lista = Array.isArray(data) ? data : (data as any)?.proveedores || [];
      setProveedores(lista);
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.message || 'Error al cargar proveedores.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    cargarProveedores();
  }, [cargarProveedores]);

  const onRefresh = () => {
    setRefreshing(true);
    cargarProveedores();
  };

  const abrirModalCrear = () => {
    setProvEnEdicion(null);
    setNombre('');
    setServicio('Transporte de Carga Fría');
    setTelefono('');
    setCorreo('');
    setCiudad('');
    setModalVisible(true);
  };

  const abrirModalEditar = (p: any) => {
    setProvEnEdicion(p);
    setNombre(p.nombre || '');
    setServicio(p.servicio || p.tipo_servicio || '');
    setTelefono(p.telefono || '');
    setCorreo(p.correo || '');
    setCiudad(p.ciudad || '');
    setModalVisible(true);
  };

  const handleGuardar = async () => {
    if (!nombre.trim()) {
      setAlert({ type: 'error', message: 'El nombre del proveedor es obligatorio.' });
      return;
    }

    setGuardando(true);
    try {
      const payload = {
        nombre: nombre.trim(),
        servicio: servicio.trim(),
        telefono: telefono.trim(),
        correo: correo.trim(),
        ciudad: ciudad.trim(),
      };

      if (provEnEdicion?.id) {
        await editarProveedorApi(provEnEdicion.id, payload);
        setAlert({ type: 'ok', message: `Proveedor "${nombre}" actualizado.` });
      } else {
        await registrarProveedor(payload);
        setAlert({ type: 'ok', message: `Proveedor "${nombre}" registrado exitosamente.` });
      }

      setModalVisible(false);
      cargarProveedores();
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Error al guardar proveedor.' });
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = (p: any) => {
    Alert.alert(
      'Eliminar Proveedor',
      `¿Deseas eliminar a "${p.nombre}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await eliminarProveedorApi(p.id);
              setAlert({ type: 'ok', message: `Proveedor #${p.id} eliminado.` });
              cargarProveedores();
            } catch (err: any) {
              setAlert({ type: 'error', message: err.message || 'Error al eliminar proveedor.' });
            }
          },
        },
      ]
    );
  };

  const renderProveedor = ({ item }: { item: any }) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.nombreText}>{item.nombre}</Text>
          <Text style={styles.servicioSub}>{item.servicio || item.tipo_servicio || 'Servicios Logísticos'}</Text>
        </View>
        <Badge text="Homologado" variant="success" />
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoKey}>📞 Contacto:</Text>
        <Text style={styles.infoVal}>{item.telefono || 'Sin teléfono'}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoKey}>✉️ Correo:</Text>
        <Text style={styles.infoVal}>{item.correo || 'Sin correo'}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoKey}>📍 Base de Operación:</Text>
        <Text style={styles.infoVal}>{item.ciudad || 'Nacional'}</Text>
      </View>

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
        title="🚚 Proveedores Aliados"
        subtitle="Logística de transporte, fletes y empaques certificados"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={{
          label: '+ Nuevo',
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
            <Text style={styles.loaderText}>Cargando proveedores...</Text>
          </View>
        ) : (
          <FlatList
            data={proveedores}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderProveedor}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
            }
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>

      {/* Modal Proveedor */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {provEnEdicion ? `Editar Proveedor #${provEnEdicion.id}` : '🚚 Nuevo Proveedor'}
            </Text>

            <InputField
              label="Nombre Comercial *"
              value={nombre}
              onChangeText={setNombre}
              placeholder="Ej: AgroTransportes Andinos S.A.S"
            />

            <InputField
              label="Tipo de Servicio"
              value={servicio}
              onChangeText={setServicio}
              placeholder="Ej: Fletes en camión refrigerado, cajas y empaques..."
            />

            <InputField
              label="Teléfono"
              value={telefono}
              onChangeText={setTelefono}
              placeholder="Ej: 3105559876"
              keyboardType="phone-pad"
            />

            <InputField
              label="Correo Electrónico"
              value={correo}
              onChangeText={setCorreo}
              placeholder="contacto@empresa.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <InputField
              label="Ciudad / Cobertura"
              value={ciudad}
              onChangeText={setCiudad}
              placeholder="Ej: Eje Cafetero, Antioquia, Cundinamarca"
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
  nombreText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  servicioSub: {
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
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
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
    marginBottom: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
});
