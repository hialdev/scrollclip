export type EditMode =
  | "clip_moment"
  | "clip_maker"
  | "clip_maker_ranking"
  | "clip_maker_compilation"
  | "clip_quotes"
  | "clip_from_images";

export interface EditModeInfo {
  id: EditMode;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
}

export const EDIT_MODES: EditModeInfo[] = [
  {
    id: "clip_moment",
    title: "Clip Moment",
    subtitle: "AI picks viral moments",
    description:
      "AI scans your raw video and detects the most engaging moments, then cuts them into standalone short clips.",
    icon: "moment",
  },
  {
    id: "clip_maker",
    title: "Clip Maker",
    subtitle: "Manual cut to short",
    description:
      "Pick the segments yourself and turn them into a polished vertical short with kinetic subtitles.",
    icon: "maker",
  },
  {
    id: "clip_maker_ranking",
    title: "Clip Maker Ranking",
    subtitle: "Top-N countdown",
    description:
      "Turn ranked highlights into a countdown compilation (Top 5, Top 10) with numbered overlays.",
    icon: "ranking",
  },
  {
    id: "clip_maker_compilation",
    title: "Clip Maker Compilation",
    subtitle: "Multi-source mashup",
    description:
      "Combine segments from several videos into one compilation with smooth transitions.",
    icon: "compilation",
  },
  {
    id: "clip_quotes",
    title: "Clip Quotes",
    subtitle: "Quote cards",
    description:
      "Turn transcript highlights into animated quote cards with kinetic typography.",
    icon: "quotes",
  },
  {
    id: "clip_from_images",
    title: "Clip From Images",
    subtitle: "Images to video",
    description:
      "Turn uploaded or AI-generated images into an animated video with motion and captions.",
    icon: "images",
  },
];

export const WIZARD_STEPS = [
  "Mode",
  "Sources",
  "Audio & Subs",
  "Kinetic Style",
  "Process",
] as const;
