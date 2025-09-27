import { useEffect } from 'react';
import { Screen } from '../types';
import type { Service } from '../types';
import { getPageSEO, updatePageSEO } from './seo';
import { getServiceStructuredData, addStructuredDataToPage, removeScenarioStructuredData } from './structuredData';

export const useSEO = (screen: Screen, service?: Service): void => {
  useEffect(() => {
    const seoData = getPageSEO(screen, service);
    updatePageSEO(seoData);
    
    // Add structured data for specific services/scenarios
    if (service && (screen === Screen.SETUP || screen === Screen.CONVERSATION || screen === Screen.EXPORT)) {
      const structuredData = getServiceStructuredData(service);
      addStructuredDataToPage(structuredData);
    } else {
      // Remove scenario-specific structured data when not in a scenario
      removeScenarioStructuredData();
    }
  }, [screen, service]);
};