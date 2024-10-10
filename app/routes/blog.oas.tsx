import { MetaFunction } from "@remix-run/node";
import { Link } from '@remix-run/react';
import oas from './oas_sc.png';

export const meta: MetaFunction = () => {
  return [
    { title: "Harnessing Real-World Assets (RWAs) through Orchestrated Agreements (OAs)" },
    { name: "description", content: "Transforming Web3 Payment Dynamics on Soroban with Orchestrated Agreements." },
  ];
};

interface Props {
  marginTop?: number;
  tags: any[];
}

const BlogTags = (props: Props) => {
  const { marginTop = 0, tags } = props;

  return (
    <div style={{ marginTop: `${marginTop}px`, display: 'flex', gap: '8px' }}>
      {tags.map((tag) => (
        <span key={tag} style={{ backgroundColor: 'orange', padding: '4px 8px', borderRadius: '4px', color: 'white' }}>
          {tag}
        </span>
      ))}
    </div>
  );
};

interface BlogAuthorProps {
  date: Date;
  name: string;
}

const BlogAuthor = (props: BlogAuthorProps) => {
  return (
    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
      <img
        src="https://i.imgur.com/pxwIAOW.png"
        alt={`Avatar of ${props.name}`}
        style={{ borderRadius: '50%', width: '40px', height: '40px' }}
      />
      <span style={{ fontWeight: '500' }}>{props.name}</span>
      <span>—</span>
      <span>{props.date.toLocaleDateString()}</span>
    </div>
  );
};

const Hero = () => (
  <section>
    <h1>Harnessing Real-World Assets (RWAs) through Orchestrated Agreements (OAs): Transforming Web3 Payment Dynamics on Soroban</h1>
    <div>
      <img
        src="https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=1332&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
        alt="some good alt text"
        style={{ borderRadius: '8px', width: '100%', objectFit: 'contain' }}
      />
    </div>
    <div>
      <p>In a world where digital transactions reign supreme, Orchestrated Agreements (OAs) emerge as the groundbreaking solution of tomorrow. Crafted by OG Technologies EU, OAs represent a quantum leap in blockchain and smart contract technology—an innovation poised to revolutionize the landscape of financial agreements.</p>
      <p><b>So, what exactly are Orchestrated Agreements?</b></p>
      <p>Imagine a suite of advanced, blockchain-powered tools designed to automate and streamline contracts in the digital realm. Inspired by Turrets, and the orchestration prowess of Kubernetes in managing containers, OAs bring similar efficiency and adaptability to the world of WASM-based contracts, particularly in intricate, cross-border financial transactions, including those involving Real-World Assets (RWA).</p>
      <p><b>Let's delve into their core features:</b></p>
      <p>Smart Contract Orchestration: Harnessing the formidable power of Soroban, Rust, and WASM, OAs offer an unparalleled level of precision and security in automating contractual obligations.</p>
      <p>Cross-Border Efficiency: Tailored to navigate the complexities of international payments, OAs simplify transactions across diverse jurisdictions and currencies, making global commerce smoother than ever.</p>
      <p>Immutability and Transparency: Rooted in blockchain technology, OAs provide a transparent, tamper-proof system, ensuring unwavering trust and accountability in every transaction.</p>
      <p>User-Friendly Interface: With a frontend masterfully crafted in TypeScript/React, OAs are not just powerful but also accessible and user-friendly, offering a seamless experience for all stakeholders.</p>
      <p><b>Now, let's talk about the perks for businesses:</b></p>
      <p>Reduced Transaction Costs and Times: Streamline your financial operations with automated processes, slashing costs and transaction times significantly.</p>
      <p>Enhanced Security and Compliance: Rest easy knowing your transactions are secure and compliant with international regulatory standards, thanks to the inherent features of blockchain and smart contracts.</p>
      <p>Scalability and Flexibility: Whether you're a budding startup or a seasoned enterprise, OAs are tailor-made to scale and adapt to your evolving business needs.</p>
      <p><b>But where can OAs be applied?</b></p>
      <p>From facilitating seamless international trade payments to managing subscriptions in global markets, OAs prove to be incredibly versatile. They find particular favor among Financial Institutions, E-Commerce Platforms, Gaming, B2B Enterprises, and Global Service Providers alike, especially when dealing with transactions involving Real-World Assets (RWA).</p>
      <p>Join the revolution and embrace the future of financial transactions with Orchestrated Agreements. At OG Technologies EU, we're not just creating a product; we're sculpting the future of commerce itself. Get in touch with us today to uncover how OAs can redefine the way you navigate the digital transaction landscape. Would you like to see an early sneak peek into the user interface? <a href="https://bafkreietvutr6xt6qjaswq5cu2t46qe7q2axrwh3tjabtmzcoesnkqqz64.ipfs.nftstorage.link/"><b>Check it out.</b></a></p>
    </div>
  </section>
);

const Oas = () => {
  return (
    <div style={{ maxWidth: '1120px', padding: '24px', margin: '0 auto' }}>
      <Hero />
    </div>
  );
};

export default Oas;