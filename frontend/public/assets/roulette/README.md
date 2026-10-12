const ORDER = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
const STEP = 360 / 37;

function spinTargets(winning, prevWheelDeg) {
  const wheelDeg = prevWheelDeg + 360 * 4 + Math.random() * 360;   // wheel spins clockwise
  const pocketDeg = ORDER.indexOf(winning) * STEP + wheelDeg;      // where the pocket ends up
  const ballDeg = -(360 * 6) + (((pocketDeg % 360) + 360) % 360);  // ball runs counter-clockwise, ends on the pocket
  return { wheelDeg, ballDeg };
}