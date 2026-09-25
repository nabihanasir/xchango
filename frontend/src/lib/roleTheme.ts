/**
 * Per-role accent theming for the app shell (sidebar + header chrome).
 *
 * Every value is a complete, literal Tailwind class string. Do NOT build these
 * by interpolation — Tailwind's JIT scans source text, so a class assembled at
 * runtime (`text-${color}-300`) is never emitted into the stylesheet.
 *
 * `student` intentionally reproduces the original accent-yellow chrome exactly,
 * so the student panel renders unchanged.
 */

export type RoleThemeKey = 'student' | 'advisor' | 'admin';

export interface RoleTheme {
  /** Sidebar panel background (desktop + mobile drawer). */
  sidebarBg: string;
  /** Shadow tint cast by the mobile drawer. */
  sidebarShadow: string;
  /** Ambient blurred blob behind the shell. */
  mesh: string;
  /** Second ambient blob, bottom-left of the shell. */
  meshSecondary: string;
  /** Dimmed overlay behind the mobile drawer. */
  backdrop: string;
  /** Header icon/text colour (mobile menu button). */
  chromeText: string;
  /** Header icon hover colour (notifications button). */
  chromeHoverText: string;
  /** Header name hover colour, applied through the profile `group`. */
  groupHoverText: string;
  /** "Student Panel" / "Advisor Panel" label under the wordmark. */
  panelLabel: string;
  /** Inactive nav row text + hover (desktop sidebar and mobile drawer). */
  navInactive: string;
  /** Sidebar footer buttons ("Collapse Nav") text + hover. */
  footerButton: string;
  /** Sidebar "Sign Out" text + hover. */
  signOut: string;
  /** Active nav row background + text (desktop sidebar). */
  navActive: string;
  /** Active nav row in the mobile drawer, where the label stays white. */
  navActiveMobile: string;
  /** Active nav row left indicator bar. */
  navIndicator: string;
  /** Glow applied to the active nav icon. */
  navActiveIconGlow: string;
  /** Trailing chevron on the active desktop nav row. */
  navChevron: string;
  /** Active icon tint in the mobile drawer (row text stays white there). */
  navActiveIconMobile: string;
  /** Role caption under the user's name in the header. */
  roleCaption: string;
  /** Header avatar gradient. */
  avatar: string;
}

export const roleThemes: Record<RoleThemeKey, RoleTheme> = {
  student: {
    sidebarBg: 'bg-[#060424]/95',
    sidebarShadow: 'shadow-dark-blue',
    mesh: 'bg-accent-yellow/5',
    meshSecondary: 'bg-dark-blue/5',
    backdrop: 'bg-dark-blue/80',
    chromeText: 'text-dark-blue',
    chromeHoverText: 'hover:text-dark-blue',
    groupHoverText: 'group-hover:text-dark-blue',
    navInactive: 'text-white/50 hover:text-white hover:bg-white/5',
    footerButton: 'text-white/40 hover:text-white hover:bg-white/5',
    signOut: 'text-white/40 hover:text-red-400 hover:bg-red-500/10',
    panelLabel: 'text-accent-yellow/80',
    navActive: 'bg-accent-yellow/10 text-accent-yellow shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]',
    navActiveMobile: 'bg-accent-yellow/10 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]',
    navIndicator: 'bg-accent-yellow shadow-[0_0_10px_rgba(251,210,19,0.5)]',
    navActiveIconGlow: 'drop-shadow-[0_0_8px_rgba(251,210,19,0.3)]',
    navChevron: 'text-accent-yellow',
    navActiveIconMobile: 'text-accent-yellow drop-shadow-[0_0_8px_rgba(251,210,19,0.3)]',
    roleCaption: 'text-accent-yellow',
    avatar: 'from-dark-blue to-[#1A1558]',
  },
  advisor: {
    sidebarBg: 'bg-[#03110c]/95',
    sidebarShadow: 'shadow-emerald-950',
    mesh: 'bg-emerald-400/5',
    meshSecondary: 'bg-dark-blue/5',
    backdrop: 'bg-dark-blue/80',
    chromeText: 'text-dark-blue',
    chromeHoverText: 'hover:text-dark-blue',
    groupHoverText: 'group-hover:text-dark-blue',
    navInactive: 'text-white/50 hover:text-white hover:bg-white/5',
    footerButton: 'text-white/40 hover:text-white hover:bg-white/5',
    signOut: 'text-white/40 hover:text-red-400 hover:bg-red-500/10',
    panelLabel: 'text-emerald-300/80',
    navActive: 'bg-emerald-400/10 text-emerald-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]',
    navActiveMobile: 'bg-emerald-400/10 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]',
    navIndicator: 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]',
    navActiveIconGlow: 'drop-shadow-[0_0_8px_rgba(52,211,153,0.35)]',
    navChevron: 'text-emerald-300',
    navActiveIconMobile: 'text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.35)]',
    roleCaption: 'text-emerald-700',
    avatar: 'from-emerald-600 to-emerald-900',
  },
  admin: {
    sidebarBg: 'bg-gradient-to-b from-[#A81E27] to-[#6E1017]',
    sidebarShadow: 'shadow-maroon-deep',
    mesh: 'bg-red-400/5',
    meshSecondary: 'bg-maroon/5',
    backdrop: 'bg-maroon/80',
    chromeText: 'text-maroon',
    chromeHoverText: 'hover:text-maroon',
    groupHoverText: 'group-hover:text-maroon',
    navInactive: 'text-white/80 hover:text-white hover:bg-white/10',
    footerButton: 'text-white/70 hover:text-white hover:bg-white/10',
    signOut: 'text-white/70 hover:text-white hover:bg-white/15',
    panelLabel: 'text-white/80',
    navActive: 'bg-white/20 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]',
    navActiveMobile: 'bg-white/20 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]',
    navIndicator: 'bg-accent-yellow shadow-[0_0_10px_rgba(251,210,19,0.5)]',
    navActiveIconGlow: 'drop-shadow-[0_0_8px_rgba(251,210,19,0.4)]',
    navChevron: 'text-accent-yellow',
    navActiveIconMobile: 'text-accent-yellow drop-shadow-[0_0_8px_rgba(251,210,19,0.4)]',
    roleCaption: 'text-maroon',
    avatar: 'from-maroon to-maroon-deep',
  },
};
