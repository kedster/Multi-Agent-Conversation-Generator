import React from 'react';

const Footer: React.FC = () => {
  const socialLinks = [
    { name: 'LinkedIn', url: 'https://www.linkedin.com/in/seth-keddy/', icon: '💼' },
    { name: 'Twitter - DNSRedo', url: 'https://x.com/DNSRedo', icon: '🐦' },
    { name: 'Twitter - SethKeddy', url: 'https://x.com/sethkeddy', icon: '🐦' },
    { name: 'Peerlist', url: 'https://peerlist.io/sethkeddy', icon: '👥' },
    { name: 'GitHub', url: 'https://github.com/kedster', icon: '📱' },
    { name: 'Portfolio', url: 'https://kedster.github.io', icon: '🌐' },
    { name: 'Bio', url: 'https://bio.snap-view.com', icon: '📄' },
    { name: 'Dev.to', url: 'https://dev.to/kedster', icon: '💻' },
    { name: 'Daily.dev', url: 'https://app.daily.dev/sethkeddy', icon: '📰' },
    { name: 'Medium', url: 'https://medium.com/@sethkeddy', icon: '📝' },
    { name: 'Credly', url: 'https://www.credly.com/users/seth-keddy', icon: '🏆' },
    { name: 'Rate My Professors', url: 'https://www.ratemyprofessors.com/professor/2694476', icon: '🎓' },
  ];

  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-800 border-t border-gray-700 mt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {socialLinks.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-md px-3 py-2 transition-colors"
            >
              <span className="text-lg">{link.icon}</span>
              <span className="text-sm">{link.name}</span>
            </a>
          ))}
        </div>
        <div className="border-t border-gray-700 pt-4 text-center">
          <p className="text-gray-400 text-sm">
            © {currentYear} Seth Keddy. All rights reserved. Multi-Agent Conversation Generator.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;