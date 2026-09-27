"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const mouseRef = useRef({ x: 0, y: 0 });
  const targetMouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl");
    if (!gl) return;

    const resize = () => {
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    resize();
    window.addEventListener("resize", resize);

    const vertexShaderSource = `
      attribute vec3 aPosition;
      attribute vec3 aColor;
      uniform mat4 uProjection;
      uniform mat4 uView;
      uniform mat4 uModel;
      uniform float uTime;
      varying vec3 vColor;
      varying float vDepth;
      void main() {
        vec3 pos = aPosition;
        float dist = length(pos);
        float wave = sin(dist * 8.0 - uTime * 2.0) * 0.02 * dist;
        pos += normalize(pos) * wave;
        vec4 worldPos = uModel * vec4(pos, 1.0);
        vec4 viewPos = uView * worldPos;
        vColor = aColor;
        vDepth = viewPos.z;
        gl_Position = uProjection * viewPos;
        gl_PointSize = max(1.0, 4.0 * (1.0 / -viewPos.z) * 100.0);
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;
      varying vec3 vColor;
      varying float vDepth;
      void main() {
        vec2 center = gl_PointCoord - 0.5;
        float dist = length(center);
        if (dist > 0.5) discard;
        float alpha = smoothstep(0.5, 0.0, dist);
        vec3 color = vColor * (1.0 + vDepth * 0.001);
        gl_FragColor = vec4(color, alpha * 0.8);
      }
    `;

    function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    function createProgram(gl: WebGLRenderingContext, vs: WebGLShader, fs: WebGLShader): WebGLProgram | null {
      const program = gl.createProgram();
      if (!program) return null;
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
        return null;
      }
      return program;
    }

    const vs = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vs || !fs) return;
    const program = createProgram(gl, vs, fs);
    if (!program) return;

    const aPosition = gl.getAttribLocation(program, "aPosition");
    const aColor = gl.getAttribLocation(program, "aColor");
    const uProjection = gl.getUniformLocation(program, "uProjection");
    const uView = gl.getUniformLocation(program, "uView");
    const uModel = gl.getUniformLocation(program, "uModel");
    const uTime = gl.getUniformLocation(program, "uTime");

    const particles = 8000;
    const positions = new Float32Array(particles * 3);
    const colors = new Float32Array(particles * 3);

    for (let i = 0; i < particles; i++) {
      const radius = Math.pow(Math.random(), 0.5) * 2.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const layer = Math.floor(Math.random() * 3);
      if (layer === 0) {
        colors[i * 3] = 0.39;
        colors[i * 3 + 1] = 0.85;
        colors[i * 3 + 2] = 0.69;
      } else if (layer === 1) {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.72;
        colors[i * 3 + 2] = 0.42;
      } else {
        colors[i * 3] = 0.78;
        colors[i * 3 + 1] = 0.59;
        colors[i * 3 + 2] = 1.0;
      }
    }

    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0.02, 0.03, 0.05, 1.0);

    let time = 0;
    let currentRotationX = 0;
    let currentRotationY = 0;

    const animate = () => {
      time += 0.016;

      currentRotationX += (targetMouseRef.current.y - currentRotationX) * 0.05;
      currentRotationY += (targetMouseRef.current.x - currentRotationY) * 0.05;

      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      gl.useProgram(program);

      const aspect = canvas.width / canvas.height;
      const fov = Math.PI / 4;
      const near = 0.1;
      const far = 100.0;
      const f = 1.0 / Math.tan(fov / 2);
      const projection = new Float32Array([
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (far + near) / (near - far), -1,
        0, 0, (2 * far * near) / (near - far), 0
      ]);
      gl.uniformMatrix4fv(uProjection, false, projection);

      const view = new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, -8, 1
      ]);
      gl.uniformMatrix4fv(uView, false, view);

      const cosX = Math.cos(currentRotationX * 0.5);
      const sinX = Math.sin(currentRotationX * 0.5);
      const cosY = Math.cos(currentRotationY * 0.5);
      const sinY = Math.sin(currentRotationY * 0.5);
      const cosT = Math.cos(time * 0.3);
      const sinT = Math.sin(time * 0.3);

      const model = new Float32Array([
        cosY * cosT + sinY * sinX * sinT, cosY * sinT - sinY * sinX * cosT, -sinY * cosX, 0,
        cosX * sinT, cosX * cosT, sinX, 0,
        sinY * cosT - cosY * sinX * sinT, sinY * sinT + cosY * sinX * cosT, cosY * cosX, 0,
        0, 0, 0, 1
      ]);
      gl.uniformMatrix4fv(uModel, false, model);
      gl.uniform1f(uTime, time);

      gl.enableVertexAttribArray(aPosition);
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
      gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);

      gl.enableVertexAttribArray(aColor);
      gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
      gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 0, 0);

      gl.drawArrays(gl.POINTS, 0, particles);

      animationRef.current = requestAnimationFrame(animate);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      targetMouseRef.current.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      targetMouseRef.current.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    animate();

    return () => {
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      gl.deleteProgram(program);
      gl.deleteBuffer(posBuffer);
      gl.deleteBuffer(colorBuffer);
    };
  }, []);

  return (
    <main className="home">
      <canvas ref={canvasRef} className="home-canvas" />
      <div className="grid" />
      <div className="glow glow-a" />
      <div className="glow glow-b" />

      <nav>
        <div>
          <div className="brand">GHOSTMIND</div>
          <div className="mini">
            ADAPTIVE AI EXPERIENCE
          </div>
        </div>

        <div className="online">
          <span />
          NOVA ONLINE
        </div>
      </nav>

      <section className="hero">
        <h1>
          THE WORLD
          <br />
          <span>REMEMBERS.</span>
        </h1>

        <p>
          An adaptive AI narrative game where every
          decision becomes memory, every memory changes
          the world, and every playthrough can end
          differently.
        </p>

        <div className="actions">
          <Link
            href="/game"
            className="enter"
          >
            ENTER THE WORLD
            <b>→</b>
          </Link>
        </div>
      </section>

      <section className="features">
        {[
          [
            "01",
            "ADAPTIVE NOVA",
            "Dialogue evolves with your choices and relationship.",
          ],
          [
            "02",
            "LIVING QUESTS",
            "AI-generated objectives connect dialogue to real world actions.",
          ],
          [
            "03",
            "MULTIPLE ENDINGS",
            "Your path through the facility determines how the story ends.",
          ],
        ].map(([number, title, description]) => (
          <article key={number}>
            <span>{number}</span>

            <h2>{title}</h2>

            <p>{description}</p>
          </article>
        ))}
      </section>

      <footer>
        GHOSTMIND // AI + GAMES
      </footer>

      <style>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background: #05070d;
        }

        .home {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
          background: #05070d;
          color: #eff1ff;
          font-family: Inter, Arial, sans-serif;
          padding: 0 7vw 30px;
        }

        .home-canvas {
          position: fixed;
          inset: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
          pointer-events: none;
        }

        .grid {
          position: fixed;
          inset: 0;
          opacity: 0.15;
          background-image:
            linear-gradient(
              rgba(125, 140, 255, 0.06) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(125, 140, 255, 0.06) 1px,
              transparent 1px
            );
          background-size: 60px 60px;
          mask-image: linear-gradient(
            to bottom,
            black,
            transparent 70%
          );
          z-index: 1;
        }

        .glow {
          position: fixed;
          border-radius: 50%;
          filter: blur(120px);
          pointer-events: none;
          opacity: 0.15;
          z-index: 1;
        }

        .glow-a {
          width: 500px;
          height: 500px;
          top: -200px;
          left: 30%;
          background: #6171ff;
        }

        .glow-b {
          width: 400px;
          height: 400px;
          right: -150px;
          top: 35%;
          background: #8a64ff;
        }

        nav {
          position: relative;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 82px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.07);
        }

        .brand {
          font-size: 18px;
          font-weight: 950;
          letter-spacing: 0.18em;
        }

        .mini {
          margin-top: 4px;
          color: #66708e;
          font-size: 8px;
          font-weight: 850;
          letter-spacing: 0.2em;
        }

        .online {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #aeb7d2;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.12em;
        }

        .online span {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #63f5c2;
          box-shadow:
            0 0 14px rgba(99, 245, 194, 0.9);
        }

        .hero {
          position: relative;
          z-index: 10;
          padding: clamp(90px, 16vh, 170px) 0 110px;
          max-width: 950px;
        }

        h1 {
          margin: 18px 0 20px;
          font-size: clamp(56px, 10vw, 124px);
          line-height: 0.88;
          letter-spacing: -0.04em;
        }

        h1 span {
          color: #7f8cff;
        }

        .hero p {
          max-width: 690px;
          color: #7e88a6;
          font-size: clamp(14px, 1.7vw, 17px);
          line-height: 1.7;
        }

        .actions {
          margin-top: 32px;
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .enter {
          display: inline-flex;
          align-items: center;
          gap: 24px;
          padding: 14px 18px;
          border-radius: 8px;
          color: #f4f5ff;
          text-decoration: none;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.15em;
          background:
            linear-gradient(
              135deg,
              #5d6cff,
              #8a75ff
            );
          box-shadow:
            0 16px 40px
            rgba(91, 105, 255, 0.18);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .enter:hover {
          transform: translateY(-2px);
          box-shadow: 0 24px 50px rgba(91, 105, 255, 0.25);
        }

        .enter b {
          font-size: 16px;
        }

        .features {
          position: relative;
          z-index: 10;
          display: grid;
          grid-template-columns:
            repeat(3, 1fr);
          gap: 14px;
        }

        article {
          padding: 19px;
          border:
            1px solid
            rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          background:
            rgba(12, 16, 28, 0.65);
          backdrop-filter: blur(10px);
          transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
        }

        article:hover {
          transform: translateY(-4px);
          border-color: rgba(110, 125, 255, 0.3);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }

        article span {
          color: #5e6cff;
          font-size: 9px;
          font-weight: 900;
        }

        article h2 {
          margin: 10px 0 7px;
          font-size: 12px;
          letter-spacing: 0.1em;
        }

        article p {
          margin: 0;
          color: #68718d;
          font-size: 10px;
          line-height: 1.55;
        }

        footer {
          position: relative;
          z-index: 10;
          padding-top: 26px;
          color: #3f4862;
          font-size: 8px;
          font-weight: 850;
          letter-spacing: 0.16em;
        }

        @media (max-width: 760px) {
          .home {
            padding: 0 18px 24px;
          }

          .features {
            grid-template-columns: 1fr;
          }

          .hero {
            padding-top: 90px;
          }

          nav {
            height: 72px;
          }
        }
      `}</style>
    </main>
  );
}