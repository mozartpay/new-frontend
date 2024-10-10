import { ReactElement, useEffect, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';
import rem from '~/assets/img/home/rem.png';
import gam from '~/assets/img/home/gam.png';
import tra from '~/assets/img/home/tra.png';

interface FeatureProps {
  title: string;
  text: string;
  icon: ReactElement;
}

const Feature = ({ title, text, icon }: FeatureProps) => {
  const controls = useAnimation();
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          controls.start({ opacity: 1, y: 0 });
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [controls]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={controls}
      transition={{ duration: 0.8 }}
      whileHover={{ scale: 1.05 }}
      style={{ textAlign: 'center' }}
    >
      <div
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '16px',
        }}
      >
        {icon}
      </div>
      <h2 style={{ fontWeight: '600', marginBottom: '8px' }}>{title}</h2>
      <p style={{ color: 'gray' }}>{text}</p>
    </motion.div>
  );
};

function Industries() {
  return (
    <div style={{ padding: '40px' }}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <h1 style={{ fontSize: '48px', textAlign: 'center', fontWeight: 'bold' }}>
          Industries
        </h1>
      </motion.div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '40px',
          marginTop: '40px',
        }}
      >
        {/* Remittance Feature */}
        <Feature
          icon={
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <img
                src={rem}
                alt="Remittance Icon"
                style={{ width: '100%', maxWidth: '300px', height: 'auto' }}
              />
            </motion.div>
          }
          title="Remittance"
          text="Our clients can benefit from our remittance services with more than 10 currencies worldwide."
        />

        {/* Gaming and Entertainment Feature */}
        <Feature
          icon={
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <img
                src={gam}
                alt="Gaming and Entertainment Icon"
                style={{ width: '100%', maxWidth: '300px', height: 'auto' }}
              />
            </motion.div>
          }
          title="Gaming and Entertainment"
          text="Micropayment solutions for gaming, content publishers, and entertainment."
        />

        {/* Tourism and Leisure Feature */}
        <Feature
          icon={
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <img
                src={tra}
                alt="Tourism Icon"
                style={{ width: '100%', maxWidth: '300px', height: 'auto' }}
              />
            </motion.div>
          }
          title="Tourism and Leisure"
          text="Companies in travel can also leverage our payment API to allow secure, fast, and compliant international payments."
        />
      </div>
    </div>
  );
}
export default Industries;