"use client";

export default function MouseGlow() {
  if (typeof window === 'undefined') return null;
  
  const handleMouseMove = (e: MouseEvent) => {
    const cards = document.querySelectorAll('.feature-card');
    cards.forEach((card) => {
      const rect = (card as HTMLElement).getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      (card as HTMLElement).style.setProperty('--mouse-x', `${x}px`);
      (card as HTMLElement).style.setProperty('--mouse-y', `${y}px`);
    });
  };

  window.addEventListener('mousemove', handleMouseMove);
  
  return null;
}
