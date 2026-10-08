import { useEffect, useState } from "react"
// import ThemeToggle from "../ui/theme-toggle";
import { NavLink, useNavigate } from "react-router-dom"
import { useAuth } from "../../context/useAuth"
import { authClient, getNeonAccessToken } from "../../context/neonAuth"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../ui/card"

function Header() {
  const navigate = useNavigate();
  // const [darkMode, setDarkMode] = useState(() =>
  //   document.documentElement.classList.contains("dark")
  // );
  const [isLoginCardOpen, setIsLoginCardOpen] = useState(false);
  const [isSignUpCardOpen ,setIsSignUpCardOpen] = useState(false)
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', password: '' });
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [authError, setAuthError] = useState('');
  const { isLoggedIn, login, logout } = useAuth();

  useEffect(() => {
    const openLogin = () => setIsLoginCardOpen(true)
    window.addEventListener('aura:open-login', openLogin)

    return () => window.removeEventListener('aura:open-login', openLogin)
  }, [])

  async function handleGoogleSignIn() {
    setAuthError('');
    try {
      const result = await authClient.signIn.social({ provider: 'google', callbackURL: `${window.location.origin}/home` });
      if (result.error) setAuthError(result.error.message || 'Google sign in failed.');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Google sign in failed.');
    }
  }

  // useEffect(() => {
  //   document.documentElement.classList.toggle("dark", darkMode);
  // }, [darkMode]);

  const handleLogout = async () => {
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error(result.error.message);
      logout();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Logout failed.');
    }
  };

  return (
    <>
      <header className="w-full mt-0 px-6 py-4 flex items-center border-b border-white/10 text-white bg-transparent">
        <div className="flex-shrink-0 text-pink-500 font-bold text-2xl">
          <NavLink to="/home">Aura Skincare</NavLink>
        </div>

        <nav className="flex-1 flex justify-center gap-12">
          
        </nav>

        <div className="flex items-center gap-3 flex-shrink-0">
          {/* <ThemeToggle /> */}
          {isLoggedIn ? (
            <button
              className="px-4 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition font-bold"
              onClick={() => setIsLogoutConfirmOpen(true)}
            >
              Logout
            </button>
          ) : (
            <>
              <button
                className="px-4 py-1 border bg-pink-500 text-white rounded hover:bg-pink-500/20 transition font-bold"
                onClick={() => setIsLoginCardOpen(true)}
              >
                Login
              </button>
              <button className="px-4 py-1 bg-pink-500 text-white rounded hover:bg-pink-600 transition font-bold"
                onClick={() => setIsSignUpCardOpen(true)}>
                Sign Up
              </button>
            </>
          )}
        </div>
      </header>

      
      {isLoginCardOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96 bg-slate-800/95 backdrop-blur-sm border border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Login</CardTitle>
              <CardDescription className="text-gray-300">Enter your credentials to continue</CardDescription>
            </CardHeader>
            <CardContent>
              {authError && <p role="alert" className="mb-3 text-sm text-red-300">{authError}</p>}
              <input
                value={loginForm.email}
                onChange={e => setLoginForm({...loginForm, email: e.target.value})}
                type="email"
                placeholder="Email"
                className="w-full border border-white/20 bg-slate-700/50 text-white placeholder-gray-400 px-3 py-2 rounded mb-3 focus:border-blue-400 focus:outline-none"
              />
              <input
                value={loginForm.password}
                onChange={e => setLoginForm({...loginForm, password: e.target.value})}
                type="password"
                placeholder="Password"
                className="w-full border border-white/20 bg-slate-700/50 text-white placeholder-gray-400 px-3 py-2 rounded focus:border-blue-400 focus:outline-none"
              />

                <div className="flex items-center gap-3 mb-4 mt-4">
                  <div className="flex-1 h-px bg-white/20"></div>
                  <span className="text-gray-400 text-xs">or Sign In with Google</span>
                  <div className="flex-1 h-px bg-white/20"></div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="flex items-center justify-center gap-3 w-full border border-white/20 bg-white text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition mb-4 font-medium text-sm"
                >
                  <svg width="18" height="18" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    <path fill="none" d="M0 0h48v48H0z"/>
                  </svg>
                  Continue with Google
                </button>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <button
                className="px-4 py-1 rounded bg-slate-600 text-white hover:bg-slate-500 transition"
                onClick={() => setIsLoginCardOpen(false)}
              >
                Cancel
              </button>
              <button className="px-4 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 transition" onClick={async () => {
                try {
                  setAuthError('');
                  const result = await authClient.signIn.email(loginForm);
                  if (result.error) throw new Error(result.error.message);
                  if (!result.data?.user) throw new Error('Login succeeded without returning a user.');
                  if (!await getNeonAccessToken()) {
                    throw new Error('Your sign-in succeeded, but Neon did not provide an API access token. Please check your Neon Auth session and try again.');
                  }
                  login({
                    id: result.data.user.id,
                    name: result.data.user.name,
                    userName: result.data.user.name,
                    email: result.data.user.email,
                  });
                  setIsLoginCardOpen(false);
                  setLoginForm({ email: '', password: '' });
                  navigate('/home');
                } catch (err) {
                  setAuthError(err instanceof Error ? err.message : 'Login failed.');
                }
              }}>
                Login
              </button>
            </CardFooter>
          </Card>
        </div>
      )}
      {isLogoutConfirmOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96 bg-slate-800/95 backdrop-blur-sm border border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Confirm Logout</CardTitle>
              <CardDescription className="text-gray-300">Are you sure you want to logout?</CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-end gap-2">
              <button
                className="px-4 py-1 rounded bg-slate-600 text-white hover:bg-slate-500 transition"
                onClick={() => setIsLogoutConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-1 rounded bg-red-600 text-white hover:bg-red-700 transition"
                onClick={() => {
                  setIsLogoutConfirmOpen(false);
                  handleLogout();
                }}
              >
                Logout
              </button>
            </CardFooter>
          </Card>
        </div>
      )}
      {isSignUpCardOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96 bg-slate-800/95 backdrop-blur-sm border border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Register</CardTitle>
              <CardDescription className="text-gray-300">Create your account to get started</CardDescription>
            </CardHeader>
            <CardContent>
                {authError && <p role="alert" className="mb-3 text-sm text-red-300">{authError}</p>}
                {verificationEmail ? (
                  <>
                    <p className="mb-3 text-sm text-gray-300">Enter the verification code sent to {verificationEmail}.</p>
                    <input
                      value={verificationCode}
                      onChange={e => setVerificationCode(e.target.value)}
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="Email verification code"
                      className="w-full border border-white/20 bg-slate-700/50 text-white placeholder-gray-400 px-3 py-2 rounded mb-3 focus:border-blue-400 focus:outline-none"
                    />
                  </>
                ) : (
                  <>
                    <input
                      value={registerForm.name}
                      onChange={e => setRegisterForm({...registerForm, name: e.target.value})}
                      type="text"
                      placeholder="Name"
                      className="w-full border border-white/20 bg-slate-700/50 text-white placeholder-gray-400 px-3 py-2 rounded mb-3 focus:border-blue-400 focus:outline-none"
                    />

                <input
                value={registerForm.email}
                onChange={e => setRegisterForm({...registerForm, email: e.target.value})}
                type="email"
                placeholder="Email"
                className="w-full border border-white/20 bg-slate-700/50 text-white placeholder-gray-400 px-3 py-2 rounded mb-3 focus:border-blue-400 focus:outline-none"
              />
              <input
                value={registerForm.password}
                onChange={e => setRegisterForm({...registerForm, password: e.target.value})}
                type="password"
                placeholder="Set Password"
                className="w-full border border-white/20 bg-slate-700/50 text-white placeholder-gray-400 px-3 py-2 rounded focus:border-blue-400 focus:outline-none"
              />
      
                <div className="flex items-center gap-3 mb-4 mt-4">
                  <div className="flex-1 h-px bg-white/20"></div>
                  <span className="text-gray-400 text-xs">or Sign Up with Google</span>
                  <div className="flex-1 h-px bg-white/20"></div>
                </div>

              
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="flex items-center justify-center gap-3 w-full border border-white/20 bg-white text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition mb-4 font-medium text-sm"
                >
                  <svg width="18" height="18" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    <path fill="none" d="M0 0h48v48H0z"/>
                  </svg>
                  Continue with Google
                </button>
                </>
              )}
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <button
                className="px-4 py-1 rounded bg-slate-600 text-white hover:bg-slate-500 transition"
                onClick={() => setIsSignUpCardOpen(false)}
              >
                Cancel
              </button>
              <button className="px-4 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 transition" onClick={async () => {
                try {
                  setAuthError('');
                  if (verificationEmail) {
                    const verified = await authClient.emailOtp.verifyEmail({
                      email: verificationEmail,
                      otp: verificationCode,
                    });
                    if (verified.error) throw new Error(verified.error.message);
                    const session = await authClient.getSession();
                    if (session.error) throw new Error(session.error.message);
                    if (!session.data?.user || !session.data.session?.token) {
                      throw new Error('Verification succeeded, but no authenticated session token was returned.');
                    }
                    login({
                      id: session.data.user.id,
                      name: session.data.user.name,
                      userName: session.data.user.name,
                      email: session.data.user.email,
                    });
                    setVerificationEmail('');
                    setVerificationCode('');
                    setIsSignUpCardOpen(false);
                    setRegisterForm({ name: '', email: '', password: '' });
                    navigate('/home');
                  } else {
                    const created = await authClient.signUp.email(registerForm);
                    if (created.error) throw new Error(created.error.message);
                    const sent = await authClient.emailOtp.sendVerificationOtp({
                      email: registerForm.email,
                      type: 'email-verification',
                    });
                    if (sent.error) throw new Error(sent.error.message);
                    setVerificationEmail(registerForm.email);
                  }
                } catch (err) {
                  setAuthError(err instanceof Error ? err.message : 'Registration failed.');
                }
              }}>
                {verificationEmail ? 'Verify email' : 'Sign Up'}
              </button>
            </CardFooter>
          </Card>
        </div>
      )
      }
    </>
  );
}

export default Header;