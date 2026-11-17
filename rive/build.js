#!/usr/bin/env node
// Builds the Rive versions of the characters:
//   rive/lib/rigs.js + rive/lib/poses.js  ->  rive/<name>/scene.rml
//   -> (Rive CLI) rive/<name>/build/<name>.riv  ->  assets/rive/<name>.riv
//
//   node rive/build.js            generate, check, render previews (no sign-in)
//   node rive/build.js --publish  also write the .riv files and install them in
//                                 assets/rive (needs `rive login`; a Free plan
//                                 adds Rive's splash-screen watermark)
//   node rive/build.js --rml      generate the .rml only
//
// Needs the Rive CLI (https://rive.app/docs/cli) on PATH or in ~/.rive/bin.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { Build, animationRml, num } = require('./lib/rml');
const rigs = require('./lib/rigs');
const { poses } = require('./lib/poses');

// The app's own list of states: its order is what the `state` input counts in.
globalThis.DeskPet = {};
require('../src/content/animation/states.js');
const STATES = globalThis.DeskPet.STATES;
const STATE_NAMES = Object.keys(STATES);

// Room around the character's box so squashes, leans and tails are not cut off.
// (The app reads these numbers from the character files: rive.frame.)
const MARGIN = { x: 40, top: 30 };
const BLEND_MS = 110; // cross-fade between states

const REST = { rot: 0, x: 0, y: 0, sx: 1, sy: 1 };
const MOUTHS = { smile: ['mSmile', 'smSmile'], flat: ['mFlat', 'smFlat'], wavy: ['mWavy', 'smFlat'], open: ['mOpen', 'smOpen'], pant: ['mPant', 'smOpen'] };
const ALL_MOUTHS = ['mSmile', 'mFlat', 'mWavy', 'mOpen', 'mPant', 'smSmile', 'smFlat', 'smOpen'];

