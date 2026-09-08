import { OpticElementType, OpticsCalculation, OpticsState } from '../types';

export function calculateOptics(state: OpticsState): OpticsCalculation {
  const {
    opticType = 'convex_lens',
    focalLength: f,
    objectDistance: u,
    objectHeight: ho,
    eyeDistance: deye,
  } = state;

  const epsilon = 0.05;
  const isMirror = opticType === 'concave_mirror' || opticType === 'convex_mirror';
  const isConverging = opticType === 'convex_lens' || opticType === 'concave_mirror';
  const curvatureRadius = +(2 * f).toFixed(1);

  let signedF = f;
  let v = 0;
  let M = 1;
  let isAtFocus = false;

  if (opticType === 'convex_lens') {
    // 1. Convex Lens (Converging Refractor)
    signedF = f;
    isAtFocus = Math.abs(u - f) < epsilon;
    if (isAtFocus) {
      v = Infinity;
      M = Infinity;
    } else {
      // 1/v = 1/f - 1/u => v = (f * u) / (u - f)
      v = (f * u) / (u - f);
      M = f / (f - u);
    }
  } else if (opticType === 'concave_lens') {
    // 2. Concave Lens (Diverging Refractor)
    signedF = -f;
    isAtFocus = false;
    // 1/v = 1/(-f) - 1/u => v = - (f * u) / (f + u)
    v = -(f * u) / (f + u);
    // M = v / (-u) = f / (f + u)
    M = f / (f + u);
  } else if (opticType === 'concave_mirror') {
    // 3. Concave Mirror (Converging Reflector)
    signedF = f;
    isAtFocus = Math.abs(u - f) < epsilon;
    if (isAtFocus) {
      v = Infinity;
      M = Infinity;
    } else {
      // 1/v + 1/u = 1/f => v = (f * u) / (u - f)
      v = (f * u) / (u - f);
      // M = -v / u = f / (f - u)
      M = f / (f - u);
    }
  } else {
    // 4. Convex Mirror (Diverging Reflector)
    signedF = -f;
    isAtFocus = false;
    // 1/v + 1/u = -1/f => v = - (f * u) / (f + u)
    v = -(f * u) / (f + u);
    // M = -v / u = f / (f + u)
    M = f / (f + u);
  }

  const absV = isFinite(v) ? Math.abs(v) : Infinity;
  const absMagnification = isFinite(M) ? Math.abs(M) : Infinity;
  const isReal = isConverging && u > f && !isAtFocus;
  const isVirtual = !isReal && !isAtFocus;
  const isInverted = isReal;
  const isUpright = !isInverted && !isAtFocus;
  const imageHeight = isFinite(absMagnification) ? absMagnification * ho : ho * 10;
  const diopters = +(100 / f).toFixed(2);
  const focalType: 'Real Focus' | 'Virtual Focus' = isConverging ? 'Real Focus' : 'Virtual Focus';

  // Eye convergence and defocus blur logic
  let eyeBeforeRealImage = false;
  let eyeDefocusBlurPx = 0;
  let eyeDistanceToImage = 0;

  if (isReal && isFinite(v)) {
    eyeDistanceToImage = deye - v;
    if (deye < v) {
      eyeBeforeRealImage = true;
      const unconvergedRatio = Math.min(1.5, (v - deye) / Math.max(5, v));
      eyeDefocusBlurPx = Math.max(0, unconvergedRatio * 32);
    } else {
      eyeBeforeRealImage = false;
      eyeDefocusBlurPx = 0;
    }
  } else if (isAtFocus) {
    eyeBeforeRealImage = false;
    eyeDefocusBlurPx = 20;
    eyeDistanceToImage = Infinity;
  } else {
    // Virtual image
    eyeBeforeRealImage = false;
    eyeDefocusBlurPx = 0;
    eyeDistanceToImage = deye + absV;
  }

  // Textual descriptions for math readouts
  let imageLocationText = '';
  if (isAtFocus) {
    imageLocationText = isMirror ? 'v = ∞ (Collimated Beam)' : 'v = ∞ (Parallel Rays)';
  } else if (isMirror) {
    imageLocationText = isReal
      ? `v = +${v.toFixed(1)} cm (In front of mirror)`
      : `v = ${v.toFixed(1)} cm • |v| = ${absV.toFixed(1)} cm (Behind Mirror)`;
  } else {
    imageLocationText = isReal
      ? `v = +${v.toFixed(1)} cm (Right of lens)`
      : `v = ${v.toFixed(1)} cm • |v| = ${absV.toFixed(1)} cm (Left of Lens)`;
  }

  const imageNatureDescription: 'Real' | 'Virtual' | 'No Image (Collimated)' = isAtFocus
    ? 'No Image (Collimated)'
    : isReal
    ? 'Real'
    : 'Virtual';

  const imageOrientationDescription: 'Inverted' | 'Upright' | 'Collimated' = isAtFocus
    ? 'Collimated'
    : isInverted
    ? 'Inverted'
    : 'Upright';

  let imageSizeDescription: 'Magnified' | 'Diminished' | 'Same Size' | 'At Infinity' = 'At Infinity';
  if (isAtFocus) {
    imageSizeDescription = 'At Infinity';
  } else if (Math.abs(absMagnification - 1.0) < 0.04) {
    imageSizeDescription = 'Same Size';
  } else if (absMagnification > 1.0) {
    imageSizeDescription = 'Magnified';
  } else {
    imageSizeDescription = 'Diminished';
  }

  return {
    opticType,
    isMirror,
    isConverging,
    u,
    f,
    signedF,
    v,
    absV,
    magnification: M,
    absMagnification,
    isReal,
    isVirtual,
    isInverted,
    isUpright,
    isAtFocus,
    imageHeight,
    diopters,
    curvatureRadius,
    focalType,
    imageLocationText,
    imageNatureDescription,
    imageOrientationDescription,
    imageSizeDescription,
    eyeBeforeRealImage,
    eyeDefocusBlurPx,
    eyeDistanceToImage,
  };
}

