/* ============================================================
   Vishal Baskar — portfolio interactions
   ============================================================ */
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const HAS_GSAP = typeof window.gsap !== "undefined";
if (HAS_GSAP && typeof window.ScrollTrigger !== "undefined") gsap.registerPlugin(ScrollTrigger);

/* ===== Preloader ===== */
(function () {
  const pre = document.getElementById("preloader");
  const fill = document.getElementById("preloaderFill");
  const pct = document.getElementById("preloaderPct");
  const status = document.getElementById("preloaderStatus");
  const msgs = ["initializing agent…", "loading tools…", "verifying outputs…", "ready."];
  let p = 0, mi = 0;
  const iv = setInterval(() => {
    p = Math.min(p + 6 + Math.random() * 16, 100);
    fill.style.width = p + "%";
    pct.textContent = Math.floor(p);
    if (mi < msgs.length - 1 && p > (mi + 1) * 28) status.textContent = msgs[++mi];
    if (p >= 100) {
      clearInterval(iv);
      status.textContent = msgs[msgs.length - 1];
      setTimeout(() => { pre.classList.add("done"); intro(); }, 320);
    }
  }, 140);
})();

/* ===== Hero intro (GSAP letter stagger) ===== */
let introDone = false;
function intro() {
  if (introDone) return;
  introDone = true;
  if (!HAS_GSAP || REDUCED) return;
  document.querySelectorAll("#heroName .line").forEach((line) => {
    const txt = line.textContent;
    line.textContent = "";
    [...txt].forEach((ch) => {
      const s = document.createElement("span");
      s.className = "char";
      s.textContent = ch === " " ? "\u00A0" : ch;
      line.appendChild(s);
    });
  });
  const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
  tl.from("#heroName .char", { yPercent: 120, rotate: 8, duration: 1.05, stagger: 0.04 }, 0.1)
    .from(".hero-kicker, .hero-role, .hero-tag, .hero-actions, .hero-meta", { y: 26, opacity: 0, duration: 0.9, stagger: 0.09 }, 0.55)
    .from("#avatarFrame", { y: 46, opacity: 0, scale: 0.93, duration: 1.15, ease: "power3.out" }, 0.45)
    .from(".avatar-hint", { opacity: 0, duration: 0.7 }, 1.2);
}

/* ===== Lenis smooth scroll + GSAP scroll effects ===== */
(function () {
  let lenis = null;
  if (typeof window.Lenis !== "undefined" && !REDUCED) {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    if (HAS_GSAP) {
      lenis.on("scroll", () => window.ScrollTrigger && ScrollTrigger.update());
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
    document.documentElement.style.scrollBehavior = "auto";
  }
  // anchor links
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length > 1 && document.querySelector(id)) {
        e.preventDefault();
        if (lenis) lenis.scrollTo(id, { offset: -70 });
        else document.querySelector(id).scrollIntoView({ behavior: "smooth" });
      }
    });
  });
  if (!HAS_GSAP || typeof window.ScrollTrigger === "undefined" || REDUCED) return;
  // avatar parallax on scroll
  gsap.to("#avatarFrame", {
    yPercent: 16, ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
  });
  // ghost typography parallax
  document.querySelectorAll(".ghost").forEach((g) => {
    gsap.fromTo(g, { xPercent: 10 }, {
      xPercent: -12, ease: "none",
      scrollTrigger: { trigger: g.parentElement, start: "top bottom", end: "bottom top", scrub: 1 },
    });
  });
})();

