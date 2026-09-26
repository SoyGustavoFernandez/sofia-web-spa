import { NavItem } from './nav-item/nav-item';

// Hides routes the user cannot open, then drops section captions and groups left without items.
export function visibleNavItems(groups: NavItem[], canOpen: (route: string) => boolean): NavItem[] {
  return groups
    .map(group => ({ ...group, children: visibleChildren(group.children ?? [], canOpen) }))
    .filter(group => group.children.some(child => !child.navCap));
}

function visibleChildren(children: NavItem[], canOpen: (route: string) => boolean): NavItem[] {
  const allowed = children.filter(child => child.navCap || !child.route || canOpen(child.route));
  return allowed.filter((child, i) => !child.navCap || (i + 1 < allowed.length && !allowed[i + 1].navCap));
}
