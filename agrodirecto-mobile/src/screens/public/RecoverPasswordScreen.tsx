import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import colors from '../../theme/colors';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import InputField from '../../components/common/InputField';
import AlertBanner from '../../components/common/AlertBanner';
import Header from '../../components/common/Header';
import { solicitarRecuperacionClave, restablecerClave } from '../../services/api';

export default function RecoverPasswordScreen({ navigation }: any) {
  const [paso, setPaso] = useState<1 | 2>(1);
  const [correo, setCorreo] = useState('');
  const [token, setToken] = useState('');
  const [nuevaClave, setNuevaClave] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: string; message: string } | null>(null);

  const handleSolicitar = async () => {
    if (!correo.trim()) {
      setAlert({ type: 'warning', message: 'Ingresa tu correo registrado.' });
      return;
    }

    setLoading(true);
    setAlert(null);

    try {
      const res = await solicitarRecuperacionClave(correo.trim());
      const msg =
        res?.mensaje ||
        res?.message ||
        'Se envió un enlace o token de recuperación a tu correo electrónico.';
      setAlert({ type: 'ok', message: msg });
      setPaso(2);
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.message || 'Error al procesar la solicitud de recuperación.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRestablecer = async () => {
    if (!token.trim() || !nuevaClave) {
      setAlert({ type: 'warning', message: 'Ingresa el token y tu nueva contraseña.' });
      return;
    }

    if (nuevaClave.length < 6) {
      setAlert({ type: 'error', message: 'La nueva contraseña debe tener al menos 6 caracteres.' });
      return;
    }

    setLoading(true);
    setAlert(null);

    try {
      await restablecerClave(token.trim(), nuevaClave);
      setAlert({
        type: 'ok',
        message: '¡Contraseña restablecida con éxito! Redirigiendo al inicio de sesión...',
      });
      setTimeout(() => {
        navigation.navigate('Login');
      }, 1500);
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.message || 'El token es inválido o ha expirado.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header
        title="Recuperar Contraseña"
        subtitle="Restablece el acceso a tu cuenta"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Card style={styles.card}>
          <AlertBanner
            type={alert?.type}
            message={alert?.message}
            onClose={() => setAlert(null)}
          />

          {paso === 1 ? (
            <>
              <Text style={styles.cardTitle}>Paso 1: Solicitud de Enlace</Text>
              <Text style={styles.cardSubtitle}>
                Ingresa el correo electrónico con el que te registraste. Te enviaremos las instrucciones de recuperación.
              </Text>

              <InputField
                label="Correo Electrónico"
                placeholder="ejemplo@correo.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={correo}
                onChangeText={setCorreo}
              />

              <Button
                title="Enviar Enlace de Recuperación"
                onPress={handleSolicitar}
                loading={loading}
                style={{ marginTop: 8 }}
              />

              <Button
                title="¿Ya tienes un token? Ingresar código"
                variant="outline"
                onPress={() => setPaso(2)}
                style={{ marginTop: 10 }}
              />
            </>
          ) : (
            <>
              <Text style={styles.cardTitle}>Paso 2: Nueva Contraseña</Text>
              <Text style={styles.cardSubtitle}>
                Ingresa el token recibido en tu correo y tu nueva contraseña.
              </Text>

              <InputField
                label="Token de Recuperación"
                placeholder="Pega el token recibido"
                value={token}
                onChangeText={setToken}
                autoCapitalize="none"
              />

              <InputField
                label="Nueva Contraseña"
                placeholder="Mínimo 6 caracteres"
                secureTextEntry
                value={nuevaClave}
                onChangeText={setNuevaClave}
              />

              <Button
                title="Actualizar Contraseña"
                onPress={handleRestablecer}
                loading={loading}
                style={{ marginTop: 8 }}
              />

              <Button
                title="← Volver a solicitar correo"
                variant="outline"
                onPress={() => setPaso(1)}
                style={{ marginTop: 10 }}
              />
            </>
          )}
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 20,
  },
  card: {
    padding: 18,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
});
