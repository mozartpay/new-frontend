import { motion } from 'framer-motion';
import { useState } from 'react';
import "../styles/global.css";
import "../styles/aboutus.css"; // Make sure you import the CSS file

export default function CallToActionWithAnnotation() {
    const [isNightMode, setIsNightMode] = useState(false);

    const toggleNightMode = () => {
        setIsNightMode(!isNightMode);
    };

    const container = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05,
            },
        },
    };

    const letter = {
        hidden: { opacity: 0, y: 50 },
        visible: { opacity: 1, y: 0 },
    };

    const heading = "Contact";
    const text = "For any inquiries, feedback, or support regarding our services, feel free to get in touch with us at the details below. Our dedicated team is here to assist you with any questions or concerns.";

    return (
        <div className={`container ${isNightMode ? 'night-mode' : 'day-mode'}`}>
            <button onClick={toggleNightMode} className="toggle-button">
                {isNightMode ? 'Day Light' : 'Night Light'}
            </button>
            <div className={`stack ${isNightMode ? 'night-mode' : 'day-mode'}`}>
                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="visible"
                    className="heading"
                >
                    {heading.split("").map((char, index) => (
                        <motion.span key={index} variants={letter}>
                            {char}
                        </motion.span>
                    ))}
                </motion.div>

                <motion.p
                    variants={container}
                    initial="hidden"
                    animate="visible"
                    className="text"
                >
                    {text}
                    <br />
                    OG Technologies EU
                    <br />
                    Widerhofergasse 6 / 12, 1090
                    <br />
                    Vienna, Austria
                    <br />
                    <a href="mailto:admin@mozartpay.com">admin@mozartpay.com</a>
                </motion.p>
            </div>
        </div>
    );
}
