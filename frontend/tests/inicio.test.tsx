import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Footer from "../src/components/common/Footer";
import HomePage from "../src/pages/public/HomePage";

beforeEach(() => {
  // La página de inicio pide estadísticas al backend; aquí no hace falta que respondan
  vi.stubGlobal("fetch", async () => ({ ok: true, status: 200, json: async () => ({ success: true, data: [] }) }));
});
afterEach(() => cleanup());

describe("Pie de página", () => {
  it("muestra los derechos reservados con el año actual y los enlaces principales", () => {
    render(<MemoryRouter><Footer /></MemoryRouter>);
    const anio = new Date().getFullYear();
    expect(screen.getByText(new RegExp(`${anio} AgroDirecto\\. Todos los derechos reservados`))).toBeTruthy();
    for (const texto of ["Inicio", "Nosotros", "Contacto", "Iniciar sesión", "Registrarse"]) {
      expect(screen.getByRole("link", { name: texto })).toBeTruthy();
    }
  });
});

describe("Carrusel del inicio", () => {
  it("las imágenes no fijan su propio alto (lo controla el CSS de la caja) y hay 5 diapositivas", async () => {
    const { container } = render(<MemoryRouter><HomePage /></MemoryRouter>);
    await waitFor(() => expect(container.querySelectorAll(".slider-diapositiva").length).toBe(5));
    const imagenes = container.querySelectorAll<HTMLImageElement>(".slider-diapositiva img");
    expect(imagenes.length).toBe(5);
    imagenes.forEach((img) => {
      expect(img.style.height).toBe("");
      expect(img.style.width).toBe("");
      expect(img.getAttribute("alt")).toBeTruthy();
    });
  });
});
