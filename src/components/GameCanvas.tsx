import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  Volume2,
  VolumeX,
  ArrowRight,
  Heart,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  MapPin,
  Copy,
  Check,
  Send,
  X,
  ZoomIn,
} from 'lucide-react';
import { WeddingConfig, RsvpEntry } from '../types/wedding';
import { drawCartoonCharacter } from '../utils/cartoonRenderer';
import { weddingAudio } from '../audio/weddingAudio';

interface GameCanvasProps {
  config: WeddingConfig;
  leadRole: 'groom' | 'bride';
  musicPlaying: boolean;
  onToggleMusic: () => void;
  onCompleteGame: () => void;
  onSkipToInvitation: () => void;
}

type Direction = 'down' | 'up' | 'left' | 'right';
type StationId = 'mempelai' | 'acara' | 'rsvp' | 'amplop' | 'pelaminan';

interface Station {
  id: StationId;
  title: string;
  subtitle: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

interface Obstacle {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: 'tree' | 'blossom' | 'pond' | 'lantern';
}

interface CollectibleHeart {
  id: number;
  x: number;
  y: number;
  collected: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

const WORLD_W = 1440;
const WORLD_H = 1080;

function buildStations(acaraName?: string): Station[] {
  return [
    {
      id: 'mempelai',
      title: 'Gazebo Mempelai',
      subtitle: 'Foto & Profil Pengantin',
      x: 720,
      y: 795,
      w: 196,
      h: 118,
      color: '#2E6F5E',
    },
    {
      id: 'acara',
      title: acaraName?.trim() || 'Joglo Akad & Resepsi',
      subtitle: 'Jadwal & Peta Lokasi',
      x: 320,
      y: 540,
      w: 186,
      h: 118,
      color: '#C85A53',
    },
    {
      id: 'rsvp',
      title: 'Gazebo Buku Tamu',
      subtitle: 'RSVP & Kirim Doa',
      x: 1120,
      y: 540,
      w: 180,
      h: 112,
      color: '#2E6F5E',
    },
    {
      id: 'amplop',
      title: 'Rumah Amplop Digital',
      subtitle: 'Kado & Tanda Kasih',
      x: 340,
      y: 280,
      w: 170,
      h: 108,
      color: '#B45309',
    },
    {
      id: 'pelaminan',
      title: 'Pelaminan Agung',
      subtitle: 'Panggung Utama Pernikahan',
      x: 720,
      y: 195,
      w: 248,
      h: 124,
      color: '#C85A53',
    },
  ];
}

const OBSTACLES: Obstacle[] = [
  // Border & garden trees
  { x: 130, y: 150, w: 60, h: 50, kind: 'blossom' },
  { x: 1300, y: 160, w: 60, h: 50, kind: 'blossom' },
  { x: 140, y: 880, w: 60, h: 50, kind: 'tree' },
  { x: 1290, y: 890, w: 60, h: 50, kind: 'tree' },
  { x: 520, y: 690, w: 50, h: 45, kind: 'blossom' },
  { x: 920, y: 690, w: 50, h: 45, kind: 'blossom' },
  { x: 1090, y: 290, w: 180, h: 110, kind: 'pond' },
  // Warm garden lanterns
  { x: 610, y: 390, w: 24, h: 24, kind: 'lantern' },
  { x: 830, y: 390, w: 24, h: 24, kind: 'lantern' },
  { x: 610, y: 630, w: 24, h: 24, kind: 'lantern' },
  { x: 830, y: 630, w: 24, h: 24, kind: 'lantern' },
];

const INITIAL_HEARTS: Omit<CollectibleHeart, 'collected'>[] = [
  { id: 1, x: 720, y: 680 },
  { id: 2, x: 560, y: 550 },
  { id: 3, x: 430, y: 550 },
  { id: 4, x: 880, y: 550 },
  { id: 5, x: 990, y: 550 },
  { id: 6, x: 720, y: 450 },
  { id: 7, x: 520, y: 310 },
  { id: 8, x: 950, y: 340 },
  { id: 9, x: 720, y: 330 },
  { id: 10, x: 640, y: 260 },
];

const NPCS = [
  { name: 'Tamu 1', x: 560, y: 820, color: '#3B82F6', hair: '#1F1D24', line: 'Selamat datang! Ketuk Gazebo Mempelai untuk lihat foto.' },
  { name: 'Tamu 2', x: 900, y: 440, color: '#EC4899', hair: '#4A3327', line: 'Jangan lupa isi Buku Tamu di kanan!' },
];

const RSVP_STORAGE_KEY = 'adventure_of_us_rsvp_entries_v1';

export const GameCanvas: React.FC<GameCanvasProps> = ({
  config,
  leadRole,
  musicPlaying,
  onToggleMusic,
  onCompleteGame,
  onSkipToInvitation,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pendingOpenStationRef = useRef<StationId | null>(null);

  const stations = useMemo(() => buildStations(config.acaraStationName), [config.acaraStationName]);

  const [nearbyStation, setNearbyStation] = useState<Station | null>(null);
  const [activeModal, setActiveModal] = useState<StationId | null>(null);
  const [visitedStations, setVisitedStations] = useState<Set<StationId>>(new Set());
  const [heartsCollected, setHeartsCollected] = useState(0);
  const [celebrating, setCelebrating] = useState(false);
  const [zoomedPhoto, setZoomedPhoto] = useState<{ url: string; label: string } | null>(null);
  const [brokenPhotos, setBrokenPhotos] = useState<Record<string, boolean>>({});

  // Interactive modal states (RSVP & Copy bank)
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [rsvpName, setRsvpName] = useState('');
  const [rsvpStatus, setRsvpStatus] = useState<'Hadir' | 'Ragu' | 'Tidak Hadir'>('Hadir');
  const [rsvpMsg, setRsvpMsg] = useState('');
  const [rsvpSaved, setRsvpSaved] = useState(false);

  const keysRef = useRef<{ up: boolean; down: boolean; left: boolean; right: boolean }>({
    up: false,
    down: false,
    left: false,
    right: false,
  });

  const gameRef = useRef({
    px: 720,
    py: 950,
    dir: 'up' as Direction,
    facing: 1 as 1 | -1,
    isMoving: false,
    walkPhase: 0,
    partnerX: 668,
    partnerY: 960,
    partnerDir: 'up' as Direction,
    partnerPhase: 0,
    tapTarget: null as { x: number; y: number } | null,
    camX: 0,
    camY: 0,
    tick: 0,
    hearts: INITIAL_HEARTS.map((h) => ({ ...h, collected: false })),
    particles: [] as Particle[],
  });

  const openStationModal = useCallback(
    (stationId: StationId) => {
      keysRef.current = { up: false, down: false, left: false, right: false };
      gameRef.current.tapTarget = null;
      setVisitedStations((prev) => new Set(prev).add(stationId));

      if (stationId === 'pelaminan') {
        weddingAudio.playVictoryFanfare();
        setCelebrating(true);
        // Spawn celebratory fireworks around Pelaminan
        const colors = ['#F43F5E', '#FACC15', '#34D399', '#60A5FA'];
        for (let b = 0; b < 4; b++) {
          const bx = 600 + b * 80;
          const by = 140 + (b % 2) * 40;
          for (let i = 0; i < 16; i++) {
            const ang = (Math.PI * 2 * i) / 16;
            const spd = 2 + Math.random() * 3;
            gameRef.current.particles.push({
              x: bx,
              y: by,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd,
              life: 0,
              maxLife: 45,
              color: colors[i % colors.length],
              size: 4,
            });
          }
        }
      } else {
        weddingAudio.playCheckpoint();
      }
      setActiveModal(stationId);
    },
    []
  );

  // Keyboard bindings
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (activeModal) {
        if (e.code === 'Escape') {
          if (zoomedPhoto) setZoomedPhoto(null);
          else setActiveModal(null);
        }
        return;
      }
      if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        keysRef.current.up = true;
        gameRef.current.tapTarget = null;
        pendingOpenStationRef.current = null;
      }
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        keysRef.current.down = true;
        gameRef.current.tapTarget = null;
        pendingOpenStationRef.current = null;
      }
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        keysRef.current.left = true;
        gameRef.current.tapTarget = null;
        pendingOpenStationRef.current = null;
      }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        keysRef.current.right = true;
        gameRef.current.tapTarget = null;
        pendingOpenStationRef.current = null;
      }
      if ((e.code === 'Space' || e.code === 'Enter') && nearbyStation) {
        e.preventDefault();
        openStationModal(nearbyStation.id);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowUp' || e.code === 'KeyW') keysRef.current.up = false;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') keysRef.current.down = false;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') keysRef.current.left = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') keysRef.current.right = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [activeModal, zoomedPhoto, nearbyStation, openStationModal]);

  // Tap-to-walk or tap-building-to-open on canvas
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeModal) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left + gameRef.current.camX;
    const clickY = e.clientY - rect.top + gameRef.current.camY;

    const clickedStation = stations.find(
      (s) => Math.abs(clickX - s.x) < s.w * 0.6 && Math.abs(clickY - s.y) < s.h * 0.72
    );
    if (clickedStation) {
      const interactY = clickedStation.id === 'pelaminan' ? clickedStation.y + 38 : clickedStation.y + clickedStation.h * 0.56;
      if (Math.hypot(gameRef.current.px - clickedStation.x, gameRef.current.py - interactY) < 115) {
        openStationModal(clickedStation.id);
        return;
      }
      // Walk to the station entrance and open automatically on arrival
      pendingOpenStationRef.current = clickedStation.id;
      gameRef.current.tapTarget = { x: clickedStation.x, y: interactY };
      return;
    }

    pendingOpenStationRef.current = null;
    gameRef.current.tapTarget = {
      x: Math.max(40, Math.min(WORLD_W - 40, clickX)),
      y: Math.max(80, Math.min(WORLD_H - 40, clickY)),
    };
  };

  // Main 60fps Top-Down RPG Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let lastTime = performance.now();

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(320, Math.floor(rect.width * dpr));
      canvas.height = Math.max(320, Math.floor(rect.height * dpr));
    };

    resize();
    window.addEventListener('resize', resize);

    const collidesWithWorld = (nx: number, ny: number): boolean => {
      if (nx < 42 || nx > WORLD_W - 42 || ny < 75 || ny > WORLD_H - 36) return true;
      for (const st of stations) {
        if (st.id === 'pelaminan') {
          // Allow stepping onto Pelaminan red carpet, block only back wall
          if (Math.abs(nx - st.x) < st.w * 0.45 && ny < st.y - 10 && ny > st.y - 60) return true;
        } else if (Math.abs(nx - st.x) < st.w * 0.4 && Math.abs(ny - st.y) < st.h * 0.34) {
          return true;
        }
      }
      for (const ob of OBSTACLES) {
        if (Math.abs(nx - ob.x) < ob.w * 0.45 && Math.abs(ny - ob.y) < ob.h * 0.45) {
          return true;
        }
      }
      return false;
    };

    const loop = (now: number) => {
      const dt = Math.min(2, (now - lastTime) / 16.667);
      lastTime = now;

      const g = gameRef.current;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const viewW = canvas.width / dpr;
      const viewH = canvas.height / dpr;
      g.tick += dt;

      // --- MOVEMENT UPDATE ---
      let dx = 0;
      let dy = 0;
      if (!activeModal) {
        const speed = 4.1;
        if (keysRef.current.left) dx -= 1;
        if (keysRef.current.right) dx += 1;
        if (keysRef.current.up) dy -= 1;
        if (keysRef.current.down) dy += 1;

        if (dx === 0 && dy === 0 && g.tapTarget) {
          const tx = g.tapTarget.x - g.px;
          const ty = g.tapTarget.y - g.py;
          const dist = Math.hypot(tx, ty);
          if (dist < 8) {
            g.tapTarget = null;
          } else {
            dx = tx / dist;
            dy = ty / dist;
          }
        }

        if (dx !== 0 || dy !== 0) {
          const len = Math.hypot(dx, dy);
          const vx = (dx / len) * speed * dt;
          const vy = (dy / len) * speed * dt;

          if (Math.abs(dx) > Math.abs(dy)) {
            g.dir = dx > 0 ? 'right' : 'left';
            g.facing = dx > 0 ? 1 : -1;
          } else {
            g.dir = dy > 0 ? 'down' : 'up';
          }

          let moved = false;
          if (!collidesWithWorld(g.px + vx, g.py)) {
            g.px += vx;
            moved = true;
          }
          if (!collidesWithWorld(g.px, g.py + vy)) {
            g.py += vy;
            moved = true;
          }
          if (!moved) g.tapTarget = null;
          g.isMoving = moved;
          g.walkPhase += 0.24 * dt;
        } else {
          g.isMoving = false;
          g.walkPhase += 0.04 * dt;
        }
      } else {
        g.isMoving = false;
      }

      // Partner follower smooth follow
      const offsetBehind =
        g.dir === 'up'
          ? { x: -42, y: 26 }
          : g.dir === 'down'
          ? { x: 42, y: -26 }
          : g.dir === 'left'
          ? { x: 48, y: 10 }
          : { x: -48, y: 10 };

      const targetPX = g.px + offsetBehind.x;
      const targetPY = g.py + offsetBehind.y;
      const pdx = targetPX - g.partnerX;
      const pdy = targetPY - g.partnerY;
      const pDist = Math.hypot(pdx, pdy);

      if (pDist > 4) {
        g.partnerX += pdx * 0.1 * dt;
        g.partnerY += pdy * 0.1 * dt;
        g.partnerPhase += 0.22 * dt;
        if (Math.abs(pdx) > Math.abs(pdy)) {
          g.partnerDir = pdx > 0 ? 'right' : 'left';
        } else {
          g.partnerDir = pdy > 0 ? 'down' : 'up';
        }
      } else {
        g.partnerDir = g.dir;
        g.partnerPhase += 0.04 * dt;
      }

      // Collectible hearts
      for (const h of g.hearts) {
        if (!h.collected && Math.hypot(g.px - h.x, g.py - h.y) < 34) {
          h.collected = true;
          weddingAudio.playCollectHeart();
          setHeartsCollected((prev) => prev + 1);
          for (let i = 0; i < 10; i++) {
            const ang = (Math.PI * 2 * i) / 10;
            g.particles.push({
              x: h.x,
              y: h.y,
              vx: Math.cos(ang) * 2.2,
              vy: Math.sin(ang) * 2.2,
              life: 0,
              maxLife: 28,
              color: '#F43F5E',
              size: 3.5,
            });
          }
        }
      }

      // Detect nearby station
      let foundStation: Station | null = null;
      for (const st of stations) {
        const interactY = st.id === 'pelaminan' ? st.y + 38 : st.y + st.h * 0.54;
        if (Math.hypot(g.px - st.x, g.py - interactY) < 96) {
          foundStation = st;
          break;
        }
      }
      setNearbyStation((prev) => (prev?.id === foundStation?.id ? prev : foundStation));
      if (!activeModal && foundStation && pendingOpenStationRef.current === foundStation.id) {
        pendingOpenStationRef.current = null;
        g.tapTarget = null;
        openStationModal(foundStation.id);
      }

      // Celebratory ambient fireworks when Pelaminan activated
      if (celebrating && Math.random() < 0.07) {
        const colors = ['#F43F5E', '#FACC15', '#34D399', '#60A5FA'];
        const fx = 580 + Math.random() * 280;
        const fy = 90 + Math.random() * 140;
        for (let i = 0; i < 12; i++) {
          const ang = (Math.PI * 2 * i) / 12;
          g.particles.push({
            x: fx,
            y: fy,
            vx: Math.cos(ang) * 2.5,
            vy: Math.sin(ang) * 2.5,
            life: 0,
            maxLife: 38,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: 3.5,
          });
        }
      }

      // Update particles
      g.particles = g.particles.filter((p) => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life += dt;
        return p.life < p.maxLife;
      });

      // Camera smooth center on player
      const targetCamX = Math.max(0, Math.min(WORLD_W - viewW, g.px - viewW / 2));
      const targetCamY = Math.max(0, Math.min(WORLD_H - viewH, g.py - viewH / 2));
      g.camX += (targetCamX - g.camX) * 0.14 * dt;
      g.camY += (targetCamY - g.camY) * 0.14 * dt;

      // --- RENDER TOP-DOWN RPG WORLD ---
      ctx.save();
      ctx.scale(dpr, dpr);

      // Garden grass base
      ctx.fillStyle = '#9BC28A';
      ctx.fillRect(0, 0, viewW, viewH);

      ctx.save();
      ctx.translate(-g.camX, -g.camY);

      // Subtle grass tile pattern
      ctx.fillStyle = '#8FB87E';
      for (let gx = 40; gx < WORLD_W; gx += 96) {
        for (let gy = 40; gy < WORLD_H; gy += 96) {
          if (((gx + gy) / 96) % 2 === 0) {
            ctx.fillRect(gx, gy, 18, 6);
            ctx.fillRect(gx + 36, gy + 42, 12, 5);
          }
        }
      }

      // Outer garden wooden fence border
      ctx.strokeStyle = '#784F32';
      ctx.lineWidth = 10;
      ctx.strokeRect(20, 45, WORLD_W - 40, WORLD_H - 65);

      // Stone Cobblestone Paths connecting all wedding stations
      ctx.fillStyle = '#E6D9C6';
      ctx.strokeStyle = '#C7B69E';
      ctx.lineWidth = 3;
      // Central vertical avenue
      ctx.beginPath();
      ctx.roundRect(665, 220, 110, 770, 20);
      ctx.fill();
      ctx.stroke();
      // Horizontal avenue (Pendopo Acara <-> Meja RSVP)
      ctx.beginPath();
      ctx.roundRect(310, 520, 820, 90, 20);
      ctx.fill();
      ctx.stroke();
      // Upper path to Booth Amplop
      ctx.beginPath();
      ctx.roundRect(320, 280, 400, 76, 18);
      ctx.fill();
      ctx.stroke();

      // Red Carpet leading up to Pelaminan
      ctx.fillStyle = '#C85A53';
      ctx.fillRect(688, 220, 64, 150);
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 3;
      ctx.strokeRect(691, 220, 58, 150);

      // Tap-to-walk target indicator
      if (g.tapTarget) {
        ctx.strokeStyle = '#C85A53';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(g.tapTarget.x, g.tapTarget.y, 12 + Math.sin(g.tick * 0.25) * 3, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw Pond
      for (const ob of OBSTACLES) {
        if (ob.kind !== 'pond') continue;
        ctx.fillStyle = '#7DD3FC';
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.ellipse(ob.x, ob.y, ob.w * 0.55, ob.h * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Water ripple
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ob.x - 20, ob.y - 8, 14 + Math.sin(g.tick * 0.08) * 3, 0, Math.PI);
        ctx.stroke();
      }

      // Draw Stations (Javanese Rumah Joglo & Gazebo Mempelai)
      for (const st of stations) {
        const isNear = nearbyStation?.id === st.id;
        ctx.save();
        ctx.translate(st.x, st.y);

        // Ground shadow
        ctx.fillStyle = 'rgba(43,35,32,0.18)';
        ctx.beginPath();
        ctx.roundRect(-st.w / 2 + 5, -st.h / 2 + 12, st.w, st.h, 14);
        ctx.fill();

        if (st.id === 'pelaminan') {
          // Grand Wedding Stage / Pelaminan Joglo
          ctx.fillStyle = '#FAF6F0';
          ctx.strokeStyle = '#2B2320';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.roundRect(-st.w / 2, -st.h / 2 + 6, st.w, st.h - 6, 16);
          ctx.fill();
          ctx.stroke();

          // Carved teakwood gebyok backdrop
          ctx.fillStyle = '#784F32';
          ctx.beginPath();
          ctx.roundRect(-102, -st.h / 2 + 16, 204, 46, 12);
          ctx.fill();
          ctx.stroke();

          // Gold ornament frame on backdrop
          ctx.strokeStyle = '#FACC15';
          ctx.lineWidth = 2;
          ctx.strokeRect(-92, -st.h / 2 + 22, 184, 34);

          // Two golden wedding chairs
          ctx.strokeStyle = '#2B2320';
          ctx.lineWidth = 2.2;
          ctx.fillStyle = '#FACC15';
          ctx.fillRect(-35, -14, 24, 24);
          ctx.strokeRect(-35, -14, 24, 24);
          ctx.fillRect(11, -14, 24, 24);
          ctx.strokeRect(11, -14, 24, 24);

          // Flowers garland
          const fCols = ['#C85A53', '#FBBF24', '#F472B6', '#34D399'];
          for (let i = -3; i <= 3; i++) {
            ctx.fillStyle = fCols[Math.abs(i) % fCols.length];
            ctx.beginPath();
            ctx.arc(i * 26, -st.h / 2 + 16, 7.5, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (st.id === 'mempelai') {
          // Gazebo Mempelai with open front deck & cartoon couple inside!
          const hw = st.w / 2;
          const hh = st.h / 2;

          // Stone + wood terrace floor
          ctx.fillStyle = '#D9C2A3';
          ctx.strokeStyle = '#2B2320';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.roundRect(-hw, -hh + 26, st.w, st.h - 26, 12);
          ctx.fill();
          ctx.stroke();

          // Front entrance wooden step
          ctx.fillStyle = '#C4A47C';
          ctx.fillRect(-36, hh - 6, 72, 11);
          ctx.strokeRect(-36, hh - 6, 72, 11);

          // Warm cream gazebo floor carpet
          ctx.fillStyle = '#FAF6F0';
          ctx.beginPath();
          ctx.roundRect(-hw + 14, -hh + 34, st.w - 28, st.h - 46, 8);
          ctx.fill();
          ctx.stroke();

          // 4 Carved wooden pillars
          ctx.fillStyle = '#5C3D2E';
          const pillarXs = [-hw + 12, hw - 20];
          for (const px of pillarXs) {
            ctx.fillRect(px, -hh + 18, 8, st.h - 28);
            ctx.strokeRect(px, -hh + 18, 8, st.h - 28);
          }

          // Cartoon Couple inside Gazebo Mempelai (facing guest)
          const idleBlink = Math.sin(g.tick * 0.04) > 0.97;
          drawCartoonCharacter({
            ctx,
            char: config.groom,
            x: -24,
            y: 34,
            scale: 0.62,
            direction: 'down',
            walkPhase: g.tick * 0.05,
            isMoving: false,
            blink: idleBlink,
          });
          drawCartoonCharacter({
            ctx,
            char: config.bride,
            x: 24,
            y: 34,
            scale: 0.62,
            direction: 'down',
            walkPhase: g.tick * 0.05 + 1.2,
            isMoving: false,
            blink: idleBlink,
          });

          // Floating small heart between couple
          const heartFloat = Math.sin(g.tick * 0.1) * 2.5;
          ctx.save();
          ctx.translate(0, -14 + heartFloat);
          ctx.fillStyle = '#E11D48';
          ctx.strokeStyle = '#2B2320';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(0, 6);
          ctx.bezierCurveTo(-8, -2, -7, -10, 0, -4);
          ctx.bezierCurveTo(7, -10, 8, -2, 0, 6);
          ctx.fill();
          ctx.stroke();
          ctx.restore();

          // Tiered Gazebo Joglo Roof (open-front canopy above couple)
          ctx.fillStyle = '#2E6F5E';
          ctx.strokeStyle = '#2B2320';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(-hw - 10, -hh + 22);
          ctx.lineTo(hw + 10, -hh + 22);
          ctx.lineTo(hw - 16, -hh - 4);
          ctx.lineTo(-hw + 16, -hh - 4);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Upper pitched Joglo peak
          ctx.fillStyle = '#1E4D40';
          ctx.beginPath();
          ctx.moveTo(-hw + 26, -hh - 4);
          ctx.lineTo(hw - 26, -hh - 4);
          ctx.lineTo(0, -hh - 28);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Golden Mustaka roof finial
          ctx.fillStyle = '#FACC15';
          ctx.beginPath();
          ctx.arc(0, -hh - 30, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Floral eave garlands + lanterns
          const garlandCols = ['#F43F5E', '#FDE047', '#F9A8D4', '#FFFFFF'];
          for (let i = -4; i <= 4; i++) {
            ctx.fillStyle = garlandCols[Math.abs(i) % garlandCols.length];
            ctx.beginPath();
            ctx.arc(i * 19, -hh + 22, 4.5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = '#FDE047';
          ctx.beginPath();
          ctx.arc(-hw + 8, -hh + 30, 5, 0, Math.PI * 2);
          ctx.arc(hw - 8, -hh + 30, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else {
          // Rumah / Joglo Pavilion for Acara, Buku Tamu, Amplop Digital
          const hw = st.w / 2;
          const hh = st.h / 2;

          // Stone base & steps
          ctx.fillStyle = '#E6D9C6';
          ctx.strokeStyle = '#2B2320';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.roundRect(-hw, -hh + 24, st.w, st.h - 24, 10);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#C7B69E';
          ctx.fillRect(-30, hh - 5, 60, 10);
          ctx.strokeRect(-30, hh - 5, 60, 10);

          // House warm wall & wooden pillars
          ctx.fillStyle = '#FFFDF9';
          ctx.beginPath();
          ctx.roundRect(-hw + 12, -hh + 26, st.w - 24, st.h - 34, 8);
          ctx.fill();
          ctx.stroke();

          // Wooden archway door & warm windows
          ctx.fillStyle = '#784F32';
          ctx.beginPath();
          ctx.roundRect(-16, 4, 32, hh - 10, [10, 10, 0, 0]);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#FDE68A';
          ctx.fillRect(-hw + 24, 8, 22, 18);
          ctx.strokeRect(-hw + 24, 8, 22, 18);
          ctx.fillRect(hw - 46, 8, 22, 18);
          ctx.strokeRect(hw - 46, 8, 22, 18);

          // Corner pillars
          ctx.fillStyle = '#5C3D2E';
          ctx.fillRect(-hw + 8, -hh + 22, 8, st.h - 28);
          ctx.strokeRect(-hw + 8, -hh + 22, 8, st.h - 28);
          ctx.fillRect(hw - 16, -hh + 22, 8, st.h - 28);
          ctx.strokeRect(hw - 16, -hh + 22, 8, st.h - 28);

          // Lower wide Joglo roof (Pendopo / Rumah Jawa)
          ctx.fillStyle = st.color;
          ctx.beginPath();
          ctx.moveTo(-hw - 12, -hh + 24);
          ctx.lineTo(hw + 12, -hh + 24);
          ctx.lineTo(hw - 18, -hh - 6);
          ctx.lineTo(-hw + 18, -hh - 6);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Upper pitched Joglo crown roof
          ctx.fillStyle = '#5C3D2E';
          ctx.beginPath();
          ctx.moveTo(-hw + 28, -hh - 6);
          ctx.lineTo(hw - 28, -hh - 6);
          ctx.lineTo(0, -hh - 30);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Gold ornament on roof peak
          ctx.fillStyle = '#FACC15';
          ctx.beginPath();
          ctx.arc(0, -hh - 32, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }

        // Station Sign Label with pill-free crisp banner
        ctx.fillStyle = isNear ? '#C85A53' : '#2B2320';
        ctx.font = '700 13px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(st.title, 0, st.h / 2 + 24);

        if (isNear) {
          const bounce = Math.sin(g.tick * 0.14) * 3;
          ctx.fillStyle = '#2B2320';
          ctx.beginPath();
          ctx.roundRect(-56, -st.h / 2 - 58 + bounce, 112, 24, 8);
          ctx.fill();
          ctx.fillStyle = '#FDE68A';
          ctx.font = '700 11px "Plus Jakarta Sans", sans-serif';
          ctx.fillText('Ketuk / Spasi', 0, -st.h / 2 - 42 + bounce);
        }

        ctx.restore();
      }

      // Draw Collectible Floating Hearts
      for (const h of g.hearts) {
        if (h.collected) continue;
        const bob = Math.sin(g.tick * 0.09 + h.id) * 4;
        ctx.save();
        ctx.translate(h.x, h.y + bob);
        ctx.fillStyle = '#E11D48';
        ctx.strokeStyle = '#2B2320';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(0, 7);
        ctx.bezierCurveTo(-11, -3, -9, -13, 0, -5);
        ctx.bezierCurveTo(9, -13, 11, -3, 0, 7);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // Y-Sorted Entities (Trees, Lanterns, NPCs, Partner, Lead Player)
      type Drawable = { y: number; render: () => void };
      const drawables: Drawable[] = [];

      for (const ob of OBSTACLES) {
        if (ob.kind === 'pond') continue;
        drawables.push({
          y: ob.y,
          render: () => {
            if (ob.kind === 'lantern') {
              ctx.fillStyle = '#475569';
              ctx.fillRect(ob.x - 4, ob.y - 26, 8, 26);
              ctx.fillStyle = '#FDE047';
              ctx.strokeStyle = '#2B2320';
              ctx.lineWidth = 1.8;
              ctx.beginPath();
              ctx.arc(ob.x, ob.y - 30, 8, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
            } else {
              // Tree / Blossom
              ctx.fillStyle = 'rgba(43,35,32,0.16)';
              ctx.beginPath();
              ctx.ellipse(ob.x, ob.y + 4, 24, 9, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#784F32';
              ctx.fillRect(ob.x - 7, ob.y - 26, 14, 28);
              ctx.fillStyle = ob.kind === 'blossom' ? '#F9A8D4' : '#4D7C52';
              ctx.strokeStyle = '#2B2320';
              ctx.lineWidth = 2.2;
              ctx.beginPath();
              ctx.arc(ob.x, ob.y - 42, 26, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
            }
          },
        });
      }

      // NPCs
      for (const npc of NPCS) {
        const nearNpc = Math.hypot(g.px - npc.x, g.py - npc.y) < 110;
        drawables.push({
          y: npc.y,
          render: () => {
            ctx.save();
            ctx.translate(npc.x, npc.y);
            ctx.fillStyle = 'rgba(43,35,32,0.15)';
            ctx.beginPath();
            ctx.ellipse(0, 0, 13, 4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = npc.color;
            ctx.strokeStyle = '#2B2320';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(-10, -30, 20, 26, 6);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#F3C9A8';
            ctx.beginPath();
            ctx.arc(0, -40, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = npc.hair;
            ctx.beginPath();
            ctx.arc(0, -43, 12.5, Math.PI, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            if (nearNpc) {
              ctx.fillStyle = '#FFFFFF';
              ctx.strokeStyle = '#2B2320';
              ctx.lineWidth = 1.8;
              ctx.beginPath();
              ctx.roundRect(-115, -86, 230, 28, 8);
              ctx.fill();
              ctx.stroke();
              ctx.fillStyle = '#2B2320';
              ctx.font = '500 11px "Plus Jakarta Sans", sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText(npc.line, 0, -68);
            }
            ctx.restore();
          },
        });
      }

      const leadChar = leadRole === 'groom' ? config.groom : config.bride;
      const partnerChar = leadRole === 'groom' ? config.bride : config.groom;
      const leadName = leadRole === 'groom' ? config.groomNickname : config.brideNickname;
      const partnerName = leadRole === 'groom' ? config.brideNickname : config.groomNickname;
      const blink = Math.sin(g.tick * 0.04) > 0.97;

      drawables.push({
        y: g.partnerY,
        render: () => {
          drawCartoonCharacter({
            ctx,
            char: partnerChar,
            x: g.partnerX,
            y: g.partnerY,
            scale: 0.96,
            direction: g.partnerDir,
            walkPhase: g.partnerPhase,
            isMoving: Math.hypot(targetPX - g.partnerX, targetPY - g.partnerY) > 6,
            blink,
          });
          ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = 'rgba(43,35,32,0.72)';
          ctx.fillText(partnerName, g.partnerX, g.partnerY - 76);
        },
      });

      drawables.push({
        y: g.py,
        render: () => {
          drawCartoonCharacter({
            ctx,
            char: leadChar,
            x: g.px,
            y: g.py,
            scale: 1,
            direction: g.dir,
            walkPhase: g.walkPhase,
            isMoving: g.isMoving,
            blink,
          });
          ctx.font = '700 11px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#2B2320';
          ctx.fillText(leadName, g.px, g.py - 80);
        },
      });

      drawables.sort((a, b) => a.y - b.y);
      for (const d of drawables) d.render();

      // Particles
      for (const p of g.particles) {
        const alpha = 1 - p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      ctx.restore(); // end camera
      ctx.restore(); // end DPR

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [config, leadRole, activeModal, nearbyStation, celebrating, stations, openStationModal]);

  const handleCopyAccount = (id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleRsvpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rsvpName.trim() || !rsvpMsg.trim()) return;
    try {
      const existing: RsvpEntry[] = JSON.parse(localStorage.getItem(RSVP_STORAGE_KEY) || '[]');
      const next: RsvpEntry[] = [
        {
          id: String(Date.now()),
          name: rsvpName.trim(),
          status: rsvpStatus,
          guests: rsvpStatus === 'Hadir' ? 1 : 0,
          message: rsvpMsg.trim(),
          createdAt: 'Baru saja',
        },
        ...existing,
      ];
      localStorage.setItem(RSVP_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
    setRsvpMsg('');
    setRsvpSaved(true);
    setTimeout(() => setRsvpSaved(false), 3000);
  };

  return (
    <div className="relative w-full h-[100dvh] flex flex-col bg-[#FAF6F0] overflow-hidden select-none">
      {/* Top RPG HUD */}
      <header className="relative z-20 flex items-center justify-between gap-4 px-4 sm:px-6 py-3 bg-[#FAF6F0]/95 border-b border-[#E5DDD3]">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-display font-semibold text-base sm:text-lg text-[#2B2320] whitespace-nowrap truncate">
            {config.brideNickname} & {config.groomNickname}
          </span>
          <span className="hidden sm:inline text-[#A6978C]" aria-hidden="true">·</span>
          <span className="hidden sm:inline text-xs font-medium text-[#6B5D54] font-mono-tabular whitespace-nowrap">
            Pos Dikunjungi: {visitedStations.size}/{stations.length}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5 text-xs sm:text-sm font-mono-tabular text-[#2B2320]">
            <Heart className="w-4 h-4 text-[#C85A53] fill-[#C85A53]" aria-hidden="true" />
            <span>{heartsCollected}/{INITIAL_HEARTS.length}</span>
          </div>

          <button
            type="button"
            onClick={onToggleMusic}
            className="flex items-center justify-center w-9 h-9 rounded-lg border border-[#E5DDD3] bg-white text-[#2B2320] hover:bg-[#F3ECE2] transition-colors cursor-pointer"
            title={musicPlaying ? 'Matikan Musik' : 'Putar Musik'}
            aria-label={musicPlaying ? 'Matikan Musik' : 'Putar Musik'}
          >
            {musicPlaying ? (
              <Volume2 className="w-4 h-4 text-[#2E6F5E]" />
            ) : (
              <VolumeX className="w-4 h-4 text-[#8C7B70]" />
            )}
          </button>

          <button
            type="button"
            onClick={onSkipToInvitation}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-[#2B2320] text-[#FAF6F0] hover:bg-[#3F342F] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Lihat Lengkap</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main RPG World Map Canvas */}
      <div ref={containerRef} className="relative flex-1 w-full overflow-hidden">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="block w-full h-full cursor-pointer"
        />

        {/* Subtle Exploration Hint */}
        <div className="hidden md:flex items-center gap-2 absolute top-4 left-6 px-3 py-1.5 rounded-lg bg-white/85 backdrop-blur-sm border border-[#E5DDD3] text-xs text-[#5C4F47] pointer-events-none">
          <span>Klik langsung Rumah Acara / Gazebo untuk berjalan & membuka</span>
          <span aria-hidden="true">·</span>
          <span>Atau gunakan Panah / WASD + Spasi</span>
        </div>

        {/* RPG 4-Way D-Pad + Interact Button */}
        {!activeModal && (
          <div className="absolute bottom-5 inset-x-4 sm:inset-x-8 flex items-end justify-between pointer-events-none">
            {/* 4-Way D-Pad */}
            <div className="grid grid-cols-3 gap-1.5 pointer-events-auto">
              <div />
              <button
                type="button"
                aria-label="Jalan ke Atas"
                onMouseDown={() => {
                  gameRef.current.tapTarget = null;
                  keysRef.current.up = true;
                }}
                onMouseUp={() => (keysRef.current.up = false)}
                onMouseLeave={() => (keysRef.current.up = false)}
                onTouchStart={(e) => {
                  e.preventDefault();
                  gameRef.current.tapTarget = null;
                  keysRef.current.up = true;
                }}
                onTouchEnd={() => (keysRef.current.up = false)}
                className="w-12 h-12 rounded-xl bg-white/90 border-2 border-[#2B2320] shadow-[0_2px_0_#2B2320] active:translate-y-0.5 active:shadow-none flex items-center justify-center text-[#2B2320] cursor-pointer"
              >
                <ChevronUp className="w-6 h-6" />
              </button>
              <div />
              <button
                type="button"
                aria-label="Jalan ke Kiri"
                onMouseDown={() => {
                  gameRef.current.tapTarget = null;
                  keysRef.current.left = true;
                }}
                onMouseUp={() => (keysRef.current.left = false)}
                onMouseLeave={() => (keysRef.current.left = false)}
                onTouchStart={(e) => {
                  e.preventDefault();
                  gameRef.current.tapTarget = null;
                  keysRef.current.left = true;
                }}
                onTouchEnd={() => (keysRef.current.left = false)}
                className="w-12 h-12 rounded-xl bg-white/90 border-2 border-[#2B2320] shadow-[0_2px_0_#2B2320] active:translate-y-0.5 active:shadow-none flex items-center justify-center text-[#2B2320] cursor-pointer"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                type="button"
                aria-label="Jalan ke Bawah"
                onMouseDown={() => {
                  gameRef.current.tapTarget = null;
                  keysRef.current.down = true;
                }}
                onMouseUp={() => (keysRef.current.down = false)}
                onMouseLeave={() => (keysRef.current.down = false)}
                onTouchStart={(e) => {
                  e.preventDefault();
                  gameRef.current.tapTarget = null;
                  keysRef.current.down = true;
                }}
                onTouchEnd={() => (keysRef.current.down = false)}
                className="w-12 h-12 rounded-xl bg-white/90 border-2 border-[#2B2320] shadow-[0_2px_0_#2B2320] active:translate-y-0.5 active:shadow-none flex items-center justify-center text-[#2B2320] cursor-pointer"
              >
                <ChevronDown className="w-6 h-6" />
              </button>
              <button
                type="button"
                aria-label="Jalan ke Kanan"
                onMouseDown={() => {
                  gameRef.current.tapTarget = null;
                  keysRef.current.right = true;
                }}
                onMouseUp={() => (keysRef.current.right = false)}
                onMouseLeave={() => (keysRef.current.right = false)}
                onTouchStart={(e) => {
                  e.preventDefault();
                  gameRef.current.tapTarget = null;
                  keysRef.current.right = true;
                }}
                onTouchEnd={() => (keysRef.current.right = false)}
                className="w-12 h-12 rounded-xl bg-white/90 border-2 border-[#2B2320] shadow-[0_2px_0_#2B2320] active:translate-y-0.5 active:shadow-none flex items-center justify-center text-[#2B2320] cursor-pointer"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            {/* Interact Button */}
            <div className="pointer-events-auto flex flex-col items-end gap-2">
              {nearbyStation && (
                <div className="px-3 py-1.5 rounded-lg bg-[#2B2320] text-[#FAF6F0] text-xs font-medium">
                  Dekat: {nearbyStation.title}
                </div>
              )}
              <button
                type="button"
                disabled={!nearbyStation}
                onClick={() => nearbyStation && openStationModal(nearbyStation.id)}
                className={`h-14 px-6 rounded-2xl font-semibold text-sm border-2 border-[#2B2320] transition-all flex items-center gap-2 ${
                  nearbyStation
                    ? 'bg-[#C85A53] text-white shadow-[0_3px_0_#2B2320] active:translate-y-0.5 active:shadow-none cursor-pointer'
                    : 'bg-white/75 text-[#8C7B70] cursor-not-allowed'
                }`}
              >
                <span>{nearbyStation ? `Buka ${nearbyStation.title}` : 'Dekati Pos'}</span>
              </button>
            </div>
          </div>
        )}

        {/* RPG Dialog Modal for Each Station */}
        {activeModal && (
          <div className="absolute inset-0 z-30 flex items-end sm:items-center justify-center p-4 bg-[#2B2320]/45 backdrop-blur-xs">
            <div className="w-full max-w-lg bg-[#FAF6F0] border-2 border-[#2B2320] rounded-2xl p-6 shadow-[0_8px_0_#2B2320] max-h-[85dvh] overflow-y-auto">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="text-xs font-medium text-[#6B5D54]">
                    {stations.find((s) => s.id === activeModal)?.subtitle}
                  </p>
                  <h3 className="font-display text-2xl font-semibold text-[#2B2320]">
                    {stations.find((s) => s.id === activeModal)?.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  aria-label="Tutup Dialog"
                  className="w-8 h-8 rounded-lg border border-[#E5DDD3] bg-white flex items-center justify-center text-[#5C4F47] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {activeModal === 'mempelai' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      {
                        key: 'bride',
                        photoUrl: config.bridePhotoUrl,
                        fullName: config.brideFullName,
                        parents: config.brideParents,
                        roleLabel: 'Mempelai Wanita',
                      },
                      {
                        key: 'groom',
                        photoUrl: config.groomPhotoUrl,
                        fullName: config.groomFullName,
                        parents: config.groomParents,
                        roleLabel: 'Mempelai Pria',
                      },
                    ].map((person) => (
                      <div key={person.key} className="bg-white border border-[#E5DDD3] rounded-xl p-3 flex flex-col items-center text-center">
                        {person.photoUrl && !brokenPhotos[person.key] ? (
                          <button
                            type="button"
                            onClick={() => setZoomedPhoto({ url: person.photoUrl, label: person.fullName })}
                            className="group relative w-full aspect-[3/4] rounded-xl overflow-hidden border border-[#E5DDD3] mb-3 bg-[#FAF6F0] cursor-pointer"
                            title="Ketuk untuk perbesar foto"
                          >
                            <img
                              src={person.photoUrl}
                              alt={person.fullName}
                              referrerPolicy="no-referrer"
                              onError={() => setBrokenPhotos((prev) => ({ ...prev, [person.key]: true }))}
                              className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                            />
                            <span className="absolute bottom-2 right-2 w-7 h-7 rounded-lg bg-[#2B2320]/75 text-white flex items-center justify-center">
                              <ZoomIn className="w-3.5 h-3.5" />
                            </span>
                          </button>
                        ) : (
                          <div className="w-full aspect-[3/4] rounded-xl border border-[#E5DDD3] mb-3 bg-[#FAF6F0] flex items-center justify-center text-xs text-[#8C7B70]">
                            Foto belum tersedia
                          </div>
                        )}
                        <span className="text-[11px] font-semibold text-[#C85A53] mb-0.5">{person.roleLabel}</span>
                        <p className="font-display text-base font-semibold text-[#2B2320] leading-snug">{person.fullName}</p>
                        <p className="text-xs text-[#6B5D54] mt-1">{person.parents}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm italic text-[#5C4F47] leading-relaxed text-center pt-1">
                    “{config.quote}” — {config.quoteSource}
                  </p>
                </div>
              )}

              {activeModal === 'acara' && (
                <div className="space-y-4">
                  <div className="bg-white border border-[#E5DDD3] rounded-xl p-4 space-y-3">
                    <div>
                      <div className="flex justify-between text-sm">
                        <span className="font-semibold text-[#2E6F5E]">Akad Nikah</span>
                        <span className="font-medium text-[#2B2320]">{config.akadDateDisplay || config.weddingDateDisplay}</span>
                      </div>
                      <p className="text-xs text-[#5C4F47] text-right mt-0.5">{config.akadTime}</p>
                    </div>
                    <div className="pt-2 border-t border-[#E5DDD3]">
                      <div className="flex justify-between text-sm">
                        <span className="font-semibold text-[#C85A53]">Resepsi</span>
                        <span className="font-medium text-[#2B2320]">{config.resepsiDateDisplay || config.weddingDateDisplay}</span>
                      </div>
                      <p className="text-xs text-[#5C4F47] text-right mt-0.5">{config.resepsiTime}</p>
                    </div>
                    <div className="pt-2 border-t border-[#E5DDD3]">
                      <p className="text-sm font-semibold text-[#2B2320]">{config.venueName}</p>
                      <p className="text-xs text-[#6B5D54] mt-0.5 leading-relaxed">{config.venueAddress}</p>
                    </div>
                  </div>
                  <a
                    href={config.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#2E6F5E] text-white text-sm font-semibold hover:bg-[#24594B]"
                  >
                    <MapPin className="w-4 h-4" />
                    <span>Buka Google Maps</span>
                  </a>
                </div>
              )}

              {activeModal === 'amplop' && (
                <div className="space-y-3">
                  <p className="text-xs text-[#5C4F47] leading-relaxed">
                    Doa restu dan kehadiran Anda adalah hadiah terindah bagi kami. Nomor rekening tidak dicantumkan (tampilan di bawah ini hanya sebagai contoh).
                  </p>
                  {config.gifts.map((g) => {
                    const isExample = g.accountNumber.includes('XXXX') || g.accountNumber.toLowerCase().includes('contoh');
                    return (
                      <div key={g.id} className="bg-white border border-[#E5DDD3] rounded-xl p-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold text-[#6B5D54]">{g.bankName}</p>
                          <p className="font-mono-tabular text-sm font-bold text-[#2B2320]">{g.accountNumber}</p>
                          <p className="text-xs text-[#5C4F47]">a.n. {g.accountHolder}</p>
                        </div>
                        {!isExample && (
                          <button
                            type="button"
                            onClick={() => handleCopyAccount(g.id, g.accountNumber)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E5DDD3] bg-[#FAF6F0] text-xs font-semibold cursor-pointer"
                          >
                            {copiedId === g.id ? <Check className="w-3.5 h-3.5 text-[#2E6F5E]" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedId === g.id ? 'Tersalin' : 'Salin'}</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {activeModal === 'rsvp' && (
                <form onSubmit={handleRsvpSubmit} className="space-y-3">
                  <input
                    type="text"
                    required
                    placeholder="Nama Anda"
                    value={rsvpName}
                    onChange={(e) => setRsvpName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DDD3] text-sm"
                  />
                  <select
                    value={rsvpStatus}
                    onChange={(e) => setRsvpStatus(e.target.value as 'Hadir' | 'Ragu' | 'Tidak Hadir')}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DDD3] text-sm"
                  >
                    <option value="Hadir">InsyaAllah Hadir</option>
                    <option value="Ragu">Masih Ragu</option>
                    <option value="Tidak Hadir">Berhalangan</option>
                  </select>
                  <textarea
                    required
                    rows={2}
                    placeholder="Tuliskan doa & ucapan..."
                    value={rsvpMsg}
                    onChange={(e) => setRsvpMsg(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DDD3] text-sm"
                  />
                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#2B2320] text-white text-sm font-semibold cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Kirim Ucapan</span>
                  </button>
                  {rsvpSaved && (
                    <p className="text-xs font-medium text-[#2E6F5E]">Ucapan Anda berhasil disimpan!</p>
                  )}
                </form>
              )}

              {activeModal === 'pelaminan' && (
                <div className="text-center space-y-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#C85A53]/12 text-[#C85A53]">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <p className="text-sm text-[#4A3F39] leading-relaxed">
                    Terima kasih telah menjelajahi taman pernikahan {config.brideNickname} &amp; {config.groomNickname}. Kami menantikan kehadiran serta doa restu Anda di hari bahagia kami!
                  </p>
                  <button
                    type="button"
                    onClick={onCompleteGame}
                    className="w-full py-3 px-5 rounded-xl bg-[#C85A53] text-white font-semibold text-sm hover:bg-[#B24B44] cursor-pointer"
                  >
                    Buka Halaman Undangan Lengkap
                  </button>
                </div>
              )}

              {activeModal !== 'pelaminan' && (
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="w-full mt-4 py-2.5 px-4 rounded-xl border border-[#D6C7B2] bg-white text-xs font-semibold text-[#2B2320] hover:bg-[#F3ECE2] cursor-pointer"
                >
                  Lanjut Jelajahi Peta
                </button>
              )}
            </div>
          </div>
        )}

        {/* Photo Zoom Lightbox */}
        {zoomedPhoto && (
          <div
            onClick={() => setZoomedPhoto(null)}
            className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-[#2B2320]/80 backdrop-blur-xs cursor-pointer"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-md w-full bg-[#FAF6F0] border-2 border-[#2B2320] rounded-2xl p-3 shadow-[0_8px_0_#2B2320]"
            >
              <button
                type="button"
                onClick={() => setZoomedPhoto(null)}
                aria-label="Tutup Foto"
                className="absolute top-5 right-5 z-10 w-9 h-9 rounded-xl bg-white/95 border border-[#2B2320] flex items-center justify-center text-[#2B2320] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <img
                src={zoomedPhoto.url}
                alt={zoomedPhoto.label}
                referrerPolicy="no-referrer"
                className="w-full max-h-[72dvh] object-contain rounded-xl bg-white"
              />
              <p className="font-display text-base font-semibold text-[#2B2320] text-center mt-3 mb-1">
                {zoomedPhoto.label}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
