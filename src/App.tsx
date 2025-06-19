import React, { Suspense, useState, useEffect } from 'react';
import './index.css';

// Simple loading component
const LoadingScreen = () => (
  <div className="h-screen w-screen overflow-hidden bg-gray-900 flex items-center justify-center">
    <div className="text-center text-white">
      <div className="text-6xl mb-4">🗺️</div>
      <h1 className="text-2xl font-bold mb-2">Map Field Collector</h1>
      <p className="text-gray-300 mb-4">Loading application...</p>
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent mx-auto"></div>
    </div>
  </div>
);

// Simple error component
const ErrorScreen = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <div className="h-screen w-screen overflow-hidden bg-gray-900 flex items-center justify-center">
    <div className="text-center text-white max-w-md mx-4">
      <div className="text-6xl mb-4">⚠️</div>
      <h1 className="text-2xl font-bold mb-2">Application Error</h1>
      <p className="text-gray-300 mb-4">
        {error || 'Something went wrong. Please try refreshing the page.'}
      </p>
      <button
        onClick={onRetry}
        className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors duration-200"
      >
        Refresh Page
      </button>
    </div>
  </div>
);

// Lazy load the main component
const MapPlayground = React.lazy(() => 
  import('./components/MapPlayground').catch(() => ({
    default: () => (
      <ErrorScreen 
        error="Failed to load map component. Please check your internet connection and refresh."
        onRetry={() => window.location.reload()}
      />
    )
  }))
);

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error; errorInfo?: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Application Error:', error, errorInfo);
    this.setState({
      error,
      errorInfo: errorInfo.componentStack
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorScreen
          error={this.state.error?.message || 'Unknown error occurred'}
          onRetry={() => {
            this.setState({ hasError: false, error: undefined });
            window.location.reload();
          }}
        />
      );
    }

    return this.props.children;
  }
}

function App() {
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    // Check if required dependencies are available
    const checkDependencies = async () => {
      try {
        // Check if Leaflet is available
        if (typeof window !== 'undefined') {
          // Wait a bit for external scripts to load
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Check for required globals
          if (!window.L) {
            throw new Error('Leaflet library not loaded');
          }
          
          setIsReady(true);
        }
      } catch (error) {
        console.error('Dependency check failed:', error);
        setInitError(error instanceof Error ? error.message : 'Failed to initialize application');
      }
    };

    checkDependencies();
  }, []);

  if (initError) {
    return (
      <ErrorScreen
        error={initError}
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (!isReady) {
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary>
      <div className="h-screen w-screen overflow-hidden bg-gray-900">
        <Suspense fallback={<LoadingScreen />}>
          <MapPlayground />
        </Suspense>
      </div>
    </ErrorBoundary>
  );
}

export default App;