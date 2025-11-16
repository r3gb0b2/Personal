import React from 'react';
import { ExclamationCircleIcon } from './icons';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  // FIX: Switched to class property for state initialization, which is a more modern and concise syntax.
  // This also resolves issues where `this.state` and `this.props` were not being correctly recognized on the component instance.
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="flex items-center justify-center min-h-screen bg-brand-light p-4">
          <div className="w-full max-w-lg p-8 space-y-6 bg-white rounded-xl shadow-2xl text-center">
            <ExclamationCircleIcon className="w-16 h-16 mx-auto text-red-500" />
            <h1 className="text-2xl font-bold text-brand-dark">Ocorreu um erro inesperado.</h1>
            <p className="text-gray-600">
              A aplicação encontrou um problema e não pôde continuar. Por favor, tente recarregar a página. Se o problema persistir, contate o suporte.
            </p>
            {this.state.error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md text-left">
                <h2 className="font-semibold text-red-800">Detalhes do Erro (Código do Erro):</h2>
                <pre className="mt-2 text-sm text-red-700 whitespace-pre-wrap font-mono">
                  {this.state.error.message}
                </pre>
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="mt-4 w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent"
            >
              Recarregar a Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
