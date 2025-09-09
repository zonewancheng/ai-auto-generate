import { GoogleGenAI, Modality, Type } from "@google/genai";

if (!process.env.API_KEY) {
  // This is a placeholder for development.
  // In a real environment, the key would be set.
  // We'll proceed assuming it's configured, as per instructions.
  console.warn("API_KEY environment variable not set. Using a placeholder.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

// --- Helper for Image Generation API Calls ---

const handleApiError = (error: unknown): never => {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        try {
            // The error message from the SDK might be a JSON string.
            const parsedError = JSON.parse(error.message);
            if (parsedError?.error?.code === 429) {
                throw new Error("已达到请求上限。请稍后再试。");
            }
            const message = parsedError?.error?.message || error.message;
            throw new Error(`Gemini API 错误: ${message}`);
        } catch (e) {
            // If parsing fails, check the raw string for keywords related to rate limiting.
            if (error.message.includes("429") || error.message.includes("RESOURCE_EXHAUSTED")) {
                throw new Error("已达到请求上限。请稍后再试。");
            }
            // If it's not a rate limit error and parsing failed, use the original message.
            throw new Error(`Gemini API 错误: ${error.message}`);
        }
    }
    throw new Error("生成图像时发生未知错误。");
};

// --- Step 1: Base Character Generation ---

export const generateBaseCharacter = async (userPrompt: string): Promise<string> => {
  const masterPrompt = `
Generate a single, high-quality pixel art character. The character is: "${userPrompt}".
The character should be full-body, standing still, and facing directly forward in a neutral A-pose.
The background must be completely transparent.
The style should be vibrant 16-bit JRPG pixel art.
Do not include any text, watermarks, or other elements.
The character should be centered in the frame.
  `;
  try {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: masterPrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
          aspectRatio: '1:1',
        },
    });

    if (response.generatedImages?.[0]?.image?.imageBytes) {
      const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
      return `data:image/png;base64,${base64ImageBytes}`;
    } else {
      throw new Error("API 未返回任何图像数据。这可能是由于安全策略或提示过于模糊。请尝试修改您的提示。");
    }
  } catch (error) {
    handleApiError(error);
  }
};

// --- Step 2: Asset Generation from Base Image ---

