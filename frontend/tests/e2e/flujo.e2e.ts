// Flujo completo de la aplicación usando el código REAL del frontend (src/services/api.ts)
// contra el backend REAL (backend/tests/servidor_e2e.py).
import { describe, it, expect } from "vitest";
import * as api from "../../src/services/api";
import type { Lote, Reserva } from "../../src/types";

const CLAVE = "Clave1234!";
const entrar = (correo: string, clave = CLAVE) => api.iniciarSesion(correo, clave);

const estado = {
  lote: null as Lote | null,
  reserva: null as Reserva | null,
  entregaId: 0,
  codigo: "",
  total: 0, // total de la reserva (subtotal + envío), según el backend
};

async function reservaActual(comprador: string) {
  await entrar(comprador);
  const lista = await api.obtenerReservas({ comprador_id: comprador.startsWith("comprador2") ? 4 : 3 });
  return lista.find((r) => r.id === estado.reserva!.id)!;
}

describe("1. Registro y recuperación de contraseña (simulada)", () => {
  it("genera el enlace simulado, restablece la clave y el token no se puede reutilizar", async () => {
    const sol = await api.solicitarRecuperacionClave("comprador2@agrodirecto.com");
    expect(sol.token_simulado).toBeTruthy();

    await expect(api.restablecerClave(sol.token_simulado!, "debil")).rejects.toThrow();
    await api.restablecerClave(sol.token_simulado!, "NuevaClave2026!");

    await expect(entrar("comprador2@agrodirecto.com", CLAVE)).rejects.toThrow();
    const sesion = await entrar("comprador2@agrodirecto.com", "NuevaClave2026!");
    expect(sesion.rol).toBe("Comprador");

    await expect(api.restablecerClave(sol.token_simulado!, "OtraClave2026!")).rejects.toThrow();
  });

  it("correo inexistente: no devuelve enlace", async () => {
    const sol = await api.solicitarRecuperacionClave("nadie@agrodirecto.com");
    expect(sol.token_simulado).toBeNull();
  });

  it("registro de un comprador nuevo con contraseña segura", async () => {
    const roles = await api.obtenerRoles().catch(() => []);
    void roles;
    const nuevo = await api.registrarUsuario({
      id: 77777777, tipo_documento: "CC", numero_documento: "77777777", nombre: "Nuevo Comprador",
      correo: "nuevo@agrodirecto.com", telefono: "3012223344", clave: "Segura2026!", rol_id: 3,
    });
    expect(nuevo.correo).toBe("nuevo@agrodirecto.com");
    const s = await entrar("nuevo@agrodirecto.com", "Segura2026!");
    expect(s.rol).toBe("Comprador");
  });
});

describe("2. Productor publica un lote", () => {
  it("crea el lote y lo ve en su lista", async () => {
    await entrar("productor@agrodirecto.com");
    const lote = await api.registrarLote({
      producto: "Tomate Chonto", cantidad: 500, categoria: "Hortaliza", productor_id: 2,
      estado: "Activo", fecha_cosecha: "2026-12-15", precio_kg: 2000, imagen_url: null,
      anticipo_pct: 30, horas_limite_pago: 48,
    });
    expect(lote.producto).toBe("Tomate Chonto");
    estado.lote = lote;

    const mios = await api.obtenerLotes({ productor_id: 2 });
    expect(mios.some((l) => l.id === lote.id)).toBe(true);
  });

  it("avanza el estado del cultivo y reporta una incidencia", async () => {
    const lote = await api.actualizarEstadoCultivo(estado.lote!.id, "Crecimiento");
    expect(lote.estado_cultivo).toBe("Crecimiento");
    const inc = await api.crearIncidencia({ lote_id: estado.lote!.id, tipo: "Plaga", descripcion: "Plaga leve en el lote" });
    expect(inc.tipo).toBe("Plaga");
  });

  it("edita el lote (sin cambiar de productor)", async () => {
    const editado = await api.editarLoteApi(estado.lote!.id, { cantidad: 600, precio_kg: 2100 });
    expect(editado.cantidad).toBe(600);
    estado.lote = editado;
  });
});

