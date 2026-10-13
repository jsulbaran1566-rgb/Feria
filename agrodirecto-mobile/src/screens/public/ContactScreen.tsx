import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import colors from '../../theme/colors';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import InputField from '../../components/common/InputField';
import AlertBanner from '../../components/common/AlertBanner';
import Header from '../../components/common/Header';
import { enviarSoporte } from '../../services/api';

export default function ContactScreen({ navigation }: any) {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [asunto, setAsunto] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: string; message: string } | null>(null);

  const handleSubmit = async () => {
    if (!nombre.trim() || !asunto.trim() || !mensaje.trim()) {
      setAlert({ type: 'warning', message: 'Por favor completa todos los campos obligatorios (*).' });
      return;
    }

    setLoading(true);
    setAlert(null);

    try {
      await enviarSoporte({
        asunto: asunto.trim(),
        mensaje: `Contacto móvil de ${nombre.trim()} (${telefono.trim() || 'Sin tel'}): ${mensaje.trim()}`,
      });
      setAlert({
        type: 'ok',
        message: '¡Mensaje enviado con éxito! Nuestro equipo te contactará pronto.',
      });
      setNombre('');
      setTelefono('');
      setAsunto('');
      setMensaje('');
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.message || 'No se pudo enviar el mensaje. Intenta de nuevo.',
      });
    } finally {
      setLoading(false);
    }
  };

  const abrirWhatsApp = () => {
    Linking.openURL('https://wa.me/573000000000').catch(() => {
      setAlert({ type: 'error', message: 'No se pudo abrir WhatsApp en este dispositivo.' });
    });
  };

  return (
    <View style={styles.screen}>
      <Header
        title="Centro de Soporte"
        subtitle="Canales oficiales y mesa de ayuda"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* CANALES DIRECTOS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Canales Oficiales</Text>
          <Text style={styles.sectionSubtitle}>Comunícate por el medio de tu preferencia</Text>

          <TouchableOpacity activeOpacity={0.8} onPress={abrirWhatsApp}>
            <Card style={styles.channelCard}>
              <Text style={styles.channelIcon}>💬</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.channelName}>WhatsApp Oficial</Text>
                <Text style={styles.channelDetail}>+57 300 000 0000</Text>
                <Text style={styles.channelHours}>Lunes a Viernes · 8am a 6pm</Text>
              </View>
              <Text style={styles.arrowIcon}>→</Text>
            </Card>
          </TouchableOpacity>

          <Card style={styles.channelCard}>
            <Text style={styles.channelIcon}>📧</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.channelName}>Correo Electrónico</Text>
              <Text style={styles.channelDetail}>soporte@agrodirecto.com</Text>
              <Text style={styles.channelHours}>Respuesta en menos de 24 horas</Text>
            </View>
          </Card>

          <Card style={styles.channelCard}>
            <Text style={styles.channelIcon}>📍</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.channelName}>Sedes Principales</Text>
              <Text style={styles.channelDetail}>Medellín, Bogotá y Cali</Text>
              <Text style={styles.channelHours}>Atención agroindustrial nacional</Text>
            </View>
          </Card>
        </View>

        {/* FORMULARIO DE MENSAJE */}
        <View style={[styles.section, { marginBottom: 36 }]}>
          <Text style={styles.sectionTitle}>Envíanos un Mensaje</Text>
          <Text style={styles.sectionSubtitle}>Crea un ticket directo en el sistema</Text>

          <Card>
            <AlertBanner
              type={alert?.type}
              message={alert?.message}
              onClose={() => setAlert(null)}
            />

            <InputField
              label="Nombre Completo *"
              placeholder="Tu nombre"
              value={nombre}
              onChangeText={setNombre}
            />

            <InputField
              label="Teléfono de Contacto"
              placeholder="+57 300 000 0000"
              keyboardType="phone-pad"
              value={telefono}
              onChangeText={setTelefono}
            />

            <InputField
              label="Asunto *"
              placeholder="Motivo de tu consulta"
              value={asunto}
              onChangeText={setAsunto}
            />

            <InputField
              label="Mensaje *"
              placeholder="Describe tu consulta o problema en detalle..."
              multiline
              numberOfLines={4}
              value={mensaje}
              onChangeText={setMensaje}
            />

            <Button
              title="Enviar Mensaje"
              onPress={handleSubmit}
              loading={loading}
              style={{ marginTop: 8 }}
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
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 14,
  },
  channelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
  },
  channelIcon: {
    fontSize: 26,
  },
  channelName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  channelDetail: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 1,
  },
  channelHours: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  arrowIcon: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: 'bold',
  },
});
