import { useState, useEffect } from 'react';
import { FiChevronUp } from 'react-icons/fi';

export default function ScrollToTopButton({ scrollContainerRef }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const container = scrollContainerRef?.current;
    if (!container) return;

    const handleScroll = () => {
      // Show button when scrolled down 300px
      if (container.scrollTop > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [scrollContainerRef]);

  const scrollToTop = () => {
    const container = scrollContainerRef?.current;
    if (container) {
      container.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  return (
    <button
      onClick={scrollToTop}
      aria-label="بازگشت به بالا"
      className={`absolute bottom-6 left-6 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg dark:shadow-none shadow-blue-600/30 transition-all duration-300 z-40 transform ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0 pointer-events-none'
      } cursor-pointer`}
    >
      <FiChevronUp className="text-xl" />
    </button>
  );
}