export interface PresetItem {
  id: string;
  name: string;
  uFactor: number;
  description: string;
}

export const PRESETS_BY_TYPE: Record<OpticElementType, PresetItem[]> = {
  convex_lens: [
    {
      id: 'cvx_magnifier',
      name: 'Magnifying Glass',
      uFactor: 0.5,
      description: 'u = 0.5f • Virtual, upright & 2.0× magnified',
    },
    {
      id: 'cvx_focus',
      name: 'At Focal Point (F)',
      uFactor: 1.0,
      description: 'u = 1.0f • Collimated parallel rays (v → ∞)',
    },
    {
      id: 'cvx_projector',
      name: 'Slide Projector',
      uFactor: 1.5,
      description: 'u = 1.5f • Real, inverted & 2.0× enlarged',
    },
    {
      id: 'cvx_2f',
      name: 'Unit Conjugate (2F)',
      uFactor: 2.0,
      description: 'u = 2.0f • Real, inverted & 1:1 equal size at 2F',
    },
    {
      id: 'cvx_camera',
      name: 'Distant Object',
      uFactor: 3.5,
      description: 'u = 3.5f • Real, inverted & diminished (0.4×)',
    },
  ],
  concave_lens: [
    {
      id: 'ccv_close',
      name: 'Reading Distance',
      uFactor: 0.5,
      description: 'u = 0.5f • Virtual, upright, diminished (0.67×)',
    },
    {
      id: 'ccv_focus',
      name: 'At Focal Distance',
      uFactor: 1.0,
      description: 'u = 1.0f • Virtual, upright, half size (0.50×)',
    },
    {
      id: 'ccv_medium',
      name: 'Mid Range Object',
      uFactor: 2.0,
      description: 'u = 2.0f • Virtual, upright, one-third size (0.33×)',
    },
    {
      id: 'ccv_far',
      name: 'Distant Landscape',
      uFactor: 3.5,
      description: 'u = 3.5f • Virtual, upright, compact (0.22×)',
    },
  ],
  concave_mirror: [
    {
      id: 'ccm_vanity',
      name: 'Vanity / Makeup Mirror',
      uFactor: 0.5,
      description: 'u = 0.5f • Virtual, upright & 2.0× magnified behind mirror',
    },
    {
      id: 'ccm_headlight',
      name: 'Headlight Collimator',
      uFactor: 1.0,
      description: 'u = 1.0f • Reflected rays form parallel beam (v → ∞)',
    },
    {
      id: 'ccm_solar',
      name: 'Solar Concentrator',
      uFactor: 1.5,
      description: 'u = 1.5f • Real, inverted & 2.0× magnified in front',
    },
    {
      id: 'ccm_center_c',
      name: 'Center of Curvature (C)',
      uFactor: 2.0,
      description: 'u = 2.0f = C • Real, inverted, 1:1 scale at C',
    },
    {
      id: 'ccm_telescope',
      name: 'Reflector Telescope',
      uFactor: 3.5,
      description: 'u = 3.5f • Real, inverted & diminished in front of mirror',
    },
  ],
  convex_mirror: [
    {
      id: 'cvm_close',
      name: 'Close Reflection',
      uFactor: 0.5,
      description: 'u = 0.5f • Virtual, upright, diminished (0.67×) behind mirror',
    },
    {
      id: 'cvm_security',
      name: 'Store Security Mirror',
      uFactor: 1.0,
      description: 'u = 1.0f • Wide panoramic field of view (0.50×)',
    },
    {
      id: 'cvm_car',
      name: 'Passenger Side Mirror',
      uFactor: 2.0,
      description: 'u = 2.0f • "Objects in mirror are closer than they appear" (0.33×)',
    },
    {
      id: 'cvm_street',
      name: 'Blind Intersection Mirror',
      uFactor: 3.5,
      description: 'u = 3.5f • Extreme wide angle security view (0.22×)',
    },
  ],
};

export const PRESETS = PRESETS_BY_TYPE.convex_lens;
