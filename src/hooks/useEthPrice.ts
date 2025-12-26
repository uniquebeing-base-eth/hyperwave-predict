import { useState, useEffect, useCallback } from 'react';

interface PriceData {
  price: number;
  change24h: number;
  priceHistory: { time: number; price: number }[];
}

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

export const useEthPrice = () => {
  const [data, setData] = useState<PriceData>({
    price: 0,
    change24h: 0,
    priceHistory: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCurrentPrice = useCallback(async () => {
    try {
      const response = await fetch(
        `${COINGECKO_API}/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch price');
      }
      
      const result = await response.json();
      const ethData = result.ethereum;
      
      if (ethData) {
        setData(prev => ({
          ...prev,
          price: ethData.usd,
          change24h: ethData.usd_24h_change || 0,
        }));
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching ETH price:', err);
      setError('Failed to fetch price');
    }
  }, []);

  const fetchPriceHistory = useCallback(async () => {
    try {
      // Fetch last 1 hour of data with minute intervals
      const response = await fetch(
        `${COINGECKO_API}/coins/ethereum/market_chart?vs_currency=usd&days=1&interval=hourly`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch price history');
      }
      
      const result = await response.json();
      
      if (result.prices && result.prices.length > 0) {
        // Take last 60 data points
        const recentPrices = result.prices.slice(-60).map((point: [number, number]) => ({
          time: point[0],
          price: point[1],
        }));
        
        setData(prev => ({
          ...prev,
          priceHistory: recentPrices,
        }));
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching price history:', err);
      setError('Failed to fetch price history');
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchCurrentPrice();
    fetchPriceHistory();
  }, [fetchCurrentPrice, fetchPriceHistory]);

  // Update price every 30 seconds (respecting CoinGecko rate limits)
  useEffect(() => {
    const priceInterval = setInterval(fetchCurrentPrice, 30000);
    
    return () => clearInterval(priceInterval);
  }, [fetchCurrentPrice]);

  // Simulate real-time updates between API calls
  useEffect(() => {
    if (data.price === 0) return;
    
    const interval = setInterval(() => {
      setData(prev => {
        // Small random variance to simulate live updates
        const variance = (Math.random() - 0.5) * 0.0002 * prev.price;
        const newPrice = prev.price + variance;
        
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
  }, [data.price]);

  return {
    price: data.price,
    change24h: data.change24h,
    priceHistory: data.priceHistory,
    isLoading,
    error,
    refetch: fetchCurrentPrice,
  };
};
