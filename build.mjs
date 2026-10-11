import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../skills/anatomy/kit/iso-kit.mjs";
import * as G from "../../skills/anatomy/kit/lathe.mjs";
import { kitScript } from "../../skills/anatomy/scripts/inline-kit.mjs";
import { CELL, LEVELS, MAX_POWER, SLOW_MOTION, readoutOf, stateOf } from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

// ---------------------------------------------------------------- world (1 unit = 1 mm)
const WIDTH = 600;
const HEIGHT = 600;

const PLATE = { x: -92, y: -54, w: 184, d: 108, r: 8 };
const PLATE_H = 10;
const FOOT_H = 5;

// handle: a 34 x 36 shell, walls 2, standing on the plate. The +x and +y walls are cut away.
const HANDLE = { x: -17, y: -15, w: 34, d: 30 };
const WALL = 2;
const HANDLE_TOP = 92;

// head: a ring shroud around the y axis, blowing toward +y
const ZC = 140;
const R_OUT = 52;
const R_IN = 50;
const HEAD_Y0 = -15;
const HEAD_Y1 = 15;
const FH = G.frameOf([0, 0, ZC], [0, 1, 0], [1, 0, 0], [0, 0, 1]);

const BLADES = 5;
const BLADE_S0 = 2.4;
const BLADE_S1 = 3.9;
const BLADE_R0 = 9;

const CELL_AT = [0, -2.5];
const CELL_R = 10.5;
const CELL_Z0 = 5;
const CELL_Z1 = 74;

// airflow vane: a plate hanging from a hinge in front of the fan; it leans with the air pressure
const VANE = { x: -46, y: 30, hinge: 132, len: 40, half: 8 };

const PCB = { x: -13, y: 8.4, w: 26, d: 1.6, r: 1.5 };
const PCB_Z0 = 9;
const PCB_Z1 = 55;
const FACE_Y = PCB.y + PCB.d; // component face (+y side)

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    [-R_OUT - 2, 0, ZC],
    [R_OUT + 2, 0, ZC],
    [0, HEAD_Y1 + 2, ZC + R_OUT + 2],
    [0, HEAD_Y0 - 2, ZC + R_OUT + 2],
    [VANE.x - 8, VANE.y + 46, VANE.hinge + 4],
  ],
  WIDTH,
  HEIGHT,
  { pad: 22, azimuth: 52, elevation: 28 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const seg = (a, b) => k.segment(a, b, P);
const polyline = (points) => k.pathOf(points.map(at));
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const frontAxis = (x, z, y = FACE_Y) => G.frameOf([x, y, z], [0, 1, 0], [1, 0, 0], [0, 0, 1]);

// ---------------------------------------------------------------- base plate
const SCOPE = { x: 42, y: -44, w: 44, d: 30, r: 3 };

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  // footprint seat for the handle
  out.push(L(k.planOutline({ x: HANDLE.x - 5, y: HANDLE.y - 5, w: HANDLE.w + 10, d: HANDLE.d + 10, r: 5 }, 0, P), { tone: "faint" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // ruler in millimetres along the front edge: minor every 5, major every 10
  const strip = { x: -80, y: PLATE.y + PLATE.d - 15, w: 160, d: 7, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 5, 2, strip.y + 0.8, 0.6, [2, 3.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 2, strip.y + 3.5, 0.6])], { size: 0.45 }));
  // label plate with three rule lines
  const label = { x: -84, y: -46, w: 40, d: 20, r: 2 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 3, 0.3), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 2), 0.8, P, 3), { tone: "faint" }));
  [-39.5, -34.5, -29.5].forEach((y, i) => out.push(L(k.lineOnTop([label.x + 6, y], [label.x + label.w - 6 - i * 9, y], 0.8, P), { tone: "faint", free: true })));
  out.push(D([at([label.x + 3.2, label.y + 3.2, 0.8]), at([label.x + label.w - 3.2, label.y + label.d - 3.2, 0.8])], { size: 0.4 }));
  return out.join("");
}

