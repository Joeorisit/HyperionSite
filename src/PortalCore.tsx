import { useEffect, useRef } from 'react'

/**
 * Canvas-rendered portal core: a perfect black circle with electric
 * waves and arcs that project outward from its edge randomly.
 */
export default function PortalCore() {
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
    const CORE_R = SIZE * 0.32 // perfect circle radius

    // ── Wave tendrils: random blobs of energy that bulge outward ──
    // Each tendril is a localized wave centered at a random angle
    const NUM_TENDRILS = 18
    interface Tendril {
      centerAngle: number  // where on the circle it's anchored
      spread: number       // angular width (radians)
      amplitude: number    // how far it reaches outward
      speed: number        // animation speed
      phase: number        // phase offset
      life: number
      maxLife: number
    }

    function spawnTendril(): Tendril {
      return {
        centerAngle: Math.random() * Math.PI * 2,
        spread: 0.15 + Math.random() * 0.4,
        amplitude: 8 + Math.random() * 18,
        speed: 0.5 + Math.random() * 2.0,
        phase: Math.random() * Math.PI * 2,
        life: 0,
        maxLife: 80 + Math.random() * 160,
      }
    }

    const tendrils: Tendril[] = []
    for (let i = 0; i < NUM_TENDRILS; i++) {
      const t = spawnTendril()
      t.life = Math.random() * t.maxLife // stagger
      tendrils.push(t)
    }

    // ── Electric arcs ──
    const NUM_ARCS = 18
    interface Arc {
      angle: number
      life: number
      maxLife: number
      intensity: number
      branchCount: number
      len: number
    }

    function spawnArc(): Arc {
      return {
        angle: Math.random() * Math.PI * 2,
        life: 0,
        maxLife: 20 + Math.random() * 45,
        intensity: 0.4 + Math.random() * 0.6,
        branchCount: 3 + Math.floor(Math.random() * 4),
        len: 8 + Math.random() * 20,
      }
    }

    const arcs: Arc[] = []
    for (let i = 0; i < NUM_ARCS; i++) {
      const a = spawnArc()
      a.life = Math.random() * a.maxLife
      arcs.push(a)
    }

    // Returns how far outward the wave extends at a given angle
    function getWaveOffset(angle: number, time: number): number {
      let offset = 0
      for (const td of tendrils) {
        // How close is this angle to the tendril center?
        let diff = angle - td.centerAngle
        // Wrap to [-PI, PI]
        diff = ((diff + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI
        const influence = Math.exp(-(diff * diff) / (2 * td.spread * td.spread))

        // Lifecycle fade
        const progress = td.life / td.maxLife
        const fade = Math.sin(progress * Math.PI) // fade in and out

        // Animated wave
        const wave = Math.sin(angle * 3 + time * td.speed + td.phase) * 0.5 + 0.5

        offset += td.amplitude * influence * fade * wave
      }
      return offset
    }

    let frame = 0

    function draw(time: number) {
      frame = requestAnimationFrame(draw)
      const t = time * 0.001

      ctx.clearRect(0, 0, SIZE, SIZE)

      // Update tendril lifecycles
      for (let i = 0; i < tendrils.length; i++) {
        tendrils[i].life += 1
        if (tendrils[i].life > tendrils[i].maxLife) {
          tendrils[i] = spawnTendril()
        }
      }

      // ── Outer diffuse glow ring ──
      const glowGrad = ctx.createRadialGradient(cx, cy, CORE_R - 2, cx, cy, CORE_R + 35)
      glowGrad.addColorStop(0, 'rgba(126, 184, 218, 0.0)')
      glowGrad.addColorStop(0.2, 'rgba(126, 184, 218, 0.08)')
      glowGrad.addColorStop(0.5, 'rgba(126, 184, 218, 0.04)')
      glowGrad.addColorStop(1, 'rgba(126, 184, 218, 0.0)')
      ctx.beginPath()
      ctx.arc(cx, cy, CORE_R + 35, 0, Math.PI * 2)
      ctx.fillStyle = glowGrad
      ctx.fill()

      // ── Wave shapes projecting outward from the circle ──
      // Draw the wavy outer boundary
      ctx.beginPath()
      const STEPS = 512
      for (let i = 0; i <= STEPS; i++) {
        const a = (i / STEPS) * Math.PI * 2
        const waveR = CORE_R + getWaveOffset(a, t)
        const x = cx + Math.cos(a) * waveR
        const y = cy + Math.sin(a) * waveR
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()

      // Glow fill between core circle and wavy edge
      const waveFill = ctx.createRadialGradient(cx, cy, CORE_R, cx, cy, CORE_R + 30)
      waveFill.addColorStop(0, 'rgba(126, 184, 218, 0.18)')
      waveFill.addColorStop(0.4, 'rgba(126, 184, 218, 0.08)')
      waveFill.addColorStop(1, 'rgba(126, 184, 218, 0.0)')
      ctx.fillStyle = waveFill
      ctx.fill()

      // Stroke the wavy outer edge
      ctx.strokeStyle = 'rgba(126, 184, 218, 0.3)'
      ctx.lineWidth = 1.2
      ctx.shadowColor = 'rgba(126, 184, 218, 0.5)'
      ctx.shadowBlur = 10
      ctx.stroke()
      ctx.shadowBlur = 0

      // ── Electric arcs projecting outward ──
      for (const arc of arcs) {
        arc.life += 1
        if (arc.life > arc.maxLife) {
          Object.assign(arc, spawnArc())
        }

        const progress = arc.life / arc.maxLife
        const fade = Math.sin(progress * Math.PI)
        const flicker = 0.5 + 0.5 * Math.sin(t * 15 + arc.angle * 5)
        const alpha = arc.intensity * fade * flicker

        if (alpha < 0.06) continue

        // Start at the circle edge
        const startX = cx + Math.cos(arc.angle) * CORE_R
        const startY = cy + Math.sin(arc.angle) * CORE_R

        // Main bolt
        ctx.beginPath()
        ctx.moveTo(startX, startY)

        let bx = startX
        let by = startY
        for (let s = 1; s <= arc.branchCount; s++) {
          const frac = s / arc.branchCount
          const jitter = (Math.random() - 0.5) * 10
          bx = startX + Math.cos(arc.angle) * arc.len * frac +
               Math.cos(arc.angle + Math.PI / 2) * jitter
          by = startY + Math.sin(arc.angle) * arc.len * frac +
               Math.sin(arc.angle + Math.PI / 2) * jitter
          ctx.lineTo(bx, by)
        }

        ctx.strokeStyle = `rgba(126, 184, 218, ${alpha.toFixed(3)})`
        ctx.lineWidth = 0.8 + Math.random() * 1.5
        ctx.shadowColor = 'rgba(126, 184, 218, 0.7)'
        ctx.shadowBlur = 6
        ctx.stroke()

        // Occasional secondary branch
        if (Math.random() < 0.3 && arc.branchCount > 2) {
          const splitAt = 1 + Math.floor(Math.random() * (arc.branchCount - 1))
          const splitFrac = splitAt / arc.branchCount
          const sx = startX + Math.cos(arc.angle) * arc.len * splitFrac
          const sy = startY + Math.sin(arc.angle) * arc.len * splitFrac
          const branchAngle = arc.angle + (Math.random() - 0.5) * 1.2
          const branchLen = arc.len * 0.4

          ctx.beginPath()
          ctx.moveTo(sx, sy)
          ctx.lineTo(
            sx + Math.cos(branchAngle) * branchLen + (Math.random() - 0.5) * 4,
            sy + Math.sin(branchAngle) * branchLen + (Math.random() - 0.5) * 4
          )
          ctx.strokeStyle = `rgba(126, 184, 218, ${(alpha * 0.6).toFixed(3)})`
          ctx.lineWidth = 0.6 + Math.random()
          ctx.stroke()
        }

        ctx.shadowBlur = 0
      }

      // ── Perfect circle edge stroke ──
      ctx.beginPath()
      ctx.arc(cx, cy, CORE_R, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(126, 184, 218, 0.25)'
      ctx.lineWidth = 1.5
      ctx.shadowColor = 'rgba(126, 184, 218, 0.4)'
      ctx.shadowBlur = 14
      ctx.stroke()
      ctx.shadowBlur = 0

      // ── Black core fill (perfect circle) ──
      ctx.beginPath()
      ctx.arc(cx, cy, CORE_R, 0, Math.PI * 2)
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, CORE_R)
      coreGrad.addColorStop(0, '#000000')
      coreGrad.addColorStop(0.75, '#000000')
      coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0.95)')
      ctx.fillStyle = coreGrad
      ctx.fill()

      // ── Subtle inner rim highlight ──
      ctx.beginPath()
      ctx.arc(cx, cy, CORE_R - 1, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(126, 184, 218, 0.08)'
      ctx.lineWidth = 1
      ctx.stroke()
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
