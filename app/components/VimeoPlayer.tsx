import { useEffect, useState } from 'react';

export function VimeoPlayer({ videoId }: { videoId: string }) {
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    // Check if Vimeo is blocked
    fetch('https://player.vimeo.com/api/player.js')
      .then(() => setIsBlocked(false))
      .catch(() => setIsBlocked(true));
  }, []);

  if (isBlocked) {
    return <div>The video player is being blocked. Please disable your ad-blocker or adjust your privacy settings to view this video.</div>;
  }

  return (
    <iframe
      src={`https://player.vimeo.com/video/${videoId}`}
      width="640"
      height="360"
      frameBorder="0"
      allow="autoplay; fullscreen; picture-in-picture"
      allowFullScreen
    ></iframe>
  );
}
