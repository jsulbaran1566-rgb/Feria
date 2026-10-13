import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import colors from '../../theme/colors';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Header from '../../components/common/Header';
import Button from '../../components/common/Button';
import AlertBanner from '../../components/common/AlertBanner';
import { useAuth } from '../../context/AuthContext';
import {
  obtenerPerfilPublico,
  obtenerCalificaciones,
  agregarFavorito,
} from '../../services/api';

export default function PublicProfileScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const productorId = route?.params?.productorId;

  const [perfil, setPerfil] = useState<any | null>(null);
  const [calificaciones, setCalificaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardandoFav, setGuardandoFav] = useState(false);
  const [alert, setAlert] = useState<{ type: string; message: string } | null>(null);

  const cargarPerfil = useCallback(async () => {
    if (!productorId) return;
    try {
      const [resPerfil, resCalifs] = await Promise.allSettled([
        obtenerPerfilPublico(productorId),
        obtenerCalificaciones(productorId),
      ]);

      if (resPerfil.status === 'fulfilled') {
        setPerfil(resPerfil.value);
      }

      if (resCalifs.status === 'fulfilled') {
        const cals = Array.isArray(resCalifs.value)
          ? resCalifs.value
          : (resCalifs.value as any)?.calificaciones || [];
        setCalificaciones(cals);
      }
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.message || 'Error al cargar perfil del productor.',
      });
    } finally {
      setLoading(false);
    }
  }, [productorId]);

  useEffect(() => {
    cargarPerfil();
  }, [cargarPerfil]);

  const handleAgregarFavorito = async () => {
    if (!user?.id || !productorId) return;
    setGuardandoFav(true);
    try {
      await agregarFavorito(user.id, productorId);
      setAlert({ type: 'ok', message: '¡Productor agregado a tus favoritos!' });
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'No se pudo guardar en favoritos.' });
    } finally {
      setGuardandoFav(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Perfil del Productor" showBack onBack={() => navigation.goBack()} />
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loaderText}>Cargando información del agricultor...</Text>
        </View>
      </View>
    );
  }

  const prod = perfil?.usuario || perfil || {};
  const lotes = perfil?.lotes || [];
  const promedioPuntuacion =
    calificaciones.length > 0
      ? (
          calificaciones.reduce((acc, c) => acc + (c.puntuacion || 5), 0) /
          calificaciones.length
        ).toFixed(1)
      : '5.0';

  return (
    <View style={styles.container}>
      <Header
        title={prod.nombre_finca || 'Finca Productora'}
        subtitle={`👨‍🌾 ${prod.nombre || 'Agricultor Certificado'}`}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={{
          label: '⭐ Favorito',
          onPress: handleAgregarFavorito,
        }}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {alert && (
          <AlertBanner
            type={alert.type as any}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        )}

        {/* Hero Productor */}
        <Card style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroAvatar}>
              <Text style={styles.heroEmoji}>🏡</Text>
            </View>
            <View style={styles.heroInfo}>
              <Text style={styles.fincaTitulo}>{prod.nombre_finca || 'Finca Campesina'}</Text>
              <Text style={styles.productorNombre}>{prod.nombre}</Text>
              <Text style={styles.ubicacion}>📍 {prod.ciudad || 'Colombia'}</Text>
            </View>
          </View>

          {/* Calificación promedio */}
          <View style={styles.reputacionBox}>
            <Text style={styles.repStars}>⭐ {promedioPuntuacion} / 5.0</Text>
            <Text style={styles.repCount}>({calificaciones.length} valoraciones)</Text>
          </View>

          {/* Coordenadas GPS */}
          {prod.latitud && prod.longitud && (
            <View style={styles.gpsBox}>
              <Text style={styles.gpsLabel}>🌍 Geolocalización de la Finca:</Text>
              <Text style={styles.gpsVal}>
                Lat: {prod.latitud} | Lon: {prod.longitud}
              </Text>
            </View>
          )}

          {prod.cultivos_principales && (
            <View style={styles.cultivosRow}>
              <Text style={styles.cultivosTitle}>Cultivos de la finca:</Text>
              <Text style={styles.cultivosVal}>{prod.cultivos_principales}</Text>
            </View>
          )}

          <Button
            title="+ Guardar en Mis Favoritos"
            variant="outline"
            size="small"
            loading={guardandoFav}
            onPress={handleAgregarFavorito}
            style={{ marginTop: 12 }}
          />
        </Card>

        {/* Cosechas Activas */}
        <Text style={styles.sectionTitle}>Cosechas y Lotes Disponibles</Text>
        {lotes.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>Este productor no tiene lotes activos en este momento.</Text>
          </Card>
        ) : (
          lotes.map((lote: any) => (
            <Card key={String(lote.id)} style={styles.loteItemCard}>
              <View style={styles.loteTop}>
                <Text style={styles.loteCultivo}>{lote.cultivo}</Text>
                <Badge text={lote.estado_cultivo || 'Activo'} variant="success" />
              </View>
              <Text style={styles.lotePrecio}>
                ${(parseFloat(lote.precio_por_kilo || lote.precio_kg || 0)).toLocaleString()} COP / kg
              </Text>
              <Text style={styles.loteDisp}>
                Stock disponible: {lote.cantidad_disponible ?? lote.cantidad_total ?? 0} kg
              </Text>
            </Card>
          ))
        )}

        {/* Reseñas y Calificaciones */}
        <Text style={styles.sectionTitle}>Opiniones de Compradores</Text>
        {calificaciones.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>Aún no hay reseñas registradas para este productor.</Text>
          </Card>
        ) : (
          calificaciones.map((cal: any, idx: number) => (
            <Card key={String(cal.id || idx)} style={styles.reviewCard}>
              <View style={styles.reviewTop}>
                <Text style={styles.reviewRating}>
                  {'⭐'.repeat(Math.min(5, Math.max(1, cal.puntuacion || 5)))}
                </Text>
                <Text style={styles.reviewDate}>
                  {cal.fecha ? new Date(cal.fecha).toLocaleDateString('es-CO') : ''}
                </Text>
              </View>
              <Text style={styles.reviewComment}>{cal.comentario || 'Sin comentario adicional.'}</Text>
              <Text style={styles.reviewAuthor}>
                Por: {cal.comprador_nombre || cal.comprador?.nombre || 'Comprador verificado'}
              </Text>
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
  heroCard: {
    marginBottom: 20,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#eff8f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  heroEmoji: {
    fontSize: 30,
  },
  heroInfo: {
    flex: 1,
  },
  fincaTitulo: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  productorNombre: {
    fontSize: 14,
    color: colors.textPrimary,
    marginTop: 2,
  },
  ubicacion: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  reputacionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceMuted,
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  repStars: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.warning,
  },
  repCount: {
    fontSize: 12,
    color: colors.textMuted,
  },
  gpsBox: {
    backgroundColor: '#eff8f2',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  gpsLabel: {
    fontSize: 11,
    color: colors.primaryDark,
    fontWeight: '600',
  },
  gpsVal: {
    fontSize: 12,
    color: colors.textPrimary,
  },
  cultivosRow: {
    marginBottom: 6,
  },
  cultivosTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  cultivosVal: {
    fontSize: 13,
    color: colors.textPrimary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  emptyCard: {
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  loteItemCard: {
    marginBottom: 10,
  },
  loteTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  loteCultivo: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  lotePrecio: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: 2,
  },
  loteDisp: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  reviewCard: {
    marginBottom: 10,
  },
  reviewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  reviewRating: {
    fontSize: 14,
  },
  reviewDate: {
    fontSize: 11,
    color: colors.textMuted,
  },
  reviewComment: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
    marginBottom: 4,
  },
  reviewAuthor: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: 'italic',
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
