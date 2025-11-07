import React, { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Line, Points, PointMaterial } from "@react-three/drei";

// 3D Node Network using React Three Fiber + Drei
// - ~60 nodes in a sphere (more connections)
// - Edges connect nearby nodes (computed at mount)
// - Mouse proximity highlights connections
// - Smooth rotation, subtle pointer parallax, emissive look

function NetworkCore({
  nodeCount = 60,
  radius = 6,
  connectionDistance = 2.8,
  speed = 0.15,
}) {
  const group = useRef();
  const { raycaster, pointer, camera } = useThree();
  const [hoveredNodeId, setHoveredNodeId] = useState(null);

  // Initial node positions inside a sphere
  const nodes = useMemo(() => {
    const pts = [];
    for (let i = 0; i < nodeCount; i++) {
      const v = new THREE.Vector3()
        .randomDirection()
        .multiplyScalar(Math.cbrt(Math.random()) * radius);
      pts.push({ id: i, pos: v, base: v.clone() });
    }
    return pts;
  }, [nodeCount, radius]);

  // Precompute edges by proximity (static)
  const edges = useMemo(() => {
    const out = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const d = nodes[i].pos.distanceTo(nodes[j].pos);
        if (d <= connectionDistance) {
          out.push({ a: nodes[i], b: nodes[j], d });
        }
      }
    }
    return out;
  }, [nodes, connectionDistance]);

  // Positions buffer for Points (x,y,z)*N
  const positions = useMemo(
    () => new Float32Array(nodes.length * 3),
    [nodes.length]
  );

  const t0 = useRef(Math.random() * 1000);

  useFrame((state) => {
    const t = t0.current + state.clock.getElapsedTime();

    // Soft group rotation
    if (group.current) {
      const p = state.pointer;
      group.current.rotation.y = t * 0.03 + p.x * 0.15;
      group.current.rotation.x = Math.sin(t * 0.1) * 0.05 + p.y * 0.15;
    }

    // Gentle wobble per node + detect hover
    let closestNode = null;
    let closestDist = Infinity;

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const wobble = new THREE.Vector3(
        Math.sin(t * speed + i) * 0.15,
        Math.cos(t * speed * 0.9 + i * 0.7) * 0.15,
        Math.sin(t * speed * 1.1 + i * 0.3) * 0.15
      );
      const p = n.base.clone().add(wobble);
      n.currentPos = p; // store for hover detection
      positions[i * 3 + 0] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;

      // Check distance from raycaster for hover effect
      const screenPos = p.clone().project(camera);
      const dist = Math.hypot(screenPos.x - pointer.x, screenPos.y - pointer.y);
      if (dist < closestDist && dist < 0.15) {
        // threshold for hover
        closestDist = dist;
        closestNode = n.id;
      }
    }

    setHoveredNodeId(closestNode);
  });

  const pointsRef = useRef();
  useFrame(() => {
    if (pointsRef.current) {
      pointsRef.current.geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3)
      );
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group ref={group}>
      {/* Lines between close nodes - highlight on hover */}
      {edges.map((e, idx) => {
        const isConnected =
          hoveredNodeId !== null &&
          (hoveredNodeId === e.a.id || hoveredNodeId === e.b.id);
        const baseOpacity = THREE.MathUtils.clamp(
          1.0 - e.d / connectionDistance,
          0.1,
          0.4
        );
        const opacity = isConnected ? 0.9 : baseOpacity;
        const color = isConnected ? "#60a5fa" : "#ffffff";

        return (
          <Line
            key={idx}
            points={[e.a.pos.toArray(), e.b.pos.toArray()]}
            color={color}
            transparent
            opacity={opacity}
            linewidth={isConnected ? 2 : 1}
          />
        );
      })}

      {/* Glowing points - highlight hovered */}
      <Points ref={pointsRef} positions={positions} stride={3} frustumCulled>
        <PointMaterial
          transparent
          color={hoveredNodeId !== null ? "#60a5fa" : "#ffffff"}
          size={0.1}
          sizeAttenuation
          depthWrite={false}
        />
      </Points>
    </group>
  );
}

export default function NodeNetwork({ height = 500 }) {
  return (
    <div className="relative w-full" style={{ height }}>
      <Canvas
        camera={{ fov: 45, position: [0, 0, 14] }}
        gl={{ antialias: true, alpha: true }}
      >
        {/* Keep background transparent to blend with page theme */}
        <ambientLight intensity={0.25} />
        <pointLight position={[5, 5, 5]} intensity={0.6} />

        <NetworkCore
          nodeCount={60}
          radius={6}
          connectionDistance={2.8}
          speed={0.18}
        />

        <OrbitControls
          enablePan={false}
          enableZoom={false}
          enableDamping
          dampingFactor={0.08}
        />
      </Canvas>
      <div className="relative flex h-full flex-col gap-5 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-textSecondary">
              Cursos aprobados
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold text-textPrimary">
                25
              </span>
              <span className="text-sm text-textSecondary">63% del plan</span>
            </div>
          </div>
          <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 ring-1 ring-inset ring-white/20">
            <span
              className="absolute inset-0 rounded-xl blur-xl"
              style={{ background: "rgba(34, 197, 94, 0.45)" }}
            ></span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-circle-check relative h-6 w-6"
              aria-hidden="true"
              style={{ color: "rgb(16, 185, 129)" }}
            >
              <circle cx="12" cy="12" r="10"></circle>
              <path d="m9 12 2 2 4-4"></path>
            </svg>
          </div>
        </div>
        <div className="mt-auto space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-textSecondary">
            <span>Aprobado</span>
            <span>63%</span>
          </div>
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <span
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: "63%",
                background:
                  "linear-gradient(90deg, rgba(34, 197, 94, 0.9) 0%, rgba(16, 185, 129, 0.35) 100%)",
              }}
            ></span>
          </div>
        </div>
      </div>
    </div>
  );
}
