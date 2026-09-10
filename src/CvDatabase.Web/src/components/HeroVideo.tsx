import { useEffect, useRef } from "react";

export function HeroVideo() {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!reducedMotion.matches) video.current?.play().catch(() => {});
    const onChange = () => { if (reducedMotion.matches) video.current?.pause(); };
    reducedMotion.addEventListener("change", onChange);
    return () => reducedMotion.removeEventListener("change", onChange);
  }, []);
  return <div className="hero-media hero-video">
    <video ref={video} muted loop playsInline preload="metadata" poster="/media/team-meeting-poster.jpg" aria-label="A team sharing ideas in a bright meeting room">
      <source src="/media/team-meeting.mp4" type="video/mp4" />
    </video>
    <a className="video-credit" href="https://www.pexels.com/video/office-team-having-a-meeting-7792334/" target="_blank" rel="noreferrer">Video: Yan Krukau / Pexels</a>
  </div>;
}
