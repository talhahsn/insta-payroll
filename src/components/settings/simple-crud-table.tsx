'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TABLE_HEADER_STICKY } from '@/components/ui/table-header-classname'
import { ScrollableTableRegion } from '@/components/layout/list-page-layout'

interface Row {
  id: string
  name: string
}

interface Props {
  rows: Row[]
  apiBase: string   // e.g. '/api/settings/roles'
  label: string     // e.g. 'Job Role'
}

export function SimpleCrudTable({ rows, apiBase, label }: Props) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)
    try {
      const res = await fetch(apiBase, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? `Failed to add ${label.toLowerCase()}`)
        return
      }
      toast.success(`${label} added`)
      setName('')
      router.refresh()
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(`Delete this ${label.toLowerCase()}?`)) return
    setDeletingId(id)
    try {
      const res = await fetch(`${apiBase}/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? `Failed to delete ${label.toLowerCase()}`)
        return
      }
      toast.success(`${label} deleted`)
      router.refresh()
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden">
      <form onSubmit={handleAdd} className="flex shrink-0 gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={`New ${label.toLowerCase()} name`}
          required
          className="max-w-xs"
        />
        <Button type="submit" disabled={adding}>
          <Plus className="h-4 w-4 mr-2" />
          Add
        </Button>
      </form>

      {rows.length === 0 ? (
        <p className="shrink-0 text-sm text-muted-foreground">No {label.toLowerCase()}s yet.</p>
      ) : (
        <ScrollableTableRegion className="max-w-md">
          <Table>
            <TableHeader className={TABLE_HEADER_STICKY}>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(row.id)}
                      disabled={deletingId === row.id}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollableTableRegion>
      )}
    </div>
  )
}
