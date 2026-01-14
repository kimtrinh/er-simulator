
import React, { useEffect, useRef } from 'react';

interface Props {
  hr: number;
  color: string;
  rhythm: string;
}

const TelemetryWaveform: React.FC<Props> = ({ hr, color, rhythm }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const xRef = useRef<number>(0);
  const pointsRef = useRef<{x: number, y: number}[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    canvas.width = width;
    canvas.height = height;

    const midY = height / 2;
    const speed = 2.6; 
    
    let framesSinceLastBeat = 0;
    const isAfib = rhythm === "Atrial Fibrillation";
    const isVT = rhythm === "Ventricular Tachycardia";
    const isVF = rhythm === "Ventricular Fibrillation";

    // Scaling factors for the taller canvas
    const qrsAmplitude = height * 0.35; // R wave height relative to canvas
    const pAmplitude = height * 0.04;
    const tAmplitude = height * 0.08;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Draw grid
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
      ctx.lineWidth = 1;
      // standard 25mm spacing grid
      for (let x = 0; x < width; x += 25) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
      for (let y = 0; y < height; y += 25) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
      ctx.stroke();

      framesSinceLastBeat++;
      
      const currentBeatInterval = isAfib 
        ? ((60 / hr) * 60) * (0.8 + Math.random() * 0.4) 
        : (60 / hr) * 60;

      if (framesSinceLastBeat > currentBeatInterval) {
        framesSinceLastBeat = 0;
      }

      const t = framesSinceLastBeat;
      let targetY = midY;

      const isPeakedT = rhythm === "Peaked T-Waves";
      const isSTE = rhythm === "ST Elevation";

      if (isVF) {
        // Ventricular Fibrillation: Chaos
        targetY = midY + (Math.random() - 0.5) * (height * 0.5);
      } else if (isVT) {
        // Ventricular Tachycardia: Wide, regular, no P waves
        if (t >= 0 && t < 15) {
          const sine = Math.sin((t / 15) * Math.PI);
          targetY = midY - (sine * (height * 0.4));
        }
      } else {
        // Standard P-QRS-T complexes with pathology
        if (!isAfib && t > 0 && t < 6) {
          targetY -= pAmplitude; // P-wave
        }
        else if (t >= 8 && t < 10) targetY += pAmplitude * 2; // Q
        else if (t >= 10 && t < 13) targetY -= qrsAmplitude; // R
        else if (t >= 13 && t < 16) {
            if (isSTE) targetY -= qrsAmplitude * 0.3; // ST Segment elevation
            else targetY += qrsAmplitude * 0.25; // S
        }
        else if (t >= 16 && t < 22) {
            if (isSTE) targetY -= qrsAmplitude * 0.25; 
            else targetY = midY;
        }
        else if (t >= 22 && t < 38) {
            if (isPeakedT) {
              const peakT = Math.sin(((t - 22) / 16) * Math.PI);
              targetY -= peakT * (height * 0.35); // Sharp peaked T
            } else if (isSTE) {
              targetY -= tAmplitude * 1.5;
            } else {
              const normT = Math.sin(((t - 22) / 16) * Math.PI);
              targetY -= normT * tAmplitude; // Normal T-wave
            }
        }

        // Afib baseline noise
        if (isAfib) {
            targetY += (Math.random() - 0.5) * 8;
        }
      }

      // Universal baseline noise (movement artifact etc)
      targetY += (Math.random() - 0.5) * 2;

      xRef.current = (xRef.current + speed) % width;
      pointsRef.current.push({ x: xRef.current, y: targetY });
      
      if (pointsRef.current.length > width / speed) {
        pointsRef.current.shift();
      }

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 3.5; // Thicker line for better visibility on larger strip
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.shadowBlur = 15;
      ctx.shadowColor = color;

      for (let i = 1; i < pointsRef.current.length; i++) {
        const p1 = pointsRef.current[i-1];
        const p2 = pointsRef.current[i];
        if (p2.x > p1.x) {
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
        }
      }
      ctx.stroke();

      requestRef.current = requestAnimationFrame(draw);
    };

    requestRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(requestRef.current);
  }, [hr, color, rhythm]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-full block"
      style={{ filter: 'drop-shadow(0 0 8px currentColor)' }}
    />
  );
};

export default TelemetryWaveform;
