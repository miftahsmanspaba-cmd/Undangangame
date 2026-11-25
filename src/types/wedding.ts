export type FaceMode = 'vector' | 'photo';

export type GroomHairStyle = 'short_parted' | 'undercut' | 'curly' | 'buzz' | 'pompadour';
export type BrideHairStyle = 'hijab_draped' | 'hijab_syari' | 'long_wavy' | 'low_bun' | 'shoulder_bob';
export type GlassesStyle = 'none' | 'round' | 'square' | 'browline';
export type FacialHairStyle = 'none' | 'mustache' | 'goatee' | 'full_beard';
export type OutfitStyle = 'beskap_hitam_emas' | 'beskap_jawa' | 'modern_suit' | 'pastel_casual' | 'melayu_teluk';
export type BrideOutfitStyle = 'kebaya_hitam_emas' | 'kebaya_modern' | 'white_gown' | 'pastel_dress' | 'kurung_songket';

export interface CharacterConfig {
  role: 'groom' | 'bride';
  faceMode: FaceMode;
  skinTone: string;
  hairColor: string;
  hairStyle: GroomHairStyle | BrideHairStyle;
  eyeColor: string;
  glasses: GlassesStyle;
  facialHair: FacialHairStyle;
  blush: boolean;
  outfit: OutfitStyle | BrideOutfitStyle;
  accessory: 'none' | 'blangkon' | 'peci' | 'cunduk_mentul' | 'tiara' | 'veil' | 'flower_crown' | 'boutonniere';
  /** Base64 Data URL of the cropped + cartoonized face image when faceMode === 'photo' */
  photoCartoonUrl?: string;
  /** Optional raw photo Data URL kept in studio so user can re-adjust cartoonize filter */
  photoRawUrl?: string;
}

export interface ChapterData {
  id: number;
  title: string;
  dateLabel: string;
  location: string;
  story: string;
  skyTop: string;
  skyBottom: string;
  groundColor: string;
  accentColor: string;
}

export interface GiftAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

export interface RsvpEntry {
  id: string;
  name: string;
  status: 'Hadir' | 'Ragu' | 'Tidak Hadir';
  guests: number;
  message: string;
  createdAt: string;
}

export type MusicTrackId = 'canon_box' | 'senja_waltz' | 'bahagia_8bit' | 'custom';

export interface WeddingConfig {
  groomNickname: string;
  groomFullName: string;
  groomParents: string;
  groomPhotoUrl: string;
  brideNickname: string;
  brideFullName: string;
  brideParents: string;
  bridePhotoUrl: string;
  acaraStationName: string;
  weddingDateISO: string;
  weddingDateDisplay: string;
  akadDateDisplay?: string;
  akadTime: string;
  resepsiDateDisplay?: string;
  resepsiTime: string;
  venueName: string;
  venueAddress: string;
  mapsUrl: string;
  whatsappRsvp: string;
  quote: string;
  quoteSource: string;
  musicTrack: MusicTrackId;
  customMusicDataUrl?: string;
  customMusicName?: string;
  groom: CharacterConfig;
  bride: CharacterConfig;
  chapters: ChapterData[];
  gifts: GiftAccount[];
}

export const SKIN_TONES = [
  { label: 'Ivory Cerah', hex: '#FCE0D2' },
  { label: 'Kuning Langsat', hex: '#F3C9A8' },
  { label: 'Sawo Muda', hex: '#E5B490' },
  { label: 'Sawo Matang', hex: '#B97E56' },
  { label: 'Cokelat Hangat', hex: '#8C583A' },
];

export const HAIR_COLORS = [
  { label: 'Hitam Pekat', hex: '#1F1D24' },
  { label: 'Cokelat Tua', hex: '#4A3327' },
  { label: 'Cokelat Karamel', hex: '#7C5035' },
  { label: 'Krem Hijab', hex: '#E8D7C5' },
  { label: 'Sage Hijab', hex: '#88A295' },
  { label: 'Dusty Rose Hijab', hex: '#C98A87' },
  { label: 'Navy Hijab', hex: '#2E4057' },
];

