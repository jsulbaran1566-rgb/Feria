import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, fireEvent, waitFor, cleanup } from "@testing-library/react";
import type { RenderResult } from "@testing-library/react";
import App from "../src/App.tsx";

// Prueba de regresión: al cerrar sesión desde cualquier opción del menú y entrar con
// otra cuenta, se debe llegar al panel de esa cuenta (no a la página anterior).

const USUARIOS = {
  admin: { id: 1, nombre: "Admin", correo: "admin@t.com", rol: "Administrador" },
  admin2: { id: 4, nombre: "Admin2", correo: "admin2@t.com", rol: "Administrador" },
  prod: { id: 2, nombre: "Prod", correo: "prod@t.com", rol: "Productor" },
  comp: { id: 3, nombre: "Comp", correo: "comp@t.com", rol: "Comprador" },
  comp2: { id: 5, nombre: "Comp2", correo: "comp2@t.com", rol: "Comprador" },
};
const PANEL: Record<string, string> = { Administrador: "/admin", Productor: "/productor", Comprador: "/comprador" };

beforeEach(() => {
  sessionStorage.clear();
  vi.stubGlobal("scrollTo", () => {});
  vi.stubGlobal("fetch", async (url: string, opts: { body?: string } = {}) => {
    const ruta = String(url).replace("http://127.0.0.1:8000", "");
    const json = (data: unknown) => ({ ok: true, status: 200, json: async () => ({ success: true, data }) });
    if (ruta === "/auth/login") {
      const { correo } = JSON.parse(opts.body ?? "{}");
      const u = Object.values(USUARIOS).find((x) => x.correo === correo);
      return json({ token: "tok-" + correo, usuario: u });
    }
    return json([]);
  });
  window.history.pushState({}, "", "/login");
});
afterEach(() => cleanup());

type Usuario = (typeof USUARIOS)[keyof typeof USUARIOS];

const esperar = (utils: RenderResult, sel: string) =>
  waitFor(() => expect(utils.container.querySelector(sel)).not.toBeNull());

async function entrar(utils: RenderResult, usuario: Usuario) {
  await esperar(utils, "#campo-correo");
  fireEvent.change(utils.container.querySelector("#campo-correo") as Element, { target: { value: usuario.correo } });
  fireEvent.change(utils.container.querySelector("#campo-clave") as Element, { target: { value: "Clave1234!" } });
  fireEvent.click(utils.getByText("Ingresar"));
  await waitFor(() => expect(window.location.pathname).toBe(PANEL[usuario.rol]));
}

async function salir(utils: RenderResult) {
  fireEvent.click(await utils.findByText(/Cerrar Sesión/));
  await waitFor(() => expect(window.location.pathname).toBe("/login"));
  await esperar(utils, "#campo-correo");
}

describe("Cerrar sesión desde cualquier opción del menú y entrar con otra cuenta", () => {
  for (const A of [USUARIOS.admin, USUARIOS.prod, USUARIOS.comp]) {
    it(`desde ${A.rol}: todas las opciones del menú`, async () => {
      // 1) descubrir las opciones del menú lateral + campana de notificaciones
      let utils = render(<App />);
      await entrar(utils, A);
      await esperar(utils, "aside a[href]");
      const hrefs = [
        ...new Set([
          ...[...utils.container.querySelectorAll("aside a[href]")].map((a) => a.getAttribute("href")),
          "/notificaciones",
        ]),
      ];
      expect(hrefs.length).toBeGreaterThan(4);
      cleanup();

      const fallos = [];
      for (const href of hrefs) {
        for (const [claveB, B] of Object.entries(USUARIOS)) {
          sessionStorage.clear();
          window.history.pushState({}, "", "/login");
          utils = render(<App />);
          await entrar(utils, A);
          await esperar(utils, `a[href="${href}"]`);
          fireEvent.click(utils.container.querySelector(`a[href="${href}"]`) as Element);
          await waitFor(() => expect(window.location.pathname).toBe(href));
          await salir(utils);
          await entrar(utils, B).catch(() => {});
          const destino = window.location.pathname;
          if (destino !== PANEL[B.rol]) fallos.push(`${A.rol} en ${href} -> ${claveB}: terminó en ${destino}`);
          cleanup();
        }
      }
      expect(fallos).toEqual([]);
    });
  }
});
