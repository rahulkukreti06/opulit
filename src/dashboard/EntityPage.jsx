import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useAuth } from '../context/useAuth'
import { supabase } from '../lib/supabase'
import DashboardSidebar from './DashboardSidebar'
import DashboardHeader from './DashboardHeader'
import '../../css/dashboard.css'

function emptyForm(fields) {
  return Object.fromEntries(fields.map((field) => [field.key, field.type === 'checkbox' ? false : '']))
}

function displayValue(value, key) {
  if (key === 'paid_monthly') return value ? 'Paid' : 'Pending'
  if (value === null || value === undefined || value === '') return '—'
  if (key.endsWith('_at')) return new Date(`${value}T00:00:00`).toLocaleDateString()
  if (key === 'monthly_fee' || key === 'salary') return `₹${Number(value).toLocaleString()}`
  return value
}

export default function EntityPage({ config }) {
  const { user } = useAuth()
  const [business, setBusiness] = useState(null)
  const [rows, setRows] = useState([])
  const [form, setForm] = useState(() => emptyForm(config.fields))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function loadPage() {
      const { data: businesses, error: businessError } = await supabase.from('businesses').select('*').eq('owner_id', user.id).order('created_at', { ascending: true }).limit(1)
      if (businessError || !businesses?.[0]) {
        if (active) { setError(businessError?.message || 'Create your business from the dashboard first.'); setLoading(false) }
        return
      }
      const currentBusiness = businesses[0]
      const { data, error: rowsError } = await supabase.from(config.table).select('*').eq('business_id', currentBusiness.id).order('created_at', { ascending: false })
      if (active) { setBusiness(currentBusiness); setRows(data ?? []); setError(rowsError?.message || ''); setLoading(false) }
    }
    loadPage()
    return () => { active = false }
  }, [config.table, user.id])

  async function addRecord(event) {
    event.preventDefault()
    setSaving(true); setError('')
    const values = Object.fromEntries(config.fields.filter((field) => field.type === 'checkbox' || form[field.key] !== '').map((field) => [field.key, field.type === 'number' ? Number(form[field.key]) : form[field.key]]))
    const { data, error: insertError } = await supabase.from(config.table).insert({ ...values, business_id: business.id }).select().single()
    if (insertError) setError(insertError.message)
    else { setRows((current) => [data, ...current]); setForm(emptyForm(config.fields)) }
    setSaving(false)
  }

  async function removeRecord(id) {
    setError('')
    const { error: deleteError } = await supabase.from(config.table).delete().eq('id', id)
    if (deleteError) setError(deleteError.message)
    else setRows((current) => current.filter((row) => row.id !== id))
  }

  return <main className="dashboard-page"><div className="dashboard-workspace"><DashboardSidebar /><section className="dashboard-main"><DashboardHeader /><div className="management-content"><div className="management-heading"><div><p className="management-eyebrow">Workspace / {config.title}</p><h1>{config.title}</h1><p>{config.description}</p></div><span className="management-count">{rows.length} {rows.length === 1 ? 'record' : 'records'}</span></div><form className="management-form" onSubmit={addRecord}><div className="management-form-heading"><div><h2>Add {config.singular}</h2><p>Add a record to your workspace.</p></div><button className="management-primary-button" type="submit" disabled={saving || !business}><Plus size={16} /> {saving ? 'Saving...' : 'Add record'}</button></div><div className="management-fields">{config.fields.map((field) => <label className={`management-field ${field.type === 'checkbox' ? 'management-checkbox' : ''}`} key={field.key}>{field.type === 'checkbox' ? <><input type="checkbox" checked={form[field.key]} onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.checked }))} /><span>{field.label}</span></> : <><span>{field.label}{field.required && ' *'}</span><input required={field.required} min={field.min} type={field.type} value={form[field.key]} onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))} /></>}</label>)}</div></form>{error && <p className="auth-error management-error" role="alert">{error}</p>}<section className="management-table-wrap"><table className="management-table"><thead><tr>{config.columns.map((column) => <th key={column.key}>{column.label}</th>)}<th aria-label="Actions" /></tr></thead><tbody>{loading ? <tr><td colSpan={config.columns.length + 1}>Loading...</td></tr> : rows.length === 0 ? <tr><td className="management-empty" colSpan={config.columns.length + 1}>{config.empty}</td></tr> : rows.map((row) => <tr key={row.id}>{config.columns.map((column) => <td key={column.key}>{displayValue(row[column.key], column.key)}</td>)}<td><button className="management-delete" type="button" aria-label={`Delete ${row.name}`} onClick={() => removeRecord(row.id)}><Trash2 size={16} /></button></td></tr>)}</tbody></table></section></div></section></div></main>
}