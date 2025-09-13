
import React, { useState } from 'react';
import CharacterGenerator from './CharacterGenerator';
import MapGenerator from './MapGenerator';
import CombatEffectGenerator from './CombatEffectGenerator';
import TreasureChestGenerator from './TreasureChestGenerator';
import MonsterGenerator from './MonsterGenerator';
import ItemGenerator from './ItemGenerator';
import EquipmentGenerator from './EquipmentGenerator';
import PetGenerator from './PetGenerator';
import GameAssembler from './GameAssembler';
import GameCGGenerator from './GameCGGenerator';
import GameAudioGenerator from './GameAudioGenerator';
import CharacterSkillGenerator from './CharacterSkillGenerator';
import StatsDesigner from './StatsDesigner';
import { useTranslation } from '../services/i18n';

// JRPG-style icons
const CharacterIcon = () => <span className="w-6 h-6 mr-3 text-lg">👤</span>;
const MapIcon = () => <span className="w-6 h-6 mr-3 text-lg">🗺️</span>;
const EffectIcon = () => <span className="w-6 h-6 mr-3 text-lg">✨</span>;
const ChestIcon = () => <span className="w-6 h-6 mr-3 text-lg">📦</span>;
const MonsterIcon = () => <span className="w-6 h-6 mr-3 text-lg">👹</span>;
const ItemIcon = () => <span className="w-6 h-6 mr-3 text-lg">💎</span>;
const EquipmentIcon = () => <span className="w-6 h-6 mr-3 text-lg">⚔️</span>;
const PetIcon = () => <span className="w-6 h-6 mr-3 text-lg">🐾</span>;
const GameIcon = () => <span className="w-6 h-6 mr-3 text-lg">📜</span>;
const ConceptArtIcon = () => <span className="w-6 h-6 mr-3 text-lg">🎨</span>;
const AudioIcon = () => <span className="w-6 h-6 mr-3 text-lg">🎵</span>;
const SkillIcon = () => <span className="w-6 h-6 mr-3 text-lg">🔮</span>;
const StatsIcon = () => <span className="w-6 h-6 mr-3 text-lg">📊</span>;


type TabId = 'character' | 'map' | 'combat' | 'chest' | 'monster' | 'item' | 'equipment' | 'pet' | 'game-concept-art' | 'audio' | 'skill' | 'stats' | 'game';

export interface GeneratorProps {
  apiLock: {
    isApiLocked: boolean;
    lockApi: () => void;
    unlockApi: () => void;
  };
  onFlashOfInspiration?: () => void;
}

interface TabConfig {
    id: TabId;
    labelKey: any; // keyof Translations
    icon: React.ReactNode;
    component: React.ComponentType<GeneratorProps>;
}

const TABS_CONFIG: TabConfig[] = [
    { id: 'character', labelKey: 'tab_character', icon: <CharacterIcon />, component: CharacterGenerator },
    { id: 'monster', labelKey: 'tab_monster', icon: <MonsterIcon />, component: MonsterGenerator },
    { id: 'pet', labelKey: 'tab_pet', icon: <PetIcon />, component: PetGenerator },
    { id: 'map', labelKey: 'tab_map', icon: <MapIcon />, component: MapGenerator },
    { id: 'combat', labelKey: 'tab_combat', icon: <EffectIcon />, component: CombatEffectGenerator },
    { id: 'chest', labelKey: 'tab_chest', icon: <ChestIcon />, component: TreasureChestGenerator },
    { id: 'equipment', labelKey: 'tab_equipment', icon: <EquipmentIcon />, component: EquipmentGenerator },
    { id: 'item', labelKey: 'tab_item', icon: <ItemIcon />, component: ItemGenerator },
    { id: 'game-concept-art', labelKey: 'tab_cg', icon: <ConceptArtIcon />, component: GameCGGenerator },
    { id: 'audio', labelKey: 'tab_audio', icon: <AudioIcon />, component: GameAudioGenerator },
    { id: 'skill', labelKey: 'tab_skill', icon: <SkillIcon />, component: CharacterSkillGenerator },
    { id: 'stats', labelKey: 'tab_stats', icon: <StatsIcon />, component: StatsDesigner },
    { id: 'game', labelKey: 'tab_game', icon: <GameIcon />, component: GameAssembler },
];

interface GeneratorTabsProps {
  onFlashOfInspiration: () => void;
}

const GeneratorTabs: React.FC<GeneratorTabsProps> = ({ onFlashOfInspiration }) => {
  const [activeTab, setActiveTab] = useState<TabId>('character');
  const [isApiLocked, setIsApiLocked] = useState(false);
  const { t } = useTranslation();

  const lockApi = () => setIsApiLocked(true);
  const unlockApi = () => setIsApiLocked(false);
  const apiLock = { isApiLocked, lockApi, unlockApi };

  const getTabClass = (tabName: TabId) => {
    return `
      flex items-center w-full text-left p-4
      font-press-start text-sm md:text-base 
      cursor-pointer transition-all duration-200 ease-in-out
      border-l-4
      ${activeTab === tabName 
        ? 'bg-gray-700 text-yellow-400 border-yellow-400' 
        : 'text-gray-400 border-transparent hover:bg-gray-700 hover:text-yellow-300'
      }
    `;
  };

  return (
    <div className="flex flex-col md:flex-row md:gap-8">
      
      <nav className="
        flex flex-row overflow-x-auto md:overflow-x-visible md:flex-col 
        md:w-64 flex-shrink-0 
        bg-gray-800 rounded-lg border-2 border-gray-700
        scrollbar-hide mb-8 md:mb-0
      ">
        {TABS_CONFIG.map(tab => (
           <div 
             key={tab.id}
             onClick={() => setActiveTab(tab.id)}
             className={getTabClass(tab.id)}
             role="tab"
             aria-selected={activeTab === tab.id}
             aria-controls={`${tab.id}-panel`}
             tabIndex={0}
           >
            {tab.icon}
            <span className="whitespace-nowrap">{t(tab.labelKey)}</span>
           </div>
        ))}
      </nav>

      <div className="flex-grow min-w-0">
        {TABS_CONFIG.map(tab => {
            const Component = tab.component;
            return (
             <div 
                key={tab.id}
                id={`${tab.id}-panel`} 
                role="tabpanel" 
                hidden={activeTab !== tab.id}
                className="w-full"
            >
              <Component 
                apiLock={apiLock} 
                {...(tab.id === 'game' && { onFlashOfInspiration })}
              />
             </div>
            );
        })}
      </div>
    </div>
  );
};

export default GeneratorTabs;
