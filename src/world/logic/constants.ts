// Pure module: no imports from React, three.js or the DOM.
//
// All values below are INITIAL values, approved for the first implementation
// and to be validated in testing. They may change after testing.

/** Walking speed in world units per second. */
export const WALK_SPEED = 2.5;
/** Radius of the Player's circular footprint, in world units. */
export const PLAYER_RADIUS = 0.35;
/** Maximum Player-to-Station distance for targeting, in world units. */
export const INTERACTION_RANGE = 2.0;
/** Maximum angle between camera forward and the direction to a Station, in degrees. */
export const INTERACTION_CONE_DEG = 35;
/** Camera pitch is clamped to +/- this many degrees. */
export const PITCH_LIMIT_DEG = 80;
/** Keyboard look angular speed, degrees per second. */
export const KEY_LOOK_DEG_PER_SEC = 90;
/** Mouse look sensitivity, radians per pixel. */
export const MOUSE_SENSITIVITY = 0.0022;
/** Mouse deltas with a magnitude above this many pixels are ignored. */
export const MOUSE_DELTA_MAX = 500;
/** Maximum frame time used for movement, in seconds. */
export const DT_MAX = 0.1;
/** Maximum distance per collision substep, in world units. */
export const MAX_STEP = 0.1;
/** Constant camera eye height above the floor, in world units. */
export const EYE_HEIGHT = 1.6;
/** Look smoothing rate (1/s) for the exponential approach of the rendered look to the target. Initial value, validated in testing. */
export const LOOK_SMOOTHING_LAMBDA = 32;
/** Movement smoothing rate (1/s) for the exponential approach of the velocity to the target. Initial value, validated in testing. */
export const MOVE_SMOOTHING_LAMBDA = 20;
