import { json, redirect, LoaderFunction } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { useRef, useState, useEffect } from "react";
import { motion, useAnimation } from "framer-motion";
import Features from "~/components/landing/features";
import Industries from "~/components/landing/industries";
import Pricing from "~/components/landing/pricing";
import "../styles/global.css";
import { decrypt } from '~/utils/encryption';
import GradientSelector from '~/components/GradientSelector';
import { WorldMap } from '../components/WorldMap'; 
import { getUserFromSession } from "~/sessions";

// Define the type for loader data
type LoaderData = {
  user: any | null;
};

export const loader: LoaderFunction = async ({ request }) => {
  const user = await getUserFromSession(request);
  
  // If user is logged in, redirect to admin
  if (user?.isAuthorized) {
    return redirect("/admin");
  }
  
  // Return null user for non-authenticated users
  return json<LoaderData>({ user: null });
};

function useIntersectionObserver(ref: React.RefObject<Element>, options: IntersectionObserverInit) {
  const controls = useAnimation();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          controls.start('visible');
        }
      },
      { ...options }
    );

    let currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [ref, controls, options]);

  return controls;
}

interface Gradient {
  dark: string;
  light: string;
}

export default function Home() {
  const titleRef = useRef(null);
  const textRef = useRef(null);
  const buttonRef = useRef(null);
  const videoRef = useRef(null);

  const titleControls = useAnimation();
  const textControls = useAnimation();
  const buttonControls = useAnimation();
  const videoControls = useAnimation();

  const [isClient, setIsClient] = useState(false);
  const { user } = useLoaderData<LoaderData>();
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Initialize dark mode from local storage or system preference
    const stored = localStorage.getItem('darkMode');
    if (stored !== null) {
      setIsDarkMode(stored === 'true');
    } else {
      setIsDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    
    titleControls.start('visible');
    textControls.start('visible');
    buttonControls.start('visible');
    videoControls.start('visible');
  }, [titleControls, textControls, buttonControls, videoControls]);

  const [selectedGradient, setSelectedGradient] = useState<Gradient | null>(null);

  const handleSelectGradient = (gradient: Gradient) => {
    setSelectedGradient(gradient);
    if (typeof document !== 'undefined') {
      document.body.style.background = `linear-gradient(135deg, ${isDarkMode ? gradient.dark : gradient.light})`;
    }
  };

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      <WorldMap isDarkMode={isDarkMode} />
      <div style={{ 
        maxWidth: '1280px', 
        margin: '0 auto', 
        padding: '0 20px',
        position: 'relative',
        zIndex: 1
      }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '60px 0',
            gap: '40px',
            flexWrap: 'wrap',
            position: 'relative',
          }}
        >
          <div style={{ 
            flex: '1 1 50%', 
            textAlign: 'center',
            minWidth: '300px',
            margin: '0 auto'
          }}>
            <motion.div
              ref={titleRef}
              initial={{ opacity: 0, y: -50 }}
              animate={titleControls}
              variants={{ visible: { opacity: 1, y: 0 } }}
              transition={{ duration: 1 }}
            >
              <h1
                style={{
                  lineHeight: '1.2',
                  fontWeight: 600,
                  fontSize: 'clamp(2rem, 5vw, 3rem)',
                  position: 'relative',
                  color: 'var(--title-color)',
                  display: 'inline-block',
                  margin: '0 auto',
                  maxWidth: '100%',
                  wordWrap: 'break-word'
                }}
              >
                <span style={{ color: 'var(--highlight-color)' }}>Harmonize</span>
                <br />
                <span>your day-to-day payments</span>
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-12px',
                    width: '60%',
                    height: '6px',
                    backgroundColor: 'var(--highlight-color)',
                    marginTop: '8px',
                    left: '20%',
                  }}
                ></div>
              </h1>
            </motion.div>
            
            <motion.div
              ref={textRef}
              initial={{ opacity: 0 }}
              animate={textControls}
              variants={{ visible: { opacity: 1 } }}
              transition={{ duration: 1, delay: 0.5 }}
              style={{ marginTop: '16px', color: 'var(--text-color)' }}
            >
              <p>Unlock access to the new era of payments!</p>
            </motion.div>

            {isClient && (
              <motion.div
                ref={buttonRef}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={buttonControls}
                variants={{ visible: { opacity: 1, scale: 1 } }}
                transition={{ duration: 0.5, delay: 1 }}
                style={{ 
                  marginTop: '24px', 
                  display: 'flex', 
                  gap: '16px',
                  justifyContent: 'center'
                }}
              >
                <Link to="/signin">
                  <button
                    style={{
                      padding: '12px 24px',
                      fontSize: '1rem',
                      fontWeight: 600,
                      borderRadius: '9999px',
                      backgroundColor: '#F56565',
                      color: 'white',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'background-color 0.3s ease',
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#E53E3E')}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#F56565')}
                  >
                    Get started
                  </button>
                </Link>
                <Link to="/contact">
                  <button
                    style={{
                      padding: '12px 24px',
                      fontSize: '1rem',
                      fontWeight: 600,
                      borderRadius: '9999px',
                      backgroundColor: '#EDF2F7',
                      color: '#2D3748',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Contact Us
                  </button>
                </Link>
              </motion.div>
            )}
          </div>
        </div>

        {/* Additional Sections */}
        <Features />
        {/* Video Section */}
        <motion.div
          ref={videoRef}
          initial={{ opacity: 0 }}
          animate={videoControls}
          variants={{ visible: { opacity: 1 } }}
          transition={{ duration: 1.2, delay: 0.8 }}
          style={{
            flex: '1 1 50%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              position: 'relative',
              height: '300px',
              borderRadius: '16px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              width: '100%',
              maxWidth: '500px',
              overflow: 'hidden',
            }}
          >
            <iframe
              src="https://player.vimeo.com/video/884100521"
              style={{ width: '100%', height: '100%' }}
              frameBorder="0"
              allow="autoplay; fullscreen; picture-in-picture"
              title="Video Title"
            ></iframe>
          </div>
        </motion.div>
        <Industries />
        <Pricing />

        {isClient && (
          <GradientSelector isDarkMode={isDarkMode} onSelectGradient={handleSelectGradient} />
        )}
      </div>
    </div>
  );   
}
