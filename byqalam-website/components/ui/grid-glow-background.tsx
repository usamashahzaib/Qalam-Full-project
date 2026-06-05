"use client";

import React, { useRef, useEffect } from "react";

// GridGlowBackground Props
interface GridGlowBackgroundProps {
  children: React.ReactNode;
  backgroundColor?: string;    // default "#0a0a0a"
  gridColor?: string;          // default "rgba(255,255,255,0.05)"
  gridSize?: number;           // default 50
  glowColors?: string[];       // default ["#4A00E0","#8E2DE2","#4A00E0"]
  glowCount?: number;          // default 10
}

export const GridGlowBackground: React.FC<GridGlowBackgroundProps> = ({
  children,
  backgroundColor = "#0a0a0a",
  gridColor = "rgba(255, 255, 255, 0.05)",
  gridSize = 50,
  glowColors = ["#4A00E0", "#8E2DE2", "#4A00E0"],
  glowCount = 10,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const ctxMaybe = canvasEl.getContext("2d");
    if (!ctxMaybe) return;
    const brush = ctxMaybe;

    let glows: Glow[] = [];
    let frameId: number;

    const surface = canvasEl;

    class Glow {
      x: number;
      y: number;
      targetX: number;
      targetY: number;
      radius: number;
      speed: number;
      color: string;
      alpha: number;

      constructor() {
        this.x =
          Math.floor(Math.random() * (surface.width / gridSize)) * gridSize;
        this.y =
          Math.floor(Math.random() * (surface.height / gridSize)) * gridSize;
        this.targetX = this.x;
        this.targetY = this.y;
        this.radius = Math.random() * 80 + 40;
        this.speed = Math.random() * 0.015 + 0.01;
        this.color = glowColors[
          Math.floor(Math.random() * glowColors.length)
        ];
        this.alpha = 0;
        this.setNewTarget();
      }

      setNewTarget() {
        this.targetX =
          Math.floor(Math.random() * (surface.width / gridSize)) * gridSize;
        this.targetY =
          Math.floor(Math.random() * (surface.height / gridSize)) * gridSize;
      }

      update() {
        this.x += (this.targetX - this.x) * this.speed;
        this.y += (this.targetY - this.y) * this.speed;

        if (
          Math.abs(this.targetX - this.x) < 1 &&
          Math.abs(this.targetY - this.y) < 1
        ) {
          this.setNewTarget();
        }
        if (this.alpha < 1) this.alpha += 0.01;
      }

      draw() {
        brush.globalAlpha = this.alpha;
        const grad = brush.createRadialGradient(
          this.x,
          this.y,
          0,
          this.x,
          this.y,
          this.radius
        );
        grad.addColorStop(0, this.color);
        grad.addColorStop(1, "transparent");
        brush.fillStyle = grad;
        brush.beginPath();
        brush.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
        brush.fill();
        brush.globalAlpha = 1;
      }
    }

    const resize = () => {
      canvasEl.width = window.innerWidth;
      canvasEl.height = window.innerHeight;
      glows = Array.from({ length: glowCount }, () => new Glow());
    };

    const drawGrid = () => {
      brush.strokeStyle = gridColor;
      brush.lineWidth = 1;
      for (let x = 0; x < canvasEl.width; x += gridSize) {
        brush.beginPath();
        brush.moveTo(x, 0);
        brush.lineTo(x, canvasEl.height);
        brush.stroke();
      }
      for (let y = 0; y < canvasEl.height; y += gridSize) {
        brush.beginPath();
        brush.moveTo(0, y);
        brush.lineTo(canvasEl.width, y);
        brush.stroke();
      }
    };

    const animate = () => {
      brush.clearRect(0, 0, canvasEl.width, canvasEl.height);
      drawGrid();
      glows.forEach((g) => {
        g.update();
        g.draw();
      });
      frameId = requestAnimationFrame(animate);
    };

    resize();
    animate();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(frameId);
    };
  }, [gridColor, gridSize, glowColors, glowCount]);

  return (
    <div
      className="relative min-h-screen w-full"
      style={{ backgroundColor }}
    >
      <canvas
        ref={canvasRef}
        className="fixed inset-0 z-0 w-full h-full opacity-50"
      />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default GridGlowBackground;
