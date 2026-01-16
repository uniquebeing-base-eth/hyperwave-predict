
import { useState, useEffect, useCallback, useRef } from 'react';

interface PriceData {
  price: number;
  change24h: number;
  priceHistory: { time: number; price: number }[];
}

// Multiple API sources for redundancy
const API_SOURCES = {
  coingecko: {
    price: 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true',
    history: 'https://api.coingecko.com/api/v3/coins/ethereum/market_chart?vs_currency=usd&days=1',
  },
  binance: {
    price: 'https://api.binance.com/api/v3/ticker/24hr?symbol=ETHUSDT',
    klines: 'https://api.binance.com/api/v3/klines?symbol=ETHUSDT&interval=1h&limit=24',
  },
  coincap: {
    price: 'https://api.coincap.io/v2/assets/ethereum',
    history: 'https://api.coincap.io/v2/assets/ethereum/history?interval=h1',
  },
};

export const useEthPrice = () => {
  const [data, setData] = useState<PriceData>({
    price: 0,
    change24h: 0,
    priceHistory: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastSuccessfulPriceRef = useRef(0);

  // Fetch from CoinGecko
  const fetchFromCoinGecko = async (): Promise<{ price: number; change24h: number } | null> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(API_SOURCES.coingecko.price, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error('CoinGecko failed');
      
      const result = await response.json();
      if (result.ethereum) {
        return {
          price: result.ethereum.usd,
          change24h: result.ethereum.usd_24h_change || 0,
        };
      }
      return null;
    } catch {
      console.log('CoinGecko price fetch failed, trying fallback...');
      return null;
    }
  };

  // Fetch from Binance (no API key needed)
  const fetchFromBinance = async (): Promise<{ price: number; change24h: number } | null> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(API_SOURCES.binance.price, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error('Binance failed');
      
      const result = await response.json();
      if (result.lastPrice) {
        return {
          price: parseFloat(result.lastPrice),
          change24h: parseFloat(result.priceChangePercent) || 0,
        };
      }
      return null;
    } catch {
      console.log('Binance price fetch failed, trying fallback...');
      return null;
    }
  };

  // Fetch from CoinCap (no API key needed)
  const fetchFromCoinCap = async (): Promise<{ price: number; change24h: number } | null> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(API_SOURCES.coincap.price, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error('CoinCap failed');
      
      const result = await response.json();
      if (result.data) {
        return {
          price: parseFloat(result.data.priceUsd),
          change24h: parseFloat(result.data.changePercent24Hr) || 0,
        };
      }
      return null;
    } catch {
      console.log('CoinCap price fetch failed');
      return null;
    }
  };

  // Fetch price history from CoinGecko
  const fetchHistoryFromCoinGecko = async (): Promise<{ time: number; price: number }[] | null> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(API_SOURCES.coingecko.history, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error('CoinGecko history failed');
      
      const result = await response.json();
      if (result.prices && result.prices.length > 0) {
        return result.prices.slice(-24).map((point: [number, number]) => ({
          time: point[0],
          price: point[1],
        }));
      }
      return null;
    } catch {
      console.log('CoinGecko history fetch failed, trying fallback...');
      return null;
    }
  };

  // Fetch price history from Binance
  const fetchHistoryFromBinance = async (): Promise<{ time: number; price: number }[] | null> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(API_SOURCES.binance.klines, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error('Binance klines failed');
      
      const result = await response.json();
      if (result && result.length > 0) {
        return result.map((kline: any[]) => ({
          time: kline[0], // Open time
          price: parseFloat(kline[4]), // Close price
        }));
      }
      return null;
    } catch {
      console.log('Binance history fetch failed, trying fallback...');
      return null;
    }
  };

  // Fetch price history from CoinCap
  const fetchHistoryFromCoinCap = async (): Promise<{ time: number; price: number }[] | null> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(API_SOURCES.coincap.history, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error('CoinCap history failed');
      
      const result = await response.json();
      if (result.data && result.data.length > 0) {
        return result.data.slice(-24).map((point: { time: number; priceUsd: string }) => ({
          time: point.time,
          price: parseFloat(point.priceUsd),
        }));
      }
      return null;
    } catch {
      console.log('CoinCap history fetch failed');
      return null;
    }
  };

  const fetchCurrentPrice = useCallback(async () => {
    // Try each source in order until one succeeds
    let priceData = await fetchFromCoinGecko();
    
    if (!priceData) {
      priceData = await fetchFromBinance();
    }
    
    if (!priceData) {
      priceData = await fetchFromCoinCap();
    }
    
    if (priceData) {
      lastSuccessfulPriceRef.current = priceData.price;
      setData(prev => ({
        ...prev,
        price: priceData.price,
        change24h: priceData.change24h,
      }));
      setError(null);
      return true;
    }
    
    // All sources failed
    setError('Failed to fetch price from all sources');
    return false;
  }, []);

  const fetchPriceHistory = useCallback(async () => {
    // Try each source in order until one succeeds
    let history = await fetchHistoryFromCoinGecko();
    
    if (!history) {
      history = await fetchHistoryFromBinance();
    }
    
    if (!history) {
      history = await fetchHistoryFromCoinCap();
    }
    
    if (history && history.length > 0) {
      lastSuccessfulPriceRef.current = history[history.length - 1].price;
      
      setData(prev => ({
        ...prev,
        priceHistory: history,
        price: prev.price || history[history.length - 1].price,
      }));
      
      setError(null);
      setIsLoading(false);
      return true;
    }
    
    // All sources failed
    setError('Failed to fetch history from all sources');
    setIsLoading(false);
    return false;
  }, []);

  // Initial fetch
  useEffect(() => {
    const initFetch = async () => {
      await Promise.all([fetchCurrentPrice(), fetchPriceHistory()]);
    };
    
    initFetch();
  }, [fetchCurrentPrice, fetchPriceHistory]);

  // Update price every 15 seconds
  useEffect(() => {
    const priceInterval = setInterval(fetchCurrentPrice, 15000);
    return () => clearInterval(priceInterval);
  }, [fetchCurrentPrice]);

  // Simulate real-time updates between API calls
  useEffect(() => {
    if (data.price === 0 || data.priceHistory.length === 0) return;
    
    const interval = setInterval(() => {
      setData(prev => {
        const currentPrice = prev.price || lastSuccessfulPriceRef.current;
        // Small random variance to simulate live updates
        const variance = (Math.random() - 0.5) * 0.0001 * currentPrice;
        const newPrice = currentPrice + variance;
        
        // Update price history with new simulated point
        const newHistory = [...prev.priceHistory.slice(1)];
        newHistory.push({
          time: Date.now(),
          price: newPrice,
        });
        
        return {
          ...prev,
          price: newPrice,
          priceHistory: newHistory,
        };
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [data.price, data.priceHistory.length]);

  return {
    price: data.price,
    change24h: data.change24h,
    priceHistory: data.priceHistory,
    isLoading,
    error,
    refetch: fetchCurrentPrice,
  };
};
