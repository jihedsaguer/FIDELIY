import { createContext, useContext, useState, type ReactNode } from 'react';

interface ScannerContextType {
  isScannerOpen: boolean;
  openScanner: () => void;
  closeScanner: () => void;
}

const ScannerContext = createContext<ScannerContextType | undefined>(undefined);

interface ScannerProviderProps {
  children: ReactNode;
}

export function ScannerProvider({ children }: ScannerProviderProps) {
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const openScanner = () => {
    setIsScannerOpen(true);
  };

  const closeScanner = () => {
    setIsScannerOpen(false);
  };

  return (
    <ScannerContext.Provider value={{ isScannerOpen, openScanner, closeScanner }}>
      {children}
      {/* The ScannerModal will be rendered by AppLayout or a wrapper */}
    </ScannerContext.Provider>
  );
}

export function useScanner() {
  const context = useContext(ScannerContext);
  if (!context) {
    throw new Error('useScanner must be used within a ScannerProvider');
  }
  return context;
}

// Helper component to provide scanner context
export function withScannerContext(Component: React.ComponentType) {
  return function WrappedComponent(props: any) {
    return (
      <ScannerProvider>
        <Component {...props} />
      </ScannerProvider>
    );
  };
}
