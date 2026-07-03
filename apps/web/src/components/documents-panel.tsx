import { useEffect, useRef, useState, type DragEvent } from 'react';
import { toast } from 'sonner';
import {
  Download,
  File,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { api, type DocumentCategory, type DocumentsView } from '#/lib/api';
import { DOCUMENT_CATEGORY_LABELS } from '#/lib/levels';
import { EmptyThread } from '#/components/ui/empty-thread';
import { IconAction } from '#/components/ui/icon-action';
import { ThreadSkeleton } from '#/components/ui/skeleton';
import { cn } from '#/lib/utils';

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

const EXTENSION_ICONS: Record<string, typeof File> = {
  pdf: FileText,
  doc: FileText,
  docx: FileText,
  xls: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  csv: FileSpreadsheet,
  png: FileImage,
  jpg: FileImage,
  jpeg: FileImage,
  gif: FileImage,
  webp: FileImage,
  zip: FileArchive,
  rar: FileArchive,
};

/** Icon keyed on the file extension, so the list reads at a glance. */
function FileIcon({ name }: { name: string }) {
  const Icon = EXTENSION_ICONS[name.split('.').pop()?.toLowerCase() ?? ''] ?? File;
  return (
    <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-brand-soft text-brand-strong">
      <Icon className="h-[18px] w-[18px]" />
    </span>
  );
}

/** Documents of one apprentice: drag-and-drop upload (trinôme/admin), download, delete. */
export function DocumentsPanel({ alternantProfilId }: { alternantProfilId: string }) {
  const [view, setView] = useState<DocumentsView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<DocumentCategory>('autre');
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
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

  async function upload(file: File) {
    if (!view || uploading) return;
    setUploading(true);
    try {
      const doc = await api.uploadDocument(alternantProfilId, file, category);
      setView((v) => (v ? { ...v, documents: [...v.documents, doc] } : v));
      toast.success('Document déposé');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void upload(file);
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

  if (loading) return <ThreadSkeleton rows={3} />;
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!view) return null;

  return (
    <div className="space-y-6">
      {view.canUpload && (
        <div className="space-y-3">
          {/* Dropzone — click or drop a file; it uploads in the selected category. */}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            disabled={uploading}
            className={cn(
              'grid w-full place-items-center gap-1 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors',
              dragging
                ? 'border-brand bg-brand-soft/60'
                : 'border-border bg-card/60 hover:border-brand/50 hover:bg-brand-soft/30',
              uploading && 'pointer-events-none opacity-60',
            )}
          >
            <UploadCloud
              className={cn('h-7 w-7', dragging ? 'text-brand-strong' : 'text-muted-foreground')}
            />
            <span className="text-sm font-semibold">
              {uploading ? 'Envoi en cours…' : 'Glissez un fichier ici, ou cliquez pour parcourir'}
            </span>
            <span className="text-xs text-muted-foreground">
              Il sera classé dans « {DOCUMENT_CATEGORY_LABELS[category]} »
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            className="sr-only"
            aria-label="Choisir un fichier"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
            }}
          />

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-semibold text-muted-foreground">Catégorie :</span>
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                aria-pressed={category === c}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                  category === c
                    ? 'bg-brand text-white shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-brand-soft hover:text-brand-strong',
                )}
              >
                {DOCUMENT_CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
        </div>
      )}

      {view.documents.length === 0 ? (
        <EmptyThread title="Aucun document">
          Conventions, livrets, comptes-rendus : les pièces du dossier d’alternance se rangent ici,
          accessibles au trinôme entier.
        </EmptyThread>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-hairline bg-card shadow-sm">
          <ul className="stagger-children divide-y divide-hairline">
            {view.documents.map((doc) => (
              <li
                key={doc.id}
                className="group flex items-center gap-3.5 px-5 py-3 transition-colors hover:bg-muted/40"
              >
                <FileIcon name={doc.originalName} />
                <div className="min-w-0 flex-1">
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
                <div className="flex shrink-0 gap-1 opacity-70 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 sm:opacity-0">
                  <IconAction
                    title={`Télécharger ${doc.originalName}`}
                    icon={<Download className="h-4 w-4" />}
                    onClick={() => handleDownload(doc.id, doc.originalName)}
                    className="h-9 w-9"
                  />
                  {view.canUpload && (
                    <IconAction
                      title={`Supprimer ${doc.originalName}`}
                      icon={<Trash2 className="h-4 w-4" />}
                      onClick={() => handleDelete(doc.id)}
                      danger
                      className="h-9 w-9"
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
