import { useEffect, useRef } from 'react'

/**
 * Black planet disk with a subtly wavy, organic edge.
 * Uses layered low-frequency noise to create slow random
 * bumps that poke out from an otherwise round shape.
 */
export default function PlanetDisk() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const DPR = window.devicePixelRatio || 1
    const SIZE = 360
    canvas.width = SIZE * DPR
    canvas.height = SIZE * DPR
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    ctx.scale(DPR, DPR)

    const cx = SIZE / 2
    const cy = SIZE / 2
    // Match the CSS portal__core inset: 31% → radius is 38% of container
    const BASE_R = SIZE * 0.38

    // Seed a ring of random offset targets around the circle.
    // These drift slowly to new targets over time for organic movement.
    const NUM_POINTS = 32
    const offsets: number[] = new Array(NUM_POINTS).fill(0)
    const targets: number[] = new Array(NUM_POINTS).fill(0)
    const speeds: number[] = []

    for (let i = 0; i < NUM_POINTS; i++) {
      targets[i] = (Math.random() - 0.5) * 6 // ±3px max
      speeds[i] = 0.003 + Math.random() * 0.008
    }

    // Smooth interpolation with wrap-around
    function getSmoothedRadius(angle: number): number {
      const idx = (angle / (Math.PI * 2)) * NUM_POINTS
      const i0 = Math.floor(idx) % NUM_POINTS
      const i1 = (i0 + 1) % NUM_POINTS
      const frac = idx - Math.floor(idx)
      // Cubic smoothstep
      const t = frac * frac * (3 - 2 * frac)
      const offset = offsets[i0] * (1 - t) + offsets[i1] * t
      return BASE_R + offset
    }

    let frame = 0

    function draw() {
      frame = requestAnimationFrame(draw)

      // Drift offsets toward targets, pick new targets when close
      for (let i = 0; i < NUM_POINTS; i++) {
        offsets[i] += (targets[i] - offsets[i]) * speeds[i]
        if (Math.abs(targets[i] - offsets[i]) < 0.15) {
          targets[i] = (Math.random() - 0.5) * 6
        }
      }

      ctx.clearRect(0, 0, SIZE, SIZE)

      // ── Dark shadow halo ──
      ctx.beginPath()
      const STEPS = 256
      for (let i = 0; i <= STEPS; i++) {
        const a = (i / STEPS) * Math.PI * 2
        const r = getSmoothedRadius(a) + 15
        const x = cx + Math.cos(a) * r
        const y = cy + Math.sin(a) * r
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      const shadowGrad = ctx.createRadialGradient(cx, cy, BASE_R - 5, cx, cy, BASE_R + 25)
      shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.95)')
      shadowGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.5)')
      shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0.0)')
      ctx.fillStyle = shadowGrad
      ctx.fill()

      // ── Black planet disk with wavy edge ──
      ctx.beginPath()
      for (let i = 0; i <= STEPS; i++) {
        const a = (i / STEPS) * Math.PI * 2
        const r = getSmoothedRadius(a)
        const x = cx + Math.cos(a) * r
        const y = cy + Math.sin(a) * r
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.fillStyle = '#000000'
      ctx.fill()
    }

    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: '0',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  )
}
