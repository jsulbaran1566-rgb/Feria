import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import colors from '../../theme/colors';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Header from '../../components/common/Header';
import Button from '../../components/common/Button';
import AlertBanner from '../../components/common/AlertBanner';
import { useAuth } from '../../context/AuthContext';
import {
  obtenerFavoritos,
  eliminarFavoritoApi,
} from '../../services/api';

export default function FavoriteProducersScreen({ navigation }: any) {
  const { user } = useAuth();
  const [favoritos, setFavoritos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alert, setAlert] = useState<{ type: string; message: string } | null>(null);

  const cargarFavoritos = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await obtenerFavoritos(user.id);
      const lista = Array.isArray(res) ? res : (res as any)?.favoritos || [];
      setFavoritos(lista);
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.message || 'Error al cargar productores favoritos.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    cargarFavoritos();
  }, [cargarFavoritos]);

  const onRefresh = () => {
    setRefreshing(true);
    cargarFavoritos();
  };

  const handleEliminarFavorito = async (productorId: number) => {
    if (!user?.id) return;
    try {
      await eliminarFavoritoApi(user.id, productorId);
      setFavoritos((prev) => prev.filter((f) => f.productor_id !== productorId && f.id !== productorId));
      setAlert({ type: 'ok', message: 'Productor eliminado de tus favoritos.' });
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Error al eliminar de favoritos.' });
    }
  };

  const renderFavorito = ({ item }: { item: any }) => {
    const prod = item.productor || item;
    const prodId = item.productor_id || prod.id;

    return (
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarEmoji}>👨‍🌾</Text>
          </View>
          <View style={styles.infoMeta}>
            <Text style={styles.nombre}>{prod.nombre || 'Productor AgroDirecto'}</Text>
            <Text style={styles.finca}>
              🏡 {prod.nombre_finca || 'Finca La Esperanza'}
            </Text>
            <Text style={styles.ciudad}>
              📍 {prod.ciudad || 'Colombia'}
            </Text>
          </View>
          <Badge text="Favorito ⭐" variant="success" />
        </View>

        {prod.cultivos_principales && (
          <View style={styles.cultivosBox}>
            <Text style={styles.cultivosLabel}>Cultivos destacados:</Text>
            <Text style={styles.cultivosVal}>{prod.cultivos_principales}</Text>
          </View>
        )}

        <View style={styles.cardFooter}>
          <Button
            title="Ver Perfil y Cosechas"
            variant="primary"
            size="small"
            onPress={() => navigation.navigate('PerfilPublico', { productorId: prodId })}
          />
          <Button
            title="Eliminar"
            variant="outline"
            size="small"
            onPress={() => handleEliminarFavorito(prodId)}
          />
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="⭐ Productores Favoritos"
        subtitle="Sigue de cerca a los agricultores que te proveen"
        showBack
        onBack={() => navigation.goBack()}
      />

      <View style={styles.content}>
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
            <Text style={styles.loaderText}>Cargando favoritos...</Text>
          </View>
        ) : (
          <FlatList
            data={favoritos}
            keyExtractor={(item, idx) => String(item.id || item.productor_id || idx)}
            renderItem={renderFavorito}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
            }
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>⭐</Text>
                <Text style={styles.emptyTitle}>No tienes productores favoritos</Text>
                <Text style={styles.emptySubtitle}>
                  Guarda productores desde el catálogo o sus perfiles para acceder rápido a sus cosechas.
                </Text>
                <Button
                  title="Explorar Catálogo"
                  variant="outline"
                  size="small"
                  onPress={() => navigation.navigate('Explorar')}
                  style={{ marginTop: 14 }}
                />
              </View>
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#eff8f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarEmoji: {
    fontSize: 24,
  },
  infoMeta: {
    flex: 1,
  },
  nombre: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  finca: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  ciudad: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  cultivosBox: {
    backgroundColor: colors.surfaceMuted,
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  cultivosLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 2,
  },
  cultivosVal: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 44,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