// the scope: a recessed window that draws the PWM waveform on the motor's negative rail
function scope() {
  const out = [];
  out.push(S(k.slabOf(SCOPE, 0, 3, P, 4, 0.5), { tone: "mid" }));
  const win = k.insetPlan(SCOPE, 3);
  out.push(S(k.slabOf(win, 3, 0.4, P, 3), { tone: "lo", crease: "none" }));
  // graticule: 4 x 3 divisions
  const gx0 = win.x + 2, gx1 = win.x + win.w - 2, gy0 = win.y + 2, gy1 = win.y + win.d - 2;
  const grid = [];
  for (let i = 0; i <= 4; i++) grid.push(k.lineOnTop([gx0 + ((gx1 - gx0) * i) / 4, gy0], [gx0 + ((gx1 - gx0) * i) / 4, gy1], 3.4, P));
  for (let j = 0; j <= 2; j++) grid.push(k.lineOnTop([gx0, gy0 + ((gy1 - gy0) * j) / 2], [gx1, gy0 + ((gy1 - gy0) * j) / 2], 3.4, P));
  out.push(L(grid.join(""), { tone: "faint" }));
  out.push(`<path data-part="pwm" class="iso-line" data-tone="lit" d="${pwmPath(LEVELS[0].duty)}" style="stroke-width:1"/>`);
  out.push(D(k.corners(SCOPE, 1.6).map(([x, y]) => at([x, y, 3])), { size: 0.4 }));
  // two knobs on the front edge
  [[SCOPE.x + 10, SCOPE.y + SCOPE.d - 1.5], [SCOPE.x + 20, SCOPE.y + SCOPE.d - 1.5]].forEach(([x, y]) => {
    out.push(S(k.cylinder(x, y, 1.8, 3 - 0.2, 2.2, P, 16), { tone: "mid" }));
  });
  return out.join("");
}

// four periods of a 19.9 kHz square wave, high for `duty` of each period
function pwmPath(duty) {
  const win = k.insetPlan(SCOPE, 3);
  const x0 = win.x + 2, x1 = win.x + win.w - 2;
  const yLow = win.y + win.d - 6, yHigh = win.y + 6;
  const periods = 4;
  const width = (x1 - x0) / periods;
  if (duty > 0.995) return k.onTop([[x0, yHigh], [x1, yHigh]], 3.6, P);
  const points = [[x0, yLow]];
  for (let i = 0; i < periods; i++) {
    const a = x0 + i * width;
    points.push([a, yHigh], [a + width * duty, yHigh], [a + width * duty, yLow], [a + width, yLow]);
  }
  return k.onTop(points, 3.6, P);
}

// ---------------------------------------------------------------- handle shell (cutaway)
function shellWalls() {
  const out = [];
  const x0 = HANDLE.x, y0 = HANDLE.y, w = HANDLE.w, d = HANDLE.d;
  out.push(`<path class="iso-halo" d="${k.haloOf(k.insetPlan({ x: x0, y: y0, w, d, r: 4 }, 2), 0, 0.1, P)}" style="filter:blur(3px)"/>`);
  out.push(S(k.slabOf({ x: x0, y: y0, w, d, r: 4 }, 0, 4, P, 6, 0.5), { tone: "mid" }));
  // far walls: -x and -y
  out.push(S(k.slabOf({ x: x0, y: y0, w: WALL, d, r: 0.6 }, 4, HANDLE_TOP - 4, P, 3, 0.4), { tone: "mid" }));
  out.push(S(k.slabOf({ x: x0 + WALL, y: y0, w: w - WALL, d: WALL, r: 0.6 }, 4, HANDLE_TOP - 4, P, 3, 0.4), { tone: "mid" }));
  // seams and screw bosses on the inner face of the -x wall
  out.push(L(k.rise([x0 + WALL, y0 + 6, 0], 6, HANDLE_TOP - 8, P), { tone: "faint" }));
  out.push(D([[x0 + WALL, -8, 12], [x0 + WALL, -8, 70], [x0 + WALL, 8, 12], [x0 + WALL, 8, 70]].map(at), { size: 0.45 }));
  return out.join("");
}

// ---------------------------------------------------------------- the cell (21700 Li-ion)
function cell() {
  const out = [];
  const [cx, cy] = CELL_AT;
  out.push(S(k.cylinder(cx, cy, CELL_R, CELL_Z0, CELL_Z1 - CELL_Z0, P, 40, 0.5), { tone: "hi", crease: "lo" }));
  out.push(L([CELL_Z0 + 3, CELL_Z1 - 8, CELL_Z1 - 3].map((z) => k.sideArc(cx, cy, CELL_R, z, P, 20)).join(""), { tone: "faint" }));
  out.push(L(k.knurl(cx, cy, CELL_R, CELL_Z1 - 8, CELL_Z1 - 3, 18, P, 0), { tone: "lo" }));
  out.push(S(k.cylinder(cx, cy, 4.2, CELL_Z1, 1.6, P, 20), { tone: "mid" }));
  out.push(S(k.cylinder(cx, cy, 8.6, CELL_Z1 - 0.2, 0.5, P, 32), { tone: "lo", crease: "none" }));
  out.push(S(k.cylinder(cx, cy, 5, CELL_Z0 - 1.2, 1.2, P, 20), { tone: "mid" }));
  return out.join("");
}

