**English** | [简体中文](README.md)

# AI RPG Asset Factory
Demo: https://rpg.oospace.com/
<img width="3810" height="1890" alt="image" src="https://github.com/user-attachments/assets/83340456-bbf9-4a95-92bf-58eef3361d16" />


[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Foospace%2Fgemini-rpg-maker-factory&env=API_KEY&envDescription=Enter%20your%20Google%20Gemini%20API%20key.&envLink=https://aistudio.google.com/app/apikey) [![Deploy to Google Cloud](https://deploy.cloud.run/button.svg)](https://deploy.cloud.run?git_repo=https%3A%2F%2Fgithub.com%2Foospace%2Fgemini-rpg-maker-factory)

Welcome to the **AI RPG Asset Factory**! This is a powerful AI assistant designed for indie game developers, especially RPG Maker users. Whether you need inspiration, want to quickly generate prototype assets, or add unique visual effects to your project, this tool can help.

Simply describe your ideas in plain text, and the powerful Gemini AI model will generate a wide range of assets for you—from pixel art characters and monster battlers to complete game design documents—significantly speeding up your game development process.

## Features Overview

This toolbox provides a complete set of asset generators, covering various aspects of game development:

#### Characters & Creatures

*   **Character Generator:** Describe a character, and the AI will generate a base sprite. With one click, you can create accompanying walking sprites, battlers, and facesets. It also supports uploading existing images for style optimization and adjustments.
*   **Monster Generator:** Design unique enemies and generate pixel-art side-view battlers.
*   **Pet/Mount Generator:** Create loyal companions or majestic mounts for your heroes, generating complete walking sprite sheets.

#### World & Environment

*   **Map/Tileset Generator:** Describe a scene theme (e.g., "enchanted forest," "desert ruins") to generate a matching pixel art tileset. You can also upload your own map screenshots and have the AI restyle it in a specific art style.
*   **Treasure Chest Generator:** Design various styles of treasure chests and generate a 3-frame animation sequence (closed, opening, open).
*   **Game Concept Art (CG):** Turn your imagination into stunning game promotional art or key story illustrations. Supports generation from text descriptions, composing scenes from existing assets (characters, monsters, etc.), or restyling uploaded images.

#### Items & Effects

*   **Equipment Icon Generator:** Design various weapons, armor, and accessories, generating beautiful 48x48 pixel icons.
*   **Item Icon Generator:** Quickly create icons for potions, keys, materials, and other consumables or key items.
*   **Combat Effect Generator:** Describe a spell or skill effect (e.g., "giant fireball," "holy light heal") to generate a 5-frame combat animation sprite sheet compatible with RPG Maker.

#### Game Design & Planning

*   **Skill Designer:** Propose a skill concept (e.g., "a blizzard that freezes all enemies"), and the AI will design its complete attributes, including name, description, cost, effects, etc., presented in a structured format.
*   **Stats Designer:** Describe a character or monster's role (e.g., "a fast, low-defense glass cannon assassin"), and the AI will generate a set of base stats (HP, MP, ATK, etc.) in the RPG Maker style, complete with a design rationale.
*   **Game Assembler:** Combine your generated characters, monsters, and items with a core story concept, and the AI will create a complete mini-game design document, including a plot summary, character profiles, quest flows, and more.
*   **Game Audio Designer:** Need sound effects or background music? Describe your requirements, and the AI will generate professional sound design specifications or music composition briefs to give your audio designer clear creative direction.

## Key Features

*   **💡 Flash of Inspiration:** Don't know where to start? If you have at least one character, one monster, and one item in your asset history, just click "Flash of Inspiration"! The AI will automatically weave them together to generate a complete mini-game concept.
*   **📦 One-Click Project Export:** After generating a plan in the "Game Assembler," you can download a `.zip` package containing all core assets and basic data files. You can import this directly into RPG Maker MZ as a starting point for your project.
*   **🎨 Powerful Image Editing:** All image generators support an "Adjust" feature. Not satisfied with the result? Simply type in a modification command (e.g., "change the armor to gold"), and the AI will revise the image based on your input.
*   **💾 Local History:** All your generated assets are automatically saved in your browser's local database (IndexedDB), allowing you to easily review, load, and manage your creations at any time.

## How to Use

1.  **Set Your API Key (Required):**
    This application retrieves the Gemini API key from an environment variable named `API_KEY`. **There is no in-app interface for setting the key.** You must configure this environment variable when deploying the application.

    *   **Vercel Deployment:** Click the "Deploy with Vercel" button above. You will be prompted to enter the value for `API_KEY` during the deployment process.
    *   **Google Cloud Deployment:** Click the "Deploy to Google Cloud" button above. After deployment, you need to go to your Cloud Run service, edit the newly deployed revision, and add an environment variable named `API_KEY` with your Gemini API key in the "Variables & Secrets" section.

    You can get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey). **IMPORTANT:** The core image generation features of this application require an API key associated with a Google Cloud project that has **billing enabled**. Using a free-tier key from AI Studio alone **will not** be sufficient to generate images.

2.  Select the type of asset you want to generate from the left-hand menu.
3.  Describe your idea in detail in the text box. You can refer to the examples provided for inspiration.
4.  Click the "Generate" button and wait for the AI to complete its creation.
5.  Preview the result. If you're not completely satisfied, use the "Adjust" feature below the result to make changes.
6.  All generated results are automatically saved in the "History" panel on the right. Click any item to load it.
7.  Right-click the image or use the "Download" button to save your asset.

## Tech Stack

*   **Frontend Framework:** React
*   **Styling:** Tailwind CSS
*   **Core AI:** Google Gemini API
*   **Local Storage:** IndexedDB

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---
*Powered by the Google Gemini API.*
