/* ============================================================
   Traînée de souris « halftone » (WebGL) — port vanilla
   d'après un composant 21st.dev (HalftoneTrail).
   Expose : window.HalftoneTrail.init(container, options) -> { destroy }
   ============================================================ */
(function () {
  'use strict';

  const VERT = `
    attribute vec2 position;
    varying vec2 vUv;
    void main() { vUv = position * 0.5 + 0.5; gl_Position = vec4(position, 0.0, 1.0); }
  `;

  const TRAIL_FRAG = `
    precision mediump float;
    uniform sampler2D uPrevTrail;
    uniform vec2 uMouse; uniform vec2 uMouseDir;
    uniform float uVelocity; uniform float uDecay;
    uniform float uBrushSize; uniform float uAspect; uniform float uReveal;
    varying vec2 vUv;
    void main() {
      float prev = texture2D(uPrevTrail, vUv).r * uDecay;
      vec2 delta = vUv - uMouse; delta.x *= uAspect;
      vec2 dir = length(uMouseDir) > 0.001 ? uMouseDir : vec2(0.0, 1.0);
      float along = dot(delta, dir);
      float perp = length(delta - along * dir);
      float elongation = 1.0 + uVelocity * 2.0;
      float blobDist = sqrt(along * along / elongation + perp * perp);
      float blob = exp(-blobDist * blobDist / (uBrushSize * uBrushSize)) * uReveal;
      gl_FragColor = vec4(min(prev + blob, 1.0), 0.0, 0.0, 1.0);
    }
  `;

  const HALFTONE_FRAG = `
    #extension GL_OES_standard_derivatives : enable
    precision highp float;
    uniform sampler2D uTrailTexture;
    uniform vec2 uResolution; uniform float uCellSize;
    uniform vec3 uColor; uniform float uOpacity;
    varying vec2 vUv;
    void main() {
      vec2 pixel = vUv * uResolution;
      vec2 cellCoord = floor(pixel / uCellSize);
      vec2 cellCenter = (cellCoord + 0.5) * uCellSize;
      vec2 cellCenterUv = cellCenter / uResolution;
      float density = texture2D(uTrailTexture, cellCenterUv).r;
      float dist = length(fract(pixel / uCellSize) - 0.5);
      float radius = density * 0.47;
      float aa = fwidth(dist);
      float inDot = 1.0 - smoothstep(radius - aa, radius, dist);
      float alpha = inDot * smoothstep(0.05, 0.2, density);
      gl_FragColor = vec4(uColor, alpha * uOpacity);
    }
  `;

  const lerp = (a, b, t) => a + (b - a) * t;

  function compile(gl, src, type) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(s)); gl.deleteShader(s); return null; }
    return s;
  }
  function link(gl, vs, fs) {
    const v = compile(gl, vs, gl.VERTEX_SHADER), f = compile(gl, fs, gl.FRAGMENT_SHADER);
    if (!v || !f) return null;
    const p = gl.createProgram();
    gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.error(gl.getProgramInfoLog(p)); gl.deleteProgram(p); return null; }
    return p;
  }
  function createFBO(gl, w, h) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    return { fb, texture };
  }

  const probe = document.createElement('canvas').getContext('2d');
  function resolveColor(str) {
    if (!probe) return [0.5, 0.5, 0.5];
    probe.fillStyle = '#000'; probe.fillStyle = str;
    probe.fillRect(0, 0, 1, 1);
    const d = probe.getImageData(0, 0, 1, 1).data;
    return [d[0] / 255, d[1] / 255, d[2] / 255];
  }

  class Engine {
    constructor(canvas, cfg) {
      this.cfg = cfg;
      this.curBrush = cfg.brushSize; this.curOpacity = cfg.opacity;
      this.width = 0; this.height = 0;
      this.mx = 0.5; this.my = 0.5; this.px = 0.5; this.py = 0.5;
      this.dx = 0; this.dy = 1; this.vel = 0; this.hovering = false; this.reveal = 0;
      this.color = [0.5, 0.5, 0.5]; this.rafId = 0;

      const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false });
      if (!gl) throw new Error('WebGL unavailable');
      this.gl = gl;
      gl.getExtension('OES_standard_derivatives');

      this.trailP = link(gl, VERT, TRAIL_FRAG);
      this.halftoneP = link(gl, VERT, HALFTONE_FRAG);
      if (!this.trailP || !this.halftoneP) throw new Error('shader fail');

      this.tPos = gl.getAttribLocation(this.trailP, 'position');
      this.tPrev = gl.getUniformLocation(this.trailP, 'uPrevTrail');
      this.tMouse = gl.getUniformLocation(this.trailP, 'uMouse');
      this.tDir = gl.getUniformLocation(this.trailP, 'uMouseDir');
      this.tVel = gl.getUniformLocation(this.trailP, 'uVelocity');
      this.tDecay = gl.getUniformLocation(this.trailP, 'uDecay');
      this.tBrush = gl.getUniformLocation(this.trailP, 'uBrushSize');
      this.tAspect = gl.getUniformLocation(this.trailP, 'uAspect');
      this.tReveal = gl.getUniformLocation(this.trailP, 'uReveal');

      this.hPos = gl.getAttribLocation(this.halftoneP, 'position');
      this.hTrail = gl.getUniformLocation(this.halftoneP, 'uTrailTexture');
      this.hRes = gl.getUniformLocation(this.halftoneP, 'uResolution');
      this.hCell = gl.getUniformLocation(this.halftoneP, 'uCellSize');
      this.hColor = gl.getUniformLocation(this.halftoneP, 'uColor');
      this.hOpacity = gl.getUniformLocation(this.halftoneP, 'uOpacity');

      this.fboA = createFBO(gl, 512, 512);
      this.fboB = createFBO(gl, 512, 512);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboA.fb); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboB.fb); gl.clear(gl.COLOR_BUFFER_BIT);

      this.buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

      this.tick = this.tick.bind(this);
      this.rafId = requestAnimationFrame(this.tick);
    }
    setColor(rgb) { this.color = rgb; }
    resize(w, h) { this.width = w; this.height = h; }
    updatePointer(cx, cy, rect) {
      this.px = this.mx; this.py = this.my;
      this.mx = (cx - rect.left) / this.width;
      this.my = 1 - (cy - rect.top) / this.height;
      const aspect = this.width / this.height || 1;
      const dx = (this.mx - this.px) * aspect, dy = this.my - this.py;
      const dist = Math.sqrt(dx * dx + dy * dy);
      this.vel = Math.min(this.cfg.speedScale * dist, 1);
      if (dist > 1e-4) { this.dx = dx / dist; this.dy = dy / dist; }
      if (this.cfg.hoverSelector) {
        const el = document.elementFromPoint(cx, cy);
        this.hovering = !!(el && el.closest(this.cfg.hoverSelector));
      }
    }
    tick() {
      const gl = this.gl, dpr = Math.min(window.devicePixelRatio, 2);
      this.reveal = lerp(this.reveal, 1, 0.04);
      this.curBrush = lerp(this.curBrush, this.hovering ? this.cfg.hoverBrushSize : this.cfg.brushSize, 0.08);
      this.curOpacity = lerp(this.curOpacity, this.hovering ? this.cfg.hoverOpacity : this.cfg.opacity, 0.08);
      this.vel *= 0.9;

      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboB.fb);
      gl.viewport(0, 0, 512, 512);
      gl.useProgram(this.trailP);
      gl.enableVertexAttribArray(this.tPos);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
      gl.vertexAttribPointer(this.tPos, 2, gl.FLOAT, false, 0, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.fboA.texture);
      gl.uniform1i(this.tPrev, 0);
      gl.uniform2f(this.tMouse, this.mx, this.my);
      gl.uniform2f(this.tDir, this.dx, this.dy);
      gl.uniform1f(this.tVel, this.vel);
      gl.uniform1f(this.tDecay, this.cfg.decay);
      gl.uniform1f(this.tBrush, this.curBrush);
      gl.uniform1f(this.tAspect, this.width / this.height || 1);
      gl.uniform1f(this.tReveal, this.reveal);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      const tmp = this.fboA; this.fboA = this.fboB; this.fboB = tmp;

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, this.width * dpr, this.height * dpr);
      gl.useProgram(this.halftoneP);
      gl.enableVertexAttribArray(this.hPos);
      gl.vertexAttribPointer(this.hPos, 2, gl.FLOAT, false, 0, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.fboA.texture);
      gl.uniform1i(this.hTrail, 0);
      gl.uniform2f(this.hRes, this.width * dpr, this.height * dpr);
      gl.uniform1f(this.hCell, this.cfg.cellSize);
      gl.uniform3f(this.hColor, this.color[0], this.color[1], this.color[2]);
      gl.uniform1f(this.hOpacity, this.curOpacity);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      this.rafId = requestAnimationFrame(this.tick);
    }
    destroy() {
      cancelAnimationFrame(this.rafId);
      const gl = this.gl;
      gl.deleteFramebuffer(this.fboA.fb); gl.deleteFramebuffer(this.fboB.fb);
      gl.deleteTexture(this.fboA.texture); gl.deleteTexture(this.fboB.texture);
      gl.deleteBuffer(this.buf); gl.deleteProgram(this.trailP); gl.deleteProgram(this.halftoneP);
    }
  }

  function init(container, options) {
    const canvas = container.querySelector('canvas');
    if (!canvas) return null;
    const cfg = Object.assign({
      cellSize: 9, color: '#ffffff', decay: 0.97,
      brushSize: 0.04, hoverBrushSize: 0.012,
      opacity: 1.0, hoverOpacity: 0.2, speedScale: 35.0,
      hoverSelector: 'a, button, [data-hover]',
    }, options || {});

    let engine;
    try { engine = new Engine(canvas, cfg); }
    catch (e) { return null; }
    engine.setColor(resolveColor(cfg.color));

    const onMove = (e) => engine.updatePointer(e.clientX, e.clientY, container.getBoundingClientRect());
    window.addEventListener('pointermove', onMove, { passive: true });

    const ro = new ResizeObserver((entries) => {
      const { width: w, height: h } = entries[0].contentRect;
      if (w <= 0 || h <= 0) return;
      engine.resize(w, h);
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = w * dpr; canvas.height = h * dpr;
    });
    ro.observe(container);

    return {
      destroy() { engine.destroy(); window.removeEventListener('pointermove', onMove); ro.disconnect(); },
      setColor(c) { engine.setColor(resolveColor(c)); },
    };
  }

  window.HalftoneTrail = { init };
})();
