import { useState, useEffect, useMemo } from 'react';
import { Gamepad2, SlidersHorizontal, Volume2, VolumeX, BookOpen } from 'lucide-react';
import { DEFAULT_WEDDING_CONFIG, WeddingConfig } from './types/wedding';
import { CartoonAvatarPreview } from './components/CartoonAvatarPreview';
import { GameCanvas } from './components/GameCanvas';
import { WeddingInvitationView } from './components/WeddingInvitationView';
import { CharacterStudioModal } from './components/CharacterStudioModal';
import { weddingAudio } from './audio/weddingAudio';

type AppView = 'cover' | 'playing' | 'invitation';

const CONFIG_STORAGE_KEY = 'adventure_of_us_wedding_config_v3';

export default function App() {
  const [config, setConfig] = useState<WeddingConfig>(() => {
    try {
      const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const normalizeAssetUrl = (url?: string) =>
          typeof url === 'string' && url.startsWith('/assets/') ? `.${url}` : url;
        return {
          ...DEFAULT_WEDDING_CONFIG,
          ...parsed,
          groomPhotoUrl: normalizeAssetUrl(parsed.groomPhotoUrl) || DEFAULT_WEDDING_CONFIG.groomPhotoUrl,
          bridePhotoUrl: normalizeAssetUrl(parsed.bridePhotoUrl) || DEFAULT_WEDDING_CONFIG.bridePhotoUrl,
          groom: { ...DEFAULT_WEDDING_CONFIG.groom, ...(parsed.groom || {}) },
          bride: { ...DEFAULT_WEDDING_CONFIG.bride, ...(parsed.bride || {}) },
        };
      }
    } catch {
      // ignore storage errors
    }
    return DEFAULT_WEDDING_CONFIG;
  });

  const [view, setView] = useState<AppView>('cover');
  const [leadRole, setLeadRole] = useState<'groom' | 'bride'>('groom');
  const [studioOpen, setStudioOpen] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);

  const guestName = useMemo(() => {
    if (typeof window === 'undefined') return 'Bapak/Ibu/Sahabat';
    const params = new URLSearchParams(window.location.search);
    return params.get('to') || 'Bapak/Ibu/Sahabat';
  }, []);

  useEffect(() => {
    return () => {
      weddingAudio.stopMusic();
    };
  }, []);

  const handleSaveConfig = (nextConfig: WeddingConfig) => {
    setConfig(nextConfig);
    weddingAudio.setTrack(nextConfig.musicTrack, nextConfig.customMusicDataUrl);
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(nextConfig));
    } catch {
      // ignore quota limits if custom media is large
    }
  };

  const handleStartGame = () => {
    weddingAudio.startMusic(config.musicTrack, config.customMusicDataUrl);
    setMusicPlaying(true);
    setView('playing');
  };

  const handleToggleMusic = () => {
    const playing = weddingAudio.toggleMusic(config.musicTrack, config.customMusicDataUrl);
    setMusicPlaying(playing);
  };

  const handleOpenInvitation = () => {
    if (!musicPlaying) {
      weddingAudio.startMusic(config.musicTrack, config.customMusicDataUrl);
      setMusicPlaying(true);
    }
    setView('invitation');
  };

  return (
    <div className="min-h-screen bg-[#FAF6F0] text-[#2B2320]">
      {view === 'cover' && (
        <main className="min-h-[100dvh] flex flex-col items-center justify-center p-4 sm:p-8 bg-gradient-to-b from-[#DDEFF8] via-[#F2EDE4] to-[#FAF6F0]">
          <div className="w-full max-w-xl bg-white border-2 border-[#2B2320] rounded-3xl p-6 sm:p-10 text-center shadow-[0_10px_0_#2B2320]">
            {/* Clean metadata line */}
            <div className="flex items-center justify-center gap-2 text-xs font-medium text-[#6B5D54] mb-3">
              <span>Undangan Pernikahan Interaktif</span>
              <span aria-hidden="true">·</span>
              <span>{config.weddingDateDisplay}</span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl font-semibold text-[#2B2320] tracking-tight mb-2 [text-wrap:balance]">
              {config.brideNickname} & {config.groomNickname}
            </h1>

            <p className="text-sm text-[#5C4F47] mb-6">
              Kepada Yth. <span className="font-semibold text-[#2B2320]">{guestName}</span>
            </p>

            {/* Cartoon Couple Showcase */}
            <div className="relative flex items-end justify-center gap-3 sm:gap-6 py-4 px-4 mb-6 rounded-2xl bg-[#FAF6F0] border border-[#E5DDD3]">
              <div className="flex flex-col items-center">
                <CartoonAvatarPreview character={config.bride} size={132} facing={1} />
                <span className="text-xs font-semibold text-[#5C4F47] mt-1">
                  {config.brideNickname}
                </span>
              </div>
              <div className="flex flex-col items-center">
                <CartoonAvatarPreview character={config.groom} size={132} facing={-1} />
                <span className="text-xs font-semibold text-[#5C4F47] mt-1">
                  {config.groomNickname}
                </span>
              </div>

              <button
                type="button"
                onClick={handleToggleMusic}
                title={musicPlaying ? 'Matikan Musik' : 'Putar Musik Latar'}
                aria-label={musicPlaying ? 'Matikan Musik' : 'Putar Musik Latar'}
                className="absolute top-3 right-3 w-9 h-9 rounded-xl bg-white border border-[#E5DDD3] flex items-center justify-center text-[#2B2320] hover:bg-[#F3ECE2] transition-colors cursor-pointer"
              >
                {musicPlaying ? (
                  <Volume2 className="w-4 h-4 text-[#2E6F5E]" />
                ) : (
                  <VolumeX className="w-4 h-4 text-[#8C7B70]" />
                )}
              </button>
            </div>

            {/* Playable Character Picker */}
            <div className="mb-6">
              <p className="text-xs font-medium text-[#6B5D54] mb-2">
                Pilih karakter utama untuk dimainkan bersama pasangan:
              </p>
              <div className="inline-flex p-1 rounded-xl bg-[#F3ECE2] border border-[#E5DDD3]">
                <button
                  type="button"
                  onClick={() => setLeadRole('bride')}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    leadRole === 'bride'
                      ? 'bg-[#C85A53] text-white'
                      : 'text-[#5C4F47] hover:text-[#2B2320]'
                  }`}
                >
                  Main sebagai {config.brideNickname}
                </button>
                <button
                  type="button"
                  onClick={() => setLeadRole('groom')}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    leadRole === 'groom'
                      ? 'bg-[#2E6F5E] text-white'
                      : 'text-[#5C4F47] hover:text-[#2B2320]'
                  }`}
                >
                  Main sebagai {config.groomNickname}
                </button>
              </div>
            </div>

            {/* Primary & Secondary Actions */}
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleStartGame}
                className="w-full py-3.5 px-6 rounded-xl bg-[#C85A53] text-white font-semibold text-base border-2 border-[#2B2320] shadow-[0_4px_0_#2B2320] hover:bg-[#B24B44] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <Gamepad2 className="w-5 h-5" />
                <span>Mulai Petualangan & Musik</span>
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleOpenInvitation}
                  className="py-2.5 px-4 rounded-xl border border-[#E5DDD3] bg-white text-xs font-semibold text-[#2B2320] hover:bg-[#FAF6F0] transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 text-[#6B5D54]" />
                  <span>Langsung Buka Undangan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStudioOpen(true)}
                  className="py-2.5 px-4 rounded-xl border border-[#E5DDD3] bg-[#FAF6F0] text-xs font-semibold text-[#2B2320] hover:bg-[#F3ECE2] transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                >
                  <SlidersHorizontal className="w-4 h-4 text-[#C85A53]" />
                  <span>Ganti Wajah & Export GitHub</span>
                </button>
              </div>
            </div>
          </div>
        </main>
      )}

      {view === 'playing' && (
        <GameCanvas
          config={config}
          leadRole={leadRole}
          musicPlaying={musicPlaying}
          onToggleMusic={handleToggleMusic}
          onCompleteGame={handleOpenInvitation}
          onSkipToInvitation={handleOpenInvitation}
        />
      )}

      {view === 'invitation' && (
        <WeddingInvitationView
          config={config}
          guestName={guestName}
          musicPlaying={musicPlaying}
          onToggleMusic={handleToggleMusic}
          onPlayGameAgain={handleStartGame}
          onOpenStudio={() => setStudioOpen(true)}
        />
      )}

      {studioOpen && (
        <CharacterStudioModal
          config={config}
          onSave={handleSaveConfig}
          onClose={() => setStudioOpen(false)}
        />
      )}
    </div>
  );
}
