export interface NavItem {
  name?: string;
  displayName?: string | null;
  disabled?: boolean;
  external?: boolean;
  twoLines?: boolean;
  divider?: boolean;
  chip?: boolean;
  iconName?: string | null;
  navCap?: string | null;
  chipContent?: string;
  chipClass?: string;
  subtext?: string;
  route?: string | null;
  children?: NavItem[] | null;
  ddType?: string;
  id?: number | null;
  subItemIcon?: boolean;
  tooltip?: string | null;
}