/* ===== WebGL living portrait (Three.js + custom shaders) ===== */
(function () {
  const frame = document.getElementById("avatarFrame");
  const canvas = document.getElementById("avatarCanvas");
  if (!frame || !canvas) return;
  try {
    if (typeof window.THREE === "undefined") throw new Error("three missing");
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 20);
    camera.position.z = 3.6;

    const group = new THREE.Group();
    scene.add(group);

    const uniforms = {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uHover: { value: 0 },
      uPulse: { value: 0 },
      uPulseTime: { value: 9 },
      uTex: { value: null },
    };

    const vert = `
      uniform float uTime; uniform vec2 uMouse; uniform float uHover;
      uniform float uPulse; uniform float uPulseTime;
      varying vec2 vUv;
      void main(){
        vUv = uv;
        vec3 p = position;
        float d = distance(uv, uMouse);
        float wave = sin(p.x*3.6 + uTime*1.5)*0.05 + sin(p.y*4.6 + uTime*1.1)*0.045;
        float bulge = smoothstep(0.55, 0.0, d) * 0.22 * (0.35 + uHover);
        float ripple = 0.0;
        if (uPulseTime < 2.5) {
          float r = uPulseTime * 1.1;
          ripple = sin((d - r) * 28.0) * exp(-abs(d - r) * 7.0) * exp(-uPulseTime * 2.2) * uPulse * 0.09;
        }
        p.z += wave + bulge + ripple;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`;

    const frag = `
      uniform sampler2D uTex; uniform float uTime; uniform vec2 uMouse; uniform float uHover;
      varying vec2 vUv;
      float sdRoundBox(vec2 p, vec2 b, float r){
        vec2 q = abs(p) - b + r;
        return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
      }
      void main(){
        float dBox = sdRoundBox(vUv - 0.5, vec2(0.485), 0.08);
        float alpha = 1.0 - smoothstep(-0.002, 0.002, dBox);
        if (alpha < 0.01) discard;

        vec2 toM = vUv - uMouse;
        float dist = length(toM);
        vec2 dir = dist > 0.0001 ? toM / dist : vec2(0.0);
        float ca = (0.0012 + uHover * 0.0045) * (0.4 + smoothstep(0.55, 0.0, dist) * 1.6);
        float r = texture2D(uTex, vUv + dir * ca).r;
        float g = texture2D(uTex, vUv).g;
        float b = texture2D(uTex, vUv - dir * ca).b;
        vec3 col = vec3(r, g, b);

        col *= 1.04;                                     // lift
        col = mix(col, col * vec3(0.94, 1.06, 1.04), 0.35); // teal grade
        float bandPos = fract(uTime * 0.07) * 1.7 - 0.35;
        float band = smoothstep(0.04, 0.0, abs((vUv.x + vUv.y) * 0.5 - bandPos));
        col += band * 0.09 * vec3(0.2, 0.96, 0.77);      // shine sweep
        col *= 1.0 - 0.28 * smoothstep(0.3, 0.75, distance(vUv, vec2(0.5))); // vignette

        float edge = 1.0 - smoothstep(0.0, 0.01, abs(dBox));
        vec3 accent = vec3(0.2, 0.96, 0.77);
        col = mix(col, accent, edge * (0.5 + 0.25 * sin(uTime * 2.4)));
        gl_FragColor = vec4(col, alpha);
      }`;

    new THREE.TextureLoader().load("assets/avatar.jpg", (tex) => {
      tex.encoding = THREE.sRGBEncoding;
      tex.minFilter = THREE.LinearFilter;
      uniforms.uTex.value = tex;
    });

    const photo = new THREE.Mesh(
      new THREE.PlaneGeometry(2.3, 2.3, 48, 48),
      new THREE.ShaderMaterial({ uniforms, vertexShader: vert, fragmentShader: frag, transparent: true })
    );
    group.add(photo);

    // orbit rings
    const ring1 = new THREE.Mesh(
      new THREE.TorusGeometry(1.62, 0.006, 8, 140),
      new THREE.MeshBasicMaterial({ color: 0x34f5c5, transparent: true, opacity: 0.4 })
    );
    ring1.rotation.x = Math.PI * 0.42;
    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(1.82, 0.004, 8, 140),
      new THREE.MeshBasicMaterial({ color: 0x7aa2ff, transparent: true, opacity: 0.28 })
    );
    ring2.rotation.x = Math.PI * 0.55;
    ring2.rotation.y = Math.PI * 0.15;
    group.add(ring1, ring2);

    // orbiting particles
    const N = 260;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const rad = 1.75 + Math.random() * 0.85;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = rad * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = rad * Math.sin(ph) * Math.sin(th);
      pos[i * 3 + 2] = rad * Math.cos(ph);
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const points = new THREE.Points(pGeo, new THREE.PointsMaterial({
      color: 0x7aa2ff, size: 0.02, transparent: true, opacity: 0.75,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    group.add(points);

    // interaction
    const target = { x: 0.5, y: 0.5, hover: 0 };
    frame.addEventListener("pointermove", (e) => {
      const r = frame.getBoundingClientRect();
      target.x = (e.clientX - r.left) / r.width;
      target.y = 1 - (e.clientY - r.top) / r.height;
      target.hover = 1;
    });
    frame.addEventListener("pointerleave", () => { target.hover = 0; });
    frame.addEventListener("pointerdown", () => { uniforms.uPulse.value = 1; uniforms.uPulseTime.value = 0; });

    function resize() {
      const w = frame.clientWidth, h = frame.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    new ResizeObserver(resize).observe(frame);
    resize();

    const clock = new THREE.Clock();
    (function tick() {
      const t = clock.getElapsedTime();
      const dt = Math.min(clock.getDelta() + 0.016, 0.05);
      uniforms.uTime.value = t;
      uniforms.uMouse.value.x += (target.x - uniforms.uMouse.value.x) * 0.08;
      uniforms.uMouse.value.y += (target.y - uniforms.uMouse.value.y) * 0.08;
      uniforms.uHover.value += (target.hover - uniforms.uHover.value) * 0.06;
      if (uniforms.uPulseTime.value < 3) uniforms.uPulseTime.value += dt;
      // idle float + look-at tilt
      group.rotation.y += ((uniforms.uMouse.value.x - 0.5) * 0.55 + Math.sin(t * 0.35) * 0.07 - group.rotation.y) * 0.06;
      group.rotation.x += ((0.5 - uniforms.uMouse.value.y) * 0.4 - group.rotation.x) * 0.06;
      group.position.y = Math.sin(t * 0.85) * 0.07;
      ring1.rotation.z = t * 0.25;
      ring2.rotation.z = -t * 0.18;
      points.rotation.y = t * 0.06;
      points.rotation.x = Math.sin(t * 0.2) * 0.12;
      renderer.render(scene, camera);
      requestAnimationFrame(tick);
    })();
    frame.classList.add("webgl-ok");
  } catch (err) {
    frame.classList.add("fallback"); // show plain photo
  }
})();

/* ===== Neural network background canvas ===== */
(function () {
  const canvas = document.getElementById("netCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let W, H, nodes = [];
  const mouse = { x: -9999, y: -9999 };
  const LINK = 130;
  function resize() {
    W = canvas.width = canvas.offsetWidth * devicePixelRatio;
    H = canvas.height = canvas.offsetHeight * devicePixelRatio;
    const count = Math.min(100, Math.floor((canvas.offsetWidth * canvas.offsetHeight) / 16000));
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35 * devicePixelRatio,
      vy: (Math.random() - 0.5) * 0.35 * devicePixelRatio,
      r: (Math.random() * 1.6 + 0.8) * devicePixelRatio,
    }));
  }
  function step() {
    ctx.clearRect(0, 0, W, H);
    for (const n of nodes) {
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > W) n.vx *= -1;
      if (n.y < 0 || n.y > H) n.vy *= -1;
      const dx = mouse.x - n.x, dy = mouse.y - n.y;
      if (dx * dx + dy * dy < 200 * 200 * devicePixelRatio * devicePixelRatio) { n.x += dx * 0.0006; n.y += dy * 0.0006; }
    }
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < LINK * devicePixelRatio) {
        ctx.strokeStyle = `rgba(52,245,${(168 * (1 - d / (LINK * devicePixelRatio))).toFixed(3)})`.replace("168", "197");
        ctx.globalAlpha = (1 - d / (LINK * devicePixelRatio)) * 0.35;
        ctx.lineWidth = devicePixelRatio * 0.6;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    for (const n of nodes) {
      ctx.fillStyle = "rgba(122,162,255,0.85)";
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
    }
    requestAnimationFrame(step);
  }
  window.addEventListener("resize", resize);
  canvas.parentElement.addEventListener("mousemove", (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) * devicePixelRatio;
    mouse.y = (e.clientY - r.top) * devicePixelRatio;
  });
  canvas.parentElement.addEventListener("mouseleave", () => { mouse.x = mouse.y = -9999; });
  resize(); step();
})();

