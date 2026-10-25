import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { EstadoPill } from '../../components/EstadoPill';
import { useAuth } from '../../context/AuthContext';
import {
  leerPropuesta,
  guardarPropuesta,
  generarDesarrollo,
  mensajeError,
  cargarPropuestasBD,
  type PropuestaGuardada,
} from '../../api/propuestaFlujo';

export default function PropuestaGenerada() {
  const { usuario } = useAuth();
  const [propuesta, setPropuesta] = useState<PropuestaGuardada | null>(() =>
    leerPropuesta(usuario?.correo)
  );
  const [seleccion, setSeleccion] = useState<number | null>(null);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(true);

  // Lee la propuesta desde la base de datos para que se vea en cualquier equipo.
  // Si este navegador ya tiene una, se respeta (puede tener el tema recién elegido)
  // y solo se toma de la base de datos el estado que puso el asesor.
  useEffect(() => {
    let activo = true;
    cargarPropuestasBD()
      .then((lista) => {
        if (!activo) return;
        setPropuesta((actual) => {
          if (!actual) {
            const ultima = lista.find((p) => p.etapa === 'completa') ?? lista[0] ?? null;
            if (ultima) guardarPropuesta(usuario?.correo, ultima);
            return ultima;
          }
          const remota = lista.find((p) => p.id_formulario === actual.id_formulario);
          return remota ? { ...actual, estado_revision: remota.estado_revision } : actual;
        });
      })
      .catch(() => undefined)
      .finally(() => activo && setBuscando(false));
    return () => {
      activo = false;
    };
  }, [usuario?.correo]);

  async function elegirTema() {
    if (!propuesta || seleccion === null) return;
    setGenerando(true);
    setError(null);
    try {
      const nueva = await generarDesarrollo(
        usuario,
        propuesta.area_interes,
        propuesta.temas[seleccion],
        undefined,
        propuesta.temas
      );
      setPropuesta(nueva);
    } catch (err: any) {
      setError(
        mensajeError(err, 'No se pudo generar el desarrollo del tema. Intenta de nuevo en unos minutos.')
      );
    } finally {
      setGenerando(false);
    }
  }

  function cambiarDeTema() {
    if (!propuesta) return;
    const ok = window.confirm(
      'Se descartará el desarrollo actual y podrás elegir otro de los temas sugeridos. ¿Continuar?'
    );
    if (!ok) return;
    const vuelta: PropuestaGuardada = {
      ...propuesta,
      etapa: 'temas',
      tema_elegido: null,
      desarrollo: null,
    };
    guardarPropuesta(usuario?.correo, vuelta);
    setPropuesta(vuelta);
    setSeleccion(null);
    setError(null);
  }

  /* ---------------- Sin propuesta ---------------- */
  if (!propuesta && buscando) {
    return <p className="text-slate-soft">Buscando tu propuesta…</p>;
  }
  if (!propuesta) {
    return (
      <div className="folio p-8 max-w-xl">
        <h2 className="text-xl mb-2">Sin propuesta disponible</h2>
        <p className="text-slate-soft text-[15px] mb-6">
          Todavía no has generado una propuesta. Empieza desde "Nuevo formulario".
        </p>
        <Link to="/estudiante/formulario" className="btn-primary inline-flex">
          Ir al formulario
        </Link>
      </div>
    );
  }

  /* ---------------- Etapa 1: elegir tema ---------------- */
  if (propuesta.etapa === 'temas') {
    return (
      <div className="max-w-3xl">
        <p className="text-[13px] tracking-wide text-gold-dark mb-2">Paso 1 de 2</p>
        <h1 className="text-3xl mb-2">Elige tu tema de tesis</h1>
        <p className="text-slate-soft text-[15px] mb-8 leading-relaxed">
          Estos son los temas que el sistema propone para el área de{' '}
          <strong>{propuesta.area_interes}</strong>. Elige el que más te convenza y con él se
          generará el planteamiento del problema, los objetivos y la justificación.
        </p>

        <div className="space-y-3 mb-6">
          {propuesta.temas.map((tema, i) => {
            const activa = seleccion === i;
            return (
              <button
                key={i}
                type="button"
                disabled={generando}
                onClick={() => setSeleccion(i)}
                className={`w-full text-left flex gap-4 rounded-sm border px-5 py-4 transition-colors ${
                  activa ? 'border-gold-dark bg-white' : 'border-paper-300 bg-transparent'
                }`}
              >
                <span className="text-gold-dark font-serif text-[18px] mt-0.5">{i + 1}</span>
                <span className="text-[16px] leading-relaxed">{tema}</span>
              </button>
            );
          })}
        </div>

        {error && (
          <p className="text-[13.5px] text-danger bg-danger/8 border border-danger/20 rounded-sm px-3.5 py-2.5 mb-4">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-paper-300">
          <p className="text-[13px] text-slate-soft">
            {generando
              ? 'Generando el desarrollo… puede tardar hasta un minuto.'
              : seleccion === null
              ? 'Selecciona un tema para continuar.'
              : 'Tema seleccionado.'}
          </p>
          <button
            type="button"
            className="btn-gold"
            disabled={seleccion === null || generando}
            onClick={elegirTema}
          >
            {generando ? 'Generando…' : 'Generar desarrollo con este tema'}
          </button>
        </div>
      </div>
    );
  }

  /* ---------------- Etapa 2: propuesta completa ---------------- */
  const d = propuesta.desarrollo;
  return (
    <div className="max-w-3xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-[13px] tracking-wide text-gold-dark mb-2">Paso 2 de 2</p>
          <h1 className="text-3xl">Anteproyecto de tesis</h1>
        </div>
        <EstadoPill estado={propuesta.estado_revision ?? 'generada'} />
      </div>

      <section className="folio mb-6">
        <div className="folio-header">
          <h2 className="text-lg m-0">Tema de tesis</h2>
        </div>
        <p className="p-6 text-[16px] leading-relaxed">{propuesta.tema_elegido}</p>
      </section>

      {d && (
        <>
          <section className="folio mb-6">
            <div className="folio-header">
              <h2 className="text-lg m-0">Planteamiento del problema</h2>
            </div>
            <p className="p-6 text-[15px] leading-relaxed text-slate">{d.planteamiento_problema}</p>
          </section>

          <section className="folio mb-6">
            <div className="folio-header">
              <h2 className="text-lg m-0">Objetivo general</h2>
            </div>
            <p className="p-6 text-[15px] leading-relaxed text-slate">{d.objetivo_general}</p>
          </section>

          <section className="folio mb-6">
            <div className="folio-header">
              <h2 className="text-lg m-0">Objetivos específicos</h2>
            </div>
            <div className="p-6 space-y-2.5">
              {d.objetivos_especificos.map((obj, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-gold-dark font-serif text-[15px] mt-0.5">{i + 1}</span>
                  <p className="text-[15px] leading-relaxed">{obj}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="folio mb-8">
            <div className="folio-header">
              <h2 className="text-lg m-0">Justificación</h2>
            </div>
            <p className="p-6 text-[15px] leading-relaxed text-slate">{d.justificacion}</p>
          </section>
        </>
      )}

      <div className="flex items-center gap-3 pt-2 border-t border-paper-300">
        {propuesta.temas.length > 1 && (
          <button type="button" className="btn-primary" onClick={cambiarDeTema}>
            Elegir otro tema
          </button>
        )}
        <Link to="/estudiante/formulario" className="btn-primary inline-flex">
          Nuevo formulario
        </Link>
      </div>
    </div>
  );
}