describe("3. Comprador explora, reserva y marca favorito", () => {
  it("ve el lote en el marketplace y reserva", async () => {
    await entrar("comprador@agrodirecto.com");
    const lotes = await api.obtenerLotes();
    expect(lotes.some((l) => l.id === estado.lote!.id)).toBe(true);

    const reserva = await api.crearReserva({ comprador_id: 3, lote_id: estado.lote!.id, cantidad: 100 });
    expect(reserva.cantidad).toBe(100);
    estado.reserva = reserva;

    const despues = (await api.obtenerLotes()).find((l) => l.id === estado.lote!.id)!;
    expect(despues.kg_reservados).toBe(100);

    const mias = await api.obtenerReservas({ comprador_id: 3 });
    expect(mias.some((r) => r.id === reserva.id)).toBe(true);
  });

  it("no puede reservar más de lo disponible", async () => {
    await expect(api.crearReserva({ comprador_id: 3, lote_id: estado.lote!.id, cantidad: 100000 })).rejects.toThrow();
  });

  it("agrega y quita un productor favorito; el perfil público no expone datos personales", async () => {
    await api.agregarFavorito(3, 2);
    const favs = await api.obtenerFavoritos(3);
    expect(favs.some((f) => f.productor_id === 2)).toBe(true);

    const productores = await api.obtenerProductoresPublicos();
    const p = productores.find((x) => x.id === 2)!;
    expect(p).toBeTruthy();
    expect(p).not.toHaveProperty("correo");
    expect(p).not.toHaveProperty("telefono");
    expect(p).not.toHaveProperty("numero_documento");

    const perfil = await api.obtenerPerfilPublico(2);
    expect(perfil.nombre).toBe("Pedro Productor");

    await api.eliminarFavoritoApi(3, 2);
    expect((await api.obtenerFavoritos(3)).some((f) => f.productor_id === 2)).toBe(false);
    await api.agregarFavorito(3, 2);
  });
});

describe("4. Confirmación y pago", () => {
  it("el productor ve la reserva y la confirma", async () => {
    await entrar("productor@agrodirecto.com");
    const recibidas = await api.obtenerReservas();
    expect(recibidas.some((r) => r.id === estado.reserva!.id)).toBe(true);
    const r = await api.editarEstadoReserva(estado.reserva!.id, { estado: "Confirmada" });
    expect(r.estado).toBe("Confirmada");
  });

  it("el comprador ve el resumen de pago con el anticipo configurado", async () => {
    await entrar("comprador@agrodirecto.com");
    const resumen = await api.obtenerPagos(estado.reserva!.id);
    // 100 kg x $2.100 = $210.000 de subtotal; el backend suma el costo de envío al total
    expect(resumen.monto_total_reserva).toBeGreaterThanOrEqual(210000);
    estado.total = resumen.monto_total_reserva;
    expect(resumen.anticipo_pct).toBe(30);
    expect(resumen.monto_anticipo).toBeCloseTo(estado.total * 0.3, 1);
    expect(resumen.pagos).toEqual([]);
  });

  it("un pago rechazado no marca la reserva como pagada", async () => {
    await api.crearPago({ reserva_id: estado.reserva!.id, metodo: "Simulado - Tarjeta", resultado_simulado: "fallido" }).catch(() => null);
    expect((await reservaActual("comprador@agrodirecto.com")).estado).toBe("Confirmada");
  });

  it("paga el anticipo y luego el saldo; la reserva queda Pagada", async () => {
    const montoAnticipo = (await api.obtenerPagos(estado.reserva!.id)).monto_anticipo;
    const anticipo = await api.crearPago({ reserva_id: estado.reserva!.id, metodo: "Simulado - Tarjeta", monto: montoAnticipo, resultado_simulado: "aprobado" });
    expect(anticipo.reserva_completamente_pagada).toBe(false);
    expect(anticipo.monto_pendiente).toBeCloseTo(estado.total - montoAnticipo, 1);

    const saldo = await api.crearPago({ reserva_id: estado.reserva!.id, metodo: "Simulado - Tarjeta", resultado_simulado: "aprobado" });
    expect(saldo.reserva_completamente_pagada).toBe(true);
    expect((await reservaActual("comprador@agrodirecto.com")).estado).toBe("Pagada");

    const resumen = await api.obtenerPagos(estado.reserva!.id);
    expect(resumen.monto_pagado).toBeCloseTo(estado.total, 1);
    expect(resumen.pagos.length).toBeGreaterThanOrEqual(2);
  });

  it("el productor ve los pagos recibidos con comisión y monto neto", async () => {
    await entrar("productor@agrodirecto.com");
    const resumen = await api.obtenerPagos(estado.reserva!.id);
    const aprobados = resumen.pagos.filter((p) => p.estado !== "Fallido");
    expect(aprobados.length).toBeGreaterThanOrEqual(2);
    for (const p of aprobados) {
      expect(p.monto_neto).not.toBeNull();
    }
  });
});

