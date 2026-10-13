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
import {
  obtenerUsuarios,
  registrarUsuario,
  editarUsuarioApi,
  eliminarUsuarioApi,
  obtenerRoles,
} from '../../services/api';

const ROLES_LIST = ['Comprador', 'Productor', 'Administrador'];

export default function UsersAdminScreen({ navigation }: any) {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('Todos');
  const [alert, setAlert] = useState<{ type: string; message: string } | null>(null);

  // Modal Usuario
  const [modalVisible, setModalVisible] = useState(false);
  const [usuarioEnEdicion, setUsuarioEnEdicion] = useState<any | null>(null);
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [telefono, setTelefono] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [rolSeleccionado, setRolSeleccionado] = useState('Comprador');
  const [guardando, setGuardando] = useState(false);

  const cargarUsuarios = useCallback(async () => {
    try {
      const data = await obtenerUsuarios();
      const lista = Array.isArray(data) ? data : (data as any)?.usuarios || [];
      setUsuarios(lista);
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.message || 'Error al cargar listado de usuarios.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    cargarUsuarios();
  }, [cargarUsuarios]);

  const onRefresh = () => {
    setRefreshing(true);
    cargarUsuarios();
  };

  const abrirModalCrear = () => {
    setUsuarioEnEdicion(null);
    setNombre('');
    setCorreo('');
    setClave('');
    setTelefono('');
    setCiudad('');
    setRolSeleccionado('Comprador');
    setModalVisible(true);
  };

  const abrirModalEditar = (u: any) => {
    setUsuarioEnEdicion(u);
    setNombre(u.nombre || '');
    setCorreo(u.correo || '');
    setClave('');
    setTelefono(u.telefono || '');
    setCiudad(u.ciudad || '');
    setRolSeleccionado(u.rol || 'Comprador');
    setModalVisible(true);
  };

  const handleGuardarUsuario = async () => {
    if (!nombre.trim() || !correo.trim()) {
      setAlert({ type: 'error', message: 'Nombre y correo son obligatorios.' });
      return;
    }

    if (!usuarioEnEdicion && !clave) {
      setAlert({ type: 'error', message: 'La contraseña es obligatoria para nuevos usuarios.' });
      return;
    }

    setGuardando(true);
    try {
      const payload: any = {
        nombre: nombre.trim(),
        correo: correo.trim().toLowerCase(),
        telefono: telefono.trim(),
        ciudad: ciudad.trim(),
        rol: rolSeleccionado,
      };

      if (clave) {
        payload.clave = clave;
      }

      if (usuarioEnEdicion?.id) {
        await editarUsuarioApi(usuarioEnEdicion.id, payload);
        setAlert({ type: 'ok', message: `Usuario "${nombre}" actualizado con éxito.` });
      } else {
        await registrarUsuario(payload);
        setAlert({ type: 'ok', message: `Usuario "${nombre}" creado exitosamente.` });
      }

      setModalVisible(false);
      cargarUsuarios();
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Error al guardar el usuario.' });
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = (u: any) => {
    Alert.alert(
      'Eliminar Usuario',
      `¿Deseas eliminar permanentemente la cuenta de ${u.nombre} (${u.correo})?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await eliminarUsuarioApi(u.id);
              setAlert({ type: 'ok', message: `Usuario #${u.id} eliminado.` });
              cargarUsuarios();
            } catch (err: any) {
              setAlert({ type: 'error', message: err.message || 'Error al eliminar usuario.' });
            }
          },
        },
      ]
    );
  };

  const usuariosFiltrados = usuarios.filter((u) => {
    if (filtroRol !== 'Todos' && (u.rol || '').toLowerCase() !== filtroRol.toLowerCase()) {
      return false;
    }
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      const matchNom = (u.nombre || '').toLowerCase().includes(q);
      const matchCor = (u.correo || '').toLowerCase().includes(q);
      const matchCiu = (u.ciudad || '').toLowerCase().includes(q);
      if (!matchNom && !matchCor && !matchCiu) return false;
    }
    return true;
  });

  const getBadgeRol = (rol: string) => {
    const r = (rol || '').toLowerCase();
    if (r === 'administrador') return 'danger';
    if (r === 'productor') return 'success';
    return 'info';
  };

  const renderUsuario = ({ item }: { item: any }) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.nombreText}>{item.nombre}</Text>
          <Text style={styles.correoText}>{item.correo}</Text>
        </View>
        <Badge text={item.rol || 'Comprador'} variant={getBadgeRol(item.rol)} />
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>📍 {item.ciudad || 'No especificada'}</Text>
        <Text style={styles.metaText}>📞 {item.telefono || 'Sin teléfono'}</Text>
      </View>

      {item.nombre_finca && (
        <Text style={styles.fincaText}>🏡 Finca: {item.nombre_finca}</Text>
      )}

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
        title="👥 Gestión de Usuarios"
        subtitle="Administra cuentas, accesos y roles de la plataforma"
        showBack={navigation.canGoBack()}
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

        <InputField
          label=""
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="🔍 Buscar por nombre, correo o ciudad..."
        />

        {/* Filtro por Rol */}
        <View style={styles.rolesFilterRow}>
          {['Todos', 'Comprador', 'Productor', 'Administrador'].map((rol) => {
            const active = filtroRol === rol;
            return (
              <TouchableOpacity
                key={rol}
                style={[styles.rolChip, active && styles.rolChipActive]}
                onPress={() => setFiltroRol(rol)}
              >
                <Text style={[styles.rolChipText, active && styles.rolChipTextActive]}>
                  {rol}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loaderText}>Cargando usuarios...</Text>
          </View>
        ) : (
          <FlatList
            data={usuariosFiltrados}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderUsuario}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
            }
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>👥</Text>
                <Text style={styles.emptyTitle}>No se encontraron usuarios</Text>
                <Text style={styles.emptySubtitle}>
                  Ajusta los términos de búsqueda o añade un nuevo usuario.
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* Modal Crear / Editar */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {usuarioEnEdicion ? `Editar Usuario #${usuarioEnEdicion.id}` : '👥 Nuevo Usuario'}
              </Text>

              <InputField
                label="Nombre Completo *"
                value={nombre}
                onChangeText={setNombre}
                placeholder="Ej: Carlos Restrepo"
              />

              <InputField
                label="Correo Electrónico *"
                value={correo}
                onChangeText={setCorreo}
                placeholder="ejemplo@correo.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <InputField
                label={usuarioEnEdicion ? 'Nueva Contraseña (dejar vacío para mantener)' : 'Contraseña *'}
                value={clave}
                onChangeText={setClave}
                placeholder="••••••••"
                secureTextEntry
              />

              <InputField
                label="Teléfono"
                value={telefono}
                onChangeText={setTelefono}
                placeholder="Ej: 3001234567"
                keyboardType="phone-pad"
              />

              <InputField
                label="Ciudad / Municipio"
                value={ciudad}
                onChangeText={setCiudad}
                placeholder="Ej: Medellín"
              />

              <Text style={styles.labelField}>Rol Asignado:</Text>
              <View style={styles.rolesSelectorRow}>
                {ROLES_LIST.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.roleOption,
                      rolSeleccionado === r && styles.roleOptionActive,
                    ]}
                    onPress={() => setRolSeleccionado(r)}
                  >
                    <Text
                      style={[
                        styles.roleOptionText,
                        rolSeleccionado === r && styles.roleOptionTextActive,
                      ]}
                    >
                      {r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

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
                  onPress={handleGuardarUsuario}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </ScrollView>
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
  rolesFilterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  rolChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rolChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  rolChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  rolChipTextActive: {
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
  nombreText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  correoText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  fincaText: {
    fontSize: 12,
    color: colors.primaryDark,
    fontWeight: '600',
    marginBottom: 6,
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
    marginBottom: 14,
  },
  labelField: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  rolesSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  roleOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  roleOptionActive: {
    backgroundColor: '#eff8f2',
    borderColor: colors.primary,
  },
  roleOptionText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  roleOptionTextActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
});
