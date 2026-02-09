import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, X, Minimize2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ChatIA = () => {
    const { user } = useAuth();
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: '¡Hola! Soy tu asistente académico de Info Campus. Puedo ayudarte con consultas sobre tus notas, pagos, horarios y más. ¿En qué puedo ayudarte?'
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const messagesEndRef = useRef(null);

    const SUPABASE_FUNCTION_URL = import.meta.env.VITE_SUPABASE_FUNCTION_URL || 'https://YOUR_PROJECT.supabase.co/functions/v1/chat';

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim() || loading) return;

        const userMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const userData = localStorage.getItem('campus_user');
            const token = userData ? JSON.parse(userData).access : '';

            const response = await fetch(SUPABASE_FUNCTION_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    message: input,
                    history: messages.slice(-6) // Solo últimos 6 mensajes para contexto
                })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Error en la respuesta');
            }

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.response
            }]);
        } catch (error) {
            console.error('Error en chat:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Lo siento, hubo un error al procesar tu mensaje. Por favor intenta de nuevo.'
            }]);
        } finally {
            setLoading(false);
        }
    };

    // Botón flotante cuando está cerrado
    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white p-3 sm:p-4 rounded-full shadow-2xl transition-all z-50 flex items-center gap-2 group animate-bounce hover:animate-none"
                aria-label="Abrir chat IA"
            >
                <Bot size={24} />
                <span className="hidden sm:group-hover:inline-block font-bold text-sm whitespace-nowrap pr-2">
                    Asistente IA
                </span>
            </button>
        );
    }

    // Chat abierto - Responsive
    return (
        <div className="fixed inset-0 sm:inset-auto sm:bottom-4 sm:right-4 sm:w-96 sm:h-[600px] bg-white sm:rounded-2xl shadow-2xl border border-slate-200 flex flex-col z-50 animate-in fade-in zoom-in duration-300">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-4 sm:rounded-t-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <Bot className="text-white" size={20} />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-white font-black text-sm uppercase tracking-tight truncate">Asistente IA</h3>
                        <p className="text-indigo-200 text-xs truncate">{user?.first_name || 'Campus Elite'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsOpen(false)}
                        className="text-white hover:bg-white/10 p-2 rounded-lg transition-colors"
                        aria-label="Cerrar chat"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`flex gap-2 sm:gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        {msg.role === 'assistant' && (
                            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <Bot className="text-indigo-600" size={16} />
                            </div>
                        )}
                        
                        <div
                            className={`max-w-[85%] sm:max-w-[80%] p-3 rounded-2xl ${
                                msg.role === 'user'
                                    ? 'bg-indigo-600 text-white rounded-br-sm'
                                    : 'bg-white text-slate-700 border border-slate-200 rounded-bl-sm shadow-sm'
                            }`}
                        >
                            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                        </div>

                        {msg.role === 'user' && (
                            <div className="w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center flex-shrink-0">
                                <User className="text-white" size={16} />
                            </div>
                        )}
                    </div>
                ))}
                
                {loading && (
                    <div className="flex gap-3 justify-start">
                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                            <Bot className="text-indigo-600" size={16} />
                        </div>
                        <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-bl-sm shadow-sm">
                            <Loader2 className="animate-spin text-indigo-600" size={16} />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-slate-200 bg-white sm:rounded-b-2xl">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                        placeholder="Pregunta sobre notas, pagos..."
                        className="flex-1 px-3 sm:px-4 py-2 sm:py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        disabled={loading}
                        maxLength={500}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={loading || !input.trim()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 sm:p-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                        aria-label="Enviar mensaje"
                    >
                        <Send size={18} />
                    </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 text-center">
                    Powered by Groq AI • Campus Elite ERP
                </p>
            </div>
        </div>
    );
};

export default ChatIA;