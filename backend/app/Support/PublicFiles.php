<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

// Uploaded images (products, profile photos, payment receipts).
//
// With CLOUDINARY_URL set they go to Cloudinary and stay there permanently.
// Without it they're saved on the server's own disk, which is fine on a developer's machine
// but is wiped on every redeploy on Render's free plan.
//
// Either way the database stores the full image URL.
class PublicFiles
{
    // Save an upload under a random name and return its public URL.
    // Answers 502 with a friendly message if the image service is unavailable.
    public static function store(UploadedFile $file, string $folder): string
    {
        if (Cloudinary::enabled()) {
            try {
                return Cloudinary::upload($file, $folder);
            } catch (\Throwable $e) {
                report($e);
                abort(502, "Couldn't save the image right now. Please try again.");
            }
        }

        // The extension comes from the file's real contents, never from the name the user picked
        $path = $file->store($folder, 'public');

        return url('storage/' . $path);
    }

    // Delete an image we stored earlier, given the URL (or older relative path) saved in the database.
    // Anything that isn't ours (e.g. a Google profile photo) is left alone.
    public static function delete(?string $urlOrPath): void
    {
        if (!$urlOrPath) {
            return;
        }

        if (Cloudinary::owns($urlOrPath)) {
            Cloudinary::destroy($urlOrPath);

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

    // Where uploads currently go, shown on /api/ping so it's easy to check after a deploy
    public static function driver(): string
    {
        return Cloudinary::enabled() ? 'cloudinary' : 'server-disk';
    }
}