// ---------------------------------------------------------------- the board
const PADS = {
  charge: { x: -10, y: FACE_Y, w: 6, d: 1.0, r: 0.4, z: 30, h: 6 },
  coil: { x: -11, y: FACE_Y, w: 7, d: 3.2, r: 0.8, z: 17, h: 7 },
  mcu: { x: 2.5, y: FACE_Y, w: 5, d: 1.2, r: 0.3, z: 31, h: 4 },
  mosfet: { x: 6, y: FACE_Y, w: 3, d: 1.1, r: 0.3, z: 23, h: 2.6 },
  guard: { x: -0.5, y: FACE_Y, w: 3, d: 1.1, r: 0.3, z: 22, h: 2.6 },
};

function board() {
  const out = [];
  out.push(S(k.slabOf(PCB, PCB_Z0, PCB_Z1 - PCB_Z0, P, 3, 0.2), { tone: "lo", crease: "mid" }));
  // mounting holes
  const holes = [[-10.5, PCB_Z0 + 3], [10.5, PCB_Z0 + 3], [-10.5, PCB_Z1 - 3], [10.5, PCB_Z1 - 3]].map(([x, z]) => [x, FACE_Y, z]);
  out.push(D(holes.map(at), { size: 0.5 }));
  // traces on the component face
  const trace = (points) => polyline(points.map(([x, z]) => [x, FACE_Y, z]));
  out.push(L([
    trace([[-7, 30], [-7, 24], [-3, 24], [-3, 17.5]]),
    trace([[-4, 33], [2.5, 33], [2.5, 31]]),
    trace([[6.5, 31], [6.5, 25.6]]),
    trace([[0.5, 22], [0.5, 19], [8, 19], [8, 23]]),
    trace([[-7, 17], [-7, 12], [-2.5, 12]]),
    trace([[3, 12], [3, 20]]),
  ].join(""), { tone: "faint" }));
  // MCU legs first, so their inner ends hide under the chip body
  const legs = [];
  for (let i = 0; i < 4; i++) {
    legs.push(seg([PADS.mcu.x - 0.4, FACE_Y, PADS.mcu.z + 0.6 + i * 0.95], [PADS.mcu.x + 0.8, FACE_Y, PADS.mcu.z + 0.6 + i * 0.95]));
    legs.push(seg([PADS.mcu.x + PADS.mcu.w - 0.8, FACE_Y, PADS.mcu.z + 0.6 + i * 0.95], [PADS.mcu.x + PADS.mcu.w + 0.4, FACE_Y, PADS.mcu.z + 0.6 + i * 0.95]));
  }
  out.push(L(legs.join(""), { tone: "lo" }));
  // chips
  for (const [name, p] of Object.entries(PADS)) {
    const plan = { x: p.x, y: p.y, w: p.w, d: p.d, r: p.r };
    out.push(S(k.slabOf(plan, p.z, p.h, P, 2, name === "coil" ? 0.5 : 0.2), { tone: name === "coil" ? "mid" : "hi", crease: "lo" }));
  }
  // pin-1 dot and legs on the two ICs
  out.push(D([[PADS.charge.x + 0.9, FACE_Y + 1.0, PADS.charge.z + PADS.charge.h - 0.9], [PADS.mcu.x + 0.8, FACE_Y + 1.2, PADS.mcu.z + PADS.mcu.h - 0.8]].map(at), { size: 0.35, tone: "lo" }));
  // small parts: capacitors and a gate resistor
  for (const [x, z, w, h] of [[-3.2, 36.5, 2, 1.1], [4, 37, 2, 1.1], [8.5, 31, 1.1, 2], [-6.8, 12.5, 2, 1.1], [3.5, 12.5, 2, 1.1], [8.2, 17, 1.1, 2]]) {
    out.push(S(k.slabOf({ x, y: FACE_Y, w, d: 0.9, r: 0.2 }, z, h, P, 2), { tone: "mid", crease: "none" }));
  }
  // USB-C receptacle at the bottom edge, opening down through the cap
  out.push(S(k.slabOf({ x: -4.45, y: FACE_Y, w: 8.9, d: 3.2, r: 1.2 }, 4, 8, P, 3, 0.3), { tone: "hi", crease: "lo" }));
  out.push(L(seg([-3.2, FACE_Y + 3.2, 4], [-3.2, FACE_Y + 3.2, 11.5]) + seg([3.2, FACE_Y + 3.2, 4], [3.2, FACE_Y + 3.2, 11.5]), { tone: "faint" }));
  // the two buttons, each a switch body with a stem
  [[-6, 44.5], [6, 44.5]].forEach(([x, z], i) => {
    out.push(S(k.slabOf({ x: x - 2.5, y: FACE_Y, w: 5, d: 2.0, r: 0.6 }, z - 2.5, 5, P, 3, 0.2), { tone: "mid", crease: "lo" }));
    out.push(S(G.disc(2, 3.6, i === 0 ? 1.7 : 1.4, frontAxis(x, z), P, { steps: 18 }), { tone: "hi" }));
  });
  return out.join("");
}

