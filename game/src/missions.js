// Missions and story: six jobs for Leo Marlow, a driver fresh out of the
// Solara Bay docks who owes money to the wrong people. Each mission is a list
// of steps — go somewhere, steal a car, chase a target, rob a place, escape
// the police — with dialogue lines, a marker on the map and a cash reward.
// Finishing one unlocks the next; finishing all six is the story's end.
export const MISSIONS = [
  {
    id: 'delivery', title: 'First Delivery', giver: 'Mara Quinn',
    intro: 'Mara: "Leo, you owe me. Take this package to the Pier. No detours."',
    reward: 300,
    steps: [
      { type: 'goto', x: 975, y: 450, label: 'Pick up the package at North Mall', radius: 70 },
      { type: 'goto', x: 3300, y: 2250, label: 'Deliver the package to Solara Pier', radius: 80 },
    ],
  },
  {
    id: 'hotwheels', title: 'Hot Wheels', giver: 'Eddie Frost',
    intro: 'Eddie: "A Falcon GT is parked by Grand Plaza. Bring it to my garage. Quietly."',
    reward: 500,
    steps: [
      { type: 'steal', carType: 'sports', x: 1875, y: 1250, label: 'Steal the Falcon GT at Grand Plaza', radius: 90 },
      { type: 'goto', x: 525, y: 2050, label: 'Deliver the Falcon GT to the Safehouse garage', radius: 90, needCar: true },
    ],
  },
  {
    id: 'tail', title: 'Tail the Courier', giver: 'Mara Quinn',
    intro: 'Mara: "A courier is carrying my ledger. Follow his van — do not lose him."',
    reward: 450,
    steps: [
      { type: 'chase', x: 2100, y: 1050, label: 'Find the courier van near Marina Harbor', radius: 120 },
      { type: 'follow', x: 750, y: 1850, label: 'Stay on the courier until he reaches the Diner', radius: 200, hold: 6 },
    ],
  },
  {
    id: 'smash', title: 'Smash and Grab', giver: 'Eddie Frost',
    intro: 'Eddie: "Corner Store keeps its cash in the back. Take it. Expect company."',
    reward: 800,
    steps: [
      { type: 'goto', x: 975, y: 1250, label: 'Reach the Corner Store', radius: 70 },
      { type: 'rob', x: 975, y: 1250, label: 'Grab the cash (stay in the store)', radius: 80, hold: 5 },
      { type: 'escape', x: 525, y: 2050, label: 'Lose the police and reach the Safehouse', radius: 90 },
    ],
  },
  {
    id: 'harbor', title: 'Harbor Run', giver: 'Mara Quinn',
    intro: 'Mara: "Crates at the Harbor, dawn delivery at the Mall. The police know the route."',
    reward: 900,
    steps: [
      { type: 'goto', x: 3350, y: 1050, label: 'Pick up the crates at Marina Harbor', radius: 80 },
      { type: 'goto', x: 975, y: 450, label: 'Deliver the crates to North Mall', radius: 80 },
    ],
  },
  {
    id: 'bigscore', title: 'The Big Score', giver: 'Mara Quinn',
    intro: 'Mara: "City Bank. One crew, one vault, one way out. This clears your debt, Leo."',
    reward: 1500,
    steps: [
      { type: 'goto', x: 1875, y: 850, label: 'Reach City Bank', radius: 70 },
      { type: 'rob', x: 1875, y: 850, label: 'Crack the vault (stay inside)', radius: 90, hold: 8 },
      { type: 'escape', x: 525, y: 2050, label: 'Escape to the Safehouse — five stars will not wait', radius: 90 },
    ],
  },
];

export function missionTitle(index) {
  return index < MISSIONS.length ? MISSIONS[index].title : 'Free Roam';
}

export function currentStep(state) {
  const m = MISSIONS[state.missionIndex];
  if (!m) return null;
  return m.steps[state.missionStep] || null;
}

