import React from 'react';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('App runtime error:', error, info);
  }

  handleReset = () => {
    try {
      localStorage.removeItem('userInfo');
    } catch {
      // Ignore localStorage failures and still reload.
    }
    window.location.href = '/auth/choose';
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: '#05070d',
          color: '#f8fafc',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        }}
      >
        <div
          style={{
            width: 'min(820px, 100%)',
            border: '1px solid rgba(248,113,113,0.35)',
            borderRadius: 16,
            padding: 20,
            background: 'rgba(127,29,29,0.18)',
          }}
        >
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>A runtime error occurred</h1>
          <p style={{ marginTop: 10, marginBottom: 0, color: 'rgba(248,250,252,0.86)' }}>
            The dashboard crashed while rendering. Use reset to clear stale session data and reopen the app.
          </p>
          <pre
            style={{
              marginTop: 14,
              background: 'rgba(2,6,23,0.6)',
              border: '1px solid rgba(148,163,184,0.25)',
              borderRadius: 10,
              padding: 12,
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              color: '#fda4af',
              fontSize: 12,
            }}
          >
            {String(this.state.error?.message || this.state.error || 'Unknown error')}
          </pre>
          <button
            type="button"
            onClick={this.handleReset}
            style={{
              marginTop: 10,
              borderRadius: 10,
              border: '1px solid rgba(251,191,36,0.5)',
              background: 'rgba(251,191,36,0.18)',
              color: '#fde68a',
              fontWeight: 700,
              padding: '10px 14px',
              cursor: 'pointer',
            }}
          >
            Reset Session And Reopen
          </button>
        </div>
      </div>
    );
  }
}

export default AppErrorBoundary;