describe("5. Despacho, entrega y calificación", () => {
  it("el productor despacha y comparte la ubicación", async () => {
    await entrar("productor@agrodirecto.com");
    const entrega = await api.crearEntrega({ reserva_id: estado.reserva!.id, medio: "Camión XYZ-123", fecha_estimada: "2026-12-16" });
    expect(entrega.codigo_confirmacion).toMatch(/^\d{6}$/);
    estado.entregaId = entrega.id;
    estado.codigo = entrega.codigo_confirmacion!;

    const act = await api.actualizarUbicacionEntrega(entrega.id, 4.65, -74.05);
    expect(act.latitud_actual).toBeCloseTo(4.65);
    expect((await reservaActual("comprador@agrodirecto.com")).estado).toBe("En tránsito");
  });

  it("el comprador ve el seguimiento, rechaza un código erróneo y confirma con el correcto", async () => {
    const entregas = await api.obtenerEntregas(estado.reserva!.id);
    const e = entregas.find((x) => x.id === estado.entregaId)!;
    expect(e.latitud_actual).toBeCloseTo(4.65);

    await expect(api.actualizarEntrega(estado.entregaId, { codigo_confirmacion: "000000" })).rejects.toThrow();
    await api.actualizarEntrega(estado.entregaId, { codigo_confirmacion: estado.codigo });
    expect((await reservaActual("comprador@agrodirecto.com")).estado).toBe("Entregada");
  });

  it("califica al productor y el promedio se refleja en su perfil", async () => {
    await api.crearCalificacion({ reserva_id: estado.reserva!.id, estrellas: 5, comentario: "Excelente calidad" });
    const r = await api.obtenerCalificaciones(2);
    expect(r.calificaciones.length).toBe(1);
    expect(r.promedio).toBe(5);
    const perfil = await api.obtenerPerfilPublico(2);
    expect(perfil.total_calificaciones).toBe(1);
    expect(perfil.puntaje).not.toBeNull();
    expect((await reservaActual("comprador@agrodirecto.com")).estado).toBe("Calificada");
  });
});

describe("6. Disputas y administración", () => {
  it("el comprador abre una disputa y el administrador la resuelve", async () => {
    await entrar("comprador@agrodirecto.com");
    const d = await api.crearDisputa({ reserva_id: estado.reserva!.id, descripcion: "Una parte del producto llegó golpeada" });
    expect(d.estado).toBe("Abierta");

    await entrar("admin@agrodirecto.com");
    const lista = await api.obtenerDisputas();
    expect(lista.some((x) => x.id === d.id)).toBe(true);
    const res = await api.actualizarDisputa(d.id, { estado: "Resuelta", resolucion: "Se acordó una compensación", reembolsar: false });
    expect(res.estado).toBe("Resuelta");
  });

  it("el administrador consulta usuarios, reportes, comisión e historiales", async () => {
    const usuarios = await api.obtenerUsuarios();
    expect(usuarios.length).toBeGreaterThanOrEqual(5);

    const rep = await api.obtenerReporteAdmin();
    expect(rep.volumen_transacciones).toBeGreaterThanOrEqual(2);
    expect(rep.rango).toHaveProperty("desde");

    const com = await api.obtenerComision();
    expect(typeof com.comision_pct).toBe("number");

    expect((await api.obtenerHistorialReservas()).length).toBeGreaterThan(0);
    expect((await api.obtenerHistorialSeguimiento()).length).toBeGreaterThan(0);
  });

  it("el reporte del productor refleja las ventas", async () => {
    await entrar("productor@agrodirecto.com");
    const r = await api.obtenerReporteProductor();
    expect(r.ingresos_totales).toBeGreaterThan(0);
    expect(r.comision_total).toBeGreaterThan(0);
    expect(r.ingresos_netos).toBeCloseTo(r.ingresos_totales - r.comision_total, 1);
    expect(r.calificacion.puntaje).not.toBeNull();
  });
});

