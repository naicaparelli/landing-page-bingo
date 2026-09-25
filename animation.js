/* Dr. Bingo scene shown at the top of the games carousel.
   Layers (assets/animation): empty lounge, tablet on the table, Dr. Bingo (open eyes + blink frame + eyebrow patch).
   window.mountDrBingoScene(el) builds the scene inside el and returns a cleanup function.
   Every timed animation shares one 6s loop (see animation.css); breathing runs twice per loop. */
(function () {
  const SRC = "assets/animation/";
  const STAGE = { w: 1672, h: 941 }; // native size of the background, the stage's coordinate system
  // Screen corners measured on 02-tablet-tela-limpa.png (TL, TR, BR, BL), in image px
  const QUAD = [[443.7, 118], [1421.4, 107.5], [1246.7, 813.2], [211.6, 719.7]];
  const SCREEN = { w: 1000, h: 700 }; // flat size of the HTML screen layer before it is warped onto QUAD
  const WORD = ["B", "I", "N", "G", "O", "!"];
  // Fixed confetti so every loop looks the same: [x %, start s, drift px, spin deg, color, shape]
  const CONFETTI = [
    [8, 1.45, 40, 320, 0, "r"], [19, 1.75, -30, -260, 1, "c"], [28, 1.55, 25, 400, 2, "r"],
    [37, 1.95, -45, 300, 3, "r"], [46, 1.5, 30, -380, 4, "c"], [55, 1.85, -20, 280, 0, "r"],
    [63, 1.6, 45, -300, 2, "r"], [72, 2.05, -35, 360, 1, "c"], [81, 1.7, 20, -340, 3, "r"],
    [90, 1.9, -40, 260, 4, "r"], [14, 2.2, 35, -280, 2, "r"], [68, 2.3, -25, 330, 0, "c"]
  ];

  // Projective transform that maps the w×h rectangle onto the quad (Heckbert's square-to-quad, rescaled)
  function quadMatrix(w, h, q) {
    const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
    const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
    const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
    const den = dx1 * dy2 - dx2 * dy1;
    const g = (dx3 * dy2 - dx2 * dy3) / den, h2 = (dx1 * dy3 - dx3 * dy1) / den;
    const a = x1 - x0 + g * x1, b = x3 - x0 + h2 * x3;
    const d = y1 - y0 + g * y1, e = y3 - y0 + h2 * y3;
    const m = [a / w, d / w, 0, g / w, b / h, e / h, 0, h2 / h, 0, 0, 1, 0, x0, y0, 0, 1];
    return "matrix3d(" + m.map((v) => +v.toFixed(8)).join(",") + ")";
  }

  function node(tag, cls, attrs) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }
  function img(file, cls, w, h) {
    return node("img", cls, { src: SRC + file, width: w, height: h, alt: "", draggable: "false", decoding: "async" });
  }

  window.mountDrBingoScene = function (root) {
    root.classList.add("dr-scene");
    root.setAttribute("role", "img");
    root.setAttribute("aria-label", "Dr. Bingo sorri apoiado na mesa ao lado de um tablet que mostra BINGO! com confetes.");
    root.textContent = "";

    const stage = node("div", "dr-scene__stage");
    stage.appendChild(img("01-cenario-vazio.png", "dr-scene__bg", 1672, 941));
    stage.appendChild(img("lustre.png", "dr-lamp", 1024, 1536));

    const tablet = node("div", "dr-tablet");
    tablet.appendChild(img("02-tablet-tela-limpa.png", "", 1672, 941));
    const screen = node("div", "dr-screen");
    screen.style.transform = quadMatrix(SCREEN.w, SCREEN.h, QUAD);
    const content = node("div", "dr-screen__content");
    const word = node("div", "dr-screen__word");
    WORD.forEach((ch, i) => {
      const s = node("span", "dr-letter dr-letter--" + i);
      s.textContent = ch;
      s.style.setProperty("--i", i);
      word.appendChild(s);
    });
    const confetti = node("div", "dr-screen__confetti");
    CONFETTI.forEach(([x, t, dx, rot, c, shape]) => {
      const p = node("i", "dr-confetti dr-confetti--c" + c + (shape === "c" ? " dr-confetti--round" : ""));
      p.style.cssText = `left:${x}%;animation-delay:${t}s;--dx:${dx}px;--rot:${rot}deg`;
      confetti.appendChild(p);
    });
    content.append(word, confetti);
    screen.appendChild(content);
    tablet.appendChild(screen);

    // Both character frames share one canvas (checked pixel by pixel: only the eyes differ), so the blink
    // overlay is clipped to the eyes and the eyebrow patch sits at its crop offset.
    const char = node("div", "dr-char");
    const body = node("div", "dr-char__body");
    body.append(
      img("03-dr-bingo-olhos-abertos.png", "", 1419, 1109),
      img("04-dr-bingo-piscando.png", "dr-char__blink", 1419, 1109)
    );
    char.appendChild(body);
    stage.appendChild(char);
    stage.appendChild(tablet); // after the character so the tablet sits in front of Dr. Bingo
    stage.appendChild(img("cafe.png", "dr-mug", 1374, 1145));
    root.appendChild(stage);

    const fit = () => {
      const w = root.clientWidth, h = root.clientHeight;
      if (!w || !h) return;
      const k = Math.max(w / STAGE.w, h / STAGE.h); // cover, anchored to the bottom so the table stays in view
      stage.style.transform = `translate(${(w - STAGE.w * k) / 2}px,${h - STAGE.h * k}px) scale(${k})`;
    };
    fit();
    const ro = window.ResizeObserver ? new ResizeObserver(fit) : null;
    if (ro) ro.observe(root); else window.addEventListener("resize", fit);

    // Pause off screen; every layer pauses together so the loop stays in sync
    const io = window.IntersectionObserver
      ? new IntersectionObserver(([e]) => root.classList.toggle("is-paused", !e.isIntersecting))
      : null;
    if (io) io.observe(root);

    return function () {
      if (ro) ro.disconnect(); else window.removeEventListener("resize", fit);
      if (io) io.disconnect();
      root.textContent = "";
      root.classList.remove("dr-scene", "is-paused");
    };
  };
})();