/* ===== Typewriter ===== */
(function () {
  const el = document.getElementById("typewriter");
  if (!el) return;
  const roles = ["AI Engineer", "Agentic Systems Builder", "LangGraph · GraphRAG · MCP", "FastAPI Backend Developer", "Reliability-First Problem Solver"];
  let ri = 0, ci = 0, del = false;
  (function tick() {
    const w = roles[ri];
    el.textContent = w.slice(0, ci);
    let d = del ? 32 : 62;
    if (!del && ci === w.length) { d = 1700; del = true; }
    else if (del && ci === 0) { del = false; ri = (ri + 1) % roles.length; d = 350; }
    ci += del ? -1 : 1;
    setTimeout(tick, d);
  })();
})();

/* ===== Marquees: duplicate for seamless loop ===== */
["marqueeTrack", "footerTrack"].forEach((id) => {
  const t = document.getElementById(id);
  if (t) t.innerHTML += t.innerHTML;
});

/* ===== Scroll progress bar ===== */
(function () {
  const bar = document.getElementById("progressBar");
  addEventListener("scroll", () => {
    const h = document.documentElement;
    bar.style.width = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100 + "%";
  }, { passive: true });
})();

/* ===== Nav ===== */
(function () {
  const nav = document.getElementById("nav");
  const toggle = document.getElementById("navToggle");
  const links = document.getElementById("navLinks");
  addEventListener("scroll", () => nav.classList.toggle("scrolled", scrollY > 24), { passive: true });
  toggle.addEventListener("click", () => links.classList.toggle("open"));
  links.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => links.classList.remove("open")));
  const sections = [...document.querySelectorAll("section[id]")];
  const navLinks = [...document.querySelectorAll(".nav-link")];
  const obs = new IntersectionObserver((es) => es.forEach((en) => {
    if (en.isIntersecting) navLinks.forEach((l) => l.classList.toggle("active", l.getAttribute("href") === "#" + en.target.id));
  }), { rootMargin: "-40% 0px -55% 0px" });
  sections.forEach((s) => obs.observe(s));
})();

