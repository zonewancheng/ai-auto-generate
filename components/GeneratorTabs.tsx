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

// Adding icons for a better visual experience
const CharacterIcon = () => <span className="w-6 h-6 mr-3 text-lg">👤</span>;
const MapIcon = () => <span className="w-6 h-6 mr-3 text-lg">🗺️</span>;
const EffectIcon = () => <span className="w-6 h-6 mr-3 text-lg">✨</span>;
const ChestIcon = () => <span className="w-6 h-6 mr-3 text-lg">🎁</span>;
const MonsterIcon = () => <span className="w-6 h-6 mr-3 text-lg">🐲</span>;
const ItemIcon = () => <span className="w-6 h-6 mr-3 text-lg">💎</span>;
const EquipmentIcon = () => <span className="w-6 h-6 mr-3 text-lg">⚔️</span>;
const PetIcon = () => <span className="w-6 h-6 mr-3 text-lg">🐾</span>;
const GameIcon = () => <span className="w-6 h-6 mr-3 text-lg">🎮</span>;


type Tab = 'character' | 'map' | 'combat' | 'chest' | 'monster' | 'item' | 'equipment' | 'pet' | 'game';

export interface GeneratorProps {
  apiLock: {
    isApiLocked: boolean;
    lockApi: () => void;
    unlockApi: () => void;
  };
}

// Fix: Changed `component` from `React.ReactNode` to `React.ComponentType<GeneratorProps>`
// to correctly type the component and allow passing props without TypeScript errors.
interface TabConfig {
    id: Tab;
    label: string;
    icon: React.ReactNode;
    component: React.ComponentType<GeneratorProps>;
}

// Fix: Stored component types (e.g., `CharacterGenerator`) instead of instances (e.g., `<CharacterGenerator />`)
// to allow for proper prop passing at render time.
const TABS: TabConfig[] = [
    { id: 'character', label: 'Characters', icon: <CharacterIcon />, component: CharacterGenerator },
    { id: 'monster', label: 'Monsters', icon: <MonsterIcon />, component: MonsterGenerator },
    { id: 'pet', label: 'Pets', icon: <PetIcon />, component: PetGenerator },
    { id: 'map', label: 'Maps', icon: <MapIcon />, component: MapGenerator },
    { id: 'combat', label: 'Effects', icon: <EffectIcon />, component: CombatEffectGenerator },
    { id: 'chest', label: 'Chests', icon: <ChestIcon />, component: TreasureChestGenerator },
    { id: 'equipment', label: 'Equipment', icon: <EquipmentIcon />, component: EquipmentGenerator },
    { id: 'item', label: 'Items', icon: <ItemIcon />, component: ItemGenerator },
    { id: 'game', label: 'Game Assembler', icon: <GameIcon />, component: GameAssembler },
];

const GeneratorTabs: React.FC = () => {
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
    // On small screens (mobile), tabs are horizontal scrollable.
    // On medium screens and up, it becomes a vertical sidebar layout.
    <div className="flex flex-col md:flex-row md:gap-8">
      
      {/* Tab Navigation */}
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

      {/* Tab Panels */}
      <div className="flex-grow min-w-0">
        {/* Fix: Replaced `React.cloneElement` with direct component instantiation to pass props,
            resolving the TypeScript errors. */}
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
              <Component apiLock={apiLock} />
             </div>
            );
        })}
      </div>
    </div>
  );
};

export default GeneratorTabs;