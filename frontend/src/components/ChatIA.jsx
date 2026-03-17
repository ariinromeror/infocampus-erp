import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Send, Bot, MessageCircle, Minus } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const CHAT_URL = `${API_BASE}/api/ia/chat`;

const ChatIA = () => {
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: 'Hola, soy Eva. Tengo acceso a tu información en tiempo real: notas, pagos, horarios y asistencia. ¿Qué necesitas?'
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                inputRef.current?.focus();
            }, 350);
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim() || loading) return;

        const userText = input.trim();
        setMessages(prev => [...prev, { role: 'user', content: userText }]);
        setInput('');
        setLoading(true);

        try {
            const savedUser = localStorage.getItem('campus_user');
            const userData = savedUser ? JSON.parse(savedUser) : null;
            const token = userData?.token;

            if (!token) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: 'Sesión no encontrada. Por favor, inicia sesión nuevamente.'
                }]);
                setLoading(false);
                return;
            }

            const historyPayload = messages.slice(1).slice(-8).map(m => ({
                role: m.role,
                content: m.content
            }));

            const response = await fetch(CHAT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    message: userText,
                    history: historyPayload,
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || data.error || 'Error del servidor');
            setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);

        } catch (error) {
            const msg = error.message || '';
            const content = msg.includes('sesión')
                ? msg
                : msg.includes('no configurada') || msg.includes('configuración')
                    ? 'El servicio de IA no está disponible en este momento. Contacta al administrador.'
                    : msg && msg !== 'Error del servidor'
                        ? msg
                        : 'En este momento no puedo procesar tu solicitud. Intenta de nuevo.';
            setMessages(prev => [...prev, { role: 'assistant', content }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return createPortal(
        <>
            <style>{`
                @keyframes chatSlideUp {
                    from { opacity: 0; transform: translateY(16px) scale(0.96); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes btnPulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(79,70,229,0.45); }
                    50% { box-shadow: 0 0 0 14px rgba(79,70,229,0); }
                }
                @keyframes typingDot {
                    0%, 60%, 100% { transform: translateY(0); opacity: 0.3; }
                    30% { transform: translateY(-5px); opacity: 1; }
                }
                .eva-chat-open { animation: chatSlideUp 0.35s cubic-bezier(0.16,1,0.3,1) forwards; display: flex !important; }
                .eva-chat-closed { display: none !important; }
                .eva-btn-pulse { animation: btnPulse 2.5s ease infinite; }
                .eva-dot:nth-child(1) { animation: typingDot 1.2s ease infinite; }
                .eva-dot:nth-child(2) { animation: typingDot 1.2s ease 0.2s infinite; }
                .eva-dot:nth-child(3) { animation: typingDot 1.2s ease 0.4s infinite; }
                .eva-scroll::-webkit-scrollbar { width: 3px; }
                .eva-scroll::-webkit-scrollbar-track { background: transparent; }
                .eva-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 99px; }
                .eva-textarea { outline: none !important; box-shadow: none !important; border: none !important; background: transparent; }
                .eva-textarea:focus { outline: none !important; box-shadow: none !important; }
                .eva-window {
                    position: fixed;
                    flex-direction: column;
                    overflow: hidden;
                    background: #ffffff;
                }
                .eva-trigger-btn {
                    position: fixed;
                    bottom: calc(24px + env(safe-area-inset-bottom, 0px));
                    right: 20px;
                    z-index: 9999;
                    width: 56px;
                    height: 56px;
                    border-radius: 18px;
                    background: #4f46e5;
                    border: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background 0.15s, transform 0.1s;
                    flex-shrink: 0;
                    touch-action: manipulation;
                    -webkit-tap-highlight-color: transparent;
                }
                .eva-trigger-btn:hover { background: #4338ca; }
                .eva-trigger-btn:active { transform: scale(0.93); background: #4338ca; }
                .eva-backdrop {
                    display: none;
                }
                .eva-close-btn {
                    position: relative; width: 32px; height: 32px; border-radius: 10px;
                    background: rgba(255,255,255,0.06); border: none; cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    transition: background 0.15s; touch-action: manipulation;
                    -webkit-tap-highlight-color: transparent;
                }
                .eva-close-btn:hover, .eva-close-btn:active { background: rgba(255,255,255,0.16); }
                @media (max-width: 767px) {
                    .eva-trigger-btn { bottom: calc(20px + env(safe-area-inset-bottom, 0px)); right: 16px; }
                    .eva-backdrop {
                        display: block; position: fixed; inset: 0;
                        background: rgba(0,0,0,0.45); z-index: 9998;
                        -webkit-tap-highlight-color: transparent;
                    }
                    .eva-window {
                        position: fixed !important;
                        top: 0 !important; left: 0 !important;
                        right: 0 !important; bottom: 0 !important;
                        width: 100% !important; height: 100% !important;
                        max-height: none !important; border-radius: 0 !important;
                        z-index: 9999 !important;
                    }
                    .eva-close-btn { width: 44px; height: 44px; border-radius: 14px; }
                }
                @media (min-width: 768px) {
                    .eva-window { bottom: 88px; right: 20px; z-index: 9999; width: 380px; height: 580px; max-height: calc(100dvh - 110px); border-radius: 24px; box-shadow: 0 24px 64px -8px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.06); }
                }
            `}</style>

            {!isOpen && (
                <button
                    className="eva-trigger-btn eva-btn-pulse"
                    onClick={() => setIsOpen(true)}
                    aria-label="Abrir chat con Eva"
                >
                    <MessageCircle style={{ width: 24, height: 24, color: '#fff' }} />
                    <span style={{
                        position: 'absolute', top: -3, right: -3,
                        width: 12, height: 12, borderRadius: '50%',
                        background: '#34d399', border: '2px solid #fff', display: 'block'
                    }} />
                </button>
            )}

            {isOpen && (
                <div
                    className="eva-backdrop"
                    onClick={() => setIsOpen(false)}
                    aria-hidden="true"
                />
            )}

            <div className={`eva-window ${isOpen ? 'eva-chat-open' : 'eva-chat-closed'}`}>

                <div style={{
                    position: 'relative', background: '#020617',
                    padding: '18px 20px', display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', flexShrink: 0, overflow: 'hidden'
                }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(67,56,202,0.5) 0%, #020617 60%)' }} />
                    <div style={{ position: 'absolute', top: 0, left: 0, width: 160, height: 160, background: 'rgba(99,102,241,0.18)', borderRadius: '50%', filter: 'blur(40px)', transform: 'translate(-50%,-50%)' }} />
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ position: 'relative' }}>
                            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(79,70,229,0.4)' }}>
                                <Bot style={{ width: 20, height: 20, color: '#fff' }} />
                            </div>
                            <span style={{ position: 'absolute', bottom: -2, right: -2, width: 10, height: 10, borderRadius: '50%', background: '#34d399', border: '2px solid #020617', display: 'block' }} />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ color: '#fff', fontWeight: 900, fontSize: 13, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Eva</span>
                                <span style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#818cf8', background: 'rgba(79,70,229,0.25)', padding: '2px 8px', borderRadius: 99 }}>IA</span>
                            </div>
                            <p style={{ color: '#475569', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', marginTop: 2 }}>Asistente Académica</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="eva-close-btn"
                        aria-label="Cerrar chat"
                    >
                        <Minus style={{ width: 18, height: 18, color: '#94a3b8' }} />
                    </button>
                </div>

                <div className="eva-scroll" style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 14, background: '#f8fafc' }}>
                    {messages.map((msg, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                            {msg.role === 'assistant' && (
                                <div style={{ width: 26, height: 26, borderRadius: 8, background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 8, marginTop: 2, flexShrink: 0, boxShadow: '0 2px 8px rgba(79,70,229,0.25)' }}>
                                    <Bot style={{ width: 14, height: 14, color: '#fff' }} />
                                </div>
                            )}
                            <div style={{
                                maxWidth: '75%', padding: '10px 14px',
                                borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                background: msg.role === 'user' ? '#020617' : '#ffffff',
                                color: msg.role === 'user' ? '#ffffff' : '#334155',
                                fontSize: 13.5, lineHeight: 1.55, fontWeight: 500,
                                boxShadow: msg.role === 'user' ? '0 2px 8px rgba(2,6,23,0.18)' : '0 1px 4px rgba(0,0,0,0.07)',
                                border: msg.role === 'assistant' ? '1px solid #e2e8f0' : 'none'
                            }}>
                                <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{msg.content}</p>
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                            <div style={{ width: 26, height: 26, borderRadius: 8, background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 8, marginTop: 2, flexShrink: 0 }}>
                                <Bot style={{ width: 14, height: 14, color: '#fff' }} />
                            </div>
                            <div style={{ background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderRadius: '18px 18px 18px 4px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 5 }}>
                                <span className="eva-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#818cf8', display: 'inline-block' }} />
                                <span className="eva-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#818cf8', display: 'inline-block' }} />
                                <span className="eva-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#818cf8', display: 'inline-block' }} />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div style={{ flexShrink: 0, background: '#fff', borderTop: '1px solid #f1f5f9', padding: '12px 14px calc(14px + env(safe-area-inset-bottom, 0px))' }}>
                    <div
                        style={{ display: 'flex', alignItems: 'flex-end', gap: 8, background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 16, padding: '10px 12px', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                        onFocusCapture={e => { e.currentTarget.style.borderColor = '#a5b4fc'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(165,180,252,0.25)'; }}
                        onBlurCapture={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => {
                                setInput(e.target.value);
                                e.target.style.height = 'auto';
                                e.target.style.height = Math.min(e.target.scrollHeight, 110) + 'px';
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder="Escribe tu consulta..."
                            className="eva-textarea"
                            rows={1}
                            disabled={loading}
                            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', resize: 'none', fontSize: 13.5, color: '#1e293b', fontWeight: 500, lineHeight: 1.5, maxHeight: 110, minHeight: 22, fontFamily: 'inherit' }}
                        />
                        <button
                            onClick={sendMessage}
                            disabled={loading || !input.trim()}
                            style={{ width: 32, height: 32, borderRadius: 10, border: 'none', background: loading || !input.trim() ? '#e2e8f0' : '#4f46e5', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s, transform 0.1s' }}
                            onMouseEnter={e => { if (input.trim() && !loading) e.currentTarget.style.background = '#4338ca'; }}
                            onMouseLeave={e => { if (input.trim() && !loading) e.currentTarget.style.background = '#4f46e5'; }}
                            onMouseDown={e => { if (input.trim() && !loading) e.currentTarget.style.transform = 'scale(0.92)'; }}
                            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                        >
                            <Send style={{ width: 14, height: 14, color: loading || !input.trim() ? '#94a3b8' : '#fff' }} />
                        </button>
                    </div>
                    <p style={{ textAlign: 'center', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#cbd5e1', marginTop: 8 }}>
                        Powered by Groq · Info Campus
                    </p>
                </div>
            </div>
        </>,
        document.body
    );
};

export default ChatIA;