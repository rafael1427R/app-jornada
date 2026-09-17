import {
  Ambulance,
  BarChart3,
  BedDouble,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  FileText,
  HeartPulse,
  IdCard,
  LayoutDashboard,
  LayoutGrid,
  Package,
  Salad,
  ScrollText,
  Tags,
  ShieldCheck,
  Stethoscope,
  Wrench,
} from 'lucide-react'

export const MODULE_ICONS = {
  ClipboardCheck,
  LayoutDashboard,
  LayoutGrid,
  CalendarDays,
  Stethoscope,
  FileText,
  Wrench,
  BarChart3,
  HeartPulse,
  CalendarClock,
  IdCard,
  BedDouble,
  Ambulance,
  Salad,
  Tags,
  Package,
  ScrollText,
  ShieldCheck,
}

export function moduleIcon(name) {
  return MODULE_ICONS[name] || LayoutDashboard
}
