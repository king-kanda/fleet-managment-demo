import type { CSSProperties } from 'react'
import {
  LayoutDashboard,
  Map,
  Truck,
  Route,
  Users,
  MessageCircle,
  Settings,
  Bell,
  Plus,
  Send,
  Fuel,
  Play,
  Pause,
  RefreshCw,
  Gauge,
  Clock,
  Check,
  X,
  MoreVertical,
  Pencil,
  Trash2,
  LogOut,
  Search,
  Phone,
  Star,
  Car,
  Lock,
  Mail,
  User,
  Eye,
  Sparkles,
  ChevronDown,
  Bike,
  type LucideIcon,
} from 'lucide-react'

// Single, consistent icon set (Lucide). Call sites use stable string names so
// swapping the underlying set never touches a page.
const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  map: Map,
  truck: Truck,
  route: Route,
  users: Users,
  chat: MessageCircle,
  settings: Settings,
  bell: Bell,
  plus: Plus,
  send: Send,
  fuel: Fuel,
  play: Play,
  pause: Pause,
  refresh: RefreshCw,
  gauge: Gauge,
  clock: Clock,
  check: Check,
  close: X,
  more: MoreVertical,
  edit: Pencil,
  trash: Trash2,
  logout: LogOut,
  search: Search,
  phone: Phone,
  star: Star,
  car: Car,
  bike: Bike,
  lock: Lock,
  mail: Mail,
  user: User,
  eye: Eye,
  sparkles: Sparkles,
  'chevron-down': ChevronDown,
}

interface Props {
  name: string
  size?: number
  style?: CSSProperties
  strokeWidth?: number
}

export function Icon({ name, size = 18, style, strokeWidth = 1.9 }: Props) {
  const Cmp = ICONS[name] ?? LayoutDashboard
  return <Cmp size={size} strokeWidth={strokeWidth} style={style} aria-hidden />
}
