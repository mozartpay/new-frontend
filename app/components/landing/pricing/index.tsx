import React from 'react';
import { FaCheckCircle } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { Link } from '@remix-run/react';
import '../../../styles/global.css';

interface Props {
  children: React.ReactNode;
}

interface PlanDetails {
  type: string;
  amount: number | undefined;
  currency: string;
  displayPrice?: string;
}

function PriceWrapper(props: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="price-wrapper"
    >
      <div>{props.children}</div>
    </motion.div>
  );
}

export default function Pricing() {
  const handleStartTrial = (type: string, amount: number, currency: string) => {
    // Use Remix's <Link> for navigation; it will be handled in the Plan component
  };

  return (
    <div className="pricing-container">
      <div className="pricing-header">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >
          <h1 className="pricing-title">Plans that fit your needs</h1>
          <p className="pricing-subtitle">
            We offer competitive pricing for businesses of all sizes and needs.
          </p>
        </motion.div>
      </div>

      <div className="pricing-cards">
        <PriceWrapper>
          <Plan
            type="Free"
            amount={0}
            currency="$"
            features={['1 user included', 'API Access', 'Up to 100 requests per month', 'Email support']}
            onTrialClick={handleStartTrial}
          />
        </PriceWrapper>
        <PriceWrapper>
          <Plan
            type="Pro"
            amount={50}
            currency="$"
            features={['Up to 5 users included', 'API Access', 'Up to 500 requests per month', '24/7 Phone & Email support']}
            onTrialClick={handleStartTrial}
          />
        </PriceWrapper>
        <PriceWrapper>
          <Plan
            type="Enterprise"
            amount={undefined}
            currency=""
            displayPrice="Let's talk"
            features={['From 5 users included', 'API Access', 'Unlimited requests per month', '24/7 Phone & Email support']}
            onTrialClick={handleStartTrial}
          />
        </PriceWrapper>
      </div>
    </div>
  );
}

function Plan({
  type,
  amount,
  currency,
  displayPrice,
  features,
  onTrialClick,
}: PlanDetails & { features: string[]; onTrialClick: (type: string, amount: number, currency: string) => void }) {
  return (
    <>
      <div className="plan-header">
        <h2 className="plan-type">{type}</h2>
        <div className="plan-price">
          {displayPrice ? (
            <span className="plan-amount">{displayPrice}</span>
          ) : (
            <>
              <span className="plan-currency">{currency}</span>
              <span className="plan-amount">{amount}</span>
              <span className="plan-duration">/month</span>
            </>
          )}
        </div>
      </div>
      <div className="plan-body">
        <ul className="plan-features">
          {features.map((feature) => (
            <li key={feature} className="plan-feature">
              <FaCheckCircle className="feature-icon" />
              {feature}
            </li>
          ))}
        </ul>
        <div className="button-container">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link to="/signup">
              <button className="start-trial-button">
                Start trial
              </button>
            </Link>
          </motion.div>
        </div>
      </div>
    </>
  );
}