import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from 'react-native';
import colors from '../../theme/colors';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Header from '../../components/common/Header';
import Button from '../../components/common/Button';
import InputField from '../../components/common/InputField';
import AlertBanner from '../../components/common/AlertBanner';
import { useAuth } from '../../context/AuthContext';
import {
  obtenerLotes,
  obtenerHistorialLote,
  actualizarEstadoCultivo,
} from '../../services/api';

const ETAPAS = [
  { clave: 'Siembra', pct: 25, icon: '🌱' },
  { clave: 'Crecimiento', pct: 50, icon: '🌿' },
  { clave: 'Floración', pct: 75, icon: '🌸' },
  { clave: 'Cosecha', pct: 100, icon: '🌾' },
];

export default function TraceabilityScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const [lotes, setLotes] = useState<any[]>([]);
  const [loteSeleccionado, setLoteSeleccionado] = useState<any | null>(null);
  const [eventos, setEventos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [alert, setAlert] = useState<{ type: string; message: string } | null>(null);

  // Modal registrar avance
  const [modalAvanceVisible, setModalAvanceVisible] = useState(false);
  const [etapaSeleccionada, setEtapaSeleccionada] = useState('Floración');
  const [comentarioAvance, setComentarioAvance] = useState('');
  const [guardandoAvance, setGuardandoAvance] = useState(false);

  const cargarLotes = useCallback(async () => {
    try {
      const data = await obtenerLotes({ usuario_id: user?.id });
      const lista = Array.isArray(data) ? data : (data as any)?.lotes || [];
      const misLotes = lista.filter(
        (l: any) => !user?.id || l.usuario_id === user.id || l.productor_id === user.id
      );
      const resultado = misLotes.length > 0 ? misLotes : lista;
      setLotes(resultado);

      // Si venía un loteId específico en route.params
      const targetId = route?.params?.loteId;
      const target = targetId
        ? resultado.find((l: any) => l.id === targetId)
        : resultado[0];

      if (target) {
        seleccionarLote(target);
      }
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.message || 'Error al cargar lotes para trazabilidad.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, route?.params?.loteId]);

  useEffect(() => {
    cargarLotes();
  }, [cargarLotes]);

  const seleccionarLote = async (lote: any) => {
    setLoteSeleccionado(lote);
    setLoadingHistorial(true);
    try {
      const hist = await obtenerHistorialLote(lote.id);
      setEventos(Array.isArray(hist) ? hist : []);
    } catch {
      setEventos([]);
    } finally {
      setLoadingHistorial(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    cargarLotes();
  };

  const handleGuardarAvance = async () => {
    if (!loteSeleccionado) return;
    setGuardandoAvance(true);
    try {
      await actualizarEstadoCultivo(loteSeleccionado.id, etapaSeleccionada);
      setAlert({
        type: 'ok',
        message: `Avance a fase "${etapaSeleccionada}" registrado en la bitácora.`,
      });
      setModalAvanceVisible(false);
      seleccionarLote({ ...loteSeleccionado, estado_cultivo: etapaSeleccionada });
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Error al registrar avance.' });
    } finally {
      setGuardandoAvance(false);
    }
  };

  // Calcular porcentaje de avance
  const estadoActual = loteSeleccionado?.estado_cultivo || 'Siembra';
  const etapaObj = ETAPAS.find(
    (e) => e.clave.toLowerCase() === estadoActual.toLowerCase()
  ) || { pct: 25, icon: '🌱' };

  return (
    <View style={styles.container}>
      <Header
        title="📍 Trazabilidad Agronómica"
        subtitle="Bitácora de evolución fenológica y calidad"
        showBack={navigation.canGoBack()}
        onBack={() => navigation.goBack()}
        rightAction={{
          label: '+ Avance',
          onPress: () => setModalAvanceVisible(true),
        }}
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

        {/* Selector horizontal de lotes */}
        <Text style={styles.sectionLabel}>Seleccionar Lote:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.lotsScroll}>
          {lotes.map((lote) => {
            const active = loteSeleccionado?.id === lote.id;
            return (
              <TouchableOpacity
                key={String(lote.id)}
                style={[styles.lotChip, active && styles.lotChipActive]}
                onPress={() => seleccionarLote(lote)}
              >
                <Text style={[styles.lotChipTitle, active && styles.lotChipTitleActive]}>
                  {lote.cultivo}
                </Text>
                <Text style={[styles.lotChipSub, active && styles.lotChipSubActive]}>
                  Lote #{lote.id}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loaderText}>Cargando bitácora agronómica...</Text>
          </View>
        ) : !loteSeleccionado ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No hay lotes disponibles</Text>
            <Text style={styles.emptySub}>Registra cultivos para habilitar la trazabilidad.</Text>
          </Card>
        ) : (
          <>
            {/* Tarjeta de Progreso Fenológico */}
            <Card style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <View>
                  <Text style={styles.progressTitle}>{loteSeleccionado.cultivo}</Text>
                  <Text style={styles.progressSub}>
                    {loteSeleccionado.variedad || 'Variedad estándar'} • Lote #{loteSeleccionado.id}
                  </Text>
                </View>
                <Badge text={`Fase: ${estadoActual}`} variant="success" />
              </View>

              <View style={styles.percentRow}>
                <Text style={styles.percentLabel}>Progreso biológico estimado:</Text>
                <Text style={styles.percentValue}>{etapaObj.pct}%</Text>
              </View>

              {/* Barra de progreso */}
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: `${etapaObj.pct}%` }]} />
              </View>

              {/* Hitos */}
              <View style={styles.hitosRow}>
                {ETAPAS.map((et) => {
                  const completado = et.pct <= etapaObj.pct;
                  return (
                    <View key={et.clave} style={styles.hitoItem}>
                      <Text style={styles.hitoIcon}>{et.icon}</Text>
                      <Text style={[styles.hitoLabel, completado && styles.hitoLabelDone]}>
                        {et.clave}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </Card>

            {/* Eventos y Línea de Tiempo */}
            <Text style={styles.sectionLabel}>Bitácora de Eventos y Cambios</Text>
            {loadingHistorial ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ margin: 16 }} />
            ) : eventos.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Sin eventos registrados</Text>
                <Text style={styles.emptySub}>
                  Presiona "+ Avance" para asentar cambios de fase o condiciones de la parcela.
                </Text>
              </Card>
            ) : (
              eventos.map((ev, idx) => (
                <Card key={String(ev.id || idx)} style={styles.eventCard}>
                  <View style={styles.eventDot} />
                  <View style={styles.eventBody}>
                    <Text style={styles.eventTitulo}>
                      {ev.estado || ev.estado_cultivo || ev.titulo || 'Actualización de Fase'}
                    </Text>
                    <Text style={styles.eventDesc}>
                      {ev.descripcion || ev.comentario || 'El cultivo avanza conforme al calendario agrícola.'}
                    </Text>
                    <Text style={styles.eventFecha}>
                      📅 {ev.fecha ? new Date(ev.fecha).toLocaleString('es-CO') : 'Reciente'}
                    </Text>
                  </View>
                </Card>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* Modal Registrar Avance */}
      <Modal visible={modalAvanceVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🌱 Asentar Avance de Cultivo</Text>
            <Text style={styles.modalSub}>
              Lote #{loteSeleccionado?.id} • {loteSeleccionado?.cultivo}
            </Text>

            <Text style={styles.modalFieldLabel}>Nueva Fase Fenológica:</Text>
            <View style={styles.etapasWrap}>
              {ETAPAS.map((et) => (
                <TouchableOpacity
                  key={et.clave}
                  style={[
                    styles.etapaChip,
                    etapaSeleccionada === et.clave && styles.etapaChipActive,
                  ]}
                  onPress={() => setEtapaSeleccionada(et.clave)}
                >
                  <Text
                    style={[
                      styles.etapaChipText,
                      etapaSeleccionada === et.clave && styles.etapaChipTextActive,
                    ]}
                  >
                    {et.icon} {et.clave} ({et.pct}%)
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <InputField
              label="Notas Agronómicas (Opcional)"
              value={comentarioAvance}
              onChangeText={setComentarioAvance}
              placeholder="Ej: Riego completado, sin presencia de roya, clima favorable..."
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <Button
                title="Cancelar"
                variant="outline"
                onPress={() => setModalAvanceVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Guardar Avance"
                variant="primary"
                loading={guardandoAvance}
                onPress={handleGuardarAvance}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  lotsScroll: {
    maxHeight: 56,
    marginBottom: 16,
  },
  lotChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 10,
  },
  lotChipActive: {
    backgroundColor: '#eff8f2',
    borderColor: colors.primary,
  },
  lotChipTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  lotChipTitleActive: {
    color: colors.primaryDark,
  },
  lotChipSub: {
    fontSize: 11,
    color: colors.textMuted,
  },
  lotChipSubActive: {
    color: colors.primary,
  },
  progressCard: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  progressSub: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  percentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  percentLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  percentValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  progressBg: {
    height: 8,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  hitosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hitoItem: {
    alignItems: 'center',
  },
  hitoIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  hitoLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  hitoLabelDone: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  eventCard: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  eventDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginTop: 5,
    marginRight: 10,
  },
  eventBody: {
    flex: 1,
  },
  eventTitulo: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  eventDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    marginVertical: 3,
  },
  eventFecha: {
    fontSize: 11,
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
  emptyCard: {
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 16,
  },
  modalFieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  etapasWrap: {
    gap: 8,
    marginBottom: 14,
  },
  etapaChip: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  etapaChipActive: {
    backgroundColor: '#eff8f2',
    borderColor: colors.primary,
  },
  etapaChipText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  etapaChipTextActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
});
