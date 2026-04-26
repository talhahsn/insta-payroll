'use client'

import { Download } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { getErrorMessageFromResponse } from '@/lib/api-client'
import { formatMoneyAmount } from '@/lib/format-money'
import { buildPayrollRosterSearchParams } from '@/lib/payroll-roster-query'
import type { PayrollCalculation } from '@/types/payroll.types'

interface Props {
  month: Date
  viewType: 'LIVE' | 'EXPECTED'
  restaurantName: string
  restaurantPhone?: string | null
  restaurantAddress?: string | null
  /** `yyyy-MM` for `/api/payroll/roster` (loads full filtered roster) */
  monthParam: string
}

const fmt = formatMoneyAmount

export function ExportPdfButton({
  month,
  viewType,
  restaurantName,
  restaurantPhone,
  restaurantAddress,
  monthParam,
}: Props) {
  async function handleExport() {
    const params = buildPayrollRosterSearchParams({
      month,
      monthParam,
      viewType,
      all: true,
    })
    const res = await fetch(`/api/payroll/roster?${params.toString()}`, { credentials: 'include' })
    if (!res.ok) {
      const msg = await getErrorMessageFromResponse(res)
      toast.error(msg || 'Failed to load roster for export')
      return
    }
    const data = (await res.json()) as { rows: PayrollCalculation[] }
    const roster = data.rows

    const { default: jsPDF } = await import('jspdf')
    const autoTable = (await import('jspdf-autotable')).default

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

    const title = `${restaurantName} — Payroll Roster`
    const subtitle = `${format(month, 'MMMM yyyy')} · ${viewType}`

    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(title, 14, 16)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100)
    let y = 23
    doc.text(subtitle, 14, y)
    const phone = restaurantPhone?.trim()
    if (phone) {
      y += 5
      doc.text(phone, 14, y)
    }
    const address = restaurantAddress?.trim()
    if (address) {
      for (const line of doc.splitTextToSize(address, 190) as string[]) {
        y += 4
        doc.text(line, 14, y)
      }
    }
    doc.setTextColor(0)

    const tableStartY = y + 8

    const totalNet = roster.reduce((s, r) => s + r.netPayable, 0)
    const totalPaid = roster.reduce((s, r) => s + r.amountPaid, 0)
    const totalRemaining = roster.reduce((s, r) => s + r.remainingToPay, 0)

    const body = roster.map((r) => [
      r.employeeName,
      fmt(r.baseEarned),
      r.leaveDeduction > 0 ? `−${fmt(r.leaveDeduction)}` : '—',
      r.coverageBonus > 0 ? `+${fmt(r.coverageBonus)}` : '—',
      (r.advancesTotal + r.foodExpensesTotal) > 0
        ? `−${fmt(r.advancesTotal + r.foodExpensesTotal)}`
        : '—',
      r.festivalBonus > 0 ? `+${fmt(r.festivalBonus)}` : '—',
      fmt(r.netPayable),
      fmt(r.amountPaid),
      r.remainingToPay > 0 ? fmt(r.remainingToPay) : '—',
      r.remainingToPay <= 0 ? 'Paid' : 'Pending',
    ])

    // Totals footer row
    body.push([
      'TOTAL',
      '',
      '',
      '',
      '',
      '',
      fmt(totalNet),
      fmt(totalPaid),
      totalRemaining > 0 ? fmt(totalRemaining) : '—',
      '',
    ])

    autoTable(doc, {
      startY: tableStartY,
      head: [[
        'Employee',
        'Base',
        'Leave Ded.',
        'Coverage',
        'Advances',
        'Festivals',
        'Net Payable',
        'Paid',
        'Remaining',
        'Status',
      ]],
      body,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 40 },
        6: { fontStyle: 'bold' },
        9: { cellWidth: 18 },
      },
      didParseCell: (data) => {
        // Bold + shade totals row
        if (data.row.index === body.length - 1) {
          data.cell.styles.fontStyle = 'bold'
          data.cell.styles.fillColor = [240, 240, 240]
        }
        // Colour status column
        if (data.column.index === 9 && data.section === 'body') {
          if (data.cell.text[0] === 'Paid') {
            data.cell.styles.textColor = [22, 163, 74]
          } else if (data.cell.text[0] === 'Pending') {
            data.cell.styles.textColor = [234, 88, 12]
          }
        }
      },
    })

    const filename = `payroll-${format(month, 'yyyy-MM')}-${viewType.toLowerCase()}.pdf`
    doc.save(filename)
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport}>
      <Download className="h-4 w-4 mr-2" />
      Export PDF
    </Button>
  )
}