const generateAssetFromImage = async (base64ImageDataUrl: string, prompt: string): Promise<string> => {
    const pureBase64 = base64ImageDataUrl.split(',')[1];
    if (!pureBase64) {
        throw new Error("提供了无效的 base64 图像数据。");
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: {
                parts: [
                    { inlineData: { data: pureBase64, mimeType: 'image/png' } },
                    { text: prompt },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        const candidate = response.candidates?.[0];
        const imagePart = candidate?.content?.parts.find(part => part.inlineData);

        if (imagePart?.inlineData?.data) {
            return `data:image/png;base64,${imagePart.inlineData.data}`;
        } else {
            if (candidate?.finishReason === 'SAFETY') {
                const safetyMessage = candidate.safetyRatings
                    ?.filter(r => r.probability !== 'NEGLIGIBLE' && r.probability !== 'LOW')
                    .map(r => `类别 ${r.category} 被标记为 ${r.probability}`)
                    .join(', ');
                throw new Error(`请求因安全原因被拒绝。${safetyMessage ? `详情: ${safetyMessage}` : '请尝试调整提示或图片。'}`);
            }
            const textPart = candidate?.content?.parts.find(part => part.text);
            const refusalMessage = textPart?.text || "API 未返回有效图片，请求可能已被拒绝。请尝试修改你的提示或图片。";
            throw new Error(refusalMessage);
        }
    } catch (error) {
        handleApiError(error);
    }
};

export const adjustGeneratedImage = async (base64ImageDataUrl: string, adjustmentPrompt: string): Promise<string> => {
    const masterPrompt = `
You are an expert pixel artist. Take the user's provided image and redraw it based on their requested adjustment.
User's adjustment request: "${adjustmentPrompt}".

**CRITICAL INSTRUCTIONS:**
1.  **Preserve Core Elements:** Maintain the original image's composition, character pose, style (pixel art), and overall feel.
2.  **Preserve Technical Specs:** The output image MUST have the exact same dimensions and transparent background as the input image.
3.  **Apply Change:** Only apply the specific change requested by the user. Do not add or change anything else.
4.  **No Text:** The output must be a single PNG image with no text, watermarks, or artifacts.
`;
    return generateAssetFromImage(base64ImageDataUrl, masterPrompt);
};

export const optimizeCharacterImage = async (
  base64ImageDataUrl: string,
  userPrompt: string,
  referenceImageBase64DataUrl?: string | null
): Promise<string> => {
    let masterPrompt = `
You are an expert pixel art artist. Take the user's provided pixel art character (the first image) and enhance it based on their request, improving its overall quality.
User's request: "${userPrompt}".
`;

    if (referenceImageBase64DataUrl) {
        masterPrompt += `
**STYLE REFERENCE:** The second image provided is a style reference. You MUST adapt the first image to match the artistic style (colors, shading, line work, and overall aesthetic) of the reference image.
`;
    }

    masterPrompt += `
**CRITICAL INSTRUCTIONS:**
1.  **Preserve Dimensions:** The output image MUST have the exact same dimensions as the FIRST input image. This is the most important rule. Do not change the width or height.
2.  **Preserve Core Design:** Maintain the original character's pose and fundamental design from the FIRST image.
3.  **Enhance Quality:** Improve the shading, clean up messy pixels, and refine details to make it look like professional 16-bit JRPG pixel art.
4.  **Transparent Background:** The output MUST have a transparent background, matching the input.
5.  **No Text:** The output must be a single PNG image with no text, watermarks, or artifacts.
`;

    const mainImageBase64 = base64ImageDataUrl.split(',')[1];
    if (!mainImageBase64) {
        throw new Error("提供了无效的主图像数据。");
    }

    const parts: any[] = [
        { inlineData: { data: mainImageBase64, mimeType: 'image/png' } },
    ];
    
    if (referenceImageBase64DataUrl) {
        const referenceImageBase64 = referenceImageBase64DataUrl.split(',')[1];
        if (referenceImageBase64) {
            parts.push({ inlineData: { data: referenceImageBase64, mimeType: 'image/png' } });
        }
    }
    
    parts.push({ text: masterPrompt });

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        const candidate = response.candidates?.[0];
        const imagePart = candidate?.content?.parts.find(part => part.inlineData);
        if (imagePart?.inlineData?.data) {
            return `data:image/png;base64,${imagePart.inlineData.data}`;
        } else {
             if (candidate?.finishReason === 'SAFETY') {
                const safetyMessage = candidate.safetyRatings
                    ?.filter(r => r.probability !== 'NEGLIGIBLE' && r.probability !== 'LOW')
                    .map(r => `类别 ${r.category} 被标记为 ${r.probability}`)
                    .join(', ');
                throw new Error(`请求因安全原因被拒绝。${safetyMessage ? `详情: ${safetyMessage}` : '请尝试调整提示或图片。'}`);
            }
            const textPart = candidate?.content?.parts.find(part => part.text);
            const refusalMessage = textPart?.text || "API 未返回有效图片，请求可能已被拒绝。请尝试修改你的提示或图片。";
            throw new Error(refusalMessage);
        }
    } catch (error) {
        handleApiError(error);
    }
};

export const generateWalkingSpriteFromImage = async (base64ImageDataUrl: string): Promise<string> => {
    const prompt = `
Using the provided character image as a reference, generate a complete RPG Maker MZ walking animation sprite sheet.
- The sprite sheet must be a single PNG image with a transparent background.
- The grid must be exactly 3 columns by 4 rows.
- Each frame must be 48x48 pixels, making the total image size 144x192 pixels.
- Row 1: Character walking down.
- Row 2: Character walking left.
- Row 3: Character walking right.
- Row 4: Character walking up.
- Maintain the character's design and colors accurately.
- The style must be pixel art.
`;
    return generateAssetFromImage(base64ImageDataUrl, prompt);
};

export const generateBattlerFromImage = async (base64ImageDataUrl: string): Promise<string> => {
    const prompt = `
Using the provided character image as a reference, generate a single, static side-view battler sprite for RPG Maker MZ.
- The character should be in a dynamic, ready-for-battle pose, facing left.
- The style must be high-quality pixel art that matches the reference image.
- The output should be a single PNG image with a transparent background.
- Ensure the sprite is larger and more detailed than a standard walking sprite.
`;
    return generateAssetFromImage(base64ImageDataUrl, prompt);
};

export const generateFacesetFromImage = async (base64ImageDataUrl: string): Promise<string> => {
    const prompt = `
Using the provided character image as a reference, generate a single character portrait (faceset) for RPG Maker MZ.
- The image must focus on the character's head and shoulders with a neutral expression.
- The style must be high-quality pixel art matching the reference.
- The final image must be exactly 144 pixels wide by 144 pixels high with a transparent background.
`;
    return generateAssetFromImage(base64ImageDataUrl, prompt);
};


// --- Map Generation ---

export const generateTileset = async (userPrompt: string): Promise<string> => {
  const masterPrompt = `
Generate a pixel art tileset for a top-down RPG, compatible with RPG Maker MZ.
The theme of the tileset is: "${userPrompt}".

**CRITICAL STYLE REQUIREMENT:** The art style MUST be a vibrant, colorful, and detailed pixel art aesthetic inspired by the game 'Genshin Impact'. It should be high-quality, with beautiful colors and a sense of wonder.

**Technical Specifications:**
- The output must be a single PNG image.
- The image must be organized as a grid of 48x48 pixel tiles. A good size would be 384x384 pixels (an 8x8 grid of tiles).
- The tileset must include a variety of ground textures (e.g., grass, dirt, sand, water), and decorative elements like flowers, rocks, trees, and path borders relevant to the theme.
- Include some tiles with transparent backgrounds for objects that can be placed on top of other tiles (like trees or chests).
- Do not include any characters, UI, text, or watermarks.
  `;

  try {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: masterPrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
          aspectRatio: '1:1', // Tilesets are often square
        },
    });

    if (response.generatedImages?.[0]?.image?.imageBytes) {
      const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
      return `data:image/png;base64,${base64ImageBytes}`;
    } else {
      throw new Error("API 未返回任何图像数据。这可能是由于安全策略或提示过于模糊。请尝试修改您的提示。");
    }
  } catch (error) {
    handleApiError(error);
  }
};

