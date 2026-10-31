# ============================
# Dockerfile for Laravel Backend
# ============================

# Use PHP 8.2 CLI image
FROM php:8.2-cli

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    zip \
    unzip \
    git \
    curl \
    libpq-dev \
    && docker-php-ext-install pdo_pgsql mbstring bcmath gd \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# PHP's built-in limit is 2 MB per upload, which rejects most phone photos.
# The app itself checks for 5 MB, so let PHP accept a little more than that.
RUN printf "upload_max_filesize=10M\npost_max_size=12M\nmemory_limit=256M\n" > /usr/local/etc/php/conf.d/uploads.ini

# Set working directory
WORKDIR /var/www/html

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Copy all project files **before running composer**
COPY . .

# Install PHP dependencies
RUN composer install --no-interaction --optimize-autoloader --no-dev

# Create required Laravel directories with proper permissions
RUN mkdir -p storage/framework/{cache,data,sessions,views} \
    storage/app/public \
    storage/logs \
    bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose port (Render will override $PORT)
EXPOSE 8080

# Use entrypoint to initialize Laravel
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