// four red level LEDs above the buttons: off lens and lit lens, the page shows one per level
const LED_X = [-9, -3, 3, 9];
const LED_Z = 51;
function leds() {
  return LED_X.map((x, i) => {
    const off = S(G.disc(0, 1.4, 1.25, frontAxis(x, LED_Z), P, { steps: 14 }), { tone: "mid" });
    const on = S(G.disc(0, 1.4, 1.25, frontAxis(x, LED_Z), P, { steps: 14 }), { tone: "hi", lit: true });
    return `<g data-led="${i}">${off}</g><g data-led-on="${i}" hidden>${on}</g>`;
  }).join("");
}

// ---------------------------------------------------------------- wires
const WY = FACE_Y + 0.6; // wires run just in front of the board
const WIRE = {
  plus: [[0, CELL_AT[1], CELL_Z1 + 1.6], [0, 4, CELL_Z1 + 6], [-6, WY, CELL_Z1 + 6], [-6, FACE_Y, PCB_Z1 - 1]],
  minus: [[0, CELL_AT[1], CELL_Z0 - 0.5], [-9, 4, CELL_Z0 - 0.5], [-9, WY, 6], [-9, FACE_Y, PCB_Z0 + 1.5]],
  motorA: [[2, FACE_Y, PCB_Z1 - 1], [2, WY, 80], [2, WY, 90], [2, -3, 98], [2, -5, ZC - 12.5]],
  motorB: [[5, FACE_Y, PCB_Z1 - 1], [5, WY, 80], [5, WY, 90], [5, -3, 98], [5, -5, ZC - 12.5]],
};

function wires() {
  const fl = (points, tone, id) =>
    `<path data-wire="${id}" class="iso-line" data-tone="${tone}" data-flow d="${polyline(points)}" style="stroke-width:0.9"/>`;
  const upTo = (points, n) => points.slice(0, n);
  const from = (points, n) => points.slice(n);
  return {
    battery: fl(WIRE.plus, "red", "plus") + fl(WIRE.minus, "lo", "minus"),
    dots: D([WIRE.plus[0], WIRE.plus[3], WIRE.minus[0], WIRE.minus[3]].map(at), { size: 0.7 }),
    // the part outside the head, and the part inside it (drawn clipped to the opening)
    motorOut: fl(upTo(WIRE.motorA, 3), "red", "motorA") + fl(upTo(WIRE.motorB, 3), "lo", "motorB"),
    motorIn: fl(from(WIRE.motorA, 2), "red", "motorA") + fl(from(WIRE.motorB, 2), "lo", "motorB"),
    motorDots: D([WIRE.motorA[0], WIRE.motorB[0]].map(at), { size: 0.7 }) + D([WIRE.motorA[4], WIRE.motorB[4]].map(at), { size: 0.7 }),
  };
}

// ---------------------------------------------------------------- head
const polar = (r, a) => [r * Math.cos(a), r * Math.sin(a)];
const rect = (r0, r1, a, half) => {
  const [ux, uz] = [Math.cos(a), Math.sin(a)];
  const [nx, nz] = [-uz, ux];
  return [[ux * r0 + nx * half, uz * r0 + nz * half], [ux * r1 + nx * half, uz * r1 + nz * half], [ux * r1 - nx * half, uz * r1 - nz * half], [ux * r0 - nx * half, uz * r0 - nz * half]];
};