export const restyleMapImage = async (base64ImageDataUrl: string, stylePrompt: string): Promise<string> => {
    const masterPrompt = `
You are an expert pixel artist tasked with stylizing a game map. Redraw the user's uploaded RPG Maker map screenshot completely, using it as a perfect layout reference.

**CRITICAL STYLE REQUIREMENT:** The new style must be a vibrant, beautiful, and detailed pixel art aesthetic inspired by the game 'Genshin Impact'. The colors should be rich, the lighting should be dynamic, and the overall feel should be epic and adventurous.

**Technical Specifications:**
- Perfectly preserve the original layout, object placement, paths, and overall composition of the map.
- The output must be a high-quality, single PNG image intended for use as a parallax background in RPG Maker.
- Do NOT add any UI elements, grid lines, characters, or text.
- If the user provides additional style notes, incorporate them. User notes: "${stylePrompt}"
`;
    return generateAssetFromImage(base64ImageDataUrl, masterPrompt);
};

// --- Combat Effect Generation ---

export const generateCombatEffect = async (userPrompt: string): Promise<string> => {
  const masterPrompt = `
You are an AI specialized in creating pixel art assets for the RPG Maker MZ game engine.
Your task is to generate a combat animation sprite sheet based on the user's request.

User's request: "${userPrompt}".

**CRITICAL INSTRUCTIONS - YOU MUST FOLLOW THESE:**
1.  **NO TEXT:** The final image must contain absolutely no text, letters, numbers, watermarks, or any other characters. It must be a pure graphical asset.
2.  **FORMAT:** The output MUST be a single PNG image with a completely transparent background.
3.  **LAYOUT:** The sprite sheet must contain exactly 5 animation frames. These frames must be arranged horizontally in a single row.
4.  **DIMENSIONS:** Each individual frame must be exactly 192 pixels wide by 192 pixels high.
5.  **TOTAL SIZE:** The final image dimensions must be exactly 960 pixels wide by 192 pixels high (5 frames × 192px width).
6.  **STYLE:** The art style must be dynamic, high-impact, colorful pixel art suitable for a Japanese RPG (JRPG).

The animation should depict the user's requested effect, progressing logically from the first frame on the left to the last frame on the right.
  `;

  try {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: masterPrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
        },
    });

    if (response.generatedImages?.[0]?.image?.imageBytes) {
      const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
      return `data:image/png;base64,${base64ImageBytes}`;
    } else {
      throw new Error("API 未返回任何图像数据。这可能是由于安全策略或提示过于模糊。请尝试修改您的提示。");
    }
  } catch (error) {
    handleApiError(error);
  }
};

// --- Treasure Chest Generation ---

