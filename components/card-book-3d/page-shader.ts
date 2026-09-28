import { Color, FrontSide, ShaderMaterial, type Texture } from "three"
import { PAGE_CURL_RADIANS } from "@/lib/card-book"

/** Card stock thickness in world units (page width = 1); a little thicker than life so it reads. */
export const LEAF_THICKNESS = 0.008

/**
 * Bends a leaf of card stock (x = 0 at the spine, x = width at the free edge, z = thickness)
 * around the spine. The leaf is a thin box: its ±z faces carry the page textures and the other
 * four faces are the paper edges. Kept in sync with `curlPoint` in `lib/card-book.ts`.
 */
const vertexShader = /* glsl */ `
  uniform float uProgress;
  uniform float uCurl;
  uniform float uWidth;
  uniform float uLift;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying float vSpine;
  varying float vFace;
  varying float vPageY;

  const float PI = 3.141592653589793;

  void main() {
    vUv = uv;
    float s = position.x;
    float base = uProgress * PI;
    float k = -uCurl * sin(uProgress * PI) / uWidth;
    float a = base + k * s;

    vec2 curve;
    if (abs(k) < 1e-5) {
      curve = vec2(cos(base) * s, sin(base) * s);
    } else {
      curve = vec2((sin(a) - sin(base)) / k, (cos(base) - cos(a)) / k);
    }

    vec3 tangent = vec3(cos(a), 0.0, sin(a));
    vec3 facing = vec3(-sin(a), 0.0, cos(a));
    vec3 p = vec3(curve.x, position.y, curve.y + uLift) + facing * position.z;
    vec3 n = tangent * normal.x + vec3(0.0, 1.0, 0.0) * normal.y + facing * normal.z;

    vNormal = normalize(normalMatrix * n);
    vSpine = s / uWidth;
    vFace = normal.z;
    vPageY = position.y;
    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    vViewPosition = mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`

const fragmentShader = /* glsl */ `
  uniform sampler2D uFront;
  uniform sampler2D uBack;
  uniform vec3 uEdgeColor;
  uniform float uGlossFront;
  uniform float uGlossBack;
  uniform float uShadowFront;
  uniform float uShadowBack;
  uniform float uCorner;
  uniform float uWidth;
  uniform float uHalfHeight;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying float vSpine;
  varying float vFace;
  varying float vPageY;

  void main() {
    // Rounded fore-edge corners (the spine stays square, like a folded card). uCorner is
    // the radius in page widths, 0 for none.
    if (uCorner > 0.0) {
      // The paper edges light darker than the faces and read as a hairline against the
      // rounded corner, so rounded cards show their faces only.
      if (abs(vFace) < 0.5) discard;
      float r = uCorner * uWidth;
      vec2 p = vec2((1.0 - vSpine) * uWidth, uHalfHeight - abs(vPageY));
      if (p.x < r && p.y < r && length(vec2(r) - p) > r) discard;
    }
    vec3 n = normalize(vNormal);
    vec3 color;
    float gloss = 0.0;
    float castShadow = 0.0;
    bool isFace = abs(vFace) > 0.5;

    if (vFace > 0.5) {
      color = texture2D(uFront, vUv).rgb;
      gloss = uGlossFront;
      castShadow = uShadowFront;
    } else if (vFace < -0.5) {
      // Box UVs on the -z face already read left to right once the leaf has turned.
      color = texture2D(uBack, vUv).rgb;
      gloss = uGlossBack;
      castShadow = uShadowBack;
    } else {
      color = uEdgeColor;
    }

    // Soft, mostly frontal key light so facing pages read evenly bright.
    vec3 lightDir = normalize(vec3(-0.2, 0.5, 1.0));
    float diffuse = max(dot(n, lightDir), 0.0);
    float light = 0.66 + 0.38 * diffuse;

    if (isFace) {
      // Crease shading along the fold and a faint falloff at the fore-edge.
      light *= mix(0.86, 1.0, smoothstep(0.0, 0.12, vSpine));
      light *= mix(0.95, 1.0, smoothstep(0.0, 0.04, 1.0 - vSpine));
      // Shadow from a page lifting over this one; deepest near the spine.
      light *= 1.0 - castShadow * (1.0 - 0.55 * vSpine);
    }

    // Broad, soft highlight from a light near the camera so glossy covers catch a sheen that
    // slides across them as the card tilts.
    vec3 viewDir = normalize(-vViewPosition);
    vec3 glossLight = normalize(vec3(-0.25, 0.35, 1.0));
    vec3 halfDir = normalize(glossLight + viewDir);
    float spec = pow(max(dot(n, halfDir), 0.0), 28.0) * gloss * 0.45;
    float sheen = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0) * gloss * 0.25;

    gl_FragColor = vec4(color * light + vec3(spec + sheen), 1.0);
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
    uEdgeColor: { value: Color }
    uGlossFront: { value: number }
    uGlossBack: { value: number }
    uShadowFront: { value: number }
    uShadowBack: { value: number }
    uCorner: { value: number }
    uHalfHeight: { value: number }
  }
}

export function createPageMaterial(
  front: Texture,
  back: Texture,
  width: number,
  gloss: { front: number; back: number },
): PageMaterial {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    side: FrontSide,
    uniforms: {
      uProgress: { value: 0 },
      uCurl: { value: PAGE_CURL_RADIANS },
      uWidth: { value: width },
      uLift: { value: 0 },
      uFront: { value: front },
      uBack: { value: back },
      // Warm off-white card stock seen edge-on.
      uEdgeColor: { value: new Color("#efe6d4") },
      uGlossFront: { value: gloss.front },
      uGlossBack: { value: gloss.back },
      uShadowFront: { value: 0 },
      uShadowBack: { value: 0 },
      uCorner: { value: 0 },
      uHalfHeight: { value: 0.5 },
    },
  }) as PageMaterial
}
