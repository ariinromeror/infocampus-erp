import React, { useState } from 'react';
import { useEffect } from 'react';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import Loader from '../../../components/shared/Loader';
import { BookOpen, MapPin, Hash } from 'lucide-react';

const MisMateriasPage = () => {
  const { user } = useAuth();
  const [inscripciones, setInscripciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      if (!user?.id) return;
      try {
        setLoading(true);
        const res = await api.get('/inscripciones/estudiante/mis-inscripciones');
        setInscripciones(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [user?.id]);

  if (loading) return <Loader />;
  if (error) return (
    <div className="p-10 bg-red-50 border border-red-100 rounded-2xl text-red-600">
      <p className="text-[10px] font-black uppercase tracking-widest">Error al cargar materias</p>
    </div>
  );

  return (
    <div className="space-y-8 overflow-x-hidden">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter leading-tight text-slate-900">
          Mis <span className="text-indigo-600">Materias</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Asignaturas inscritas del período activo
        </p>
      </div>

      {inscripciones.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-20 text-center shadow-sm">
          <p className="text-base font-medium text-slate-500">Sin inscripciones registradas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {inscripciones.map((item) => {
            const notaVal = item.nota_final != null ? parseFloat(item.nota_final).toFixed(1) : null;
            const aprobado = notaVal != null && parseFloat(notaVal) >= 7;

            return (
              <div key={item.id} className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-6">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                    <BookOpen size={22} />
                  </div>
                  {notaVal != null && (
                    <span className={`text-xs font-black uppercase tracking-tighter px-4 py-1 border-2 ${
                      aprobado
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-amber-500 text-amber-500'
                    }`}>
                      {notaVal}
                    </span>
                  )}
                  {notaVal == null && (
                    <span className="text-xs font-black uppercase tracking-tighter px-4 py-1 border-2 border-indigo-300 text-indigo-400">
                      {item.estado || 'Activo'}
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tight leading-tight mb-1 truncate">
                  {item.materia}
                </h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">
                  {item.codigo}
                </p>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Hash size={13} />
                    <span className="font-bold uppercase">Sección {item.seccion}</span>
                  </div>
                  {item.aula && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <MapPin size={13} />
                      <span className="font-bold uppercase">{item.aula}</span>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-6 border-t border-slate-50 flex justify-between items-center">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Período</p>
                    <p className="text-sm font-black text-slate-900 italic">{item.periodo}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Créditos</p>
                    <p className="text-sm font-black text-slate-900 italic">{item.creditos}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MisMateriasPage;