export const generateTreasureChest = async (userPrompt: string): Promise<string> => {
  const masterPrompt = `
Generate a pixel art sprite sheet for a treasure chest for a top-down JRPG like RPG Maker.
The chest's appearance is: "${userPrompt}".

**CRITICAL STYLE REQUIREMENT:** The style must be high-quality 16-bit pixel art, matching the aesthetic of classic JRPGs.

**Technical Specifications:**
- The output MUST be a single PNG image with a transparent background.
- The sprite sheet must contain a sequence of 3 animation frames arranged horizontally in a single row.
- The animation sequence should be: 1. Chest Closed, 2. Chest Opening, 3. Chest Fully Open.
- Each frame should be visually distinct to show the opening process.
- Each frame must be 48 pixels wide by 48 pixels high.
- The total image dimensions must be exactly 144 pixels wide by 48 pixels high.
- Do not include any text, numbers, watermarks, or grid lines on the image.
  `;

  try {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: masterPrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
        },
    });

    if (response.generatedImages?.[0]?.image?.imageBytes) {
      const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
      return `data:image/png;base64,${base64ImageBytes}`;
    } else {
      throw new Error("API 未返回任何图像数据。这可能是由于安全策略或提示过于模糊。请尝试修改您的提示。");
    }
  } catch (error) {
    handleApiError(error);
  }
};

// --- Item/Icon Generation ---

export const generateItemSprite = async (userPrompt: string): Promise<string> => {
  const masterPrompt = `
Generate a single, high-quality pixel art icon for a JRPG item, suitable for RPG Maker MZ.
The item is: "${userPrompt}".

**CRITICAL STYLE REQUIREMENT:** The style must be vibrant, detailed 16-bit pixel art. The icon should be clear and easily recognizable.

**Technical Specifications:**
- The output MUST be a single PNG image with a transparent background.
- The final image dimensions must be exactly 48 pixels wide by 48 pixels high.
- The item should be centered and fill the 48x48 frame appropriately.
- Do not include any text, numbers, watermarks, or borders on the image itself.
  `;

  try {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: masterPrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
          aspectRatio: '1:1',
        },
    });

    if (response.generatedImages?.[0]?.image?.imageBytes) {
      const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
      return `data:image/png;base64,${base64ImageBytes}`;
    } else {
      throw new Error("API 未返回任何图像数据。这可能是由于安全策略或提示过于模糊。请尝试修改您的提示。");
    }
  } catch (error) {
    handleApiError(error);
  }
};

// --- Equipment/Icon Generation ---

export const generateEquipmentSprite = async (userPrompt: string): Promise<string> => {
  const masterPrompt = `
Generate a single, high-quality pixel art icon for a JRPG equipment piece (weapon, armor, accessory), suitable for RPG Maker MZ.
The equipment is: "${userPrompt}".

**CRITICAL STYLE REQUIREMENT:** The style must be vibrant, detailed 16-bit pixel art. The icon should be clear and easily recognizable.

**Technical Specifications:**
- The output MUST be a single PNG image with a transparent background.
- The final image dimensions must be exactly 48 pixels wide by 48 pixels high.
- The equipment should be centered and fill the 48x48 frame appropriately.
- Do not include any text, numbers, watermarks, or borders on the image itself.
  `;

  try {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: masterPrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
          aspectRatio: '1:1',
        },
    });

    if (response.generatedImages?.[0]?.image?.imageBytes) {
      const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
      return `data:image/png;base64,${base64ImageBytes}`;
    } else {
      throw new Error("API 未返回任何图像数据。这可能是由于安全策略或提示过于模糊。请尝试修改您的提示。");
    }
  } catch (error) {
    handleApiError(error);
  }
};


// --- Monster Generation ---

export const generateMonsterBattler = async (userPrompt: string): Promise<string> => {
    const masterPrompt = `
Generate a single, static side-view monster battler sprite for an RPG Maker style game.
The monster is: "${userPrompt}".

**CRITICAL STYLE REQUIREMENT:** The style must be high-quality pixel art that would fit a classic JRPG. The monster should look menacing or interesting.

**Technical Specifications:**
- The monster should be in a dynamic, ready-for-battle pose, facing left.
- The output should be a single PNG image with a transparent background.
- Ensure the sprite is large and detailed enough to be a prominent enemy on the battle screen.
- Do not include any text, UI, watermarks, or background elements.
`;
  try {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: masterPrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
        },
    });

    if (response.generatedImages?.[0]?.image?.imageBytes) {
      const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
      return `data:image/png;base64,${base64ImageBytes}`;
    } else {
      throw new Error("API 未返回任何图像数据。这可能是由于安全策略或提示过于模糊。请尝试修改您的提示。");
    }
  } catch (error) {
    handleApiError(error);
  }
};


