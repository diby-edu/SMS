'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import {
  Users,
  Plus,
  Trash2,
  Loader2,
  Search,
  Upload,
  FolderOpen,
  Phone,
  User,
  ChevronLeft,
  ChevronRight,
  X,
  FileSpreadsheet,
  ListFilter,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { cn, formatDate, COUNTRY_PHONE_PREFIXES } from '@/lib/utils'
import type { Metadata } from 'next'

// ============================================================
// CONSTANTES
// ============================================================

const PAYS = Object.entries(COUNTRY_PHONE_PREFIXES).map(([code, { name, prefix }]) => ({
  code,
  name,
  prefix,
}))

// ============================================================
// TYPES
// ============================================================

interface ContactList {
  id: string
  nom: string
  created_at: string
  _count: { contacts: number }
}

interface Contact {
  id: string
  nom: string | null
  prenom: string | null
  phone: string
  pays: string
  liste_id: string | null
  created_at: string
}

// ============================================================
// PAGE
// ============================================================

export default function ContactsPage() {
  // ---- Listes ----
  const [lists, setLists] = useState<ContactList[]>([])
  const [loadingLists, setLoadingLists] = useState(true)
  const [selectedListId, setSelectedListId] = useState<string | null>(null)
  const [newListName, setNewListName] = useState('')
  const [creatingList, setCreatingList] = useState(false)
  const [showListForm, setShowListForm] = useState(false)
  const [deletingListId, setDeletingListId] = useState<string | null>(null)

  // ---- Contacts ----
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // ---- Ajout manuel ----
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({ nom: '', prenom: '', phone: '', pays: 'CI' })
  const [addError, setAddError] = useState('')
  const [adding, setAdding] = useState(false)

  // ---- Import fichier ----
  const [showImport, setShowImport] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPays, setImportPays] = useState('CI')
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // ============================================================
  // CHARGEMENT DES LISTES
  // ============================================================

  const fetchLists = useCallback(async () => {
    setLoadingLists(true)
    try {
      const res = await fetch('/api/contacts/lists')
      const data = await res.json()
      setLists(data.lists || [])
    } catch {
      toast.error('Impossible de charger les listes')
    } finally {
      setLoadingLists(false)
    }
  }, [])

  useEffect(() => { fetchLists() }, [fetchLists])

  // ============================================================
  // CHARGEMENT DES CONTACTS
  // ============================================================

  const fetchContacts = useCallback(async () => {
    setLoadingContacts(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        ...(selectedListId ? { list_id: selectedListId } : {}),
        ...(search ? { search } : {}),
      })
      const res = await fetch(`/api/contacts?${params}`)
      const data = await res.json()
      setContacts(data.contacts || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
    } catch {
      toast.error('Impossible de charger les contacts')
    } finally {
      setLoadingContacts(false)
    }
  }, [page, selectedListId, search])

  useEffect(() => { fetchContacts() }, [fetchContacts])

  // ============================================================
  // GESTION DES LISTES
  // ============================================================

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault()
    const nom = newListName.trim()
    if (!nom) return

    setCreatingList(true)
    try {
      const res = await fetch('/api/contacts/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Erreur'); return }

      setLists((prev) => [data.list, ...prev])
      setNewListName('')
      setShowListForm(false)
      toast.success('Liste créée')
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setCreatingList(false)
    }
  }

  const handleDeleteList = async (id: string, nom: string) => {
    if (!confirm(`Supprimer la liste "${nom}" ? Les contacts seront conservés.`)) return

    setDeletingListId(id)
    try {
      const res = await fetch(`/api/contacts/lists/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setLists((prev) => prev.filter((l) => l.id !== id))
        if (selectedListId === id) setSelectedListId(null)
        toast.success('Liste supprimée')
      } else {
        toast.error('Impossible de supprimer cette liste')
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setDeletingListId(null)
    }
  }

  // ============================================================
  // AJOUT MANUEL
  // ============================================================

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddError('')

    if (!addForm.phone.trim()) { setAddError('Numéro requis'); return }

    setAdding(true)
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: addForm.nom || undefined,
          prenom: addForm.prenom || undefined,
          phone: addForm.phone.trim(),
          pays: addForm.pays,
          liste_id: selectedListId || undefined,
        }),
      })
      const data = await res.json()

      if (!res.ok) { setAddError(data.error || 'Erreur'); return }

      toast.success('Contact ajouté')
      setAddForm({ nom: '', prenom: '', phone: '', pays: 'CI' })
      setShowAddForm(false)
      fetchContacts()
      // Mettre à jour le compteur de la liste
      if (selectedListId) {
        setLists((prev) =>
          prev.map((l) =>
            l.id === selectedListId
              ? { ...l, _count: { contacts: l._count.contacts + 1 } }
              : l
          )
        )
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setAdding(false)
    }
  }

  // ============================================================
  // SUPPRESSION CONTACT
  // ============================================================

  const handleDeleteContact = async (id: string) => {
    if (!confirm('Supprimer ce contact ?')) return

    setDeletingId(id)
    try {
      const res = await fetch(`/api/contacts/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setContacts((prev) => prev.filter((c) => c.id !== id))
        setTotal((t) => t - 1)
        if (selectedListId) {
          setLists((prev) =>
            prev.map((l) =>
              l.id === selectedListId
                ? { ...l, _count: { contacts: Math.max(0, l._count.contacts - 1) } }
                : l
            )
          )
        }
        toast.success('Contact supprimé')
      } else {
        toast.error('Impossible de supprimer ce contact')
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setDeletingId(null)
    }
  }

  // ============================================================
  // IMPORT FICHIER
  // ============================================================

  const handleImport = async () => {
    if (!importFile) return

    const ext = importFile.name.split('.').pop()?.toLowerCase()

    const parseAndImport = async (rows: Record<string, string>[]) => {
      if (rows.length === 0) { toast.error('Aucun contact trouvé dans le fichier'); return }

      setImporting(true)
      try {
        const res = await fetch('/api/contacts/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contacts: rows,
            liste_id: selectedListId || undefined,
            defaultPays: importPays,
          }),
        })
        const data = await res.json()
        if (!res.ok) { toast.error(data.error || 'Erreur import'); return }

        toast.success(`${data.imported} contact(s) importé(s)${data.skipped > 0 ? `, ${data.skipped} ignoré(s)` : ''}`)
        setImportFile(null)
        setShowImport(false)
        if (fileRef.current) fileRef.current.value = ''
        fetchContacts()
        fetchLists()
      } catch {
        toast.error('Erreur réseau')
      } finally {
        setImporting(false)
      }
    }

    if (ext === 'csv') {
      Papa.parse<Record<string, string>>(importFile, {
        header: true,
        skipEmptyLines: true,
        complete: (r) => parseAndImport(r.data),
        error: () => toast.error('Impossible de lire le fichier CSV'),
      })
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const wb = XLSX.read(data, { type: 'array' })
          const sheet = wb.Sheets[wb.SheetNames[0]]
          const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' })
          parseAndImport(rows)
        } catch {
          toast.error('Impossible de lire le fichier Excel')
        }
      }
      reader.readAsArrayBuffer(importFile)
    } else {
      toast.error('Format non supporté. Utilisez CSV ou Excel (.xlsx)')
    }
  }

  // ============================================================
  // RECHERCHE
  // ============================================================

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  // ============================================================
  // RENDU
  // ============================================================

  const selectedList = lists.find((l) => l.id === selectedListId)

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ---- En-tête ---- */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-syne font-bold text-xl text-foreground">
            Gestion des contacts
          </h2>
          <p className="text-sm text-foreground-muted mt-0.5">
            {total.toLocaleString('fr-FR')} contact{total > 1 ? 's' : ''}
            {selectedList ? ` dans "${selectedList.nom}"` : ' au total'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Upload className="w-3.5 h-3.5" />}
            onClick={() => setShowImport((v) => !v)}
          >
            Importer
          </Button>
        </div>
      </div>

      {/* ================================================================
          FORMULAIRE AJOUT MANUEL
          ================================================================ */}
      {showAddForm && (
        <div className="bg-surface border border-border rounded-2xl p-5 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-syne font-semibold text-sm text-foreground">
              Ajouter un contact{selectedList ? ` dans "${selectedList.nom}"` : ''}
            </h3>
            <button onClick={() => setShowAddForm(false)} className="text-foreground-subtle hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleAddContact} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Prénom"
                type="text"
                placeholder="Kouadio"
                value={addForm.prenom}
                onChange={(e) => setAddForm((p) => ({ ...p, prenom: e.target.value }))}
              />
              <Input
                label="Nom"
                type="text"
                placeholder="Konan"
                value={addForm.nom}
                onChange={(e) => setAddForm((p) => ({ ...p, nom: e.target.value }))}
              />
            </div>

            <div>
              <label className="label">Téléphone</label>
              <div className="flex gap-2">
                <select
                  value={addForm.pays}
                  onChange={(e) => setAddForm((p) => ({ ...p, pays: e.target.value }))}
                  className="input w-[130px] text-sm"
                >
                  {PAYS.map((p) => (
                    <option key={p.code} value={p.code}>{p.name} ({p.prefix})</option>
                  ))}
                </select>
                <Input
                  type="tel"
                  placeholder="07 00 00 00 00"
                  value={addForm.phone}
                  onChange={(e) => setAddForm((p) => ({ ...p, phone: e.target.value }))}
                  leftIcon={<Phone className="w-4 h-4" />}
                  error={addError}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => { setShowAddForm(false); setAddError('') }}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button type="submit" loading={adding} className="flex-1">
                Ajouter
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ================================================================
          FORMULAIRE IMPORT
          ================================================================ */}
      {showImport && (
        <div className="bg-surface border border-border rounded-2xl p-5 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-syne font-semibold text-sm text-foreground">
              Importer des contacts (CSV / Excel)
            </h3>
            <button onClick={() => { setShowImport(false); setImportFile(null) }} className="text-foreground-subtle hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <label className="text-xs text-foreground-subtle">Pays par défaut :</label>
              <select
                value={importPays}
                onChange={(e) => setImportPays(e.target.value)}
                className="input py-1.5 text-xs w-auto"
              >
                {PAYS.map((p) => (
                  <option key={p.code} value={p.code}>{p.name} ({p.prefix})</option>
                ))}
              </select>
            </div>

            {importFile ? (
              <div className="bg-secondary/5 border border-secondary/20 rounded-xl px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-secondary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{importFile.name}</p>
                    <p className="text-xs text-foreground-muted">
                      {(importFile.size / 1024).toFixed(1)} Ko
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setImportFile(null); if (fileRef.current) fileRef.current.value = '' }}
                  className="text-foreground-subtle hover:text-danger transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-border hover:border-primary/40 rounded-xl p-6 text-center cursor-pointer transition-colors"
              >
                <Upload className="w-7 h-7 text-foreground-subtle mx-auto mb-2" />
                <p className="text-sm text-foreground-muted">
                  Cliquez pour sélectionner un fichier
                </p>
                <p className="text-xs text-foreground-subtle mt-1">
                  CSV ou Excel · Colonne requise : <code className="bg-border px-1 rounded">phone</code>
                </p>
              </div>
            )}

            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            />

            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => { setShowImport(false); setImportFile(null) }}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                onClick={handleImport}
                loading={importing}
                disabled={!importFile}
                className="flex-1"
                leftIcon={<Upload className="w-4 h-4" />}
              >
                Importer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================
          LAYOUT PRINCIPAL : listes (gauche) + contacts (droite)
          ================================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">

        {/* ---- Panneau listes ---- */}
        <div className="space-y-3">
          {/* Header listes */}
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-foreground-subtle uppercase tracking-wider">
              Listes
            </h3>
            <button
              onClick={() => setShowListForm((v) => !v)}
              className="text-primary hover:text-primary-hover transition-colors"
              title="Créer une liste"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Formulaire nouvelle liste */}
          {showListForm && (
            <form onSubmit={handleCreateList} className="flex gap-2 animate-slide-up">
              <input
                type="text"
                placeholder="Nom de la liste"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                className="input text-sm flex-1 py-2"
                autoFocus
                maxLength={50}
              />
              <Button type="submit" size="sm" loading={creatingList}>
                OK
              </Button>
            </form>
          )}

          {/* Liste "Tous les contacts" */}
          <button
            onClick={() => { setSelectedListId(null); setPage(1) }}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-colors text-left',
              selectedListId === null
                ? 'bg-primary/10 text-primary'
                : 'text-foreground-muted hover:bg-border'
            )}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span className="flex-1 truncate">Tous les contacts</span>
          </button>

          {/* Listes utilisateur */}
          {loadingLists ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
          ) : lists.length === 0 ? (
            <p className="text-xs text-foreground-subtle text-center py-3">
              Aucune liste créée
            </p>
          ) : (
            <div className="space-y-1">
              {lists.map((list) => (
                <div
                  key={list.id}
                  className={cn(
                    'group flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-colors',
                    selectedListId === list.id
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground-muted hover:bg-border'
                  )}
                  onClick={() => { setSelectedListId(list.id); setPage(1) }}
                >
                  <FolderOpen className="w-4 h-4 shrink-0" />
                  <span className="flex-1 truncate text-sm">{list.nom}</span>
                  <span className="text-xs opacity-60 shrink-0">
                    {list._count.contacts}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteList(list.id, list.nom) }}
                    disabled={deletingListId === list.id}
                    className="opacity-0 group-hover:opacity-100 text-foreground-subtle hover:text-danger transition-all shrink-0"
                  >
                    {deletingListId === list.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ---- Panneau contacts ---- */}
        <div className="space-y-3">
          {/* Barre de recherche */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              type="text"
              placeholder="Rechercher nom, prénom, numéro..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
              className="flex-1"
            />
            <Button type="submit" size="md">
              <Search className="w-4 h-4" />
            </Button>
            {search && (
              <Button
                variant="secondary"
                size="md"
                onClick={() => { setSearch(''); setSearchInput(''); setPage(1) }}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </form>

          {/* Tableau contacts */}
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            {loadingContacts ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : contacts.length === 0 ? (
              <div className="py-16 text-center">
                <Users className="w-10 h-10 text-foreground-subtle mx-auto mb-3" />
                <p className="text-sm text-foreground-muted">Aucun contact</p>
                <p className="text-xs text-foreground-subtle mt-1">
                  Ajoutez des contacts manuellement ou importez un fichier
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {contacts.map((contact) => {
                  const countryData = COUNTRY_PHONE_PREFIXES[contact.pays]
                  const displayName =
                    [contact.prenom, contact.nom].filter(Boolean).join(' ') || 'Sans nom'

                  return (
                    <div
                      key={contact.id}
                      className="flex items-center gap-4 px-4 py-3.5 hover:bg-background/40 transition-colors group"
                    >
                      {/* Avatar initiale */}
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                        {displayName.charAt(0).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {displayName}
                        </p>
                        <p className="text-xs text-foreground-muted mt-0.5 font-mono">
                          {contact.phone}
                          {countryData && (
                            <span className="ml-2 text-foreground-subtle font-sans">
                              · {countryData.name}
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Date */}
                      <span className="text-xs text-foreground-subtle hidden md:block shrink-0">
                        {formatDate(contact.created_at)}
                      </span>

                      {/* Supprimer */}
                      <button
                        onClick={() => handleDeleteContact(contact.id)}
                        disabled={deletingId === contact.id}
                        className="text-foreground-subtle opacity-0 group-hover:opacity-100 hover:text-danger transition-all p-1 rounded disabled:opacity-50"
                        aria-label="Supprimer"
                      >
                        {deletingId === contact.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-foreground-muted">
                Page {page} / {totalPages} · {total} contact{total > 1 ? 's' : ''}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page <= 1}
                  leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
                >
                  Précédent
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages}
                  rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
