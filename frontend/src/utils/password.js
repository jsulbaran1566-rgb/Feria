// Reglas de contraseña compartidas (registro, recuperar contraseña y perfil)

const REGEX_MAYUS = /[A-Z]/;
const REGEX_NUMERO = /[0-9]/;
const REGEX_ESPECIAL = /[!@#$%^&*(),.?":{}|<>_\-+=/\\[\]~`;']/;

export const LONGITUD_MINIMA_CLAVE = 8;

export const MENSAJE_REGLAS_CLAVE =
  "La contraseña debe tener al menos 8 caracteres, una mayúscula, un número y un carácter especial.";

export function evaluarClave(valor = "") {
  return {
    longitud: valor.length >= LONGITUD_MINIMA_CLAVE,
    mayus: REGEX_MAYUS.test(valor),
    numero: REGEX_NUMERO.test(valor),
    especial: REGEX_ESPECIAL.test(valor),
  };
}

export function claveEsValida(valor = "") {
  const r = evaluarClave(valor);
  return r.longitud && r.mayus && r.numero && r.especial;
}
