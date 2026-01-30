#!/bin/bash

# Setup script for Neon PostgreSQL database

echo "==================================="
echo "Competitor Intelligence Radar"
echo "Database Setup via Neon"
echo "==================================="
echo ""
echo "This script will help you set up a free PostgreSQL database using Neon."
echo ""
echo "Steps:"
echo "1. Go to https://neon.tech and sign up (free tier available)"
echo "2. Create a new project"
echo "3. Copy the connection string from the dashboard"
echo "4. Paste it below when prompted"
echo ""
read -p "Enter your Neon DATABASE_URL: " DB_URL

if [ -z "$DB_URL" ]; then
    echo "No URL provided. Exiting."
    exit 1
fi

# Update .env file
sed -i '' "s|DATABASE_URL=.*|DATABASE_URL=\"$DB_URL\"|" .env 2>/dev/null || \
echo "DATABASE_URL=\"$DB_URL\"" >> .env

echo ""
echo "DATABASE_URL updated in .env"
echo ""
echo "Now running database setup..."
echo ""

# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Run seed script
npm run db:seed

echo ""
echo "==================================="
echo "Database setup complete!"
echo "==================================="
echo ""
echo "You can now run: npm run dev"
