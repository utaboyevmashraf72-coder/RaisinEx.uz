import React, { useState, useEffect, useRef } from 'react';

export const TextStreamer: React.FC<{ text: string; onComplete?: () => void }> = ({ text, onComplete }) => {
  const [display, setDisplay] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&';

  useEffect(() => {
    let i = 0;
    let scrambleCount = 0;
    
    // If text is too long, stream faster
    const speed = text.length > 500 ? 2 : 10;
    const step = text.length > 500 ? 5 : 1;

    const interval = setInterval(() => {
      if (i >= text.length) {
        clearInterval(interval);
        setDisplay(text);
        setIsComplete(true);
        if (onComplete) onComplete();
        return;
      }

      // Scramble effect for the "head" of the stream
      if (scrambleCount < 3) {
         const scrambled = text.substring(0, i) + chars[Math.floor(Math.random() * chars.length)];
         setDisplay(scrambled);
         scrambleCount++;
      } else {
         i += step;
         scrambleCount = 0;
         setDisplay(text.substring(0, i));
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text]);

  return (
    <span className={isComplete ? '' : 'text-neon-cyan/90'}>
      {display}
      {!isComplete && <span className="inline-block w-2 h-4 bg-neon-cyan ml-1 animate-pulse align-middle" />}
    </span>
  );
};