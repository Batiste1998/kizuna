import { useEffect, useRef, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { api, type DocumentCategory, type DocumentsView } from '#/lib/api';
import { DOCUMENT_CATEGORY_LABELS } from '#/lib/levels';
import { Button } from '#/components/ui/button';
import { Label } from '#/components/ui/label';

const CATEGORIES: DocumentCategory[] = [
  'convention',
  'livret',
  'compte_rendu',
  'bulletin',
  'autre',
];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

/** Documents of one apprentice: upload (trinôme/admin), download, delete. */
export function DocumentsPanel({ alternantProfilId }: { alternantProfilId: string }) {
  const [view, setView] = useState<DocumentsView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<DocumentCategory>('autre');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .getDocuments(alternantProfilId)
      .then(setView)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [alternantProfilId]);

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!view || !file) return;
    setUploading(true);
    try {
      const doc = await api.uploadDocument(alternantProfilId, file, category);
      setView({ ...view, documents: [...view.documents, doc] });
      if (fileRef.current) fileRef.current.value = '';
      setCategory('autre');
      toast.success('Document déposé');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!view) return;
    const previous = view;
    setView({ ...view, documents: view.documents.filter((d) => d.id !== id) });
    try {
      await api.deleteDocument(id);
      toast.success('Document supprimé');
    } catch (err) {
      setView(previous);
      toast.error((err as Error).message);
    }
  }

  async function handleDownload(id: string, name: string) {
    try {
      await api.downloadDocument(id, name);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!view) return null;

  return (
    <div className="space-y-6">
      {view.canUpload && (
        <form
          onSubmit={handleUpload}
          className="grid gap-3 rounded-xl border border-border bg-card p-5 shadow-sm sm:grid-cols-[auto_1fr_auto] sm:items-end"
        >
          <div className="space-y-1.5">
            <Label htmlFor="category">Catégorie</Label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as DocumentCategory)}
              className="h-10 rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {DOCUMENT_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="file">Fichier</Label>
            <input
              id="file"
              ref={fileRef}
              type="file"
              required
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-card file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:border-brand"
            />
          </div>
          <Button type="submit" disabled={uploading}>
            {uploading ? '…' : 'Déposer'}
          </Button>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {view.documents.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Aucun document.</p>
        ) : (
          <ul className="divide-y divide-border">
            {view.documents.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{doc.originalName}</span>
                    <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand-strong">
                      {DOCUMENT_CATEGORY_LABELS[doc.category]}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatSize(doc.sizeBytes)} ·{' '}
                    {new Date(doc.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(doc.id, doc.originalName)}
                  >
                    Télécharger
                  </Button>
                  {view.canUpload && (
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(doc.id)}>
                      Supprimer
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
