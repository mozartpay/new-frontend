import { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [
    {
      title: "Imprint",
      description: "This is the imprint page of Mozart."
    }
  ];
};

export default function Imprint() {
  return (
    <div style={{ maxWidth: '48rem', margin: '0 auto', padding: '2.5rem 1rem', textAlign: 'center' }}>
      <h1 style={{ fontWeight: 600, fontSize: '3rem', lineHeight: '1.1' }}>
        Imprint
      </h1>
      <p style={{ color: '#718096' }}>
        Mozart is developed by OG Technologies EU
        <br />
        Represented by: Olvis E. Gil Ríos
        <br />
        E-mail: olvisgil@mozartpay.com
        <br />
        <br />
        Address: Widerhofergasse 6 / 12,
        <br />
        1090 Vienna, Austria
        <br />
        Website: <a href="https://www.mozartpay.com" target="_blank" rel="noopener noreferrer">https://www.mozartpay.com</a>
        <br />
        Business type
        <br />
        Services in automatic data processing and information technology (IT services), Vienna Chamber of Commerce.
      </p>
    </div>
  );
}