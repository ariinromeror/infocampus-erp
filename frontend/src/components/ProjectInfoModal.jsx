import React, { useState, useEffect } from 'react';
import { X, Mail, Linkedin, Github } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { SOBRE_INFOCAMPUS } from '../content/sobreInfocampus';

const ProjectInfoModal = ({ isOpen, onClose }) => {
  const [tab, setTab] = useState('sobre'); // 'sobre' | 'readme'
  const [lang, setLang] = useState('es'); // 'es' | 'en'
  const [readmeEs, setReadmeEs] = useState('');
  const [readmeEn, setReadmeEn] = useState('');
  const [loadingReadme, setLoadingReadme] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || tab !== 'readme') return;
    setLoadingReadme(true);
    Promise.all([
      fetch('/README_ES.md').then(r => r.text()).catch(() => ''),
      fetch('/README_EN.md').then(r => r.text()).catch(() => ''),
    ]).then(([es, en]) => {
      setReadmeEs(es);
      setReadmeEn(en);
      setLoadingReadme(false);
    });
  }, [isOpen, tab]);

  if (!isOpen) return null;

  const { pitch, porQueDestaca, tech, modulosPorRol, desarrollador } = SOBRE_INFOCAMPUS;
  const readmeContent = lang === 'es' ? readmeEs : readmeEn;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex gap-2">
            <button
              onClick={() => setTab('sobre')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${tab === 'sobre' ? 'bg-[#0A66C2] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              Sobre el proyecto
            </button>
            <button
              onClick={() => setTab('readme')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${tab === 'readme' ? 'bg-[#0A66C2] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              README
            </button>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'sobre' && (
            <div className="space-y-6">
              <p className="text-slate-700 leading-relaxed">{pitch}</p>
              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-2">Por qué destaca</h4>
                <ul className="space-y-1.5 text-slate-600 text-sm">
                  {porQueDestaca.map((item, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-slate-400">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-2">Tech</h4>
                <div className="flex flex-wrap gap-2">
                  {tech.map((t) => (
                    <span key={t} className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-2">Módulos por rol</h4>
                <div className="space-y-2 text-sm">
                  {modulosPorRol.map((m) => (
                    <div key={m.rol} className="border-l-2 border-slate-200 pl-3">
                      <span className="font-semibold text-slate-800">{m.rol}:</span>
                      <span className="text-slate-600 ml-1">{m.features}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pt-4 border-t border-slate-200">
                <h4 className="text-sm font-bold text-slate-800 mb-2">Desarrollador</h4>
                <p className="font-semibold text-slate-900">{desarrollador.nombre}</p>
                <p className="text-slate-600 text-sm">{desarrollador.rol}</p>
                <div className="flex flex-wrap gap-3 mt-2">
                  <a href={`mailto:${desarrollador.email}`} className="flex items-center gap-1.5 text-sm text-[#0A66C2] hover:underline">
                    <Mail size={14} /> {desarrollador.email}
                  </a>
                  <a href={desarrollador.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-[#0A66C2] hover:underline">
                    <Linkedin size={14} /> LinkedIn
                  </a>
                  <a href={desarrollador.github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-[#0A66C2] hover:underline">
                    <Github size={14} /> GitHub
                  </a>
                </div>
              </div>
            </div>
          )}

          {tab === 'readme' && (
            <div>
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setLang('es')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${lang === 'es' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  Español
                </button>
                <button
                  onClick={() => setLang('en')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${lang === 'en' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  English
                </button>
              </div>
              {loadingReadme ? (
                <p className="text-slate-500 text-sm">Cargando...</p>
              ) : (
                <div className="text-slate-700 text-sm [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-4 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-1 [&_pre]:bg-slate-100 [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_table]:border [&_table]:border-slate-200 [&_th]:border [&_th]:border-slate-200 [&_th]:px-2 [&_th]:py-1 [&_td]:border [&_td]:border-slate-200 [&_td]:px-2 [&_td]:py-1">
                  <ReactMarkdown>{readmeContent || (lang === 'es' ? 'No disponible.' : 'Not available.')}</ReactMarkdown>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectInfoModal;
