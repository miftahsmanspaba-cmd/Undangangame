import React, { useState, useEffect } from 'react';
import { X, Upload, Download, Music, User, FileText, RotateCcw, Check } from 'lucide-react';
import {
  WeddingConfig,
  CharacterConfig,
  SKIN_TONES,
  HAIR_COLORS,
  DEFAULT_WEDDING_CONFIG,
  MusicTrackId,
} from '../types/wedding';
import { CartoonAvatarPreview } from './CartoonAvatarPreview';
import { cartoonizeImageToDataUrl } from '../utils/cartoonRenderer';
import { generateStandaloneHtml } from '../utils/exportStandaloneHtml';
import { weddingAudio } from '../audio/weddingAudio';

interface CharacterStudioModalProps {
  config: WeddingConfig;
  onSave: (nextConfig: WeddingConfig) => void;
  onClose: () => void;
}

type TabId = 'character' | 'details' | 'music_export';

export const CharacterStudioModal: React.FC<CharacterStudioModalProps> = ({
  config,
  onSave,
  onClose,
}) => {
  const [draft, setDraft] = useState<WeddingConfig>(() => JSON.parse(JSON.stringify(config)));
  const [activeTab, setActiveTab] = useState<TabId>('character');
  const [editingRole, setEditingRole] = useState<'groom' | 'bride'>('groom');

  // Photo-to-cartoon adjustment states
  const [photoZoom, setPhotoZoom] = useState(1.2);
  const [photoOffsetX, setPhotoOffsetX] = useState(0);
  const [photoOffsetY, setPhotoOffsetY] = useState(0);
  const [cartoonStrength, setCartoonStrength] = useState(75);
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [exportingHtml, setExportingHtml] = useState(false);
  const [exportedNotice, setExportedNotice] = useState(false);

  const activeChar = editingRole === 'groom' ? draft.groom : draft.bride;

  const updateChar = (patch: Partial<CharacterConfig>) => {
    setDraft((prev) => ({
      ...prev,
      [editingRole]: {
        ...prev[editingRole],
        ...patch,
      },
    }));
  };

  // Re-run cartoonizer when adjustments change for the currently active role's raw photo
  useEffect(() => {
    const raw = activeChar.photoRawUrl;
    if (activeChar.faceMode !== 'photo' || !raw) return;

    let cancelled = false;
    setProcessingPhoto(true);
    const timer = window.setTimeout(() => {
      cartoonizeImageToDataUrl(raw, {
        zoom: photoZoom,
        offsetX: photoOffsetX,
        offsetY: photoOffsetY,
        cartoonStrength,
      })
        .then((cartoonUrl) => {
          if (!cancelled) {
            setDraft((prev) => ({
              ...prev,
              [editingRole]: {
                ...prev[editingRole],
                photoCartoonUrl: cartoonUrl,
              },
            }));
          }
        })
        .finally(() => {
          if (!cancelled) setProcessingPhoto(false);
        });
    }, 120);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activeChar.faceMode, activeChar.photoRawUrl, photoZoom, photoOffsetX, photoOffsetY, cartoonStrength, editingRole]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const rawUrl = reader.result as string;
      setPhotoZoom(1.2);
      setPhotoOffsetX(0);
      setPhotoOffsetY(0);
      updateChar({
        faceMode: 'photo',
        photoRawUrl: rawUrl,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setDraft((prev) => ({
        ...prev,
        musicTrack: 'custom',
        customMusicDataUrl: dataUrl,
        customMusicName: file.name,
      }));
      weddingAudio.startMusic('custom', dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleGalleryPhotoUpload = (role: 'groom' | 'bride', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setDraft((prev) => ({
        ...prev,
        [role === 'groom' ? 'groomPhotoUrl' : 'bridePhotoUrl']: dataUrl,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadStandaloneHtml = async () => {
    setExportingHtml(true);
    try {
      const inlineLocalAsset = async (url?: string): Promise<string> => {
        if (!url) return '';
        if (url.startsWith('data:')) return url;
        if (url.startsWith('/') || url.startsWith('blob:')) {
          try {
            const resp = await fetch(url);
            const blob = await resp.blob();
            return await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : url);
              reader.onerror = () => resolve(url);
              reader.readAsDataURL(blob);
            });
          } catch {
            return url;
          }
        }
        return url;
      };

      const [groomPhotoInlined, bridePhotoInlined] = await Promise.all([
        inlineLocalAsset(draft.groomPhotoUrl),
        inlineLocalAsset(draft.bridePhotoUrl),
      ]);

      // Strip heavy raw selfie buffer before export while preserving real couple gallery photos
      const exportCfg: WeddingConfig = {
        ...draft,
        groomPhotoUrl: groomPhotoInlined,
        bridePhotoUrl: bridePhotoInlined,
        groom: { ...draft.groom, photoRawUrl: undefined },
        bride: { ...draft.bride, photoRawUrl: undefined },
      };
      const html = generateStandaloneHtml(exportCfg);
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'index.html';
      a.click();
      URL.revokeObjectURL(url);
      setExportedNotice(true);
      setTimeout(() => setExportedNotice(false), 3500);
    } finally {
      setExportingHtml(false);
    }
  };

  const handleApplyAndSave = () => {
    onSave(draft);
    onClose();
  };

  const handleReset = () => {
    setDraft(JSON.parse(JSON.stringify(DEFAULT_WEDDING_CONFIG)));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#2B2320]/60 backdrop-blur-xs">
      <div className="w-full max-w-4xl max-h-[92dvh] flex flex-col bg-[#FAF6F0] border-2 border-[#2B2320] rounded-2xl shadow-[0_10px_0_#2B2320] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 bg-white border-b border-[#E5DDD3]">
          <div>
            <h2 className="font-display text-xl font-semibold text-[#2B2320]">
              Studio Wajah Kartun & Export GitHub
            </h2>
            <p className="text-xs text-[#6B5D54]">
              Sesuaikan wajah karakter kartun agar mirip kalian, ganti musik, lalu unduh index.html untuk GitHub Pages.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Studio"
            className="w-9 h-9 rounded-lg border border-[#E5DDD3] flex items-center justify-center text-[#5C4F47] hover:bg-[#FAF6F0] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 py-3 bg-[#F3ECE2] border-b border-[#E5DDD3] overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('character')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
              activeTab === 'character' ? 'bg-[#2B2320] text-white' : 'bg-white text-[#5C4F47] hover:text-[#2B2320]'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Wajah & Karakter Kartun</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
              activeTab === 'details' ? 'bg-[#2B2320] text-white' : 'bg-white text-[#5C4F47] hover:text-[#2B2320]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Data Undangan</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('music_export')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
              activeTab === 'music_export' ? 'bg-[#2B2320] text-white' : 'bg-white text-[#5C4F47] hover:text-[#2B2320]'
            }`}
          >
            <Music className="w-4 h-4" />
            <span>Musik & Export HTML GitHub</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'character' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              {/* Left Preview Column */}
              <div className="md:col-span-5 flex flex-col items-center bg-white border border-[#E5DDD3] rounded-2xl p-6">
                <div className="flex items-center gap-2 p-1 bg-[#F3ECE2] rounded-xl w-full mb-5">
                  <button
                    type="button"
                    onClick={() => setEditingRole('groom')}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      editingRole === 'groom' ? 'bg-white text-[#2B2320] shadow-xs' : 'text-[#6B5D54]'
                    }`}
                  >
                    Mempelai Pria ({draft.groomNickname})
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingRole('bride')}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      editingRole === 'bride' ? 'bg-white text-[#2B2320] shadow-xs' : 'text-[#6B5D54]'
                    }`}
                  >
                    Mempelai Wanita ({draft.brideNickname})
                  </button>
                </div>

                <div className="w-48 h-48 rounded-2xl bg-[#E0F2FE]/60 border border-[#E5DDD3] flex items-center justify-center mb-4">
                  <CartoonAvatarPreview character={activeChar} size={172} />
                </div>

                <div className="flex items-center gap-2 p-1 bg-[#F3ECE2] rounded-xl w-full mb-3">
                  <button
                    type="button"
                    onClick={() => updateChar({ faceMode: 'vector' })}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      activeChar.faceMode === 'vector' ? 'bg-[#2E6F5E] text-white' : 'text-[#5C4F47]'
                    }`}
                  >
                    Avatar Kartun
                  </button>
                  <button
                    type="button"
                    onClick={() => updateChar({ faceMode: 'photo' })}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      activeChar.faceMode === 'photo' ? 'bg-[#C85A53] text-white' : 'text-[#5C4F47]'
                    }`}
                  >
                    Foto Wajah → Kartun
                  </button>
                </div>

                <p className="text-xs text-[#6B5D54] text-center leading-relaxed">
                  {activeChar.faceMode === 'photo'
                    ? 'Unggah selfie wajah kalian, sistem akan mengubahnya otomatis menjadi potret kartun ber-outline di atas tubuh karakter.'
                    : 'Atur warna kulit, gaya rambut atau hijab, kacamata, jenggot, dan busana agar mirip dengan kalian.'}
                </p>
              </div>

              {/* Right Controls Column */}
              <div className="md:col-span-7 space-y-5">
                {activeChar.faceMode === 'photo' ? (
                  <div className="bg-white border border-[#E5DDD3] rounded-2xl p-5 space-y-4">
                    <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[#D6C7B2] rounded-xl p-5 bg-[#FAF6F0] hover:bg-[#F3ECE2] cursor-pointer transition-colors">
                      <Upload className="w-6 h-6 text-[#C85A53]" />
                      <span className="text-sm font-semibold text-[#2B2320]">
                        {activeChar.photoRawUrl ? 'Ganti Foto Wajah' : 'Unggah Foto Selfie Wajah'}
                      </span>
                      <span className="text-xs text-[#6B5D54]">
                        Gunakan foto wajah menghadap depan (JPG/PNG)
                      </span>
                      <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                    </label>

                    {activeChar.photoRawUrl && (
                      <div className="space-y-3 pt-2">
                        <div className="flex justify-between text-xs font-medium text-[#5C4F47]">
                          <span>Zoom Wajah</span>
                          <span className="font-mono-tabular">{photoZoom.toFixed(2)}x</span>
                        </div>
                        <input
                          type="range"
                          min={0.8}
                          max={2.4}
                          step={0.05}
                          value={photoZoom}
                          onChange={(e) => setPhotoZoom(Number(e.target.value))}
                          className="w-full accent-[#C85A53]"
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="flex justify-between text-xs font-medium text-[#5C4F47]">
                              <span>Geser Kiri/Kanan</span>
                              <span className="font-mono-tabular">{photoOffsetX}</span>
                            </div>
                            <input
                              type="range"
                              min={-50}
                              max={50}
                              value={photoOffsetX}
                              onChange={(e) => setPhotoOffsetX(Number(e.target.value))}
                              className="w-full accent-[#C85A53]"
                            />
                          </div>
                          <div>
                            <div className="flex justify-between text-xs font-medium text-[#5C4F47]">
                              <span>Geser Atas/Bawah</span>
                              <span className="font-mono-tabular">{photoOffsetY}</span>
                            </div>
                            <input
                              type="range"
                              min={-50}
                              max={50}
                              value={photoOffsetY}
                              onChange={(e) => setPhotoOffsetY(Number(e.target.value))}
                              className="w-full accent-[#C85A53]"
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs font-medium text-[#5C4F47]">
                            <span>Efek Kartun Cel-Shading</span>
                            <span className="font-mono-tabular">{cartoonStrength}%</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={cartoonStrength}
                            onChange={(e) => setCartoonStrength(Number(e.target.value))}
                            className="w-full accent-[#2E6F5E]"
                          />
                        </div>
                        {processingPhoto && (
                          <p className="text-xs text-[#6B5D54]">Memproses efek kartun...</p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Skin Tone */}
                    <div>
                      <label className="block text-xs font-semibold text-[#5C4F47] mb-2">
                        Warna Kulit
                      </label>
                      <div className="flex flex-wrap gap-2.5">
                        {SKIN_TONES.map((tone) => (
                          <button
                            key={tone.hex}
                            type="button"
                            onClick={() => updateChar({ skinTone: tone.hex })}
                            title={tone.label}
                            className={`w-9 h-9 rounded-full border-2 cursor-pointer transition-transform ${
                              activeChar.skinTone === tone.hex
                                ? 'border-[#2B2320] scale-110'
                                : 'border-[#E5DDD3]'
                            }`}
                            style={{ backgroundColor: tone.hex }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Hair / Hijab Style */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#5C4F47] mb-1.5">
                          {editingRole === 'bride' ? 'Gaya Rambut / Hijab' : 'Gaya Rambut'}
                        </label>
                        <select
                          value={activeChar.hairStyle}
                          onChange={(e) =>
                            updateChar({ hairStyle: e.target.value as CharacterConfig['hairStyle'] })
                          }
                          className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#E5DDD3] text-sm"
                        >
                          {editingRole === 'groom' ? (
                            <>
                              <option value="short_parted">Belah Samping Rapi</option>
                              <option value="undercut">Undercut Modern</option>
                              <option value="pompadour">Pompadour Klasik</option>
                              <option value="curly">Keriting / Ikal</option>
                              <option value="buzz">Cepak Rapi</option>
                            </>
                          ) : (
                            <>
                              <option value="hijab_draped">Hijab Pashmina / Drape</option>
                              <option value="hijab_syari">Hijab Syari Panjang</option>
                              <option value="long_wavy">Rambut Panjang Bergelombang</option>
                              <option value="low_bun">Sanggul Modern</option>
                              <option value="shoulder_bob">Bob Sebahu</option>
                            </>
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#5C4F47] mb-1.5">
                          Kacamata
                        </label>
                        <select
                          value={activeChar.glasses}
                          onChange={(e) =>
                            updateChar({ glasses: e.target.value as CharacterConfig['glasses'] })
                          }
                          className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#E5DDD3] text-sm"
                        >
                          <option value="none">Tanpa Kacamata</option>
                          <option value="square">Kotak Modern</option>
                          <option value="round">Bulat Klasik</option>
                        </select>
                      </div>
                    </div>

                    {/* Hair / Hijab Color */}
                    <div>
                      <label className="block text-xs font-semibold text-[#5C4F47] mb-2">
                        Warna Rambut / Hijab
                      </label>
                      <div className="flex flex-wrap gap-2.5">
                        {HAIR_COLORS.map((hc) => (
                          <button
                            key={hc.hex}
                            type="button"
                            onClick={() => updateChar({ hairColor: hc.hex })}
                            title={hc.label}
                            className={`w-8 h-8 rounded-full border-2 cursor-pointer ${
                              activeChar.hairColor === hc.hex
                                ? 'border-[#C85A53] scale-110'
                                : 'border-[#E5DDD3]'
                            }`}
                            style={{ backgroundColor: hc.hex }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Facial Hair & Blush */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {editingRole === 'groom' ? (
                        <div>
                          <label className="block text-xs font-semibold text-[#5C4F47] mb-1.5">
                            Kumis & Jenggot
                          </label>
                          <select
                            value={activeChar.facialHair}
                            onChange={(e) =>
                              updateChar({
                                facialHair: e.target.value as CharacterConfig['facialHair'],
                              })
                            }
                            className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#E5DDD3] text-sm"
                          >
                            <option value="none">Bersih</option>
                            <option value="mustache">Kumis Tipis</option>
                            <option value="goatee">Jenggot Dagu</option>
                            <option value="full_beard">Jenggot & Kumis Penuh</option>
                          </select>
                        </div>
                      ) : (
                        <div className="flex items-end pb-2">
                          <label className="flex items-center gap-2 text-sm font-medium text-[#2B2320] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={activeChar.blush}
                              onChange={(e) => updateChar({ blush: e.target.checked })}
                              className="w-4 h-4 accent-[#C85A53]"
                            />
                            <span>Pipi Merona (Blush)</span>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Outfit & Accessory (Shared for both Avatar & Photo mode!) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#E5DDD3]">
                  <div>
                    <label className="block text-xs font-semibold text-[#5C4F47] mb-1.5">
                      Busana Pengantin
                    </label>
                    <select
                      value={activeChar.outfit}
                      onChange={(e) =>
                        updateChar({ outfit: e.target.value as CharacterConfig['outfit'] })
                      }
                      className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#E5DDD3] text-sm"
                    >
                      {editingRole === 'groom' ? (
                        <>
                          <option value="beskap_hitam_emas">Beskap Hitam Emas</option>
                          <option value="beskap_jawa">Beskap Jawa & Kain Batik</option>
                          <option value="modern_suit">Jas Modern & Dasi</option>
                          <option value="melayu_teluk">Baju Melayu & Songket</option>
                          <option value="pastel_casual">Kasual Pastel</option>
                        </>
                      ) : (
                        <>
                          <option value="kebaya_hitam_emas">Kebaya Hitam Emas</option>
                          <option value="kebaya_modern">Kebaya Modern & Batik</option>
                          <option value="white_gown">Gaun Pengantin Putih</option>
                          <option value="kurung_songket">Baju Kurung Songket</option>
                          <option value="pastel_dress">Gaun Pastel</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#5C4F47] mb-1.5">
                      Aksesoris Kepala / Dada
                    </label>
                    <select
                      value={activeChar.accessory}
                      onChange={(e) =>
                        updateChar({ accessory: e.target.value as CharacterConfig['accessory'] })
                      }
                      className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#E5DDD3] text-sm"
                    >
                      <option value="none">Tanpa Aksesoris</option>
                      {editingRole === 'groom' ? (
                        <>
                          <option value="blangkon">Blangkon Jawa</option>
                          <option value="boutonniere">Bunga Jas (Boutonniere)</option>
                          <option value="peci">Peci Hitam</option>
                        </>
                      ) : (
                        <>
                          <option value="cunduk_mentul">Cunduk Mentul Emas</option>
                          <option value="tiara">Mahkota Kecil (Tiara)</option>
                          <option value="veil">Veil Pengantin</option>
                          <option value="flower_crown">Mahkota Bunga</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#5C4F47] mb-1">
                    Nama Panggilan Pria
                  </label>
                  <input
                    type="text"
                    value={draft.groomNickname}
                    onChange={(e) => setDraft({ ...draft, groomNickname: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DDD3] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5C4F47] mb-1">
                    Nama Panggilan Wanita
                  </label>
                  <input
                    type="text"
                    value={draft.brideNickname}
                    onChange={(e) => setDraft({ ...draft, brideNickname: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DDD3] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5C4F47] mb-1">
                    Nama Lengkap Mempelai Pria
                  </label>
                  <input
                    type="text"
                    value={draft.groomFullName}
                    onChange={(e) => setDraft({ ...draft, groomFullName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DDD3] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5C4F47] mb-1">
                    Nama Lengkap Mempelai Wanita
                  </label>
                  <input
                    type="text"
                    value={draft.brideFullName}
                    onChange={(e) => setDraft({ ...draft, brideFullName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DDD3] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5C4F47] mb-1">
                    Tanggal Acara (Teks)
                  </label>
                  <input
                    type="text"
                    value={draft.weddingDateDisplay}
                    onChange={(e) => setDraft({ ...draft, weddingDateDisplay: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DDD3] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5C4F47] mb-1">
                    Nomor WhatsApp RSVP (628...)
                  </label>
                  <input
                    type="text"
                    value={draft.whatsappRsvp}
                    onChange={(e) => setDraft({ ...draft, whatsappRsvp: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DDD3] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5C4F47] mb-1">
                    Nama Lokasi / Gedung
                  </label>
                  <input
                    type="text"
                    value={draft.venueName}
                    onChange={(e) => setDraft({ ...draft, venueName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DDD3] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5C4F47] mb-1">
                    Nama Rumah Acara (Peta Game)
                  </label>
                  <input
                    type="text"
                    value={draft.acaraStationName}
                    onChange={(e) => setDraft({ ...draft, acaraStationName: e.target.value })}
                    placeholder="Contoh: Joglo Akad & Resepsi"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DDD3] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5C4F47] mb-1">
                    Link Google Maps
                  </label>
                  <input
                    type="url"
                    value={draft.mapsUrl}
                    onChange={(e) => setDraft({ ...draft, mapsUrl: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DDD3] text-sm"
                  />
                </div>
              </div>

              {/* Couple Gallery Photos shown when clicking Gazebo Mempelai */}
              <div className="pt-4 border-t border-[#E5DDD3]">
                <h3 className="font-display text-base font-semibold text-[#2B2320] mb-1">
                  Foto Asli Pengantin (Muncul Saat Ketuk Gazebo Mempelai)
                </h3>
                <p className="text-xs text-[#6B5D54] mb-3">
                  Unggah atau ganti foto pasangan yang muncul ketika tamu mengetuk Gazebo Mempelai di dalam game.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { role: 'groom' as const, label: 'Foto Mempelai Pria', url: draft.groomPhotoUrl },
                    { role: 'bride' as const, label: 'Foto Mempelai Wanita', url: draft.bridePhotoUrl },
                  ].map((item) => (
                    <div key={item.role} className="bg-white border border-[#E5DDD3] rounded-xl p-3 flex items-center gap-3">
                      <div className="w-16 h-20 rounded-lg overflow-hidden bg-[#FAF6F0] border border-[#E5DDD3] shrink-0">
                        {item.url ? (
                          <img
                            src={item.url}
                            alt={item.label}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover object-top"
                          />
                        ) : null}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#2B2320] mb-2">{item.label}</p>
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D6C7B2] bg-[#FAF6F0] text-xs font-semibold text-[#2B2320] hover:bg-[#F3ECE2] cursor-pointer">
                          <Upload className="w-3.5 h-3.5 text-[#C85A53]" />
                          <span>Ganti Foto</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleGalleryPhotoUpload(item.role, e)}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'music_export' && (
            <div className="space-y-6">
              <div className="bg-white border border-[#E5DDD3] rounded-2xl p-6 space-y-4">
                <h3 className="font-display text-lg font-semibold text-[#2B2320]">
                  Pilih Musik Latar Game & Undangan
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(
                    [
                      { id: 'canon_box', title: 'Romansa Pagi', desc: 'Kotak musik lembut' },
                      { id: 'senja_waltz', title: 'Melodi Senja', desc: 'Waltz hangat 3/4' },
                      { id: 'bahagia_8bit', title: 'Bahagia 8-Bit', desc: 'Retro ceria ala game' },
                    ] as { id: MusicTrackId; title: string; desc: string }[]
                  ).map((track) => (
                    <button
                      key={track.id}
                      type="button"
                      onClick={() => {
                        setDraft({ ...draft, musicTrack: track.id });
                        weddingAudio.startMusic(track.id);
                      }}
                      className={`p-4 rounded-xl border text-left transition-colors cursor-pointer ${
                        draft.musicTrack === track.id
                          ? 'border-[#2E6F5E] bg-[#2E6F5E]/8'
                          : 'border-[#E5DDD3] hover:bg-[#FAF6F0]'
                      }`}
                    >
                      <div className="font-semibold text-sm text-[#2B2320]">{track.title}</div>
                      <div className="text-xs text-[#6B5D54] mt-0.5">{track.desc}</div>
                    </button>
                  ))}
                </div>

                <div className="pt-2">
                  <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#D6C7B2] bg-[#FAF6F0] text-xs font-semibold text-[#2B2320] hover:bg-[#F3ECE2] cursor-pointer">
                    <Upload className="w-4 h-4 text-[#C85A53]" />
                    <span>
                      {draft.customMusicName
                        ? `Musik Kustom: ${draft.customMusicName}`
                        : 'Atau Unggah Lagu MP3 Sendiri'}
                    </span>
                    <input type="file" accept="audio/*" onChange={handleAudioUpload} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Standalone HTML Export Card for GitHub */}
              <div className="bg-[#2B2320] text-[#FAF6F0] rounded-2xl p-6 space-y-4">
                <div>
                  <h3 className="font-display text-xl font-semibold mb-1">
                    Export File HTML Siap Upload ke GitHub Pages
                  </h3>
                  <p className="text-sm text-[#D6C7B2] leading-relaxed">
                    Unduh satu file <code className="text-[#FDE68A]">index.html</code> lengkap yang sudah berisi seluruh game 2D, karakter kartun wajah kalian, musik latar, dan halaman undangan. Tidak perlu server atau database.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-[#E5DDD3]">
                  <div className="p-3 rounded-xl bg-white/8">
                    1. Klik tombol Unduh <code className="text-[#FDE68A]">index.html</code> di bawah.
                  </div>
                  <div className="p-3 rounded-xl bg-white/8">
                    2. Buat repository baru di GitHub lalu upload file <code className="text-[#FDE68A]">index.html</code>.
                  </div>
                  <div className="p-3 rounded-xl bg-white/8">
                    3. Aktifkan Settings → Pages → Branch main. Tambah <code className="text-[#FDE68A]">?to=Nama+Tamu</code> di URL!
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 pt-1">
                  <button
                    type="button"
                    disabled={exportingHtml}
                    onClick={handleDownloadStandaloneHtml}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#C85A53] text-white font-semibold text-sm hover:bg-[#B24B44] disabled:opacity-60 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>{exportingHtml ? 'Menyiapkan File...' : 'Unduh index.html untuk GitHub'}</span>
                  </button>
                  {exportedNotice && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#86EFAC]">
                      <Check className="w-4 h-4" />
                      <span>index.html berhasil diunduh!</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 bg-white border-t border-[#E5DDD3]">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-[#6B5D54] hover:text-[#2B2320] cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Default</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#E5DDD3] text-xs font-semibold text-[#5C4F47] hover:bg-[#FAF6F0] cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleApplyAndSave}
              className="px-5 py-2.5 rounded-xl bg-[#2E6F5E] text-white text-xs font-semibold hover:bg-[#24594B] cursor-pointer"
            >
              Simpan Perubahan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
