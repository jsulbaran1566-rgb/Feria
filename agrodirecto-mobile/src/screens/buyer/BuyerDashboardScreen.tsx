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
  obtenerReservas,
  obtenerFavoritos,
} from '../../services/api';

export default function BuyerDashboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reservas, setReservas] = useState<any[]>([]);
  const [favoritosCount, setFavoritosCount] = useState<number>(0);

  const cargarDatos = useCallback(async () => {
    try {
      const [dataReservas, dataFavs] = await Promise.allSettled([
        obtenerReservas({ comprador_id: user?.id }),
        user?.id ? obtenerFavoritos(user.id) : Promise.resolve([]),
      ]);

      if (dataReservas.status === 'fulfilled') {
        const lista = Array.isArray(dataReservas.value)
          ? dataReservas.value
          : (dataReservas.value as any)?.reservas || [];
        setReservas(lista);
      }

      if (dataFavs.status === 'fulfilled') {
        const listaFav = Array.isArray(dataFavs.value)
          ? dataFavs.value
          : (dataFavs.value as any)?.favoritos || [];
        setFavoritosCount(listaFav.length);
      }
    } catch {
      // Ignorar errores menores
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

  // Cálculo de estadísticas
  const reservasActivas = reservas.filter(
    (r) =>
      (r.estado || '').toLowerCase() === 'pendiente' ||
      (r.estado || '').toLowerCase() === 'confirmada' ||
      (r.estado || '').toLowerCase() === 'en preparación' ||
      (r.estado || '').toLowerCase() === 'en tránsito'
  );

  const kgEnCamino = reservasActivas.reduce(
    (acc, curr) => acc + (parseFloat(curr.cantidad || curr.cantidad_kg) || 0),
    0
  );

  const totalGasto = reservasActivas.reduce(
    (acc, curr) => acc + (parseFloat(curr.precio_total || curr.total) || 0),
    0
  );

  return (
    <View style={styles.container}>
      <Header
        title="AgroDirecto Comprador"
        subtitle={`Hola, ${user?.nombre || 'Comprador'}`}
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
        {/* Banner de bienvenida */}
        <Card style={styles.welcomeBanner}>
          <View style={styles.welcomeHeader}>
            <View>
              <Text style={styles.welcomeTitle}>Panel de Compras</Text>
              <Text style={styles.welcomeSub}>
                Conecta directo con productores certificados y recibe cosechas frescas
              </Text>
            </View>
            <Text style={styles.welcomeEmoji}>🏪</Text>
          </View>
          <Button
            title="🔍 Explorar Catálogo de Lotes"
            variant="primary"
            size="medium"
            onPress={() => navigation.navigate('Explorar')}
            style={styles.exploreBtn}
          />
        </Card>

        {/* Métricas clave */}
        <Text style={styles.sectionTitle}>Resumen de tus Operaciones</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="Reservas Activas"
            value={reservasActivas.length}
            icon="📋"
            variant="default"
          />
          <StatCard
            title="Kg en Camino"
            value={`${kgEnCamino.toLocaleString()} kg`}
            icon="⚖️"
            variant="warning"
          />
          <StatCard
            title="Comprometido"
            value={`$${totalGasto.toLocaleString()}`}
            icon="💳"
            variant="info"
          />
          <StatCard
            title="Favoritos"
            value={favoritosCount}
            icon="⭐"
            variant="success"
          />
        </View>

        {/* Accesos rápidos */}
        <Text style={styles.sectionTitle}>Accesos Directos</Text>
        <View style={styles.shortcutsGrid}>
          <TouchableOpacity
            style={styles.shortcutCard}
            onPress={() => navigation.navigate('ReservasTab')}
          >
            <Text style={styles.shortcutIcon}>📋</Text>
            <Text style={styles.shortcutTitle}>Mis Reservas</Text>
            <Text style={styles.shortcutSub}>Ver pedidos y estados</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shortcutCard}
            onPress={() => navigation.navigate('Entregas')}
          >
            <Text style={styles.shortcutIcon}>🚚</Text>
            <Text style={styles.shortcutTitle}>Entregas</Text>
            <Text style={styles.shortcutSub}>Seguimiento y recepción</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shortcutCard}
            onPress={() => navigation.navigate('Pagos')}
          >
            <Text style={styles.shortcutIcon}>💳</Text>
            <Text style={styles.shortcutTitle}>Pagos</Text>
            <Text style={styles.shortcutSub}>Anticipos y saldos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shortcutCard}
            onPress={() => navigation.navigate('Favoritos')}
          >
            <Text style={styles.shortcutIcon}>⭐</Text>
            <Text style={styles.shortcutTitle}>Favoritos</Text>
            <Text style={styles.shortcutSub}>Productores guardados</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shortcutCard}
            onPress={() => navigation.navigate('Disputas')}
          >
            <Text style={styles.shortcutIcon}>⚖️</Text>
            <Text style={styles.shortcutTitle}>Reclamos</Text>
            <Text style={styles.shortcutSub}>Mediación y soporte</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shortcutCard}
            onPress={() => navigation.navigate('PerfilTab')}
          >
            <Text style={styles.shortcutIcon}>⚙️</Text>
            <Text style={styles.shortcutTitle}>Mi Perfil</Text>
            <Text style={styles.shortcutSub}>Ajustes y cuenta</Text>
          </TouchableOpacity>
        </View>

        {/* Reservas Recientes */}
        <View style={styles.recentHeader}>
          <Text style={styles.sectionTitle}>Reservas Recientes</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ReservasTab')}>
            <Text style={styles.linkVerTodas}>Ver todas →</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 16 }} />
        ) : reservasActivas.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📦</Text>
            <Text style={styles.emptyTitle}>No tienes pedidos activos</Text>
            <Text style={styles.emptySub}>
              Explora lotes de café, aguacate, plátano y más directo del campo.
            </Text>
            <Button
              title="Buscar Lotes Disponibles"
              variant="outline"
              size="small"
              onPress={() => navigation.navigate('Explorar')}
              style={{ marginTop: 12 }}
            />
          </Card>
        ) : (
          reservasActivas.slice(0, 3).map((reserva) => (
            <Card key={String(reserva.id)} style={styles.reservaCard}>
              <View style={styles.reservaTop}>
                <View>
                  <Text style={styles.reservaId}>Reserva #{reserva.id}</Text>
                  <Text style={styles.reservaCultivo}>
                    {reserva.lote?.cultivo || reserva.cultivo || 'Cultivo AgroDirecto'}
                  </Text>
                </View>
                <Badge
                  text={reserva.estado || 'Pendiente'}
                  variant={
                    reserva.estado === 'Confirmada'
                      ? 'success'
                      : reserva.estado === 'En tránsito'
                      ? 'info'
                      : 'warning'
                  }
                />
              </View>
              <View style={styles.reservaMeta}>
                <Text style={styles.reservaMetaText}>
                  ⚖️ Cantidad: {reserva.cantidad || reserva.cantidad_kg || '—'} kg
                </Text>
                <Text style={styles.reservaMetaText}>
                  💰 Total: ${(reserva.precio_total || reserva.total || 0).toLocaleString()}
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
  welcomeBanner: {
    backgroundColor: '#eff8f2',
    borderColor: '#c3e6cb',
    marginBottom: 20,
  },
  welcomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: 4,
  },
  welcomeSub: {
    fontSize: 13,
    color: colors.textSecondary,
    maxWidth: 240,
    lineHeight: 18,
  },
  welcomeEmoji: {
    fontSize: 36,
  },
  exploreBtn: {
    width: '100%',
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
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  linkVerTodas: {
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
  reservaCard: {
    marginBottom: 10,
  },
  reservaTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reservaId: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  reservaCultivo: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  reservaMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  reservaMetaText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
