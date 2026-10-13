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
import { useAuth } from '../../context/AuthContext';
import { obtenerReporteProductor } from '../../services/api';

export default function ProducerReportsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [reporte, setReporte] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alert, setAlert] = useState<{ type: string; message: string } | null>(null);

  const cargarReporte = useCallback(async () => {
    try {
      const data = await obtenerReporteProductor(user?.id || null);
      setReporte(data);
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.message || 'Error al cargar reporte financiero.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    cargarReporte();
  }, [cargarReporte]);

  const onRefresh = () => {
    setRefreshing(true);
    cargarReporte();
  };

  const totalBruto = parseFloat(reporte?.ingresos_brutos || reporte?.total_ventas || 0);
  const comisionPct = parseFloat(reporte?.comision_pct || 5);
  const totalComision = parseFloat(reporte?.comision_retenida || totalBruto * (comisionPct / 100));
  const totalNeto = parseFloat(reporte?.ingresos_netos || totalBruto - totalComision);
  const totalKg = parseFloat(reporte?.kg_totales_vendidos || reporte?.kg_vendidos || 0);
  const desglose = reporte?.desglose_por_lote || reporte?.lotes || [];

  return (
    <View style={styles.container}>
      <Header
        title="📈 Reporte Financiero"
        subtitle="Ingresos brutos, comisiones y transferencias netas"
        showBack
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
            <Text style={styles.loaderText}>Generando informe financiero...</Text>
          </View>
        ) : (
          <>
            {/* Tarjetas de Métricas */}
            <View style={styles.statsGrid}>
              <StatCard
                title="Ventas Brutas"
                value={`$${totalBruto.toLocaleString()}`}
                icon="💰"
                variant="default"
              />
              <StatCard
                title="Comisión Plataforma"
                value={`-$${totalComision.toLocaleString()}`}
                icon="🏛️"
                variant="warning"
              />
              <StatCard
                title="Neto Productor"
                value={`$${totalNeto.toLocaleString()}`}
                icon="✅"
                variant="success"
              />
              <StatCard
                title="Kg Vendidos"
                value={`${totalKg.toLocaleString()} kg`}
                icon="⚖️"
                variant="info"
              />
            </View>

            {/* Resumen de Liquidación */}
            <Card style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Liquidación y Custodia</Text>
              <Text style={styles.summaryDesc}>
                AgroDirecto retiene una comisión estándar del {comisionPct}% para el mantenimiento de
                la pasarela de pagos y logística de soporte al productor campesino.
              </Text>

              <View style={styles.liquidRow}>
                <Text style={styles.liquidLabel}>Total Facturado:</Text>
                <Text style={styles.liquidVal}>${totalBruto.toLocaleString()} COP</Text>
              </View>
              <View style={styles.liquidRow}>
                <Text style={styles.liquidLabel}>Tarifa de Operación ({comisionPct}%):</Text>
                <Text style={[styles.liquidVal, { color: colors.danger }]}>
                  -${totalComision.toLocaleString()} COP
                </Text>
              </View>
              <View style={[styles.liquidRow, styles.liquidTotalRow]}>
                <Text style={styles.liquidTotalLabel}>Saldo Neto a Transferir:</Text>
                <Text style={styles.liquidTotalVal}>${totalNeto.toLocaleString()} COP</Text>
              </View>
            </Card>

            {/* Desglose por Lote */}
            <Text style={styles.sectionTitle}>Rendimiento por Cultivo / Lote</Text>
            {desglose.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyText}>
                  Aún no se registran liquidaciones en el período. Tus ventas entregadas aparecerán aquí.
                </Text>
              </Card>
            ) : (
              desglose.map((item: any, idx: number) => (
                <Card key={String(item.lote_id || idx)} style={styles.loteCard}>
                  <View style={styles.loteTop}>
                    <Text style={styles.loteCultivo}>
                      {item.cultivo || `Lote #${item.lote_id}`}
                    </Text>
                    <Text style={styles.loteTotal}>
                      ${parseFloat(item.total || item.ingreso_bruto || 0).toLocaleString()} COP
                    </Text>
                  </View>
                  <View style={styles.loteMetaRow}>
                    <Text style={styles.loteMetaText}>
                      Kg comercializados: {item.kg || item.cantidad_kg || 0} kg
                    </Text>
                    <Text style={styles.loteMetaText}>
                      Neto: ${parseFloat(item.neto || 0).toLocaleString()} COP
                    </Text>
                  </View>
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
  summaryCard: {
    marginBottom: 20,
    backgroundColor: '#eff8f2',
    borderColor: '#c3e6cb',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: 6,
  },
  summaryDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  liquidRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  liquidLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  liquidVal: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  liquidTotalRow: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#c3e6cb',
    marginTop: 6,
  },
  liquidTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  liquidTotalVal: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primaryDark,
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
  loteCard: {
    marginBottom: 10,
  },
  loteTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  loteCultivo: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  loteTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  loteMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  loteMetaText: {
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
