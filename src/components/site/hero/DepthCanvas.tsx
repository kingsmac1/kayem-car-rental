import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

const vert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

// Depth-parallax: each pixel is displaced by (depth - focus) × pointer offset,
// so the car (bright in the depth map) moves against the floor and backdrop.
const frag = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uImage;
uniform sampler2D uDepth;
uniform vec2 uMouse;
uniform vec2 uRes;
uniform vec2 uImgRes;
uniform float uStrength;
uniform float uReveal;
uniform float uTime;

vec2 cover(vec2 uv) {
  float rs = uRes.x / uRes.y;
  float ri = uImgRes.x / uImgRes.y;
  vec2 s = rs > ri ? vec2(1.0, ri / rs) : vec2(rs / ri, 1.0);
  // Zoom in slightly so displaced edges never show.
  return (uv - 0.5) * s * 0.92 + 0.5 - vec2(0.0, 0.13);
}

void main() {
  vec2 uv = cover(vUv);
  // Sample depth a few times for a softer, artefact-free displacement.
  float d = texture2D(uDepth, uv).r * 0.6
          + texture2D(uDepth, uv + vec2(0.004, 0.0)).r * 0.2
          + texture2D(uDepth, uv - vec2(0.004, 0.0)).r * 0.2;
  vec2 offset = uMouse * (d - 0.45) * uStrength;
  vec3 col = texture2D(uImage, uv + offset).rgb;

  // Grade: mostly monochrome with a warm lift, so the accent yellow owns the colour.
  float l = dot(col, vec3(0.299, 0.587, 0.114));
  vec3 mono = vec3(l) * vec3(1.02, 1.0, 0.96);
  col = mix(col, mono, 0.82);
  col = (col - 0.5) * 1.12 + 0.5;

  // Vignette and a floor gradient so overlay text stays readable.
  float v = smoothstep(1.15, 0.35, length((vUv - vec2(0.5, 0.55)) * vec2(1.25, 1.0)));
  col *= mix(0.5, 1.12, v);
  col *= mix(0.6, 1.0, smoothstep(0.0, 0.3, vUv.y));

  // Light sweep across the body as it reveals.
  float sweep = smoothstep(0.08, 0.0, abs(vUv.x - (uReveal * 1.6 - 0.3))) * d * 0.25 * (1.0 - uReveal);
  col += sweep;

  gl_FragColor = vec4(col * uReveal, 1.0);
}
`

function Plane({ image, depth, pointer, onFirstFrame, onSlow }: { image: string; depth: string; pointer: React.RefObject<{ x: number; y: number }>; onFirstFrame: () => void; onSlow: () => void }) {
  const [tex, dep] = useTexture([image, depth])
  const { size } = useThree()
  const mouse = useRef(new THREE.Vector2())
  const frames = useRef({ n: 0, t0: 0, reported: false })

  useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace
    tex.minFilter = THREE.LinearFilter
    dep.minFilter = THREE.LinearFilter
  }, [tex, dep])

  const uniforms = useMemo(
    () => ({
      uImage: { value: tex },
      uDepth: { value: dep },
      uMouse: { value: new THREE.Vector2() },
      uRes: { value: new THREE.Vector2(size.width, size.height) },
      uImgRes: { value: new THREE.Vector2((tex.image as HTMLImageElement).width, (tex.image as HTMLImageElement).height) },
      uStrength: { value: 0.045 },
      uReveal: { value: 0 },
      uTime: { value: 0 },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tex, dep],
  )

  useEffect(() => {
    uniforms.uRes.value.set(size.width, size.height)
  }, [size, uniforms])

  useFrame((state, delta) => {
    const p = pointer.current ?? { x: 0, y: 0 }
    mouse.current.lerp(new THREE.Vector2(p.x, p.y), 1 - Math.pow(0.0025, delta))
    uniforms.uMouse.value.copy(mouse.current)
    uniforms.uReveal.value = Math.min(1, uniforms.uReveal.value + delta * 0.9)
    uniforms.uTime.value = state.clock.elapsedTime

    // FPS watchdog for the first 2.5 s: fall back to CSS parallax on slow devices.
    const f = frames.current
    if (f.n === 0) {
      f.t0 = performance.now()
      onFirstFrame()
    }
    f.n++
    if (!f.reported && performance.now() - f.t0 > 2500) {
      f.reported = true
      const fps = (f.n / (performance.now() - f.t0)) * 1000
      if (fps < 32) onSlow()
    }
  })

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial vertexShader={vert} fragmentShader={frag} uniforms={uniforms} depthWrite={false} depthTest={false} />
    </mesh>
  )
}

export default function DepthCanvas({ image, depth, pointer, active, onReady, onSlow }: { image: string; depth: string; pointer: React.RefObject<{ x: number; y: number }>; active: boolean; onReady: () => void; onSlow: () => void }) {
  return (
    <Canvas
      className="!absolute inset-0"
      dpr={[1, 1.75]}
      gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
      frameloop={active ? 'always' : 'never'}
      orthographic
      camera={{ position: [0, 0, 1] }}
      aria-hidden
    >
      <Plane image={image} depth={depth} pointer={pointer} onFirstFrame={onReady} onSlow={onSlow} />
    </Canvas>
  )
}
