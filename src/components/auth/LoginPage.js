"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, Key, User, AlertCircle, Tv2 } from 'lucide-react';

const AUTH_DOMAIN_SUFFIX = "@inventory.system";

// ─── WebGL Shader Background ───────────────────────────────────────────────

const SHADER_SOURCE = `#version 300 es
/*
 * Animated shader background — adapted from Matthias Hurrle (@atzedent)
 */
precision highp float;
out vec4 O;
uniform vec2 resolution;
uniform float time;
#define FC gl_FragCoord.xy
#define T time
#define R resolution
#define MN min(R.x,R.y)

float rnd(vec2 p) {
  p=fract(p*vec2(12.9898,78.233));
  p+=dot(p,p+34.56);
  return fract(p.x*p.y);
}
float noise(in vec2 p) {
  vec2 i=floor(p), f=fract(p), u=f*f*(3.-2.*f);
  float a=rnd(i), b=rnd(i+vec2(1,0)), c=rnd(i+vec2(0,1)), d=rnd(i+1.);
  return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
}
float fbm(vec2 p) {
  float t=.0, a=1.; mat2 m=mat2(1.,-.5,.2,1.2);
  for (int i=0; i<5; i++) { t+=a*noise(p); p*=2.*m; a*=.5; }
  return t;
}
float clouds(vec2 p) {
  float d=1., t=.0;
  for (float i=.0; i<3.; i++) {
    float a=d*fbm(i*10.+p.x*.2+.2*(1.+i)*p.y+d+i*i+p);
    t=mix(t,d,a); d=a; p*=2./(i+1.);
  }
  return t;
}
void main(void) {
  vec2 uv=(FC-.5*R)/MN, st=uv*vec2(2,1);
  vec3 col=vec3(0);
  float bg=clouds(vec2(st.x+T*.5,-st.y));
  uv*=1.-.3*(sin(T*.2)*.5+.5);
  for (float i=1.; i<12.; i++) {
    uv+=.1*cos(i*vec2(.1+.01*i, .8)+i*i+T*.5+.1*uv.x);
    vec2 p=uv;
    float d=length(p);
    col+=.00125/d*(cos(sin(i)*vec3(1,2,3))+1.);
    float b=noise(i+p+bg*1.731);
    col+=.002*b/length(max(p,vec2(b*p.x*.02,p.y)));
    col=mix(col,vec3(bg*.25,bg*.137,bg*.05),d);
  }
  O=vec4(col,1);
}`;

const VERTEX_SOURCE = `#version 300 es
precision highp float;
in vec4 position;
void main(){ gl_Position=position; }`;

function ShaderCanvas() {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const glRef     = useRef(null);
  const progRef   = useRef(null);
  const locsRef   = useRef({});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2');
    if (!gl) return;
    glRef.current = gl;

    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error('Shader error:', gl.getShaderInfoLog(s));
      }
      return s;
    };

    const vs = compile(gl.VERTEX_SHADER, VERTEX_SOURCE);
    const fs = compile(gl.FRAGMENT_SHADER, SHADER_SOURCE);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    progRef.current = prog;

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,1,-1,-1,1,1,1,-1]), gl.STATIC_DRAW);

    const pos = gl.getAttribLocation(prog, 'position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    locsRef.current = {
      resolution: gl.getUniformLocation(prog, 'resolution'),
      time:       gl.getUniformLocation(prog, 'time'),
    };

    const resize = () => {
      const dpr = Math.max(1, 0.5 * window.devicePixelRatio);
      canvas.width  = window.innerWidth  * dpr;
      canvas.height = window.innerHeight * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    const render = (now) => {
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(prog);
      gl.uniform2f(locsRef.current.resolution, canvas.width, canvas.height);
      gl.uniform1f(locsRef.current.time, now * 1e-3);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animRef.current = requestAnimationFrame(render);
    };
    animRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      if (animRef.current) cancelAnimationFrame(animRef.current);
      gl.deleteProgram(prog);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ display: 'block', background: '#000' }}
    />
  );
}

// ─── Login Page ────────────────────────────────────────────────────────────

