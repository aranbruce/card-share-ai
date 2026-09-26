import { DoubleSide, ShaderMaterial, type Texture } from "three"
import { PAGE_CURL_RADIANS } from "@/lib/card-book"

/**
 * Bends a flat leaf (x = 0 at the spine, x = width at the free edge) around the spine.
 * Kept in sync with `curlPoint` in `lib/card-book.ts`, which is unit tested.
 */
const vertexShader = /* glsl */ `
  uniform float uProgress;
  uniform float uCurl;
  uniform float uWidth;
  uniform float uLift;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying float vSpine;

  const float PI = 3.141592653589793;

  void main() {
    vUv = uv;
    float s = position.x;
    float base = uProgress * PI;
    float k = -uCurl * sin(uProgress * PI) / uWidth;
    float a = base + k * s;

    vec3 p = vec3(0.0, position.y, uLift);
    if (abs(k) < 1e-5) {
      p.x = cos(base) * s;
      p.z += sin(base) * s;
    } else {
      p.x = (sin(a) - sin(base)) / k;
      p.z += (cos(base) - cos(a)) / k;
    }

    vNormal = normalize(normalMatrix * vec3(-sin(a), 0.0, cos(a)));
    vSpine = s / uWidth;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform sampler2D uFront;
  uniform sampler2D uBack;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying float vSpine;

  void main() {
    vec3 n = normalize(vNormal);
    vec4 color;
    if (gl_FrontFacing) {
      color = texture2D(uFront, vUv);
    } else {
      // The back is seen mirrored once the leaf has turned; flip u so it reads left to right.
      color = texture2D(uBack, vec2(1.0 - vUv.x, vUv.y));
      n = -n;
    }

    vec3 lightDir = normalize(vec3(-0.25, 0.45, 1.0));
    float light = 0.62 + 0.42 * max(dot(n, lightDir), 0.0);
    // Soft crease shadow along the fold.
    light *= mix(0.8, 1.0, smoothstep(0.0, 0.14, vSpine));

    gl_FragColor = vec4(color.rgb * light, 1.0);
    #include <colorspace_fragment>
  }
`

export type PageMaterial = ShaderMaterial & {
  uniforms: {
    uProgress: { value: number }
    uCurl: { value: number }
    uWidth: { value: number }
    uLift: { value: number }
    uFront: { value: Texture }
    uBack: { value: Texture }
  }
}

export function createPageMaterial(
  front: Texture,
  back: Texture,
  width: number,
): PageMaterial {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    side: DoubleSide,
    uniforms: {
      uProgress: { value: 0 },
      uCurl: { value: PAGE_CURL_RADIANS },
      uWidth: { value: width },
      uLift: { value: 0 },
      uFront: { value: front },
      uBack: { value: back },
    },
  }) as PageMaterial
}
