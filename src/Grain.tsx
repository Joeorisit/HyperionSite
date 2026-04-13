import { useEffect, useRef } from 'react'

/**
 * Full-screen animated film-grain overlay.
 * Renders random noise on a small offscreen canvas, then draws it
 * scaled-up onto the visible canvas. Throttled to ~18 fps to keep
 * the shimmer organic without burning CPU.
 */
export default function Grain() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    // Small source — gets stretched to fill screen for chunky grain
    const SIZE = 128
    const offscreen = document.createElement('canvas')
    offscreen.width = SIZE
    offscreen.height = SIZE
    const offCtx = offscreen.getContext('2d')!

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    let frame = 0
    let last = 0
    const INTERVAL = 1000 / 18 // ~18 fps

    const draw = (now: number) => {
      frame = requestAnimationFrame(draw)
      if (now - last < INTERVAL) return
      last = now

      const imageData = offCtx.createImageData(SIZE, SIZE)
      const data = imageData.data

      for (let i = 0; i < data.length; i += 4) {
        const v = (Math.random() * 255) | 0
        data[i] = v      // R
        data[i + 1] = v  // G
        data[i + 2] = v  // B
        data[i + 3] = 12 // A — very subtle (~4.7% opacity per pixel)
      }

      offCtx.putImageData(imageData, 0, 0)

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      // Disable smoothing so upscale stays crispy
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(offscreen, 0, 0, canvas.width, canvas.height)
    }

    frame = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        mixBlendMode: 'overlay',
      }}
    />
  )
}
