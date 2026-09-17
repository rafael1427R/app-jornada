import {
  Ambulance,
  BarChart3,
  BedDouble,
  CalendarClock,
  CalendarDays,
  FileText,
  HeartPulse,
  IdCard,
  LayoutDashboard,
  LayoutGrid,
  ScrollText,
  ShieldCheck,
  Stethoscope,
  Wrench,
} from 'lucide-react'

export const MODULE_ICONS = {
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
  ScrollText,
  ShieldCheck,
}

export function moduleIcon(name) {
  return MODULE_ICONS[name] || LayoutDashboard
}
