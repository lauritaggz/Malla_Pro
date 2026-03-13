import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutGrid, NotebookText, BarChart3, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

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
        ctx.fillStyle = "rgba(168, 85, 247, 0.9)"; // More saturated purple
        ctx.fill();
      }
    }

    for (let i = 0; i < nodeCount; i++) nodes.push(new Node());

    function animate() {
      ctx.clearRect(0, 0, width, height);

      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "#050b2b"); // Deep saturated navy
      gradient.addColorStop(0.5, "#150b45"); // Saturated dark purple
      gradient.addColorStop(1, "#050b2b");
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
  
  // Animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 1, 0.5, 1] } }
  };
  
  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  return (
    <div className="aurora dark">
      <div className="relative min-h-screen overflow-x-hidden overflow-y-auto text-white">
      {/* FONDO ANIMADO */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full -z-10 pointer-events-none"
      />

      {/* =========================== */}
      {/*            HERO             */}
      {/* =========================== */}
      <section className="min-h-screen flex items-center justify-center text-center px-6 relative z-10 pt-10">
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="max-w-5xl"
        >
          <motion.h1 variants={fadeInUp} className="text-5xl md:text-7xl font-bold mb-6 text-white drop-shadow-lg leading-tight">
            Organiza tu semestre con <br />
            <span className="gradient-text text-6xl md:text-8xl block mt-3 tracking-tight">Malla Pro</span>
          </motion.h1>

          <motion.p variants={fadeInUp} className="text-xl md:text-2xl text-indigo-100/80 mb-12 font-light leading-relaxed max-w-3xl mx-auto">
            La forma más fácil de ver tu malla, guardar tus notas y saber exactamente qué nota necesitas en la próxima prueba para salvar el ramo.
          </motion.p>

          <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row justify-center gap-6">
            <button
              onClick={() => navigate("/app")}
              className="btn-primary px-8 py-4 rounded-full text-lg font-semibold flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(139,92,246,0.3)] hover:shadow-[0_0_40px_rgba(139,92,246,0.5)] transition-shadow duration-300"
            >
              Empezar ahora <ChevronRight className="w-5 h-5" />
            </button>

            <a
              href="#why"
              className="btn-secondary px-8 py-4 rounded-full text-lg font-semibold flex items-center justify-center"
            >
              Ver más
            </a>
          </motion.div>
        </motion.div>
      </section>

      {/* =========================== */}
      {/*       ¿POR QUÉ MALLA PRO?   */}
      {/* =========================== */}
      <section id="why" className="py-24 px-6 relative z-10">
        <div className="max-w-6xl mx-auto">
          <motion.h2 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
            className="text-4xl md:text-5xl font-bold text-center mb-16 gradient-text"
          >
            Sobrevive a la U
          </motion.h2>

          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-8"
          >
            {/* 1 */}
            <motion.div variants={fadeInUp} className="glass p-8 rounded-3xl hover:-translate-y-2 transition-transform duration-300 border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
              <div className="w-16 h-16 mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <LayoutGrid className="w-8 h-8 text-white" strokeWidth={2.5} />
              </div>
              <h3 className="text-2xl font-semibold mb-3">La nota salvavidas</h3>
              <p className="text-gray-400 leading-relaxed">
                Olvídate de la calculadora. Malla Pro deduce tu promedio y te dice al instante qué nota necesitas sacarte para aprobar.
              </p>
            </motion.div>

            {/* 2 */}
            <motion.div variants={fadeInUp} className="glass p-8 rounded-3xl hover:-translate-y-2 transition-transform duration-300 border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
              <div className="w-16 h-16 mb-6 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                <NotebookText className="w-8 h-8 text-white" strokeWidth={2.5} />
              </div>
              <h3 className="text-2xl font-semibold mb-3">Tu malla a la vista</h3>
              <p className="text-gray-400 leading-relaxed">
                Lleva la cuenta de los ramos que pasaste, los que estás cursando, y esconde los semestres limpios para enfocarte en tu semestre actual.
              </p>
            </motion.div>

            {/* 3 */}
            <motion.div variants={fadeInUp} className="glass p-8 rounded-3xl hover:-translate-y-2 transition-transform duration-300 border border-white/5 bg-white/5 backdrop-blur-xl">
              <div className="w-16 h-16 mb-6 rounded-2xl bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center shadow-lg shadow-green-500/20">
                <BarChart3 className="w-8 h-8 text-white" strokeWidth={2.5} />
              </div>
              <h3 className="text-2xl font-semibold mb-3">Eximición Mágica</h3>
              <p className="text-gray-400 leading-relaxed">
                Configura fácilmente los requisitos de tu carrera (Ponderación 70/30, Nota Eximición) y el sistema lo considerará en tus cálculos.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* =========================== */}
      {/*    PROGRESO & DASHBOARD     */}
      {/* =========================== */}
      <section className="py-24 px-6 bg-gradient-to-b from-transparent via-purple-900/10 to-transparent relative z-10">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="max-w-5xl mx-auto"
        >
          <motion.h2 variants={fadeInUp} className="text-4xl md:text-5xl font-bold text-center mb-16 gradient-text">
            Tu progreso en tiempo real
          </motion.h2>

          <motion.div variants={fadeInUp} className="glass rounded-3xl p-10 border border-white/10 bg-black/20 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
            {/* Subtle glow effect behind the glass */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-purple-500/5 blur-[120px] rounded-full pointer-events-none" />
            
            <div className="grid md:grid-cols-3 gap-10 relative z-10">
              {/* Progress Circle */}
              <div className="flex flex-col items-center">
                <div className="relative w-40 h-40">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="45" stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="none" />
                    <motion.circle
                      cx="50" cy="50" r="45"
                      stroke="url(#grad1)"
                      strokeWidth="8"
                      strokeDasharray="283"
                      strokeLinecap="round"
                      fill="none"
                      initial={{ strokeDashoffset: 283 }}
                      whileInView={{ strokeDashoffset: 70 }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                    />
                    <defs>
                      <linearGradient id="grad1" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-3xl font-bold text-white drop-shadow-md">
                    75%
                  </span>
                </div>
                <p className="mt-4 text-gray-400 font-medium text-center">
                  Carrera completada
                </p>
              </div>

              {/* Créditos */}
              <div className="flex flex-col justify-center">
                <p className="text-sm text-gray-400 mb-2 font-medium">Créditos aprobados</p>
                <div className="w-full h-4 bg-white/5 rounded-full overflow-hidden shadow-inner border border-white/5">
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                    initial={{ width: 0 }}
                    whileInView={{ width: "75%" }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2, ease: "easeOut", delay: 0.4 }}
                  />
                </div>
                <p className="mt-3 text-purple-300 font-semibold tracking-wide">180 / 240</p>
              </div>

              {/* Promedio */}
              <div className="flex flex-col items-center justify-center">
                <div className="glass rounded-3xl p-6 w-full max-w-[200px] border border-white/5 bg-white/5 text-center shadow-lg">
                  <svg className="w-10 h-10 text-yellow-400 mb-3 mx-auto drop-shadow-sm" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.6 }}
                    className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400 mb-2"
                  >
                    5.8
                  </motion.div>
                  <p className="text-indigo-200/70 font-medium text-sm">Promedio general</p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* =========================== */}
      {/*          CTA FINAL          */}
      {/* =========================== */}
      <section className="py-32 px-6 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto"
        >
          <h2 className="text-4xl md:text-6xl font-bold mb-8 gradient-text leading-tight">
            Es momento de organizar <br/> tu semestre.
          </h2>
          <button
            onClick={() => navigate("/app")}
            className="btn-primary px-10 py-5 rounded-full text-xl font-semibold inline-flex items-center gap-2 shadow-[0_0_30px_rgba(139,92,246,0.3)] hover:shadow-[0_0_40px_rgba(139,92,246,0.5)] transition-shadow duration-300"
          >
            Explorar mallas <ChevronRight className="w-6 h-6" />
          </button>
        </motion.div>
      </section>

      {/* =========================== */}
      {/*            FOOTER           */}
      {/* =========================== */}
      <footer className="py-10 text-center text-gray-500 font-medium text-sm border-t border-white/5 relative z-10">
        © 2026 Malla Pro — Todos los derechos reservados.
      </footer>
      </div>
    </div>
  );
}
