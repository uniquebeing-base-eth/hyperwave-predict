

import { useCallback, useRef } from 'react';

// Sound effect URLs from free sources
const SOUND_URLS = {
  win: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3', // Victory celebration
  lose: 'https://assets.mixkit.co/active_storage/sfx/2955/2955-preview.mp3', // Game over 
  bet: 'https://assets.mixkit.co/active_storage/sfx/888/888-preview.mp3', // Coin drop
};

export const useSoundEffects = () => {
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({
    win: null,
    lose: null,
    bet: null,
  });

  // Pre-load sounds
  const preloadSounds = useCallback(() => {
    Object.entries(SOUND_URLS).forEach(([key, url]) => {
      if (!audioRefs.current[key]) {
        const audio = new Audio(url);
        audio.preload = 'auto';
        audio.volume = 0.5;
        audioRefs.current[key] = audio;
      }
    });
  }, []);

  const playSound = useCallback((type: 'win' | 'lose' | 'bet') => {
    try {
      const audio = audioRefs.current[type];
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(console.warn);
      } else {
        // Fallback: create new audio if not preloaded
        const newAudio = new Audio(SOUND_URLS[type]);
        newAudio.volume = 0.5;
        newAudio.play().catch(console.warn);
      }
    } catch (error) {
      console.warn('Sound playback failed:', error);
    }
  }, []);

  const playWinSound = useCallback(() => playSound('win'), [playSound]);
  const playLoseSound = useCallback(() => playSound('lose'), [playSound]);
  const playBetSound = useCallback(() => playSound('bet'), [playSound]);

  return {
    preloadSounds,
    playWinSound,
    playLoseSound,
    playBetSound,
    playSound,
  };
};
