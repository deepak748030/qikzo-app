import { API_URL, API_BASE_URL } from '../config';
import { tokenStore } from '../tokenStore';
import { ApiError } from '../errors';

export type UploadedFile = {
    url: string;           // relative /uploads/... path
    absoluteUrl: string;   // fully-qualified URL usable in <Image />
    filename: string;
    mimeType: string;
    sizeBytes: number;
};

/**
 * Upload a local file via multipart to the server (`POST /uploads`).
 * `localUri` is a file:// URI from expo-image-picker/document-picker.
 */
export async function uploadFile(input: {
    localUri: string;
    name?: string;
    mimeType?: string;
}): Promise<UploadedFile> {
    const { accessToken } = tokenStore.get();
    if (!accessToken) throw new ApiError({ status: 401, message: 'Not authenticated', code: 'NO_TOKEN' });

    const form = new FormData();
    // React Native FormData accepts { uri, name, type }
    form.append('file', {
        uri: input.localUri,
        name: input.name || `upload_${Date.now()}`,
        type: input.mimeType || 'application/octet-stream',
    } as any);

    let res: Response;
    try {
        res = await fetch(`${API_URL}/uploads`, {
            method: 'POST',
            headers: {
                accept: 'application/json',
                authorization: `Bearer ${accessToken}`,
            },
            body: form as any,
        });
    } catch (e: any) {
        throw new ApiError({ status: 0, message: 'Network error', code: 'NETWORK' });
    }

    const json: any = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
        throw new ApiError({
            status: res.status,
            message: json?.message || 'Upload failed',
            code: json?.code,
            details: json?.details,
        });
    }

    const url = json.url as string;
    return {
        url,
        absoluteUrl: url.startsWith('http') ? url : `${API_BASE_URL}${url}`,
        filename: json.filename,
        mimeType: json.mimeType,
        sizeBytes: json.sizeBytes,
    };
}

export const uploadsApi = { uploadFile };
export default uploadsApi;
