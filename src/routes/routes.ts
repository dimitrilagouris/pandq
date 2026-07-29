import React from 'react';
import * as Icons from 'react-icons/ri';

const {
  RiReceiptLine,
  RiDashboardLine,
  RiGroup3Line,
  RiPulseLine,
  RiSettings3Line,
  RiFileLine,
} = Icons;

// ─── Types ────────────────────────────────────────────────────────────────────

/** All valid page keys in the application. */
export type PageKey =
  | 'dashboard'
  | 'invoices'
  | 'invoice-editor'
  | 'clients'
  | 'activities'
  | 'settings';

/**
 * A route definition entry.
 *
 * @property key          - Unique page identifier used as the `Page` discriminant.
 * @property label        - Human-readable display name shown in the sidebar.
 * @property icon         - React-Icons component to render for this route.
 * @property inSidebar    - Whether this route should appear in the sidebar nav.
 * @property sidebarGroup - Optional group label for sectioning the sidebar.
 * @property order        - Sort order within a sidebar group (lower = higher up).
 */
export interface RouteDefinition {
  key: PageKey;
  label: string;
  icon: React.ElementType;
  inSidebar: boolean;
  sidebarGroup?: string;
  order?: number;
}

// ─── Route Registry ───────────────────────────────────────────────────────────

/**
 * The single source of truth for all application routes.
 *
 * To add a new page:
 *   1. Add its key to the `PageKey` union above.
 *   2. Add an entry here with the desired icon and sidebar config.
 *   3. Handle the new key in `App.tsx`'s `renderPage` switch.
 */
export const ROUTES: RouteDefinition[] = [
  {
    key: 'invoices',
    label: 'Invoices',
    icon: RiReceiptLine,
    inSidebar: true,
    sidebarGroup: 'Pages',
    order: 1,
  },
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: RiDashboardLine,
    inSidebar: true,
    sidebarGroup: 'Pages',
    order: 2,
  },
  {
    key: 'clients',
    label: 'Clients',
    icon: RiGroup3Line,
    inSidebar: true,
    sidebarGroup: 'Pages',
    order: 3,
  },
  {
    key: 'activities',
    label: 'Activity',
    icon: RiPulseLine,
    inSidebar: true,
    sidebarGroup: 'Pages',
    order: 4,
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: RiSettings3Line,
    inSidebar: true,
    sidebarGroup: 'Pages',
    order: 5,
  },
  {
    key: 'invoice-editor',
    label: 'Invoice Editor',
    icon: RiFileLine,
    // Not shown in the sidebar — reached via action button or programmatic nav
    inSidebar: false,
  },
];

// ─── Derived Helpers ──────────────────────────────────────────────────────────

/**
 * Returns only the routes that should appear in the sidebar, sorted by order.
 */
export function getSidebarRoutes(): RouteDefinition[] {
  const routes = ROUTES.filter((r) => r.inSidebar);

  return routes.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
}

/**
 * Returns the unique sidebar group labels, preserving the order they first appear.
 */
export function getSidebarGroups(): string[] {
  const seen = new Set<string>();
  const groups: string[] = [];

  for (const route of getSidebarRoutes()) {
    if (route.sidebarGroup && !seen.has(route.sidebarGroup)) {
      seen.add(route.sidebarGroup);
      groups.push(route.sidebarGroup);
    }
  }

  return groups;
}

/**
 * Returns all sidebar routes belonging to a specific group.
 *
 * @param group - The sidebarGroup label to filter by.
 */
export function getRoutesByGroup(group: string): RouteDefinition[] {
  const routes = getSidebarRoutes();

  return routes.filter((r) => r.sidebarGroup === group);
}