// --- Pet/Mount Generation ---

export const generatePetSprite = async (userPrompt: string): Promise<string> => {
  const masterPrompt = `
Generate a complete RPG Maker MZ walking animation sprite sheet for a small pet, companion, or mount.
The creature is: "${userPrompt}".

**CRITICAL STYLE REQUIREMENT:** The style must be high-quality 16-bit pixel art, matching the aesthetic of classic JRPGs.

**Technical Specifications:**
- The sprite sheet must be a single PNG image with a transparent background.
- The grid must be exactly 3 columns by 4 rows.
- Each frame must be 48x48 pixels, making the total image size 144x192 pixels.
- Row 1: Creature walking down.
- Row 2: Creature walking left.
- Row 3: Creature walking right.
- Row 4: Creature walking up.
- Do not include any text, numbers, watermarks, or grid lines on the image.
  `;

  try {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: masterPrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
        },
    });

    if (response.generatedImages?.[0]?.image?.imageBytes) {
      const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
      return `data:image/png;base64,${base64ImageBytes}`;
    } else {
      throw new Error("API 未返回任何图像数据。这可能是由于安全策略或提示过于模糊。请尝试修改您的提示。");
    }
  } catch (error) {
    handleApiError(error);
  }
};

// --- Game Concept Art Generation ---

export const generateGameConceptArt = async (userPrompt: string): Promise<string> => {
  const masterPrompt = `
Generate a high-quality, vibrant, and dynamic game concept art illustration based on the user's scene description.
The scene is: "${userPrompt}".

**CRITICAL STYLE REQUIREMENT:**
The art style must be a beautiful, high-detail digital painting aesthetic, similar to promotional art for modern JRPGs (like Final Fantasy or Genshin Impact). The lighting should be dramatic and the composition should be cinematic.

**Technical Specifications:**
- The output MUST be a single, high-resolution PNG image.
- The aspect ratio should be 16:9 (widescreen).
- Do not include any text, user interface elements, watermarks, or borders on the image.
  `;

  try {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: masterPrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
          aspectRatio: '16:9',
        },
    });

    if (response.generatedImages?.[0]?.image?.imageBytes) {
      const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
      return `data:image/png;base64,${base64ImageBytes}`;
    } else {
      throw new Error("API 未返回任何图像数据。这可能是由于安全策略或提示过于模糊。请尝试修改您的提示。");
    }
  } catch (error) {
    handleApiError(error);
  }
};

export const generateConceptArtFromAssets = async (assets: AssetRecord[], userPrompt: string): Promise<string> => {
    const masterPrompt = `
You are an expert game illustrator. Create a single, high-quality, vibrant, and dynamic game concept art illustration based on the user's scene description and the provided reference images.
The final image should be a cohesive scene that incorporates the characters, creatures, or items from the reference images.

User's scene description: "${userPrompt}".

**CRITICAL STYLE REQUIREMENT:**
The art style must be a beautiful, high-detail digital painting aesthetic, similar to promotional art for modern JRPGs (like Final Fantasy or Genshin Impact). The lighting should be dramatic and the composition should be cinematic.

**Technical Specifications:**
- The output MUST be a single, high-resolution PNG image.
- The aspect ratio should be 16:9 (widescreen).
- Do not include any text, user interface elements, watermarks, or borders on the image.
- Use the provided images as direct visual references for the subjects in your illustration.
`;

    const parts: any[] = [{ text: masterPrompt }];
    for (const asset of assets) {
        const pureBase64 = asset.imageDataUrl.split(',')[1];
        if (pureBase64) {
            parts.push({ inlineData: { data: pureBase64, mimeType: 'image/png' } });
        }
    }

    if (parts.length <= 1) {
        throw new Error("没有提供有效的资源图片。");
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        const candidate = response.candidates?.[0];
        const imagePart = candidate?.content?.parts.find(part => part.inlineData);
        if (imagePart?.inlineData?.data) {
            return `data:image/png;base64,${imagePart.inlineData.data}`;
        } else {
            if (candidate?.finishReason === 'SAFETY') {
                const safetyMessage = candidate.safetyRatings
                    ?.filter(r => r.probability !== 'NEGLIGIBLE' && r.probability !== 'LOW')
                    .map(r => `类别 ${r.category} 被标记为 ${r.probability}`)
                    .join(', ');
                throw new Error(`请求因安全原因被拒绝。${safetyMessage ? `详情: ${safetyMessage}` : '请尝试调整提示或图片。'}`);
            }
            const textPart = candidate?.content?.parts.find(part => part.text);
            const refusalMessage = textPart?.text || "API 未返回有效图片，请求可能已被拒绝。请尝试修改你的提示或图片。";
            throw new Error(refusalMessage);
        }
    } catch (error) {
        handleApiError(error);
    }
};

