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
  /** Ambient blurred blob behind the shell. */
  mesh: string;
  /** "Student Panel" / "Advisor Panel" label under the wordmark. */
  panelLabel: string;
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
    mesh: 'bg-accent-yellow/5',
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
    mesh: 'bg-emerald-400/5',
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
    mesh: 'bg-violet-400/5',
    panelLabel: 'text-violet-300/80',
    navActive: 'bg-violet-400/10 text-violet-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]',
    navActiveMobile: 'bg-violet-400/10 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]',
    navIndicator: 'bg-violet-400 shadow-[0_0_10px_rgba(167,139,250,0.5)]',
    navActiveIconGlow: 'drop-shadow-[0_0_8px_rgba(167,139,250,0.35)]',
    navChevron: 'text-violet-300',
    navActiveIconMobile: 'text-violet-300 drop-shadow-[0_0_8px_rgba(167,139,250,0.35)]',
    roleCaption: 'text-violet-600',
    avatar: 'from-violet-600 to-violet-900',
  },
};
