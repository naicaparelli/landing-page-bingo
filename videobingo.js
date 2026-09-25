/* Videobingo loop shown at the top of the games carousel.
   window.mountVideoBingo(el) builds the scene inside el and returns a cleanup function.
   The loop replays a fixed script: a few draws, then the missing number completes a line on card 2. */
(function () {
  const CARDS = [
    [[3, 18, 31, 52, 77], [9, 24, 40, 63, 85], [12, 29, 46, 58, 71]],
    [[5, 16, 34, 47, 68], [11, 22, 39, 55, 80], [7, 27, 43, 61, 88]],
    [[2, 19, 36, 50, 74], [14, 25, 41, 66, 83], [8, 30, 45, 59, 90]],
    [[6, 21, 33, 54, 79], [13, 28, 38, 62, 86], [1, 17, 49, 57, 70]]
  ];
  const NEAR = { card: 1, row: 0, missing: 47 };
  const PRE = [44, 5, 24, 19, 16, 63, 21, 34, 82, 12, 41, 68, 62, 17];
  const DRAWS = [29, 55, 3, 90, 47];
  const TOTAL = 30;
  const GLOBE_BALLS = [8, 23, 36, 51, 60, 72, 11, 45, 87, 30, 66];
  const LIGHTS = 14;

  const FIRST_DRAW = 1.6, DRAW_EVERY = 2.4, WIN_HOLD = 3.8; // seconds
  const R = 0.16; // globe ball radius, relative to the globe radius

  function node(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function ball(n, extra) {
    const b = node("span", "vb-ball vb-ball--c" + (n % 5) + (extra ? " " + extra : ""));
    b.appendChild(node("span", "vb-ball__n", n));
    return b;
  }

  window.mountVideoBingo = function (root) {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    root.setAttribute("role", "img");
    root.setAttribute("aria-label", "Animação de videobingo: globo de sorteio com bolas numeradas, a bola sorteada em destaque e quatro cartelas sendo marcadas, uma delas a um número de completar a linha.");
    root.textContent = "";

    const inner = node("div", "vb__inner");
    root.appendChild(inner);

    // Machine: globe, tube and two trays
    const machine = node("div", "vb__machine");
    const globe = node("div", "vb__globe");
    const lights = node("div", "vb__lights");
    for (let i = 0; i < LIGHTS; i++) {
      const l = node("span", "vb__light");
      const a = (i / LIGHTS) * Math.PI * 2;
      l.style.left = (50 + 50 * Math.cos(a)).toFixed(2) + "%";
      l.style.top = (50 + 50 * Math.sin(a)).toFixed(2) + "%";
      l.style.animationDelay = (i % 2 ? 0.6 : 0) + "s";
      lights.appendChild(l);
    }
    const globeInner = node("div", "vb__globe-inner");
    globe.append(lights, globeInner);
    const tube = node("div", "vb__tube");
    const trays = node("div", "vb__trays");
    const trayEls = [node("div", "vb__tray"), node("div", "vb__tray")];
    trays.append(...trayEls);
    machine.append(globe, tube, trays);

    // Stage: the ball just drawn
    const stage = node("div", "vb__stage");
    const stageLabel = node("span", "vb__stage-label", "Bola");
    const bigWrap = node("div", "vb__big");
    const count = node("span", "vb__count");
    const stageLights = node("div", "vb__stage-lights");
    for (let i = 0; i < 7; i++) {
      const l = node("span", "vb__light vb__light--row");
      l.style.animationDelay = i * 0.18 + "s";
      stageLights.appendChild(l);
    }
    stage.append(stageLights, stageLabel, bigWrap, count);

    // Cards
    const cardsEl = node("div", "vb__cards");
    const cells = new Map(); // number -> [cell]
    const cardEls = [];
    let nearTag;
    CARDS.forEach((rows, ci) => {
      const card = node("div", "vb__card");
      card.style.animationDelay = ci * 0.8 + "s";
      const head = node("div", "vb__card-head");
      head.appendChild(node("span", null, "Cartela " + (ci + 1)));
      if (ci === NEAR.card) {
        nearTag = node("span", "vb__card-tag", "Falta 1");
        head.appendChild(nearTag);
        card.classList.add("is-near");
      }
      const grid = node("div", "vb__grid");
      rows.forEach((row, ri) => row.forEach((n) => {
        const c = node("span", "vb__cell", n);
        if (ci === NEAR.card && ri === NEAR.row) c.classList.add("is-row");
        if (ci === NEAR.card && n === NEAR.missing) c.classList.add("is-target");
        grid.appendChild(c);
        if (!cells.has(n)) cells.set(n, []);
        cells.get(n).push(c);
      }));
      card.append(head, grid);
      cardsEl.appendChild(card);
      cardEls.push(card);
    });

    inner.append(machine, stage, cardsEl);

    // Globe balls
    const balls = GLOBE_BALLS.map((n, i) => {
      const a = (i / GLOBE_BALLS.length) * Math.PI * 2;
      const b = { n, x: Math.cos(a) * 0.5, y: Math.sin(a) * 0.5, vx: Math.sin(a) * 0.6, vy: -Math.cos(a) * 0.6, el: ball(n) };
      globeInner.appendChild(b.el);
      return b;
    });
    let scale = 0;
    function measure() { scale = globeInner.clientWidth / 2; }
    function renderBalls() {
      for (const b of balls) b.el.style.transform = "translate(" + (b.x * scale).toFixed(1) + "px," + (b.y * scale).toFixed(1) + "px)";
    }
    function stepBalls(dt, jets) {
      const damp = Math.pow(0.8, dt);
      for (const b of balls) {
        b.vy += 2.5 * dt;
        // Random air gusts from the bottom half keep the balls tumbling (about 1.2 per ball per second)
        if (jets && b.y > 0.2 && Math.random() < 1.2 * dt) {
          b.vy -= 2.2 * (0.6 + Math.random() * 0.8);
          b.vx += (Math.random() - 0.5) * 2.2;
        }
        b.vx *= damp; b.vy *= damp;
        const sp = Math.hypot(b.vx, b.vy);
        if (sp > 2.4) { b.vx *= 2.4 / sp; b.vy *= 2.4 / sp; }
        b.x += b.vx * dt; b.y += b.vy * dt;
        const d = Math.hypot(b.x, b.y), lim = 1 - R;
        if (d > lim) {
          const nx = b.x / d, ny = b.y / d;
          b.x = nx * lim; b.y = ny * lim;
          const vn = b.vx * nx + b.vy * ny;
          if (vn > 0) { b.vx -= 1.8 * vn * nx; b.vy -= 1.8 * vn * ny; }
        }
      }
      for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
          const a = balls[i], c = balls[j];
          const dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy);
          if (d === 0 || d >= 2 * R) continue;
          const nx = dx / d, ny = dy / d, push = (2 * R - d) / 2;
          a.x -= nx * push; a.y -= ny * push; c.x += nx * push; c.y += ny * push;
          const rel = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny;
          if (rel < 0) { a.vx += rel * nx; a.vy += rel * ny; c.vx -= rel * nx; c.vy -= rel * ny; }
        }
      }
    }

    // Draw state
    let drawn = [];
    function renderTrays(animateNewest) {
      const slots = parseInt(getComputedStyle(inner).getPropertyValue("--vb-slots"), 10) || 10;
      const newestFirst = drawn.slice().reverse();
      trayEls.forEach((tray, t) => {
        tray.textContent = "";
        for (let i = 0; i < slots; i++) {
          const n = newestFirst[t * slots + i];
          const slot = node("span", "vb__slot");
          if (n != null) slot.appendChild(ball(n, animateNewest && t === 0 && i === 0 ? "is-new" : ""));
          tray.appendChild(slot);
        }
      });
    }
    function showStage(n, animate) {
      bigWrap.textContent = "";
      bigWrap.appendChild(ball(n, animate ? "is-new" : ""));
      count.textContent = drawn.length + " / " + TOTAL;
    }
    function mark(n, animate) {
      (cells.get(n) || []).forEach((c) => {
        c.classList.add("is-marked");
        c.classList.remove("is-target");
        if (animate) c.classList.add("is-new");
      });
    }
    function dropInTube(n) {
      const b = ball(n, "vb__tube-ball");
      tube.appendChild(b);
      b.addEventListener("animationend", () => b.remove());
    }
    function draw(n) {
      drawn.push(n);
      dropInTube(n);
      showStage(n, true);
      renderTrays(true);
      mark(n, true);
      if (n === NEAR.missing) {
        cardEls[NEAR.card].classList.add("is-win");
        nearTag.textContent = "Bingo!";
      }
    }
    function reset() {
      drawn = PRE.slice();
      root.querySelectorAll(".vb__cell").forEach((c) => c.classList.remove("is-marked", "is-new"));
      cells.get(NEAR.missing).forEach((c) => c.classList.add("is-target"));
      cardEls[NEAR.card].classList.remove("is-win");
      nearTag.textContent = "Falta 1";
      PRE.forEach((n) => mark(n, false));
      showStage(PRE[PRE.length - 1], false);
      renderTrays(false);
    }

    reset();
    measure();

    const ro = new ResizeObserver(() => { measure(); renderBalls(); renderTrays(false); });
    ro.observe(root);

    if (reduced) {
      // Static frame: let the balls settle at the bottom of the globe without jets
      for (let i = 0; i < 400; i++) stepBalls(1 / 60, false);
      renderBalls();
      return () => { ro.disconnect(); root.textContent = ""; };
    }

    // Timeline runs on accumulated frame time, so it pauses while offscreen or in a hidden tab
    let t = 0, k = 0, next = FIRST_DRAW, raf = 0, last = 0, visible = false;
    function frame(now) {
      const dt = Math.min((now - (last || now)) / 1000, 1 / 20);
      last = now;
      t += dt;
      stepBalls(dt, true);
      renderBalls();
      if (t >= next) {
        if (k < DRAWS.length) {
          draw(DRAWS[k++]);
          next = t + (k === DRAWS.length ? WIN_HOLD : DRAW_EVERY);
        } else {
          reset();
          k = 0;
          next = t + FIRST_DRAW;
        }
      }
      raf = requestAnimationFrame(frame);
    }
    function sync() {
      const run = visible && !document.hidden;
      if (run && !raf) { last = 0; raf = requestAnimationFrame(frame); }
      else if (!run && raf) { cancelAnimationFrame(raf); raf = 0; }
    }
    const io = new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; sync(); });
    io.observe(root);
    document.addEventListener("visibilitychange", sync);
    renderBalls();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", sync);
      root.textContent = "";
    };
  };
})();
