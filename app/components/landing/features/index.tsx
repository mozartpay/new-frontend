import { motion, useAnimation } from 'framer-motion';
import { ReactElement, useEffect, useRef } from 'react';
import { useInView } from 'react-intersection-observer';
import '../../../styles/global.css';

const comp = '/assets/img/home/comp.png';
const f1 = '/assets/img/home/Seamless.png';
const f2 = '/assets/img/home/Comprehensive.png';
const f3 = '/assets/img/home/Multiplatform.png';
const f4 = '/assets/img/home/Encryption.png';
const f5 = '/assets/img/home/app.png';
const f6 = '/assets/img/home/detection.png';
const f7 = '/assets/img/home/telephone.png';
const f8 = '/assets/img/home/realtime.png';
const f9 = '/assets/img/home/conversion.png';
const f10 = '/assets/img/home/benefit.png';
// Example paths for images stored in public folder
// const comp = 'https://i.imgur.com/lUzX380.png';  
// const f1 = 'https://i.imgur.com/RTvtpBk.png';
// const f2 = 'https://i.imgur.com/jv1WbH6.png';
// const f3 = 'https://i.imgur.com/zWDuzk6.png';
// const f4 = 'https://i.imgur.com/dlnxzo7.png';
// const f5 = 'https://i.imgur.com/8TI5MG9.png';
//  const f6 = 'https://i.imgur.com/3cSsvDv.png';
// const f7 = 'https://i.imgur.com/uNU5g0Y.png';
// const f8 = 'https://i.imgur.com/u6o1ySA.png';
// const f9 = 'https://i.imgur.com/qa3rOx1.png';
// const f10 = 'https://i.imgur.com/wbYH0Cz.png';

interface FeaturesProps {
  text: string;
  iconBg: string;
  icon?: ReactElement;
}

const Features = ({ text, icon, iconBg }: FeaturesProps) => {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.3 }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: iconBg,
            borderRadius: '50%',
          }}
        >
          {icon}
        </div>
        <span style={{ fontWeight: 600, marginLeft: '8px' }}>{text}</span>
      </div>
    </motion.div>
  );
};

interface LazyMotionDivProps {
  children: React.ReactNode;
  initial: any; // Specify more specific type if possible
  animate: any; // Specify more specific type if possible
  transition: any; // Specify more specific type if possible
}

const LazyMotionDiv = ({ children, initial, animate, transition }: LazyMotionDivProps) => {
  const controls = useAnimation();
  const [ref, inView] = useInView({ triggerOnce: true });

  useEffect(() => {
    if (inView) {
      controls.start(animate);
    }
  }, [controls, inView, animate]);

  return (
    <motion.div
      ref={ref}
      initial={initial}
      animate={controls}
      transition={transition}
    >
      {children}
    </motion.div>
  );
};

