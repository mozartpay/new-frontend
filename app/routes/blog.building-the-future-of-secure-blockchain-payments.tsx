import { MetaFunction } from "@remix-run/node";
import { Link } from '@remix-run/react';
import fb from '../assets/img/blog/fb.png';

export const meta: MetaFunction = () => {
  return [
    { title: "Building the Future of Secure Blockchain Payments" },
    { name: "description", content: "At Mozartpay, we are reimagining cross-border payments by harnessing the transformative power of blockchain technology." },
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
    <h1>Building the Future of Secure Blockchain Payments</h1>
    <div>
      <img
        src={fb}
        alt="Fireblocks collaboration visual"
        style={{ borderRadius: '8px', width: '100%', objectFit: 'contain' }}
      />
    </div>

    <article style={{ marginTop: '32px', lineHeight: '1.75' }}>
      <h2>Introduction</h2>
      <p>
        At Mozartpay, we are reimagining cross-border payments by harnessing the transformative power of blockchain technology. Our
        mission goes beyond launching a payment app, we are building a next-generation financial infrastructure that enterprises,
        financial institutions, and partners across the ecosystem can trust, scale, and innovate upon.
      </p>
      <p>
        To achieve this, we are collaborating with <a href="https://www.fireblocks.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Fireblocks</a>, whose enterprise-grade custody and security platform empowers us to deliver
        secure, scalable, and compliant blockchain-based financial services.
      </p>

      <h2>The Challenge</h2>
      <p>
        Global payments remain weighed down by inefficiencies, high operational costs, and growing compliance demands. While blockchain
        holds the promise of speed and transparency, unlocking its full value requires institutional-grade security, governance, and interoperability.
      </p>
      <p>
        At Mozartpay, we recognized early that bridging this gap requires not only robust internal development, but also trusted technology
        partners who can help us deliver reliability and compliance at scale.
      </p>

      <h2>The Solution: Fireblocks + Stellar + Mozartpay</h2>
      <ul>
        <li>Advanced multi-layered security that protects digital assets at every stage.</li>
        <li>Compliance-ready approval workflows aligned with institutional requirements.</li>
        <li>Seamless integrations with counterparties through the Fireblocks Network, which today connects over 2,400 institutions worldwide.</li>
        <li>Efficient cross-border settlements powered by <a href="https://www.stellar.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Stellar</a>’s blockchain, reducing both transaction costs and settlement times.</li>
      </ul>

      <h2>The Benefits</h2>
      <ul>
        <li><strong>Trust:</strong> Assets remain safeguarded under institutional-grade custody.</li>
        <li><strong>Efficiency:</strong> Cross-border transfers are faster and less costly than traditional methods.</li>
        <li><strong>Compliance:</strong> Governance and reporting features are built into every workflow.</li>
        <li><strong>Ecosystem Readiness:</strong> Partners can leverage both the Fireblocks Network and Mozartpay’s Stellar-based payment rails to expand their reach.</li>
      </ul>

      <h2>Looking Ahead</h2>
      <p>
        Mozartpay is becoming more than a payment platform; it is evolving into a gateway for institutions and technology providers to enter a new
        era of blockchain-powered payments.
      </p>
      <p>
        As Fireblocks continues to empower the industry with its custody and connectivity infrastructure, and as Stellar enables efficient
        settlement, we see significant opportunities to scale. The ability to connect directly with Fireblocks’ 2,400+ clients and partners through the
        Fireblocks Network positions Mozartpay to drive the next wave of secure and compliant cross-border payment innovation.
      </p>
      <p>
        This journey has only just begun, and together with Fireblocks and Stellar, we are excited to build a safer, faster, and more connected global
        financial ecosystem.
      </p>
    </article>
  </section>
);

const Fireblocks = () => {
  return (
    <div style={{ maxWidth: '1120px', padding: '24px', margin: '0 auto' }}>
      <Hero />
      <BlogTags marginTop={24} tags={["Mozartpay", "Fireblocks", "Stellar", "Payments"]} />
      <BlogAuthor name="Mozartpay Team" date={new Date('2025-10-28')} />
    </div>
  );
};

export default Fireblocks;