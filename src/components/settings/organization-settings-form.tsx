'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { getErrorMessageFromResponse } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ImagePlus, Loader2, Trash2 } from 'lucide-react'

export type OrganizationSettingsInitial = {
  name: string
  logoUrl: string | null
  phone: string | null
  address: string | null
}

const ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml'

export function OrganizationSettingsForm({ initial }: { initial: OrganizationSettingsInitial }) {
  const [name, setName] = useState(initial.name)
  const [phone, setPhone] = useState(initial.phone ?? '')
  const [address, setAddress] = useState(initial.address ?? '')
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null)
  const [removeSavedLogo, setRemoveSavedLogo] = useState(false)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Server data after save: parent remounts this component via `key` (restaurant.updatedAt) — no sync effect.

  useEffect(() => {
    if (!selectedLogoFile) {
      setObjectUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      return
    }
    const u = URL.createObjectURL(selectedLogoFile)
    setObjectUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return u
    })
    return () => {
      URL.revokeObjectURL(u)
    }
  }, [selectedLogoFile])

  const currentText = {
    name: name.trim(),
    phone: phone.trim() || null,
    address: address.trim() || null,
  }
  const textChanged =
    currentText.name !== initial.name ||
    (initial.phone ?? null) !== currentText.phone ||
    (initial.address ?? null) !== currentText.address

  const logoChanged =
    selectedLogoFile !== null || (removeSavedLogo && initial.logoUrl != null && initial.logoUrl !== '')

  const isDirty = textChanged || logoChanged

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!currentText.name || !isDirty) return
    setPending(true)
    try {
      const fd = new FormData()
      fd.set('name', currentText.name)
      fd.set('phone', currentText.phone ?? '')
      fd.set('address', currentText.address ?? '')
      if (selectedLogoFile) {
        fd.set('logo', selectedLogoFile)
      } else if (removeSavedLogo && initial.logoUrl) {
        fd.set('removeLogo', 'true')
      }
      const res = await fetch('/api/settings/restaurant', {
        method: 'PATCH',
        body: fd,
        credentials: 'include',
      })
      if (!res.ok) throw new Error(await getErrorMessageFromResponse(res))
      toast.success('Organization updated')
      setSelectedLogoFile(null)
      setRemoveSavedLogo(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setPending(false)
    }
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setRemoveSavedLogo(false)
    setSelectedLogoFile(file)
  }

  function onRemoveLogo() {
    if (selectedLogoFile) {
      setSelectedLogoFile(null)
      return
    }
    if (initial.logoUrl) {
      setRemoveSavedLogo(true)
    }
  }

  const showPreview = Boolean(
    objectUrl || (Boolean(initial.logoUrl) && !removeSavedLogo)
  )
  const previewSrc =
    objectUrl || (removeSavedLogo ? null : (initial.logoUrl || null)) || null
  const canRemoveFromUi = Boolean(
    selectedLogoFile || (initial.logoUrl && !removeSavedLogo)
  )

  return (
    <form onSubmit={onSubmit} className="max-w-lg space-y-6">
      <div className="space-y-2">
        <Label htmlFor="org-name">Organization name</Label>
        <Input
          id="org-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          autoComplete="organization"
        />
        <p className="text-xs text-muted-foreground">
          Shown in the top bar, sidebar, and PDF exports.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Logo</Label>
        <p className="text-xs text-muted-foreground">
          Choose an image, then press Save. PNG, JPEG, WebP, GIF, or SVG, max 2MB. Unsaved
          changes are not stored.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            onChange={onPickFile}
            disabled={pending}
            id="org-logo-file"
            aria-label="Select logo image"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => fileRef.current?.click()}
          >
            <ImagePlus className="h-4 w-4" />
            {selectedLogoFile ? 'Change image' : 'Select image'}
          </Button>
          {canRemoveFromUi ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive"
              disabled={pending}
              onClick={onRemoveLogo}
            >
              <Trash2 className="h-4 w-4" />
              {selectedLogoFile ? 'Discard selection' : 'Remove logo'}
            </Button>
          ) : null}
        </div>
        {removeSavedLogo && !objectUrl && !selectedLogoFile ? (
          <p className="text-xs text-amber-700 dark:text-amber-500">
            Logo will be removed when you save.
          </p>
        ) : null}
        {showPreview && previewSrc ? (
          <div className="pt-1">
            <span className="text-xs text-muted-foreground">Preview</span>
            <div className="mt-1 flex h-14 items-center">
              <img
                src={previewSrc}
                alt=""
                className="max-h-14 max-w-[12rem] rounded-md object-contain"
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="org-phone">Contact number</Label>
        <Input
          id="org-phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          maxLength={40}
          autoComplete="tel"
          inputMode="tel"
          placeholder="+92 …"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="org-address">Address</Label>
        <Textarea
          id="org-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          maxLength={2000}
          rows={3}
          className="min-h-20 resize-y"
        />
        <p className="text-xs text-muted-foreground">Included on payroll PDF exports when set.</p>
      </div>

      <Button type="submit" disabled={pending || !currentText.name || !isDirty} className="gap-2">
        {pending ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : null}
        {pending ? 'Saving…' : 'Save'}
      </Button>
    </form>
  )
}
