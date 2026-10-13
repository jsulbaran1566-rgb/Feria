import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import colors from '../../theme/colors';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import InputField from '../../components/common/InputField';
import AlertBanner from '../../components/common/AlertBanner';
import ModalView from '../../components/common/ModalView';
import { useAuth } from '../../context/AuthContext';
import { getApiUrl, setCustomApiUrl } from '../../services/config';

export default function LoginScreen({ navigation }: any) {
  const { login } = useAuth();
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [verClave, setVerClave] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: string; message: string } | null>(null);

  // Modal para configurar IP del servidor en celular físico
  const [modalIpVisible, setModalIpVisible] = useState(false);
  const [serverUrl, setServerUrl] = useState(getApiUrl());

  const handleLogin = async () => {
    if (!correo.trim() || !clave) {
      setAlert({ type: 'warning', message: 'Ingresa tu correo y contraseña.' });
      return;
    }

    setLoading(true);
    setAlert(null);

    try {
      await login(correo.trim(), clave);
      // La navegación condicional en AppNavigator se activará automáticamente al haber usuario
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.message || 'Credenciales incorrectas o usuario inactivo.',
      });
    } finally {
      setLoading(false);
    }
  };

  const rellenarDemo = (demoCorreo: string, demoClave: string) => {
    setCorreo(demoCorreo);
    setClave(demoClave);
    setAlert(null);
  };

  const guardarServerUrl = async () => {
    await setCustomApiUrl(serverUrl);
    setModalIpVisible(false);
    setAlert({ type: 'ok', message: `Servidor configurado: ${getApiUrl()}` });
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* CABECERA CON BOTÓN SERVIDOR */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Home')}
            style={styles.backBtn}
          >
            <Text style={styles.backBtnText}>← Inicio</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setServerUrl(getApiUrl());
              setModalIpVisible(true);
            }}
            style={styles.configBtn}
          >
            <Text style={styles.configBtnText}>⚙️ Servidor</Text>
          </TouchableOpacity>
        </View>

        {/* HEADER BRAND */}
        <View style={styles.brandContainer}>
          <Text style={styles.brandLogo}>🌱</Text>
          <Text style={styles.brandTitle}>AGRODIRECTO</Text>
          <Text style={styles.brandSubtitle}>Del campo a su negocio, sin rodeos</Text>
        </View>

        {/* TARJETA DE LOGIN */}
        <Card style={styles.loginCard}>
          <Text style={styles.cardTitle}>Iniciar Sesión</Text>
          <Text style={styles.cardSubtitle}>
            Accede para gestionar tus cultivos, pedidos o compras.
          </Text>

          <AlertBanner
            type={alert?.type}
            message={alert?.message}
            onClose={() => setAlert(null)}
          />

          <InputField
            label="Correo Electrónico"
            placeholder="ejemplo@correo.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={correo}
            onChangeText={setCorreo}
          />

          <InputField
            label="Contraseña"
            placeholder="Mínimo 6 caracteres"
            secureTextEntry={!verClave}
            value={clave}
            onChangeText={setClave}
            rightIcon={<Text style={{ fontSize: 16 }}>{verClave ? '👁️' : '🔒'}</Text>}
            onRightIconPress={() => setVerClave(!verClave)}
          />

          <Button
            title="Ingresar"
            onPress={handleLogin}
            loading={loading}
            style={{ marginTop: 8 }}
          />

          <View style={styles.linksContainer}>
            <TouchableOpacity onPress={() => navigation.navigate('RecoverPassword')}>
              <Text style={styles.linkText}>¿Olvidó su contraseña?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('Register')}
              style={{ marginTop: 10 }}
            >
              <Text style={styles.linkRegister}>
                ¿No tiene cuenta? <Text style={styles.linkRegisterBold}>Regístrese aquí</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* CUENTAS DE DEMOSTRACIÓN */}
        <Card style={styles.demoCard}>
          <Text style={styles.demoTitle}>Cuentas de Prueba Rápidas</Text>
          <View style={styles.demoButtons}>
            <Button
              title="Admin"
              size="sm"
              variant="outline"
              onPress={() => rellenarDemo('admin@agrodirecto.com', 'admin123')}
              style={{ flex: 1 }}
            />
            <Button
              title="Productor"
              size="sm"
              variant="outline"
              onPress={() => rellenarDemo('finca.paraiso@campo.com', 'prod123')}
              style={{ flex: 1 }}
            />
            <Button
              title="Comprador"
              size="sm"
              variant="outline"
              onPress={() => rellenarDemo('compras@laplaza.com', 'comp123')}
              style={{ flex: 1 }}
            />
          </View>
        </Card>
      </ScrollView>

      {/* MODAL CONFIGURACIÓN IP DEL BACKEND */}
      <ModalView
        visible={modalIpVisible}
        onClose={() => setModalIpVisible(false)}
        title="Configuración de Servidor FastAPI"
      >
        <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 12 }}>
          Si estás usando Expo Go en un celular físico, ingresa la IP local de tu computador (ej. http://192.168.1.50:8000).
        </Text>
        <InputField
          label="URL del Backend"
          value={serverUrl}
          onChangeText={setServerUrl}
          placeholder="http://192.168.1.X:8000"
          autoCapitalize="none"
        />
        <Button
          title="Guardar y Conectar"
          onPress={guardarServerUrl}
          style={{ marginTop: 8 }}
        />
        <Button
          title="Restablecer a Valor por Defecto"
          variant="secondary"
          onPress={async () => {
            await setCustomApiUrl('');
            setServerUrl(getApiUrl());
            setModalIpVisible(false);
          }}
          style={{ marginTop: 8 }}
        />
      </ModalView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 45,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.border,
  },
  backBtnText: {
    fontSize: 13,
    color: colors.primaryDark,
    fontWeight: '600',
  },
  configBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.border,
  },
  configBtnText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  brandLogo: {
    fontSize: 48,
    marginBottom: 6,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: 1.5,
  },
  brandSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  loginCard: {
    padding: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  linksContainer: {
    marginTop: 18,
    alignItems: 'center',
  },
  linkText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  linkRegister: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  linkRegisterBold: {
    color: colors.primary,
    fontWeight: '700',
  },
  demoCard: {
    marginTop: 14,
    padding: 14,
    backgroundColor: '#f8fafc',
  },
  demoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 10,
    textAlign: 'center',
  },
  demoButtons: {
    flexDirection: 'row',
    gap: 8,
  },
});