// --- Game Audio Generation ---

export const generateAudioDescription = async (userPrompt: string, type: 'sfx' | 'music'): Promise<string> => {
  const sfxPrompt = `
You are a professional sound designer for video games. Your task is to generate a detailed description of a sound effect based on the user's request. This description will be used by an actual sound designer to create the sound.

User's request: "${userPrompt}"

**CRITICAL INSTRUCTIONS:**
1.  **Be Vivid and Descriptive:** Use evocative language. Describe the sound's texture, layers, timing, and emotional impact.
2.  **Break it Down:** Describe the sound in terms of its core components (e.g., Attack, Sustain, Decay).
3.  **Provide Context:** Suggest how the sound might change based on distance or environment.
4.  **No Audio Files:** Your output MUST be text only.

Generate the sound effect description now.
  `;
  
  const musicPrompt = `
You are a professional music composer for video games. Your task is to write a detailed creative brief for a short musical piece or loop based on the user's request. This brief will be used by a composer to write the music.

User's request: "${userPrompt}"

**CRITICAL INSTRUCTIONS:**
1.  **Describe the Mood:** What is the core emotion of the piece (e.g., heroic, mysterious, peaceful, tense)?
2.  **Suggest Instrumentation:** What instruments would be appropriate (e.g., orchestral strings, chiptune synths, folk guitar, epic drums)?
3.  **Describe Melody & Harmony:** Is the melody simple and memorable or complex and evolving? Is the harmony major (happy) or minor (sad)?
4.  **Describe Rhythm:** Is the tempo fast or slow? What is the rhythmic feel (e.g., driving, ambient, marching)?
5.  **Reference Similar Styles:** You can mention styles from other games or genres to provide a clear reference point.
6.  **No Audio or Sheet Music:** Your output MUST be text only.

Generate the music brief now.
  `;

  const masterPrompt = type === 'sfx' ? sfxPrompt : musicPrompt;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: masterPrompt,
    });
    return response.text;
  } catch (error) {
    handleApiError(error);
  }
};

// --- Character Skill Design ---

const skillDesignSchema = {
  type: Type.OBJECT,
  properties: {
    skillName: { type: Type.STRING, description: '一个很酷的、有主题的技能名称。' },
    description: { type: Type.STRING, description: '技能在游戏中向玩家展示的描述。' },
    mpCost: { type: Type.INTEGER, description: '使用该技能所需的 MP (魔法值) 数量。' },
    damageType: { type: Type.STRING, description: '伤害类型 (例如，火焰、冰霜、物理、神圣、黑暗)。' },
    target: { type: Type.STRING, description: '技能影响的对象 (例如，单个敌人、所有敌人、盟友、自己)。' },
    effects: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '该技能施加的特殊效果或状态异常列表 (例如，“使目标中毒”、“降低敌人防御”、“治疗 100 点生命值”)。'
    },
  },
  required: ['skillName', 'description', 'mpCost', 'damageType', 'target', 'effects'],
};

export const generateSkillDesign = async (userPrompt: string): Promise<string> => {
  const masterPrompt = `
你是一位专业的 JRPG 游戏设计师。根据用户的概念设计一个角色技能。
输出必须是符合所提供 schema 的 JSON 对象。

用户的技能概念: "${userPrompt}"

立即生成技能设计。
  `;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: masterPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: skillDesignSchema,
      },
    });
    return response.text;
  } catch (error) {
    handleApiError(error);
  }
};

// --- Stats Design ---

