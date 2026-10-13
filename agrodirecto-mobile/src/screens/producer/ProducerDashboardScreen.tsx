import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import colors from '../../theme/colors';
import Card from '../../components/common/Card';
import StatCard from '../../components/common/StatCard';
import Badge from '../../components/common/Badge';
import Header from '../../components/common/Header';
import Button from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import {
  obtenerLotes,
  obtenerReservas,
} from '../../services/api';

export default function ProducerDashboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lotes, setLotes] = useState<any[]>([]);
  const [reservas, setReservas] = useState<any[]>([]);

  const cargarDatos = useCallback(async () => {
    try {
      const [resLotes, resReservas] = await Promise.allSettled([
        obtenerLotes({ usuario_id: user?.id }),
        obtenerReservas(),
      ]);

      if (resLotes.status === 'fulfilled') {
        const dataL = Array.isArray(resLotes.value)
          ? resLotes.value
          : (resLotes.value as any)?.lotes || [];
        // Filtrar solo los lotes de este productor si no venían filtrados
        const misLotes = dataL.filter(
          (l: any) => !user?.id || l.usuario_id === user.id || l.productor_id === user.id
        );
        setLotes(misLotes.length > 0 ? misLotes : dataL);
      }

      if (resReservas.status === 'fulfilled') {
        const dataR = Array.isArray(resReservas.value)
          ? resReservas.value
          : (resReservas.value as any)?.reservas || [];
        setReservas(dataR);
      }
    } catch {
      // Ignorar errores menores de carga
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const onRefresh = () => {
    setRefreshing(true);
    cargarDatos();
  };

  // Cálculos estadísticos
  const cultivosActivos = lotes.filter(
    (l) => (l.estado_cultivo || '').toLowerCase() !== 'cosechado'
  ).length;

  const kgReservados = lotes.reduce((acc, l) => {
    const total = parseFloat(l.cantidad_total || 0);
    const disp = parseFloat(l.cantidad_disponible ?? total);
    return acc + Math.max(0, total - disp);
  }, 0);

  const ingresosProyectados = lotes.reduce((acc, l) => {
    const total = parseFloat(l.cantidad_total || 0);
    const precio = parseFloat(l.precio_por_kilo || l.precio_kg || 0);
    return acc + total * precio;
  }, 0);

  const compradoresUnicos = new Set(reservas.map((r) => r.comprador_id)).size;

  return (
    <View style={styles.container}>
      <Header
        title="AgroDirecto Productor"
        subtitle={`Finca: ${user?.nombre_finca || 'Mi Finca'}`}
        rightAction={{
          label: '🔔',
          onPress: () => navigation.navigate('Notificaciones'),
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {/* Banner de Operación */}
        <Card style={styles.bannerCard}>
          <View style={styles.bannerHeader}>
            <View>
              <Text style={styles.bannerTitle}>Gestión Agrícola y Cosechas</Text>
              <Text style={styles.bannerSub}>
                Monitorea el ciclo biológico de tus parcelas y gestiona reservas directas
              </Text>
            </View>
            <Text style={styles.bannerEmoji}>🌿</Text>
          </View>
          <Button
            title="+ Registrar Nuevo Lote"
            variant="primary"
            size="medium"
            onPress={() => navigation.navigate('CultivosTab', { openModal: true })}
          />
        </Card>

        {/* Métricas */}
        <Text style={styles.sectionTitle}>Métricas de la Operación</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="Cultivos Activos"
            value={cultivosActivos}
            icon="🌱"
            variant="default"
          />
          <StatCard
            title="Kg Reservados"
            value={`${kgReservados.toLocaleString()} kg`}
            icon="⚖️"
            variant="warning"
          />
          <StatCard
            title="Ingresos Est."
            value={`$${ingresosProyectados.toLocaleString()}`}
            icon="💰"
            variant="success"
          />
          <StatCard
            title="Compradores"
            value={compradoresUnicos || 1}
            icon="🏪"
            variant="info"
          />
        </View>

        {/* Accesos directos */}
        <Text style={styles.sectionTitle}>Módulos de Trabajo</Text>
        <View style={styles.shortcutsGrid}>
          <TouchableOpacity
            style={styles.shortcutCard}
            onPress={() => navigation.navigate('CultivosTab')}
          >
            <Text style={styles.shortcutIcon}>🌱</Text>
            <Text style={styles.shortcutTitle}>Mis Cultivos</Text>
            <Text style={styles.shortcutSub}>Lotes, siembras y stock</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shortcutCard}
            onPress={() => navigation.navigate('VentasTab')}
          >
            <Text style={styles.shortcutIcon}>💰</Text>
            <Text style={styles.shortcutTitle}>Ventas y Despacho</Text>
            <Text style={styles.shortcutSub}>Pedidos y códigos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shortcutCard}
            onPress={() => navigation.navigate('TrazabilidadTab')}
          >
            <Text style={styles.shortcutIcon}>📍</Text>
            <Text style={styles.shortcutTitle}>Trazabilidad</Text>
            <Text style={styles.shortcutSub}>Bitácora agronómica</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shortcutCard}
            onPress={() => navigation.navigate('Reportes')}
          >
            <Text style={styles.shortcutIcon}>📈</Text>
            <Text style={styles.shortcutTitle}>Reportes</Text>
            <Text style={styles.shortcutSub}>Balance financiero</Text>
          </TouchableOpacity>
        </View>

        {/* Lotes activos recientes */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Tus Cultivos en Marcha</Text>
          <TouchableOpacity onPress={() => navigation.navigate('CultivosTab')}>
            <Text style={styles.linkVer}>Ver todos →</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 16 }} />
        ) : lotes.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🌱</Text>
            <Text style={styles.emptyTitle}>No tienes lotes sembrados</Text>
            <Text style={styles.emptySub}>
              Comienza registrando tu primer lote de café, frutas u hortalizas para recibir reservas anticipadas.
            </Text>
          </Card>
        ) : (
          lotes.slice(0, 3).map((lote) => (
            <Card key={String(lote.id)} style={styles.loteCard}>
              <View style={styles.loteHeader}>
                <View>
                  <Text style={styles.loteCultivo}>{lote.cultivo}</Text>
                  <Text style={styles.loteVariedad}>
                    {lote.variedad || 'Variedad estándar'} • Lote #{lote.id}
                  </Text>
                </View>
                <Badge
                  text={lote.estado_cultivo || 'Crecimiento'}
                  variant={
                    lote.estado_cultivo === 'Cosecha'
                      ? 'success'
                      : lote.estado_cultivo === 'Floración'
                      ? 'warning'
                      : 'info'
                  }
                />
              </View>

              <View style={styles.loteMeta}>
                <Text style={styles.metaText}>
                  ⚖️ Stock: {lote.cantidad_disponible ?? lote.cantidad_total ?? 0} kg disp.
                </Text>
                <Text style={styles.metaText}>
                  💵 ${parseFloat(lote.precio_por_kilo || lote.precio_kg || 0).toLocaleString()} / kg
                </Text>
              </View>
            </Card>
          ))
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
  bannerCard: {
    backgroundColor: '#eff8f2',
    borderColor: '#c3e6cb',
    marginBottom: 20,
  },
  bannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: 4,
  },
  bannerSub: {
    fontSize: 13,
    color: colors.textSecondary,
    maxWidth: 240,
    lineHeight: 18,
  },
  bannerEmoji: {
    fontSize: 36,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  shortcutsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  shortcutCard: {
    width: '48%',
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  shortcutIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  shortcutTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  shortcutSub: {
    fontSize: 11,
    color: colors.textMuted,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  linkVer: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  loteCard: {
    marginBottom: 10,
  },
  loteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  loteCultivo: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  loteVariedad: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  loteMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
