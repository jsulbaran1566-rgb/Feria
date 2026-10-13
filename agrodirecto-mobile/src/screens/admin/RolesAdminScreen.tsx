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
  obtenerRoles,
  registrarRol,
  editarRolApi,
  eliminarRolApi,
} from '../../services/api';

export default function RolesAdminScreen({ navigation }: any) {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alert, setAlert] = useState<{ type: string; message: string } | null>(null);

  // Modal Crear / Editar Rol
  const [modalVisible, setModalVisible] = useState(false);
  const [rolEnEdicion, setRolEnEdicion] = useState<any | null>(null);
  const [nombreRol, setNombreRol] = useState('');
  const [descripcionRol, setDescripcionRol] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargarRoles = useCallback(async () => {
    try {
      const data = await obtenerRoles();
      const lista = Array.isArray(data) ? data : (data as any)?.roles || [];
      setRoles(lista);
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.message || 'Error al cargar roles y permisos.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    cargarRoles();
  }, [cargarRoles]);

  const onRefresh = () => {
    setRefreshing(true);
    cargarRoles();
  };

  const abrirModalCrear = () => {
    setRolEnEdicion(null);
    setNombreRol('');
    setDescripcionRol('');
    setModalVisible(true);
  };

  const abrirModalEditar = (rol: any) => {
    setRolEnEdicion(rol);
    setNombreRol(rol.nombre || '');
    setDescripcionRol(rol.descripcion || '');
    setModalVisible(true);
  };

  const handleGuardar = async () => {
    if (!nombreRol.trim()) {
      setAlert({ type: 'error', message: 'El nombre del rol es obligatorio.' });
      return;
    }

    setGuardando(true);
    try {
      const payload = {
        nombre: nombreRol.trim(),
        descripcion: descripcionRol.trim(),
      };

      if (rolEnEdicion?.id) {
        await editarRolApi(rolEnEdicion.id, payload);
        setAlert({ type: 'ok', message: `Rol "${nombreRol}" actualizado.` });
      } else {
        await registrarRol(payload);
        setAlert({ type: 'ok', message: `Rol "${nombreRol}" creado exitosamente.` });
      }

      setModalVisible(false);
      cargarRoles();
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Error al guardar rol.' });
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = (rol: any) => {
    if (['Administrador', 'Productor', 'Comprador'].includes(rol.nombre)) {
      setAlert({ type: 'error', message: 'Los roles estándar del sistema no pueden eliminarse.' });
      return;
    }

    Alert.alert(
      'Eliminar Rol',
      `¿Deseas eliminar el rol "${rol.nombre}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await eliminarRolApi(rol.id);
              setAlert({ type: 'ok', message: `Rol "${rol.nombre}" eliminado.` });
              cargarRoles();
            } catch (err: any) {
              setAlert({ type: 'error', message: err.message || 'Error al eliminar rol.' });
            }
          },
        },
      ]
    );
  };

  const renderRol = ({ item }: { item: any }) => {
    const esBase = ['Administrador', 'Productor', 'Comprador'].includes(item.nombre);

    return (
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.rolNombre}>{item.nombre}</Text>
            <Text style={styles.rolId}>ID: #{item.id}</Text>
          </View>
          <Badge text={esBase ? 'Sistema' : 'Personalizado'} variant={esBase ? 'primary' : 'info'} />
        </View>

        <Text style={styles.descText}>
          {item.descripcion || 'Acceso estándar a los módulos asignados de la plataforma.'}
        </Text>

        <View style={styles.actionsRow}>
          <Button
            title="✏️ Editar"
            variant="outline"
            size="small"
            onPress={() => abrirModalEditar(item)}
          />
          {!esBase && (
            <Button
              title="🗑️ Eliminar"
              variant="danger"
              size="small"
              onPress={() => handleEliminar(item)}
            />
          )}
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="🔐 Roles y Permisos"
        subtitle="Control de acceso y asignación de privilegios"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={{
          label: '+ Nuevo Rol',
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
            <Text style={styles.loaderText}>Cargando roles del sistema...</Text>
          </View>
        ) : (
          <FlatList
            data={roles}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderRol}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
            }
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>

      {/* Modal Rol */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {rolEnEdicion ? `Editar Rol "${rolEnEdicion.nombre}"` : '🔐 Nuevo Rol'}
            </Text>

            <InputField
              label="Nombre del Rol *"
              value={nombreRol}
              onChangeText={setNombreRol}
              placeholder="Ej: Auditor, Soporte, Inspector..."
            />

            <InputField
              label="Descripción de Permisos"
              value={descripcionRol}
              onChangeText={setDescripcionRol}
              placeholder="Describe el alcance y módulos autorizados para este rol..."
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
  rolNombre: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  rolId: {
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
