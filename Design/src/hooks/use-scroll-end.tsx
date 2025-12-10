import { useState, useEffect, useRef, RefObject } from "react";

export const useScrollEnd = (threshold: number = 100): [RefObject<HTMLDivElement>, boolean] => {
  const [isAtEnd, setIsAtEnd] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current) return;
      
      const rect = contentRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      // Check if the bottom of the content is within threshold of viewport bottom
      setIsAtEnd(rect.bottom <= windowHeight + threshold);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial state
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  return [contentRef, isAtEnd];
};
