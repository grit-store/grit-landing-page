# Mockup Prompts

Below are the 5 mockup prompt templates used for generating variant-specific product photography. These prompts are **dynamically built** by `generate-mockups.js` based on the product's graphic configuration in `mockup-config.json`.

The `[COLOR]` placeholder is replaced dynamically with the target color (e.g., *Black*, *Red*, *Off White*, *Bottle Green*) during generation.

---

## How It Works

Each product is configured with two flags:
- `front_has_graphic` — does the front of the tee have a graphic/print?
- `back_has_graphic` — does the back of the tee have a graphic/print?

The prompt builder in `generate-mockups.js` uses these flags to dynamically adjust each prompt. Below are the templates for all scenarios.

---

## Prompt 1: Flat Lay (Front & Back Side-by-Side)

### When front has graphic + back has graphic:
```text
Top-down flat lay of two [COLOR] oversized t-shirts neatly laid side by side, left shirt showing the front graphic print, right shirt showing the back graphic print, placed on dark charcoal textured surface, dramatic soft lighting from top left, deep shadows, premium minimal aesthetic, high resolution product photography
```

### When front is plain + back has graphic:
```text
Top-down flat lay of two [COLOR] oversized t-shirts neatly laid side by side, left shirt showing a completely PLAIN solid [COLOR] front with absolutely NO graphics, NO text, NO logos, NO prints, NO designs of any kind, right shirt showing the back graphic print, placed on dark charcoal textured surface, dramatic soft lighting from top left, deep shadows, premium minimal aesthetic, high resolution product photography
```

### When front has graphic + back is plain:
```text
Top-down flat lay of two [COLOR] oversized t-shirts neatly laid side by side, left shirt showing the front graphic print, right shirt showing a completely PLAIN solid [COLOR] back with absolutely NO graphics, NO text, NO logos, NO prints, NO designs of any kind, placed on dark charcoal textured surface, dramatic soft lighting from top left, deep shadows, premium minimal aesthetic, high resolution product photography
```

### When both sides are plain:
```text
Top-down flat lay of two [COLOR] oversized t-shirts neatly laid side by side, left shirt showing a completely PLAIN solid [COLOR] front, right shirt showing a completely PLAIN solid [COLOR] back, placed on dark charcoal textured surface, dramatic soft lighting from top left, deep shadows, premium minimal aesthetic, high resolution product photography
```

---

## Prompt 2: Floating Front View

### When front has graphic:
```text
A [COLOR] oversized graphic t-shirt floating and suspended in mid-air, showing the front graphic print from the reference image, slightly angled for dimension, natural fabric wrinkles and folds, soft drop shadow beneath, dark charcoal textured surface background, high-end e-commerce style, studio lighting, hyper-realistic product photography
```

### When front is plain:
```text
A [COLOR] oversized t-shirt floating and suspended in mid-air, showing the front. The front of the t-shirt is COMPLETELY PLAIN — solid [COLOR] fabric only, absolutely NO graphics, NO text, NO logos, NO prints, NO designs of any kind. Slightly angled for dimension, natural fabric wrinkles and folds, soft drop shadow beneath, dark charcoal textured surface background, high-end e-commerce style, studio lighting, hyper-realistic product photography
```

---

## Prompt 3: Floating Back View

### When back has graphic:
```text
A [COLOR] oversized graphic t-shirt floating and suspended in mid-air, showing the back graphic print from the reference image, slightly angled for dimension, natural fabric wrinkles and folds, soft drop shadow beneath, dark charcoal textured surface background, high-end e-commerce style, studio lighting, hyper-realistic product photography
```

### When back is plain:
```text
A [COLOR] oversized t-shirt floating and suspended in mid-air, showing the back. The back of the t-shirt is COMPLETELY PLAIN — solid [COLOR] fabric only, absolutely NO graphics, NO text, NO logos, NO prints, NO designs of any kind. Slightly angled for dimension, natural fabric wrinkles and folds, soft drop shadow beneath, dark charcoal textured surface background, high-end e-commerce style, studio lighting, hyper-realistic product photography
```

---

## Prompt 4: Close-up Front View (Chest Shot)

### When front has graphic:
```text
Close-up chest shot of a person wearing a [COLOR] oversized graphic t-shirt, showing the front graphic print from the reference image, focus on the front graphic detail, shallow depth of field, dark charcoal studio background, soft studio lighting, editorial product photography, high resolution
```

### When front is plain:
```text
Close-up chest shot of a person wearing a [COLOR] oversized t-shirt. The front of the t-shirt is COMPLETELY PLAIN — solid [COLOR] fabric only, absolutely NO graphics, NO text, NO logos, NO prints, NO designs of any kind. Focus on the fabric texture, crewneck collar and shoulder stitching, shallow depth of field, dark charcoal studio background, soft studio lighting, editorial product photography, high resolution
```

---

## Prompt 5: Close-up Back View

### When back has graphic:
```text
Close-up back shot of a person wearing a [COLOR] oversized graphic t-shirt, showing the back graphic print from the reference image, focus on the back graphic detail, shallow depth of field, dark charcoal studio background, soft studio lighting, editorial product photography, high resolution
```

### When back is plain:
```text
Close-up back shot of a person wearing a [COLOR] oversized t-shirt. The back of the t-shirt is COMPLETELY PLAIN — solid [COLOR] fabric only, absolutely NO graphics, NO text, NO logos, NO prints, NO designs of any kind. Focus on the fabric texture and stitching, shallow depth of field, dark charcoal studio background, soft studio lighting, editorial product photography, high resolution
```
