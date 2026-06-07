import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import WeekTab from '@/components/towatch/WeekTab'
import BacklogTab from '@/components/towatch/BacklogTab'
import ReturningTab from '@/components/towatch/ReturningTab'

type Tab = 'backlog' | 'week' | 'returning'

const TABS: { value: Tab; label: string }[] = [
  { value: 'backlog', label: 'Retard' },
  { value: 'week', label: 'Cette semaine' },
  { value: 'returning', label: 'Reprises' },
]

export default function ToWatch() {
  const [tab, setTab] = useState<Tab>('week')

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={v => setTab(v as Tab)}>
        <TabsList className="w-full">
          {TABS.map(t => (
            <TabsTrigger key={t.value} value={t.value} className="flex-1">{t.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {tab === 'backlog' && <BacklogTab />}
      {tab === 'week' && <WeekTab />}
      {tab === 'returning' && <ReturningTab />}
    </div>
  )
}
