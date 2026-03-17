import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm max-w-md w-full p-8 text-center space-y-5">
          <div className="flex justify-center">
            <span className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-red-50 text-red-500">
              <AlertTriangle size={28} strokeWidth={1.5} />
            </span>
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">
              Algo salió mal
            </h2>
            <p className="text-sm text-slate-500">
              Se produjo un error inesperado. Puedes intentar recargar la página.
            </p>
            {this.state.error?.message && (
              <p className="text-xs text-slate-400 font-mono bg-slate-50 rounded-lg px-3 py-2 mt-3 text-left break-all">
                {this.state.error.message}
              </p>
            )}
          </div>
          <button
            onClick={this.handleReload}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <RefreshCw size={15} strokeWidth={1.5} />
            Recargar página
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
