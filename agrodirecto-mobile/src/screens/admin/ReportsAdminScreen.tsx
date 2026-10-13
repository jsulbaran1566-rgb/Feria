import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import colors from '../../theme/colors';
import Card from '../../components/common/Card';
import StatCard from '../../components/common/StatCard';
import Header from '../../components/common/Header';
import AlertBanner from '../../components/common/AlertBanner';
import { obtenerReporteAdmin } from '../../services/api';

export default function ReportsAdminScreen({ navigation }: any) {
  const [reporte, setReporte] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alert, setAlert] = useState<{ type: string; message: string } | null>(null);

  const cargarReporte = useCallback(async () => {
    try {
      const data = await obtenerReporteAdmin();
      setReporte(data);
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.message || 'Error al cargar balance institucional.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    cargarReporte();
  }, [cargarReporte]);

  const onRefresh = () => {
    setRefreshing(true);
    cargarReporte();
  };

  const gmv = parseFloat(reporte?.volumen_total || reporte?.gmv || 0);
  const comisionRecaudada = parseFloat(reporte?.comisiones_totales || reporte?.comision_plataforma || 0);
  const netoProductores = parseFloat(reporte?.transferido_productores || gmv - comisionRecaudada);
  const transaccionesCount = parseInt(reporte?.total_transacciones || reporte?.transacciones || 0, 10);
  const desgloseMeses = reporte?.desglose_mensual || reporte?.meses || [];

  return (
    <View style={styles.container}>
      <Header
        title="📈 Reporte Financiero Global"
        subtitle="Métricas económicas, volumen de transacciones y comisiones"
        showBack={navigation.canGoBack()}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
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
            <Text style={styles.loaderText}>Generando balance contable...</Text>
          </View>
        ) : (
          <>
            {/* Grid de Métricas */}
            <View style={styles.statsGrid}>
              <StatCard
                title="Volumen GMV"
                value={`$${gmv.toLocaleString()}`}
                icon="📊"
                variant="default"
              />
              <StatCard
                title="Comisiones Plataforma"
                value={`$${comisionRecaudada.toLocaleString()}`}
                icon="🏛️"
                variant="success"
              />
              <StatCard
                title="Pago a Productores"
                value={`$${netoProductores.toLocaleString()}`}
                icon="👨‍🌾"
                variant="info"
              />
              <StatCard
                title="Transacciones"
                value={transaccionesCount}
                icon="💳"
                variant="warning"
              />
            </View>

            {/* Balance Institucional */}
            <Card style={styles.balanceCard}>
              <Text style={styles.balanceTitle}>Estado de Cuentas y Custodia</Text>
              <Text style={styles.balanceSub}>
                AgroDirecto actúa como intermediario financiero de custodia (Escrow). Los fondos de
                anticipos son liberados a los campesinos una vez confirmada la entrega a satisfacción.
              </Text>

              <View style={styles.balanceRow}>
                <Text style={styles.rowLabel}>Total Transaccionado en Cosechas:</Text>
                <Text style={styles.rowVal}>${gmv.toLocaleString()} COP</Text>
              </View>

              <View style={styles.balanceRow}>
                <Text style={styles.rowLabel}>Ingreso Neto AgroDirecto (Comisiones):</Text>
                <Text style={[styles.rowVal, { color: colors.primaryDark, fontWeight: '700' }]}>
                  ${comisionRecaudada.toLocaleString()} COP
                </Text>
              </View>

              <View style={styles.balanceRow}>
                <Text style={styles.rowLabel}>Dispersión hacia Familias Agricultoras:</Text>
                <Text style={styles.rowVal}>${netoProductores.toLocaleString()} COP</Text>
              </View>
            </Card>

            {/* Histórico Mensual */}
            <Text style={styles.sectionTitle}>Evolución Financiera Mensual</Text>
            {desgloseMeses.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyText}>
                  Aún no se registran cierres de mes para graficar la evolución económica.
                </Text>
              </Card>
            ) : (
              desgloseMeses.map((m: any, idx: number) => (
                <Card key={String(m.mes || idx)} style={styles.mesCard}>
                  <View style={styles.mesTop}>
                    <Text style={styles.mesNombre}>{m.mes || `Mes ${idx + 1}`}</Text>
                    <Text style={styles.mesMonto}>
                      ${parseFloat(m.total || m.volumen || 0).toLocaleString()} COP
                    </Text>
                  </View>
                  <Text style={styles.mesComision}>
                    Comisión: ${parseFloat(m.comision || 0).toLocaleString()} COP
                  </Text>
                </Card>
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  balanceCard: {
    marginBottom: 20,
    backgroundColor: '#eff8f2',
    borderColor: '#c3e6cb',
  },
  balanceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: 4,
  },
  balanceSub: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  rowLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  rowVal: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  emptyCard: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  mesCard: {
    marginBottom: 10,
  },
  mesTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  mesNombre: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  mesMonto: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  mesComision: {
    fontSize: 12,
    color: colors.textMuted,
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
});
