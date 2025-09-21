import React from 'react';

interface LipSyncAvatarProps {
  imageUrl?: string;
  isSpeaking: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const LipSyncAvatar: React.FC<LipSyncAvatarProps> = ({ 
  imageUrl, 
  isSpeaking, 
  size = 'medium',
  className = '' 
}) => {
  const sizeClasses = {
    small: 'w-16 h-16',
    medium: 'w-32 h-32',
    large: 'w-48 h-48'
  };

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      <div 
        className={`
          w-full h-full rounded-full overflow-hidden border-4 border-primary/20 
          transition-all duration-300 
          ${isSpeaking ? 'scale-105 border-primary/40 shadow-lg shadow-primary/20' : 'scale-100'}
        `}
        style={{
          filter: isSpeaking ? 'brightness(1.1) saturate(1.2)' : 'brightness(1) saturate(1)',
        }}
      >
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt="AI Girlfriend"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <span className="text-2xl">💖</span>
          </div>
        )}
      </div>
      
      {/* Speaking indicator */}
      {isSpeaking && (
        <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center animate-pulse">
          <div className="w-2 h-2 bg-primary-foreground rounded-full animate-ping"></div>
        </div>
      )}
    </div>
  );
};

export default LipSyncAvatar;