import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { ImageOff, Upload, X, Link2 } from 'lucide-react';
import { uploadFile } from '@/lib/api';
import { Button, Input } from '@/components/ui';

/**
 * Image picker used by Categories and Banners.
 * Admins can either upload a file (stored by the API and returned as a URL)
 * or paste an external URL — both end up as a single `value` string.
 */
export function ImageField({
    value,
    onChange,
    label = 'Image',
    aspect = 'h-32',
    hint,
}: {
    value: string;
    onChange: (url: string) => void;
    label?: string;
    aspect?: string;
    hint?: string;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);
    const [showUrl, setShowUrl] = useState(false);

    const pick = async (file?: File | null) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) { toast.error('Please choose an image file'); return; }
        if (file.size > 8 * 1024 * 1024) { toast.error('Image must be under 8MB'); return; }
        setBusy(true);
        try {
            onChange(await uploadFile(file));
            toast.success('Image uploaded');
        } catch (e: any) { toast.error(e?.message || 'Upload failed'); }
        finally { setBusy(false); if (inputRef.current) inputRef.current.value = ''; }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium">{label}</label>
                <button
                    type="button"
                    onClick={() => setShowUrl(v => !v)}
                    className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                    <Link2 className="h-3 w-3" /> {showUrl ? 'Hide URL' : 'Use URL'}
                </button>
            </div>

            <div
                className={`relative ${aspect} rounded-md border border-dashed border-border bg-muted/40 overflow-hidden`}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); void pick(e.dataTransfer.files?.[0]); }}
            >
                {value ? (
                    <>
                        <img src={value} alt="" className="absolute inset-0 h-full w-full object-cover" onError={e => { (e.target as HTMLImageElement).style.opacity = '0'; }} />
                        <button
                            type="button"
                            onClick={() => onChange('')}
                            className="absolute top-2 right-2 h-7 w-7 grid place-items-center rounded-md bg-background/85 border border-border hover:bg-background"
                            aria-label="Remove image"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </>
                ) : (
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted-foreground text-xs hover:text-foreground"
                    >
                        <ImageOff className="h-5 w-5" />
                        <span>Click or drop an image here</span>
                    </button>
                )}
            </div>

            <input ref={inputRef} type="file" accept="image/*" hidden onChange={e => void pick(e.target.files?.[0])} />

            <div className="mt-2 flex items-center gap-2">
                <Button type="button" size="sm" variant="outline" loading={busy} onClick={() => inputRef.current?.click()}>
                    <Upload className="h-3.5 w-3.5" /> {value ? 'Replace' : 'Upload'}
                </Button>
                {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
            </div>

            {showUrl && (
                <Input
                    className="mt-2"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder="https://..."
                />
            )}
        </div>
    );
}

export default ImageField;
