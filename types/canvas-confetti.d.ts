declare module 'canvas-confetti' {
  type Options = {
    particleCount?: number
    spread?: number
    origin?: { x?: number; y?: number }
    scalar?: number
    ticks?: number
  }
  export default function confetti(options?: Options): void
}
