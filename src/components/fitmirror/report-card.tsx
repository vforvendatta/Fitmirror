'use client'

import { Ruler, Palette, Shirt, Lightbulb, CheckCircle2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { StyleReport } from '@/lib/types'

function ScoreRing({ value, label }: { value: number; label: string }) {
  const tone =
    value >= 80
      ? 'text-emerald-600 dark:text-emerald-400'
      : value >= 60
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-rose-600 dark:text-rose-400'
  return (
    <div className="flex flex-col items-center">
      <div className="relative grid h-20 w-20 place-items-center">
        <svg className="h-20 w-20 -rotate-90" viewBox="0 0 36 36">
          <circle
            cx="18"
            cy="18"
            r="15.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-border"
          />
          <circle
            cx="18"
            cy="18"
            r="15.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            className={tone}
            strokeDasharray={`${(value / 100) * 97.4} 97.4`}
          />
        </svg>
        <span className={`absolute text-lg font-bold ${tone}`}>{value}</span>
      </div>
      <span className="mt-1 text-xs font-medium text-muted-foreground">
        {label}
      </span>
    </div>
  )
}

export function ReportCard({ report }: { report: StyleReport }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">AI Style Report</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {report.summary}
          </p>
        </div>
        <Badge variant="secondary" className="shrink-0">
          {report.bodyType}
        </Badge>
      </div>

      <div className="mt-5 flex items-center justify-around gap-3 rounded-xl bg-muted/50 p-4">
        <ScoreRing value={report.fitScore} label={`Fit · ${report.fitLabel}`} />
        <ScoreRing
          value={report.colorHarmonyScore}
          label={`Color · ${report.colorHarmonyLabel}`}
        />
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border/60 p-3.5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Ruler className="h-4 w-4 text-brand" /> Size recommendation
          </div>
          <p className="mt-1 text-sm">{report.sizeRecommendation}</p>
        </div>
        <div className="rounded-xl border border-border/60 p-3.5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Shirt className="h-4 w-4 text-brand" /> Body type
          </div>
          <p className="mt-1 text-sm">{report.bodyType}</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Palette className="h-4 w-4 text-brand" /> Best for
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {report.occasions.map((o) => (
            <Badge key={o} variant="outline" className="capitalize">
              {o}
            </Badge>
          ))}
        </div>
      </div>

      {report.flatteringNotes.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className="h-4 w-4 text-brand" /> Why it works
          </div>
          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            {report.flatteringNotes.map((n, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand" />
                {n}
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.stylingTips.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Lightbulb className="h-4 w-4 text-brand" /> Styling tips
          </div>
          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            {report.stylingTips.map((n, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand" />
                {n}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}
