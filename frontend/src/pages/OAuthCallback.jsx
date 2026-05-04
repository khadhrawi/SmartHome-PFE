import { useContext, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const { loginWithOAuthData } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    const rawData = searchParams.get('data');
    const oauthError = searchParams.get('oauthError');

    if (oauthError || !rawData) {
      navigate('/auth/choose?oauthError=1');
      return;
    }

    try {
      const data = JSON.parse(decodeURIComponent(rawData));
      loginWithOAuthData(data);

      // Route by onboarding state
      if (!data.houseCode) {
        navigate('/onboarding');
      } else {
        navigate('/dashboard');
      }
    } catch {
      navigate('/auth/choose?oauthError=1');
    }
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 size={36} className="animate-spin text-sky-300" />
    </div>
  );
};

export default OAuthCallback;
