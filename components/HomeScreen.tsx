
import React from 'react';
import type { Service } from '../types';
import { DEFAULT_SERVICES } from '../constants';

interface ServiceCardProps {
  service: Service;
  onSelect: () => void;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ service, onSelect }) => (
  <div className="bg-gray-800 rounded-xl shadow-lg overflow-hidden transform hover:scale-105 transition-transform duration-300 flex flex-col">
    <div className="p-6 flex-grow">
      <div className="flex items-center mb-4">
        <div className="text-blue-400 mr-4">{service.icon}</div>
        <h3 className="text-xl font-bold text-white">{service.name}</h3>
      </div>
      <p className="text-gray-400 text-sm">{service.description}</p>
    </div>
    <div className="p-6 bg-gray-800/50">
      <button
        onClick={onSelect}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300"
      >
        Start Conversation
      </button>
    </div>
  </div>
);

interface HomeScreenProps {
  onSelectService: (service: Service) => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onSelectService }) => {
  return (
    <div className="animate-fade-in">
      <header className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-2">Multi-Agent Conversation Generator</h1>
        <p className="text-lg text-gray-400">Select a scenario to begin a simulated conversation.</p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {DEFAULT_SERVICES.map((service) => (
          <ServiceCard key={service.id} service={service} onSelect={() => onSelectService(service)} />
        ))}
      </div>
    </div>
  );
};

export default HomeScreen;
