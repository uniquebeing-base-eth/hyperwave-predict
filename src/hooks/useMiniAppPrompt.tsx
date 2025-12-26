import { useEffect } from 'react';
import { useMiniApp } from '@neynar/react';
import { toast } from 'sonner';

export const useMiniAppPrompt = () => {
  const { isSDKLoaded, added, notificationDetails, lastEvent, actions } = useMiniApp();

  useEffect(() => {
    if (!isSDKLoaded) return;

    // Prompt user to add the mini app after a short delay
    const timer = setTimeout(async () => {
      if (!added && actions?.addMiniApp) {
        try {
          await actions.addMiniApp();
        } catch (error) {
          console.log('Add mini app prompt:', error);
        }
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [isSDKLoaded, added, actions]);

  useEffect(() => {
    if (lastEvent === 'miniAppAdded') {
      toast.success('HyperWave added to your apps!');
      console.log('Mini app added! Notification token:', notificationDetails?.token);
    }
  }, [lastEvent, notificationDetails]);

  return { added, notificationDetails };
};
