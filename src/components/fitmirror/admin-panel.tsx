'use client'

import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import {
  Lock,
  LogOut,
  LayoutDashboard,
  Users,
  CreditCard,
  Settings,
  Sparkles,
  TrendingUp,
  DollarSign,
  Image as ImageIcon,
  Loader2,
  ShieldCheck,
  KeyRound,
  ArrowUpRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'

type AdminTab = 'dashboard' | 'users' | 'payments' | 'settings'

interface Analytics {
  totalUsers: number
  totalTryOns: number
  todayTryOns: number
  tryOnsByDay: { date: string; count: number }[]
  planDistribution: { free: number; pro: number; premium: number }
  topGarments: { name: string; count: number }[]
  revenueCents: number
  recentUsers: {
    id: string
    plan: string
    createdAt: string
    lastActive: string
    tryOnCount: number
  }[]
  recentPayments: {
    id: string
    sessionId: string
    amountCents: number
    plan: string
    createdAt: string
  }[]
}

interface AdminUser {
  id: string
  plan: string
  createdAt: string
  lastActive: string
  tryOnCount: number
  paymentCountCents: number
}

interface AdminPayment {
  id: string
  sessionId: string
  amountCents: number
  currency: string
  plan: string
  status: string
  createdAt: string
}

const PLAN_COLORS: Record<string, string> = {
  free: 'oklch(0.7 0.18 10)',
  pro: 'oklch(0.85 0.1 150)',
  premium: 'oklch(0.82 0.09 290)',
}

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}
function short(id: string) {
  return id.slice(-6)
}

export function AdminPanel() {
  const qc = useQueryClient()
  const [isAdmin, setIsAdmin] = React.useState<boolean | null>(null)
  const [un, setUn] = React.useState('')
  const [pw, setPw] = React.useState('')
  const [loggingIn, setLoggingIn] = React.useState(false)
  const [tab, setTab] = React.useState<AdminTab>('dashboard')

  // check admin session
  const sessionQ = useQuery({
    queryKey: ['admin-session'],
    queryFn: async () => {
      const r = await fetch('/api/admin/session')
      const d = await r.json()
      return d.isAdmin as boolean
    },
  })
  React.useEffect(() => {
    if (sessionQ.data !== undefined) setIsAdmin(sessionQ.data)
  }, [sessionQ.data])

  const login = async () => {
    setLoggingIn(true)
    try {
      const r = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: un, password: pw }),
      })
      const d = await r.json()
      if (r.ok && d.ok) {
        setIsAdmin(true)
        setUn('')
        setPw('')
        sessionQ.refetch()
        toast.success('Welcome to the admin console.')
      } else {
        toast.error(d.error || 'Invalid credentials.')
      }
    } catch {
      toast.error('Network error.')
    } finally {
      setLoggingIn(false)
    }
  }

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    setIsAdmin(false)
    qc.invalidateQueries({ queryKey: ['admin-session'] })
    toast.success('Signed out.')
  }

  if (isAdmin === null) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <Card className="mx-auto max-w-md p-8 fm-shadow">
        <div className="text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand-soft-foreground">
            <Lock className="h-7 w-7" />
          </div>
          <h2 className="font-display mt-4 text-2xl font-semibold">
            Admin console
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in with your admin username &amp; password to manage APIs,
            users, payments &amp; analytics.
          </p>
        </div>
        <div className="mt-6 space-y-3">
          <Label htmlFor="adminun">Admin username</Label>
          <Input
            id="adminun"
            type="text"
            value={un}
            onChange={(e) => setUn(e.target.value)}
            placeholder="admin"
            autoFocus
          />
          <Label htmlFor="adminpw">Admin password</Label>
          <Input
            id="adminpw"
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && login()}
            placeholder="••••••••"
          />
          <Button
            onClick={login}
            disabled={loggingIn || !pw || !un}
            className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
          >
            {loggingIn ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="mr-2 h-4 w-4" />
            )}
            Unlock
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Default: <code className="font-mono">admin</code> /{' '}
            <code className="font-mono">fitmirror2024</code>
          </p>
        </div>
      </Card>
    )
  }

  const TABS: { key: AdminTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'users', label: 'Users', icon: Users },
    { key: 'payments', label: 'Payments', icon: CreditCard },
    { key: 'settings', label: 'API & Settings', icon: Settings },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold">Admin console</h2>
          <p className="text-sm text-muted-foreground">
            Manage APIs, users, payments &amp; analytics.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={logout}>
          <LogOut className="mr-1.5 h-4 w-4" /> Sign out
        </Button>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto rounded-2xl border border-border/60 bg-card p-1 fm-scroll">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            data-active={tab === t.key}
            className="flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[active=true]:bg-brand-soft data-[active=true]:text-brand-soft-foreground"
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && <Dashboard />}
      {tab === 'users' && <UsersTab />}
      {tab === 'payments' && <PaymentsTab />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  )
}

