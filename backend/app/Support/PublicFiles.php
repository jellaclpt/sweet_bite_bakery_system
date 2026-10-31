<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

// Uploaded images (products, profile photos, payment receipts) live on the "public" disk
// and are saved in the database as full URLs, e.g. https://api.../storage/products/abc.jpg
class PublicFiles
{
    // Save an upload under a random name with an extension taken from the file's real
    // contents (never from the name the user picked), and return its public URL.
    public static function store(UploadedFile $file, string $folder): string
    {
        $path = $file->store($folder, 'public');

        return url('storage/' . $path);
    }

    // Delete a file we stored earlier, given the URL (or older relative path) saved in the database.
    // Anything that isn't one of our own storage files (e.g. a Google profile photo) is left alone.
    public static function delete(?string $urlOrPath): void
    {
        if (!$urlOrPath) {
            return;
        }

        $path = ltrim(parse_url($urlOrPath, PHP_URL_PATH) ?: $urlOrPath, '/');

        if (!str_starts_with($path, 'storage/')) {
            return;
        }

        $relative = substr($path, strlen('storage/'));

        // Refuse anything that tries to climb out of the storage folder
        if ($relative === '' || str_contains($relative, '..')) {
            return;
        }

        Storage::disk('public')->delete($relative);
    }
}
