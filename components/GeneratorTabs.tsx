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

// 使用更具 JRPG 风格的图标
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


type Tab = 'character' | 'map' | 'combat' | 'chest' | 'monster' | 'item' | 'equipment' | 'pet' | 'game-concept-art' | 'audio' | 'skill' | 'stats' | 'game';

export interface GeneratorProps {
  apiLock: {
    isApiLocked: boolean;
    lockApi: () => void;
    unlockApi: () => void;
  };
  onFlashOfInspiration?: () => void;
}

interface TabConfig {
    id: Tab;
    label: string;
    icon: React.ReactNode;
    component: React.ComponentType<GeneratorProps>;
}

const TABS: TabConfig[] = [
    { id: 'character', label: '角色生成', icon: <CharacterIcon />, component: CharacterGenerator },
    { id: 'monster', label: '怪物生成', icon: <MonsterIcon />, component: MonsterGenerator },
    { id: 'pet', label: '宠物/坐骑', icon: <PetIcon />, component: PetGenerator },
    { id: 'map', label: '地图/图块', icon: <MapIcon />, component: MapGenerator },
    { id: 'combat', label: '战斗特效', icon: <EffectIcon />, component: CombatEffectGenerator },
    { id: 'chest', label: '宝箱', icon: <ChestIcon />, component: TreasureChestGenerator },
    { id: 'equipment', label: '装备图标', icon: <EquipmentIcon />, component: EquipmentGenerator },
    { id: 'item', label: '物品图标', icon: <ItemIcon />, component: ItemGenerator },
    { id: 'game-concept-art', label: '游戏原画', icon: <ConceptArtIcon />, component: GameCGGenerator },
    { id: 'audio', label: '游戏音频', icon: <AudioIcon />, component: GameAudioGenerator },
    { id: 'skill', label: '角色技能', icon: <SkillIcon />, component: CharacterSkillGenerator },
    { id: 'stats', label: '数值设计', icon: <StatsIcon />, component: StatsDesigner },
    { id: 'game', label: '游戏策划', icon: <GameIcon />, component: GameAssembler },
];

interface GeneratorTabsProps {
  onFlashOfInspiration: () => void;
}

const GeneratorTabs: React.FC<GeneratorTabsProps> = ({ onFlashOfInspiration }) => {
  const [activeTab, setActiveTab] = useState<Tab>('character');
  const [isApiLocked, setIsApiLocked] = useState(false);

  const lockApi = () => setIsApiLocked(true);
  const unlockApi = () => setIsApiLocked(false);
  const apiLock = { isApiLocked, lockApi, unlockApi };

  const getTabClass = (tabName: Tab) => {
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
        {TABS.map(tab => (
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
            <span className="whitespace-nowrap">{tab.label}</span>
           </div>
        ))}
      </nav>

      <div className="flex-grow min-w-0">
        {TABS.map(tab => {
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
