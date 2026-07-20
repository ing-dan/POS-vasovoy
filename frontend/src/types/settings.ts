export type RestaurantSettings = {
  id: number
  restaurant_id: number
  business_name: string
  currency_code: string
  tax_rate: number
  receipt_footer: string | null
  table_label_singular: string
  table_label_plural: string
}

export type SettingsFormState = {
  businessName: string
  currencyCode: string
  taxRate: string
  receiptFooter: string
  tableLabelSingular: string
  tableLabelPlural: string
}

export const emptySettingsForm = (): SettingsFormState => ({
  businessName: '',
  currencyCode: 'MXN',
  taxRate: '0',
  receiptFooter: '',
  tableLabelSingular: 'Mesa',
  tableLabelPlural: 'Mesas'
})
