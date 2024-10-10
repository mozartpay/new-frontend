import { Link } from '@remix-run/react';
import '../styles/global.css';

export default function HeroDocs() {
    return (
        <div className="container">
            <h1 className="header">
                Docs (Private beta)
            </h1>
            <p className="paragraph">
                Welcome to our Technical Documentation, in order for you to interact with our API, you will need an API Key which we will provide, and which you will need to include during your requests. If you would like to have your own API key, please send us an E-mail to: admin@mozartpay.com
            </p>
            <span className="highlight">
                JS SDK for the MozartPay API implementation
            </span>
            <Link to='https://github.com/mozartpay/js-mozartpay-sdk' className="link">
                https://github.com/mozartpay/js-mozartpay-sdk
            </Link>
            <span className="highlight">
                MozartPay REST API
            </span>
            <Link to='https://documenter.getpostman.com/view/9974590/TVzVjGAT' className="link">
                https://documenter.getpostman.com/view/9974590/TVzVjGAT
            </Link>
        </div>
    );
}