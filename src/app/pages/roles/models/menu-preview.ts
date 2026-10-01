import { NavItem } from '@matdash/layouts/full/vertical/sidebar/nav-item/nav-item';

export interface MenuPreviewItem {
  label: string;
  route: string;
  visible: boolean;
}

export interface MenuPreviewGroup {
  label: string;
  items: MenuPreviewItem[];
}

// Built from the sidebar definition so the preview cannot drift from the real menu; hidden screens stay listed as off.
export function buildMenuPreview(groups: NavItem[], canOpen: (route: string) => boolean): MenuPreviewGroup[] {
  return groups.map(group => {
    const children = group.children ?? [];
    return {
      label: children.find(child => child.navCap)?.navCap ?? '',
      items: children.flatMap(child =>
        child.route ? [{ label: child.displayName ?? '', route: child.route, visible: canOpen(child.route) }] : [],
      ),
    };
  });
}
