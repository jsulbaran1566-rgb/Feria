import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
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
  obtenerReservas,
  obtenerPagos,
  simularPagoAprobado,
  simularPagoFallido,
} from '../../services/api';

export default function PaymentsScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const [reservas, setReservas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alert, setAlert] = useState<{ type: string; message: string } | null>(null);

  // Modal Pago
  const [modalPagoVisible, setModalPagoVisible] = useState(false);
  const [reservaSeleccionada, setReservaSeleccionada] = useState<any | null>(null);
  const [tipoPago, setTipoPago] = useState<'anticipo' | 'total'>('anticipo');
  const [metodoPago, setMetodoPago] = useState('PSE / Débito Bancario');
  const [procesandoPago, setProcesandoPago] = useState(false);

  // Modal Historial de Pagos de una reserva
  const [modalHistorialVisible, setModalHistorialVisible] = useState(false);
  const [pagosReserva, setPagosReserva] = useState<any[]>([]);
  const [loadingPagos, setLoadingPagos] = useState(false);

  const cargarReservas = useCallback(async () => {
    try {
      const data = await obtenerReservas({ comprador_id: user?.id });
      const lista = Array.isArray(data) ? data : (data as any)?.reservas || [];
      setReservas(lista);

      // Si venía un reservaId en route params, abrir directamente
      if (route?.params?.reservaId) {
        const encontrada = lista.find((r) => r.id === route.params.reservaId);
        if (encontrada) {
          abrirModalPago(encontrada);
        }
      }
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.message || 'Error al cargar reservas para pagos.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, route?.params?.reservaId]);

  useEffect(() => {
    cargarReservas();
  }, [cargarReservas]);

  const onRefresh = () => {
    setRefreshing(true);
    cargarReservas();
  };

  const abrirModalPago = (reserva: any) => {
    setReservaSeleccionada(reserva);
    setTipoPago('anticipo');
    setModalPagoVisible(true);
  };

  const verHistorialPagos = async (reserva: any) => {
    setReservaSeleccionada(reserva);
    setModalHistorialVisible(true);
    setLoadingPagos(true);
    try {
      const historial = await obtenerPagos(reserva.id);
      const lista = Array.isArray(historial) ? historial : (historial as any)?.pagos || [];
      setPagosReserva(lista);
    } catch {
      setPagosReserva([]);
    } finally {
      setLoadingPagos(false);
    }
  };

  const handleEjecutarPago = async (simularExito: boolean) => {
    if (!reservaSeleccionada) return;

    const total = parseFloat(reservaSeleccionada.precio_total || reservaSeleccionada.total || 0);
    const monto = tipoPago === 'anticipo' ? total * 0.3 : total;

    setProcesandoPago(true);
    try {
      if (simularExito) {
        await simularPagoAprobado(reservaSeleccionada.id, monto, metodoPago);
        setAlert({
          type: 'ok',
          message: `¡Pago de $${monto.toLocaleString()} COP APROBADO exitosamente con ${metodoPago}!`,
        });
      } else {
        await simularPagoFallido(reservaSeleccionada.id, monto, metodoPago);
      }
      setModalPagoVisible(false);
      cargarReservas();
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.message || 'El pago no pudo procesarse o fue rechazado por el banco.',
      });
      setModalPagoVisible(false);
    } finally {
      setProcesandoPago(false);
    }
  };

  const renderReserva = ({ item }: { item: any }) => {
    const total = parseFloat(item.precio_total || item.total || 0);
    const anticipo = total * 0.3;
    const pagado = parseFloat(item.monto_pagado || 0);
    const saldo = Math.max(0, total - pagado);

    return (
      <Card style={styles.card}>
        <View style={styles.cardTop}>
          <View>
            <Text style={styles.cardTitle}>Reserva #{item.id}</Text>
            <Text style={styles.cultivoText}>
              {item.lote?.cultivo || item.cultivo || 'Cultivo AgroDirecto'}
            </Text>
          </View>
          <Badge
            text={pagado >= total ? 'Pagado Total' : pagado > 0 ? 'Anticipo Pago' : 'Pendiente Pago'}
            variant={pagado >= total ? 'success' : pagado > 0 ? 'info' : 'warning'}
          />
        </View>

        <View style={styles.montoRow}>
          <Text style={styles.montoLabel}>Total de la Orden:</Text>
          <Text style={styles.montoVal}>${total.toLocaleString()} COP</Text>
        </View>

        <View style={styles.montoRow}>
          <Text style={styles.montoLabel}>Monto Abonado:</Text>
          <Text style={[styles.montoVal, { color: colors.primary }]}>
            ${pagado.toLocaleString()} COP
          </Text>
        </View>

        <View style={styles.montoRow}>
          <Text style={styles.montoLabel}>Saldo Pendiente:</Text>
          <Text style={[styles.montoVal, { color: saldo > 0 ? colors.danger : colors.textSecondary }]}>
            ${saldo.toLocaleString()} COP
          </Text>
        </View>

        <View style={styles.cardActions}>
          {saldo > 0 && (
            <Button
              title="💳 Realizar Pago"
              variant="primary"
              size="small"
              onPress={() => abrirModalPago(item)}
            />
          )}

          <Button
            title="📄 Comprobantes"
            variant="outline"
            size="small"
            onPress={() => verHistorialPagos(item)}
          />
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="💳 Pagos y Facturación"
        subtitle="Pasarela de pagos segura y anticipos en custodia"
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
            <Text style={styles.loaderText}>Cargando reservas y pagos...</Text>
          </View>
        ) : (
          <FlatList
            data={reservas}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderReserva}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
            }
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>💳</Text>
                <Text style={styles.emptyTitle}>No hay pagos registrados</Text>
                <Text style={styles.emptySubtitle}>
                  Tus reservas con anticipos y saldos por pagar se listarán aquí.
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* Modal Realizar Pago */}
      <Modal visible={modalPagoVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>💳 Procesar Pago</Text>
            <Text style={styles.modalSub}>
              Reserva #{reservaSeleccionada?.id} • {reservaSeleccionada?.cultivo}
            </Text>

            {/* Selector de tipo de pago */}
            <Text style={styles.labelField}>Monto a Abonar</Text>
            <View style={styles.tipoPagoRow}>
              <TouchableOpacity
                style={[styles.tipoBtn, tipoPago === 'anticipo' && styles.tipoBtnActive]}
                onPress={() => setTipoPago('anticipo')}
              >
                <Text style={[styles.tipoBtnText, tipoPago === 'anticipo' && styles.tipoBtnTextActive]}>
                  Anticipo 30%
                </Text>
                <Text style={[styles.tipoSub, tipoPago === 'anticipo' && styles.tipoSubActive]}>
                  ${((parseFloat(reservaSeleccionada?.precio_total || 0) * 0.3) || 0).toLocaleString()} COP
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tipoBtn, tipoPago === 'total' && styles.tipoBtnActive]}
                onPress={() => setTipoPago('total')}
              >
                <Text style={[styles.tipoBtnText, tipoPago === 'total' && styles.tipoBtnTextActive]}>
                  Total 100%
                </Text>
                <Text style={[styles.tipoSub, tipoPago === 'total' && styles.tipoSubActive]}>
                  ${(parseFloat(reservaSeleccionada?.precio_total || 0) || 0).toLocaleString()} COP
                </Text>
              </TouchableOpacity>
            </View>

            {/* Método de pago */}
            <Text style={styles.labelField}>Método de Pago</Text>
            <View style={styles.metodosList}>
              {['PSE / Débito Bancario', 'Tarjeta de Crédito / Débito', 'Nequi / Daviplata'].map((met) => (
                <TouchableOpacity
                  key={met}
                  style={[styles.metodoItem, metodoPago === met && styles.metodoItemActive]}
                  onPress={() => setMetodoPago(met)}
                >
                  <Text style={[styles.metodoText, metodoPago === met && styles.metodoTextActive]}>
                    {met}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Simulación de pasarela */}
            <View style={styles.modalActionsCol}>
              <Button
                title="✓ Simular Pago Aprobado"
                variant="primary"
                loading={procesandoPago}
                onPress={() => handleEjecutarPago(true)}
              />
              <Button
                title="✕ Simular Pago Rechazado (Error 402)"
                variant="danger"
                loading={procesandoPago}
                onPress={() => handleEjecutarPago(false)}
                style={{ marginTop: 8 }}
              />
              <Button
                title="Cancelar"
                variant="outline"
                onPress={() => setModalPagoVisible(false)}
                style={{ marginTop: 8 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Historial de Comprobantes */}
      <Modal visible={modalHistorialVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>📄 Comprobantes de Pago</Text>
            <Text style={styles.modalSub}>
              Reserva #{reservaSeleccionada?.id} • Transacciones registradas
            </Text>

            {loadingPagos ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ margin: 20 }} />
            ) : pagosReserva.length === 0 ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: colors.textMuted }}>No se encontraron transacciones para esta reserva.</Text>
              </View>
            ) : (
              <FlatList
                data={pagosReserva}
                keyExtractor={(p) => String(p.id)}
                renderItem={({ item }) => (
                  <View style={styles.pagoItemRow}>
                    <View>
                      <Text style={styles.pagoMonto}>
                        ${(parseFloat(item.monto) || 0).toLocaleString()} COP
                      </Text>
                      <Text style={styles.pagoMetodo}>{item.metodo || 'Simulado'}</Text>
                      <Text style={styles.pagoFecha}>
                        {item.fecha ? new Date(item.fecha).toLocaleString('es-CO') : ''}
                      </Text>
                    </View>
                    <Badge
                      text={item.estado || 'Aprobado'}
                      variant={item.estado === 'Aprobado' ? 'success' : 'danger'}
                    />
                  </View>
                )}
                style={{ maxHeight: 250, marginVertical: 10 }}
              />
            )}

            <Button
              title="Cerrar"
              variant="outline"
              onPress={() => setModalHistorialVisible(false)}
              style={{ marginTop: 12 }}
            />
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
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cultivoText: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  montoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  montoLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  montoVal: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
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
  labelField: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  tipoPagoRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  tipoBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
  },
  tipoBtnActive: {
    backgroundColor: '#eff8f2',
    borderColor: colors.primary,
  },
  tipoBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  tipoBtnTextActive: {
    color: colors.primaryDark,
  },
  tipoSub: {
    fontSize: 12,
    color: colors.textMuted,
  },
  tipoSubActive: {
    color: colors.primaryDark,
    fontWeight: '600',
  },
  metodosList: {
    marginBottom: 16,
    gap: 6,
  },
  metodoItem: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  metodoItemActive: {
    borderColor: colors.primary,
    backgroundColor: '#f6fbf7',
  },
  metodoText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  metodoTextActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  modalActionsCol: {
    marginTop: 8,
  },
  pagoItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pagoMonto: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  pagoMetodo: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  pagoFecha: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
