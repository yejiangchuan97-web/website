/* Framing descriptors in scene units. Moving components resolve from current parts. */
window.componentFrame = function (mode, key, p, params) {
  const v = (x, y, z) => new THREE.Vector3(x, y, z),
    frame = (x, y, z, w, h, d) => ({ center: v(x, y, z), size: v(w, h, d) });
  if (mode === "gear") {
    const wheel = (x, r) =>
      frame(x, p.y, 0.36, 2 * r + 0.22, 2 * r + 0.22, 0.8);
    if (key === "driver") return wheel(p.x1, p.r1);
    if (key === "driven") return wheel(p.x2, p.r2);
    if (key === "input-shaft" || key === "output-shaft")
      return frame(
        key === "input-shaft" ? p.x1 : p.x2,
        p.y,
        -0.28,
        0.5,
        0.5,
        2.6,
      );
    if (key === "bearing") return frame(p.x2, 1.7, -1.2, 0.9, 3.05, 1.1);
    if (key === "motor") return frame(p.x1, p.y, -2.03, 1.05, 1.05, 1.2);
    if (key === "mesh") return frame(p.x1 + p.r1, p.y, 0.35, 0.95, 1.1, 0.65);
    if (key === "contact")
      return frame(
        p.x1 - p.r1 * 0.75,
        p.y + p.r1 * 0.35,
        0.4,
        p.r1 * 1.25,
        p.r1 * 1.6,
        0.8,
      );
    if (key === "flexible")
      return frame(
        (p.x1 - p.r1 + p.x2 + p.r2) / 2,
        p.y,
        0.38,
        p.x2 - p.x1 + p.r1 + p.r2 + 0.25,
        2 * p.r2 + 0.25,
        0.8,
      );
  } else {
    const Y = p.Y,
      R = p.R,
      x = p.piston.position.x,
      rodR = R * (mode === "hyd" ? 0.5 : 0.4);
    const frames = {
      barrel: () => frame(-0.87, Y, 0, 4.5, 2 * R + 0.25, 2 * R + 0.25),
      piston: () => frame(x, Y, 0, 0.32, 2 * R + 0.14, 2 * R + 0.14),
      rod: () => frame(x + 2.8, Y, 0, 4.8, 2 * rodR + 0.25, 2 * rodR + 0.25),
      "chamber-a": () =>
        frame(
          (-3.065 + x - 0.095) / 2,
          Y,
          0,
          Math.max(0.6, x + 2.97),
          2 * R,
          2 * R,
        ),
      "chamber-b": () =>
        frame(
          (1.325 + x + 0.095) / 2,
          Y,
          0,
          Math.max(0.6, 1.23 - x),
          2 * R,
          2 * R,
        ),
      "port-a": () => frame(-3.23, Y, R + 0.4, 0.6, 0.6, 0.65),
      "port-b": () => frame(1.46, Y, R + 0.4, 0.6, 0.6, 0.65),
      valve: () => frame(-0.35, 0.88, 1.98, 1.7, 0.7, 1),
      gauge: () => frame(-0.35, 1.35, 2.1, 0.58, 0.58, 0.3),
      tank: () => frame(-4.65, 0.95, 0.07, 1.9, 1.4, 1.5),
      pump: () => frame(-2.55, 0.77, 1.88, 0.8, 0.8, 0.85),
      "pump-motor": () => frame(-3.1, 0.77, 1.88, 1, 0.95, 0.95),
      relief: () => frame(-1.3, 0.65, 2.39, 0.55, 0.65, 0.6),
      return: () => frame(-2.3, 0.79, 1.55, 5.2, 1.1, 2.4),
      receiver: () => frame(-4.62, 0.91, 0.05, 2.15, 1.2, 1.2),
      compressor: () => frame(-4.5, 1.56, 0.05, 1.35, 0.6, 1),
      regulator: () => frame(-2.65, 0.82, 1.88, 0.8, 1.1, 0.8),
      silencer: () => frame(-4.64, 1.24, 0.57, 0.5, 0.65, 0.5),
      supply: () => frame(-1.65, 0.76, 1.94, 1.7, 0.4, 0.5),
    };
    if (frames[key]) return frames[key]();
  }
  return frame(0, 0.22, 0, 12.5, 0.6, 5.7);
};
