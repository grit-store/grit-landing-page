const SHOPIFY_DOMAIN = 'grit-real.myshopify.com';
const STOREFRONT_TOKEN = '876d4d48bd342fa15609c3a55aa20c29';
const API_URL = `https://${SHOPIFY_DOMAIN}/api/2024-01/graphql.json`;

async function test() {
    const mutation = `
        mutation {
            cartCreate(input: {
                lines: [{ merchandiseId: "gid://shopify/ProductVariant/48778469114107", quantity: 1 }]
            }) {
                cart {
                    id
                    checkoutUrl
                }
                userErrors {
                    message
                }
            }
        }
    `;
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN
        },
        body: JSON.stringify({ query: mutation })
    });
    const json = await response.json();
    console.log(JSON.stringify(json, null, 2));
}

test();
