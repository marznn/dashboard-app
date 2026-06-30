import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import {
  PageHeader, Card, SectionTitle, Button, Field, Input, Select, Empty, ProgressBar,
  todayStr, monthRange, monthLabel, fmtMoney,
} from '../components/ui.jsx'

const EXPENSE_CATEGORIES = ['Rent', 'Groceries', 'Dining', 'Transport', 'Utilities', 'Shopping', 'Health', 'Entertainment', 'Other']
const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Gift', 'Investment', 'Other']

export default function Finance() {
  const { start, end } = monthRange()
  const [loading, setLoading] = useState(true)
  const [txns, setTxns] = useState([])
  const [budget, setBudget] = useState(0)

  async function loadAll() {
    setLoading(true)
    const [t, s] = await Promise.all([
      supabase.from('transactions').select('*').gte('date', start).lt('date', end).order('date', { ascending: false }),
      supabase.from('user_settings').select('monthly_budget').maybeSingle(),
    ])
    setTxns(t.data ?? [])
    setBudget(Number(s.data?.monthly_budget ?? 0))
    setLoading(false)
  }

  useEffect(() => { loadAll() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <Empty>Loading…</Empty>

  const income = txns.filter((t) => t.type === 'income').reduce((a, t) => a + Number(t.amount), 0)
  const spent = txns.filter((t) => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0)
  const remaining = budget - spent

  // expense breakdown by category
  const byCat = {}
  txns.filter((t) => t.type === 'expense').forEach((t) => {
    byCat[t.category] = (byCat[t.category] || 0) + Number(t.amount)
  })
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1])

  return (
    <div>
      <PageHeader title="Finance" subtitle={`Budget, income & expenses — ${monthLabel()}`} />

      <div className="grid gap-4 sm:grid-cols-3 mb-5">
        <Stat label="Total income" value={fmtMoney(income)} color="text-emerald-400" />
        <Stat label="Total spent" value={fmtMoney(spent)} color="text-red-400" />
        <Stat label="Remaining budget" value={fmtMoney(remaining)} color={remaining < 0 ? 'text-red-400' : 'text-white'} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <BudgetCard
          budget={budget} spent={spent}
          onSave={async (next) => {
            setBudget(next)
            await supabase.from('user_settings').upsert(
              { monthly_budget: next, updated_at: new Date().toISOString() },
              { onConflict: 'user_id' },
            )
          }}
        />
        <AddCard reload={loadAll} />
        <div className="lg:col-span-2">
          <BreakdownCard cats={cats} spent={spent} />
        </div>
        <div className="lg:col-span-2">
          <TxnsCard txns={txns} reload={loadAll} />
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <Card className="glass-hover">
      <p className="text-sm text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold ${color}`}>{value}</p>
    </Card>
  )
}

function BudgetCard({ budget, spent, onSave }) {
  const [input, setInput] = useState(String(budget))
  const [busy, setBusy] = useState(false)
  return (
    <Card>
      <SectionTitle>Monthly budget</SectionTitle>
      <ProgressBar label="Spent vs. budget" unit="" value={spent} max={budget || 1}
        color={spent > budget ? 'bg-red-500' : 'bg-indigo-500'} />
      <div className="mt-3 flex items-end gap-2">
        <Field label="Budget ($)">
          <Input type="number" min="0" value={input} onChange={(e) => setInput(e.target.value)} className="w-40" />
        </Field>
        <Button variant="ghost" disabled={busy}
          onClick={async () => { setBusy(true); await onSave(Number(input) || 0); setBusy(false) }}>
          Save budget
        </Button>
      </div>
    </Card>
  )
}

function AddCard({ reload }) {
  const [type, setType] = useState('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [date, setDate] = useState(todayStr())
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES

  async function add() {
    if (amount === '' || !category) return
    setBusy(true)
    await supabase.from('transactions').insert({
      date, type, category, amount: Number(amount), note: note || null,
    })
    setAmount(''); setNote('')
    setBusy(false)
    reload()
  }

  return (
    <Card>
      <SectionTitle>Add transaction</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Type">
          <Select value={type} onChange={(e) => { setType(e.target.value); setCategory('') }}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </Select>
        </Field>
        <Field label="Amount ($)">
          <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
        </Field>
        <Field label="Category">
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">— select —</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Date">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <div className="col-span-2">
          <Field label="Note (optional)">
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Whole Foods" />
          </Field>
        </div>
      </div>
      <div className="mt-3"><Button onClick={add} disabled={busy}>Add</Button></div>
    </Card>
  )
}

function BreakdownCard({ cats, spent }) {
  return (
    <Card>
      <SectionTitle>Spending by category</SectionTitle>
      {cats.length === 0 ? (
        <Empty>No expenses logged this month.</Empty>
      ) : (
        <div className="space-y-3">
          {cats.map(([cat, amt]) => (
            <ProgressBar key={cat} label={cat} unit="" value={amt} max={spent || 1} color="bg-amber-500"
              // show dollar amounts instead of raw numbers
            />
          ))}
          <div className="pt-1 text-xs text-slate-500">
            {cats.map(([cat, amt]) => `${cat}: ${fmtMoney(amt)}`).join('  ·  ')}
          </div>
        </div>
      )}
    </Card>
  )
}

function TxnsCard({ txns, reload }) {
  return (
    <Card>
      <SectionTitle>This month's transactions</SectionTitle>
      <ul className="space-y-1.5">
        {txns.length === 0 && <Empty>No transactions yet.</Empty>}
        {txns.map((t) => (
          <li key={t.id} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <span className={`inline-block h-2 w-2 rounded-full ${t.type === 'income' ? 'bg-emerald-400' : 'bg-red-400'}`} />
              <span className="text-slate-200">{t.category}</span>
              {t.note && <span className="text-xs text-slate-500">— {t.note}</span>}
            </span>
            <span className="flex items-center gap-3">
              <span className={`text-sm font-medium ${t.type === 'income' ? 'text-emerald-400' : 'text-slate-200'}`}>
                {t.type === 'income' ? '+' : '−'}{fmtMoney(t.amount)}
              </span>
              <span className="text-xs text-slate-500">{t.date}</span>
              <button onClick={async () => { await supabase.from('transactions').delete().eq('id', t.id); reload() }}
                className="text-xs text-red-400 hover:underline">Delete</button>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