describe("7. Cancelación y liberación de cupo", () => {
  it("al cancelar una reserva se liberan los kg del lote", async () => {
    await entrar("comprador@agrodirecto.com");
    const antes = (await api.obtenerLotes()).find((l) => l.id === estado.lote!.id)!.kg_reservados;
    const r2 = await api.crearReserva({ comprador_id: 3, lote_id: estado.lote!.id, cantidad: 50 });
    expect((await api.obtenerLotes()).find((l) => l.id === estado.lote!.id)!.kg_reservados).toBe(antes + 50);

    await api.editarEstadoReserva(r2.id, { estado: "Cancelada", motivo_cancelacion: "Cambié de opinión" });
    expect((await api.obtenerLotes()).find((l) => l.id === estado.lote!.id)!.kg_reservados).toBe(antes);
  });
});

describe("8. Notificaciones, perfil y seguridad", () => {
  it("productor y comprador reciben notificaciones y pueden marcarlas como leídas", async () => {
    await entrar("productor@agrodirecto.com");
    const { notificaciones: nots, no_leidas } = await api.obtenerNotificaciones();
    expect(nots.length).toBeGreaterThan(0);
    expect(no_leidas).toBeGreaterThan(0);
    expect(nots.some((n) => n.tipo === "NuevaReserva")).toBe(true);
    await api.marcarNotificacionLeida(nots[0].id);
    await api.marcarTodasNotificacionesLeidas();
    const despues = await api.obtenerNotificaciones();
    expect(despues.no_leidas).toBe(0);
    expect(despues.notificaciones.every((n) => n.leida)).toBe(true);

    await entrar("comprador@agrodirecto.com");
    expect((await api.obtenerNotificaciones()).notificaciones.length).toBeGreaterThan(0);
  });

  it("el perfil propio funciona y cambiar la contraseña exige la actual", async () => {
    const yo = await api.obtenerMiPerfil();
    expect(yo.correo).toBe("comprador@agrodirecto.com");

    await expect(api.cambiarClave("Incorrecta1!", "OtraClave2026!")).rejects.toThrow();
    await api.cambiarClave(CLAVE, "OtraClave2026!");
    await expect(entrar("comprador@agrodirecto.com", CLAVE)).rejects.toThrow();
    await entrar("comprador@agrodirecto.com", "OtraClave2026!");
  });

  it("un comprador no puede ver usuarios ni compras de otros", async () => {
    await expect(api.obtenerUsuarios()).rejects.toThrow();
    await expect(api.obtenerHistorialReservas()).rejects.toThrow();
  });

  it("el cierre de sesión invalida el token", async () => {
    await api.cerrarSesion();
    await expect(api.obtenerMiPerfil()).rejects.toThrow();
  });

  it("soporte: el formulario público de contacto funciona", async () => {
    const t = await api.enviarSoporte({ nombre: "Ana", correo: "ana@correo.com", mensaje: "[Duda] ¿Cómo reservo?" });
    expect(t.estado).toBe("Pendiente");
  });
});

describe("9. Auditoría de formas: cada lista que el frontend espera como arreglo lo es de verdad", () => {
  it("todas las consultas de listado devuelven arreglos (o el objeto que declaran los tipos)", async () => {
    await entrar("comprador@agrodirecto.com", "OtraClave2026!");
    const favoritos = await api.obtenerFavoritos(3);

    await entrar("admin@agrodirecto.com");
    const listas: Record<string, unknown> = {
      obtenerUsuarios: await api.obtenerUsuarios(),
      obtenerLotes: await api.obtenerLotes(),
      obtenerReservas: await api.obtenerReservas(),
      obtenerRoles: await api.obtenerRoles(),
      obtenerCategorias: await api.obtenerCategorias(),
      obtenerLotesPorCategoria: await api.obtenerLotesPorCategoria("Hortaliza"),
      obtenerTiposDocumento: await api.obtenerTiposDocumento(),
      obtenerProveedores: await api.obtenerProveedores(),
      obtenerTicketsSoporte: await api.obtenerTicketsSoporte(),
      obtenerDisputas: await api.obtenerDisputas(),
      obtenerHistorialReservas: await api.obtenerHistorialReservas(),
      obtenerHistorialSeguimiento: await api.obtenerHistorialSeguimiento(),
      obtenerProductoresPublicos: await api.obtenerProductoresPublicos(),
      obtenerFavoritos: favoritos,
      obtenerEntregas: await api.obtenerEntregas(estado.reserva!.id),
    };
    for (const [nombre, valor] of Object.entries(listas)) {
      expect(Array.isArray(valor), `${nombre} debería devolver un arreglo`).toBe(true);
    }
    const resumen = await api.obtenerResumenPublico();
    expect(typeof resumen.compradores).toBe("number");
    expect(typeof resumen.productores).toBe("number");
  });
});
