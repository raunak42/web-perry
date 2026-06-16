"use client";

import { useEffect, useRef, useState } from "react";

type HeroLensingShaderProps = {
  src: string;
  placeholderSrc?: string;
  imageWidth: number;
  imageHeight: number;
  lensScale?: number;
  className?: string;
};

function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

const MAX_DEVICE_PIXEL_RATIO = 1.5;
const NEAR_VIEWPORT_ROOT_MARGIN = "1200px 0px";

function createShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
) {
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

function createProgram(
  gl: WebGLRenderingContext,
  vertexSource: string,
  fragmentSource: string,
) {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

  if (!vertexShader || !fragmentShader) return null;

  const program = gl.createProgram();
  if (!program) return null;

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  return program;
}

export default function HeroLensingShader({
  src,
  placeholderSrc,
  imageWidth,
  imageHeight,
  lensScale = 1,
  className,
}: HeroLensingShaderProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isImageReady, setIsImageReady] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (typeof IntersectionObserver === "undefined") {
      const frame = window.requestAnimationFrame(() => setShouldRender(true));
      return () => window.cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const nextShouldRender = entry?.isIntersecting ?? false;
        setShouldRender(nextShouldRender);
        if (!nextShouldRender) {
          setIsImageReady(false);
        }
      },
      { rootMargin: NEAR_VIEWPORT_ROOT_MARGIN },
    );

    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    if (!shouldRender) {
      canvas.width = 1;
      canvas.height = 1;
      return;
    }

    const gl = canvas.getContext("webgl", {
      antialias: false,
      alpha: true,
      premultipliedAlpha: true,
      depth: false,
      stencil: false,
      powerPreference: "low-power",
    });

    if (!gl) return;

    const vertexSource = `
      attribute vec2 aPosition;
      varying vec2 vUv;

      void main() {
        vUv = vec2((aPosition.x + 1.0) * 0.5, (aPosition.y + 1.0) * 0.5);
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `;

    const fragmentSource = `
      precision highp float;

      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform vec2 uImageResolution;
      uniform vec2 uMouse;
      uniform float uTime;
      uniform float uIntensity;
      uniform float uLensScale;

      varying vec2 vUv;

      vec2 coverUv(vec2 uv, vec2 canvas, vec2 image) {
        vec2 ratio = vec2(
          min((canvas.x / canvas.y) / (image.x / image.y), 1.0),
          min((canvas.y / canvas.x) / (image.y / image.x), 1.0)
        );
        return uv * ratio + (1.0 - ratio) * 0.5;
      }

      void main() {
        vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
        vec2 mouse = uMouse;

        float aspect = uResolution.x / uResolution.y;
        vec2 delta = uv - mouse;
        vec2 lensDelta = vec2(delta.x * aspect, delta.y);
        float dist = length(lensDelta);

        float radius = 0.19 * uLensScale;
        float envelope = smoothstep(radius, 0.0, dist) * uIntensity;
        float ringPosA = radius * 0.34;
        float ringPosB = radius * 0.67;

        float bandA = dist - ringPosA;
        float bandB = dist - ringPosB;
        float rippleFrequency = 62.0 / uLensScale;
        float rippleSpread = 24.0 / uLensScale;

        float rippleA = sin(bandA * rippleFrequency) * exp(-pow(bandA * rippleSpread, 2.0));
        float rippleB = sin(bandB * rippleFrequency) * exp(-pow(bandB * rippleSpread, 2.0));
        float ripple = (rippleA * 1.05 + rippleB * 0.9) * envelope;

        vec2 dir = lensDelta / max(dist, 0.0001);
        vec2 warp = dir * ripple * 0.038;
        warp.x /= aspect;

        float ringMix = min(abs(ripple) * 1.45, 1.0);
        vec2 uvR = uv - warp * (1.0 + ringMix * 0.07);
        vec2 uvG = uv - warp;
        vec2 uvB = uv - warp * (1.0 - ringMix * 0.07);

        vec2 texR = coverUv(uvR, uResolution, uImageResolution);
        vec2 texG = coverUv(uvG, uResolution, uImageResolution);
        vec2 texB = coverUv(uvB, uResolution, uImageResolution);

        float r = texture2D(uTexture, texR).r;
        float g = texture2D(uTexture, texG).g;
        float b = texture2D(uTexture, texB).b;

        vec3 color = vec3(r, g, b);

        gl_FragColor = vec4(color, 1.0);
      }
    `;

    const program = createProgram(gl, vertexSource, fragmentSource);
    if (!program) return;

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1, -1,
        1, -1,
        -1, 1,
        -1, 1,
        1, -1,
        1, 1,
      ]),
      gl.STATIC_DRAW,
    );

    const positionLocation = gl.getAttribLocation(program, "aPosition");
    const resolutionLocation = gl.getUniformLocation(program, "uResolution");
    const imageResolutionLocation = gl.getUniformLocation(program, "uImageResolution");
    const mouseLocation = gl.getUniformLocation(program, "uMouse");
    const timeLocation = gl.getUniformLocation(program, "uTime");
    const intensityLocation = gl.getUniformLocation(program, "uIntensity");
    const lensScaleLocation = gl.getUniformLocation(program, "uLensScale");
    const textureLocation = gl.getUniformLocation(program, "uTexture");

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const image = new window.Image();
    image.decoding = "async";

    const pointer = {
      x: 0.5,
      y: 0.45,
      targetX: 0.5,
      targetY: 0.45,
      intensity: 0,
      targetIntensity: 0,
      inside: false,
      lastMoveAt: 0,
    };

    let frame = 0;
    let isReady = false;
    let isDisposed = false;
    let animationFrame = 0;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(
        window.devicePixelRatio || 1,
        MAX_DEVICE_PIXEL_RATIO,
      );
      const desiredWidth = Math.max(1, rect.width * dpr);
      const desiredHeight = Math.max(1, rect.height * dpr);
      const desiredPixels = desiredWidth * desiredHeight;
      const maxPixels = Math.max(1, imageWidth * imageHeight);
      const pixelScale = Math.min(1, Math.sqrt(maxPixels / desiredPixels));

      canvas.width = Math.max(1, Math.round(desiredWidth * pixelScale));
      canvas.height = Math.max(1, Math.round(desiredHeight * pixelScale));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const draw = () => {
      if (pointer.inside) {
        const idleAge = performance.now() - pointer.lastMoveAt;
        const fadeDelay = 120;
        const fadeDuration = 850;

        if (idleAge <= fadeDelay) {
          pointer.targetIntensity = 1;
        } else {
          const t = Math.min((idleAge - fadeDelay) / fadeDuration, 1);
          const fade = 1 - (t * t * (3 - 2 * t));
          pointer.targetIntensity = fade;
        }
      } else {
        pointer.targetIntensity = 0;
      }

      pointer.x += (pointer.targetX - pointer.x) * 0.12;
      pointer.y += (pointer.targetY - pointer.y) * 0.12;
      pointer.intensity +=
        (pointer.targetIntensity - pointer.intensity) *
        (pointer.targetIntensity < pointer.intensity ? 0.03 : 0.08);

      if (isReady) {
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(program);

        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(textureLocation, 0);
        gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
        gl.uniform2f(imageResolutionLocation, imageWidth, imageHeight);
        gl.uniform2f(mouseLocation, pointer.x, pointer.y);
        gl.uniform1f(timeLocation, frame * 0.016);
        gl.uniform1f(intensityLocation, pointer.intensity);
        gl.uniform1f(lensScaleLocation, lensScale);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      frame += 1;
      animationFrame = window.requestAnimationFrame(draw);
    };

    const handleMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      const inside = x >= 0 && x <= 1 && y >= 0 && y <= 1;

      pointer.inside = inside;

      if (inside) {
        pointer.targetX = x;
        pointer.targetY = y;
        pointer.lastMoveAt = performance.now();
      }
    };

    const handleLeave = () => {
      pointer.inside = false;
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    image.onload = () => {
      if (isDisposed) return;

      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        image,
      );
      resize();
      isReady = true;
      setIsImageReady(true);
    };

    image.src = src;

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseleave", handleLeave);
    resize();
    animationFrame = window.requestAnimationFrame(draw);

    return () => {
      isDisposed = true;
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseleave", handleLeave);
      resizeObserver.disconnect();
      window.cancelAnimationFrame(animationFrame);
      gl.deleteTexture(texture);
      gl.deleteBuffer(positionBuffer);
      gl.deleteProgram(program);
      canvas.width = 1;
      canvas.height = 1;
    };
  }, [imageHeight, imageWidth, lensScale, shouldRender, src]);

  return (
    <div
      ref={containerRef}
      className={cn("relative shrink-0 max-w-none", className)}
      style={{
        aspectRatio: `${imageWidth} / ${imageHeight}`,
        backgroundColor: "#f7fbff",
        backgroundImage:
          !placeholderSrc && shouldRender && !isImageReady
            ? `url(${src})`
            : undefined,
        backgroundPosition: "center top",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
      }}
    >
      {placeholderSrc ? (
        <div
          aria-hidden="true"
          className="absolute inset-0 scale-[1.04] bg-cover bg-top bg-no-repeat blur-2xl transition-opacity duration-500"
          style={{
            backgroundImage: `url(${placeholderSrc})`,
            opacity: isImageReady ? 0 : 1,
          }}
        />
      ) : null}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full transition-opacity duration-500"
        style={{ opacity: isImageReady || !placeholderSrc ? 1 : 0 }}
      />
    </div>
  );
}
