import React, { useEffect, useState } from 'react';
import {
  MapPin,
  Calendar,
  Copy,
  Check,
  Volume2,
  VolumeX,
  Gamepad2,
  Send,
  SlidersHorizontal,
  X,
  ZoomIn,
} from 'lucide-react';
import { WeddingConfig, RsvpEntry } from '../types/wedding';
import { CartoonAvatarPreview } from './CartoonAvatarPreview';

interface WeddingInvitationViewProps {
  config: WeddingConfig;
  guestName: string;
  musicPlaying: boolean;
  onToggleMusic: () => void;
  onPlayGameAgain: () => void;
  onOpenStudio: () => void;
}

const RSVP_STORAGE_KEY = 'adventure_of_us_rsvp_entries_v2';

const DEFAULT_WISHES: RsvpEntry[] = [
  {
    id: 'w1',
    name: 'Dimas & Ayu',
    status: 'Hadir',
    guests: 2,
    message: 'Selamat menempuh hidup baru Bismi & Rendi! Suka sekali konsep game undangannya, sampai jumpa di Slawi!',
    createdAt: '2 hari lalu',
  },
  {
    id: 'w2',
    name: 'Keluarga Besar Pakembaran',
    status: 'Hadir',
    guests: 2,
    message: 'Barakallahu lakuma wa baraka alaikuma. Semoga menjadi keluarga sakinah, mawaddah, warahmah.',
    createdAt: '1 hari lalu',
  },
];

