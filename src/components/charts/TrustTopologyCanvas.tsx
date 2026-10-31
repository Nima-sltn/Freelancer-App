import { useEffect, useRef, useState, useCallback } from "react";
import { useT } from "@/store/i18n";
import { soundEngine } from "@/lib/audio";

interface Node {
  id: string;
  labelKey: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  weight: number;
}

interface Edge {
  source: string;
  target: string;
  strength: number;
}

function applyPhysics(
  nodes: Node[],
  edges: Edge[],
  curCenterX: number,
  curCenterY: number
) {
  for (const edge of edges) {
    const source = nodes.find((n) => n.id === edge.source);
    const target = nodes.find((n) => n.id === edge.target);
    if (!source || !target) continue;

    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const targetDist = 95;
    const force = (dist - targetDist) * edge.strength;

    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;

    source.vx += fx;
    source.vy += fy;
    target.vx -= fx;
    target.vy -= fy;
  }

  for (const node of nodes) {
    const cdx = curCenterX - node.x;
    const cdy = curCenterY - node.y;
    node.vx += cdx * 0.005;
    node.vy += cdy * 0.005;

    node.vx *= 0.88;
    node.vy *= 0.88;

    node.x += node.vx;
    node.y += node.vy;
  }
}

function drawEdges(
  ctx: CanvasRenderingContext2D,
  edges: Edge[],
  nodes: Node[],
  hoveredNode: string | null
) {
  ctx.lineWidth = 1.5;
  for (const edge of edges) {
    const source = nodes.find((n) => n.id === edge.source);
    const target = nodes.find((n) => n.id === edge.target);
    if (!source || !target) continue;

    const isHighlighted = hoveredNode === source.id || hoveredNode === target.id;
    ctx.strokeStyle = isHighlighted
      ? "rgba(99, 102, 241, 0.45)"
      : "rgba(148, 163, 184, 0.22)";
    ctx.beginPath();
    ctx.moveTo(source.x, source.y);
    ctx.lineTo(target.x, target.y);
    ctx.stroke();
  }
}

function drawNodes(
  ctx: CanvasRenderingContext2D,
  nodes: Node[],
  hoveredNode: string | null,
  pulse: number,
  t: (k: string) => string
) {
  for (const node of nodes) {
    const isHovered = hoveredNode === node.id;
    const radius = node.radius + (isHovered ? 3 : 0);

    ctx.beginPath();
    ctx.arc(
      node.x,
      node.y,
      radius + (node.id === "core" ? Math.sin(pulse) * 3 : 0),
      0,
      Math.PI * 2
    );
    ctx.fillStyle = isHovered
      ? "rgba(99, 102, 241, 0.2)"
      : "rgba(148, 163, 184, 0.1)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = node.color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();

    ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "rgba(100, 116, 139, 0.9)";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(t(node.labelKey), node.x, node.y + radius + 5);
  }
}

export interface TrustTopologyCanvasProps {
  readonly trustScore?: number;
  readonly className?: string;
  readonly height?: number;
}

/**
 * Hardware-Accelerated Canvas Trust & Affinity Topology Graph (Layer 4 - Components).
 *
 * Implements a lightweight spring-damper physics simulation rendered on HTML5 Canvas
 * at 60 FPS without external charting dependencies. Renders multi-node trust verification
 * topology with responsive HiDPI backing store and interactive hover dynamics.
 */
export function TrustTopologyCanvas({
  trustScore = 92,
  className = "",
  height = 260,
}: Readonly<TrustTopologyCanvasProps>) {
  const { t } = useT();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const nodesRef = useRef<Node[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  const animFrameId = useRef<number | null>(null);

  // Initialize network topology graph nodes
  const initGraph = useCallback(() => {
    const nodes: Node[] = [
      {
        id: "core",
        labelKey: "trust.title",
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        radius: 26,
        color: "#6366f1",
        weight: trustScore,
      },
      {
        id: "escrow",
        labelKey: "wallet.kind.escrow-in",
        x: -90,
        y: -40,
        vx: 0,
        vy: 0,
        radius: 18,
        color: "#10b981",
        weight: 98,
      },
      {
        id: "identity",
        labelKey: "trust.signal.verified",
        x: 90,
        y: -40,
        vx: 0,
        vy: 0,
        radius: 18,
        color: "#3b82f6",
        weight: 100,
      },
      {
        id: "merkle",
        labelKey: "tx.title",
        x: -60,
        y: 65,
        vx: 0,
        vy: 0,
        radius: 17,
        color: "#8b5cf6",
        weight: 95,
      },
      {
        id: "reviews",
        labelKey: "trust.signal.rating",
        x: 60,
        y: 65,
        vx: 0,
        vy: 0,
        radius: 17,
        color: "#f59e0b",
        weight: 88,
      },
    ];

    const edges: Edge[] = [
      { source: "core", target: "escrow", strength: 0.05 },
      { source: "core", target: "identity", strength: 0.05 },
      { source: "core", target: "merkle", strength: 0.05 },
      { source: "core", target: "reviews", strength: 0.05 },
      { source: "escrow", target: "merkle", strength: 0.02 },
      { source: "identity", target: "reviews", strength: 0.02 },
    ];

    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [trustScore]);

  useEffect(() => {
    initGraph();
  }, [initGraph]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = canvas.clientWidth;
    let canvasHeight = height;

    const updateDimensions = () => {
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      width = canvas.clientWidth;
      canvasHeight = height;
      canvas.width = width * dpr;
      canvas.height = canvasHeight * dpr;
      ctx.resetTransform?.();
      ctx.scale(dpr, dpr);
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);

    // Initial center positioning
    const centerX = width / 2;
    const centerY = canvasHeight / 2;
    nodesRef.current.forEach((node) => {
      node.x += centerX;
      node.y += centerY;
    });

    let pulse = 0;

    const render = () => {
      pulse += 0.025;
      ctx.clearRect(0, 0, width, canvasHeight);

      const nodes = nodesRef.current;
      const edges = edgesRef.current;

      applyPhysics(nodes, edges, width / 2, canvasHeight / 2);
      drawEdges(ctx, edges, nodes, hoveredNode);
      drawNodes(ctx, nodes, hoveredNode, pulse, t);

      animFrameId.current = requestAnimationFrame(render);
    };

    animFrameId.current = requestAnimationFrame(render);

    const handleMouseMove = (evt: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = evt.clientX - rect.left;
      const mouseY = evt.clientY - rect.top;

      let found: string | null = null;
      for (const node of nodesRef.current) {
        const dx = node.x - mouseX;
        const dy = node.y - mouseY;
        if (Math.sqrt(dx * dx + dy * dy) <= node.radius + 6) {
          found = node.id;
          break;
        }
      }

      if (found !== hoveredNode) {
        setHoveredNode(found);
        if (found) soundEngine.play("click");
      }
    };

    const handleMouseLeave = () => setHoveredNode(null);

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("resize", updateDimensions);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [hoveredNode, height, t]);

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-line/60 bg-surface/60 p-5 ${className}`}>
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
            {t("trust.graph.title")}
          </h4>
          <p className="text-xs text-ink-soft">
            {t("trust.graph.subtitle")}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-500/30 bg-primary-500/10 px-2.5 py-0.5 text-xs font-bold text-primary-600">
          <span className="h-1.5 w-1.5 rounded-full bg-primary-500 animate-pulse" />
          {trustScore}% Trust Quotient
        </span>
      </div>

      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: `${height}px` }}
        className="cursor-pointer touch-none"
      />
    </div>
  );
}

export default TrustTopologyCanvas;
