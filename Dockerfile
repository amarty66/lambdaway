FROM php:7-apache
RUN a2enmod rewrite

COPY ./ /var/www/html/
RUN chown -R www-data:www-data /var/www/html/

RUN touch /var/log/lambdaway.log
RUN touch /var/log/lambdaway.connections.log
RUN chown www-data:www-data /var/log/lambdaway*.log