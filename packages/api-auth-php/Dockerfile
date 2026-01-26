FROM php:8.2-apache

# Enable Apache mod_rewrite
RUN a2enmod rewrite

# Install system packages and PHP extensions for PostgreSQL
RUN apt-get update && apt-get install -y \
    libpq-dev \
    unzip \
    git \
    && docker-php-ext-install pdo pdo_pgsql pgsql \
    && rm -rf /var/lib/apt/lists/*

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Copy application files
COPY . /var/www/html

# Install PHP dependencies
RUN composer install --no-dev --prefer-dist --no-interaction

# Set proper permissions
RUN chown -R www-data:www-data /var/www/html

# Apache DocumentRoot
ENV APACHE_DOCUMENT_ROOT=/var/www/html/public
RUN sed -ri -e 's!/var/www/html!/var/www/html/public!g' /etc/apache2/sites-available/*.conf \
    && sed -ri -e 's!/var/www/!/var/www/html/public!g' /etc/apache2/apache2.conf \
    && sed -ri -e 's!Directory /var/www/!Directory /var/www/html/public!g' /etc/apache2/apache2.conf

# Allow .htaccess overrides and grant access to public directory
RUN sed -ri -e 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf \
  && printf "<Directory /var/www/html/public>\n    AllowOverride All\n    Require all granted\n</Directory>\n" > /etc/apache2/conf-available/public.conf \
  && a2enconf public

# Healthcheck (delayed to allow app startup)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD curl -f http://localhost/health || exit 1

EXPOSE 80
