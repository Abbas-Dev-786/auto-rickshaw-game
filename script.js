/*
   Auto-Rickshaw Rush
  - Vanilla JS + HTML5 Canvas
  - Shapes-only "art" (no external assets)
  - Beginner-friendly structure
*/

(() => {
  "use strict";

  // ---------- DOM ----------
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const $score = document.getElementById("score");
  const $best = document.getElementById("best");
  const $horn = document.getElementById("horn");
  const $combo = document.getElementById("combo");
  const $slogan = document.getElementById("slogan");

  const $startOverlay = document.getElementById("startOverlay");
  const $pauseOverlay = document.getElementById("pauseOverlay");
  const $gameOverOverlay = document.getElementById("gameOverOverlay");
  const $finalScore = document.getElementById("finalScore");
  const $finalBest = document.getElementById("finalBest");
  const $gameOverTip = document.getElementById("gameOverTip");
  const $rankLine = document.getElementById("rankLine");
  const $toast = document.getElementById("toast");

  const $startBtn = document.getElementById("startBtn");
  const $resumeBtn = document.getElementById("resumeBtn");
  const $restartBtn1 = document.getElementById("restartBtn1");
  const $restartBtn2 = document.getElementById("restartBtn2");
  const $pauseBtn = document.getElementById("pauseBtn");
  const $shareBtn = document.getElementById("shareBtn");

  const $muteBtn = document.getElementById("muteBtn");
  const $muteIcon = document.getElementById("muteIcon");

  const $howBtn = document.getElementById("howBtn");
  const $howModal = document.getElementById("howModal");
  const $closeHowBtn = document.getElementById("closeHowBtn");

  const $mobileControls = document.getElementById("mobileControls");
  const $leftBtn = document.getElementById("leftBtn");
  const $rightBtn = document.getElementById("rightBtn");
  const $hornBtn = document.getElementById("hornBtn");

  // ---------- Optional SVG art pack (assets/*.svg) ----------
  // If these load, we draw them; otherwise the game uses its built-in canvas shapes.
  const Art = {
    ready: false,
    imgs: /** @type {Record<string, HTMLImageElement>} */ ({}),
    urls: {
      auto: "assets/auto.svg",
      car: "assets/car.svg",
      bus: "assets/bus.svg",
      truck: "assets/truck.svg",
      scooter: "assets/scooter.svg",
      erickshaw: "assets/erickshaw.svg",
      cow: "assets/cow.svg",
      pothole: "assets/pothole.svg",
      barricade: "assets/barricade.svg",
      coin: "assets/coin.svg",
      chai: "assets/chai.svg",
    },
  };

  // ---------- Helpers ----------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];

  function rectsOverlap(a, b) {
    return (
      a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
    );
  }

  function formatInt(n) {
    return Math.floor(n).toLocaleString("en-IN");
  }

  // ---------- Audio (Web Audio API) ----------
  const Audio = (() => {
    let ctxA = null;
    let muted = false;

    function ensure() {
      if (ctxA) return ctxA;
      ctxA = new (window.AudioContext || window.webkitAudioContext)();
      return ctxA;
    }

    function setMuted(v) {
      muted = v;
      if (muted) toast("Muted");
      else toast("Sound ON");
    }

    function blip({
      type = "square",
      freq = 440,
      dur = 0.09,
      gain = 0.12,
      slide = 0,
      detune = 0,
    }) {
      if (muted) return;
      const ac = ensure();
      const t0 = ac.currentTime;

      const o = ac.createOscillator();
      const g = ac.createGain();

      o.type = type;
      o.frequency.setValueAtTime(freq, t0);
      if (slide)
        o.frequency.exponentialRampToValueAtTime(
          Math.max(40, freq + slide),
          t0 + dur,
        );
      o.detune.setValueAtTime(detune, t0);

      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

      o.connect(g).connect(ac.destination);
      o.start(t0);
      o.stop(t0 + dur + 0.02);
    }

    function noiseHit() {
      if (muted) return;
      const ac = ensure();
      const t0 = ac.currentTime;
      const dur = 0.18;

      const bufferSize = Math.floor(ac.sampleRate * dur);
      const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++)
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);

      const src = ac.createBufferSource();
      src.buffer = buffer;

      const g = ac.createGain();
      g.gain.setValueAtTime(0.22, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

      src.connect(g).connect(ac.destination);
      src.start(t0);
      src.stop(t0 + dur);
    }

    const SFX = {
      start() {
        blip({ type: "square", freq: 440, dur: 0.08, gain: 0.12, slide: 220 });
        setTimeout(
          () =>
            blip({
              type: "square",
              freq: 660,
              dur: 0.09,
              gain: 0.12,
              slide: 330,
            }),
          70,
        );
      },
      horn() {
        blip({
          type: "sawtooth",
          freq: 220,
          dur: 0.12,
          gain: 0.16,
          slide: 30,
          detune: -10,
        });
        setTimeout(
          () =>
            blip({
              type: "sawtooth",
              freq: 196,
              dur: 0.12,
              gain: 0.14,
              slide: -10,
              detune: 5,
            }),
          40,
        );
      },
      coin() {
        blip({
          type: "triangle",
          freq: 880,
          dur: 0.07,
          gain: 0.12,
          slide: 260,
        });
      },
      chai() {
        blip({ type: "square", freq: 520, dur: 0.07, gain: 0.1, slide: -160 });
        setTimeout(
          () =>
            blip({
              type: "square",
              freq: 420,
              dur: 0.08,
              gain: 0.1,
              slide: -120,
            }),
          60,
        );
      },
      nearMiss() {
        blip({ type: "square", freq: 740, dur: 0.06, gain: 0.08, slide: -200 });
      },
      whoosh() {
        // quick pitchy glide (slow-mo trigger)
        blip({
          type: "triangle",
          freq: 520,
          dur: 0.11,
          gain: 0.08,
          slide: -340,
          detune: -8,
        });
        setTimeout(
          () =>
            blip({
              type: "triangle",
              freq: 320,
              dur: 0.12,
              gain: 0.06,
              slide: -160,
              detune: 5,
            }),
          40,
        );
      },
      hit() {
        noiseHit();
        blip({ type: "square", freq: 90, dur: 0.12, gain: 0.18, slide: -10 });
      },
      event() {
        blip({ type: "triangle", freq: 330, dur: 0.1, gain: 0.1, slide: 160 });
        setTimeout(
          () =>
            blip({
              type: "triangle",
              freq: 480,
              dur: 0.1,
              gain: 0.1,
              slide: 180,
            }),
          90,
        );
      },
    };

    return {
      SFX,
      setMuted,
      ensure,
      get muted() {
        return muted;
      },
    };
  })();

  // ---------- Visual constants ----------
  const W = canvas.width;
  const H = canvas.height;

  const palette = {
    skyGlow: "rgba(88,248,255,0.08)",
    asphalt: "#1A1F2F",
    asphalt2: "#14182A",
    lane: "rgba(255,255,255,0.55)",
    sidewalk: "#2A2F3F",
    curb: "#FF4FD8",
    curb2: "#FFD24A",
    rickshaw: "#45FF9A",
    rickshaw2: "#FFD24A",
    ink: "#0E0F15",
    cow: "#E8E1D0",
    bus: "#FF4FD8",
    car: "#58F8FF",
    pot: "#3B4054",
    barricade: "#FF3B3B",
    coin: "#FFD24A",
    chai: "#D98C3B",
    rain: "rgba(120,180,255,0.22)",
  };

  // ---------- Game state ----------
  const State = {
    mode: "start", // start | playing | paused | gameover
    t: 0,
    dt: 0,
    lastFrameMs: 0,

    score: 0,
    best: 0,
    timeAlive: 0,
    difficulty: 1,
    speed: 320, // world scroll px/sec
    baseSpeed: 320,
    slowmoT: 0,
    spawnTimer: 0,
    pickupTimer: 0,
    nearMissCombo: 0,
    comboT: 0,

    shake: 0,
    shakeX: 0,
    shakeY: 0,

    roadY: 0,
    toastUntil: 0,

    event: null, // { type, until }
    nextMilestone: 800,

    horn: {
      cooldown: 1.2,
      readyIn: 0,
      radius: 130,
      activeT: 0,
    },

    power: {
      magnetT: 0,
    },

    input: {
      left: false,
      right: false,
      horn: false,
    },

    sloganIndex: 0,
    sloganNextAt: 0,

    sweepCooldown: 0,
  };

  const Storage = {
    key: "-auto-rush-best",
    loadBest() {
      const v = Number(localStorage.getItem(this.key));
      return Number.isFinite(v) ? v : 0;
    },
    saveBest(v) {
      localStorage.setItem(this.key, String(Math.floor(v)));
    },
  };

  // Entities
  const player = {
    x: W / 2 - 22,
    y: H - 160,
    w: 44,
    h: 70,
    vx: 0,
    maxSpeed: 520,
    accel: 2000,
    friction: 1800,
    invulnT: 0,
  };

  /** @type {Array<any>} */
  const obstacles = [];
  /** @type {Array<any>} */
  const pickups = [];
  /** @type {Array<any>} */
  const particles = [];

  // Road geometry
  const road = {
    x: 64,
    w: W - 128,
    lanes: 3,
    laneW: (W - 128) / 3,
  };

  // ---------- UI helpers ----------
  function setOverlay(el, show) {
    el.classList.toggle("overlay--show", !!show);
  }

  function toast(msg) {
    $toast.textContent = msg;
    $toast.classList.add("toast--show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => $toast.classList.remove("toast--show"), 1100);
  }

  function updateHUD() {
    $score.textContent = formatInt(State.score);
    $best.textContent = formatInt(State.best);

    if (State.horn.readyIn <= 0) $horn.textContent = "Ready";
    else $horn.textContent = `${State.horn.readyIn.toFixed(1)}s`;

    if ($combo) {
      const mult = 1 + Math.floor(State.nearMissCombo);
      $combo.textContent = `x${mult}`;
      $combo.parentElement?.classList.toggle("pill--hot", mult >= 4);
    }
  }

  // ---------- Spawning ----------
  const obstacleTypes = {
    car: { kind: "car", w: 48, h: 82, big: false, score: 0 },
    bus: { kind: "bus", w: 66, h: 126, big: true, score: 0 },
    truck: { kind: "truck", w: 72, h: 120, big: true, score: 0 },
    cow: { kind: "cow", w: 60, h: 60, big: false, score: 0 },
    pothole: {
      kind: "pothole",
      w: 66,
      h: 52,
      big: false,
      score: 0,
      hazard: true,
    },
    barricade: {
      kind: "barricade",
      w: 64,
      h: 62,
      big: false,
      score: 0,
      hazard: true,
    },
    scooter: { kind: "scooter", w: 40, h: 62, big: false, score: 0 },
    erickshaw: { kind: "erickshaw", w: 50, h: 78, big: false, score: 0 },
    sweep: {
      kind: "sweep",
      w: road.w,
      h: 64,
      big: true,
      score: 0,
      hazard: true,
    },
  };

  function laneX(laneIndex, w) {
    const x0 = road.x + laneIndex * road.laneW;
    return x0 + (road.laneW - w) / 2;
  }

  function spawnObstacle() {
    // Difficulty affects mix
    const d = State.difficulty;
    const pool = [];

    pool.push("car", "car", "car");
    if (d > 1.1) pool.push("scooter");
    if (d > 1.4) pool.push("erickshaw");
    if (d > 1.2) pool.push("cow");
    if (d > 1.6) pool.push("pothole");
    if (d > 2.0) pool.push("barricade");
    if (d > 2.3) pool.push("bus");
    if (d > 2.7) pool.push("truck");
    if (State.event?.type === "vip") pool.push("bus", "bus");
    if (State.event?.type === "festival")
      pool.push("car", "car", "cow", "barricade");

    // Metro Barrier Sweep: occasional “boss hazard” leaving one safe lane gap
    if (d > 2.2 && State.sweepCooldown <= 0 && Math.random() < 0.06) {
      const safeLane = (Math.random() * road.lanes) | 0;
      const t = obstacleTypes.sweep;
      obstacles.push({
        kind: t.kind,
        x: road.x,
        y: -t.h - 20,
        w: road.w,
        h: t.h,
        v: State.speed * 1.02,
        pushedT: 0,
        pushVX: 0,
        nearMissed: true, // prevent near-miss scoring on sweeps
        big: true,
        hazard: true,
        safeLane,
      });
      State.sweepCooldown = 8.0;
      toast("METRO BARRIER SWEEP!");
      Audio.SFX.event();
      return;
    }

    const kind = pick(pool);
    const t = obstacleTypes[kind];

    const laneCount = road.lanes;
    const lane = (Math.random() * laneCount) | 0;
    const x = laneX(lane, t.w);

    const baseV = State.speed * rand(0.85, 1.12);
    const y = -t.h - rand(0, 120);

    obstacles.push({
      kind: t.kind,
      x,
      y,
      w: t.w,
      h: t.h,
      v: baseV,
      pushedT: 0,
      pushVX: 0,
      nearMissed: false,
      big: !!t.big,
      hazard: !!t.hazard,
    });
  }

  function spawnPickup() {
    // Mostly coins, sometimes chai, rarely magnet power-up
    const roll = Math.random();
    const kind = roll < 0.1 ? "magnet" : roll < 0.32 ? "chai" : "coin";

    const w = kind === "chai" ? 44 : kind === "magnet" ? 40 : 32;
    const h = kind === "chai" ? 44 : kind === "magnet" ? 40 : 32;
    const lane = (Math.random() * road.lanes) | 0;
    const x = laneX(lane, w) + rand(-8, 8);
    const y = -h - rand(0, 200);
    pickups.push({
      kind,
      x,
      y,
      w,
      h,
      v: State.speed * rand(0.95, 1.15),
      spin: rand(0, Math.PI * 2),
    });
  }

  // ---------- Events ----------
  function maybeTriggerEvent() {
    if (State.score < State.nextMilestone) return;
    State.nextMilestone += 900 + Math.floor(State.score / 1400) * 120;

    const options = ["rain", "vip", "festival"];
    const type = pick(options);
    const dur = type === "vip" ? 7.5 : type === "festival" ? 9.0 : 8.5;

    State.event = { type, until: State.t + dur };
    Audio.SFX.event();

    if (type === "rain") toast("Random Event: MONSOON MODE ☔");
    if (type === "vip") toast("Random Event: VIP CONVOY 🚓");
    if (type === "festival") toast("Random Event: FESTIVAL TRAFFIC 🎉");
  }

  // ---------- Particles ----------
  function burst(x, y, n, color, power = 1) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const s = rand(40, 240) * power;
      particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        r: rand(1.5, 3.6) * power,
        life: rand(0.25, 0.65),
        t: 0,
        color,
      });
    }
  }

  function sparkle(x, y, text) {
    // tiny "comic" burst + optional toast
    burst(x, y, 14, "rgba(255,210,74,0.9)", 1);
    if (text) toast(text);
  }

  // ---------- Horn ----------
  function tryHorn() {
    if (State.mode !== "playing") return;
    if (State.horn.readyIn > 0) return;

    State.horn.readyIn = State.horn.cooldown;
    State.horn.activeT = 0.18;
    Audio.SFX.horn();
    burst(
      player.x + player.w / 2,
      player.y + 12,
      12,
      "rgba(88,248,255,0.9)",
      0.9,
    );

    // push small obstacles near player
    const cx = player.x + player.w / 2;
    const cy = player.y + player.h / 2;
    const r = State.horn.radius;

    for (const o of obstacles) {
      if (o.big) continue;
      const ox = o.x + o.w / 2;
      const oy = o.y + o.h / 2;
      const dx = ox - cx;
      const dy = oy - cy;
      const dist = Math.hypot(dx, dy);
      if (dist < r) {
        const dir = dx === 0 ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(dx);
        o.pushedT = 0.22;
        o.pushVX = dir * rand(280, 420);
      }
    }
  }

  // ---------- Game lifecycle ----------
  function resetGame() {
    obstacles.length = 0;
    pickups.length = 0;
    particles.length = 0;

    State.t = 0;
    State.timeAlive = 0;
    State.score = 0;
    State.difficulty = 1;
    State.baseSpeed = 320;
    State.speed = 320;
    State.slowmoT = 0;
    State.spawnTimer = 0;
    State.pickupTimer = 0;
    State.nearMissCombo = 0;
    State.comboT = 0;
    State.roadY = 0;
    State.shake = 0;
    State.event = null;
    State.nextMilestone = 800;

    State.horn.readyIn = 0;
    State.horn.activeT = 0;
    State.power.magnetT = 0;
    State.sweepCooldown = 0;

    player.x = W / 2 - player.w / 2;
    player.vx = 0;
    player.invulnT = 0;

    updateHUD();
  }

  const slogans = [
    "Lane is optional.",
    "U-Turn is a suggestion.",
    "Indicator? Never heard of her.",
    "If gap exists, auto fits.",
    "DTC bus = final boss.",
    "Cow has right of way.",
    "One honk = diplomacy.",
    "Wrong side is a mindset.",
    "Metro pillar slalom.",
  ];

  function rankFor(score) {
    const s = Math.floor(score);
    if (s >= 12000) return { title: "Ring Road Legend" };
    if (s >= 8000) return { title: "Connaught Champ" };
    if (s >= 5200) return { title: "Dilli Daredevil" };
    if (s >= 3200) return { title: "Auto Ace" };
    return { title: "Dilli Driver" };
  }

  function updateSlogan() {
    if (!$slogan) return;
    if (State.mode === "playing" && State.t < State.sloganNextAt) return;
    if (State.t < State.sloganNextAt) return;
    State.sloganIndex = (State.sloganIndex + 1) % slogans.length;
    $slogan.textContent = slogans[State.sloganIndex];
    State.sloganNextAt = State.t + 5.2;
  }

  function startGame() {
    Audio.ensure(); // unlock on user gesture
    resetGame();
    State.mode = "playing";
    setOverlay($startOverlay, false);
    setOverlay($gameOverOverlay, false);
    setOverlay($pauseOverlay, false);
    Audio.SFX.start();
    toast("GO! Horn OK Please!");
  }

  function pauseGame() {
    if (State.mode !== "playing") return;
    State.mode = "paused";
    setOverlay($pauseOverlay, true);
    toast("Paused");
  }

  function resumeGame() {
    if (State.mode !== "paused") return;
    State.mode = "playing";
    setOverlay($pauseOverlay, false);
    toast("Back to chaos");
  }

  function gameOver(reason = "Bonk.") {
    State.mode = "gameover";
    setOverlay($gameOverOverlay, true);
    setOverlay($pauseOverlay, false);

    State.best = Math.max(State.best, State.score);
    Storage.saveBest(State.best);
    updateHUD();

    $finalScore.textContent = formatInt(State.score);
    $finalBest.textContent = formatInt(State.best);
    $gameOverTip.textContent = reason;
    if ($rankLine)
      $rankLine.textContent = `Rank: ${rankFor(State.score).title}`;
  }

  // ---------- Input ----------
  function setInputKey(code, down) {
    if (code === "ArrowLeft" || code === "KeyA") State.input.left = down;
    if (code === "ArrowRight" || code === "KeyD") State.input.right = down;
  }

  window.addEventListener(
    "keydown",
    (e) => {
      if (["ArrowLeft", "ArrowRight", "Space"].includes(e.code))
        e.preventDefault();

      if (e.code === "KeyP") {
        if (State.mode === "playing") pauseGame();
        else if (State.mode === "paused") resumeGame();
        return;
      }

      if (e.code === "KeyM") {
        Audio.setMuted(!Audio.muted);
        $muteIcon.textContent = Audio.muted ? "🔇" : "🔊";
        return;
      }

      if (
        State.mode === "start" &&
        (e.code === "Enter" || e.code === "Space")
      ) {
        startGame();
        return;
      }

      if (
        State.mode === "gameover" &&
        (e.code === "Enter" || e.code === "Space")
      ) {
        startGame();
        return;
      }

      setInputKey(e.code, true);
      if (e.code === "Space") tryHorn();
    },
    { passive: false },
  );

  window.addEventListener("keyup", (e) => setInputKey(e.code, false));

  function bindHold(btn, onDown, onUp) {
    const down = (e) => {
      e.preventDefault();
      onDown();
    };
    const up = (e) => {
      e.preventDefault();
      onUp();
    };
    btn.addEventListener("pointerdown", down);
    btn.addEventListener("pointerup", up);
    btn.addEventListener("pointercancel", up);
    btn.addEventListener("pointerleave", up);
  }

  bindHold(
    $leftBtn,
    () => (State.input.left = true),
    () => (State.input.left = false),
  );
  bindHold(
    $rightBtn,
    () => (State.input.right = true),
    () => (State.input.right = false),
  );
  $hornBtn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    tryHorn();
  });

  // ---------- Buttons ----------
  $startBtn.addEventListener("click", startGame);
  $resumeBtn.addEventListener("click", resumeGame);
  $restartBtn1.addEventListener("click", startGame);
  $restartBtn2.addEventListener("click", startGame);
  $pauseBtn.addEventListener("click", () => {
    if (State.mode === "playing") pauseGame();
    else if (State.mode === "paused") resumeGame();
  });

  $muteBtn.addEventListener("click", () => {
    Audio.setMuted(!Audio.muted);
    $muteIcon.textContent = Audio.muted ? "🔇" : "🔊";
  });

  $shareBtn.addEventListener("click", async () => {
    const r = rankFor(State.score);
    const text = `I survived  traffic for ${formatInt(State.score)} points in  Auto-Rickshaw Rush — Rank: ${r.title}. Horn OK Please!`;
    try {
      await navigator.clipboard.writeText(text);
      toast("Copied brag text");
    } catch {
      toast("Copy failed (browser blocked)");
    }
  });

  $howBtn.addEventListener("click", () => {
    if ($howModal.showModal) $howModal.showModal();
  });
  $closeHowBtn.addEventListener("click", () => $howModal.close());

  // ---------- Update ----------
  function updateDifficulty(dt) {
    // ramps gradually every few seconds
    State.timeAlive += dt;
    State.difficulty = 1 + State.timeAlive * 0.06; // ~ +0.36 per 6s

    const eventBoost =
      State.event?.type === "festival"
        ? 1.18
        : State.event?.type === "vip"
          ? 1.12
          : 1.0;

    State.baseSpeed = (320 + State.timeAlive * 9) * eventBoost; // increases scroll speed
  }

  function updateSpawns(dt) {
    // obstacle spawns (faster as difficulty rises)
    const spawnRate = lerp(0.85, 0.38, clamp((State.difficulty - 1) / 4, 0, 1));
    const festivalExtra = State.event?.type === "festival" ? 0.85 : 1.0;
    State.spawnTimer -= dt;
    if (State.spawnTimer <= 0) {
      spawnObstacle();
      if (Math.random() < 0.08 + clamp(State.difficulty * 0.02, 0, 0.12))
        spawnObstacle();
      State.spawnTimer = spawnRate * festivalExtra * rand(0.75, 1.25);
    }

    // pickups
    State.pickupTimer -= dt;
    if (State.pickupTimer <= 0) {
      spawnPickup();
      State.pickupTimer = rand(1.2, 2.2);
    }
  }

  function updatePlayer(dt) {
    const dir = (State.input.right ? 1 : 0) - (State.input.left ? 1 : 0);

    if (dir !== 0) {
      player.vx += dir * player.accel * dt;
    } else {
      // friction toward 0
      const s = Math.sign(player.vx);
      const v = Math.abs(player.vx);
      const nv = Math.max(0, v - player.friction * dt);
      player.vx = nv * s;
    }

    player.vx = clamp(player.vx, -player.maxSpeed, player.maxSpeed);
    player.x += player.vx * dt;

    const leftBound = road.x + 8;
    const rightBound = road.x + road.w - player.w - 8;
    player.x = clamp(player.x, leftBound, rightBound);
  }

  function updateEntities(dt) {
    // horn cooldown
    State.horn.readyIn = Math.max(0, State.horn.readyIn - dt);
    State.horn.activeT = Math.max(0, State.horn.activeT - dt);

    // event expiration
    if (State.event && State.t > State.event.until) State.event = null;

    // slow-mo timer (1s on near miss)
    State.slowmoT = Math.max(0, State.slowmoT - dt);
    const slowK = State.slowmoT > 0 ? 0.58 : 1.0;
    State.speed = State.baseSpeed * slowK;

    // combo timer
    State.comboT = Math.max(0, State.comboT - dt);
    if (State.comboT <= 0)
      State.nearMissCombo = Math.max(0, State.nearMissCombo - dt * 1.2);

    // power-ups
    State.power.magnetT = Math.max(0, State.power.magnetT - dt);

    // sweep cooldown
    State.sweepCooldown = Math.max(0, State.sweepCooldown - dt);

    // obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];

      if (o.pushedT > 0) {
        o.pushedT -= dt;
        o.x += o.pushVX * dt;
        // keep inside road
        o.x = clamp(o.x, road.x + 6, road.x + road.w - o.w - 6);
      }

      o.y += o.v * dt;

      if (o.y > H + 150) obstacles.splice(i, 1);
    }

    // pickups
    for (let i = pickups.length - 1; i >= 0; i--) {
      const p = pickups[i];
      p.spin += dt * 6.0;
      p.y += p.v * dt;

      // magnet effect: pull coins toward the player
      if (State.power.magnetT > 0 && p.kind === "coin") {
        const px = player.x + player.w / 2;
        const py = player.y + player.h / 2;
        const cx = p.x + p.w / 2;
        const cy = p.y + p.h / 2;
        const dx = px - cx;
        const dy = py - cy;
        const dist = Math.hypot(dx, dy);
        if (dist < 260) {
          const pull = (1 - dist / 260) * 620;
          p.x += (dx / Math.max(1, dist)) * pull * dt;
          p.y += (dy / Math.max(1, dist)) * (pull * 0.15) * dt;
        }
      }

      if (p.y > H + 120) pickups.splice(i, 1);
    }

    // particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.t += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94;
      p.vy *= 0.94;
      if (p.t > p.life) particles.splice(i, 1);
    }
  }

  function updateScore(dt) {
    // base score = survival time
    State.score += dt * (60 + State.difficulty * 8);
  }

  function handleNearMiss(o) {
    if (o.nearMissed) return;

    // near miss if passing very close without overlap
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;
    const ox = o.x + o.w / 2;
    const oy = o.y + o.h / 2;
    const dx = Math.abs(px - ox);
    const dy = Math.abs(py - oy);

    const closeX = dx < player.w * 0.55 + o.w * 0.45;
    const closeY = dy < player.h * 0.6 + o.h * 0.55;
    const notOver = !rectsOverlap(player, o);

    if (
      closeX &&
      closeY &&
      notOver &&
      o.y > player.y - 40 &&
      o.y < player.y + player.h + 10
    ) {
      o.nearMissed = true;
      State.nearMissCombo = Math.min(9, State.nearMissCombo + 1);
      State.comboT = 1.4;

      const mult = 1 + Math.floor(State.nearMissCombo);
      const base = 38 + State.nearMissCombo * 16;
      const bonus = base * mult;
      State.score += bonus;

      // 1-second slow-mo “hype”
      State.slowmoT = 1.0;
      Audio.SFX.whoosh();
      Audio.SFX.nearMiss();
      sparkle(px, py - 10, `Near Miss! x${mult}`);
    }
  }

  function collideAndCollect() {
    // pickups
    for (let i = pickups.length - 1; i >= 0; i--) {
      const p = pickups[i];
      if (rectsOverlap(player, p)) {
        pickups.splice(i, 1);
        if (p.kind === "coin") {
          State.score += 120;
          Audio.SFX.coin();
          burst(p.x + p.w / 2, p.y + p.h / 2, 16, "rgba(255,210,74,0.95)", 1);
          toast("+120 Coin!");
        } else if (p.kind === "chai") {
          State.score += 220;
          Audio.SFX.chai();
          burst(p.x + p.w / 2, p.y + p.h / 2, 18, "rgba(217,140,59,0.95)", 1.1);
          toast("Chai Boost! +220");
          // tiny temporary easing: horn faster for a moment
          State.horn.readyIn = Math.max(0, State.horn.readyIn - 0.25);
        } else if (p.kind === "magnet") {
          State.power.magnetT = 6.0;
          State.score += 90;
          Audio.SFX.event();
          burst(p.x + p.w / 2, p.y + p.h / 2, 24, "rgba(88,248,255,0.9)", 1.1);
          toast("MAGNET! Coins come to you");
        }
      }
    }

    // obstacles
    for (const o of obstacles) {
      if (o.kind !== "sweep") handleNearMiss(o);

      if (o.kind === "sweep") {
        // Sweep blocks the full road except one safe-lane gap.
        if (rectsOverlap(player, o)) {
          const gapPad = 10;
          const gapW = road.laneW - gapPad * 2;
          const gapX = road.x + o.safeLane * road.laneW + gapPad;
          const px = player.x + player.w / 2;
          const inGap = px >= gapX && px <= gapX + gapW;
          if (!inGap) {
            Audio.SFX.hit();
            State.shake = 0.65;
            burst(
              player.x + player.w / 2,
              player.y + player.h / 2,
              54,
              "rgba(255,59,59,0.92)",
              1.25,
            );
            gameOver("METRO BARRIER said: 'No entry'.");
            return;
          }
        }
        continue;
      }

      if (rectsOverlap(player, o)) {
        Audio.SFX.hit();
        State.shake = 0.55;
        burst(
          player.x + player.w / 2,
          player.y + player.h / 2,
          42,
          "rgba(255,59,59,0.92)",
          1.2,
        );
        gameOver(`SPLAT! You kissed a ${o.kind.toUpperCase()}.`);
        return;
      }
    }

    // decay combo if no recent near misses
    // (decay handled by comboT in updateEntities)
  }

  function updateShake(dt) {
    State.shake = Math.max(0, State.shake - dt * 1.6);
    const mag = State.shake * 10;
    if (mag > 0.01) {
      State.shakeX = rand(-mag, mag);
      State.shakeY = rand(-mag, mag);
    } else {
      State.shakeX = 0;
      State.shakeY = 0;
    }
  }

  // ---------- Draw ----------
  function drawArt(name, dx, dy, dw, dh, { alpha = 1, rotate = 0 } = {}) {
    if (!Art.ready) return false;
    const img = Art.imgs[name];
    if (!img || !img.complete) return false;

    ctx.save();
    ctx.globalAlpha = alpha;
    if (rotate) {
      ctx.translate(dx + dw / 2, dy + dh / 2);
      ctx.rotate(rotate);
      ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    } else {
      ctx.drawImage(img, dx, dy, dw, dh);
    }
    ctx.restore();
    return true;
  }

  function drawRoundedRect(x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function drawRoad() {
    // background glow
    ctx.fillStyle = "rgba(88,248,255,0.05)";
    ctx.fillRect(0, 0, W, H);

    // sidewalks
    ctx.fillStyle = palette.sidewalk;
    ctx.fillRect(0, 0, road.x, H);
    ctx.fillRect(road.x + road.w, 0, W - (road.x + road.w), H);

    // curbs (neon stripes)
    const curbW = 6;
    ctx.fillStyle = palette.curb;
    ctx.fillRect(road.x - curbW, 0, curbW, H);
    ctx.fillRect(road.x + road.w, 0, curbW, H);

    ctx.fillStyle = palette.curb2;
    for (let y = -30; y < H + 30; y += 54) {
      const yy = ((y + State.roadY * 0.7) % (H + 54)) - 54;
      ctx.fillRect(road.x - curbW, yy, curbW, 20);
      ctx.fillRect(road.x + road.w, yy, curbW, 20);
    }

    // asphalt
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, palette.asphalt);
    grad.addColorStop(1, palette.asphalt2);
    ctx.fillStyle = grad;
    ctx.fillRect(road.x, 0, road.w, H);

    // lane lines
    ctx.save();
    ctx.translate(0, State.roadY % 40);
    ctx.strokeStyle = "rgba(255,255,255,0.24)";
    ctx.lineWidth = 2;
    for (let i = 1; i < road.lanes; i++) {
      const x = road.x + i * road.laneW;
      ctx.setLineDash([16, 18]);
      ctx.beginPath();
      ctx.moveTo(x, -60);
      ctx.lineTo(x, H + 60);
      ctx.stroke();
    }
    ctx.restore();

    // animated sidewalk shops + crowd dots
    const shopLabels = ["CHAAT", "METRO", "PAAN", "MOMO", "GOLGAPPA", "KULFI"];
    for (let i = 0; i < 12; i++) {
      const y = ((i * 120 + State.roadY * 0.88) % (H + 160)) - 160;

      // shop blocks
      const lx = 10;
      const rx = W - 54;
      const lh = 64;
      const rh = 68;

      ctx.fillStyle =
        i % 2 === 0 ? "rgba(255,79,216,0.14)" : "rgba(88,248,255,0.12)";
      ctx.fillRect(lx, y + 14, 44, lh);
      ctx.fillStyle =
        i % 3 === 0 ? "rgba(255,210,74,0.14)" : "rgba(69,255,154,0.10)";
      ctx.fillRect(rx, y + 10, 44, rh);

      // signboards
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(lx, y + 8, 44, 14);
      ctx.fillRect(rx, y + 4, 44, 14);
      ctx.fillStyle = "rgba(255,255,255,0.82)";
      ctx.font = "900 9px ui-sans-serif, system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(shopLabels[i % shopLabels.length], lx + 22, y + 15);
      ctx.fillText(shopLabels[(i + 2) % shopLabels.length], rx + 22, y + 11);

      // crowd (little heads)
      for (let j = 0; j < 6; j++) {
        const bob = Math.sin(State.t * 6 + i * 0.8 + j) * 1.5;
        const cx = lx + 8 + j * 6 + (i % 2) * 2;
        const cy = y + 56 + bob;
        ctx.fillStyle =
          j % 3 === 0
            ? "rgba(255,210,74,0.35)"
            : j % 3 === 1
              ? "rgba(255,79,216,0.35)"
              : "rgba(88,248,255,0.28)";
        ctx.beginPath();
        ctx.arc(cx, cy, 2.0, 0, Math.PI * 2);
        ctx.fill();

        const cx2 = rx + 10 + j * 5;
        const cy2 = y + 54 + bob;
        ctx.beginPath();
        ctx.arc(cx2, cy2, 2.0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawRickshaw() {
    const x = player.x;
    const y = player.y;
    const w = player.w;
    const h = player.h;

    // SVG art render path (fallback to shapes below)
    if (drawArt("auto", x - 14, y - 22, w + 28, h + 36)) {
      // horn pulse ring on top
      if (State.horn.activeT > 0) {
        const t = State.horn.activeT / 0.18;
        const r = lerp(State.horn.radius * 0.2, State.horn.radius, 1 - t);
        ctx.strokeStyle = `rgba(88,248,255,${0.5 * t})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      return;
    }

    // shadow
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h - 6, w * 0.62, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // body
    ctx.fillStyle = palette.rickshaw;
    drawRoundedRect(x, y + 10, w, h - 18, 12);
    ctx.fill();

    // roof
    ctx.fillStyle = palette.ink;
    drawRoundedRect(x - 2, y, w + 4, 18, 10);
    ctx.fill();

    // windshield
    ctx.fillStyle = "rgba(88,248,255,0.22)";
    drawRoundedRect(x + 6, y + 16, w - 12, 18, 8);
    ctx.fill();

    // stripes
    ctx.fillStyle = palette.rickshaw2;
    ctx.fillRect(x + 5, y + 40, w - 10, 6);
    ctx.fillRect(x + 5, y + 52, w - 10, 5);

    // "Horn OK" sign
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    drawRoundedRect(x + 6, y + 60, w - 12, 12, 6);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.90)";
    ctx.font = "900 8px ui-sans-serif, system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("HORN OK", x + w / 2, y + 66);

    // wheels
    ctx.fillStyle = palette.ink;
    ctx.beginPath();
    ctx.arc(x + 9, y + h - 12, 8, 0, Math.PI * 2);
    ctx.arc(x + w - 9, y + h - 12, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.arc(x + 9, y + h - 12, 3, 0, Math.PI * 2);
    ctx.arc(x + w - 9, y + h - 12, 3, 0, Math.PI * 2);
    ctx.fill();

    // horn pulse ring
    if (State.horn.activeT > 0) {
      const t = State.horn.activeT / 0.18;
      const r = lerp(State.horn.radius * 0.2, State.horn.radius, 1 - t);
      ctx.strokeStyle = `rgba(88,248,255,${0.5 * t})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawObstacle(o) {
    const x = o.x,
      y = o.y,
      w = o.w,
      h = o.h;
    // simple shadow
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h - 4, w * 0.55, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // SVG art render path (fallback to shapes below)
    if (Art.ready) {
      if (o.kind === "car" && drawArt("car", x - 10, y - 14, w + 20, h + 26))
        return;
      if (o.kind === "bus" && drawArt("bus", x - 12, y - 16, w + 24, h + 30))
        return;
      if (
        o.kind === "truck" &&
        drawArt("truck", x - 12, y - 16, w + 24, h + 28)
      )
        return;
      if (
        o.kind === "scooter" &&
        drawArt("scooter", x - 10, y - 14, w + 20, h + 26)
      )
        return;
      if (
        o.kind === "erickshaw" &&
        drawArt("erickshaw", x - 10, y - 14, w + 20, h + 26)
      )
        return;
      if (o.kind === "cow" && drawArt("cow", x - 12, y - 16, w + 24, h + 30))
        return;
      if (
        o.kind === "pothole" &&
        drawArt("pothole", x - 12, y - 10, w + 24, h + 22)
      )
        return;
      if (
        o.kind === "barricade" &&
        drawArt("barricade", x - 12, y - 14, w + 24, h + 26)
      )
        return;
    }

    if (o.kind === "sweep") {
      // “Metro barrier” across road, with one safe lane gap
      const gapPad = 10;
      const gapW = road.laneW - gapPad * 2;
      const gapX = road.x + o.safeLane * road.laneW + gapPad;

      ctx.save();
      // base bar
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      drawRoundedRect(x + 6, y + 10, w - 12, h - 18, 14);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.55)";
      ctx.lineWidth = 3;
      ctx.stroke();

      // stripes
      ctx.fillStyle = "rgba(255,79,216,0.85)";
      for (let i = 0; i < 7; i++) ctx.fillRect(x + 14 + i * 46, y + 26, 22, 10);
      ctx.fillStyle = "rgba(255,210,74,0.85)";
      for (let i = 0; i < 7; i++) ctx.fillRect(x + 28 + i * 46, y + 44, 22, 10);

      // “cut out” safe gap
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0,1)";
      drawRoundedRect(gapX, y + 12, gapW, h - 22, 12);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";

      // label above the gap
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      drawRoundedRect(gapX + 4, y + 14, gapW - 8, 18, 10);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.font = "900 10px ui-sans-serif, system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("SAFE LANE", gapX + gapW / 2, y + 23);

      // METRO text
      ctx.fillStyle = "rgba(0,0,0,0.60)";
      ctx.font = "900 12px ui-sans-serif, system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("METRO BARRIER", x + w / 2, y + h - 18);

      ctx.restore();
      return;
    }

    if (o.kind === "car") {
      ctx.fillStyle = palette.car;
      drawRoundedRect(x, y + 8, w, h - 10, 12);
      ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      drawRoundedRect(x + 8, y + 18, w - 16, 18, 8);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.90)";
      ctx.font = "900 9px ui-sans-serif, system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("NOIDA", x + w / 2, y + 26);
    } else if (o.kind === "bus") {
      ctx.fillStyle = palette.bus;
      drawRoundedRect(x, y + 6, w, h - 8, 14);
      ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.50)";
      drawRoundedRect(x + 8, y + 18, w - 16, 22, 10);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.90)";
      ctx.font = "900 9px ui-sans-serif, system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("DTC", x + w / 2, y + 29);
      // windows
      ctx.fillStyle = "rgba(255,255,255,0.14)";
      for (let i = 0; i < 3; i++) ctx.fillRect(x + 10 + i * 16, y + 48, 12, 16);
    } else if (o.kind === "truck") {
      ctx.fillStyle = "rgba(255,210,74,0.95)";
      drawRoundedRect(x, y + 10, w, h - 14, 14);
      ctx.fill();
      // cabin
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      drawRoundedRect(x + 8, y + 22, w - 16, 26, 10);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = "900 9px ui-sans-serif, system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("TRUCK", x + w / 2, y + 36);
      // grill lines
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      for (let i = 0; i < 4; i++)
        ctx.fillRect(x + 14, y + h - 34 + i * 6, w - 28, 3);
    } else if (o.kind === "cow") {
      ctx.fillStyle = palette.cow;
      drawRoundedRect(x, y + 14, w, h - 14, 18);
      ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath();
      ctx.arc(x + w * 0.32, y + 34, 4, 0, Math.PI * 2);
      ctx.arc(x + w * 0.68, y + 34, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 10, y + 26);
      ctx.lineTo(x + 2, y + 18);
      ctx.moveTo(x + w - 10, y + 26);
      ctx.lineTo(x + w + 6, y + 18);
      ctx.stroke();
    } else if (o.kind === "pothole") {
      ctx.fillStyle = palette.pot;
      ctx.beginPath();
      ctx.ellipse(
        x + w / 2,
        y + h / 2 + 8,
        w * 0.46,
        h * 0.32,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(
        x + w / 2,
        y + h / 2 + 8,
        w * 0.44,
        h * 0.3,
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    } else if (o.kind === "barricade") {
      ctx.fillStyle = palette.barricade;
      drawRoundedRect(x, y + 10, w, h - 10, 12);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.14)";
      for (let i = 0; i < 3; i++)
        ctx.fillRect(x + 10 + i * 16, y + 24 + i * 10, w - 20, 7);
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.font = "900 9px ui-sans-serif, system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("STOP", x + w / 2, y + h - 20);
    } else if (o.kind === "scooter") {
      ctx.fillStyle = "rgba(69,255,154,0.95)";
      drawRoundedRect(x, y + 10, w, h - 14, 14);
      ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      drawRoundedRect(x + 6, y + 18, w - 12, 16, 10);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = "900 9px ui-sans-serif, system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("SCOOT", x + w / 2, y + 26);
    } else if (o.kind === "erickshaw") {
      ctx.fillStyle = "rgba(88,248,255,0.92)";
      drawRoundedRect(x, y + 10, w, h - 14, 14);
      ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      drawRoundedRect(x + 6, y + 16, w - 12, 18, 10);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.88)";
      ctx.font = "900 9px ui-sans-serif, system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("E-RIK", x + w / 2, y + 25);
    }
  }

  function drawCRT() {
    // scanlines + slight vignette (simple, cheap)
    ctx.save();
    ctx.globalCompositeOperation = "overlay";
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
    ctx.globalCompositeOperation = "multiply";
    const v = ctx.createRadialGradient(
      W / 2,
      H / 2,
      80,
      W / 2,
      H / 2,
      Math.max(W, H) * 0.7,
    );
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,0,0,0.28)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  function drawPickup(p) {
    const x = p.x,
      y = p.y,
      w = p.w,
      h = p.h;

    // SVG art render path (fallback to shapes below)
    if (Art.ready) {
      if (p.kind === "coin" && drawArt("coin", x - 10, y - 10, w + 20, h + 20))
        return;
      if (p.kind === "chai" && drawArt("chai", x - 10, y - 10, w + 20, h + 20))
        return;
    }

    if (p.kind === "coin") {
      const wob = Math.sin(p.spin) * 3;
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h - 4, w * 0.35, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = palette.coin;
      ctx.beginPath();
      ctx.ellipse(
        x + w / 2,
        y + h / 2,
        w * 0.46 + wob,
        h * 0.4,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.45)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(
        x + w / 2,
        y + h / 2,
        w * 0.34 + wob,
        h * 0.28,
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    } else if (p.kind === "magnet") {
      // magnet icon (simple)
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h - 4, w * 0.4, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.lineWidth = 6;
      ctx.strokeStyle = "rgba(88,248,255,0.92)";
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, w * 0.28, Math.PI * 0.1, Math.PI * 0.9);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,79,216,0.86)";
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, w * 0.28, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();

      ctx.fillStyle = "rgba(255,255,255,0.80)";
      ctx.font = "900 10px ui-sans-serif, system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("MAG", x + w / 2, y + h / 2);
    } else {
      // chai cup
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h - 4, w * 0.4, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(255,255,255,0.88)";
      drawRoundedRect(x + 8, y + 10, w - 16, h - 16, 10);
      ctx.fill();
      ctx.fillStyle = palette.chai;
      drawRoundedRect(x + 10, y + 20, w - 20, h - 26, 10);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + w - 10, y + 24, 8, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
    }
  }

  function drawParticles() {
    for (const p of particles) {
      const a = 1 - p.t / p.life;
      ctx.fillStyle = p.color
        .replace(")", `,${clamp(a, 0, 1)})`)
        .replace("rgba(", "rgba(");
      // if already rgba(...) we keep, otherwise just use p.color
      ctx.fillStyle = p.color.includes("rgba")
        ? p.color.replace(/rgba\(([^)]+)\)/, (m, inside) => {
            const parts = inside.split(",").map((s) => s.trim());
            if (parts.length === 4) parts[3] = String(clamp(a, 0, 1));
            return `rgba(${parts.join(",")})`;
          })
        : p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawEventFX() {
    if (!State.event) return;

    if (State.event.type === "rain") {
      ctx.fillStyle = "rgba(120,180,255,0.06)";
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = palette.rain;
      ctx.lineWidth = 2;
      for (let i = 0; i < 60; i++) {
        const x = ((i * 31 + State.t * 680) % (W + 60)) - 30;
        const y = ((i * 47 + State.t * 920) % (H + 80)) - 80;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 10, y + 22);
        ctx.stroke();
      }
    }

    if (State.event.type === "vip") {
      // flashing corners
      const f = (Math.sin(State.t * 14) + 1) / 2;
      ctx.fillStyle = `rgba(255,59,59,${0.14 + 0.12 * f})`;
      ctx.fillRect(0, 0, W, 10);
      ctx.fillRect(0, 0, 10, H);
      ctx.fillStyle = `rgba(88,248,255,${0.12 + 0.1 * (1 - f)})`;
      ctx.fillRect(0, H - 10, W, 10);
      ctx.fillRect(W - 10, 0, 10, H);
    }

    if (State.event.type === "festival") {
      // confetti dots
      for (let i = 0; i < 46; i++) {
        const x = (i * 39 + State.t * 140) % W;
        const y = (i * 71 + State.t * 240) % H;
        ctx.fillStyle =
          i % 3 === 0
            ? "rgba(255,79,216,0.35)"
            : i % 3 === 1
              ? "rgba(255,210,74,0.35)"
              : "rgba(69,255,154,0.35)";
        ctx.beginPath();
        ctx.arc(x, y, 2.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function draw() {
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    ctx.translate(State.shakeX, State.shakeY);

    drawRoad();

    // draw pickups & obstacles
    for (const p of pickups) drawPickup(p);
    for (const o of obstacles) drawObstacle(o);

    drawRickshaw();
    drawParticles();
    drawEventFX();

    // top vignette
    const g = ctx.createLinearGradient(0, 0, 0, 140);
    g.addColorStop(0, "rgba(0,0,0,0.32)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, 140);

    // horn hint on canvas
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.font = "900 12px ui-sans-serif, system-ui";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("Horn OK Please", 14, 12);

    // event label
    if (State.event) {
      const label =
        State.event.type === "rain"
          ? "MONSOON MODE"
          : State.event.type === "vip"
            ? "VIP CONVOY"
            : "FESTIVAL TRAFFIC";
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(W - 170, 10, 156, 22);
      ctx.fillStyle = "rgba(255,255,255,0.88)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "900 11px ui-sans-serif, system-ui";
      ctx.fillText(label, W - 92, 21);
    }

    drawCRT();
    ctx.restore();
  }

  // ---------- Main loop ----------
  function tick(ms) {
    const t = ms / 1000;
    if (!State.lastFrameMs) State.lastFrameMs = ms;
    const dt = clamp((ms - State.lastFrameMs) / 1000, 0, 0.033);
    State.lastFrameMs = ms;

    State.t = t;
    State.dt = dt;

    if (State.mode === "playing") {
      updateDifficulty(dt);
      updateSpawns(dt);

      State.roadY += State.speed * dt;

      updatePlayer(dt);
      updateEntities(dt);
      updateScore(dt);
      collideAndCollect();
      maybeTriggerEvent();
      updateShake(dt);
      updateSlogan();
      updateHUD();
    } else {
      // idle anim even on menus
      State.roadY += 120 * dt;
      updateEntities(dt);
      updateShake(dt);
      updateSlogan();
    }

    draw();
    requestAnimationFrame(tick);
  }

  // ---------- Init ----------
  function init() {
    State.best = Storage.loadBest();
    updateHUD();
    if ($slogan) $slogan.textContent = slogans[0];

    // Load SVG art pack (optional)
    const entries = Object.entries(Art.urls);
    let loaded = 0;
    let failed = 0;
    for (const [name, url] of entries) {
      const img = new Image();
      img.onload = () => {
        loaded++;
        Art.ready = loaded === entries.length;
      };
      img.onerror = () => {
        failed++;
      };
      img.src = url;
      Art.imgs[name] = img;
    }
    // If any fail, we still allow partial usage (Art.ready means "all loaded"),
    // but drawArt checks image existence, so it's safe either way.

    setOverlay($startOverlay, true);
    setOverlay($pauseOverlay, false);
    setOverlay($gameOverOverlay, false);

    // Show mobile controls only when media query matches (CSS does visibility; here for semantics)
    const mq = window.matchMedia("(max-width: 640px)");
    const syncMobile = () => {
      $mobileControls.setAttribute(
        "aria-hidden",
        mq.matches ? "false" : "true",
      );
    };
    mq.addEventListener?.("change", syncMobile);
    syncMobile();

    toast("Ready.  awaits.");
    requestAnimationFrame(tick);
  }

  init();
})();
