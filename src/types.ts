export type ObjectType = 'chart' | 'candle' | 'chess' | 'text';

export type CameraViewMode = 'through_lens' | 'front_of_lens';

export type DragTarget = 'object' | 'object_tip' | 'focus' | 'eye' | 'pan' | null;

export type OpticElementType =
  | 'convex_lens'
  | 'concave_lens'
  | 'concave_mirror'
  | 'convex_mirror';

export interface OpticsState {
  // Optic element mode
  opticType: OpticElementType;
  // Focal length magnitude in cm (e.g. 15 cm)
  focalLength: number;
  // Object distance in cm (u)
  objectDistance: number;
  // Object height in cm (h)
  objectHeight: number;
  // Observer eye distance in cm from optic vertex/center (d_eye)
  eyeDistance: number;
  // Active test object
  objectType: ObjectType;
  // Camera viewpoint: through optic / looking into mirror vs front/profile view
  viewMode: CameraViewMode;
  // Toggle show individual rays
  showRayParallel: boolean;
  showRayCentral: boolean;
  showRayFocal: boolean;
  showVirtualExtensions: boolean;
  // Lens / mirror aperture radius in cm (for physical light cone & clipping)
  lensRadius: number;
}

export interface OpticsCalculation {
  opticType: OpticElementType;
  isMirror: boolean;
  isConverging: boolean;
  u: number;
  f: number;
  signedF: number; // +f for convex lens & concave mirror; -f for concave lens & convex mirror
  v: number; // image distance
  absV: number;
  magnification: number; // M
  absMagnification: number;
  isReal: boolean;
  isVirtual: boolean;
  isInverted: boolean;
  isUpright: boolean;
  isAtFocus: boolean;
  imageHeight: number;
  diopters: number; // 100 / f (in m^-1)
  curvatureRadius: number; // R = 2f
  focalType: 'Real Focus' | 'Virtual Focus';
  imageLocationText: string;
  imageNatureDescription: 'Real' | 'Virtual' | 'No Image (Collimated)';
  imageOrientationDescription: 'Inverted' | 'Upright' | 'Collimated';
  imageSizeDescription: 'Magnified' | 'Diminished' | 'Same Size' | 'At Infinity';
  // Eye ray convergence analysis:
  eyeBeforeRealImage: boolean;
  eyeDefocusBlurPx: number; // calculated blur for first-person view
  eyeDistanceToImage: number;
}