const statsDesignSchema = {
  type: Type.OBJECT,
  properties: {
    hp: { type: Type.INTEGER, description: '最大生命值 (Health)。一个典型的 1 级英雄大约有 500 点。' },
    mp: { type: Type.INTEGER, description: '最大魔法值 (Mana)。一个典型的 1 级法师大约有 100 点。' },
    atk: { type: Type.INTEGER, description: '攻击力 (物理)。一个典型的 1 级战士大约有 15 点。' },
    def: { type: Type.INTEGER, description: '防御力 (物理)。一个典型的 1 级坦克大约有 20 点。' },
    mat: { type: Type.INTEGER, description: '魔法攻击力。一个典型的 1 级法师大约有 20 点。' },
    mdf: { type: Type.INTEGER, description: '魔法防御力。一个典型的 1 级牧师大约有 15 点。' },
    agi: { type: Type.INTEGER, description: '敏捷 (速度/闪避)。一个典型的 1 级盗贼大约有 20 点。' },
    luk: { type: Type.INTEGER, description: '运气。影响各种事物。一个典型的 1 级角色大约有 10 点。' },
    rationale: { type: Type.STRING, description: '简要解释为什么根据用户提示选择这些属性值。' }
  },
  required: ['hp', 'mp', 'atk', 'def', 'mat', 'mdf', 'agi', 'luk', 'rationale'],
};

export const generateStatsDesign = async (userPrompt: string): Promise<string> => {
    const masterPrompt = `
你是一位为 RPG Maker MZ 游戏平衡属性的专业游戏设计师。
根据用户的描述为 1 级角色或怪物设计一套基础属性。
输出必须是符合所提供 schema 的 JSON 对象。
使用典型的 RPG Maker 值为 1 级实体设定基线。

用户描述: "${userPrompt}"

立即生成属性。
  `;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: masterPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: statsDesignSchema,
      },
    });
    return response.text;
  } catch (error) {
    handleApiError(error);
  }
};


// --- Game Assembler ---

const gamePlanSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: 'A cool and catchy title for the game.' },
    story: {
      type: Type.OBJECT,
      properties: {
        tagline: { type: Type.STRING, description: 'A short, exciting tagline for the game.' },
        summary: { type: Type.STRING, description: 'A one-paragraph summary of the main plot, introducing the hero, villain, and core conflict.' },
      },
      required: ['tagline', 'summary'],
    },
    actors: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: 'A unique identifier for this actor, e.g., "hero_01".' },
          name: { type: Type.STRING, description: 'The character\'s name.' },
          description: { type: Type.STRING, description: 'A brief, 1-2 sentence backstory or personality description.' },
        },
        required: ['id', 'name', 'description'],
      },
    },
    enemies: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: 'A unique identifier for this enemy, e.g., "villain_01".' },
          name: { type: Type.STRING, description: 'The enemy\'s name.' },
          description: { type: Type.STRING, description: 'A brief, 1-2 sentence description of the enemy and its motivations.' },
        },
        required: ['id', 'name', 'description'],
      },
    },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: 'A unique identifier, e.g., "key_item_01".' },
          name: { type: Type.STRING, description: 'The item\'s name.' },
          description: { type: Type.STRING, description: 'What this item is and its purpose in the story.' },
        },
        required: ['id', 'name', 'description'],
      },
    },
    maps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: 'A unique identifier, e.g., "map_01_village".' },
          name: { type: Type.STRING, description: 'The name of the map, e.g., "Whisperwind Village".' },
          description: { type: Type.STRING, description: 'A brief description of the map\'s atmosphere and key features.' },
        },
        required: ['id', 'name', 'description'],
      },
    },
    quests: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: 'A unique identifier, e.g., "quest_01_main".' },
          title: { type: Type.STRING, description: 'The title of the quest, e.g., "The Serpent\'s Shadow".' },
          objective: { type: Type.STRING, description: 'A clear, one-sentence objective for the player, e.g., "Find the entrance to the Serpent\'s Lair.".' },
          steps: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: 'A list of 2-3 simple steps to complete the quest.'
          },
        },
        required: ['id', 'title', 'objective', 'steps'],
      },
    },
  },
  required: ['title', 'story', 'actors', 'enemies', 'items', 'maps', 'quests'],
};


