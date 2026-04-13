import { useEffect, useRef } from 'react'

/**
 * Layers spin continuously. Periodically, they all smoothly
 * decelerate, pass through 0° alignment (eye), pause briefly,
 * then smoothly accelerate back to their original speeds.
 *
 * Each layer's speed is nudged slightly so it arrives at 0°
 * exactly when the pause happens — the nudge is spread over
 * seconds so it's invisible.
 */

const NUM_LAYERS = 7
const LAYER_NAMES = [
  '--rot-glow', '--rot-outer', '--rot-mid', '--rot-inner',
  '--rot-corona', '--rot-flare', '--rot-wisps'
]

// Base velocities (deg/s) — each layer spins at its own constant rate
const BASE_VELOCITIES = [22, -35, 28, -18, 40, -30, 15]

export default function HaloController() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const portal = el.closest('.portal') as HTMLElement
    if (!portal) return

    const angles = new Float64Array(NUM_LAYERS) // start at 0
    const velocities = BASE_VELOCITIES.map(v => v) // current velocities
    const adjustedVelocities = BASE_VELOCITIES.map(v => v) // target during approach

    type Phase = 'spinning' | 'approaching' | 'holding' | 'departing'
    let phase: Phase = 'spinning'
    let phaseTime = 0
    let nextPause = 8 + Math.random() * 6 // 8-14s until first pause
    const approachDuration = 4 // seconds to smoothly adjust speed
    let holdDuration = 1.2 + Math.random() * 0.6
    const departDuration = 3.5 // seconds to ramp back up

    let lastTime = performance.now()
    let frame = 0

    function normAngle(a: number): number {
      return ((a % 360) + 360) % 360 // 0-360
    }

    function calcAdjustedVelocities() {
      // For each layer, figure out what velocity it needs so that
      // over the approach duration, it ends up at angle ≡ 0 (mod 360)
      for (let i = 0; i < NUM_LAYERS; i++) {
        const current = normAngle(angles[i])
        const baseV = BASE_VELOCITIES[i]

        // How much extra rotation needed to land on 0°?
        // If going positive, we need to reach the next multiple of 360
        // If going negative, same idea
        let target: number
        if (baseV >= 0) {
          target = current + baseV * approachDuration
          // Round up to next multiple of 360
          target = Math.ceil(target / 360) * 360
        } else {
          target = current + baseV * approachDuration
          // Round down to next multiple of 360 (including 0)
          target = Math.floor(target / 360) * 360
        }

        // Velocity needed to reach that target in approachDuration
        adjustedVelocities[i] = (target - current) / approachDuration
      }
    }

    // Smooth easing: ease-in-out cubic
    function easeInOut(t: number): number {
      return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2
    }

    function update(now: number) {
      frame = requestAnimationFrame(update)
      const dt = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now
      phaseTime += dt

      if (phase === 'spinning') {
        // Spin at base velocities
        for (let i = 0; i < NUM_LAYERS; i++) {
          velocities[i] = BASE_VELOCITIES[i]
          angles[i] += velocities[i] * dt
        }

        if (phaseTime > nextPause) {
          phase = 'approaching'
          phaseTime = 0
          calcAdjustedVelocities()
        }
      } else if (phase === 'approaching') {
        // Smoothly blend from base velocity to adjusted velocity,
        // then smoothly decelerate to 0
        const progress = Math.min(phaseTime / approachDuration, 1)
        const ease = easeInOut(progress)

        for (let i = 0; i < NUM_LAYERS; i++) {
          // Blend velocity: base → adjusted (which lands on 0°)
          // Also decelerate toward the end
          const blendedV = BASE_VELOCITIES[i] + (adjustedVelocities[i] - BASE_VELOCITIES[i]) * ease
          // Additional decel in the last 30%
          const decelFactor = progress > 0.7 ? 1 - easeInOut((progress - 0.7) / 0.3) : 1
          velocities[i] = blendedV * decelFactor
          angles[i] += velocities[i] * dt
        }

        if (progress >= 1) {
          phase = 'holding'
          phaseTime = 0
          holdDuration = 1.2 + Math.random() * 0.6
          // Snap to clean 0°
          for (let i = 0; i < NUM_LAYERS; i++) {
            angles[i] = 0
            velocities[i] = 0
          }
        }
      } else if (phase === 'holding') {
        // Tiny alive drift
        for (let i = 0; i < NUM_LAYERS; i++) {
          angles[i] = Math.sin(now * 0.0008 + i * 1.7) * 0.3
        }

        if (phaseTime > holdDuration) {
          phase = 'departing'
          phaseTime = 0
        }
      } else if (phase === 'departing') {
        // Smoothly ramp back to base velocities
        const progress = Math.min(phaseTime / departDuration, 1)
        const ease = easeInOut(progress)

        for (let i = 0; i < NUM_LAYERS; i++) {
          velocities[i] = BASE_VELOCITIES[i] * ease
          angles[i] += velocities[i] * dt
        }

        if (progress >= 1) {
          phase = 'spinning'
          phaseTime = 0
          nextPause = 6 + Math.random() * 8 // 6-14s until next pause
        }
      }

      // Convergence for opacity (how close to aligned)
      const maxDist = Math.max(
        ...Array.from(angles).map(a => {
          const n = ((a % 360) + 360) % 360
          return Math.min(n, 360 - n)
        })
      )
      const convergence = 1 - Math.min(maxDist / 45, 1)

      for (let i = 0; i < NUM_LAYERS; i++) {
        portal.style.setProperty(LAYER_NAMES[i], `${angles[i].toFixed(2)}deg`)
      }
      portal.style.setProperty('--halo-convergence', convergence.toFixed(3))
    }

    frame = requestAnimationFrame(update)
    return () => cancelAnimationFrame(frame)
  }, [])

  return <div ref={ref} style={{ display: 'none' }} />
}
