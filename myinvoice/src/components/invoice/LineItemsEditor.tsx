import { calculateLineTotals, formatCurrency, safeNumber, type Currency, type LineItem } from '@/lib/invoice'
import { SERVICE_OPTIONS } from '@/lib/catalog'

function toNumber(value: string) {
  const normalized = value.replace(',', '.')
  return safeNumber(Number(normalized))
}

type ServiceItem = { id: string; name: string; unitPriceHt: number; isActive: boolean }

export function LineItemsEditor({
  currency,
  items,
  onChange,
  serviceItems,
}: {
  currency: Currency
  items: LineItem[]
  onChange: (next: LineItem[]) => void
  serviceItems?: ServiceItem[]
}) {
  const update = (index: number, patch: Partial<LineItem>) => {
    const next = items.map((it, i) => (i === index ? { ...it, ...patch } : it))
    onChange(next.map((it) => ({ ...it, quantity: Math.max(1, it.quantity), vatPercent: 0 })))
  }

  const options =
    serviceItems && serviceItems.length
      ? serviceItems.filter((s) => s.isActive).map((s) => ({ label: s.name, unitPriceHt: s.unitPriceHt }))
      : SERVICE_OPTIONS.map((label) => ({ label, unitPriceHt: 0 }))

  const addRow = () => {
    onChange([...items, { description: options[0]?.label ?? '', quantity: 1, unitPriceHt: options[0]?.unitPriceHt ?? 0, vatPercent: 0 }])
  }

  const removeRow = (index: number) => {
    const next = items.filter((_, i) => i !== index)
    onChange(
      next.length
        ? next
        : [{ description: options[0]?.label ?? '', quantity: 1, unitPriceHt: options[0]?.unitPriceHt ?? 0, vatPercent: 0 }],
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-neutral-50 text-xs text-neutral-700">
          <tr>
            <th className="px-4 py-3 font-medium">Description</th>
            <th className="px-4 py-3 font-medium w-20 text-right">Qté</th>
            <th className="px-4 py-3 font-medium w-32 text-right">PU HT</th>
            <th className="px-4 py-3 font-medium w-32 text-right">Total</th>
            <th className="px-4 py-3 font-medium w-14"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {items.map((item, idx) => {
            const totals = calculateLineTotals(item)
            return (
              <tr key={idx} className="align-top">
                <td className="px-4 py-3">
                  <select
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-lime-400"
                    onChange={(e) => {
                      const label = e.target.value
                      const found = options.find((o) => o.label === label)
                      update(idx, { description: label, unitPriceHt: found ? found.unitPriceHt : item.unitPriceHt })
                    }}
                    value={item.description}
                  >
                    {options.map((o) => (
                      <option key={o.label} value={o.label}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <input
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-right text-sm outline-none focus:border-lime-400"
                    inputMode="numeric"
                    min={1}
                    onChange={(e) => update(idx, { quantity: Math.max(1, toNumber(e.target.value)) })}
                    type="number"
                    value={String(item.quantity)}
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-right text-sm outline-none focus:border-lime-400"
                    inputMode="decimal"
                    onChange={(e) => update(idx, { unitPriceHt: Math.max(0, toNumber(e.target.value)) })}
                    type="number"
                    value={String(item.unitPriceHt)}
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="pt-2 text-sm font-medium text-neutral-900">
                    {formatCurrency(totals.totalTtc, currency)}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    className="rounded-lg px-2 py-2 text-sm text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900"
                    onClick={() => removeRow(idx)}
                    type="button"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="flex items-center justify-between bg-neutral-50 px-4 py-3">
        <button
          className="rounded-xl bg-lime-300 px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-lime-200"
          onClick={addRow}
          type="button"
        >
          + Ajouter une ligne
        </button>
        <div className="text-xs text-neutral-600">Total ligne auto-calculé</div>
      </div>
    </div>
  )
}
