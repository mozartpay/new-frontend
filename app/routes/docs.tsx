import { Link } from '@remix-run/react';
import '../styles/global.css';

export default function HeroDocs() {
    return (
        <div className="container">
            <h1 className="header">
                Docs (in progress)
            </h1>
            <p className="paragraph">
                Welcome to our Technical Documentation, in order for you to interact with our API, you will need an API Key which we will provide, and which you will need to include during your requests. If you would like to have your own API key, please send us an E-mail to: admin@mozartpay.com
            </p>
        </div>
    );
}