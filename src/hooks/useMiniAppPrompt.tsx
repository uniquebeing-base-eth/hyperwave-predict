
import { useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { toast } from 'sonner';

export const useMiniAppPrompt = () => {
  const [added, setAdded] = useState(false);
  const [notificationDetails, setNotificationDetails] = useState<{ token?: string; url?: string } | null>(null);

  useEffect(() => {
    // Listen for miniAppAdded event
    const handleMiniAppAdded = ({ notificationDetails }: { notificationDetails?: { token?: string; url?: string } }) => {
      setAdded(true);
      setNotificationDetails(notificationDetails || null);
      toast.success('HyperWave added to your apps!');
      console.log('Mini app added! Notification token:', notificationDetails?.token);
    };

    sdk.on('miniAppAdded', handleMiniAppAdded);

    const promptAddMiniApp = async () => {
      try {
        // Check if we're in a mini app context
        const context = await sdk.context;
        
        if (context) {
          // Prompt user to add the mini app after a short delay
          setTimeout(async () => {
            try {
              await sdk.actions.addFrame();
            } catch (error) {
              console.log('Add mini app prompt:', error);
            }
          }, 1500);
        }
      } catch (error) {
        console.log('Mini app context check:', error);
      }
    };

    promptAddMiniApp();

    return () => {
      sdk.off('miniAppAdded', handleMiniAppAdded);
    };
  }, []);

  return { added, notificationDetails };
};