function scene(rig) {
  const b = new Build();
  const isMouse = rig.name === 'mouse';
  const [boxW, boxH] = rig.box;
  const width = boxW + MARGIN.x * 2;
  const height = boxH + MARGIN.top;

  // ---- the drawing ----
  let drawing = '';
  for (const p of [...rig.parts].reverse()) drawing += b.part(p, [-MARGIN.x, -MARGIN.top], '        ');

  // ---- one animation per state, each keying every animated property ----
  const table = poses(isMouse);
  const full = {}; // state -> complete pose
  const used = {}; // part -> Set(channels) keyed by any state
  for (const name of STATE_NAMES) {
    if (!table[name]) throw new Error(`no pose for state "${name}" - add it to rive/lib/poses.js`);
    const side = STATES[name].view === 'side';
    const mouth = MOUTHS[STATES[name].mouth || 'smile'];
    const pose = { ...table[name].parts, front: { opacity: side ? 0 : 1 }, side: { opacity: side ? 1 : 0 } };
    for (const m of ALL_MOUTHS) pose[m] = { opacity: m === mouth[side ? 1 : 0] ? 1 : 0 };
    full[name] = pose;
    for (const part of Object.keys(pose)) {
      if (!b.parts[part]) continue;
      used[part] = used[part] || new Set();
      for (const ch of Object.keys(pose[part])) used[part].add(ch);
    }
  }
  const rest = (part, ch) => (ch === 'opacity' ? b.parts[part].rest.opacity : REST[ch]);
  const animIds = new Map(); // pose table entry -> animation id (aliases share one)
  let animations = '';
  for (const name of STATE_NAMES) {
    const entry = table[name];
    if (animIds.has(entry)) continue;
    const id = b.id();
    animIds.set(entry, id);
    const pose = {};
    for (const part of Object.keys(used)) {
      pose[part] = {};
      for (const ch of used[part]) pose[part][ch] = full[name][part] && full[name][part][ch] != null ? full[name][part][ch] : rest(part, ch);
    }
    animations += animationRml(b, name, id, entry.frames, entry.loop, pose, '        ');
  }

  // ---- the small always-on layers ----
  const extra = (name, pose, frames = 1) => {
    const id = b.id();
    animations += animationRml(b, name, id, frames, false, pose, '        ');
    return id;
  };
  const pr = rig.pupil;
  const lookX = [extra('look left', { pupils: { x: -pr } }), extra('look right', { pupils: { x: pr } })];
  const lookY = [extra('look up', { pupils: { y: -pr }, sPupil: { y: -pr } }), extra('look down', { pupils: { y: pr }, sPupil: { y: pr } })];
  const dir = [extra('heading right', { sideFlip: { sx: 1 } }), extra('heading left', { sideFlip: { sx: -1 } })];
  const holdOff = extra('not holding', {});
  const holdOn = extra('holding a sign', { armR: { rot: -150 }, foreR: { rot: 0 }, sArmN: { rot: -165 }, sForeN: { rot: 0 } });

  // ---- the data the app drives it with (a view model, Rive's data binding) ----
  const vm = { id: b.id(), instance: b.id(), state: b.id(), dir: b.id(), lookX: b.id(), lookY: b.id(), holding: b.id() };
  const viewModel =
    `    <ViewModel defaultInstanceId="${vm.instance}" name="Pet" id="${vm.id}">\n` +
    `        <ViewModelPropertyNumber name="state" id="${vm.state}"/>\n` +
    `        <ViewModelPropertyNumber name="dir" id="${vm.dir}"/>\n` +
    `        <ViewModelPropertyNumber name="lookX" id="${vm.lookX}"/>\n` +
    `        <ViewModelPropertyNumber name="lookY" id="${vm.lookY}"/>\n` +
    `        <ViewModelPropertyBoolean name="holding" id="${vm.holding}"/>\n` +
    `        <ViewModelInstance exports="true" name="Default" id="${vm.instance}">\n` +
    `            <ViewModelInstanceNumber propertyValue="0" viewModelPropertyId="${vm.state}"/>\n` +
    `            <ViewModelInstanceNumber propertyValue="1" viewModelPropertyId="${vm.dir}"/>\n` +
    `            <ViewModelInstanceNumber propertyValue="50" viewModelPropertyId="${vm.lookX}"/>\n` +
    `            <ViewModelInstanceNumber propertyValue="50" viewModelPropertyId="${vm.lookY}"/>\n` +
    `            <ViewModelInstanceBoolean propertyValue="false" viewModelPropertyId="${vm.holding}"/>\n` +
    `        </ViewModelInstance>\n` +
    `    </ViewModel>\n`;
  const readNumber = (prop) => `<BindablePropertyNumber><DataBindContext sourcePathIds="${vm.id}-${prop}" propertyKey="636"/></BindablePropertyNumber>`;
  const numberIs = (prop, op, value) =>
    `<TransitionViewModelCondition opValue="${op}"><TransitionPropertyViewModelComparator>${readNumber(prop)}</TransitionPropertyViewModelComparator><TransitionValueNumberComparator value="${value}"/></TransitionViewModelCondition>`;
  const boolIs = (prop, value) =>
    `<TransitionViewModelCondition opValue="equal"><TransitionPropertyViewModelComparator><BindablePropertyBoolean><DataBindContext sourcePathIds="${vm.id}-${prop}" propertyKey="634"/></BindablePropertyBoolean></TransitionPropertyViewModelComparator><TransitionValueBooleanComparator value="${value}"/></TransitionViewModelCondition>`;

  // ---- the state machine ----
  const smId = b.id();
  let sm = `        <StateMachine name="Pet" id="${smId}">\n`;

  // Layer 1: which state. Any State -> the state whose number matches.
  const stateIds = STATE_NAMES.map(() => b.id());
  sm += `            <StateMachineLayer name="State">\n`;
  sm += `                <AnyState x="-200" y="-140">\n`;
  STATE_NAMES.forEach((name, i) => {
    sm += `                    <StateTransition stateToId="${stateIds[i]}" duration="${BLEND_MS}">${numberIs(vm.state, 'equal', i)}</StateTransition>\n`;
  });
  sm += `                </AnyState>\n                <ExitState x="-200" y="-60"/>\n`;
  sm += `                <EntryState x="-200" y="20"><StateTransition stateToId="${stateIds[0]}"/></EntryState>\n`;
  STATE_NAMES.forEach((name, i) => {
    sm += `                <AnimationState x="${160 + (i % 8) * 180}" y="${Math.floor(i / 8) * 90}" animationId="${animIds.get(table[name])}" id="${stateIds[i]}"/>\n`;
  });
  sm += `            </StateMachineLayer>\n`;

  // Layers 2-3: gaze. A blend between two extremes, 0..100 with 50 centred.
  const blendLayer = (name, prop, [lo, hi]) => {
    const id = b.id();
    return (
      `            <StateMachineLayer name="${name}">\n                <AnyState x="0" y="-140"/>\n                <ExitState x="200" y="-140"/>\n` +
      `                <EntryState x="0" y="0"><StateTransition stateToId="${id}"/></EntryState>\n` +
      `                <BlendState1DViewModel x="200" y="0" id="${id}">\n                    ${readNumber(prop)}\n` +
      `                    <BlendAnimation1D animationId="${lo}" value="0"/>\n                    <BlendAnimation1D animationId="${hi}" value="100"/>\n` +
      `                </BlendState1DViewModel>\n            </StateMachineLayer>\n`
    );
  };
  sm += blendLayer('Look X', vm.lookX, lookX) + blendLayer('Look Y', vm.lookY, lookY);

  // Layers 4-5: two-state switches.
  const switchLayer = (name, [offAnim, onAnim], toOn, toOff, ms) => {
    const off = b.id();
    const on = b.id();
    return (
      `            <StateMachineLayer name="${name}">\n                <AnyState x="0" y="-140"/>\n                <ExitState x="200" y="-140"/>\n` +
      `                <EntryState x="0" y="0"><StateTransition stateToId="${off}"/></EntryState>\n` +
      `                <AnimationState x="200" y="0" animationId="${offAnim}" id="${off}"><StateTransition stateToId="${on}" duration="${ms}">${toOn}</StateTransition></AnimationState>\n` +
      `                <AnimationState x="400" y="0" animationId="${onAnim}" id="${on}"><StateTransition stateToId="${off}" duration="${ms}">${toOff}</StateTransition></AnimationState>\n` +
      `            </StateMachineLayer>\n`
    );
  };
  sm += switchLayer('Heading', dir, numberIs(vm.dir, 'lessThan', 0), numberIs(vm.dir, 'greaterThanOrEqual', 0), 90);
  sm += switchLayer('Holding', [holdOff, holdOn], boolIs(vm.holding, true), boolIs(vm.holding, false), 120);
  sm += `        </StateMachine>\n`;

  const styleId = b.id();
  return (
    `<!-- Generated by rive/build.js from rive/lib/rigs.js and rive/lib/poses.js. Edit those, not this. -->\n` +
    `<Rive version="1" kind="fragment">\n` +
    `    <Artboard defaultStateMachineId="${smId}" viewModelId="${vm.id}" viewModelInstanceId="${vm.instance}" styleId="${styleId}" width="${num(width)}" height="${num(height)}" name="${rig.artboard}" id="0:2">\n` +
    `        <LayoutComponentStyle name="Artboard Style" id="${styleId}"/>\n` +
    sm + drawing + animations +
    `    </Artboard>\n` + viewModel + `</Rive>\n`
  );
}

