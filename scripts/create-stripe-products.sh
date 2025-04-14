#!/bin/bash

# Stripe secret key
# ⚠️ PRODUCTION KEY - BE CAREFUL!
STRIPE_SECRET_KEY="sk_live_..." # Replace with your production secret key

# Function to create a product and its prices
create_product_and_prices() {
    local name=$1
    local description=$2
    local monthly_amount=$3
    
    # Create product
    product_response=$(curl -s "https://api.stripe.com/v1/products" \
        -u "${STRIPE_SECRET_KEY}:" \
        -d "name=${name}" \
        -d "description=${description}")
    
    product_id=$(echo $product_response | grep -o '"id": "[^"]*' | cut -d'"' -f4)
    
    # Create monthly price
    monthly_price_response=$(curl -s "https://api.stripe.com/v1/prices" \
        -u "${STRIPE_SECRET_KEY}:" \
        -d "product=${product_id}" \
        -d "unit_amount=${monthly_amount}" \
        -d "currency=usd" \
        -d "recurring[interval]=month")
        
    # Create yearly price (20% discount)
    yearly_amount=$((monthly_amount * 12 * 80 / 100))
    yearly_price_response=$(curl -s "https://api.stripe.com/v1/prices" \
        -u "${STRIPE_SECRET_KEY}:" \
        -d "product=${product_id}" \
        -d "unit_amount=${yearly_amount}" \
        -d "currency=usd" \
        -d "recurring[interval]=year")
    
    # Extract price IDs
    monthly_price_id=$(echo $monthly_price_response | grep -o '"id": "[^"]*' | cut -d'"' -f4)
    yearly_price_id=$(echo $yearly_price_response | grep -o '"id": "[^"]*' | cut -d'"' -f4)
    
    echo "Created ${name}:"
    echo "  Product ID: ${product_id}"
    echo "  Monthly Price ID: ${monthly_price_id}"
    echo "  Yearly Price ID: ${yearly_price_id}"
    echo ""
}

# Create all products and prices
create_product_and_prices "Independent" "Independent tier - For solo game developers" 9900
create_product_and_prices "Studio" "Studio tier - For small game studios" 24900
create_product_and_prices "Publisher" "Publisher tier - For game publishers" 49900
create_product_and_prices "Ecosystem" "Ecosystem tier - For game industry leaders" 99900