export const DEFAULT_WEDDING_CONFIG: WeddingConfig = {
  groomNickname: 'Rendi',
  groomFullName: 'Rendi Candra Maulana, A.md. Komp.',
  groomParents: 'Putra Bpk. Tobari & Ibu Sutriah · Selapura',
  groomPhotoUrl: '/assets/aistudio/foto_mempelai_pria_f49441b6.jpg',
  brideNickname: 'Bismi',
  brideFullName: 'Bismi Gaviar Putri, A. Md. Komp.',
  brideParents: 'Putri Bpk. Gatot Prianggodo, S.Pd & Ibu Defi Apriyanti · Pakembaran',
  bridePhotoUrl: '/assets/aistudio/1_b2ef2998.jpeg',
  acaraStationName: 'Joglo Akad & Resepsi',
  weddingDateISO: '2026-12-21T09:00:00+07:00',
  weddingDateDisplay: '21 – 22 Desember 2026',
  akadDateDisplay: 'Senin, 21 Desember 2026',
  akadTime: '09.00 WIB s/d selesai',
  resepsiDateDisplay: 'Selasa, 22 Desember 2026',
  resepsiTime: '11.00 WIB s/d selesai',
  venueName: 'Kediaman Mempelai (Pakembaran)',
  venueAddress: 'Gg. Semboja 12 RT. 02/06 Cergomas - Pakembaran, Kec. Slawi - Kab. Tegal',
  mapsUrl: "https://www.google.com/maps/place/6%C2%B058'27.6%22S+109%C2%B007'45.6%22E/@-6.9743333,109.1294906,187m/data=!3m1!1e3!4m4!3m3!8m2!3d-6.9743333!4d109.1293333?hl=id&entry=ttu&g_ep=EgoyMDI2MTEyMy4wIKXMDSoASAFQAw%3D%3D",
  whatsappRsvp: '6281234567890',
  quote: 'Dan di antara tanda-tanda kekuasaan-Nya ialah Dia menciptakan untukmu pasangan hidup dari jenismu sendiri, supaya kamu merasa tenteram kepadanya.',
  quoteSource: 'QS. Ar-Rum: 21',
  musicTrack: 'canon_box',
  groom: {
    role: 'groom',
    faceMode: 'vector',
    skinTone: '#E5B490',
    hairColor: '#1F1D24',
    hairStyle: 'short_parted',
    eyeColor: '#231F20',
    glasses: 'none',
    facialHair: 'none',
    blush: false,
    outfit: 'beskap_hitam_emas',
    accessory: 'blangkon',
  },
  bride: {
    role: 'bride',
    faceMode: 'vector',
    skinTone: '#F3C9A8',
    hairColor: '#1F1D24',
    hairStyle: 'hijab_draped',
    eyeColor: '#231F20',
    glasses: 'none',
    facialHair: 'none',
    blush: true,
    outfit: 'kebaya_hitam_emas',
    accessory: 'cunduk_mentul',
  },
  chapters: [
    {
      id: 1,
      title: 'Taman Pertama',
      dateLabel: '2026',
      location: 'Pakembaran, Slawi',
      story: '',
      skyTop: '#87CEEB',
      skyBottom: '#E0F2FE',
      groundColor: '#5D8C5A',
      accentColor: '#C85A53',
    },
  ],
  gifts: [
    {
      id: 'contoh-bank',
      bankName: 'Contoh Bank (Tanpa Nomor Rekening)',
      accountNumber: 'XXXX-XXXX-XXXX (Contoh)',
      accountHolder: 'Bismi & Rendi',
    },
    {
      id: 'contoh-ewallet',
      bankName: 'Contoh Dompet Digital',
      accountNumber: '08XX-XXXX-XXXX (Contoh)',
      accountHolder: 'Bismi & Rendi',
    },
  ],
};
