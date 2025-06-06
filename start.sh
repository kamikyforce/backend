#!/bin/bash
set -e

echo "Waiting for database to be ready..."

# Function to check if database is ready
check_db() {
    npx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1
}

# Wait for database to be ready (max 60 seconds)
echo "Checking database connection..."
for i in {1..60}; do
    if check_db; then
        echo "Database is ready!"
        break
    fi
    echo "Database not ready yet, waiting... ($i/60)"
    sleep 1
done

# Verify database is accessible
if ! check_db; then
    echo "ERROR: Database is not accessible after 60 seconds"
    echo "DATABASE_URL: $DATABASE_URL"
    exit 1
fi

echo "Starting database migration..."
npx prisma migrate deploy

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully"
else
    echo "❌ Migration failed"
    exit 1
fi

echo "Starting database seeding..."
npx prisma db seed

if [ $? -eq 0 ]; then
    echo "✅ Seeding completed successfully"
else
    echo "❌ Seeding failed"
    exit 1
fi

echo "🚀 Starting application..."
npm start