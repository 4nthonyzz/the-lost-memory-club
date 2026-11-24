/** M1 lights: ambient plus two point lights (3 total, cap is 4). Only background and ambient depend on memoryShifted. */
import { paletteFor } from '../logic/palette'

export const M1_LIGHT_COUNT = 3
/** M3 adds one point light for the Arcade_Area (ambient + 3 point lights). */
export const M3_LIGHT_COUNT = 4

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
      {/* Arcade_Area (x 5.3..9.3), warm violet. Ambient + 3 point lights = 4, the cap. */}
      <pointLight position={[7.3, 2.4, 0]} color="#9a6ae0" intensity={5} distance={6} decay={2} />
    </>
  )
}
