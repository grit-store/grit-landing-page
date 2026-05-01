const Client = require('shopify-buy');

const client = Client.buildClient({
  domain: 'grit-real.myshopify.com',
  storefrontAccessToken: '876d4d48bd342fa15609c3a55aa20c29'
});

async function test() {
    try {
        const products = await client.product.fetchAll();
        const variantId = products[0].variants[0].id;
        console.log("Variant ID:", variantId);

        const checkout = await client.checkout.create();
        console.log("Checkout created:", checkout.id);

        const updatedCheckout = await client.checkout.addLineItems(checkout.id, [{
            variantId: variantId,
            quantity: 1
        }]);
        console.log("Line items added.");
        console.log("Web URL:", updatedCheckout.webUrl);
    } catch (e) {
        console.error("SDK Error:", e);
    }
}

test();
