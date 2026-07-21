import { Component } from "react";
import { getUserSafeMessage, logInternalError } from "../utils/appErrors";

/**
 * Error Boundary seguro: nunca muestra stack traces ni mensajes técnicos.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    logInternalError(
      {
        code: "SECTION_RENDER",
        technicalMessage: error?.message,
        cause: error,
        componentStack: info?.componentStack,
      },
      { context: this.props.context || "ErrorBoundary" }
    );
  }

  handleRetry = () => {
    this.setState({ hasError: false });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          role="alert"
          className="mx-auto max-w-md rounded-2xl border border-borderColor bg-bgSecondary p-6 text-center shadow-sm"
        >
          <p className="text-base font-semibold text-textPrimary">
            {this.props.title || getUserSafeMessage("SECTION_RENDER")}
          </p>
          <p className="mt-2 text-sm text-textSecondary">
            Puedes reintentar o volver a la malla. Tus datos guardados no se eliminan.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.handleRetry}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
            >
              Reintentar
            </button>
            {this.props.onClearModule && (
              <button
                type="button"
                onClick={() => {
                  this.props.onClearModule();
                  this.setState({ hasError: false });
                }}
                className="rounded-xl border border-borderColor px-4 py-2 text-sm font-medium text-textSecondary hover:text-textPrimary"
              >
                Limpiar datos temporales
              </button>
            )}
            {this.props.onBack && (
              <button
                type="button"
                onClick={this.props.onBack}
                className="rounded-xl border border-borderColor px-4 py-2 text-sm font-medium text-textSecondary hover:text-textPrimary"
              >
                Volver a la malla
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
