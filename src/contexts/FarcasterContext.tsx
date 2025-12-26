import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

interface FarcasterUser {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
}

interface FarcasterContextType {
  isSDKLoaded: boolean;
  isInMiniApp: boolean;
  user: FarcasterUser | null;
  isAuthenticated: boolean;
  error: string | null;
}

const FarcasterContext = createContext<FarcasterContextType>({
  isSDKLoaded: false,
  isInMiniApp: false,
  user: null,
  isAuthenticated: false,
  error: null,
});

export const useFarcaster = () => useContext(FarcasterContext);

interface FarcasterProviderProps {
  children: ReactNode;
}

export const FarcasterProvider = ({ children }: FarcasterProviderProps) => {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [isInMiniApp, setIsInMiniApp] = useState(false);
  const [user, setUser] = useState<FarcasterUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializeSDK = useCallback(async () => {
    try {
      // Check if we're in a Farcaster mini app environment
      const context = await sdk.context;
      
      if (context && context.user) {
        setIsInMiniApp(true);
        
        // Extract user info from context
        const farcasterUser: FarcasterUser = {
          fid: context.user.fid,
          username: context.user.username,
          displayName: context.user.displayName,
          pfpUrl: context.user.pfpUrl,
        };
        
        setUser(farcasterUser);
        setIsAuthenticated(true);
        
        // Call ready to hide splash screen
        await sdk.actions.ready();
      } else {
        // Not in mini app context - still call ready if SDK is available
        setIsInMiniApp(false);
        try {
          await sdk.actions.ready();
        } catch {
          // Not in mini app environment, that's okay
        }
      }
      
      setIsSDKLoaded(true);
    } catch (err) {
      console.log('Farcaster SDK initialization:', err);
      setIsSDKLoaded(true);
      setIsInMiniApp(false);
      // Don't set error - this is expected outside mini app context
    }
  }, []);

  useEffect(() => {
    initializeSDK();
  }, [initializeSDK]);

  return (
    <FarcasterContext.Provider
      value={{
        isSDKLoaded,
        isInMiniApp,
        user,
        isAuthenticated,
        error,
      }}
    >
      {children}
    </FarcasterContext.Provider>
  );
};

export default FarcasterProvider;