// A flat annulus in the plane s = const (a grille ring seen as a wire): one path, even hole, no hull.
const circlePts = (s0, r, steps) => Array.from({ length: steps }, (_, i) => at(G.pointOf(FH, s0, r, (i / steps) * Math.PI * 2)));
const annulusPath = (s0, rIn, rOut, steps = 96) => {
  const outer = circlePts(s0, rOut, steps);
  const inner = circlePts(s0, rIn, steps).reverse();
  return k.pathOf(outer, true) + k.pathOf(inner, true);
};
const flatPaths = (d) => ({ fill: d, outline: d, crease: "", top: d, shades: ["", "", "", ""] });
const ringFlat = (s0, rIn, rOut, tone, steps = 96) => S(flatPaths(annulusPath(s0, rIn, rOut, steps)), { tone, flat: true });
// a wire ring: a back annulus and a front one a little nearer, so it has thickness
const wireRing = (s0, thick, r, half, tone, steps = 96) => ringFlat(s0 - thick, r - half, r + half, "mid", steps) + ringFlat(s0, r - half, r + half, tone, steps);
const OPEN_R = R_IN - 2.5;
const openingPath = k.pathOf(circlePts(HEAD_Y1, OPEN_R, 120), true);

function shroud() {
  const out = [];
  out.push(S(G.ringBand(HEAD_Y0, HEAD_Y1, R_IN, R_OUT, FH, P, { steps: 120 }), { tone: "mid" }));
  out.push(k.fadedSvg(G.ribsOf(FH, HEAD_Y0 + 3, HEAD_Y1 - 3, R_OUT, 90, P, { fade: [0.05, 0.5] }), { tone: "faint" }));
  out.push(L(G.arcOf(FH, HEAD_Y1 - 3, R_OUT, P) + G.arcOf(FH, HEAD_Y0 + 3, R_OUT, P), { tone: "faint" }));
  out.push(D(G.dotsOf(FH, HEAD_Y1 - 3, R_OUT, 10, P, { fade: [0.04, 0.45] }), { size: 0.5 }));
  // thick front lip, then the opening: a dark ellipse the interior is seen through
  out.push(ringFlat(HEAD_Y1, OPEN_R, R_OUT + 0.4, "hi", 120));
  out.push(S(flatPaths(openingPath), { tone: "lo", flat: true }));
  return out.join("");
}

function rear() {
  const out = [];
  // rear grille: thin spokes and two wire rings seen through the opening
  for (let i = 0; i < 8; i++) out.push(S(G.prismOf(FH, rect(14, R_IN - 2, (i * Math.PI) / 4 + Math.PI / 8, 0.6), HEAD_Y0 + 0.6, HEAD_Y0 + 1.6, P), { tone: "mid", crease: "none" }));
  for (const r of [24, 36]) out.push(wireRing(HEAD_Y0 + 1.8, 1.4, r, 0.8, "mid", 80));
  // three struts holding the motor
  for (let i = 0; i < 3; i++) out.push(S(G.prismOf(FH, rect(12, R_IN - 3, Math.PI / 2 + (i * 2 * Math.PI) / 3, 2.2), HEAD_Y0 + 0.6, HEAD_Y0 + 4.2, P), { tone: "hi", crease: "lo" }));
  return out.join("");
}

function motor() {
  const out = [];
  out.push(S(G.disc(-10.8, 0.8, 12.8, FH, P, { steps: 64, bevel: 0.4 }), { tone: "hi", crease: "lo" }));
  out.push(L(G.ribsOf(FH, -10, 0.2, 12.8, 22, P, { least: 0.1 }), { tone: "faint" }));
  out.push(L(G.arcOf(FH, -6, 12.8, P) + G.arcOf(FH, 0.4, 12.8, P), { tone: "faint" }));
  // bearing boss
  out.push(S(G.disc(0.8, 2.0, 5.5, FH, P, { steps: 32 }), { tone: "mid" }));
  return out.join("");
}

