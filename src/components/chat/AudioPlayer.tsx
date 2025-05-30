import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download } from 'lucide-react';

interface AudioPlayerProps {
  src: string;
  fileName: string;
  compact?: boolean;
}

export function AudioPlayer({ src, fileName, compact = false }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isAudioSupported, setIsAudioSupported] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Verifica se o navegador suporta a API de áudio
    setIsAudioSupported(typeof audio.play === 'function');

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = async () => {
    if (!audioRef.current) return;
    
    try {
      if (isPlaying) {
        await audioRef.current.pause();
      } else {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          await playPromise;
        }
      }
      setIsPlaying(!isPlaying);
    } catch (error) {
      console.error('Erro ao controlar reprodução de áudio:', error);
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = src;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Se a reprodução de áudio não for suportada, mostra apenas o botão de download
  if (!isAudioSupported) {
    return (
      <div className={`flex items-center w-full max-w-[300px] sm:max-w-[400px]`}>
        <button
          onClick={handleDownload}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors"
        >
          <Download className="w-4 h-4" />
          <span className="text-sm">Baixar áudio</span>
        </button>
      </div>
    );
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;

    const bounds = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - bounds.left;
    const width = bounds.width;
    const percentage = x / width;
    const newTime = percentage * duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const togglePlaybackRate = () => {
    if (!audioRef.current) return;
    
    const rates = [1, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    
    audioRef.current.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex items-center ${compact ? 'space-x-1' : 'gap-'} w-full max-w-[300px] sm:max-w-[400px]`}>
      <audio ref={audioRef} src={src} />
      
      <button
        onClick={togglePlay}
        className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-gray-500 dark:text-white rounded-full transition-colors"
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 sm:w-5 sm:h-5" />
        ) : (
          <Play className="w-4 h-4 sm:w-5 sm:h-5 ml-0.5 sm:ml-1" />
        )}
      </button>

      <div className="flex-1">
        <div className="flex items-center">
          <div
            className="flex-1 h-1.5 ml-2 bg-gray-300 dark:bg-gray-800/60 rounded-full cursor-pointer overflow-hidden"
            onClick={handleProgressClick}
          >
            <div
              className="h-full bg-blue-600 rounded-full"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>
          
          <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-right ml-2">
            {formatTime(currentTime)}
          </span>
        </div>
      </div>

      <button
        onClick={togglePlaybackRate}
        className="flex-shrink-0 px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
      >
        {playbackRate}x
      </button>
    </div>
  );
} 