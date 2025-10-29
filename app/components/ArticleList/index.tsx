import { motion } from 'framer-motion';
import { BlogTags, BlogAuthor } from '../../routes/blog';
import '../../styles/blog.css';
import fb from '../../assets/img/blog/fb.png';

const ArticleList = () => (
   
  <div className="container">
    <div className="card" style={{ display: 'inline-block' }}>
      <div className="article">
        <div className="article-image" style={{ width: '50%' }}>
          <motion.img
            src="https://i.imgur.com/wJVetRT.jpeg"
            alt="some good alt text"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            style={{ width: '100%' }}
          />
        </div>
        <div className="article-content" style={{ textAlign: 'justify' }}>
          <BlogTags tags={['Digital Payments', 'Finance Innovation']} />
          <h2 className="centered-title">Welcome to our Blog</h2>
          <p>At MozartPay, we're passionate about revolutionizing the way the world interacts with finance. Our blog is a dedicated space where we explore the latest trends, innovations, and insights in the realm of digital payments and Web3 technologies. Whether you're a seasoned finance professional, a tech enthusiast, or just curious about the future of payments, our blog serves as your gateway to understanding and leveraging the most advanced financial tools and strategies.</p>

        </div>
      </div>
    </div>
    <hr />
    <div className="articles">
      <div className="card" style={{ display: 'inline-block' }}>
        <div className="article">
          <div className="article-image" style={{ width: '50%' }}>
            <a href="/blog/mozartpay" className="custom-link">
              <motion.img
                src="https://i.imgur.com/Jk9jSmH.png"
                alt="Mozart"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                style={{ width: '100%' }}
              />
            </a>
          </div>
          <div className="article-content" style={{ textAlign: 'justify' }}>
            <BlogTags tags={['Introduction', 'Payments']} />
            <a href="/blog/mozartpay" className="custom-link">
              <h2 className="title-limit">Introducing MozartPay: Your Symphony of Seamless Payments</h2>
            </a>
            <p>Discover MozartPay – the conductor of seamless payments! Join our closed beta at mozartpay.com...</p>
            <BlogAuthor name="Mozart Team" date={new Date('2023-12-06T19:01:27Z')} />
          </div>
        </div>
      </div>
      <div className="card" style={{ display: 'inline-block' }}>
        <div className="article">
          <div className="article-image" style={{ width: '50%' }}>
            <a href="/blog/oas" className="custom-link">
              <motion.img
                src="https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=1332&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                alt="some text"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                style={{ width: '100%' }}
              />
            </a>
          </div>
          <div className="article-content" style={{ textAlign: 'justify' }}>
            <BlogTags tags={['Financial Protocol', 'Web3 Payments']} />
            <a href="/blog/oas" className="custom-link">
              <h2 className="title-limit">Harnessing Real-World Assets (RWAs) through Orchestrated Agreements (OAs): Web3 Payment Dynamics on Soroban</h2>
            </a>
            <p>Discover smart contract-managed payments to streamline global transactions for businesses...</p>
            <BlogAuthor name="Mozart Team" date={new Date('2024-02-04T19:01:27Z')} />
          </div>
        </div>
      </div>
      <div className="card" style={{ display: 'inline-block' }}>
        <div className="article">
          <div className="article-image" style={{ width: '50%' }}>
            <a href="/blog/building-the-future-of-secure-blockchain-payments" className="custom-link">
              <motion.img
                src={fb}
                alt="some text"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                style={{ width: '100%' }}
              />
            </a>
          </div>
          <div className="article-content" style={{ textAlign: 'justify' }}>
            <BlogTags tags={['Financial Protocol', 'Web3 Payments']} />
            <a href="/blog/building-the-future-of-secure-blockchain-payments" className="custom-link">
              <h2 className="title-limit">Mozartpay and Fireblocks: Building the Future of Secure Blockchain Payments              </h2>
            </a>
            <p>Reimagining cross-border payments by harnessing the transformative power of blockchain technology...</p>
            <BlogAuthor name="Mozart Team" date={new Date('2025-10-28T19:01:27Z')} />
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default ArticleList;

// Add the following CSS to your blog.css file