import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import colors from '../../theme/colors';
import Card from '../../components/common/Card';
import Header from '../../components/common/Header';

export default function AboutScreen({ navigation }: any) {
  const team = [
    { name: 'Jesús Sulbarán', role: 'Desarrollo y Arquitectura', icon: '👨‍💻' },
    { name: 'Valentina Realpe', role: 'Diseño y UX', icon: '🎨' },
    { name: 'Danna Menco', role: 'Producto y Negocio', icon: '📊' },
    { name: 'Valeria Delgado', role: 'Investigación y Datos', icon: '🔬' },
  ];

  return (
    <View style={styles.screen}>
      <Header
        title="Sobre AgroDirecto"
        subtitle="Misión, servicios y equipo de trabajo"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* EL CONTEXTO */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>El Contexto</Text>
          <Text style={styles.sectionSubtitle}>Entendemos el problema del agro desde adentro</Text>

          <Card style={{ backgroundColor: '#fef2f2', borderColor: '#fca5a5' }}>
            <Text style={styles.cardHeaderRed}>🔴 El Problema</Text>
            <Text style={styles.cardDescRed}>
              La intermediación reduce el margen del productor hasta en un 70%. El agricultor recibe una fracción del precio final mientras que los intermediarios capturan la mayor parte del valor.
            </Text>
          </Card>

          <Card style={{ backgroundColor: colors.primarySoft, borderColor: colors.primaryLight }}>
            <Text style={styles.cardHeaderGreen}>🟢 Nuestra Solución</Text>
            <Text style={styles.cardDescGreen}>
              Una plataforma formal B2B que asegura ventas futuras y elimina intermediarios, conectando directamente al productor con restaurantes, hoteles y distribuidores.
            </Text>
          </Card>
        </View>

        {/* NUESTROS SERVICIOS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nuestros Servicios</Text>
          <Text style={styles.sectionSubtitle}>Optimizando la cadena de suministro agroalimentaria</Text>

          <Card style={styles.serviceCard}>
            <Text style={styles.serviceIcon}>🌾</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.serviceTitle}>Comercialización Anticipada</Text>
              <Text style={styles.serviceText}>
                Negociación y venta previa de cosechas de manera directa, garantizando estabilidad en los precios y reduciendo la incertidumbre para el productor.
              </Text>
            </View>
          </Card>

          <Card style={styles.serviceCard}>
            <Text style={styles.serviceIcon}>🚚</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.serviceTitle}>Conexión Logística</Text>
              <Text style={styles.serviceText}>
                Enlace directo con proveedores de transporte calificados para coordinar el traslado seguro y eficiente de los productos agrícolas desde el origen.
              </Text>
            </View>
          </Card>

          <Card style={styles.serviceCard}>
            <Text style={styles.serviceIcon}>🔍</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.serviceTitle}>Trazabilidad de Lotes</Text>
              <Text style={styles.serviceText}>
                Herramientas digitales avanzadas para registrar, monitorear y certificar el origen y estado de los cultivos, aportando total transparencia.
              </Text>
            </View>
          </Card>
        </View>

        {/* EL EQUIPO */}
        <View style={[styles.section, { marginBottom: 36 }]}>
          <Text style={styles.sectionTitle}>El Equipo</Text>
          <Text style={styles.sectionSubtitle}>Las personas detrás de AgroDirecto</Text>

          <View style={styles.teamGrid}>
            {team.map((member, index) => (
              <Card key={index} style={styles.teamCard}>
                <Text style={styles.teamIcon}>{member.icon}</Text>
                <Text style={styles.teamName}>{member.name}</Text>
                <Text style={styles.teamRole}>{member.role}</Text>
              </Card>
            ))}
          </View>
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
  cardHeaderRed: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.error,
    marginBottom: 6,
  },
  cardDescRed: {
    fontSize: 13,
    color: '#7f1d1d',
    lineHeight: 18,
  },
  cardHeaderGreen: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: 6,
  },
  cardDescGreen: {
    fontSize: 13,
    color: '#14532d',
    lineHeight: 18,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  serviceIcon: {
    fontSize: 28,
  },
  serviceTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  serviceText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  teamGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  teamCard: {
    width: '48%',
    alignItems: 'center',
    padding: 14,
    marginBottom: 10,
  },
  teamIcon: {
    fontSize: 32,
    marginBottom: 6,
  },
  teamName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 2,
  },
  teamRole: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
