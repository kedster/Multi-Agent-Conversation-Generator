import React, { useState } from 'react';
import type { Agent, Service, Message } from './types';
import { Screen } from './types';
import { DEFAULT_SERVICES } from './constants';
import { useSEO } from './utils/useSEO';
import Header from './components/Header';
import Footer from './components/Footer';
import HomeScreen from './components/HomeScreen';
import SetupScreen from './components/SetupScreen';
import ConversationScreen from './components/ConversationScreen';
import ExportScreen from './components/ExportScreen';

interface BreadcrumbsProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

const BREADCRUMB_SCREENS = [
  { id: Screen.HOME, title: 'Scenarios' },
  { id: Screen.SETUP, title: 'Configure' },
  { id: Screen.CONVERSATION, title: 'Simulate' },
  { id: Screen.EXPORT, title: 'Export' },
];

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ currentScreen, onNavigate }) => {
  const currentIndex = BREADCRUMB_SCREENS.findIndex(s => s.id === currentScreen);

  return (
    <nav className="mb-8 flex items-center space-x-2 text-sm text-gray-400" aria-label="Progress">
      {BREADCRUMB_SCREENS.map((screen, index) => {
        const isCurrent = index === currentIndex;
        const isPast = index < currentIndex;

        return (
          <React.Fragment key={screen.id}>
            {index > 0 && <span className="text-gray-500">/</span>}
            <button
              onClick={() => isPast && onNavigate(screen.id)}
              disabled={!isPast}
              className={`
                px-2 py-1 rounded-md
                ${isCurrent ? 'font-bold text-white bg-gray-700/50' : ''}
                ${isPast ? 'hover:bg-gray-700 hover:text-white transition-colors cursor-pointer' : 'text-gray-500 cursor-default'}
              `}
              aria-current={isCurrent ? 'page' : undefined}
            >
              {screen.title}
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
};


const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.HOME);
  const [selectedService, setSelectedService] = useState<Service>(DEFAULT_SERVICES[0]);
  const [agents, setAgents] = useState<Agent[]>(DEFAULT_SERVICES[0].agents);
  const [conversation, setConversation] = useState<Message[]>([]);
  const [userName, setUserName] = useState<string>('You');

  // Update SEO dynamically based on current screen and service
  useSEO(currentScreen, selectedService);


  const handleSelectService = (service: Service) => {
    setSelectedService(service);
    setAgents(service.agents);
    setCurrentScreen(Screen.SETUP);
  };

  const handleStartSimulation = (configuredAgents: Agent[], name: string) => {
    setAgents(configuredAgents);
    setUserName(name.trim() ? name.trim() : 'You');
    
    const initialMessages: Message[] = configuredAgents
        .filter(agent => agent.startingContext.trim() !== '')
        .map(agent => ({
            agentId: agent.id,
            agentName: agent.name,
            text: `*Starts with the context: ${agent.startingContext}*`,
            color: agent.color,
        }));
    setConversation(initialMessages);
    setCurrentScreen(Screen.CONVERSATION);
  };

  const handleEndConversation = (finalConversation: Message[]) => {
    setConversation(finalConversation);
    setCurrentScreen(Screen.EXPORT);
  };
  
  const handleStartNew = () => {
      setConversation([]);
      setCurrentScreen(Screen.HOME);
      setUserName('You');
  }
  
  const handleNavigate = (screen: Screen) => {
      if (screen < currentScreen) {
          if (screen === Screen.HOME) {
              handleStartNew();
          } else {
              setCurrentScreen(screen);
          }
      }
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case Screen.HOME:
        return <HomeScreen onSelectService={handleSelectService} />;
      case Screen.SETUP:
        return (
          <SetupScreen
            service={selectedService}
            onStartSimulation={handleStartSimulation}
            onBack={() => handleNavigate(Screen.HOME)}
          />
        );
      case Screen.CONVERSATION:
        return (
          <ConversationScreen
            agents={agents}
            initialConversation={conversation}
            onEndConversation={handleEndConversation}
            userName={userName}
            service={selectedService}
          />
        );
      case Screen.EXPORT:
        return <ExportScreen conversation={conversation} onStartNew={handleStartNew} userName={userName} service={selectedService} />;
      default:
        return <HomeScreen onSelectService={handleSelectService} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans flex flex-col">
      <Header currentScreen={currentScreen} onNavigate={handleNavigate} />
      <main className="flex-1 container mx-auto p-4 md:p-8">
          <Breadcrumbs currentScreen={currentScreen} onNavigate={handleNavigate} />
          {renderScreen()}
      </main>
      <Footer />
    </div>
  );
};

export default App;