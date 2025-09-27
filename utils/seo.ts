import { Screen } from '../types';
import type { Service } from '../types';

export interface SEOData {
  title: string;
  description: string;
  keywords: string;
}

export const getPageSEO = (screen: Screen, service?: Service): SEOData => {
  const baseTitle = 'Multi-Agent Conversation Generator';
  
  switch (screen) {
    case Screen.HOME:
      return {
        title: `${baseTitle} - AI Team Simulation Tool`,
        description: 'Choose from multiple AI conversation scenarios including software development teams, marketing brainstorming, biography writing, party planning, and travel guidance.',
        keywords: 'ai conversation, multi-agent simulation, team planning, creative writing, brainstorming, educational simulation, ai scenarios'
      };
      
    case Screen.SETUP:
      if (service) {
        return {
          title: `Setup ${service.name} Simulation - ${baseTitle}`,
          description: `Configure your ${service.name.toLowerCase()} conversation simulation. ${service.description}`,
          keywords: `${service.name.toLowerCase()}, ai simulation, ${service.name.toLowerCase()} team, conversation setup, ai agents`
        };
      }
      return {
        title: `Setup Simulation - ${baseTitle}`,
        description: 'Configure your AI conversation simulation with custom agents and scenarios.',
        keywords: 'ai simulation setup, conversation configuration, multi-agent system'
      };
      
    case Screen.CONVERSATION:
      if (service) {
        return {
          title: `${service.name} Conversation - ${baseTitle}`,
          description: `Active ${service.name.toLowerCase()} conversation simulation with multiple AI agents. ${service.description}`,
          keywords: `${service.name.toLowerCase()} conversation, ai discussion, ${service.name.toLowerCase()} simulation, multi-agent chat`
        };
      }
      return {
        title: `Active Conversation - ${baseTitle}`,
        description: 'Live AI conversation simulation with multiple intelligent agents discussing various topics.',
        keywords: 'ai conversation, multi-agent chat, live simulation, ai discussion'
      };
      
    case Screen.EXPORT:
      if (service) {
        return {
          title: `Export ${service.name} Report - ${baseTitle}`,
          description: `Download your ${service.name.toLowerCase()} conversation simulation as a professional PDF report.`,
          keywords: `${service.name.toLowerCase()} report, pdf export, conversation summary, ai simulation results`
        };
      }
      return {
        title: `Export Conversation Report - ${baseTitle}`,
        description: 'Export your AI conversation simulation as a professional PDF report with complete conversation history.',
        keywords: 'conversation export, pdf report, ai simulation results, conversation summary'
      };
      
    default:
      return {
        title: baseTitle,
        description: 'Interactive React application that simulates realistic conversations between multiple AI agents on various topics with user participation and professional report export capabilities',
        keywords: 'ai, artificial intelligence, conversation simulation, multi-agent system, chatbot, openai, gpt-4, react, typescript, interactive ai, team planning, creative writing, brainstorming, educational simulation'
      };
  }
};

export const updatePageSEO = (seoData: SEOData): void => {
  // Update document title
  document.title = seoData.title;
  
  // Update meta description
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    metaDescription.setAttribute('content', seoData.description);
  }
  
  // Update meta keywords
  const metaKeywords = document.querySelector('meta[name="keywords"]');
  if (metaKeywords) {
    metaKeywords.setAttribute('content', seoData.keywords);
  }
  
  // Update Open Graph title
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) {
    ogTitle.setAttribute('content', seoData.title);
  }
  
  // Update Open Graph description
  const ogDescription = document.querySelector('meta[property="og:description"]');
  if (ogDescription) {
    ogDescription.setAttribute('content', seoData.description);
  }
  
  // Update Twitter title
  const twitterTitle = document.querySelector('meta[property="twitter:title"]');
  if (twitterTitle) {
    twitterTitle.setAttribute('content', seoData.title);
  }
  
  // Update Twitter description
  const twitterDescription = document.querySelector('meta[property="twitter:description"]');
  if (twitterDescription) {
    twitterDescription.setAttribute('content', seoData.description);
  }
};