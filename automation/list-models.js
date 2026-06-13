const https = require('https');
const fs = require('fs');
const env = {};
fs.readFileSync('.env', 'utf-8').split('\n').forEach(l => {
    const t = l.trim();
    if (t && !t.startsWith('#')) {
        const [k, ...v] = t.split('=');
        env[k.trim()] = v.join('=').trim();
    }
});

https.get('https://generativelanguage.googleapis.com/v1beta/models?key=' + env.GOOGLE_AI_KEY, r => {
    let d = '';
    r.on('data', c => d += c);
    r.on('end', () => {
        const models = JSON.parse(d).models || [];
        const imgModels = models.filter(m =>
            m.name.includes('image') ||
            m.name.includes('imagen') ||
            (m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
        );
        console.log('Models with "image" or "imagen" in name, or supporting generateContent:\n');
        imgModels.forEach(m => console.log(m.name, '-', (m.supportedGenerationMethods || []).join(', ')));
    });
});
