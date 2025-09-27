import type { Service } from '../types';

export interface StructuredData {
  '@context': string;
  '@type': string;
  [key: string]: any;
}

export const getServiceStructuredData = (service: Service): StructuredData => {
  const baseUrl = 'https://multi-agent-conversation-generator.pages.dev';
  
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: `${service.name} Simulation - Multi-Agent Conversation Generator`,
    description: service.description,
    url: `${baseUrl}/#scenario/${service.id}`,
    applicationCategory: 'ProductivityApplication', 
    operatingSystem: 'Web',
    author: {
      '@type': 'Person',
      name: 'kedster',
      url: 'https://github.com/kedster'
    },
    featureList: [
      `${service.name} team simulation`,
      'Multi-agent AI conversation',
      'Interactive discussion',
      'PDF report export',
      'Professional scenario modeling'
    ],
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD'
    },
    audience: {
      '@type': 'Audience',
      audienceType: getAudienceType(service.id)
    }
  };
};

const getAudienceType = (serviceId: string): string => {
  switch (serviceId) {
    case 'dev':
      return 'Software developers, tech teams, project managers';
    case 'mkt': 
      return 'Marketing professionals, content creators, brand managers';
    case 'bio':
      return 'Writers, historians, researchers, academics';
    case 'party':
      return 'Event planners, party organizers, celebration coordinators';
    case 'travel':
      return 'Travel planners, vacation organizers, travel enthusiasts';
    default:
      return 'Professionals seeking AI-powered conversation simulations';
  }
};

export const addStructuredDataToPage = (structuredData: StructuredData): void => {
  // Remove existing structured data script if present
  const existingScript = document.querySelector('script[type="application/ld+json"][data-scenario]');
  if (existingScript) {
    existingScript.remove();
  }
  
  // Add new structured data
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.setAttribute('data-scenario', 'true');
  script.textContent = JSON.stringify(structuredData, null, 2);
  document.head.appendChild(script);
};

export const removeScenarioStructuredData = (): void => {
  const existingScript = document.querySelector('script[type="application/ld+json"][data-scenario]');
  if (existingScript) {
    existingScript.remove();
  }
};