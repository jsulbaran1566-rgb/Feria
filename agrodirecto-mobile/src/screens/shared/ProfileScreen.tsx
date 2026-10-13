import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import colors from '../../theme/colors';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import InputField from '../../components/common/InputField';
import AlertBanner from '../../components/common/AlertBanner';
import Badge from '../../components/common/Badge';
import Header from '../../components/common/Header';
import { useAuth } from '../../context/AuthContext';
import { editarUsuarioApi } from '../../services/api';

export default function ProfileScreen({ navigation }: any) {
  const { user, logout, updateUser } = useAuth();

  const [nombre, setNombre] = useState(user?.nombre || '');
  const [telefono, setTelefono] = useState(user?.telefono || '');
  const [ciudad, setCiudad] = useState(user?.ciudad || '');
  const [nombreFinca, setNombreFinca] = useState(user?.nombre_finca || '');
  const [cultivosPrincipales, setCultivosPrincipales] = useState(user?.cultivos_principales || '');
  const [latitud, setLatitud] = useState(user?.latitud ? String(user.latitud) : '');
  const [longitud, setLongitud] = useState(user?.longitud ? String(user.longitud) : '');

  // Cambio de clave
  const [claveActual, setClaveActual] = useState('');
  const [claveNueva, setClaveNueva] = useState('');
  const [claveConfirmar, setClaveConfirmar] = useState('');

  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: string; message: string } | null>(null);

  const esProductor = user?.rol === 'Productor';

  const handleGuardarPerfil = async () => {
    if (!user?.id) return;
    setLoading(true);
    setAlert(null);

    try {
      const payload: any = {
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        ciudad: ciudad.trim(),
      };

      if (esProductor) {
        payload.nombre_finca = nombreFinca.trim();
        payload.cultivos_principales = cultivosPrincipales.trim();
        if (latitud && longitud) {
          payload.latitud = parseFloat(latitud);
          payload.longitud = parseFloat(longitud);
        }
      }

      const usuarioActualizado = await editarUsuarioApi(user.id, payload);
      await updateUser({ ...user, ...usuarioActualizado });
      setAlert({ type: 'ok', message: 'Perfil actualizado con éxito.' });
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Error al actualizar perfil.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCambiarClave = async () => {
    if (!claveActual || !claveNueva) {
      setAlert({ type: 'warning', message: 'Ingresa la contraseña actual y la nueva.' });
      return;
    }
    if (claveNueva.length < 6) {
      setAlert({ type: 'error', message: 'La nueva contraseña debe tener al menos 6 caracteres.' });
      return;
    }
    if (claveNueva !== claveConfirmar) {
      setAlert({ type: 'error', message: 'Las contraseñas nuevas no coinciden.' });
      return;
    }

    if (!user?.id) return;
    setLoading(true);
    setAlert(null);

    try {
      await editarUsuarioApi(user.id, {
        clave_actual: claveActual,
        clave: claveNueva,
      });
      setAlert({ type: 'ok', message: 'Contraseña actualizada correctamente.' });
      setClaveActual('');
      setClaveNueva('');
      setClaveConfirmar('');
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Error al cambiar contraseña.' });
    } finally {
      setLoading(false);
    }
  };

  const capturarUbicacion = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitud(String(pos.coords.latitude));
          setLongitud(String(pos.coords.longitude));
          setAlert({ type: 'ok', message: 'Coordenadas GPS obtenidas.' });
        },
        () => {
          setAlert({ type: 'warning', message: 'Ingresa tus coordenadas manualmente.' });
        }
      );
    } else {
      setAlert({ type: 'info', message: 'Ingresa la latitud y longitud de tu predio.' });
    }
  };

  return (
    <View style={styles.screen}>
      <Header
        title="Mi Perfil"
        subtitle={user?.correo}
        rightAction={
          <TouchableOpacity
            onPress={() => {
              Alert.alert('Cerrar Sesión', '¿Estás seguro de que deseas salir?', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Salir', style: 'destructive', onPress: logout },
              ]);
            }}
            style={styles.logoutBtn}
          >
            <Text style={styles.logoutText}>Salir 🚪</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <AlertBanner
            type={alert?.type}
            message={alert?.message}
            onClose={() => setAlert(null)}
          />

          {/* CABECERA PERFIL */}
          <Card style={styles.userCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarIcon}>
                {user?.rol === 'Administrador' ? '🛡️' : user?.rol === 'Productor' ? '🌾' : '🏪'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>{user?.nombre}</Text>
              <Text style={styles.userEmail}>{user?.correo}</Text>
              <Badge status={user?.rol} style={{ marginTop: 4 }} />
            </View>
          </Card>

          {/* DATOS PERSONALES */}
          <Card>
            <Text style={styles.cardHeader}>Información Personal</Text>

            <InputField
              label="Nombre Completo"
              value={nombre}
              onChangeText={setNombre}
            />

            <InputField
              label="Teléfono"
              value={telefono}
              onChangeText={setTelefono}
              keyboardType="phone-pad"
            />

            <InputField
              label="Ciudad / Municipio"
              value={ciudad}
              onChangeText={setCiudad}
            />

            {esProductor && (
              <>
                <Text style={[styles.cardHeader, { marginTop: 14 }]}>Datos de la Finca</Text>

                <InputField
                  label="Nombre de la Finca"
                  value={nombreFinca}
                  onChangeText={setNombreFinca}
                />

                <InputField
                  label="Cultivos Principales"
                  value={cultivosPrincipales}
                  onChangeText={setCultivosPrincipales}
                />

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <InputField
                      label="Latitud"
                      value={latitud}
                      onChangeText={setLatitud}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <InputField
                      label="Longitud"
                      value={longitud}
                      onChangeText={setLongitud}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <Button
                  title="📍 Obtener Coordenadas GPS"
                  variant="outline"
                  size="sm"
                  onPress={capturarUbicacion}
                  style={{ marginBottom: 12 }}
                />
              </>
            )}

            <Button
              title="Guardar Cambios"
              onPress={handleGuardarPerfil}
              loading={loading}
              style={{ marginTop: 6 }}
            />
          </Card>

          {/* SEGURIDAD */}
          <Card style={{ marginBottom: 30 }}>
            <Text style={styles.cardHeader}>Seguridad de la Cuenta</Text>

            <InputField
              label="Contraseña Actual"
              secureTextEntry
              value={claveActual}
              onChangeText={setClaveActual}
            />

            <InputField
              label="Nueva Contraseña"
              secureTextEntry
              value={claveNueva}
              onChangeText={setClaveNueva}
            />

            <InputField
              label="Confirmar Nueva Contraseña"
              secureTextEntry
              value={claveConfirmar}
              onChangeText={setClaveConfirmar}
            />

            <Button
              title="Cambiar Contraseña"
              variant="secondary"
              onPress={handleCambiarClave}
              loading={loading}
            />
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  logoutText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarIcon: {
    fontSize: 28,
  },
  userName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  userEmail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  cardHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: 12,
  },
});
