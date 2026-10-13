import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/authContexto";
import { obtenerMiPerfil, editarUsuarioApi, obtenerTiposDocumento, cambiarClave } from "../../services/api";
import Alert from "../../components/common/Alert";
import { claveEsValida, MENSAJE_REGLAS_CLAVE } from "../../utils/password";

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  
  const [tiposDoc, setTiposDoc] = useState([]);
  
  const [formData, setFormData] = useState({
    nombre: "",
    tipo_documento: "",
    numero_documento: "",
    correo: "",
    telefono: "",
    direccion: "",
    ciudad: "",
    foto_url: "",
    descripcion: "",
  });

  const [fincaData, setFincaData] = useState({
    nombre_finca: "",
    cultivos_principales: "",
    latitud: "",
    longitud: ""
  });

  const [passData, setPassData] = useState({
    actual: "",
    nueva: "",
    confirmar: ""
  });

  const [verClaveActual, setVerClaveActual] = useState(false);
  const [verClaveNueva, setVerClaveNueva] = useState(false);
  const [verClaveConfirmar, setVerClaveConfirmar] = useState(false);

  const [loading, setLoading] = useState(true);
  const [alertPerfil, setAlertPerfil] = useState(null);
  const [alertProductor, setAlertProductor] = useState(null);
  const [alertPass, setAlertPass] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const tipos = await obtenerTiposDocumento();
        if (Array.isArray(tipos)) setTiposDoc(tipos);
      } catch {
        // Fallback
      }

      if (!user?.id) return;
      try {
        const me = await obtenerMiPerfil();
        if (me) {
          setFormData({
            nombre: me.nombre || "",
            tipo_documento: me.tipo_documento || "",
            numero_documento: me.numero_documento || "",
            correo: me.correo || "",
            telefono: me.telefono || "",
            direccion: me.direccion || "",
            ciudad: me.ciudad || "",
            foto_url: me.foto_url || "",
            descripcion: me.descripcion || "",
          });
          setFincaData({
            nombre_finca: me.nombre_finca || "",
            cultivos_principales: me.cultivos_principales || "",
            latitud: me.latitud || "",
            longitud: me.longitud || ""
          });
        }
      } catch (err) {
        setAlertPerfil({ type: "error", message: err.message || "Error al cargar datos de perfil." });
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user?.id]);

  const guardarPerfil = async () => {
    setAlertPerfil(null);
    if (!formData.nombre.trim()) {
        setAlertPerfil({ type: "error", message: "El nombre es obligatorio." });
        return;
    }
    if (!formData.numero_documento.trim()) {
        setAlertPerfil({ type: "error", message: "El numero de documento es obligatorio." });
        return;
    }
    try {
      const cambios = {
        nombre: formData.nombre.trim(),
        tipo_documento: formData.tipo_documento,
        numero_documento: formData.numero_documento.trim(),
        telefono: formData.telefono.trim(),
        direccion: formData.direccion.trim(),
        ciudad: formData.ciudad.trim(),
        foto_url: formData.foto_url.trim(),
        descripcion: formData.descripcion.trim(),
      };
      await editarUsuarioApi(user.id, cambios);
      
      const updatedUser = { ...user, nombre: formData.nombre };
      sessionStorage.setItem("usuario_nombre", formData.nombre);
      setUser(updatedUser);

      setAlertPerfil({ type: "ok", message: "¡Perfil actualizado con exito!" });
    } catch (err) {
      setAlertPerfil({ type: "error", message: err.message || "No se pudo actualizar: Error desconocido" });
    }
  };

  const guardarPerfilProductor = async () => {
    setAlertProductor(null);
    try {
      const cambios = {
        nombre_finca: fincaData.nombre_finca.trim(),
        cultivos_principales: fincaData.cultivos_principales.trim(),
      };
      if (fincaData.latitud !== "") cambios.latitud = parseFloat(fincaData.latitud);
      if (fincaData.longitud !== "") cambios.longitud = parseFloat(fincaData.longitud);

      await editarUsuarioApi(user.id, cambios);
      setAlertProductor({ type: "ok", message: "¡Datos de finca actualizados con exito!" });
    } catch (err) {
      setAlertProductor({ type: "error", message: err.message || "No se pudo actualizar: Error desconocido" });
    }
  };

  const usarMiUbicacion = () => {
    if (!navigator.geolocation) {
        setAlertProductor({ type: "error", message: "Tu navegador no soporta geolocalización." });
        return;
    }
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            setFincaData(prev => ({
                ...prev,
                latitud: pos.coords.latitude.toFixed(6),
                longitud: pos.coords.longitude.toFixed(6)
            }));
        },
        () => {
            setAlertProductor({ type: "error", message: "No se pudo obtener tu ubicación. Ingrésala manualmente." });
        }
    );
  };

  const cambiarPassword = async () => {
    setAlertPass(null);
    if (!passData.actual || !passData.nueva || !passData.confirmar) {
        setAlertPass({ type: "error", message: "Complete todos los campos." });
        return;
    }
    if (passData.nueva !== passData.confirmar) {
        setAlertPass({ type: "error", message: "Las contraseñas nuevas no coinciden." });
        return;
    }
    if (!claveEsValida(passData.nueva)) {
        setAlertPass({ type: "error", message: MENSAJE_REGLAS_CLAVE });
        return;
    }

    try {
      await cambiarClave(passData.actual, passData.nueva);
      setPassData({ actual: "", nueva: "", confirmar: "" });
      setAlertPass({ type: "ok", message: "¡Contraseña actualizada con exito!" });
    } catch (err) {
      setAlertPass({ type: "error", message: err.message || "Error al actualizar contraseña." });
    }
  };

  if (loading) return <p className="celda-vacia" style={{ padding: "40px" }}>Cargando perfil...</p>;

  const esProductor = user?.rol === "Productor" || user?.rol_id === 2;

  return (
    <>
      <div className="cabecera-panel">
        <div>
          <h2>Mi Perfil</h2>
          <p>Administre su informacion personal y de contacto</p>
        </div>
      </div>

      <div className="grid-tarjetas margen-top-32 grid-2-columnas">
        
        {/* Datos Personales */}
        <div className="tarjeta">
          <h3>Datos Personales</h3>
          <div className="campo-grupo margen-top-16">
            <label>Nombre completo / Establecimiento</label>
            <input type="text" className="campo-input" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
          </div>
          <div className="campo-grupo">
            <label>Correo electronico</label>
            <input type="email" className="campo-input campo-solo-lectura" readOnly title="El correo no se puede modificar" value={formData.correo} />
          </div>
          <div className="fila-dos-columnas" style={{ display: "flex", gap: "16px" }}>
            <div className="campo-grupo" style={{ flex: 1 }}>
              <label>Tipo de documento</label>
              <select className="campo-input" value={formData.tipo_documento} onChange={e => setFormData({...formData, tipo_documento: e.target.value})}>
                {tiposDoc.length > 0 ? tiposDoc.map(t => <option key={t.codigo} value={t.codigo}>{t.nombre}</option>) : <option value={formData.tipo_documento}>{formData.tipo_documento}</option>}
              </select>
            </div>
            <div className="campo-grupo" style={{ flex: 1 }}>
              <label>Numero de documento</label>
              <input type="text" className="campo-input" placeholder="Ej: 1010101010" value={formData.numero_documento} onChange={e => setFormData({...formData, numero_documento: e.target.value})} />
            </div>
          </div>
          <div className="campo-grupo">
            <label>Telefono</label>
            <input type="tel" className="campo-input" placeholder="Ej: 3001234567" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} />
          </div>
          <div className="campo-grupo">
            <label>Direccion</label>
            <input type="text" className="campo-input" placeholder="Direccion de entrega principal" value={formData.direccion} onChange={e => setFormData({...formData, direccion: e.target.value})} />
          </div>
          <div className="campo-grupo">
            <label>Ciudad</label>
            <input type="text" className="campo-input" value={formData.ciudad} onChange={e => setFormData({...formData, ciudad: e.target.value})} />
          </div>
          <div className="campo-grupo">
            <label>Foto de perfil (URL)</label>
            <input type="text" className="campo-input" placeholder="https://..." value={formData.foto_url} onChange={e => setFormData({...formData, foto_url: e.target.value})} />
          </div>
          <div className="campo-grupo">
            <label>Descripcion</label>
            <textarea className="campo-input" rows="3" placeholder="Cuéntale a los demás quién eres..." value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})}></textarea>
          </div>
          <div className="fila-botones margen-top-16">
            <button className="btn-verde" onClick={guardarPerfil}>Guardar Cambios</button>
          </div>
          <div className="margen-top-16">
            <Alert type={alertPerfil?.type} message={alertPerfil?.message} onClose={() => setAlertPerfil(null)} />
          </div>
        </div>

        {/* Perfil Productor */}
        {esProductor && (
        <div className="tarjeta">
          <h3>Perfil de Finca</h3>
          <div className="campo-grupo margen-top-16">
            <label>Nombre de la finca</label>
            <input type="text" className="campo-input" placeholder="Ej: Finca El Paraíso" value={fincaData.nombre_finca} onChange={e => setFincaData({...fincaData, nombre_finca: e.target.value})} />
          </div>
          <div className="campo-grupo">
            <label>Cultivos principales</label>
            <input type="text" className="campo-input" placeholder="Ej: Café, Aguacate, Plátano" value={fincaData.cultivos_principales} onChange={e => setFincaData({...fincaData, cultivos_principales: e.target.value})} />
          </div>
          <div className="fila-dos-columnas" style={{ display: "flex", gap: "16px" }}>
            <div className="campo-grupo" style={{ flex: 1 }}>
              <label>Latitud</label>
              <input type="number" step="any" className="campo-input" placeholder="Ej: 4.6097" value={fincaData.latitud} onChange={e => setFincaData({...fincaData, latitud: e.target.value})} />
            </div>
            <div className="campo-grupo" style={{ flex: 1 }}>
              <label>Longitud</label>
              <input type="number" step="any" className="campo-input" placeholder="Ej: -74.0817" value={fincaData.longitud} onChange={e => setFincaData({...fincaData, longitud: e.target.value})} />
            </div>
          </div>
          <div className="fila-botones margen-top-16">
            <button className="btn-verde btn-borde" onClick={usarMiUbicacion}>📍 Usar mi ubicación actual</button>
            <button className="btn-verde" onClick={guardarPerfilProductor}>Guardar Datos de Finca</button>
          </div>
          <div className="margen-top-16">
            <Alert type={alertProductor?.type} message={alertProductor?.message} onClose={() => setAlertProductor(null)} />
          </div>
        </div>
        )}

        {/* Seguridad */}
        <div className="tarjeta">
          <h3>Seguridad</h3>
          <div className="campo-grupo margen-top-16">
            <label>Contraseña actual</label>
            <div className="contenedor-password" style={{ position: "relative" }}>
              <input type={verClaveActual ? "text" : "password"} className="campo-input" value={passData.actual} onChange={e => setPassData({...passData, actual: e.target.value})} style={{ paddingRight: "48px" }} />
              <button type="button" onClick={() => setVerClaveActual(!verClaveActual)} title="Mostrar/ocultar contraseña" style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", color: "#8fa5b8", height: "100%", width: "46px" }}>
                <span className="material-symbols-outlined">{verClaveActual ? "visibility_off" : "visibility"}</span>
              </button>
            </div>
          </div>

          <div className="campo-grupo">
            <label>Nueva contraseña</label>
            <div className="contenedor-password" style={{ position: "relative" }}>
              <input type={verClaveNueva ? "text" : "password"} className="campo-input" value={passData.nueva} onChange={e => setPassData({...passData, nueva: e.target.value})} style={{ paddingRight: "48px" }} />
              <button type="button" onClick={() => setVerClaveNueva(!verClaveNueva)} title="Mostrar/ocultar contraseña" style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", color: "#8fa5b8", height: "100%", width: "46px" }}>
                <span className="material-symbols-outlined">{verClaveNueva ? "visibility_off" : "visibility"}</span>
              </button>
            </div>
          </div>

          <div className="campo-grupo">
            <label>Confirmar nueva contraseña</label>
            <div className="contenedor-password" style={{ position: "relative" }}>
              <input type={verClaveConfirmar ? "text" : "password"} className="campo-input" value={passData.confirmar} onChange={e => setPassData({...passData, confirmar: e.target.value})} style={{ paddingRight: "48px" }} />
              <button type="button" onClick={() => setVerClaveConfirmar(!verClaveConfirmar)} title="Mostrar/ocultar contraseña" style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", color: "#8fa5b8", height: "100%", width: "46px" }}>
                <span className="material-symbols-outlined">{verClaveConfirmar ? "visibility_off" : "visibility"}</span>
              </button>
            </div>
          </div>
          <div className="fila-botones margen-top-16">
            <button className="btn-verde btn-borde" onClick={cambiarPassword}>Actualizar Contraseña</button>
          </div>
          <div className="margen-top-16">
            <Alert type={alertPass?.type} message={alertPass?.message} onClose={() => setAlertPass(null)} />
          </div>

          <h3 className="margen-top-32">Resumen de Cuenta</h3>
          <p className="texto-secundario">
            Miembro desde: <strong>—</strong><br/>
            Rol: <span className="badge-rol">{user?.rol || 'Comprador'}</span>
          </p>
        </div>

      </div>
    </>
  );
}