export const WeddingInvitationView: React.FC<WeddingInvitationViewProps> = ({
  config,
  guestName,
  musicPlaying,
  onToggleMusic,
  onPlayGameAgain,
  onOpenStudio,
}) => {
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [rsvps, setRsvps] = useState<RsvpEntry[]>(() => {
    try {
      const saved = localStorage.getItem(RSVP_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEFAULT_WISHES;
  });

  const [formName, setFormName] = useState(guestName || '');
  const [formStatus, setFormStatus] = useState<'Hadir' | 'Ragu' | 'Tidak Hadir'>('Hadir');
  const [formGuests, setFormGuests] = useState(1);
  const [formMessage, setFormMessage] = useState('');
  const [submittedNotice, setSubmittedNotice] = useState(false);
  const [zoomedPhoto, setZoomedPhoto] = useState<{ url: string; label: string } | null>(null);
  const [brokenPhotos, setBrokenPhotos] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const updateTimer = () => {
      const target = new Date(config.weddingDateISO).getTime();
      const diff = Math.max(0, target - Date.now());
      setCountdown({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        mins: Math.floor((diff / (1000 * 60)) % 60),
        secs: Math.floor((diff / 1000) % 60),
      });
    };
    updateTimer();
    const id = window.setInterval(updateTimer, 1000);
    return () => clearInterval(id);
  }, [config.weddingDateISO]);

  const handleCopyAccount = (id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleDownloadIcs = () => {
    const dt = new Date(config.weddingDateISO);
    const pad = (n: number) => String(n).padStart(2, '0');
    const formatIcsDate = (d: Date) =>
      `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(
        d.getUTCHours()
      )}${pad(d.getUTCMinutes())}00Z`;
    const endDt = new Date(dt.getTime() + 4 * 60 * 60 * 1000);

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART:${formatIcsDate(dt)}`,
      `DTEND:${formatIcsDate(endDt)}`,
      `SUMMARY:Pernikahan ${config.brideNickname} & ${config.groomNickname}`,
      `LOCATION:${config.venueName}, ${config.venueAddress}`,
      `DESCRIPTION:Undangan Pernikahan ${config.brideFullName} & ${config.groomFullName}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pernikahan-${config.brideNickname.toLowerCase()}-${config.groomNickname.toLowerCase()}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRsvpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formMessage.trim()) return;

    const newEntry: RsvpEntry = {
      id: String(Date.now()),
      name: formName.trim(),
      status: formStatus,
      guests: formStatus === 'Hadir' ? formGuests : 0,
      message: formMessage.trim(),
      createdAt: 'Baru saja',
    };

    const next = [newEntry, ...rsvps];
    setRsvps(next);
    try {
      localStorage.setItem(RSVP_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
    setFormMessage('');
    setSubmittedNotice(true);
    setTimeout(() => setSubmittedNotice(false), 3000);
  };

  const handleSendWhatsApp = () => {
    const cleanPhone = config.whatsappRsvp.replace(/\D/g, '');
    const text = encodeURIComponent(
      `Halo ${config.brideNickname} & ${config.groomNickname}, saya ${formName || guestName || 'Tamu'} mengonfirmasi kehadiran: ${formStatus} (${formGuests} orang). Doa saya: ${formMessage || 'Selamat menempuh hidup baru!'}`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-[#FAF6F0] text-[#2B2320]">
      {/* Top Bar Contract: 3 zones */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-6 py-4 bg-[#FAF6F0]/95 backdrop-blur-sm border-b border-[#E5DDD3]">
        <a
          href="#mempelai"
          className="font-display text-lg font-bold tracking-tight text-[#2B2320] whitespace-nowrap shrink-0"
        >
          {config.brideNickname} & {config.groomNickname}
        </a>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#6B5D54]">
          <a href="#mempelai" className="hover:text-[#2B2320] transition-colors whitespace-nowrap shrink-0">
            Mempelai
          </a>
          <a href="#acara" className="hover:text-[#2B2320] transition-colors whitespace-nowrap shrink-0">
            Acara
          </a>
          <a href="#rsvp" className="hover:text-[#2B2320] transition-colors whitespace-nowrap shrink-0">
            Buku Tamu
          </a>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onPlayGameAgain}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#C85A53] rounded-lg hover:bg-[#B24B44] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Gamepad2 className="w-4 h-4" />
            <span>Mainkan Game</span>
          </button>
        </div>
      </header>

      {/* Utility bar below header for Audio & Character Studio */}
      <div className="max-w-5xl mx-auto px-6 pt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="text-xs text-[#6B5D54]">
          Kepada Yth. <span className="font-semibold text-[#2B2320]">{guestName || 'Bapak/Ibu/Sahabat'}</span>
          <span className="mx-2" aria-hidden="true">·</span>
          <span>{config.weddingDateDisplay}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleMusic}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#E5DDD3] bg-white text-[#2B2320] hover:bg-[#F3ECE2] transition-colors whitespace-nowrap cursor-pointer"
          >
            {musicPlaying ? <Volume2 className="w-3.5 h-3.5 text-[#2E6F5E]" /> : <VolumeX className="w-3.5 h-3.5 text-[#8C7B70]" />}
            <span>{musicPlaying ? 'Musik Aktif' : 'Putar Musik'}</span>
          </button>
          <button
            type="button"
            onClick={onOpenStudio}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#E5DDD3] bg-white text-[#2B2320] hover:bg-[#F3ECE2] transition-colors whitespace-nowrap cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#C85A53]" />
            <span>Edit Wajah & Export GitHub</span>
          </button>
        </div>
      </div>

      {/* Hero & Couple Section */}
      <section id="mempelai" className="max-w-5xl mx-auto px-6 py-12 sm:py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-xs font-medium text-[#C85A53] mb-3">
            Undangan Pernikahan
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold text-[#2B2320] mb-5 leading-tight [text-wrap:balance]">
            {config.brideNickname} & {config.groomNickname}
          </h1>
          <p className="text-[15px] leading-relaxed text-[#5C4F47] italic mb-2">
            “{config.quote}”
          </p>
          <p className="text-xs text-[#8C7B70]">{config.quoteSource}</p>
        </div>

        {/* Couple Portraits + Cartoon Avatars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {[
            {
              key: 'bride',
              photoUrl: config.bridePhotoUrl,
              char: config.bride,
              fullName: config.brideFullName,
              parents: config.brideParents,
              facing: 1 as const,
            },
            {
              key: 'groom',
              photoUrl: config.groomPhotoUrl,
              char: config.groom,
              fullName: config.groomFullName,
              parents: config.groomParents,
              facing: -1 as const,
            },
          ].map((person) => (
            <div key={person.key} className="bg-white border border-[#E5DDD3] rounded-2xl p-8 flex flex-col items-center text-center">
              <div className="relative mb-5">
                {person.photoUrl && !brokenPhotos[person.key] ? (
                  <button
                    type="button"
                    onClick={() => setZoomedPhoto({ url: person.photoUrl, label: person.fullName })}
                    className="group relative w-44 h-56 rounded-2xl overflow-hidden border border-[#E5DDD3] bg-[#FAF6F0] cursor-pointer block"
                    title="Ketuk untuk perbesar foto"
                  >
                    <img
                      src={person.photoUrl}
                      alt={person.fullName}
                      referrerPolicy="no-referrer"
                      onError={() => setBrokenPhotos((prev) => ({ ...prev, [person.key]: true }))}
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-2.5 right-2.5 w-7 h-7 rounded-lg bg-[#2B2320]/70 text-white flex items-center justify-center">
                      <ZoomIn className="w-3.5 h-3.5" />
                    </span>
                  </button>
                ) : (
                  <div className="w-44 h-56 rounded-2xl bg-[#FAF6F0] border border-[#E5DDD3] flex items-center justify-center">
                    <CartoonAvatarPreview character={person.char} size={150} facing={person.facing} />
                  </div>
                )}

                {person.photoUrl && !brokenPhotos[person.key] && (
                  <div className="absolute -bottom-3 -right-4 w-20 h-20 rounded-full bg-[#FAF6F0] border-2 border-white shadow-md flex items-center justify-center overflow-hidden">
                    <CartoonAvatarPreview character={person.char} size={74} facing={person.facing} />
                  </div>
                )}
              </div>

              <h2 className="font-display text-2xl font-semibold text-[#2B2320] mb-1">
                {person.fullName}
              </h2>
              <p className="text-sm text-[#6B5D54]">{person.parents}</p>
            </div>
          ))}
        </div>

        {/* Live Countdown */}
        <div className="bg-[#2B2320] text-[#FAF6F0] rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <p className="text-xs text-[#D6C7B2] mb-1">Menghitung Hari Bahagia</p>
              <p className="font-display text-2xl font-semibold">{config.weddingDateDisplay}</p>
            </div>
            <div className="grid grid-cols-4 gap-4 sm:gap-6 text-center">
              {[
                { val: countdown.days, label: 'Hari' },
                { val: countdown.hours, label: 'Jam' },
                { val: countdown.mins, label: 'Menit' },
                { val: countdown.secs, label: 'Detik' },
              ].map((item) => (
                <div key={item.label} className="min-w-[56px]">
                  <div className="font-mono-tabular text-2xl sm:text-3xl font-semibold text-[#FDE68A]">
                    {String(item.val).padStart(2, '0')}
                  </div>
                  <div className="text-xs text-[#D6C7B2] mt-1">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Event Details */}
      <section id="acara" className="max-w-5xl mx-auto px-6 py-12 border-t border-[#E5DDD3]">
        <div className="max-w-xl mb-10">
          <p className="text-xs font-medium text-[#C85A53] mb-2">Waktu & Tempat</p>
          <h2 className="font-display text-3xl font-semibold text-[#2B2320]">
            Rangkaian Acara Pernikahan
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white border border-[#E5DDD3] rounded-2xl p-7">
            <h3 className="font-display text-2xl font-semibold text-[#2B2320] mb-2">
              Akad Nikah
            </h3>
            <p className="text-sm font-medium text-[#2E6F5E] mb-4">
              {config.akadDateDisplay || config.weddingDateDisplay} · {config.akadTime}
            </p>
            <p className="text-[15px] font-medium text-[#2B2320] mb-1">{config.venueName}</p>
            <p className="text-sm text-[#6B5D54] leading-relaxed">{config.venueAddress}</p>
          </div>

          <div className="bg-white border border-[#E5DDD3] rounded-2xl p-7">
            <h3 className="font-display text-2xl font-semibold text-[#2B2320] mb-2">
              Resepsi Pernikahan
            </h3>
            <p className="text-sm font-medium text-[#C85A53] mb-4">
              {config.resepsiDateDisplay || config.weddingDateDisplay} · {config.resepsiTime}
            </p>
            <p className="text-[15px] font-medium text-[#2B2320] mb-1">{config.venueName}</p>
            <p className="text-sm text-[#6B5D54] leading-relaxed">{config.venueAddress}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <a
            href={config.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#2E6F5E] text-white text-sm font-semibold hover:bg-[#24594B] transition-colors"
          >
            <MapPin className="w-4 h-4" />
            <span>Buka Google Maps</span>
          </a>
          <button
            type="button"
            onClick={handleDownloadIcs}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white border border-[#E5DDD3] text-[#2B2320] text-sm font-semibold hover:bg-[#F3ECE2] transition-colors cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
            <span>Simpan ke Kalender</span>
          </button>
        </div>
      </section>

      {/* Digital Gift (Example / No Account Number Listed) */}
      <section className="max-w-5xl mx-auto px-6 py-12 border-t border-[#E5DDD3]">
        <div className="max-w-xl mb-8">
          <p className="text-xs font-medium text-[#6B5D54] mb-2">Tanda Kasih (Contoh Tampilan)</p>
          <h2 className="font-display text-3xl font-semibold text-[#2B2320] mb-2">
            Amplop Digital
          </h2>
          <p className="text-[15px] text-[#5C4F47]">
            Doa restu dan kehadiran Anda adalah hadiah terindah bagi kami. Nomor rekening tidak dicantumkan (bagian ini hanya sebagai contoh).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {config.gifts.map((gift) => {
            const isExample = gift.accountNumber.includes('XXXX') || gift.accountNumber.toLowerCase().includes('contoh');
            return (
              <div key={gift.id} className="bg-white border border-[#E5DDD3] rounded-2xl p-6 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-[#6B5D54] mb-1">{gift.bankName}</p>
                  <p className="font-mono-tabular text-lg font-semibold text-[#2B2320]">
                    {gift.accountNumber}
                  </p>
                  <p className="text-sm text-[#5C4F47] mt-0.5">a.n. {gift.accountHolder}</p>
                </div>
                {!isExample && (
                  <button
                    type="button"
                    onClick={() => handleCopyAccount(gift.id, gift.accountNumber)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#E5DDD3] bg-[#FAF6F0] text-xs font-semibold text-[#2B2320] hover:bg-[#F0E7DB] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {copiedId === gift.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#2E6F5E]" />
                        <span>Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* RSVP & Guestbook */}
      <section id="rsvp" className="max-w-5xl mx-auto px-6 py-12 border-t border-[#E5DDD3]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5">
            <p className="text-xs font-medium text-[#C85A53] mb-2">Konfirmasi & Doa</p>
            <h2 className="font-display text-3xl font-semibold text-[#2B2320] mb-6">
              Kirim Ucapan & RSVP
            </h2>
            <form onSubmit={handleRsvpSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#5C4F47] mb-1.5">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Nama Anda"
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#E5DDD3] text-sm focus:outline-none focus:border-[#2E6F5E]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#5C4F47] mb-1.5">
                    Kehadiran
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as 'Hadir' | 'Ragu' | 'Tidak Hadir')}
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#E5DDD3] text-sm focus:outline-none focus:border-[#2E6F5E]"
                  >
                    <option value="Hadir">InsyaAllah Hadir</option>
                    <option value="Ragu">Masih Ragu</option>
                    <option value="Tidak Hadir">Berhalangan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5C4F47] mb-1.5">
                    Jumlah Tamu
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={formGuests}
                    onChange={(e) => setFormGuests(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#E5DDD3] text-sm focus:outline-none focus:border-[#2E6F5E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C4F47] mb-1.5">
                  Doa & Ucapan
                </label>
                <textarea
                  required
                  rows={3}
                  value={formMessage}
                  onChange={(e) => setFormMessage(e.target.value)}
                  placeholder="Tuliskan doa terbaik untuk kedua mempelai..."
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#E5DDD3] text-sm focus:outline-none focus:border-[#2E6F5E]"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <button
                  type="submit"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#2B2320] text-white text-sm font-semibold hover:bg-[#3F342F] transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Kirim Ucapan</span>
                </button>
                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  className="px-4 py-3 rounded-xl border border-[#2E6F5E] text-[#2E6F5E] text-sm font-semibold hover:bg-[#2E6F5E]/8 transition-colors whitespace-nowrap cursor-pointer"
                >
                  Konfirmasi WhatsApp
                </button>
              </div>
              {submittedNotice && (
                <p className="text-xs font-medium text-[#2E6F5E]">
                  Terima kasih! Ucapan dan konfirmasi Anda telah tersimpan.
                </p>
              )}
            </form>
          </div>

          <div className="lg:col-span-7">
            <h3 className="font-display text-xl font-semibold text-[#2B2320] mb-4">
              Doa & Harapan Tamu ({rsvps.length})
            </h3>
            <div className="space-y-4 max-h-[440px] overflow-y-auto pr-1">
              {rsvps.map((item) => (
                <div key={item.id} className="bg-white border border-[#E5DDD3] rounded-2xl p-5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-semibold text-sm text-[#2B2320]">{item.name}</span>
                    <span className="text-xs text-[#6B5D54]">
                      {item.status} · {item.createdAt}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-[#5C4F47]">{item.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#E5DDD3] py-8 px-6 text-center text-xs text-[#8C7B70]">
        <p>
          Undangan Pernikahan {config.brideNickname} & {config.groomNickname} · {config.weddingDateDisplay}
        </p>
      </footer>

      {zoomedPhoto && (
        <div
          onClick={() => setZoomedPhoto(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2B2320]/80 backdrop-blur-xs cursor-pointer"
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
  );
};
