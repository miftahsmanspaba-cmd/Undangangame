import { WeddingConfig } from '../types/wedding';

/**
 * Generates a 100% self-contained single-file HTML5 Top-Down RPG game + wedding invitation
 * ready to upload directly to GitHub & enable GitHub Pages.
 */
export function generateStandaloneHtml(config: WeddingConfig): string {
  const safeJson = JSON.stringify(config).replace(/<\/script>/gi, '<\\/script>');

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>Pernikahan ${escapeHtml(config.brideNickname)} &amp; ${escapeHtml(config.groomNickname)} — Interactive RPG</title>
  <meta name="description" content="Undangan pernikahan interaktif ${escapeHtml(config.brideFullName)} &amp; ${escapeHtml(config.groomFullName)}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600;700&family=JetBrains+Mono:wght@500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; background: #FAF6F0; color: #2B2320; overflow-x: hidden; }
    h1, h2, h3, .font-display { font-family: 'Fraunces', Georgia, serif; }
    .mono { font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; }
    .hidden { display: none !important; }
    button, a.btn { cursor: pointer; font-family: inherit; text-decoration: none; }
    .cover-wrap { min-height: 100dvh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; text-align: center; background: linear-gradient(180deg, #DDEFF8 0%, #FAF6F0 65%); }
    .cover-card { max-width: 560px; width: 100%; background: #FFFFFF; border: 2px solid #2B2320; border-radius: 24px; padding: 32px 24px; box-shadow: 0 8px 0 #2B2320; }
    .preview-row { display: flex; justify-content: center; gap: 20px; margin: 16px 0 20px; }
    .btn-primary { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 14px 24px; border-radius: 14px; background: #C85A53; color: #fff; font-weight: 600; font-size: 15px; border: 2px solid #2B2320; box-shadow: 0 3px 0 #2B2320; }
    .btn-secondary { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 20px; border-radius: 14px; background: #FAF6F0; color: #2B2320; font-weight: 600; font-size: 14px; border: 1px solid #D6C7B2; }
    .role-pick { display: flex; justify-content: center; gap: 10px; margin: 14px 0 22px; }
    .role-btn { padding: 8px 14px; border-radius: 10px; border: 1px solid #D6C7B2; background: #FAF6F0; font-size: 13px; font-weight: 600; color: #5C4F47; }
    .role-btn.active { background: #2E6F5E; color: #fff; border-color: #2E6F5E; }
    .game-shell { position: relative; width: 100%; height: 100dvh; display: flex; flex-direction: column; overflow: hidden; user-select: none; }
    .game-hud { display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; background: #FAF6F0; border-bottom: 1px solid #E5DDD3; z-index: 10; }
    .canvas-wrap { position: relative; flex: 1; width: 100%; overflow: hidden; }
    canvas#gameCanvas { width: 100%; height: 100%; display: block; cursor: pointer; }
    .touch-controls { position: absolute; bottom: 18px; left: 18px; right: 18px; display: flex; align-items: flex-end; justify-content: space-between; pointer-events: none; z-index: 15; }
    .dpad { display: grid; grid-template-columns: repeat(3, 46px); gap: 5px; pointer-events: auto; }
    .pad-btn { width: 46px; height: 46px; border-radius: 12px; background: rgba(255,255,255,0.92); border: 2px solid #2B2320; box-shadow: 0 2px 0 #2B2320; font-size: 18px; font-weight: 700; color: #2B2320; }
    .act-btn { height: 52px; padding: 0 20px; border-radius: 14px; background: #C85A53; color: #fff; border: 2px solid #2B2320; box-shadow: 0 3px 0 #2B2320; font-size: 13px; font-weight: 700; pointer-events: auto; }
    .act-btn:disabled { background: rgba(255,255,255,0.75); color: #8C7B70; box-shadow: none; cursor: not-allowed; }
    .modal-backdrop { position: absolute; inset: 0; background: rgba(43,35,32,0.48); display: flex; align-items: center; justify-content: center; padding: 16px; z-index: 30; }
    .modal-box { max-width: 480px; width: 100%; background: #FAF6F0; border: 2px solid #2B2320; border-radius: 20px; padding: 24px; box-shadow: 0 8px 0 #2B2320; max-height: 85dvh; overflow-y: auto; }
    .inv-nav { position: sticky; top: 0; background: rgba(250,246,240,0.95); border-bottom: 1px solid #E5DDD3; padding: 14px 24px; display: flex; align-items: center; justify-content: space-between; z-index: 20; }
    .container { max-width: 960px; margin: 0 auto; padding: 40px 20px; }
    .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; }
    .card { background: #fff; border: 1px solid #E5DDD3; border-radius: 20px; padding: 24px; }
    .countdown-box { background: #2B2320; color: #FAF6F0; border-radius: 20px; padding: 24px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 20px; margin-top: 28px; }
    .cd-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; text-align: center; }
    .cd-val { font-size: 28px; font-weight: 700; color: #FDE68A; }
    input, select, textarea { width: 100%; padding: 10px 14px; border-radius: 12px; border: 1px solid #D6C7B2; background: #fff; font-family: inherit; font-size: 14px; margin-top: 6px; }
  </style>
</head>
<body>
  <!-- COVER VIEW -->
  <section id="view-cover" class="cover-wrap">
    <div class="cover-card">
      <p style="font-size:12px; color:#6B5D54; margin-bottom:6px;">Undangan Pernikahan Interaktif · <span id="cover-date"></span></p>
      <h1 id="cover-title" style="font-size:34px; margin-bottom:8px;"></h1>
      <p id="cover-guest" style="font-size:14px; color:#5C4F47; margin-bottom:8px;"></p>
      <div class="preview-row">
        <canvas id="preview-groom" width="110" height="110"></canvas>
        <canvas id="preview-bride" width="110" height="110"></canvas>
      </div>
      <div class="role-pick">
        <button type="button" id="pick-groom" class="role-btn active" onclick="selectRole('groom')">Main: <span id="lbl-groom"></span></button>
        <button type="button" id="pick-bride" class="role-btn" onclick="selectRole('bride')">Main: <span id="lbl-bride"></span></button>
      </div>
      <div style="display:flex; flex-direction:column; gap:10px;">
        <button type="button" class="btn-primary" onclick="startAdventure()">Mulai Petualangan &amp; Putar Musik</button>
        <button type="button" class="btn-secondary" onclick="openInvitation()">Lewati Langsung ke Undangan</button>
      </div>
    </div>
  </section>

  <!-- GAME VIEW -->
  <section id="view-game" class="game-shell hidden">
    <header class="game-hud">
      <div style="font-weight:700; font-size:15px;" id="hud-title"></div>
      <div style="display:flex; align-items:center; gap:10px;">
        <span class="mono" style="font-size:13px;" id="hud-hearts">♥ 0/10</span>
        <button type="button" class="btn-secondary" style="padding:6px 10px; font-size:12px;" onclick="toggleMusic()" id="btn-music-game">Musik</button>
        <button type="button" class="btn-secondary" style="padding:6px 12px; font-size:12px; background:#2B2320; color:#fff; border-color:#2B2320;" onclick="openInvitation()">Lihat Lengkap</button>
      </div>
    </header>
    <div class="canvas-wrap">
      <canvas id="gameCanvas"></canvas>
      <div class="touch-controls">
        <div class="dpad">
          <div></div>
          <button type="button" class="pad-btn" onmousedown="keys.up=true" onmouseup="keys.up=false" onmouseleave="keys.up=false" ontouchstart="event.preventDefault();keys.up=true" ontouchend="keys.up=false">▲</button>
          <div></div>
          <button type="button" class="pad-btn" onmousedown="keys.left=true" onmouseup="keys.left=false" onmouseleave="keys.left=false" ontouchstart="event.preventDefault();keys.left=true" ontouchend="keys.left=false">◀</button>
          <button type="button" class="pad-btn" onmousedown="keys.down=true" onmouseup="keys.down=false" onmouseleave="keys.down=false" ontouchstart="event.preventDefault();keys.down=true" ontouchend="keys.down=false">▼</button>
          <button type="button" class="pad-btn" onmousedown="keys.right=true" onmouseup="keys.right=false" onmouseleave="keys.right=false" ontouchstart="event.preventDefault();keys.right=true" ontouchend="keys.right=false">▶</button>
        </div>
        <button type="button" id="btn-interact" class="act-btn" disabled onclick="openNearby()">Dekati Pos</button>
      </div>

      <div id="station-modal" class="modal-backdrop hidden">
        <div class="modal-box">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h3 id="st-title" style="font-size:22px;"></h3>
            <button type="button" class="btn-secondary" style="padding:4px 10px;" onclick="closeModal()">✕</button>
          </div>
          <div id="st-body" style="font-size:14px; line-height:1.6; color:#4A3F39; margin-bottom:16px;"></div>
          <button type="button" class="btn-primary" style="width:100%; background:#2E6F5E;" onclick="closeModal()">Lanjut Jelajahi Peta</button>
        </div>
      </div>
    </div>
  </section>

  <!-- INVITATION VIEW -->
  <section id="view-invitation" class="hidden">
    <header class="inv-nav">
      <strong class="font-display" style="font-size:18px;" id="inv-brand"></strong>
      <div style="display:flex; gap:10px; align-items:center;">
        <button type="button" class="btn-secondary" style="padding:7px 12px; font-size:12px;" onclick="toggleMusic()" id="btn-music-inv">Musik</button>
        <button type="button" class="btn-primary" style="padding:8px 14px; font-size:12px;" onclick="startAdventure()">Mainkan Game</button>
      </div>
    </header>
    <div class="container">
      <div style="text-align:center; max-width:640px; margin:0 auto 36px;">
        <p style="font-size:12px; color:#C85A53; font-weight:600; margin-bottom:8px;">Undangan Pernikahan</p>
        <h1 id="inv-title" style="font-size:40px; margin-bottom:12px;"></h1>
        <p id="inv-quote" style="font-size:15px; font-style:italic; color:#5C4F47; line-height:1.6;"></p>
      </div>
      <div class="grid-2">
        <div class="card" style="text-align:center;">
          <img id="inv-groom-photo" alt="Mempelai Pria" referrerpolicy="no-referrer" style="display:none; width:160px; height:210px; object-fit:cover; object-position:top; border-radius:16px; border:1px solid #E5DDD3; margin:0 auto 12px;" />
          <canvas id="inv-groom" width="120" height="120" style="margin:0 auto 10px;"></canvas>
          <h2 id="inv-groom-name" style="font-size:22px;"></h2>
          <p id="inv-groom-parents" style="font-size:13px; color:#6B5D54; margin-top:4px;"></p>
        </div>
        <div class="card" style="text-align:center;">
          <img id="inv-bride-photo" alt="Mempelai Wanita" referrerpolicy="no-referrer" style="display:none; width:160px; height:210px; object-fit:cover; object-position:top; border-radius:16px; border:1px solid #E5DDD3; margin:0 auto 12px;" />
          <canvas id="inv-bride" width="120" height="120" style="margin:0 auto 10px;"></canvas>
          <h2 id="inv-bride-name" style="font-size:22px;"></h2>
          <p id="inv-bride-parents" style="font-size:13px; color:#6B5D54; margin-top:4px;"></p>
        </div>
      </div>
      <div class="countdown-box">
        <div>
          <div style="font-size:12px; color:#D6C7B2;">Menuju Hari Bahagia</div>
          <div id="inv-date" class="font-display" style="font-size:22px; font-weight:600;"></div>
        </div>
        <div class="cd-grid mono">
          <div><div class="cd-val" id="cd-d">00</div><div style="font-size:11px;">Hari</div></div>
          <div><div class="cd-val" id="cd-h">00</div><div style="font-size:11px;">Jam</div></div>
          <div><div class="cd-val" id="cd-m">00</div><div style="font-size:11px;">Menit</div></div>
          <div><div class="cd-val" id="cd-s">00</div><div style="font-size:11px;">Detik</div></div>
        </div>
      </div>
      <h2 style="font-size:28px; margin:48px 0 18px;">Waktu &amp; Lokasi</h2>
      <div class="grid-2">
        <div class="card">
          <h3 style="font-size:20px; margin-bottom:6px;">Akad Nikah</h3>
          <p id="inv-akad" style="font-size:14px; color:#2E6F5E; font-weight:600; margin-bottom:10px;"></p>
          <p id="inv-venue-1" style="font-weight:600;"></p>
          <p id="inv-addr-1" style="font-size:13px; color:#6B5D54; margin-top:4px;"></p>
        </div>
        <div class="card">
          <h3 style="font-size:20px; margin-bottom:6px;">Resepsi</h3>
          <p id="inv-resepsi" style="font-size:14px; color:#C85A53; font-weight:600; margin-bottom:10px;"></p>
          <p id="inv-venue-2" style="font-weight:600;"></p>
          <p id="inv-addr-2" style="font-size:13px; color:#6B5D54; margin-top:4px;"></p>
        </div>
      </div>
      <div style="margin-top:18px;">
        <a id="inv-maps" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="background:#2E6F5E;">Buka Google Maps</a>
      </div>
      <h2 style="font-size:28px; margin:48px 0 8px;">Amplop Digital</h2>
      <p style="font-size:14px; color:#5C4F47; margin-bottom:16px;">Doa restu dan kehadiran Anda adalah hadiah terindah bagi kami. Nomor rekening tidak dicantumkan (hanya contoh tampilan).</p>
      <div id="inv-gifts" class="grid-2"></div>
      <h2 style="font-size:28px; margin:48px 0 18px;">Ucapan &amp; RSVP</h2>
      <div class="grid-2">
        <div class="card">
          <form onsubmit="submitRsvp(event)" style="display:flex; flex-direction:column; gap:12px;">
            <div><label style="font-size:12px; font-weight:600;">Nama</label><input id="rsvp-name" required /></div>
            <div><label style="font-size:12px; font-weight:600;">Kehadiran</label><select id="rsvp-status"><option value="Hadir">InsyaAllah Hadir</option><option value="Ragu">Masih Ragu</option><option value="Tidak Hadir">Berhalangan</option></select></div>
            <div><label style="font-size:12px; font-weight:600;">Doa &amp; Ucapan</label><textarea id="rsvp-msg" rows="3" required></textarea></div>
            <button type="submit" class="btn-primary" style="background:#2B2320;">Kirim Ucapan</button>
            <button type="button" class="btn-secondary" onclick="sendWa()">Konfirmasi via WhatsApp</button>
          </form>
        </div>
        <div id="rsvp-list" style="display:flex; flex-direction:column; gap:12px;"></div>
      </div>
    </div>
  </section>

  <script>
    window.__WEDDING_CONFIG__ = ${safeJson};
  </script>
  <script>
    (function() {
      const cfg = window.__WEDDING_CONFIG__;
      const params = new URLSearchParams(window.location.search);
      const guestName = params.get('to') || 'Bapak/Ibu/Sahabat';
      let leadRole = 'groom';
      const imgCache = {};

      function getImg(url) {
        if (!url) return null;
        if (!imgCache[url]) { const im = new Image(); im.src = url; imgCache[url] = im; }
        return imgCache[url].complete ? imgCache[url] : null;
      }

      function drawChar(ctx, char, x, y, scale, dir, phase, moving) {
        const effFacing = dir === 'left' ? -1 : 1;
        const isFront = dir === 'down';
        const isBack = dir === 'up';
        ctx.save(); ctx.translate(x, y); ctx.scale(scale * effFacing, scale);
        const legSwing = moving ? Math.sin(phase) * 0.5 : 0;
        const armSwing = moving ? -Math.sin(phase) * 0.45 : 0;
        const bounce = moving ? Math.abs(Math.sin(phase)) * -3.5 : Math.sin(phase * 0.4) * 0.8;
        ctx.fillStyle = 'rgba(43,35,32,0.16)'; ctx.beginPath(); ctx.ellipse(0, 0, 15, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.translate(0, bounce);

        const isDress = char.role === 'bride';
        const topColor = char.role === 'groom'
          ? (char.outfit === 'beskap_hitam_emas' ? '#1A181D' : char.outfit === 'beskap_jawa' ? '#273A32' : '#263248')
          : (char.outfit === 'kebaya_hitam_emas' ? '#1A181D' : char.outfit === 'white_gown' ? '#FFFFFF' : '#F4DFD8');
        const bottomColor = char.role === 'groom'
          ? (char.outfit === 'beskap_hitam_emas' ? '#3B2820' : char.outfit === 'beskap_jawa' ? '#784F32' : '#1E293B')
          : (char.outfit === 'kebaya_hitam_emas' ? '#3B2820' : char.outfit === 'white_gown' ? '#FAF6F0' : '#8C5E3C');
        const OUTLINE = '#2B2320';

        if (!isDress || char.outfit === 'kebaya_modern' || char.outfit === 'kebaya_hitam_emas' || char.outfit === 'kurung_songket') {
          [-5, 5].forEach((lx, i) => {
            ctx.save(); ctx.translate(lx, -14); ctx.rotate(i === 0 ? -legSwing : legSwing);
            ctx.fillStyle = bottomColor; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.2;
            ctx.beginPath(); ctx.roundRect(-3.5, 0, 7, 11, 3); ctx.fill(); ctx.stroke();
            ctx.fillStyle = char.role === 'groom' ? '#2B2320' : '#C85A53';
            ctx.beginPath(); ctx.roundRect(-3.5, 9, 9, 5, 2.5); ctx.fill(); ctx.stroke();
            ctx.restore();
          });
        }
        ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.3;
        if (isDress) {
          ctx.fillStyle = bottomColor;
          ctx.beginPath(); ctx.moveTo(-9, -21); ctx.lineTo(9, -21); ctx.lineTo(15, -2); ctx.quadraticCurveTo(0, 1, -15, -2); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillStyle = topColor; ctx.beginPath(); ctx.roundRect(-10, -34, 20, 15, 5); ctx.fill(); ctx.stroke();
          if (char.outfit === 'kebaya_hitam_emas') {
            ctx.strokeStyle = '#FACC15'; ctx.lineWidth = 1.6;
            ctx.beginPath(); ctx.moveTo(-3.5, -33); ctx.lineTo(-3.5, -20); ctx.moveTo(3.5, -33); ctx.lineTo(3.5, -20); ctx.stroke();
            ctx.fillStyle = '#FDE047'; ctx.beginPath(); ctx.arc(0, -28, 2.2, 0, Math.PI * 2); ctx.fill();
          }
        } else {
          ctx.fillStyle = topColor; ctx.beginPath(); ctx.roundRect(-11, -34, 22, 21, 5); ctx.fill(); ctx.stroke();
          if (char.outfit === 'beskap_hitam_emas') {
            ctx.strokeStyle = '#FACC15'; ctx.lineWidth = 1.8;
            ctx.beginPath(); ctx.moveTo(-5, -33); ctx.lineTo(0, -29); ctx.lineTo(5, -33); ctx.stroke();
            ctx.beginPath(); ctx.arc(0, -24, 3.5, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
          }
        }
        ctx.save(); ctx.translate(9, -30); ctx.rotate(armSwing);
        ctx.fillStyle = topColor; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.roundRect(-3, 0, 6, 13, 3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = char.skinTone; ctx.beginPath(); ctx.arc(0, 14, 3.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.restore();

        ctx.save(); ctx.translate(0, -52);
        const pImg = char.faceMode === 'photo' && char.photoCartoonUrl ? getImg(char.photoCartoonUrl) : null;
        if (char.faceMode === 'photo' && pImg) {
          ctx.beginPath(); ctx.ellipse(0, 0, 18.5, 20, 0, 0, Math.PI * 2);
          ctx.fillStyle = isBack ? char.hairColor : char.skinTone; ctx.fill();
          if (!isBack) { ctx.save(); ctx.clip(); ctx.scale(effFacing, 1); ctx.drawImage(pImg, -19.5, -21, 39, 42); ctx.restore(); }
          ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5; ctx.stroke();
        } else if (isBack) {
          ctx.fillStyle = char.hairColor; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.4;
          ctx.beginPath(); ctx.ellipse(0, 0, 17, 18, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        } else {
          if (char.hairStyle && char.hairStyle.indexOf('hijab') === 0) {
            ctx.fillStyle = char.hairColor; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.4;
            ctx.beginPath(); ctx.moveTo(-19, -2); ctx.arc(0, -2, 19.5, Math.PI, 0); ctx.lineTo(17, 17); ctx.quadraticCurveTo(0, 22, -17, 17); ctx.closePath(); ctx.fill(); ctx.stroke();
          } else if (char.hairStyle === 'long_wavy') {
            ctx.fillStyle = char.hairColor; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.3;
            ctx.beginPath(); ctx.roundRect(-19, -15, 38, 34, 14); ctx.fill(); ctx.stroke();
          }
          ctx.fillStyle = char.skinTone; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.4;
          ctx.beginPath(); ctx.ellipse(0, 1, 16.5, 17.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          const lx = isFront ? -5.8 : -3.5, rx = isFront ? 5.8 : 8.5;
          ctx.fillStyle = '#231F20';
          ctx.beginPath(); ctx.ellipse(lx, 0, 2.4, 3.2, 0, 0, Math.PI * 2); ctx.ellipse(rx, 0, 2.4, 3.2, 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#7C2D2D'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(isFront ? 0 : 2.5, 6.2, 4.2, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
          if (char.glasses && char.glasses !== 'none') {
            ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.8;
            ctx.strokeRect(lx - 4.5, -3.5, 9, 7); ctx.strokeRect(rx - 4.5, -3.5, 9, 7);
          }
          ctx.fillStyle = char.hairColor; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.2;
          ctx.beginPath(); ctx.arc(0, -3, 17.5, Math.PI * 1.02, Math.PI * 1.98); ctx.quadraticCurveTo(8, -8, 0, -11); ctx.quadraticCurveTo(-8, -7, -17.5, -3); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
        if (char.accessory === 'blangkon') {
          ctx.fillStyle = '#5C4433'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(0, -12, 16.5, 7.5, 0, Math.PI, Math.PI * 2); ctx.lineTo(16.5, -8); ctx.quadraticCurveTo(0, -11, -16.5, -8); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.strokeStyle = '#C7A97C'; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(-11, -13); ctx.lineTo(0, -10); ctx.lineTo(11, -13); ctx.stroke();
        } else if (char.accessory === 'cunduk_mentul') {
          [-6, 4].forEach((mx, idx) => {
            const ang = idx === 0 ? -0.22 : 0.12;
            ctx.save(); ctx.translate(mx, -18); ctx.rotate(ang);
            ctx.strokeStyle = '#D97706'; ctx.lineWidth = 1.8;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -11); ctx.stroke();
            ctx.fillStyle = '#FACC15'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.arc(0, -12, 3.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.restore();
          });
        }
        ctx.restore(); ctx.restore();
      }

      // Music Engine
      let audioCtx = null, musicTimer = null, musicOn = false, step = 0, customAudio = null;
      const NOTES = [76, 74, 72, 71, 69, 67, 65, 67, 69, 72, 71, 72, 74, 76, 74, 79];
      function playFreq(f, d) {
        if (!audioCtx) return;
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = cfg.musicTrack === 'bahagia_8bit' ? 'square' : 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0.001, audioCtx.currentTime);
        g.gain.linearRampToValueAtTime(0.09, audioCtx.currentTime + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + d);
        o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + d + 0.03);
      }
      window.toggleMusic = function(forceStart) {
        if (forceStart && musicOn) return;
        if (musicOn) {
          musicOn = false; clearInterval(musicTimer); if (customAudio) customAudio.pause();
        } else {
          musicOn = true;
          if (cfg.musicTrack === 'custom' && cfg.customMusicDataUrl) {
            if (!customAudio) { customAudio = new Audio(cfg.customMusicDataUrl); customAudio.loop = true; }
            customAudio.play().catch(function(){});
          } else {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') audioCtx.resume();
            musicTimer = setInterval(function() { playFreq(440 * Math.pow(2, (NOTES[step++ % NOTES.length] - 69) / 12), 0.42); }, 380);
          }
        }
        const txt = musicOn ? 'Musik: ON' : 'Musik: OFF';
        document.getElementById('btn-music-game').textContent = txt;
        document.getElementById('btn-music-inv').textContent = txt;
      };

      // Populate UI
      document.getElementById('cover-date').textContent = cfg.weddingDateDisplay;
      document.getElementById('cover-title').textContent = cfg.brideNickname + ' & ' + cfg.groomNickname;
      document.getElementById('cover-guest').textContent = 'Kepada Yth. ' + guestName;
      document.getElementById('lbl-groom').textContent = cfg.groomNickname;
      document.getElementById('lbl-bride').textContent = cfg.brideNickname;
      document.getElementById('hud-title').textContent = cfg.brideNickname + ' & ' + cfg.groomNickname;
      document.getElementById('inv-brand').textContent = cfg.brideNickname + ' & ' + cfg.groomNickname;
      document.getElementById('inv-title').textContent = cfg.brideNickname + ' & ' + cfg.groomNickname;
      document.getElementById('inv-quote').textContent = '“' + cfg.quote + '” — ' + cfg.quoteSource;
      document.getElementById('inv-groom-name').textContent = cfg.groomFullName;
      document.getElementById('inv-groom-parents').textContent = cfg.groomParents;
      document.getElementById('inv-bride-name').textContent = cfg.brideFullName;
      document.getElementById('inv-bride-parents').textContent = cfg.brideParents;
      document.getElementById('inv-date').textContent = cfg.weddingDateDisplay;
      document.getElementById('inv-akad').textContent = (cfg.akadDateDisplay || cfg.weddingDateDisplay) + ' · ' + cfg.akadTime;
      document.getElementById('inv-resepsi').textContent = (cfg.resepsiDateDisplay || cfg.weddingDateDisplay) + ' · ' + cfg.resepsiTime;
      document.getElementById('inv-venue-1').textContent = cfg.venueName;
      document.getElementById('inv-addr-1').textContent = cfg.venueAddress;
      document.getElementById('inv-venue-2').textContent = cfg.venueName;
      document.getElementById('inv-addr-2').textContent = cfg.venueAddress;
      document.getElementById('inv-maps').href = cfg.mapsUrl;
      document.getElementById('rsvp-name').value = guestName === 'Bapak/Ibu/Sahabat' ? '' : guestName;
      if (cfg.groomPhotoUrl) {
        const gp = document.getElementById('inv-groom-photo');
        gp.src = cfg.groomPhotoUrl;
        gp.style.display = 'block';
      }
      if (cfg.bridePhotoUrl) {
        const bp = document.getElementById('inv-bride-photo');
        bp.src = cfg.bridePhotoUrl;
        bp.style.display = 'block';
      }

      cfg.gifts.forEach(function(g) {
        const el = document.createElement('div'); el.className = 'card';
        el.innerHTML = '<div style="font-size:12px;color:#6B5D54;">' + g.bankName + '</div><div class="mono" style="font-size:20px;font-weight:700;margin:4px 0;">' + g.accountNumber + '</div><div style="font-size:13px;color:#5C4F47;">a.n. ' + g.accountHolder + '</div>';
        document.getElementById('inv-gifts').appendChild(el);
      });

      function renderStaticAvatars() {
        const pg = document.getElementById('preview-groom').getContext('2d');
        pg.clearRect(0,0,110,110); drawChar(pg, cfg.groom, 55, 96, 1.25, 'down', 0, false);
        const pb = document.getElementById('preview-bride').getContext('2d');
        pb.clearRect(0,0,110,110); drawChar(pb, cfg.bride, 55, 96, 1.25, 'down', 0, false);
        const ig = document.getElementById('inv-groom').getContext('2d');
        ig.clearRect(0,0,120,120); drawChar(ig, cfg.groom, 60, 105, 1.35, 'down', 0, false);
        const ib = document.getElementById('inv-bride').getContext('2d');
        ib.clearRect(0,0,120,120); drawChar(ib, cfg.bride, 60, 105, 1.35, 'down', 0, false);
      }
      setTimeout(renderStaticAvatars, 200);

      window.selectRole = function(r) {
        leadRole = r;
        document.getElementById('pick-groom').classList.toggle('active', r === 'groom');
        document.getElementById('pick-bride').classList.toggle('active', r === 'bride');
      };

      // Top-Down RPG State
      window.keys = { up: false, down: false, left: false, right: false };
      let gRunning = false, nearbySt = null, modalOpen = false, pendingOpenId = null;
      const gState = { px: 720, py: 950, dir: 'up', phase: 0, partnerX: 668, partnerY: 960, partnerDir: 'up', camX: 0, camY: 0, tap: null, hearts: 0, tick: 0 };
      const STATIONS = [
        { id: 'mempelai', title: 'Gazebo Mempelai', x: 720, y: 795, w: 196, h: 118, color: '#2E6F5E' },
        { id: 'acara', title: (cfg.acaraStationName || 'Joglo Akad & Resepsi'), x: 320, y: 540, w: 186, h: 118, color: '#C85A53' },
        { id: 'rsvp', title: 'Gazebo Buku Tamu', x: 1120, y: 540, w: 180, h: 112, color: '#2E6F5E' },
        { id: 'amplop', title: 'Rumah Amplop Digital', x: 340, y: 280, w: 170, h: 108, color: '#B45309' },
        { id: 'pelaminan', title: 'Pelaminan Agung', x: 720, y: 195, w: 248, h: 124, color: '#C85A53' }
      ];
      const ITEMS = [[720,680],[560,550],[430,550],[880,550],[990,550],[720,450],[520,310],[950,340],[720,330],[640,260]].map(p => ({ x: p[0], y: p[1], got: false }));

      window.addEventListener('keydown', function(e) {
        if (modalOpen) { if (e.code === 'Escape') closeModal(); return; }
        if (e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); gState.tap = null; pendingOpenId = null; keys.up = true; }
        if (e.code === 'ArrowDown' || e.code === 'KeyS') { e.preventDefault(); gState.tap = null; pendingOpenId = null; keys.down = true; }
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') { gState.tap = null; pendingOpenId = null; keys.left = true; }
        if (e.code === 'ArrowRight' || e.code === 'KeyD') { gState.tap = null; pendingOpenId = null; keys.right = true; }
        if ((e.code === 'Space' || e.code === 'Enter') && nearbySt) { e.preventDefault(); openStation(nearbySt); }
      });
      window.addEventListener('keyup', function(e) {
        if (e.code === 'ArrowUp' || e.code === 'KeyW') keys.up = false;
        if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.down = false;
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
        if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
      });

      document.getElementById('gameCanvas').addEventListener('click', function(e) {
        if (modalOpen) return;
        const r = this.getBoundingClientRect();
        const cx = e.clientX - r.left + gState.camX, cy = e.clientY - r.top + gState.camY;
        const clicked = STATIONS.find(s => Math.abs(cx - s.x) < s.w * 0.6 && Math.abs(cy - s.y) < s.h * 0.72);
        if (clicked) {
          const iy = clicked.id === 'pelaminan' ? clicked.y + 38 : clicked.y + clicked.h * 0.56;
          if (Math.hypot(gState.px - clicked.x, gState.py - iy) < 115) {
            openStation(clicked); return;
          }
          pendingOpenId = clicked.id;
          gState.tap = { x: clicked.x, y: iy };
          return;
        }
        pendingOpenId = null;
        gState.tap = { x: cx, y: cy };
      });

      function openStation(st) {
        if (!st) return;
        modalOpen = true; keys.up = keys.down = keys.left = keys.right = false; gState.tap = null;
        document.getElementById('st-title').textContent = st.title;
        const body = document.getElementById('st-body');
        if (st.id === 'mempelai') {
          const gPhoto = cfg.groomPhotoUrl ? '<img src="' + cfg.groomPhotoUrl + '" referrerpolicy="no-referrer" style="width:100%;aspect-ratio:3/4;object-fit:cover;object-position:top;border-radius:10px;border:1px solid #E5DDD3;margin-bottom:8px;" />' : '';
          const bPhoto = cfg.bridePhotoUrl ? '<img src="' + cfg.bridePhotoUrl + '" referrerpolicy="no-referrer" style="width:100%;aspect-ratio:3/4;object-fit:cover;object-position:top;border-radius:10px;border:1px solid #E5DDD3;margin-bottom:8px;" />' : '';
          body.innerHTML = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">'
            + '<div style="background:#fff;border:1px solid #E5DDD3;border-radius:12px;padding:10px;text-align:center;">' + bPhoto + '<strong style="font-size:14px;">' + cfg.brideFullName + '</strong><div style="font-size:11px;color:#6B5D54;margin-top:2px;">' + cfg.brideParents + '</div></div>'
            + '<div style="background:#fff;border:1px solid #E5DDD3;border-radius:12px;padding:10px;text-align:center;">' + gPhoto + '<strong style="font-size:14px;">' + cfg.groomFullName + '</strong><div style="font-size:11px;color:#6B5D54;margin-top:2px;">' + cfg.groomParents + '</div></div>'
            + '</div><p style="font-style:italic;font-size:12px;text-align:center;">“' + cfg.quote + '” — ' + cfg.quoteSource + '</p>';
        } else if (st.id === 'acara') {
          body.innerHTML = '<p><strong>Akad Nikah:</strong> ' + (cfg.akadDateDisplay || cfg.weddingDateDisplay) + ' (' + cfg.akadTime + ')</p><p style="margin-top:4px;"><strong>Resepsi:</strong> ' + (cfg.resepsiDateDisplay || cfg.weddingDateDisplay) + ' (' + cfg.resepsiTime + ')</p><p style="margin:10px 0;"><strong>' + cfg.venueName + '</strong><br/>' + cfg.venueAddress + '</p><a href="' + cfg.mapsUrl + '" target="_blank" class="btn btn-primary" style="background:#2E6F5E;width:100%;margin-top:8px;">Buka Google Maps</a>';
        } else if (st.id === 'amplop') {
          body.innerHTML = '<p style="font-size:12px;color:#5C4F47;margin-bottom:10px;">Doa restu dan kehadiran Anda adalah hadiah terindah bagi kami. Nomor rekening tidak dicantumkan (hanya contoh tampilan).</p>' + cfg.gifts.map(g => '<div class="card" style="padding:12px;margin-bottom:8px;"><strong>' + g.bankName + '</strong><div class="mono" style="font-size:15px;font-weight:700;">' + g.accountNumber + '</div><div style="font-size:12px;">a.n. ' + g.accountHolder + '</div></div>').join('');
        } else if (st.id === 'rsvp') {
          body.innerHTML = '<p style="margin-bottom:10px;">Silakan buka halaman undangan lengkap untuk mengisi Buku Tamu &amp; konfirmasi WhatsApp.</p><button type="button" class="btn-primary" style="width:100%;" onclick="closeModal();openInvitation();">Isi RSVP &amp; Buku Tamu</button>';
        } else {
          body.innerHTML = '<p style="margin-bottom:12px;">Terima kasih telah berkunjung ke Pelaminan ' + cfg.brideNickname + ' &amp; ' + cfg.groomNickname + '!</p><button type="button" class="btn-primary" style="width:100%;" onclick="closeModal();openInvitation();">Buka Halaman Undangan Lengkap</button>';
        }
        document.getElementById('station-modal').classList.remove('hidden');
      }
      window.openNearby = function() { openStation(nearbySt); };
      window.closeModal = function() {
        modalOpen = false;
        document.getElementById('station-modal').classList.add('hidden');
      };

      window.startAdventure = function() {
        document.getElementById('view-cover').classList.add('hidden');
        document.getElementById('view-invitation').classList.add('hidden');
        document.getElementById('view-game').classList.remove('hidden');
        toggleMusic(true);
        if (!gRunning) { gRunning = true; requestAnimationFrame(gameLoop); }
      };

      window.openInvitation = function() {
        document.getElementById('view-cover').classList.add('hidden');
        document.getElementById('view-game').classList.add('hidden');
        document.getElementById('view-invitation').classList.remove('hidden');
        renderStaticAvatars();
      };

      function gameLoop() {
        if (!gRunning) return;
        const canvas = document.getElementById('gameCanvas');
        const rect = canvas.parentElement.getBoundingClientRect();
        if (canvas.width !== Math.floor(rect.width) || canvas.height !== Math.floor(rect.height)) {
          canvas.width = Math.floor(rect.width); canvas.height = Math.floor(rect.height);
        }
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;

        let dx = 0, dy = 0;
        if (!modalOpen) {
          if (keys.left) dx -= 1; if (keys.right) dx += 1;
          if (keys.up) dy -= 1; if (keys.down) dy += 1;
          if (dx === 0 && dy === 0 && gState.tap) {
            const tx = gState.tap.x - gState.px, ty = gState.tap.y - gState.py;
            if (Math.hypot(tx, ty) < 8) gState.tap = null;
            else { dx = tx; dy = ty; }
          }
          if (dx !== 0 || dy !== 0) {
            const len = Math.hypot(dx, dy);
            gState.px = Math.max(45, Math.min(1395, gState.px + (dx / len) * 4));
            gState.py = Math.max(85, Math.min(1040, gState.py + (dy / len) * 4));
            gState.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
            gState.phase += 0.24;
          } else {
            gState.phase += 0.04;
          }
        }
        gState.partnerX += ((gState.px - 44) - gState.partnerX) * 0.1;
        gState.partnerY += ((gState.py + 14) - gState.partnerY) * 0.1;
        gState.partnerDir = gState.dir;

        ITEMS.forEach(function(it) {
          if (!it.got && Math.hypot(gState.px - it.x, gState.py - it.y) < 34) {
            it.got = true; gState.hearts++;
            document.getElementById('hud-hearts').textContent = '♥ ' + gState.hearts + '/' + ITEMS.length;
          }
        });

        gState.tick += 1;
        nearbySt = STATIONS.find(s => Math.hypot(gState.px - s.x, gState.py - (s.id === 'pelaminan' ? s.y + 38 : s.y + s.h * 0.54)) < 96) || null;
        if (!modalOpen && nearbySt && pendingOpenId === nearbySt.id) {
          pendingOpenId = null; gState.tap = null; openStation(nearbySt);
        }
        const btnInt = document.getElementById('btn-interact');
        btnInt.disabled = !nearbySt;
        btnInt.textContent = nearbySt ? 'Buka ' + nearbySt.title : 'Dekati Pos';

        gState.camX += (Math.max(0, Math.min(1440 - W, gState.px - W / 2)) - gState.camX) * 0.14;
        gState.camY += (Math.max(0, Math.min(1080 - H, gState.py - H / 2)) - gState.camY) * 0.14;

        ctx.fillStyle = '#9BC28A'; ctx.fillRect(0, 0, W, H);
        ctx.save(); ctx.translate(-gState.camX, -gState.camY);

        ctx.fillStyle = '#E6D9C6'; ctx.strokeStyle = '#C7B69E'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.roundRect(665, 220, 110, 770, 20); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.roundRect(310, 520, 820, 90, 20); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.roundRect(320, 280, 400, 76, 18); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#C85A53'; ctx.fillRect(688, 220, 64, 150);

        STATIONS.forEach(function(st) {
          ctx.save(); ctx.translate(st.x, st.y);
          const hw = st.w / 2, hh = st.h / 2;
          ctx.fillStyle = 'rgba(43,35,32,0.16)';
          ctx.beginPath(); ctx.roundRect(-hw + 5, -hh + 12, st.w, st.h, 14); ctx.fill();
          if (st.id === 'pelaminan') {
            ctx.fillStyle = '#FAF6F0'; ctx.strokeStyle = '#2B2320'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.roundRect(-hw, -hh + 6, st.w, st.h - 6, 16); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#784F32'; ctx.beginPath(); ctx.roundRect(-102, -hh + 16, 204, 46, 12); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#FACC15'; ctx.fillRect(-35, -14, 24, 24); ctx.strokeRect(-35, -14, 24, 24);
            ctx.fillRect(11, -14, 24, 24); ctx.strokeRect(11, -14, 24, 24);
          } else if (st.id === 'mempelai') {
            ctx.fillStyle = '#D9C2A3'; ctx.strokeStyle = '#2B2320'; ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.roundRect(-hw, -hh + 26, st.w, st.h - 26, 12); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#FAF6F0'; ctx.beginPath(); ctx.roundRect(-hw + 14, -hh + 34, st.w - 28, st.h - 46, 8); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#5C3D2E';
            ctx.fillRect(-hw + 12, -hh + 18, 8, st.h - 28); ctx.strokeRect(-hw + 12, -hh + 18, 8, st.h - 28);
            ctx.fillRect(hw - 20, -hh + 18, 8, st.h - 28); ctx.strokeRect(hw - 20, -hh + 18, 8, st.h - 28);
            drawChar(ctx, cfg.groom, -24, 34, 0.62, 'down', gState.tick * 0.05, false);
            drawChar(ctx, cfg.bride, 24, 34, 0.62, 'down', gState.tick * 0.05 + 1, false);
            ctx.fillStyle = '#E11D48'; ctx.beginPath(); ctx.arc(0, -14 + Math.sin(gState.tick * 0.1) * 2, 5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#2E6F5E'; ctx.strokeStyle = '#2B2320'; ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.moveTo(-hw - 10, -hh + 22); ctx.lineTo(hw + 10, -hh + 22); ctx.lineTo(hw - 16, -hh - 4); ctx.lineTo(-hw + 16, -hh - 4); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#1E4D40'; ctx.beginPath(); ctx.moveTo(-hw + 26, -hh - 4); ctx.lineTo(hw - 26, -hh - 4); ctx.lineTo(0, -hh - 28); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#FACC15'; ctx.beginPath(); ctx.arc(0, -hh - 30, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          } else {
            ctx.fillStyle = '#E6D9C6'; ctx.strokeStyle = '#2B2320'; ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.roundRect(-hw, -hh + 24, st.w, st.h - 24, 10); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#FFFDF9'; ctx.beginPath(); ctx.roundRect(-hw + 12, -hh + 26, st.w - 24, st.h - 34, 8); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#784F32'; ctx.fillRect(-14, 4, 28, hh - 10); ctx.strokeRect(-14, 4, 28, hh - 10);
            ctx.fillStyle = st.color; ctx.beginPath(); ctx.moveTo(-hw - 12, -hh + 24); ctx.lineTo(hw + 12, -hh + 24); ctx.lineTo(hw - 18, -hh - 6); ctx.lineTo(-hw + 18, -hh - 6); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#5C3D2E'; ctx.beginPath(); ctx.moveTo(-hw + 28, -hh - 6); ctx.lineTo(hw - 28, -hh - 6); ctx.lineTo(0, -hh - 30); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#FACC15'; ctx.beginPath(); ctx.arc(0, -hh - 32, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          }
          ctx.fillStyle = '#2B2320'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
          ctx.fillText(st.title, 0, hh + 24);
          ctx.restore();
        });

        ITEMS.forEach(function(it) {
          if (it.got) return;
          ctx.fillStyle = '#E11D48'; ctx.beginPath(); ctx.arc(it.x, it.y, 9, 0, Math.PI * 2); ctx.fill();
        });

        const leadC = leadRole === 'groom' ? cfg.groom : cfg.bride;
        const partC = leadRole === 'groom' ? cfg.bride : cfg.groom;
        drawChar(ctx, partC, gState.partnerX, gState.partnerY, 0.96, gState.partnerDir, gState.phase, dx !== 0 || dy !== 0);
        drawChar(ctx, leadC, gState.px, gState.py, 1, gState.dir, gState.phase, dx !== 0 || dy !== 0);
        ctx.restore();

        requestAnimationFrame(gameLoop);
      }

      setInterval(function() {
        const diff = Math.max(0, new Date(cfg.weddingDateISO).getTime() - Date.now());
        document.getElementById('cd-d').textContent = String(Math.floor(diff / 86400000)).padStart(2, '0');
        document.getElementById('cd-h').textContent = String(Math.floor((diff / 3600000) % 24)).padStart(2, '0');
        document.getElementById('cd-m').textContent = String(Math.floor((diff / 60000) % 60)).padStart(2, '0');
        document.getElementById('cd-s').textContent = String(Math.floor((diff / 1000) % 60)).padStart(2, '0');
      }, 1000);

      const KEY = 'rsvp_standalone_' + cfg.groomNickname;
      function loadRsvps() {
        const list = JSON.parse(localStorage.getItem(KEY) || '[]');
        const box = document.getElementById('rsvp-list');
        box.innerHTML = list.length ? '' : '<div class="card" style="color:#6B5D54;font-size:14px;">Belum ada ucapan. Jadilah yang pertama mengirim doa!</div>';
        list.forEach(function(r) {
          const d = document.createElement('div'); d.className = 'card';
          d.innerHTML = '<div style="display:flex;justify-content:space-between;margin-bottom:6px;"><strong>' + r.name + '</strong><span style="font-size:12px;color:#6B5D54;">' + r.status + '</span></div><p style="font-size:14px;color:#5C4F47;">' + r.msg + '</p>';
          box.appendChild(d);
        });
      }
      loadRsvps();
      window.submitRsvp = function(e) {
        e.preventDefault();
        const list = JSON.parse(localStorage.getItem(KEY) || '[]');
        list.unshift({ name: document.getElementById('rsvp-name').value, status: document.getElementById('rsvp-status').value, msg: document.getElementById('rsvp-msg').value });
        localStorage.setItem(KEY, JSON.stringify(list));
        document.getElementById('rsvp-msg').value = '';
        loadRsvps();
      };
      window.sendWa = function() {
        const phone = cfg.whatsappRsvp.replace(/\\D/g, '');
        const txt = encodeURIComponent('Halo ' + cfg.groomNickname + ' & ' + cfg.brideNickname + ', saya ' + (document.getElementById('rsvp-name').value || guestName) + ' konfirmasi: ' + document.getElementById('rsvp-status').value);
        window.open('https://wa.me/' + phone + '?text=' + txt, '_blank');
      };
    })();
  </script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
