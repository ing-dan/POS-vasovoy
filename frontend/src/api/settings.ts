import { apiJson } from '../lib/http'
import type { RestaurantSettings, SettingsFormState } from '../types/settings'

export async function fetchSettings(token: string) {
  return apiJson<{ item: RestaurantSettings }>('/settings', token)
}

export async function submitSettings(token: string, form: SettingsFormState) {
  return apiJson<{ item: RestaurantSettings }>('/settings', token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      business_name: form.businessName,
      currency_code: form.currencyCode,
      tax_rate: Number(form.taxRate),
      receipt_footer: form.receiptFooter.trim() || null,
      table_label_singular: form.tableLabelSingular,
      table_label_plural: form.tableLabelPlural
    })
  })
}
