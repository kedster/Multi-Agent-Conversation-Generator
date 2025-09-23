import React from 'react';
import { Screen } from '../types';

interface HeaderProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

const Header: React.FC<HeaderProps> = ({ currentScreen, onNavigate }) => {
  const navItems = [
    { screen: Screen.HOME, label: 'Conversation Scenarios', disabled: false },
    { screen: Screen.SETUP, label: 'User Settings', disabled: currentScreen < Screen.SETUP },
    { screen: Screen.EXPORT, label: 'Export Options', disabled: currentScreen < Screen.EXPORT },
  ];

  return (
    <header className="bg-gray-800 border-b border-gray-700 shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-white">Multi-Agent Conversation Generator</h1>
          </div>
          <nav className="flex items-center space-x-6">
            {navItems.map((item) => (
              <button
                key={item.screen}
                onClick={() => !item.disabled && onNavigate(item.screen)}
                disabled={item.disabled}
                className={`
                  px-3 py-2 rounded-md text-sm font-medium transition-colors
                  ${currentScreen === item.screen
                    ? 'bg-blue-600 text-white'
                    : item.disabled
                    ? 'text-gray-500 cursor-not-allowed'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }
                `}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;