function hub() {
  const out = [];
  out.push(S(G.disc(1.2, 6.6, 8.2, FH, P, { steps: 40, bevel: 0.4 }), { tone: "hi", crease: "lo" }));
  out.push(L(G.circleOf(FH, 6.6, 5.4, P, 28), { tone: "faint" }));
  out.push(S(G.disc(6.6, 7.8, 2.4, FH, P, { steps: 18 }), { tone: "mid" }));
  return out.join("");
}

function bladePolygon(theta) {
  const spec = [[BLADE_R0, -4], [BLADE_R0, 4], [29, 9.5], [41, 8.5], [44, 0], [41, -8.5], [29, -9.5]];
  return spec.map(([r, deg]) => polar(r, theta + (deg * Math.PI) / 180));
}

function bladesAt(angle) {
  const list = [];
  for (let i = 0; i < BLADES; i++) {
    const theta = angle + (i * 2 * Math.PI) / BLADES;
    const mid = [Math.cos(theta) * 28, 0, ZC + Math.sin(theta) * 28];
    list.push({ depth: k.depthOf(mid, P), svg: S(G.prismOf(FH, bladePolygon(theta), BLADE_S0, BLADE_S1, P), { tone: "hi", crease: "lo", lit: true }) });
  }
  return list.sort((a, b) => a.depth - b.depth).map((b) => b.svg).join("");
}

function frontGrille() {
  const out = [];
  for (let i = 0; i < 10; i++) out.push(S(G.prismOf(FH, rect(13, OPEN_R - 1, (i * Math.PI) / 5 + Math.PI / 10, 0.6), HEAD_Y1 - 1.6, HEAD_Y1 - 0.4, P), { tone: "mid", crease: "none" }));
  for (const r of [16, 26, 36, 45]) out.push(wireRing(HEAD_Y1, 1.8, r, 0.9, "hi", 90));
  out.push(S(G.disc(HEAD_Y1 - 2, HEAD_Y1, 11.6, FH, P, { steps: 56 }), { tone: "hi", crease: "lo" }));
  out.push(L(G.circleOf(FH, HEAD_Y1, 8.6, P, 40) + G.circleOf(FH, HEAD_Y1, 5.2, P, 28), { tone: "faint" }));
  return out.join("");
}

// the two shell walls that were cut away, drawn as dotted outlines so you can see where they were
function cutaway() {
  const x0 = HANDLE.x, x1 = HANDLE.x + HANDLE.w, y0 = HANDLE.y, y1 = HANDLE.y + HANDLE.d;
  const outline = (points) => polyline(points);
  const d =
    outline([[x0, y1, 4], [x1, y1, 4], [x1, y1, HANDLE_TOP], [x0, y1, HANDLE_TOP], [x0, y1, 4]]) +
    outline([[x1, y1, 4], [x1, y0, 4], [x1, y0, HANDLE_TOP], [x1, y1, HANDLE_TOP]]);
  return L(d, { tone: "faint", dotted: true });
}

