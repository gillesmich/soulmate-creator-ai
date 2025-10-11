import React from 'react';

interface LipSyncAvatarProps {
  imageUrl?: string;
  isSpeaking: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  onClick?: () => void;
}

const LipSyncAvatar: React.FC<LipSyncAvatarProps> = ({ 
  imageUrl, 
  isSpeaking, 
  size = 'medium',
  className = '',
  onClick
}) => {
  // Debug: Log when isSpeaking changes
  React.useEffect(() => {
    console.log('[LIPSYNC AVATAR] isSpeaking:', isSpeaking);
  }, [isSpeaking]);

  const sizeClasses = {
    small: 'w-16 h-16',
    medium: 'w-32 h-32',
    large: 'w-64 h-64'
  };

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`} onClick={onClick}>
      <div 
        className={`
          w-full h-full rounded-full overflow-hidden border-4 
          transition-all duration-200
          ${isSpeaking 
            ? 'border-primary scale-110 shadow-2xl shadow-primary/60 animate-pulse' 
            : 'border-primary/20 scale-100'}
        `}
        style={{
          filter: isSpeaking ? 'brightness(1.3) saturate(1.5) contrast(1.1)' : 'brightness(1) saturate(1)',
        }}
      >
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt="AI Girlfriend"
            className={`w-full h-full object-cover transition-transform duration-200 ${isSpeaking ? 'scale-105' : 'scale-100'}`}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <span className="text-2xl">💖</span>
          </div>
        )}
      </div>
      
      {/* Speaking indicator with multiple animated rings */}
      {isSpeaking && (
        <>
          <div className="absolute inset-0 rounded-full border-4 border-primary/40 animate-ping"></div>
          <div className="absolute inset-0 rounded-full border-2 border-accent/60 animate-pulse" style={{ animationDelay: '0.1s' }}></div>
          <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center animate-bounce shadow-lg">
            <div className="w-3 h-3 bg-primary-foreground rounded-full animate-ping"></div>
          </div>
        </>
      )}
    </div>
  );
};

export default LipSyncAvatar;