import { useNavigate } from 'react-router-dom';

function Landing() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>AI Bible Translator</h1>
      <p>Translate the Bible into Indian languages with AI help.</p>
      <button onClick={() => navigate('/register')}>Get Started</button>
    </div>
  );
}

export default Landing;
