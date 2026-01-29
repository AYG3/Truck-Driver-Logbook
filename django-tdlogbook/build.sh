#!/usr/bin/env bash
# exit on error
set -o errexit

pip install -r requirements.txt

python manage.py collectstatic --no-input
python manage.py migrate

# Seed default drivers into the database
echo "Seeding database with default drivers..."
python manage.py seed_drivers