function riveCli() {
  const local = path.join(os.homedir(), '.rive', 'bin', 'rive');
  return fs.existsSync(local) ? local : 'rive';
}

for (const make of [rigs.cat, rigs.mouse]) {
  const rig = make();
  const dir = path.join(__dirname, rig.name);
  fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(path.join(dir, 'rive.yaml'))) fs.writeFileSync(path.join(dir, 'rive.yaml'), `name: ${rig.name}\nlogs:\n  file: build/rive.log\n  problems: build/problems.log\n`);
  fs.writeFileSync(path.join(dir, 'scene.rml'), scene(rig));
  console.log(`wrote rive/${rig.name}/scene.rml`);
  if (process.argv.includes('--rml')) continue;

  const out = path.join(dir, 'build', `${rig.name}.riv`);
  execFileSync(riveCli(), [dir, '--verify'], { stdio: 'inherit' });
  execFileSync(riveCli(), [dir, '--screenshot', '--advance=1'], { stdio: 'inherit' }); // build/<name>.png
  if (!process.argv.includes('--publish')) continue;
  // The only way the CLI writes a .riv to disk.
  execFileSync(riveCli(), [dir, '--publish'], { stdio: 'inherit' });
  if (!fs.existsSync(out)) throw new Error(`the Rive CLI did not produce ${out}`);
  const dest = path.join(__dirname, '..', 'assets', 'rive', `${rig.name}.riv`);
  fs.copyFileSync(out, dest);
  console.log(`installed assets/rive/${rig.name}.riv (${fs.statSync(dest).size} bytes)`);
}