export const generateGamePlan = async (userConcept: string, assets: { [key: string]: string }): Promise<object> => {
    let assetDescriptions = '';
    for (const key in assets) {
        assetDescriptions += `- ${key}: A character described as "${assets[key]}"\n`;
    }

    const masterPrompt = `
You are an expert RPG game designer for the RPG Maker MZ engine.
Your task is to generate a concise game design document in JSON format based on a user's concept and selected assets.

**User's Game Concept:**
"${userConcept}"

**Assets Provided by User:**
${assetDescriptions}

**CRITICAL INSTRUCTIONS:**
1.  **JSON Output ONLY:** Your entire response MUST be a single, valid JSON object that adheres to the provided schema. Do not include any explanatory text before or after the JSON.
2.  **Use Provided Assets:** All descriptions and names for the actors, enemies, and items MUST be directly inspired by the user's provided asset descriptions.
3.  **Creative & Coherent:** Create a simple but engaging story and a single starting quest that connects all the provided elements.
4.  **RPG Maker Concepts:** The design should use concepts familiar to RPG Maker users. Generate at least 2 map ideas (e.g., a starting town and a dungeon).
5.  **Be Concise:** Keep all descriptions brief and to the point. This is a starting blueprint.

Generate the JSON document now.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: masterPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: gamePlanSchema,
      },
    });
    
    // The response text is already a stringified JSON due to the config.
    // Let's parse it to ensure it's a valid object before returning.
    return JSON.parse(response.text);

  } catch (error) {
    handleApiError(error);
  }
};


export const adjustGamePlan = async (currentPlan: object, adjustmentPrompt: string): Promise<object> => {
  const masterPrompt = `
You are an expert RPG game designer for the RPG Maker MZ engine.
Your task is to update a game design document (in JSON format) based on a user's modification request.

**Current Game Plan (JSON):**
${JSON.stringify(currentPlan, null, 2)}

**User's Change Request:**
"${adjustmentPrompt}"

**CRITICAL INSTRUCTIONS:**
1.  **JSON Output ONLY:** Your entire response MUST be a single, valid JSON object representing the *entire updated game plan*. Do not just output the changed part. Your output must adhere to the original JSON's schema.
2.  **Apply the Change:** Intelligently incorporate the user's change request into the game plan. If they want to change a name, change it. If they want to add an NPC, add a new entry in the 'actors' section. If they want to change the story, update the story summary.
3.  **Maintain Cohesion:** Ensure the rest of the game plan remains consistent with the change. For example, if the hero's name changes, update it in the story description as well.
4.  **Do Not Explain:** Do not include any text, code block formatting, or explanations before or after the JSON object. Just return the raw JSON.

Generate the updated JSON document now.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: masterPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: gamePlanSchema,
      },
    });
    
    return JSON.parse(response.text);

  } catch (error) {
    handleApiError(error);
  }
};


// --- IndexedDB Service for Asset History ---

const DB_NAME = 'RPGAssetFactoryDB';
const DB_VERSION = 1;
const STORE_NAME = 'generated_assets';

let db: IDBDatabase;

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Database error:', request.error);
      reject('打开数据库时出错');
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        objectStore.createIndex('type_timestamp', ['type', 'timestamp'], { unique: false });
        objectStore.createIndex('type', 'type', { unique: false });
      }
    };
  });
};

export interface AssetRecord {
  id?: number;
  type: string;
  prompt: string;
  imageDataUrl: string; // For text-based assets, this stores the text/JSON string
  timestamp: number;
}

export const addAsset = async (asset: Omit<AssetRecord, 'id' | 'timestamp'>): Promise<number> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const record: AssetRecord = {
      ...asset,
      timestamp: Date.now()
    };
    const request = store.add(record);

    request.onsuccess = () => {
      resolve(request.result as number);
    };
    request.onerror = () => {
      console.error('Error adding asset:', request.error);
      reject('添加资源时出错');
    };
  });
};

export const getAssetsByType = async (type: string): Promise<AssetRecord[]> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('type');
        const request = index.getAll(type);

        request.onsuccess = () => {
            // Sort by timestamp descending to show newest first
            resolve(request.result.sort((a, b) => b.timestamp - a.timestamp));
        };
        request.onerror = () => {
            console.error('Error getting assets by type:', request.error);
            reject('获取资源时出错');
        };
    });
};

export const getAllAssets = async (): Promise<AssetRecord[]> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
            // Sort by timestamp descending to have a predictable order (newest first)
            resolve(request.result.sort((a, b) => b.timestamp - a.timestamp));
        };
        request.onerror = () => {
            console.error('Error getting all assets:', request.error);
            reject('获取所有资源时出错');
        };
    });
};

export const deleteAsset = async (id: number): Promise<void> => {
  if (!id) return;
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };
    request.onerror = () => {
      console.error('Error deleting asset:', request.error);
      reject('删除资源时出错');
    };
  });
};
