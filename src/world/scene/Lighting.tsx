/** M1 lights: ambient plus two point lights (3 total, cap is 4). Only background and ambient depend on memoryShifted. */
import { paletteFor } from '../logic/palette'

export const M1_LIGHT_COUNT = 3

export function Lighting({ memoryShifted }: { memoryShifted: boolean }) {
  const palette = paletteFor(memoryShifted)
  return (
    <>
      <color attach="background" args={[palette.background]} />
      <ambientLight color={palette.ambient} intensity={palette.ambientIntensity} />
      {/* Over the CRT, cool teal. */}
      <pointLight position={[-2.5, 2.2, -2.6]} color="#4fe0d0" intensity={6} distance={7} decay={2} />
      {/* Near the arcade, magenta. */}
      <pointLight position={[2.5, 2.2, -2.6]} color="#d84fd0" intensity={6} distance={7} decay={2} />
    </>
  )
}