/* ---------------- Dashboard ---------------- */
function Dashboard() {
  const { data, isLoading } = useQuery<Analytics>({
    queryKey: ['admin-analytics'],
    queryFn: async () => {
      const r = await fetch('/api/admin/analytics')
      if (!r.ok) throw new Error()
      return r.json()
    },
  })

  if (isLoading || !data) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const pieData = [
    { name: 'Free', value: data.planDistribution.free, key: 'free' },
    { name: 'Pro', value: data.planDistribution.pro, key: 'pro' },
    { name: 'Premium', value: data.planDistribution.premium, key: 'premium' },
  ].filter((d) => d.value > 0)

  const stats = [
    { icon: Users, label: 'Total users', value: data.totalUsers, tone: 'brand' },
    { icon: ImageIcon, label: 'Total try-ons', value: data.totalTryOns, tone: 'peach' },
    { icon: TrendingUp, label: 'Try-ons today', value: data.todayTryOns, tone: 'mint' },
    { icon: DollarSign, label: 'Revenue', value: money(data.revenueCents), tone: 'lavender' },
  ]

  return (
    <div className="space-y-5">
      {/* stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-4 fm-shadow">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <s.icon className="h-3.5 w-3.5" /> {s.label}
            </div>
            <div className="font-display mt-1.5 text-2xl font-bold tabular-nums">
              {s.value}
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* try-ons trend */}
        <Card className="p-5 lg:col-span-2 fm-shadow">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-semibold">
              Try-ons · last 14 days
            </h3>
            <Badge variant="secondary">
              <TrendingUp className="mr-1 h-3 w-3" /> live
            </Badge>
          </div>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.tryOnsByDay}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.7 0.18 10)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="oklch(0.7 0.18 10)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(d) => d.slice(5)}
                  stroke="oklch(0.6 0 0 / 0.4)"
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="oklch(0.6 0 0 / 0.4)" />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid oklch(0.9 0 0 / 0.4)',
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="oklch(0.7 0.18 10)"
                  strokeWidth={2}
                  fill="url(#g1)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* plan distribution */}
        <Card className="p-5 fm-shadow">
          <h3 className="font-display text-base font-semibold">Plan mix</h3>
          <div className="mt-2 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                >
                  {pieData.map((d) => (
                    <Cell key={d.key} fill={PLAN_COLORS[d.key]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* top garments + recent users */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5 fm-shadow">
          <h3 className="font-display text-base font-semibold">Top garments</h3>
          {data.topGarments.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No data yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {data.topGarments.map((g, i) => {
                const max = data.topGarments[0]?.count || 1
                return (
                  <li key={g.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate">
                        <span className="mr-2 text-muted-foreground">
                          {i + 1}.
                        </span>
                        {g.name}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {g.count}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${(g.count / max) * 100}%` }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card className="p-5 fm-shadow">
          <h3 className="font-display text-base font-semibold">Recent users</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {data.recentUsers.map((u) => (
              <li
                key={u.id}
                className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/50"
              >
                <span className="font-mono text-xs text-muted-foreground">
                  …{short(u.id)}
                </span>
                <Badge
                  variant="outline"
                  className="capitalize"
                  style={{ color: PLAN_COLORS[u.plan] }}
                >
                  {u.plan}
                </Badge>
                <span className="tabular-nums text-muted-foreground">
                  {u.tryOnCount} try-ons
                </span>
              </li>
            ))}
            {data.recentUsers.length === 0 && (
              <p className="text-muted-foreground">No users yet.</p>
            )}
          </ul>
        </Card>
      </div>
    </div>
  )
}

/* ---------------- Users ---------------- */
function UsersTab() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery<AdminUser[]>({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const r = await fetch('/api/admin/users?limit=100')
      if (!r.ok) throw new Error()
      return r.json()
    },
  })

  const upgrade = async (id: string, plan: string) => {
    try {
      const r = await fetch('/api/admin/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: id, plan }),
      })
      if (!r.ok) throw new Error()
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      qc.invalidateQueries({ queryKey: ['admin-analytics'] })
      toast.success(`User upgraded to ${plan}.`)
    } catch {
      toast.error('Could not upgrade.')
    }
  }

  if (isLoading) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <Card className="p-5 fm-shadow">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-semibold">
          Users ({data?.length ?? 0})
        </h3>
      </div>
      <div className="mt-4 max-h-[560px] overflow-y-auto fm-scroll">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-2">Session</th>
              <th className="p-2">Plan</th>
              <th className="p-2">Try-ons</th>
              <th className="p-2">Spent</th>
              <th className="p-2">Last active</th>
              <th className="p-2">Change plan</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((u) => (
              <tr key={u.id} className="border-t border-border/50">
                <td className="p-2 font-mono text-xs">…{short(u.id)}</td>
                <td className="p-2">
                  <Badge
                    variant="outline"
                    className="capitalize"
                    style={{ color: PLAN_COLORS[u.plan] }}
                  >
                    {u.plan}
                  </Badge>
                </td>
                <td className="p-2 tabular-nums">{u.tryOnCount}</td>
                <td className="p-2 tabular-nums">{money(u.paymentCountCents)}</td>
                <td className="p-2 text-xs text-muted-foreground">
                  {new Date(u.lastActive).toLocaleDateString()}
                </td>
                <td className="p-2">
                  <Select onValueChange={(v) => upgrade(u.id, v)}>
                    <SelectTrigger className="h-8 w-28 text-xs">
                      <SelectValue placeholder="Set plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
              </tr>
            ))}
            {(data ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  No users yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

/* ---------------- Payments ---------------- */
function PaymentsTab() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery<AdminPayment[]>({
    queryKey: ['admin-payments'],
    queryFn: async () => {
      const r = await fetch('/api/admin/payments?limit=100')
      if (!r.ok) throw new Error()
      return r.json()
    },
  })

  const [sid, setSid] = React.useState('')
  const [plan, setPlan] = React.useState<'pro' | 'premium'>('pro')
  const [adding, setAdding] = React.useState(false)

  const addPayment = async () => {
    if (!sid) {
      toast.error('Enter a session id.')
      return
    }
    setAdding(true)
    try {
      const amountCents = plan === 'pro' ? 999 : 1999
      const r = await fetch('/api/admin/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid, amountCents, plan }),
      })
      const d = await r.json()
      if (!r.ok) {
        toast.error(d.error || 'Failed.')
        return
      }
      qc.invalidateQueries({ queryKey: ['admin-payments'] })
      qc.invalidateQueries({ queryKey: ['admin-analytics'] })
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      setSid('')
      toast.success(`Recorded ${money(amountCents)} ${plan} payment.`)
    } catch {
      toast.error('Network error.')
    } finally {
      setAdding(false)
    }
  }

  const total = (data ?? []).reduce((s, p) => s + p.amountCents, 0)

  return (
    <div className="space-y-4">
      <Card className="p-5 fm-shadow">
        <h3 className="font-display text-base font-semibold">Record a payment</h3>
        <p className="text-sm text-muted-foreground">
          Manually record a (mock) payment &amp; instantly upgrade a user’s plan.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <Label className="text-xs">Session id</Label>
            <Input
              value={sid}
              onChange={(e) => setSid(e.target.value)}
              placeholder="cmri…"
              className="font-mono text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Plan</Label>
            <Select
              value={plan}
              onValueChange={(v) => setPlan(v as 'pro' | 'premium')}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pro">Pro · $9.99</SelectItem>
                <SelectItem value="premium">Premium · $19.99</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={addPayment}
            disabled={adding}
            className="bg-brand text-brand-foreground hover:bg-brand/90"
          >
            {adding ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="mr-1.5 h-4 w-4" />
            )}
            Record
          </Button>
        </div>
      </Card>

      <Card className="p-5 fm-shadow">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-semibold">
            Payments ({data?.length ?? 0})
          </h3>
          <Badge variant="secondary" className="tabular-nums">
            <DollarSign className="mr-1 h-3 w-3" /> {money(total)}
          </Badge>
        </div>
        <div className="mt-4 max-h-[480px] overflow-y-auto fm-scroll">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-2">Payment</th>
                <th className="p-2">Session</th>
                <th className="p-2">Plan</th>
                <th className="p-2">Amount</th>
                <th className="p-2">Status</th>
                <th className="p-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((p) => (
                <tr key={p.id} className="border-t border-border/50">
                  <td className="p-2 font-mono text-xs">…{short(p.id)}</td>
                  <td className="p-2 font-mono text-xs">…{short(p.sessionId)}</td>
                  <td className="p-2">
                    <Badge
                      variant="outline"
                      className="capitalize"
                      style={{ color: PLAN_COLORS[p.plan] }}
                    >
                      {p.plan}
                    </Badge>
                  </td>
                  <td className="p-2 tabular-nums">{money(p.amountCents)}</td>
                  <td className="p-2">
                    <Badge variant="secondary" className="capitalize">
                      <ShieldCheck className="mr-1 h-3 w-3" /> {p.status}
                    </Badge>
                  </td>
                  <td className="p-2 text-xs text-muted-foreground">
                    {new Date(p.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
              {(data ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    No payments yet. Record one above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

/* ---------------- Settings (API providers) ---------------- */
const PROVIDER_DEFAULTS = [
  { key: 'provider.tryon.enabled', label: 'Try-on vision (VLM)', default: 'true' },
  { key: 'provider.tryon.model', label: 'Try-on model', default: 'zai-vlm-guided' },
  { key: 'provider.imagegen.enabled', label: 'Image generation', default: 'true' },
  { key: 'provider.imagegen.model', label: 'Image gen model', default: 'zai-image' },
  { key: 'provider.llm.enabled', label: 'Style reasoning (LLM)', default: 'true' },
  { key: 'provider.llm.model', label: 'LLM model', default: 'zai-llm' },
]

function SettingsTab() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery<{ settings: Record<string, string> }>({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const r = await fetch('/api/admin/settings')
      if (!r.ok) throw new Error()
      return r.json()
    },
  })

  const [vals, setVals] = React.useState<Record<string, string>>({})
  const [newKey, setNewKey] = React.useState('')
  const [newVal, setNewVal] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (data?.settings) setVals(data.settings)
  }, [data])

  const save = async () => {
    setSaving(true)
    try {
      const r = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: vals }),
      })
      if (!r.ok) throw new Error()
      qc.invalidateQueries({ queryKey: ['admin-settings'] })
      toast.success('Settings saved.')
    } catch {
      toast.error('Could not save.')
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="p-5 fm-shadow">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-brand" />
          <h3 className="font-display text-base font-semibold">API providers</h3>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Toggle and configure the AI providers powering FitMirror. Add any custom
          API key/value below.
        </p>

        <div className="mt-4 space-y-3">
          {PROVIDER_DEFAULTS.map((p) => {
            const val = vals[p.key] ?? p.default
            const isToggle = p.key.endsWith('.enabled')
            return (
              <div
                key={p.key}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/60 p-3"
              >
                <div>
                  <div className="text-sm font-medium">{p.label}</div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {p.key}
                  </div>
                </div>
                {isToggle ? (
                  <Switch
                    checked={val === 'true'}
                    onCheckedChange={(c) =>
                      setVals((v) => ({ ...v, [p.key]: c ? 'true' : 'false' }))
                    }
                  />
                ) : (
                  <Input
                    value={val}
                    onChange={(e) =>
                      setVals((v) => ({ ...v, [p.key]: e.target.value }))
                    }
                    className="max-w-[220px] font-mono text-sm"
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* custom key add */}
        <div className="mt-4 rounded-xl border border-dashed border-border/60 p-3">
          <div className="text-xs font-medium text-muted-foreground">
            Add a custom API key
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Input
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="provider.stripe.secret"
              className="font-mono text-sm"
            />
            <Input
              value={newVal}
              onChange={(e) => setNewVal(e.target.value)}
              placeholder="sk_live_…"
              className="font-mono text-sm"
            />
            <Button
              variant="outline"
              onClick={() => {
                if (!newKey) return
                setVals((v) => ({ ...v, [newKey]: newVal }))
                setNewKey('')
                setNewVal('')
                toast.success('Added. Remember to save.')
              }}
            >
              <ArrowUpRight className="mr-1.5 h-4 w-4" /> Add
            </Button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Button
            onClick={save}
            disabled={saving}
            className="bg-brand text-brand-foreground hover:bg-brand/90"
          >
            {saving ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-1.5 h-4 w-4" />
            )}
            Save settings
          </Button>
          <span className="text-xs text-muted-foreground">
            Changes apply to the running app.
          </span>
        </div>
      </Card>

      <Card className="p-5 fm-shadow">
        <h3 className="font-display text-base font-semibold">Admin credentials</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Change the admin login username &amp; password (stored in the DB).
        </p>
        <ChangeCredentials />
      </Card>
    </div>
  )
}

function ChangeCredentials() {
  const [un, setUn] = React.useState('')
  const [v, setV] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const qc = useQueryClient()
  const save = async () => {
    const updates: Record<string, string> = {}
    if (un.trim()) updates.admin_username = un.trim()
    if (v) updates.admin_password = v
    if (Object.keys(updates).length === 0) return
    setSaving(true)
    try {
      await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: updates }),
      })
      qc.invalidateQueries({ queryKey: ['admin-settings'] })
      setUn('')
      setV('')
      toast.success('Admin credentials updated.')
    } catch {
      toast.error('Could not update.')
    } finally {
      setSaving(false)
    }
  }
  return (
    <div className="mt-3 space-y-3">
      <div>
        <Label className="text-xs">New username</Label>
        <Input
          type="text"
          value={un}
          onChange={(e) => setUn(e.target.value)}
          placeholder="admin"
        />
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[220px] flex-1">
          <Label className="text-xs">New password</Label>
          <Input
            type="password"
            value={v}
            onChange={(e) => setV(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        <Button onClick={save} disabled={saving || (!un && !v)} variant="outline">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update'}
        </Button>
      </div>
    </div>
  )
}