export function missionObjectiveText(state) {
  const m = MISSIONS[state.missionIndex];
  if (!m) return 'All missions complete — free roam Solara Bay!';
  const step = m.steps[state.missionStep];
  if (!step) return m.title + ' — done';
  return m.title + ': ' + step.label;
}

/**
 * Advance the mission from the player's position. Returns an event string:
 * 'step' when a step completes, 'done' when the mission completes, '' otherwise.
 * `world` is the mutable state (money, dialogue, wanted, enemies).
 */
export function updateMission(state, dt) {
  const m = MISSIONS[state.missionIndex];
  if (!m) return '';
  const step = m.steps[state.missionStep];
  if (!step) return '';
  const p = state.player;
  const dist = Math.hypot(p.x - step.x, p.y - step.y);
  if (step.type === 'steal') {
    if (p.vehicle && p.vehicle.type === step.carType) {
      state.missionStep += 1;
      state.dialogue = { text: 'Leo: "Got the Falcon. Now to the garage."', until: state.elapsed + 4 };
      return 'step';
    }
    return '';
  }
  if (step.type === 'chase') {
    if (state.chaseTarget && Math.hypot(p.x - state.chaseTarget.x, p.y - state.chaseTarget.y) < 260) {
      state.missionStep += 1;
      state.dialogue = { text: 'Leo: "There he is. Stay on him."', until: state.elapsed + 4 };
      return 'step';
    }
    return '';
  }
  if (step.type === 'follow') {
    if (state.chaseTarget && Math.hypot(p.x - state.chaseTarget.x, p.y - state.chaseTarget.y) < step.radius) {
      state.followTimer = (state.followTimer || 0) + dt;
      if (state.followTimer >= (step.hold || 5)) {
        state.missionStep += 1;
        state.followTimer = 0;
        state.dialogue = { text: 'Mara: "Good. He led us right to them."', until: state.elapsed + 4 };
        return 'step';
      }
    } else {
      state.followTimer = 0;
    }
    return '';
  }
  if (step.type === 'rob') {
    if (dist < step.radius) {
      state.robTimer = (state.robTimer || 0) + dt;
      if (state.robTimer >= (step.hold || 5)) {
        state.robTimer = 0;
        state.missionStep += 1;
        state.dialogue = { text: 'Leo: "Cash is mine. Time to run!"', until: state.elapsed + 4 };
        return 'step';
      }
    } else {
      state.robTimer = 0;
    }
    return '';
  }
  if (step.type === 'escape') {
    if (dist < step.radius && state.wanted === 0) {
      state.missionStep += 1;
      return finishMission(state);
    }
    return '';
  }
  // plain goto
  if (dist < step.radius && !(step.needCar && !p.vehicle)) {
    state.missionStep += 1;
    if (state.missionStep >= m.steps.length) return finishMission(state);
    state.dialogue = { text: 'Leo: "One down. Next stop."', until: state.elapsed + 3 };
    return 'step';
  }
  return '';
}

function finishMission(state) {
  const m = MISSIONS[state.missionIndex];
  state.money += m.reward;
  state.missionsDone += 1;
  state.dialogue = { text: m.giver + ': "Job done. $' + m.reward + ' is yours, Leo."', until: state.elapsed + 5 };
  state.missionIndex += 1;
  state.missionStep = 0;
  state.robTimer = 0;
  state.followTimer = 0;
  if (state.missionIndex >= MISSIONS.length) {
    state.storyDone = true;
    state.dialogue = { text: 'Mara: "Debt cleared. Solara Bay is yours now, Leo."', until: state.elapsed + 6 };
  } else {
    const next = MISSIONS[state.missionIndex];
    state.pendingIntro = next.intro;
  }
  return 'done';
}

export function startMission(state) {
  const m = MISSIONS[state.missionIndex];
  if (!m) return;
  state.dialogue = { text: m.intro, until: state.elapsed + 5 };
}
