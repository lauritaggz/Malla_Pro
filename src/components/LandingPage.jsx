import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutGrid, NotebookText, BarChart3 } from "lucide-react";

export default function LandingPage() {
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  // ===========================
  // 🎨 FONDO ANIMADO
  // ===========================
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const nodes = [];
    const nodeCount = 60;
    const maxDistance = 140;

    class Node {
      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.radius = Math.random() * 2 + 1;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(139, 92, 246, 0.7)";
        ctx.fill();
      }
    }

    for (let i = 0; i < nodeCount; i++) nodes.push(new Node());

    function animate() {
      ctx.clearRect(0, 0, width, height);

      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "#0f172a");
      gradient.addColorStop(0.5, "#1e1b4b");
      gradient.addColorStop(1, "#0f172a");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      nodes.forEach((node) => {
        node.update();
        node.draw();
      });

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < maxDistance) {
            const opacity = (1 - distance / maxDistance) * 0.35;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(96, 165, 250, ${opacity})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      requestAnimationFrame(animate);
    }

    animate();

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
    };
  }, []);

  // ===========================
  // RENDER PRINCIPAL
  // ===========================
  return (
    <div className="relative min-h-screen overflow-x-hidden overflow-y-auto text-white">
      {/* FONDO ANIMADO */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full -z-10 pointer-events-none"
      />

      {/* =========================== */}
      {/*            HERO             */}
      {/* =========================== */}
      <section className="min-h-screen flex items-center justify-center text-center px-6 fade-in">
        <div className="max-w-5xl">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 gradient-text">
            Control académico<br/>basado en datos.
          </h1>

          <p className="text-xl md:text-2xl text-gray-300 mb-12 font-light leading-relaxed">
            Dile adiós a las páginas externas de cálculo. Malla Pro automatiza tus promedios, estima qué nota exacta necesitas para salvar el ramo y visualiza tu avance integral con precisión matemática.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <button
              onClick={() => navigate("/app")}
              className="btn-primary px-8 py-4 rounded-full text-lg font-semibold"
            >
              Empezar ahora
            </button>

            <a
              href="#why"
              className="btn-secondary px-8 py-4 rounded-full text-lg font-semibold"
            >
              Ver más
            </a>
          </div>
        </div>
      </section>

      {/* =========================== */}
      {/*       ¿POR QUÉ MALLA PRO?   */}
      {/* =========================== */}
      <section id="why" className="py-24 px-6 fade-in">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 gradient-text">
            ¿Por qué Malla Pro?
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {/* 1 */}
            <div className="glass p-8 rounded-2xl card-hover">
              <div className="w-16 h-16 mb-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <LayoutGrid className="w-10 h-10 text-white" strokeWidth={2} />
              </div>

              <h3 className="text-2xl font-semibold mb-4">
                Cálculo Automático
              </h3>
              <p className="text-gray-300">
                El sistema detecta tus porcentajes y calcula automáticamente la nota que necesitas en tu próximo control para asegurar tu 4.0. ¡Todo en un solo lugar!
              </p>
            </div>

            {/* 2 */}
            <div className="glass p-8 rounded-2xl card-hover">
              <div className="w-16 h-16 mb-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                <NotebookText
                  className="w-10 h-10 text-white"
                  strokeWidth={2}
                />
              </div>

              <h3 className="text-2xl font-semibold mb-4">
                Registro Histórico
              </h3>
              <p className="text-gray-300">
                Llevar el registro de tus notas es vital. Observa tu evolución, pondera evaluaciones complejas y jamás pierdas el hilo de tu rendimiento académico real.
              </p>
            </div>

            {/* 3 */}
            <div className="glass p-8 rounded-2xl card-hover">
              <div className="w-16 h-16 mb-6 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center">
                <BarChart3 className="w-10 h-10 text-white" strokeWidth={2} />
              </div>

              <h3 className="text-2xl font-semibold mb-4">Datos Duros</h3>
              <p className="text-gray-300">
                Toma decisiones estratégicas. Basado 100% en métricas: suma de SCT completados, progreso de titulación exacto e históricos de aprobación.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================== */}
      {/*    PROGRESO & DASHBOARD     */}
      {/* =========================== */}
      <section className="py-24 px-6 bg-gradient-to-b from-transparent via-purple-900/10 to-transparent fade-in">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 gradient-text">
            Tu progreso en tiempo real
          </h2>

          <div className="glass rounded-3xl p-10 glow-pulse">
            <div className="grid md:grid-cols-3 gap-10">
              {/* Progress Circle */}
              <div className="flex flex-col items-center">
                <div className="relative w-40 h-40">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="8"
                      fill="none"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      stroke="url(#grad1)"
                      strokeWidth="8"
                      strokeDasharray="283"
                      strokeDashoffset="70"
                      strokeLinecap="round"
                      fill="none"
                    />
                    <defs>
                      <linearGradient id="grad1" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-3xl font-bold gradient-text">
                    75%
                  </span>
                </div>
                <p className="mt-4 text-gray-300 text-center">
                  Carrera completada
                </p>
              </div>

              {/* Créditos */}
              <div className="flex flex-col justify-center">
                <p className="text-sm text-gray-400 mb-1">Créditos aprobados</p>
                <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                    style={{ width: "75%" }}
                  />
                </div>
                <p className="mt-2 text-purple-400 font-semibold">180 / 240</p>
              </div>

              {/* Promedio */}
              <div className="flex flex-col items-center glass rounded-2xl p-6">
                <svg
                  className="w-12 h-12 text-yellow-400 mb-3"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <div className="text-5xl font-bold gradient-text mb-2">5.8</div>
                <p className="text-gray-300">Promedio general</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================== */}
      {/*   CARACTERÍSTICAS PRINCIPALES */}
      {/* =========================== */}
      <section className="py-24 px-6 fade-in">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 gradient-text">
            Herramientas Innovadoras
          </h2>

          <div className="grid md:grid-cols-3 gap-8 mb-20">
            {/* 1 */}
            <div className="glass p-8 rounded-2xl card-hover">
              <div className="w-14 h-14 mb-6 mx-auto rounded-xl bg-blue-500/20 flex items-center justify-center">
                <LayoutGrid
                  className="w-10 h-10 text-blue-400"
                  strokeWidth={2}
                />
              </div>
              <h3 className="text-xl font-semibold mb-3">Motor Predictivo</h3>
              <p className="text-gray-300 leading-relaxed">
                El algoritmo deduce matemáticamente tu nota de salvación instantánea con cada cambio que hagas, despejando toda incertidumbre.
              </p>
            </div>

            {/* 2 */}
            <div className="glass p-8 rounded-2xl card-hover">
              <div className="w-14 h-14 mb-6 mx-auto rounded-xl bg-purple-500/20 flex items-center justify-center">
                <NotebookText
                  className="w-10 h-10 text-purple-400"
                  strokeWidth={2}
                />
              </div>
              <h3 className="text-xl font-semibold mb-3">Simulador Instantáneo</h3>
              <p className="text-gray-300 leading-relaxed">
                Juega con "notas hipotéticas" antes de enfrentar tus exámenes y observa el impacto exacto en tu estado de aprobación.
              </p>
            </div>

            {/* 3 */}
            <div className="glass p-8 rounded-2xl card-hover">
              <div className="w-14 h-14 mb-6 mx-auto rounded-xl bg-green-500/20 flex items-center justify-center">
                <BarChart3
                  className="w-10 h-10 text-green-400"
                  strokeWidth={2}
                />
              </div>
              <h3 className="text-xl font-semibold mb-3">
                Trazabilidad Total
              </h3>
              <p className="text-gray-300 leading-relaxed">
                No confíes tu semestre a la memoria. Controla tus progresiones al detalle, sin cálculos de ponderación manuales propensos a error.
              </p>
            </div>
          </div>

          <p className="text-center text-3xl italic text-gray-200">
            “Hecha por estudiantes, para estudiantes.”
          </p>
        </div>
      </section>

      {/* =========================== */}
      {/*          CTA FINAL          */}
      {/* =========================== */}
      <section className="py-32 px-6 text-center fade-in">
        <h2 className="text-4xl md:text-6xl font-bold mb-8 gradient-text">
          Empieza a planificar tu futuro académico hoy.
        </h2>

        <button
          onClick={() => navigate("/app")}
          className="btn-primary px-10 py-5 rounded-full text-xl font-semibold"
        >
          Explorar mallas →
        </button>
      </section>

      {/* =========================== */}
      {/*            FOOTER           */}
      {/* =========================== */}
      <footer className="py-12 text-center text-gray-400 text-sm border-t border-white/10">
        © 2025 Malla Pro — Todos los derechos reservados.
      </footer>
    </div>
  );
}
