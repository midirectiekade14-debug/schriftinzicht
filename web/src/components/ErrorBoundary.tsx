import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="page" style={{ textAlign: 'center', paddingTop: '4rem' }}>
          <div className="error-box">
            <h2>Er ging iets mis</h2>
            <p>Er is een onverwachte fout opgetreden.</p>
            <button
              className="landing-cta"
              style={{ marginTop: '1.5rem' }}
              onClick={() => {
                this.setState({ hasError: false });
                window.location.href = import.meta.env.BASE_URL || '/';
              }}
            >
              Terug naar home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