// ---------------------------------------------------------------- the airflow vane
const VANE_FOOT = [VANE.x, VANE.y];
function vaneFixed() {
  const out = [];
  const [x, y] = VANE_FOOT;
  out.push(S(k.cylinder(x, y, 7, 0, 2.4, P, 28), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, 2.2, 2.4, VANE.hinge + 6 - 2.4, P, 20), { tone: "mid", crease: "none" }));
  out.push(L([30, 70, 100].map((z) => k.sideArc(x, y, 2.2, z, P, 12)).join(""), { tone: "faint" }));
  // protractor card behind the vane, with a tick every 10 degrees up to 60
  const card = { x: x - 8, y: y - 4, w: 2, d: 46, r: 0.4 };
  const z0 = VANE.hinge - VANE.len - 6, z1 = VANE.hinge + 6;
  out.push(S(k.slabOf(card, z0, z1 - z0, P, 2, 0.3), { tone: "mid" }));
  const face = card.x + card.w;
  const arcPoint = (deg, r) => [face, y + Math.sin((deg * Math.PI) / 180) * r, VANE.hinge - Math.cos((deg * Math.PI) / 180) * r];
  const rOut = VANE.len - 1, rIn = VANE.len - 6;
  const minor = [], major = [], outer = [], inner = [];
  for (let deg = 0; deg <= 60; deg += 5) {
    outer.push(arcPoint(deg, rOut));
    inner.push(arcPoint(deg, rIn));
    (deg % 10 === 0 ? major : minor).push(k.segment(arcPoint(deg, rIn), arcPoint(deg, rOut), P));
  }
  out.push(L(minor.join(""), { tone: "mid" }), L(major.join(""), { tone: "hi" }));
  out.push(L(k.pathOf(outer.map(at)) + k.pathOf(inner.map(at)), { tone: "mid" }));
  out.push(D([[face, y, z0 + 3], [face, y + 42, z0 + 3]].map(at), { size: 0.45 }));
  return out.join("");
}
// the plate and its hinge pin, rebuilt for each lean angle (degrees)
function vaneAt(deg) {
  const a = (deg * Math.PI) / 180;
  const e = [0, Math.sin(a), -Math.cos(a)];
  const n = [0, Math.cos(a), Math.sin(a)];
  const F = G.frameOf([VANE.x, VANE.y, VANE.hinge], n, [1, 0, 0], e);
  const plate = [[-VANE.half, 1], [VANE.half, 1], [VANE.half, VANE.len], [-VANE.half, VANE.len]];
  const pin = G.frameOf([VANE.x - VANE.half - 2, VANE.y, VANE.hinge], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  return (
    S(G.prismOf(F, plate, -0.7, 0.7, P), { tone: "hi", crease: "lo", lit: true }) +
    S(G.disc(0, 2 * VANE.half + 4, 1.3, pin, P, { steps: 14 }), { tone: "mid" })
  );
}

// ---------------------------------------------------------------- page
const w = wires();
const startState = stateOf(1);
const body = [
  `<defs><clipPath id="head-open"><path d="${openingPath}"/></clipPath></defs>`,
  plate(),
  scope(),
  shellWalls(),
  cell(),
  w.battery,
  w.dots,
  board(),
  leds(),
  w.motorOut,
  shroud(),
  `<g clip-path="url(#head-open)">`,
  rear(),
  motor(),
  w.motorIn,
  w.motorDots,
  `<g data-part="blades">${bladesAt(0.3)}</g>`,
  hub(),
  frontGrille(),
  `</g>`,
  cutaway(),
  vaneFixed(),
  `<g data-part="vane">${vaneAt(stateOf(1).vaneDeg)}</g>`,
];

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A rechargeable handheld fan with its handle opened. A 21700 lithium cell stands in the handle behind a small board that carries a USB-C port, a charge chip, a microcontroller, a MOSFET, two buttons and four level LEDs. Two wires run up to a brushless motor in the head, which spins a five-blade rotor behind a grille. Pick a speed level and the blades, the LEDs, the PWM waveform on the scope and the readout all follow the same measured numbers.",
  body,
});

const latheSource = readFileSync(join(HERE, "..", "..", "skills", "anatomy", "kit", "lathe.mjs"), "utf8").replace(/^import .*$/m, "").replace(/^export /gm, "");
const latheScript = `const G = (() => {${latheSource}\nreturn { frameOf, prismOf, disc };})();\n`;
const modelSource = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");