const LoginPage = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const emailToUse = username.includes('@')
        ? username
        : `${username}${AUTH_DOMAIN_SUFFIX}`;
      const result = await login(emailToUse, password);
      // Log the login event to the system-wide log collection
      try {
        const { getIdToken } = await import('firebase/auth');
        const token = await getIdToken(result.user);
        await fetch('/api/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            logsCollection: 'systemLogs',
            action: 'User Login',
            details: `User signed in: ${emailToUse}`,
            user: emailToUse,
          }),
        });
      } catch (_) { /* non-critical */ }
    } catch (err) {
      console.error(err);
      setError('Invalid username or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black flex items-center justify-center lg:justify-between lg:px-20 xl:px-32">
      {/* ── Animated Shader Background ── */}
      <ShaderCanvas />

      {/* ── Dark overlay for readability ── */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

      {/* ── Left Hero Side (Desktop Only) ── */}
      <div className="hidden lg:flex flex-col max-w-xl z-10 text-left select-none pointer-events-none">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-[10px] font-bold text-orange-300 uppercase tracking-widest">Enterprise Inventory Portal</span>
          </div>

          <h2 className="text-5xl font-black text-white leading-tight tracking-tight">
            Seamless Asset <br />
            & Device Management
          </h2>
          
          <p className="text-white/60 text-base font-medium leading-relaxed max-w-md">
            Hiru TV's custom high-performance inventory tracking system. Keep track of hardware, licenses, and media gear with unified security and audit logging.
          </p>

          <div className="pt-4 flex items-center gap-6 text-white/30 text-xs font-bold uppercase tracking-wider">
            <div>
              <span className="block text-2xl font-extrabold text-orange-400">100%</span>
              Real-time Sync
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <span className="block text-2xl font-extrabold text-amber-400">QR-Ready</span>
              Instant Scans
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <span className="block text-2xl font-extrabold text-red-500">Secure</span>
              Role-Based Access
            </div>
          </div>

          {/* ── Yvexa Signature Tag ── */}
          <div className="pt-6 flex items-center gap-3 select-none pointer-events-auto">
            <span className="text-[10px] font-extrabold text-white/20 uppercase tracking-widest">Engineered & Powered by</span>
            <a 
              href="https://yvexa.dev" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group relative flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-500/5 hover:bg-orange-500/10 border border-white/5 hover:border-orange-500/20 transition-all duration-300 shadow-sm shadow-black/40"
            >
              {/* Subtle hover gradient backdrop */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-500/10 to-red-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <span className="relative text-xs font-black tracking-widest text-white/40 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-orange-400 group-hover:to-amber-300 transition-all duration-300">
                YVEXA
              </span>
              <span className="relative w-1.5 h-1.5 rounded-full bg-white/20 group-hover:bg-orange-500 transition-colors duration-300">
                <span className="absolute inset-0 rounded-full bg-orange-400 opacity-0 group-hover:opacity-100 group-hover:animate-ping" />
              </span>
            </a>
          </div>
        </motion.div>
      </div>

      {/* ── Login Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        animate={{ opacity: 1, y: 0,  scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-lg mx-4 lg:mx-0 lg:max-w-md xl:max-w-lg"
      >
        {/* Glow ring */}
        <div className="absolute -inset-px rounded-3xl bg-gradient-to-br from-orange-500/60 via-amber-400/30 to-red-600/40 blur-sm" />

        <div className="relative rounded-3xl bg-black/70 backdrop-blur-2xl border border-white/10 shadow-2xl px-8 py-10">

          {/* ── Brand Header ── */}
          <div className="flex flex-col items-center gap-3 mb-9">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.15 }}
              className="w-24 h-24 rounded-2xl flex items-center justify-center overflow-hidden shadow-lg shadow-orange-500/20 bg-white"
            >
              <img src="/logo.jpg" alt="Hiru TV Logo" className="w-full h-full object-cover" />
            </motion.div>


            <div className="text-center">
              <h1 className="text-2xl font-extrabold tracking-tight text-white">
                <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-red-400 bg-clip-text text-transparent">
                  Hiru TV
                </span>{' '}
                <span className="text-white/90">Inventory</span>
              </h1>
              <p className="text-sm text-white/50 mt-1 font-medium">Sign in to access the dashboard</p>
            </div>
          </div>

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-orange-300/80 flex items-center gap-1.5">
                <User size={13} /> Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/25 focus:outline-none focus:border-orange-400/70 focus:bg-white/8 transition-all duration-200 text-sm"
                placeholder="Enter your username"
                required
                autoComplete="username"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-orange-300/80 flex items-center gap-1.5">
                <Key size={13} /> Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/25 focus:outline-none focus:border-orange-400/70 focus:bg-white/8 transition-all duration-200 text-sm"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl text-sm"
                >
                  <AlertCircle size={16} className="shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100 shadow-lg shadow-orange-500/20"
              style={{
                background: isLoading
                  ? 'rgba(234,88,12,0.6)'
                  : 'linear-gradient(135deg, #e85d04 0%, #f48c06 60%, #dc2626 100%)',
              }}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={18} />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* ── Footer ── */}
          <div className="mt-8 text-center space-y-1">
            <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">
              Hiru TV IT Department
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