/* ===== Reveal on scroll (staggered) ===== */
(function () {
  const els = document.querySelectorAll(".reveal");
  const grids = new Map();
  els.forEach((el) => {
    const par = el.parentElement;
    if (!grids.has(par)) grids.set(par, 0);
    el.style.transitionDelay = grids.get(par) * 90 + "ms";
    grids.set(par, grids.get(par) + 1);
  });
  const obs = new IntersectionObserver((es) => es.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add("visible"); obs.unobserve(en.target); }
  }), { threshold: 0.12 });
  els.forEach((el) => obs.observe(el));
})();

/* ===== Animated counters ===== */
(function () {
  const nums = document.querySelectorAll(".stat-num");
  const obs = new IntersectionObserver((es) => es.forEach((en) => {
    if (!en.isIntersecting) return;
    obs.unobserve(en.target);
    const target = +en.target.dataset.count, suffix = en.target.dataset.suffix || "";
    const dur = 1200, t0 = performance.now();
    (function frame(t) {
      const p = Math.min((t - t0) / dur, 1);
      en.target.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))) + suffix;
      if (p < 1) requestAnimationFrame(frame);
    })(t0);
  }), { threshold: 0.6 });
  nums.forEach((n) => obs.observe(n));
})();

/* ===== Cursor glow + dot (grows over interactive elements) ===== */
(function () {
  const glow = document.getElementById("cursorGlow");
  const dot = document.getElementById("cursorDot");
  let gx = innerWidth / 2, gy = innerHeight / 2, tx = gx, ty = gy;
  addEventListener("mousemove", (e) => { tx = e.clientX; ty = e.clientY; });
  (function loop() {
    gx += (tx - gx) * 0.08; gy += (ty - gy) * 0.08;
    glow.style.left = gx + "px"; glow.style.top = gy + "px";
    dot.style.left = tx + "px"; dot.style.top = ty + "px";
    requestAnimationFrame(loop);
  })();
  document.querySelectorAll("a, button, .tags span, .work").forEach((el) => {
    el.addEventListener("mouseenter", () => dot.classList.add("hovering"));
    el.addEventListener("mouseleave", () => dot.classList.remove("hovering"));
  });
})();

/* ===== Magnetic buttons ===== */
(function () {
  if (matchMedia("(hover:none)").matches) return;
  document.querySelectorAll(".magnetic").forEach((el) => {
    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect();
      el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px, ${(e.clientY - r.top - r.height / 2) * 0.3}px)`;
    });
    el.addEventListener("mouseleave", () => { el.style.transform = ""; });
  });
})();

/* ===== 3D tilt on project cards ===== */
(function () {
  if (matchMedia("(hover:none)").matches) return;
  document.querySelectorAll("[data-tilt]").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const r = card.getBoundingClientRect();
      const rx = ((e.clientY - r.top) / r.height - 0.5) * -4;
      const ry = ((e.clientX - r.left) / r.width - 0.5) * 5;
      card.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
    });
    card.addEventListener("mouseleave", () => { card.style.transform = ""; });
  });
})();

/* ===== Skill card spotlight ===== */
document.querySelectorAll(".skill-card").forEach((card) => {
  card.addEventListener("mousemove", (e) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", e.clientX - r.left + "px");
    card.style.setProperty("--my", e.clientY - r.top + "px");
  });
});