export default function SplitWithImage() {
  return (
    <div style={{ maxWidth: '1200px', padding: '48px', margin: '0 auto' }}>
      {/* Animated Heading */}
      <LazyMotionDiv
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h1 style={{ fontSize: '3rem', textAlign: 'center', fontWeight: 'bold' }}>Features</h1>
      </LazyMotionDiv>
      <br />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
        <div>
          <LazyMotionDiv
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2>Payments for online business</h2>
            <p style={{ color: 'gray', fontSize: '1rem' }}>
              Online businesses, e-commerce stores, online platforms, and marketplaces, we offer a suite of tools for all your needs.
            </p>
          </LazyMotionDiv>

          <div style={{ marginTop: '16px', marginBottom: '16px', borderTop: '1px solid lightgray' }}></div>

          {/* Animated Features */}
          <Features
            icon={<img src={f2} alt="Comprehensive Integration" style={{ width: '16px', height: '16px' }} />}
            iconBg="yellow"
            text={'Comprehensive Integration'}
          />
          <Features
            icon={<img src={f3} alt="Multi-platform Support" style={{ width: '16px', height: '16px' }} />}
            iconBg="green"
            text={'Multi-platform Support'}
          />
          <Features
            icon={<img src={f1} alt="Seamless Checkout" style={{ width: '16px', height: '16px' }} />}
            iconBg="purple"
            text={'Seamless Checkout Experience'}
          />
        </div>

        {/* Animated Image */}
        <LazyMotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <img
              src={comp} // Use the string URL directly
              alt={'Features image'}
              style={{ borderRadius: '8px', width: '100%', maxWidth: '400px', objectFit: 'cover' }}
            />
          </div>
        </LazyMotionDiv>
      </div>

      <br />
      <br />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
        {/* Animated Image */}
        <LazyMotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <img
              src={'https://i.imgur.com/LNFrkTs.png'}
              alt={'Features image'}
              style={{ borderRadius: '8px', width: '100%', maxWidth: '400px', objectFit: 'cover' }}
            />
          </div>
        </LazyMotionDiv>

        <div>
          <LazyMotionDiv
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2>Keep fraud under control.</h2>
            <p style={{ color: 'gray', fontSize: '1rem' }}>
              Protect your business from fraud by settling payments with proven cutting-edge technology.
            </p>
          </LazyMotionDiv>

          <div style={{ marginTop: '16px', marginBottom: '16px', borderTop: '1px solid lightgray' }}></div>

          <Features
            icon={<img src={f6} alt="Advanced Fraud Detection" style={{ width: '16px', height: '16px' }} />}
            iconBg="yellow"
            text={'Advanced Fraud Detection'}
          />
          <Features
            icon={<img src={f5} alt="Real-time Alerts" style={{ width: '16px', height: '16px' }} />}
            iconBg="green"
            text={'Real-time Alerts'}
          />
          <Features
            icon={<img src={f4} alt="Encryption" style={{ width: '16px', height: '16px' }} />}
            iconBg="purple"
            text={'Secure Encryption Protocols'}
          />
        </div>
      </div>

      <br />
      <br />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
        <div>
          <LazyMotionDiv
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
          >
            <h2>Quick setup</h2>
            <p style={{ color: 'gray', fontSize: '1rem' }}>
              Easily set up an account and start receiving payments in a matter of minutes.
            </p>
          </LazyMotionDiv>

          <div style={{ marginTop: '16px', marginBottom: '16px', borderTop: '1px solid lightgray' }}></div>

          <Features
            icon={<img src={f1} alt="User-friendly Interface" style={{ width: '16px', height: '16px' }} />}
            iconBg="yellow"
            text={'User-friendly Interface'}
          />
          <Features
            icon={<img src={f5} alt="Instant Verification" style={{ width: '16px', height: '16px' }} />}
            iconBg="green"
            text={'Instant Verification'}
          />
          <Features
            icon={<img src={f7} alt="Customer Support" style={{ width: '16px', height: '16px' }} />}
            iconBg="purple"
            text={'24/7 Customer Support'}
          />
        </div>

        {/* Animated Image */}
        <LazyMotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <img
              src={'https://i.imgur.com/RRENY8D.png'}
              alt={'Features image'}
              style={{ borderRadius: '8px', width: '100%', maxWidth: '400px', objectFit: 'cover' }}
            />
          </div>
        </LazyMotionDiv>
      </div>

      <br />
      <br />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
        {/* Animated Image */}
        <LazyMotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <img
              src={comp} // Use the string URL directly
              alt={'Features image'}
              style={{ borderRadius: '8px', width: '100%', maxWidth: '400px', objectFit: 'cover' }}
            />
          </div>
        </LazyMotionDiv>

        <div>
          <LazyMotionDiv
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2>Global coverage</h2>
            <p style={{ color: 'gray', fontSize: '1rem' }}>
              We support more than 10 currencies worldwide for near-instant bank-to-bank transfers.
            </p>
          </LazyMotionDiv>

          <div style={{ marginTop: '16px', marginBottom: '16px', borderTop: '1px solid lightgray' }}></div>

          <Features
            icon={<img src={f9} alt="Currency Conversion" style={{ width: '16px', height: '16px' }} />}
            iconBg="yellow"
            text={'Currency Conversion'}
          />
          <Features
            icon={<img src={f10} alt="Competitive Rates" style={{ width: '16px', height: '16px' }} />}
            iconBg="green"
            text={'Competitive Rates'}
          />
          <Features
            icon={<img src={f8} alt="Real-time Transfers" style={{ width: '16px', height: '16px' }} />}
            iconBg="purple"
            text={'Real-time Transfers'}
          />
        </div>
      </div>

      <br />
      <br />
    </div>
  );
}