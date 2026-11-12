/**
 * Per-role accent theming for the app shell (sidebar + header chrome).
 *
 * Every value is a complete, literal Tailwind class string. Do NOT build these
 * by interpolation — Tailwind's JIT scans source text, so a class assembled at
 * runtime (`text-${color}-300`) is never emitted into the stylesheet.
 *
 * Colors come from the role tokens in tailwind.config.js (student, advisor, admin).
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
  /** Sidebar footer buttons ("Collapse") text + hover. */
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


/**
 * Shared chrome: every portal uses the same gold active indicator and the same white-on-dark nav states, so the
 * three portals read as one app. Only the sidebar base, avatar and role caption change per role.
 */
const sharedChrome = {
  navInactive: 'text-white/55 hover:text-white hover:bg-white/5',
  footerButton: 'text-white/40 hover:text-white hover:bg-white/5',
  signOut: 'text-white/40 hover:text-red-400 hover:bg-red-500/10',
  panelLabel: 'text-accent-yellow/80',
  navActive: 'bg-white/10 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]',
  navActiveMobile: 'bg-white/10 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]',
  navIndicator: 'bg-accent-yellow shadow-[0_0_10px_rgba(251,210,19,0.5)]',
  navActiveIconGlow: 'drop-shadow-[0_0_8px_rgba(251,210,19,0.3)]',
  navChevron: 'text-accent-yellow',
  navActiveIconMobile: 'text-accent-yellow drop-shadow-[0_0_8px_rgba(251,210,19,0.3)]',
} as const;

export const roleThemes: Record<RoleThemeKey, RoleTheme> = {
  student: {
    ...sharedChrome,
    sidebarBg: 'bg-student-side',
    sidebarShadow: 'shadow-student-side',
    mesh: 'bg-accent-yellow/5',
    meshSecondary: 'bg-dark-blue/5',
    backdrop: 'bg-student-side/80',
    chromeText: 'text-dark-blue',
    chromeHoverText: 'hover:text-dark-blue',
    groupHoverText: 'group-hover:text-dark-blue',
    roleCaption: 'text-dark-blue',
    avatar: 'bg-dark-blue',
  },
  advisor: {
    ...sharedChrome,
    sidebarBg: 'bg-advisor-side',
    sidebarShadow: 'shadow-advisor-side',
    mesh: 'bg-advisor/5',
    meshSecondary: 'bg-dark-blue/5',
    backdrop: 'bg-advisor-side/80',
    chromeText: 'text-advisor',
    chromeHoverText: 'hover:text-advisor',
    groupHoverText: 'group-hover:text-advisor',
    roleCaption: 'text-advisor',
    avatar: 'bg-advisor',
  },
  admin: {
    ...sharedChrome,
    sidebarBg: 'bg-admin-deep',
    sidebarShadow: 'shadow-admin-deep',
    mesh: 'bg-admin/5',
    meshSecondary: 'bg-admin/5',
    backdrop: 'bg-admin-deep/80',
    chromeText: 'text-admin',
    chromeHoverText: 'hover:text-admin',
    groupHoverText: 'group-hover:text-admin',
    roleCaption: 'text-admin',
    avatar: 'bg-admin',
  },
};
