import { useEffect, useRef } from 'react'

/**
 * Drives halo layer rotations via CSS custom properties.
 *
 * No hard phase transitions. Layers spin freely with random
 * velocities. An invisible "gravitational" bias slowly steers
 * them toward 0° alignment. The pull starts so gently it's
 * imperceptible, strengthens gradually, and by the time the
 * layers align it looks like they just happened to converge.
 * After a brief hold, they scatter with fresh velocities and
 * the cycle restarts with a new random duration.
 */

interface Layer {
  angle: number
  velocity: number
  targetVelocity: number
}

const NUM_LAYERS = 7
const LAYER_NAMES = [
  '--rot-glow', '--rot-outer', '--rot-mid', '--rot-inner',
  '--rot-corona', '--rot-flare', '--rot-wisps'
]

export default function HaloController() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const portal = el.closest('.portal') as HTMLElement
    if (!portal) return

    function randomVelocity(): number {
      return (25 + Math.random() * 55) * (Math.random() < 0.5 ? 1 : -1)
    }

    function normAngle(a: number): number {
      a = a % 360
      if (a > 180) a -= 360
      if (a < -180) a += 360
      return a
    }

    const layers: Layer[] = []
    for (let i = 0; i < NUM_LAYERS; i++) {
      const vel = randomVelocity()
      layers.push({
        angle: Math.random() * 360,
        velocity: vel,
        targetVelocity: vel,
      })
    }

    // Cycle timing
    let cycleTime = 0
    let cycleDuration = 8 + Math.random() * 6   // 8-14s total cycle (faster)
    let pullStart = cycleDuration * 0.3
    let holdDuration = 1.0 + Math.random() * 0.8
    let phase: 'spinning' | 'holding' | 'releasing' = 'spinning'
    let holdTime = 0
    let releaseTime = 0
    let releaseDuration = 3 + Math.random() * 2 // 3-5s gentle ramp back up

    let lastTime = performance.now()
    let frame = 0

    function newCycle() {
      cycleDuration = 8 + Math.random() * 6
      pullStart = cycleDuration * (0.25 + Math.random() * 0.15)
      holdDuration = 1.0 + Math.random() * 0.8
      releaseDuration = 3 + Math.random() * 2
      cycleTime = 0
      phase = 'releasing'
      releaseTime = 0
      // Set target velocities but start from near-zero
      for (const layer of layers) {
        layer.velocity = 0
        layer.targetVelocity = randomVelocity()
      }
    }

    function update(now: number) {
      frame = requestAnimationFrame(update)
      const dt = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now

      if (phase === 'holding') {
        holdTime += dt
        for (let i = 0; i < NUM_LAYERS; i++) {
          layers[i].angle = Math.sin(now * 0.0008 + i * 1.7) * 0.4
        }
        if (holdTime > holdDuration) {
          newCycle()
        }
      } else if (phase === 'releasing') {
        releaseTime += dt
        cycleTime += dt
        // Cubic ease-in: velocities ramp up very slowly at first
        const ramp = Math.min(releaseTime / releaseDuration, 1)
        const ease = ramp * ramp * ramp
        for (const layer of layers) {
          // Gently accelerate toward target velocity
          layer.velocity += (layer.targetVelocity * ease - layer.velocity) * 1.5 * dt
          if (Math.random() < 0.004) {
            layer.targetVelocity = randomVelocity()
          }
          layer.angle += layer.velocity * dt
        }
        if (ramp >= 1) {
          phase = 'spinning'
        }
      } else {
        cycleTime += dt

        // Gravitational pull strength: 0 before pullStart, ramps with cubic ease
        let pull = 0
        if (cycleTime > pullStart) {
          const pullProgress = (cycleTime - pullStart) / (cycleDuration - pullStart)
          pull = Math.min(pullProgress, 1)
          pull = pull * pull * pull // cubic ease — barely perceptible at first
        }

        let allAligned = true
        for (const layer of layers) {
          // Random velocity drift (always active, gives organic feel)
          layer.velocity += (layer.targetVelocity - layer.velocity) * 0.3 * dt
          if (Math.random() < 0.004) {
            layer.targetVelocity = randomVelocity()
          }

          // Apply gravitational bias toward 0°
          const norm = normAngle(layer.angle)
          // The pull acts as a gentle torque toward 0, strengthening over time
          const pullForce = -norm * pull * 1.2
          // Also dampen velocity proportional to pull
          const dampedVel = layer.velocity * (1 - pull * 0.7)

          layer.angle += (dampedVel + pullForce) * dt

          if (Math.abs(normAngle(layer.angle)) > 1.5) {
            allAligned = false
          }
        }

        // Check if all layers converged
        if (pull > 0.8 && allAligned) {
          phase = 'holding'
          holdTime = 0
          for (const layer of layers) {
            layer.velocity = 0
          }
        }

        // Safety: if cycle ran way too long, force hold
        if (cycleTime > cycleDuration * 1.5) {
          phase = 'holding'
          holdTime = 0
          for (const layer of layers) {
            layer.angle = 0
            layer.velocity = 0
          }
        }
      }

      // Compute convergence for opacity
      const maxDist = Math.max(...layers.map(l => Math.abs(normAngle(l.angle))))
      const convergence = 1 - Math.min(maxDist / 60, 1)

      for (let i = 0; i < NUM_LAYERS; i++) {
        portal.style.setProperty(LAYER_NAMES[i], `${layers[i].angle.toFixed(2)}deg`)
      }
      portal.style.setProperty('--halo-convergence', convergence.toFixed(3))
    }

    frame = requestAnimationFrame(update)
    return () => cancelAnimationFrame(frame)
  }, [])

  return <div ref={ref} style={{ display: 'none' }} />
}
