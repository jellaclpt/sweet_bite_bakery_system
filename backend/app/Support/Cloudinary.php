<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

// Small client for Cloudinary's Upload API (https://cloudinary.com/documentation/image_upload_api_reference).
// Turned on by setting CLOUDINARY_URL on the server, copied from Cloudinary Console > Settings > API Keys:
//   CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
class Cloudinary
{
    // Phone photos can be 4000px+ and several MB. Shrinking them on upload keeps the free plan's storage low.
    private const MAX_SIZE_ON_UPLOAD = 'c_limit,h_1600,w_1600';

    // Delivered images use the best format and quality for each visitor's browser (e.g. WebP)
    private const DELIVERY_OPTIMIZATION = 'f_auto,q_auto';

    public static function enabled(): bool
    {
        return self::credentials() !== null;
    }

    public static function cloudName(): ?string
    {
        return self::credentials()['cloud'] ?? null;
    }

    // Upload an image into "<base folder>/<folder>" and return its optimized public URL
    public static function upload(UploadedFile $file, string $folder): string
    {
        $creds = self::credentials() ?? throw new RuntimeException('Cloudinary is not configured.');

        $params = [
            'folder' => trim(config('services.cloudinary.folder', 'sweet-bite'), '/') . '/' . trim($folder, '/'),
            'timestamp' => time(),
            'transformation' => self::MAX_SIZE_ON_UPLOAD,
        ];

        $response = Http::timeout(30)
            ->attach('file', fopen($file->getRealPath(), 'r'), $file->hashName())
            ->post(self::endpoint($creds['cloud'], 'upload'), self::signed($params, $creds));

        if (!$response->successful() || !$response->json('secure_url')) {
            Log::error('Cloudinary upload failed', ['status' => $response->status(), 'error' => $response->json('error.message')]);
            throw new RuntimeException('Cloudinary upload failed.');
        }

        return self::optimizedUrl($response->json('secure_url'));
    }

    // Delete an image we uploaded, given the URL saved in the database. Failures are only logged:
    // a leftover file shouldn't stop a product from being edited or deleted.
    public static function destroy(string $url): void
    {
        $creds = self::credentials();
        $publicId = self::publicIdFromUrl($url);

        if (!$creds || !$publicId) {
            return;
        }

        try {
            $response = Http::timeout(15)->asForm()->post(
                self::endpoint($creds['cloud'], 'destroy'),
                self::signed(['public_id' => $publicId, 'timestamp' => time(), 'invalidate' => 'true'], $creds),
            );

            if (!$response->successful()) {
                Log::warning('Cloudinary delete failed', ['public_id' => $publicId, 'status' => $response->status()]);
            }
        } catch (\Throwable $e) {
            Log::warning('Cloudinary delete failed', ['public_id' => $publicId, 'error' => $e->getMessage()]);
        }
    }

    // True for image URLs in *our* Cloudinary account (not someone else's, not a Google photo)
    public static function owns(?string $url): bool
    {
        return $url !== null && self::publicIdFromUrl($url) !== null;
    }

    // https://res.cloudinary.com/<cloud>/image/upload/f_auto,q_auto/v1712345/sweet-bite/products/abc.jpg
    //   -> "sweet-bite/products/abc"
    public static function publicIdFromUrl(string $url): ?string
    {
        $cloud = self::cloudName();
        if (!$cloud) {
            return null;
        }

        $prefix = "https://res.cloudinary.com/{$cloud}/image/upload/";
        if (!str_starts_with($url, $prefix)) {
            return null;
        }

        $segments = explode('/', substr($url, strlen($prefix)));

        // Skip delivery transformations ("f_auto,q_auto") and the version ("v1712345")
        while ($segments && preg_match('#^(v\d+|[a-z]{1,3}_[^/]*)$#', $segments[0])) {
            array_shift($segments);
        }

        $path = implode('/', $segments);
        $publicId = preg_replace('#\.[A-Za-z0-9]+$#', '', $path);

        return ($publicId === '' || str_contains($publicId, '..')) ? null : $publicId;
    }

    // Cloudinary's signature: every parameter except file, cloud_name, resource_type and api_key,
    // sorted by name, joined as a=1&b=2, with the API secret appended, then SHA-1.
    public static function signature(array $params, string $secret): string
    {
        $params = array_filter(
            $params,
            fn ($value, $key) => !in_array($key, ['file', 'cloud_name', 'resource_type', 'api_key'], true) && $value !== null && $value !== '',
            ARRAY_FILTER_USE_BOTH,
        );
        ksort($params);

        $toSign = implode('&', array_map(fn ($k, $v) => "{$k}={$v}", array_keys($params), $params));

        return sha1($toSign . $secret);
    }

    private static function signed(array $params, array $creds): array
    {
        return $params + [
            'api_key' => $creds['key'],
            'signature' => self::signature($params, $creds['secret']),
        ];
    }

    private static function optimizedUrl(string $secureUrl): string
    {
        return preg_replace('#/image/upload/#', '/image/upload/' . self::DELIVERY_OPTIMIZATION . '/', $secureUrl, 1);
    }

    private static function endpoint(string $cloud, string $action): string
    {
        return "https://api.cloudinary.com/v1_1/{$cloud}/image/{$action}";
    }

    // Reads CLOUDINARY_URL (cloudinary://key:secret@cloud). Returns null if it's missing or malformed.
    private static function credentials(): ?array
    {
        $url = trim((string) config('services.cloudinary.url'));

        // Accept the value pasted with or without the "CLOUDINARY_URL=" prefix
        $url = preg_replace('#^CLOUDINARY_URL=#', '', $url);

        $parts = parse_url($url);
        if (($parts['scheme'] ?? null) !== 'cloudinary' || empty($parts['user']) || empty($parts['pass']) || empty($parts['host'])) {
            return null;
        }

        return [
            'key' => urldecode($parts['user']),
            'secret' => urldecode($parts['pass']),
            'cloud' => $parts['host'],
        ];
    }
}
