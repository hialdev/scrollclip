import type { KineticSettings } from "./types";

export interface KineticTemplate {
  id: string;
  name: string;
  description: string;
  defaults: Partial<KineticSettings>;
}

export interface Anim {
  id: string;
  name: string;
  css: string; // CSS keyframes body for the effect
}

export const ANIM_IN: Anim[] = [
  { id: "fade_up", name: "Fade Up", css: "opacity:0; transform:translateY(24px)" },
  { id: "pop", name: "Pop", css: "opacity:0; transform:scale(0.3)" },
  { id: "slide_left", name: "Slide In Left", css: "transform:translateX(-60px)" },
  { id: "slide_right", name: "Slide In Right", css: "transform:translateX(60px)" },
  { id: "rotate_in", name: "Rotate In", css: "transform:rotate(-12deg) scale(0.8)" },
  { id: "typewriter", name: "Typewriter", css: "width:0; overflow:hidden; white-space:nowrap" },
  { id: "blur_in", name: "Blur In", css: "filter:blur(12px); opacity:0" },
  { id: "bounce_drop", name: "Bounce Drop", css: "transform:translateY(-40px)" },
  { id: "zoom_out", name: "Zoom Out", css: "transform:scale(2.2); opacity:0" },
  { id: "flip_up", name: "Flip Up", css: "transform:perspective(400px) rotateX(90deg)" },
];

export const ANIM_IDLE: Anim[] = [
  { id: "none", name: "Static", css: "" },
  { id: "pulse", name: "Pulse", css: "animation:pulse 1s ease-in-out infinite" },
  { id: "shake", name: "Shake", css: "animation:shake 0.4s linear infinite" },
  { id: "float", name: "Float", css: "animation:float 2s ease-in-out infinite" },
  { id: "wiggle", name: "Wiggle", css: "animation:wiggle 0.8s ease-in-out infinite" },
  { id: "glow", name: "Glow", css: "animation:glow 1.4s ease-in-out infinite" },
];

export const ANIM_OUT: Anim[] = [
  { id: "fade_out", name: "Fade Out", css: "opacity:0" },
  { id: "shrink", name: "Shrink", css: "transform:scale(0)" },
  { id: "slide_out_left", name: "Slide Out Left", css: "transform:translateX(-60px)" },
  { id: "slide_out_right", name: "Slide Out Right", css: "transform:translateX(60px)" },
  { id: "shatter", name: "Shatter", css: "transform:rotate(8deg) scale(1.4); opacity:0" },
  { id: "drop_out", name: "Drop Out", css: "transform:translateY(40px); opacity:0" },
  { id: "blur_out", name: "Blur Out", css: "filter:blur(12px); opacity:0" },
  { id: "spin_out", name: "Spin Out", css: "transform:rotate(360deg) scale(0); opacity:0" },
];

export const KINETIC_TEMPLATES: KineticTemplate[] = [
  { id: "paper", name: "Paper Text", description: "Active word rotates with active-state color, paper texture feel", defaults: { animIn: "rotate_in", animIdle: "none", animOut: "shatter" } },
  { id: "rounded_box", name: "Rounded Box", description: "Line wrapped in a box; active word gets a filled rounded box", defaults: { animIn: "pop", animIdle: "pulse", animOut: "fade_out" } },
  { id: "simple_stroked", name: "Simple Stroked", description: "Outlined text, active word fills in", defaults: { animIn: "zoom_out", animIdle: "none", animOut: "fade_out" } },
  { id: "simple", name: "Simple", description: "Clean minimal word-by-word captions", defaults: { animIn: "fade_up", animIdle: "none", animOut: "fade_out" } },
  { id: "glow_stroked", name: "Glow Stroked", description: "Outlined text with neon glow on the active word", defaults: { animIn: "blur_in", animIdle: "glow", animOut: "blur_out" } },
  { id: "glow", name: "Glow", description: "Filled text with a soft animated glow", defaults: { animIn: "fade_up", animIdle: "glow", animOut: "fade_out" } },
  { id: "broken", name: "Broken / Crack", description: "Shake in, crack accent on active, shatter out", defaults: { animIn: "bounce_drop", animIdle: "shake", animOut: "shatter" } },
  { id: "typewriter", name: "Typewriter", description: "Characters appear one by one with a caret", defaults: { animIn: "typewriter", animIdle: "none", animOut: "fade_out" } },
  { id: "karaoke", name: "Karaoke", description: "Words fill with the accent color as they are spoken", defaults: { animIn: "fade_up", animIdle: "none", animOut: "slide_out_left" } },
  { id: "bounce", name: "Bounce", description: "Words drop in with springy bounce, idle float", defaults: { animIn: "bounce_drop", animIdle: "float", animOut: "drop_out" } },
  { id: "neon_flicker", name: "Neon Flicker", description: "Neon sign text that flickers on the active word", defaults: { animIn: "blur_in", animIdle: "wiggle", animOut: "blur_out" } },
  { id: "sticker", name: "Sticker Pop", description: "Bold sticker-style words with white outline, pop in", defaults: { animIn: "pop", animIdle: "float", animOut: "shrink" } },
  { id: "slide_stack", name: "Slide Stack", description: "Lines slide in and stack like a news ticker", defaults: { animIn: "slide_left", animIdle: "none", animOut: "slide_out_right" } },
  { id: "flip_card", name: "Flip Card", description: "Words flip like cards in 3D", defaults: { animIn: "flip_up", animIdle: "none", animOut: "spin_out" } },
  { id: "highlight", name: "Highlighter", description: "Active word gets a marker-pen highlight sweep", defaults: { animIn: "fade_up", animIdle: "none", animOut: "slide_out_left" } },
  { id: "wave", name: "Wave", description: "Words bob in a smooth wave across the line", defaults: { animIn: "fade_up", animIdle: "float", animOut: "fade_out" } },
];

export const defaultKinetic = (): KineticSettings => ({
  templateId: "simple",
  animIn: "fade_up",
  animIdle: "none",
  animOut: "fade_out",
  fontFamily: "Inter",
  fontSize: 42,
  letterSpacing: 0,
  caps: true,
  colorPrimary: "#ffffff",
  colorActive: "#00d1b2",
  colorAccent: "#6c5ce7",
  words: 3,
});
