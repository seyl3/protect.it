'use client';

import { useState, useEffect } from 'react';

interface Pixel {
  id: number;
  x: number;
  y: number;
  speed: number;
  char: string;
  opacity: number;
}

export default function AsciiBackground() {
  const [pixels, setPixels] = useState<Pixel[]>([]);

  // Pixel characters for the rain effect
  const pixelChars = ['█', '▓', '▒', '░', '●', '○', '◆', '◇', '■', '□', '▪', '▫'];

  // Generate initial pixels
  useEffect(() => {
    const generatePixels = () => {
      const newPixels: Pixel[] = [];
      for (let i = 0; i < 50; i++) {
        newPixels.push({
          id: i,
          x: Math.random() * 100, // percentage
          y: Math.random() * -100, // start above viewport
          speed: Math.random() * 2 + 1, // 1-3 speed
          char: pixelChars[Math.floor(Math.random() * pixelChars.length)],
          opacity: Math.random() * 0.3 + 0.1 // 0.1-0.4 opacity
        });
      }
      setPixels(newPixels);
    };

    generatePixels();
  }, []);

  // Animate pixels falling
  useEffect(() => {
    const interval = setInterval(() => {
      setPixels(prevPixels => 
        prevPixels.map(pixel => {
          let newY = pixel.y + pixel.speed;
          
          // Reset pixel to top when it goes off screen
          if (newY > 110) {
            newY = Math.random() * -20;
            return {
              ...pixel,
              y: newY,
              x: Math.random() * 100,
              speed: Math.random() * 2 + 1,
              char: pixelChars[Math.floor(Math.random() * pixelChars.length)],
              opacity: Math.random() * 0.3 + 0.1
            };
          }
          
          return {
            ...pixel,
            y: newY
          };
        })
      );
    }, 100); // Update every 100ms for smooth animation

    return () => clearInterval(interval);
  }, [pixelChars]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {pixels.map(pixel => (
        <div
          key={pixel.id}
          className="absolute text-black font-mono text-sm select-none"
          style={{
            left: `${pixel.x}%`,
            top: `${pixel.y}%`,
            opacity: pixel.opacity,
            transform: `translateX(-50%)`,
            transition: 'none'
          }}
        >
          {pixel.char}
        </div>
      ))}
    </div>
  );
} 