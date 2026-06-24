import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../api/client';
import './Auth.css';

const Login = () => {
  const { login, register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const [view, setView] = useState('login'); // 'login' | 'register'

  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Register fields
  const [fullName, setFullName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerBusy, setRegisterBusy] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');

  if (isAuthenticated) return <Navigate to={from} replace />;

  const switchTo = (next) => {
    setLoginError('');
    setRegisterError('');
    setRegisterSuccess('');
    setView(next);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');

    if (!email || !password) {
      setLoginError('Please enter email and password.');
      return;
    }

    setLoginBusy(true);
    try {
      await login({ email: email.trim(), password });
      navigate(from, { replace: true });
    } catch (err) {
      setLoginError(errorMessage(err));
    } finally {
      setLoginBusy(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegisterError('');
    setRegisterSuccess('');

    if (!fullName || !registerEmail || !registerPassword) {
      setRegisterError('Please fill all register fields.');
      return;
    }

    setRegisterBusy(true);
    try {
      await register({
        full_name: fullName,
        email: registerEmail.trim(),
        password: registerPassword,
        role: 'candidate',
      });
      // register() auto-logs in on success.
      navigate(from, { replace: true });
    } catch (err) {
      setRegisterError(errorMessage(err));
    } finally {
      setRegisterBusy(false);
    }
  };

  if (view === 'register') {
    return (
      <div className="auth-page">
        <div className="blob blob1"></div>
        <div className="blob blob2"></div>

        <div className="auth-container">
          <div className="left">
            <div className="left-content">
              <h1>
                Join,
                <br />
                TalentIQ!
              </h1>
              <p>Apply to jobs, scan your CV and take IQ tests — all in one place.</p>
              <button className="register-btn" type="button" onClick={() => switchTo('login')}>
                Back to Login
              </button>
            </div>
          </div>

          <div className="right">
            <div className="logo">TalentIQ</div>
            <h1 className="login-title">Register</h1>
            <p className="subtitle">Create your applicant account</p>

            <form onSubmit={handleRegister}>
              <div className="input-box">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
                <i className="fa-solid fa-user"></i>
              </div>

              <div className="input-box">
                <input
                  type="email"
                  placeholder="Email"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                />
                <i className="fa-solid fa-envelope"></i>
              </div>

              <div className="input-box">
                <input
                  type="password"
                  placeholder="Password"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                />
                <i className="fa-solid fa-lock"></i>
              </div>

              {registerError && (
                <p className="auth-msg" style={{ color: 'red' }}>{registerError}</p>
              )}
              {registerSuccess && (
                <p className="auth-msg" style={{ color: 'green' }}>{registerSuccess}</p>
              )}

              <button className="login-btn" type="submit" disabled={registerBusy}>
                {registerBusy ? 'Creating Account...' : 'Register'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="blob blob1"></div>
      <div className="blob blob2"></div>

      <div className="particle" style={{ left: '10%', bottom: '-20px', animationDelay: '0s' }}></div>
      <div className="particle" style={{ left: '30%', bottom: '-20px', animationDelay: '2s' }}></div>
      <div className="particle" style={{ left: '70%', bottom: '-20px', animationDelay: '4s' }}></div>
      <div className="particle" style={{ left: '85%', bottom: '-20px', animationDelay: '1s' }}></div>

      <div className="auth-container">
        <div className="left">
          <div className="left-content">
            <h1>
              <br />
              Welcome!
            </h1>
            <p>Start your AI-powered job search with TalentIQ Hub.</p>
            <button className="register-btn" type="button" onClick={() => switchTo('register')}>
              Create Account
            </button>
          </div>
        </div>

        <div className="right">
          <div className="logo">TalentIQ</div>
          <h1 className="login-title">Login</h1>
          <p className="subtitle">Access your applicant dashboard</p>

          <form onSubmit={handleLogin}>
            <div className="input-box">
              <input
                type="text"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <i className="fa-solid fa-user"></i>
            </div>

            <div className="input-box">
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <i className="fa-solid fa-lock"></i>
            </div>

            {loginError && (
              <p className="auth-msg" style={{ color: 'red' }}>{loginError}</p>
            )}

            <button className="login-btn" type="submit" disabled={loginBusy}>
              {loginBusy ? 'Authenticating...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
