import { FormEvent, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { fetchSettings, submitSettings } from '../../api/settings'
import { emptySettingsForm } from '../../types/settings'
import type { SettingsFormState } from '../../types/settings'

export function ConfigView({ token }: { token: string }) {
  const queryClient = useQueryClient()
  const settingsQuery = useQuery({
    queryKey: ['settings', token],
    queryFn: () => fetchSettings(token)
  })

  const [form, setForm] = useState<SettingsFormState>(emptySettingsForm)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const settings = settingsQuery.data?.item

  useEffect(() => {
    if (settings) {
      setForm({
        businessName: settings.business_name,
        currencyCode: settings.currency_code,
        taxRate: String(settings.tax_rate),
        receiptFooter: settings.receipt_footer ?? '',
        tableLabelSingular: settings.table_label_singular,
        tableLabelPlural: settings.table_label_plural
      })
    }
  }, [settings])

  const mutation = useMutation({
    mutationFn: () => submitSettings(token, form),
    onSuccess: async (result) => {
      setError(null)
      setSuccess('Configuracion guardada')
      setForm({
        businessName: result.item.business_name,
        currencyCode: result.item.currency_code,
        taxRate: String(result.item.tax_rate),
        receiptFooter: result.item.receipt_footer ?? '',
        tableLabelSingular: result.item.table_label_singular,
        tableLabelPlural: result.item.table_label_plural
      })
      queryClient.setQueryData(['settings', token], result)
      await queryClient.invalidateQueries({ queryKey: ['settings', token] })
      await queryClient.invalidateQueries({ queryKey: ['me', token] })
    },
    onError: () => {
      setSuccess(null)
      setError('No se pudo guardar la configuracion')
    }
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    mutation.mutate()
  }

  return (
    <section className="catalog-shell">
      <header className="catalog-header">
        <div>
          <p className="eyebrow">Configuracion</p>
          <h2>Nombre del restaurante y ajustes base</h2>
          <p className="subtle">Aqui cambias la identidad visible del negocio sin tocar el codigo.</p>
        </div>
        <div className="catalog-actions">
          <div className="health">
            <span className="dot ok" />
            <span>{settings?.business_name ?? 'Cargando'}</span>
          </div>
        </div>
      </header>

      <section className="panel config-panel">
        <form className="stack" onSubmit={handleSubmit}>
          <div className="field-grid">
            <label className="field">
              Nombre del negocio
              <input value={form.businessName} onChange={(event) => setForm((current) => ({ ...current, businessName: event.target.value }))} />
            </label>

            <label className="field">
              Moneda
              <input value={form.currencyCode} onChange={(event) => setForm((current) => ({ ...current, currencyCode: event.target.value.toUpperCase() }))} maxLength={3} />
            </label>
          </div>

          <div className="field-grid">
            <label className="field">
              Tasa de impuesto
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.taxRate}
                onChange={(event) => setForm((current) => ({ ...current, taxRate: event.target.value }))}
              />
            </label>

            <label className="field">
              Pie de ticket
              <input
                value={form.receiptFooter}
                onChange={(event) => setForm((current) => ({ ...current, receiptFooter: event.target.value }))}
              />
            </label>
          </div>

          <div className="field-grid">
            <label className="field">
              Etiqueta singular
              <input
                value={form.tableLabelSingular}
                onChange={(event) => setForm((current) => ({ ...current, tableLabelSingular: event.target.value }))}
              />
            </label>

            <label className="field">
              Etiqueta plural
              <input
                value={form.tableLabelPlural}
                onChange={(event) => setForm((current) => ({ ...current, tableLabelPlural: event.target.value }))}
              />
            </label>
          </div>

          {error ? <p className="error">{error}</p> : null}
          {success ? <p className="success-text">{success}</p> : null}

          <button type="submit" className="primary" disabled={mutation.isPending || !form.businessName.trim()}>
            {mutation.isPending ? 'Guardando...' : 'Guardar configuracion'}
          </button>
        </form>
      </section>
    </section>
  )
}