const live = `
${modelSource}
const P = ${JSON.stringify(P)};
const ZC = ${ZC}, BLADES = ${BLADES}, BLADE_S0 = ${BLADE_S0}, BLADE_S1 = ${BLADE_S1}, BLADE_R0 = ${BLADE_R0};
const FH = G.frameOf([0, 0, ZC], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
const SCOPE = ${JSON.stringify(SCOPE)};
const polar = (r, a) => [r * Math.cos(a), r * Math.sin(a)];
const VANE = ${JSON.stringify(VANE)};
const bladePolygon = ${bladePolygon.toString()};
const vaneAt = ${vaneAt.toString().replace(/\bS\(/g, 'solidSvg(')};
const bladesAt = ${bladesAt.toString().replace(/\bS\(/g, "solidSvg(").replace("k.depthOf", "depthOf")};
const pwmPath = ${pwmPath.toString().replace(/k\./g, "")};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const blades = svg.querySelector('[data-part="blades"]');
const pwm = svg.querySelector('[data-part="pwm"]');
const vane = svg.querySelector('[data-part="vane"]');
let lean = stateOf(1).vaneDeg;
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const ledOff = [...svg.querySelectorAll("[data-led]")];
const ledOn = [...svg.querySelectorAll("[data-led-on]")];
const wires = [...svg.querySelectorAll("[data-wire]")];
let level = 1, target = 1, angle = 0.3, omega = 0, frame = 0, last = 0, clock = 0, touring = true, visible = false, idleTimer = 0;
const tour = [1, 2, 3, 4, 3, 2];
const targetOmega = () => (stateOf(level).revPerSecond * Math.PI * 2) / SLOW_MOTION;
function applyLevel() {
  const s = stateOf(level);
  pwm.setAttribute("d", pwmPath(s.duty));
  ledOff.forEach((el, i) => (el.hidden = i < level));
  ledOn.forEach((el, i) => (el.hidden = i >= level));
  wires.forEach((el) => (el.style.animationDuration = (1.6 / (0.3 + s.amps)).toFixed(2) + "s"));
  const text = readoutOf(s);
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(level));
  stage.setAttribute("aria-valuetext", "Speed level " + level + " of 4, " + s.rpm + " RPM, PWM duty " + Math.round(s.duty * 100) + " percent, " + s.fanWatts.toFixed(1) + " watts, about " + s.hours.toFixed(1) + " hours of battery");
}
function setLevel(next) { next = Math.min(4, Math.max(1, next)); if (next !== level) { level = next; applyLevel(); } }
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) { clock += dt; setLevel(tour[Math.floor(clock / 3.2) % tour.length]); }
  const want = calm ? 0 : targetOmega();
  omega += (want - omega) * (1 - Math.exp(-dt / 0.45));
  if (Math.abs(want - omega) < 1e-3) omega = want;
  angle = (angle + omega * dt) % (Math.PI * 2);
  blades.innerHTML = bladesAt(angle);
  const leanWant = calm ? stateOf(level).vaneDeg : stateOf(level).vaneDeg;
  lean += (leanWant - lean) * (1 - Math.exp(-dt / 0.55));
  if (Math.abs(leanWant - lean) < 0.02) lean = leanWant;
  if (vane) vane.innerHTML = vaneAt(lean);
  frame = visible && (omega > 0 || want > 0 || lean !== leanWant) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (next) => { touring = false; setLevel(next); clearTimeout(idleTimer); idleTimer = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 4200); run(); };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) { touring = false; }
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  const share = Math.min(1, Math.max(0, ((event.clientX - box.left) / box.width - 0.15) / 0.7));
  steer(1 + Math.min(3, Math.floor(share * 4)));
});
stage.addEventListener("pointerleave", () => steer(level));
stage.addEventListener("keydown", (event) => {
  let to = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") to = level + 1;
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") to = level - 1;
  if (event.key >= "1" && event.key <= "4") to = Number(event.key);
  if (event.key === "Home") to = 1;
  if (event.key === "End") to = 4;
  if (to === null) return;
  event.preventDefault();
  steer(to);
});
applyLevel();
`;

const s0 = stateOf(1);
const s4 = stateOf(4);
const html = k.plateHtml({
  fig: "Fig 1",
  title: "Handheld fan",
  hint: "Hover or press 1–4 to pick a speed",
  readout: readoutOf(startState),
  keys: [
    { mark: "lit", label: "Rotor (drawn at 1/" + SLOW_MOTION + " speed) and airflow vane (leans with pressure)" },
    { mark: "dotted", label: "The shell walls that were cut away" },
    { mark: "dashed", label: "Wires: dashes run faster with more current" },
  ],
  caption:
    "A USB-C rechargeable fan from a measured teardown (Gongtian F95D). One 21700 cell feeds a board that sets the speed by switching the motor's negative rail at 19.9 kHz: 35.7%, 50.6%, 70.6% or 100% duty gives 1565, 2541, 3613 or 4695 RPM. Airflow follows speed, power follows its cube, so level 1 draws about " +
    s0.fanWatts.toFixed(1) +
    " W and level 4 about " +
    s4.fanWatts.toFixed(1) +
    " W of the " +
    MAX_POWER +
    " W label. The " +
    CELL.wh +
    " Wh cell then lasts roughly " +
    s0.hours.toFixed(0) +
    " h to " +
    s4.hours.toFixed(1) +
    " h; runtime, power and airflow share are modelled, speed and duty are measured.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Handheld fan: arrow keys or 1 to 4 pick the speed level" aria-valuemin="1" aria-valuemax="4" aria-valuenow="1">${svg}</div>`,
});

const name = theme === "light" ? "handheld-fan-light.html" : "handheld-fan.html";
writeFileSync(join(HERE, name), k.pageHtml({ title: "Handheld fan", theme, body: html, script: kitScript() + "\n" + latheScript + live }));
console.log("wrote", name);
