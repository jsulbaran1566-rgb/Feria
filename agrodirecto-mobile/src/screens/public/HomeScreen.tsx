import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import colors from '../../theme/colors';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import StatCard from '../../components/common/StatCard';
import {
  obtenerLotes,
  obtenerUsuarios,
  obtenerCategorias,
  obtenerProveedores,
} from '../../services/api';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }: any) {
  const [stats, setStats] = useState({
    lotes: '—',
    compradores: '—',
    categorias: '—',
    proveedores: '—',
  });
  const [refreshing, setRefreshing] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);

  const slides = [
    {
      img: 'https://www.finagro.com.co/sites/default/files/2025-05/WhatsApp%20Image%202025-05-16%20at%208.40.55%20AM.jpeg',
      caption: 'Campos de cultivo — Región Andina',
    },
    {
      img: 'https://www.sanisidrosca.com/img/galeria/2025/08/agricultura-ecolgica.jpg',
      caption: 'Cosecha directa del productor',
    },
    {
      img: 'https://www.bbva.com/wp-content/uploads/2021/09/BBVA-biotecnologi%CC%81a-agri%CC%81cola-sostenibilidad-cultivo-agricultura-innovacion-terrenos.jpg',
      caption: 'Trazabilidad desde la siembra',
    },
    {
      img: 'https://www.bbva.com/wp-content/uploads/2024/07/Sostenibilidad-Agricultura-intensiva-extensiva-BBVA.jpg',
      caption: 'Producción tecnificada y sostenible',
    },
  ];

  const cargarEstadisticas = async () => {
    try {
      const [lotes, usuarios, categorias, proveedores] = await Promise.allSettled([
        obtenerLotes({}),
        obtenerUsuarios({}),
        obtenerCategorias(),
        obtenerProveedores({}),
      ]);

      const lotesData = lotes.status === 'fulfilled' && Array.isArray(lotes.value) ? lotes.value : [];
      const usuariosData = usuarios.status === 'fulfilled' && Array.isArray(usuarios.value) ? usuarios.value : [];
      const catsData = categorias.status === 'fulfilled' && Array.isArray(categorias.value) ? categorias.value : [];
      const provsData = proveedores.status === 'fulfilled' && Array.isArray(proveedores.value) ? proveedores.value : [];

      setStats({
        lotes: String(lotesData.filter((l) => l.estado === 'Activo').length || lotesData.length),
        compradores: String(usuariosData.filter((u) => u.rol === 'Comprador').length || usuariosData.length),
        categorias: String(catsData.length),
        proveedores: String(provsData.filter((p) => p.estado === 'Activo').length || provsData.length),
      });
    } catch (e) {
      console.warn('Error cargando stats móvil:', e);
    }
  };

  useEffect(() => {
    cargarEstadisticas();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarEstadisticas();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      showsVerticalScrollIndicator={false}
    >
      {/* HERO BANNER */}
      <View style={styles.hero}>
        <View style={styles.badgeHero}>
          <Text style={styles.badgeHeroText}>✦ AGRODIRECTO</Text>
        </View>
        <Text style={styles.heroTitle}>Cosecha Anticipada para su Negocio</Text>
        <Text style={styles.heroSubtitle}>
          Asegure precios estables comprando directamente al productor agrícola. Sin intermediarios, con trazabilidad completa.
        </Text>
        <View style={styles.heroButtons}>
          <Button
            title="Crear Cuenta"
            onPress={() => navigation.navigate('Register')}
            style={styles.heroBtn}
          />
          <Button
            title="Iniciar Sesión"
            variant="outline"
            onPress={() => navigation.navigate('Login')}
            style={[styles.heroBtn, { borderColor: '#ffffff' }]}
            textStyle={{ color: '#ffffff' }}
          />
        </View>
      </View>

      {/* CARRUSEL DE IMÁGENES */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>El Campo en Imágenes</Text>
        <View style={styles.carouselContainer}>
          <Image
            source={{ uri: slides[slideIndex].img }}
            style={styles.slideImage}
            resizeMode="cover"
          />
          <View style={styles.slideOverlay}>
            <Text style={styles.slideCaption}>{slides[slideIndex].caption}</Text>
          </View>
        </View>
        <View style={styles.dotsRow}>
          {slides.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => setSlideIndex(i)}
              style={[styles.dot, i === slideIndex && styles.dotActive]}
            />
          ))}
        </View>
      </View>

      {/* ESTADÍSTICAS EN TIEMPO REAL */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Nuestra Red en Cifras</Text>
        <View style={styles.statsGrid}>
          <StatCard icon="🌱" number={stats.lotes} label="Lotes Activos" variant="green" />
          <StatCard icon="🏪" number={stats.compradores} label="Compradores" variant="blue" />
        </View>
        <View style={styles.statsGrid}>
          <StatCard icon="📦" number={stats.categorias} label="Categorías" variant="brown" />
          <StatCard icon="🚚" number={stats.proveedores} label="Aliados Logísticos" variant="amber" />
        </View>
      </View>

      {/* CÓMO FUNCIONA */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>¿Cómo funciona?</Text>

        <Card style={styles.stepCard}>
          <Text style={styles.stepNumber}>1</Text>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Explore Lotes</Text>
            <Text style={styles.stepText}>Filtre por categoría de cultivo y fecha estimada de cosecha en todo el país.</Text>
          </View>
        </Card>

        <Card style={styles.stepCard}>
          <Text style={styles.stepNumber}>2</Text>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Reserve Cupos</Text>
            <Text style={styles.stepText}>Aparte su producto antes de la cosecha con precio garantizado y sin sorpresas.</Text>
          </View>
        </Card>

        <Card style={styles.stepCard}>
          <Text style={styles.stepNumber}>3</Text>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Trazabilidad en Vivo</Text>
            <Text style={styles.stepText}>Siga las etapas del cultivo: siembra, crecimiento, cosecha y despacho en tiempo real.</Text>
          </View>
        </Card>

        <Card style={styles.stepCard}>
          <Text style={styles.stepNumber}>4</Text>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Entrega Directa</Text>
            <Text style={styles.stepText}>Reciba producto fresco en su negocio con confirmación de entrega segura.</Text>
          </View>
        </Card>
      </View>

      {/* EL PROBLEMA Y LA SOLUCIÓN */}
      <View style={styles.section}>
        <Card style={{ backgroundColor: '#fef2f2', borderColor: '#fca5a5' }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.error, marginBottom: 4 }}>
            🔴 Sin AgroDirecto
          </Text>
          <Text style={{ color: '#7f1d1d', fontSize: 13, lineHeight: 18 }}>
            La intermediación tradicional reduce el margen del agricultor hasta un 70%, encareciendo el producto para el comprador.
          </Text>
        </Card>

        <Card style={{ backgroundColor: colors.primarySoft, borderColor: colors.primaryLight }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primaryDark, marginBottom: 4 }}>
            🟢 Con AgroDirecto
          </Text>
          <Text style={{ color: '#14532d', fontSize: 13, lineHeight: 18 }}>
            Conexión B2B directa. El productor pacta su precio justo y el comprador recibe trazabilidad garantizada.
          </Text>
        </Card>
      </View>

      {/* ENLACES A OTRAS PÁGINAS */}
      <View style={[styles.section, { marginBottom: 36 }]}>
        <Button
          title="Conocer al Equipo (Nosotros)"
          variant="secondary"
          onPress={() => navigation.navigate('About')}
          style={{ marginBottom: 10 }}
        />
        <Button
          title="Centro de Contacto y Soporte"
          variant="outline"
          onPress={() => navigation.navigate('Contact')}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  hero: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 28,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  badgeHero: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  badgeHeroText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
    lineHeight: 30,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#e2f7e4',
    lineHeight: 20,
    marginBottom: 20,
  },
  heroButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  heroBtn: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: 14,
  },
  carouselContainer: {
    height: 190,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
  },
  slideImage: {
    width: '100%',
    height: '100%',
  },
  slideOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 10,
  },
  slideCaption: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#cbd5e1',
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 14,
  },
  stepNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    width: 42,
    height: 42,
    borderRadius: 21,
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: 42,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  stepText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
