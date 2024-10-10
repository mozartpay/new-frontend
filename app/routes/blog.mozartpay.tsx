import { MetaFunction } from "@remix-run/node";
import { useContext } from 'react';
import { DarkModeContext } from './blog';

export const meta: MetaFunction = () => {
  return [
    { title: "MozartPay: Your Symphony of Seamless Payments" },
    { name: "description", content: "Introducing MozartPay, revolutionizing online transactions for businesses." },
  ];
};

const Hero = () => {
  const { isDarkMode } = useContext(DarkModeContext) || { isDarkMode: false };
  return (
    <section className={isDarkMode ? 'dark-mode' : ''}>
      <h1>Introducing MozartPay: Your Symphony of Seamless Payments</h1>
      <div>
        <img src="https://i.imgur.com/pxwIAOW.png" alt="some good alt text" style={{ borderRadius: '8px', objectFit: 'contain' }} />
      </div>
      <div>
        <p>We are thrilled to announce the closed beta launch of MozartPay – your conductor to harmonize day-to-day transactions and unlock access to the new era of payments. Welcome to mozartpay.com!</p>
        <p>At MozartPay, we are committed to revolutionizing the way businesses manage their online transactions. Our platform offers a symphony of features designed to streamline your payment processes and elevate your online business to new heights.</p>
        <p>For online businesses, e-commerce stores, online platforms, and marketplaces, MozartPay provides a comprehensive suite of tools to meet all your payment needs. With features such as seamless checkout experiences, multi-platform support, and comprehensive integration, we ensure that your transactions are as smooth as a Mozart sonata.</p>
        <p>Fraud prevention is a top priority for us at MozartPay. Our platform utilizes cutting-edge technology to keep fraud under control, with advanced fraud detection algorithms, real-time alerts, and secure encryption protocols, ensuring the safety and security of your transactions.</p>
        <p>Setting up an account with MozartPay is quick and effortless. With our user-friendly interface and instant verification process, you can start accepting payments within minutes, allowing you to focus on composing your business success. And with our round-the-clock customer support, assistance is always just a note away.</p>
        <p>MozartPay offers global coverage, supporting more than 10 currencies worldwide for near instant bank-to-bank transfers. Whether you're in the remittance industry, gaming and entertainment sector, or tourism and leisure business, our payment API enables secure, fast, and compliant international payments tailored to your specific industry needs.</p>
        <p>As we are in closed beta, we are excited to offer exclusive access to our platform at mozartpay.com. Join us on this journey to revolutionize the way businesses transact online and experience the seamless symphony of MozartPay.</p>
        <p>To learn more about MozartPay and to request access to our closed beta, visit mozartpay.com today.</p>
        <p>Here's to a harmonious future of payments with MozartPay!</p>
      </div>
    </section>
  );
};

function MozartPay() {
  const { isDarkMode } = useContext(DarkModeContext) || { isDarkMode: false };
  return (
    <div className={`blog-content ${isDarkMode ? 'dark-mode' : ''}`} style={{ maxWidth: '1200px', padding: '24px', margin: '0 auto' }}>
      <Hero />
    </div>
  );
}

export default MozartPay;