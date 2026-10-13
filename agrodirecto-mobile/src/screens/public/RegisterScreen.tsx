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
import Header from '../../components/common/Header';
import { registrarUsuario } from '../../services/api';

export default function RegisterScreen({ navigation }: any) {
  const [rol, setRol] = useState<'Comprador' | 'Productor'>('Comprador');
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [clave, setClave] = useState('');
  const [verClave, setVerClave] = useState(false);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [modalTerminos, setModalTerminos] = useState(false);

  // Campos específicos de Productor
  const [nombreFinca, setNombreFinca] = useState('');
  const [cultivosPrincipales, setCultivosPrincipales] = useState('');

  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: string; message: string } | null>(null);

  // Evaluador de fortaleza de contraseña
  const calcularFortaleza = () => {
    if (!clave) return { nivel: 0, label: '', color: '#e2e8f0' };
    let puntos = 0;
    if (clave.length >= 6) puntos++;
    if (clave.length >= 8) puntos++;
    if (/[A-Z]/.test(clave)) puntos++;
    if (/[0-9]/.test(clave)) puntos++;
    if (/[^A-Za-z0-9]/.test(clave)) puntos++;

    if (puntos <= 2) return { nivel: 1, label: 'Débil', color: colors.error };
    if (puntos <= 4) return { nivel: 2, label: 'Media', color: colors.secondary };
    return { nivel: 3, label: 'Fuerte', color: colors.success };
  };

  const fortaleza = calcularFortaleza();

  const handleRegistro = async () => {
    if (!nombre.trim() || !correo.trim() || !clave) {
      setAlert({ type: 'warning', message: 'Por favor completa todos los campos obligatorios (*).' });
      return;
    }

    if (clave.length < 6) {
      setAlert({ type: 'error', message: 'La contraseña debe tener al menos 6 caracteres.' });
      return;
    }

    if (!aceptaTerminos) {
      setAlert({
        type: 'warning',
        message: 'Debes autorizar el tratamiento de datos personales para continuar.',
      });
      return;
    }

    setLoading(true);
    setAlert(null);

    try {
      const payload: any = {
        nombre: nombre.trim(),
        correo: correo.trim().toLowerCase(),
        clave: clave,
        rol: rol,
        telefono: telefono.trim() || undefined,
        ciudad: ciudad.trim() || undefined,
      };

      if (rol === 'Productor') {
        payload.nombre_finca = nombreFinca.trim() || undefined;
        payload.cultivos_principales = cultivosPrincipales.trim() || undefined;
      }

      await registrarUsuario(payload);

      setAlert({
        type: 'ok',
        message: '¡Registro exitoso! Ya puedes iniciar sesión con tu cuenta.',
      });

      setTimeout(() => {
        navigation.navigate('Login');
      }, 1500);
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.message || 'Error al registrar usuario.',
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
        title="Crear Cuenta"
        subtitle="Únete a la red directa de AgroDirecto"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={styles.card}>
          <Text style={styles.sectionHeader}>¿Cuál es tu rol?</Text>
          <View style={styles.roleSelector}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.roleBtn, rol === 'Comprador' && styles.roleBtnActive]}
              onPress={() => setRol('Comprador')}
            >
              <Text style={styles.roleIcon}>🏪</Text>
              <Text style={[styles.roleText, rol === 'Comprador' && styles.roleTextActive]}>
                Comprador
              </Text>
              <Text style={styles.roleSub}>Restaurantes / Hoteles</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.roleBtn, rol === 'Productor' && styles.roleBtnActive]}
              onPress={() => setRol('Productor')}
            >
              <Text style={styles.roleIcon}>🌾</Text>
              <Text style={[styles.roleText, rol === 'Productor' && styles.roleTextActive]}>
                Productor
              </Text>
              <Text style={styles.roleSub}>Agricultor / Finca</Text>
            </TouchableOpacity>
          </View>

          <AlertBanner
            type={alert?.type}
            message={alert?.message}
            onClose={() => setAlert(null)}
          />

          <InputField
            label="Nombre Completo *"
            placeholder="Ej: Carlos Ramírez"
            value={nombre}
            onChangeText={setNombre}
          />

          <InputField
            label="Correo Electrónico *"
            placeholder="ejemplo@correo.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={correo}
            onChangeText={setCorreo}
          />

          <InputField
            label="Teléfono Móvil"
            placeholder="+57 300 000 0000"
            keyboardType="phone-pad"
            value={telefono}
            onChangeText={setTelefono}
          />

          <InputField
            label="Ciudad / Municipio"
            placeholder="Ej: Medellín, Antioquia"
            value={ciudad}
            onChangeText={setCiudad}
          />

          {rol === 'Productor' && (
            <>
              <InputField
                label="Nombre de la Finca / Predio"
                placeholder="Ej: Finca La Primavera"
                value={nombreFinca}
                onChangeText={setNombreFinca}
              />
              <InputField
                label="Cultivos Principales"
                placeholder="Ej: Café, Aguacate Hass, Plátano"
                value={cultivosPrincipales}
                onChangeText={setCultivosPrincipales}
              />
            </>
          )}

          <InputField
            label="Contraseña *"
            placeholder="Mínimo 6 caracteres"
            secureTextEntry={!verClave}
            value={clave}
            onChangeText={setClave}
            rightIcon={<Text style={{ fontSize: 16 }}>{verClave ? '👁️' : '🔒'}</Text>}
            onRightIconPress={() => setVerClave(!verClave)}
          />

          {/* INDICADOR DE FORTALEZA */}
          {clave.length > 0 && (
            <View style={styles.strengthContainer}>
              <View style={styles.strengthBarBg}>
                <View
                  style={[
                    styles.strengthBarFill,
                    {
                      width: `${(fortaleza.nivel / 3) * 100}%`,
                      backgroundColor: fortaleza.color,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.strengthLabel, { color: fortaleza.color }]}>
                Seguridad: {fortaleza.label}
              </Text>
            </View>
          )}

          {/* CHECKBOX TÉRMINOS */}
          <View style={styles.termsRow}>
            <TouchableOpacity
              onPress={() => setAceptaTerminos(!aceptaTerminos)}
              style={[styles.checkbox, aceptaTerminos && styles.checkboxChecked]}
            >
              {aceptaTerminos && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.termsText}>
                Autorizo el{' '}
                <Text
                  style={styles.termsLink}
                  onPress={() => setModalTerminos(true)}
                >
                  Tratamiento de Datos Personales
                </Text>{' '}
                conforme a la Ley 1581 de 2012.
              </Text>
            </View>
          </View>

          <Button
            title={`Registrarme como ${rol}`}
            onPress={handleRegistro}
            loading={loading}
            style={{ marginTop: 16 }}
          />

          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            style={styles.loginRedirect}
          >
            <Text style={styles.loginRedirectText}>
              ¿Ya tienes cuenta? <Text style={{ color: colors.primary, fontWeight: '700' }}>Inicia Sesión</Text>
            </Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>

      {/* MODAL TRATAMIENTO DE DATOS */}
      <ModalView
        visible={modalTerminos}
        onClose={() => setModalTerminos(false)}
        title="Tratamiento de Datos Personales"
      >
        <Text style={styles.modalBodyText}>
          En cumplimiento de la Ley Estatutaria 1581 de 2012 y el Decreto 1377 de 2013, AgroDirecto informa que los datos personales suministrados serán utilizados de manera confidencial y segura con las siguientes finalidades:
          {'\n\n'}
          1. Facilitar la comercialización y despacho directo de productos agrícolas entre productores y compradores.
          {'\n'}
          2. Gestionar pagos, anticipos, trazabilidad y facturación.
          {'\n'}
          3. Enviar notificaciones del estado de reservas, cosechas e incidencias.
          {'\n\n'}
          El titular de los datos puede ejercer sus derechos de conocer, actualizar, rectificar y suprimir sus datos en cualquier momento desde su perfil o mediante nuestros canales de soporte.
        </Text>
        <Button
          title="Entendido y Aceptar"
          onPress={() => {
            setAceptaTerminos(true);
            setModalTerminos(false);
          }}
          style={{ marginTop: 14 }}
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
    padding: 16,
    paddingBottom: 30,
  },
  card: {
    padding: 18,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  roleBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  roleBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  roleIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  roleTextActive: {
    color: colors.primaryDark,
  },
  roleSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  strengthContainer: {
    marginTop: -6,
    marginBottom: 14,
  },
  strengthBarBg: {
    height: 5,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  strengthBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  strengthLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  termsText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  termsLink: {
    color: colors.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  loginRedirect: {
    marginTop: 18,
    alignItems: 'center',
  },
  loginRedirectText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  modalBodyText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 19,
  },
});
