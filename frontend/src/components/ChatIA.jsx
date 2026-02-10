import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, X, MessageCircle, Sparkles, User, Loader2, ChevronDown } from 'lucide-react';
import api from '../api'; // Importamos la instancia de Axios configurada

const ChatIA = () => {
    // Estado inicial con mensaje de bienvenida
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: '¡Hola! Soy Esmeralda, tu asistente personal de Info Campus. 💎\n\nPuedo ver tus notas, horarios y estado de cuenta en tiempo real. ¿En qué te ayudo hoy?'
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Scroll automático al último mensaje
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
            // Foco automático al abrir para mejorar UX
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [messages, isOpen]);

    const sendMessage = async () => {
        if (!input.trim() || loading) return;

        const userText = input.trim();
        const userMessage = { role: 'user', content: userText };
        
        // 1. UI Optimista: Mostramos el mensaje del usuario inmediatamente
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            // 2. Preparamos el historial (Limpiamos datos innecesarios de React)
            // Excluimos el mensaje de bienvenida para ahorrar tokens y enviamos los últimos 10
            const historyPayload = messages.slice(1).slice(-10).map(m => ({
                role: m.role,
                content: m.content
            }));

            // 3. Llamada segura al Backend (El token va automático por api.js)
            const response = await api.post('/chat', {
                message: userText,
                history: historyPayload
            });

            // 4. Respuesta de Esmeralda
            const botResponse = { 
                role: 'assistant', 
                content: response.data.response 
            };
            
            setMessages(prev => [...prev, botResponse]);

        } catch (error) {
            console.error("Error en Esmeralda:", error);
            // Manejo de errores elegante
            let errorMsg = 'Lo siento, tuve un pequeño problema de conexión. ¿Podrías repetirlo? 😅';
            
            if (error.response?.status === 401) {
                errorMsg = 'Parece que tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
            }

            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: errorMsg
            }]);
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

    return (
        <div className="fixed bottom-6 right-6 z-[9999] font-sans">
            {/* --- BOTÓN FLOTANTE (LAUNCHER) --- */}
            <div className={`transition-all duration-500 transform ${isOpen ? 'scale-0 opacity-0 translate-y-10' : 'scale-100 opacity-100 translate-y-0'}`}>
                <button
                    onClick={() => setIsOpen(true)}
                    className="group relative flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 shadow-[0_8px_30px_rgb(79,70,229,0.4)] hover:shadow-[0_8px_40px_rgb(79,70,229,0.6)] transition-all duration-300 hover:scale-110 active:scale-95"
                >
                    {/* Efecto de onda (Ping) */}
                    <span className="absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-20 animate-ping"></span>
                    <MessageCircle className="text-white w-8 h-8 drop-shadow-md group-hover:rotate-12 transition-transform duration-300" />
                    
                    {/* Badge de notificación */}
                    <span className="absolute top-0 right-0 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white"></span>
                    </span>
                </button>
            </div>

            {/* --- VENTANA DEL CHAT --- */}
            <div className={`
                fixed bottom-6 right-6 w-[90vw] sm:w-[400px] h-[600px] max-h-[85vh] 
                bg-white/95 backdrop-blur-xl border border-white/20 
                rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] 
                flex flex-col overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] origin-bottom-right
                ${isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-0 opacity-0 translate-y-20 pointer-events-none'}
            `}>
                
                {/* 1. HEADER PREMIUM */}
                <div className="relative bg-gradient-to-r from-indigo-700 via-violet-700 to-fuchsia-700 p-6 flex items-center justify-between shrink-0 overflow-hidden">
                    {/* Efectos de fondo del header */}
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10"></div>
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>

                    <div className="flex items-center gap-4 relative z-10">
                        <div className="relative">
                            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-inner">
                                <Bot className="text-white w-7 h-7" />
                            </div>
                            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-400 border-2 border-indigo-700 rounded-full animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]"></div>
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg tracking-tight leading-tight flex items-center gap-1">
                                Esmeralda <Sparkles className="w-3 h-3 text-yellow-300" />
                            </h3>
                            <p className="text-indigo-100 text-xs font-medium opacity-90">IA Académica • En línea</p>
                        </div>
                    </div>

                    <button 
                        onClick={() => setIsOpen(false)}
                        className="relative z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors backdrop-blur-sm"
                    >
                        <ChevronDown className="w-5 h-5" />
                    </button>
                </div>

                {/* 2. AREA DE MENSAJES */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50 scroll-smooth">
                    {messages.map((msg, idx) => (
                        <div 
                            key={idx} 
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 fade-in duration-300`}
                        >
                            <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                
                                {/* Avatar pequeño en el mensaje */}
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-indigo-100' : 'bg-gradient-to-br from-indigo-500 to-violet-500'}`}>
                                    {msg.role === 'user' ? <User className="w-4 h-4 text-indigo-600" /> : <Bot className="w-4 h-4 text-white" />}
                                </div>

                                {/* Burbuja del mensaje */}
                                <div className={`
                                    relative p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm
                                    ${msg.role === 'user' 
                                        ? 'bg-indigo-600 text-white rounded-tr-none' 
                                        : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'}
                                `}>
                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Indicador de "Escribiendo..." */}
                    {loading && (
                        <div className="flex justify-start animate-in fade-in duration-300">
                            <div className="flex gap-3 items-end">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-sm">
                                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                                </div>
                                <div className="bg-white border border-slate-100 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex gap-1.5 items-center">
                                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* 3. INPUT AREA */}
                <div className="p-4 bg-white border-t border-slate-100/80 backdrop-blur-sm relative z-20">
                    <div className="relative flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-[1.5rem] p-1.5 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all duration-300">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Escribe tu consulta aquí..."
                            className="w-full bg-transparent border-none focus:ring-0 text-slate-700 text-sm px-4 py-3 max-h-32 resize-none placeholder:text-slate-400"
                            rows={1}
                            disabled={loading}
                        />
                        <button
                            onClick={sendMessage}
                            disabled={loading || !input.trim()}
                            className="p-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-full transition-all duration-200 hover:scale-105 active:scale-95 shadow-md disabled:shadow-none shrink-0"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="text-center mt-2">
                        <p className="text-[10px] text-slate-400 font-medium">
                            Powered by <span className="text-indigo-500 font-bold">Groq AI</span> • Info Campus
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatIA;