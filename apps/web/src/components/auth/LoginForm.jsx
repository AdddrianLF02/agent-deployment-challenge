import { useState } from 'react';
import { Input } from '../shared/Input.jsx';
import { Button } from '../shared/Button.jsx';
import { AuthLayout } from './AuthLayout.jsx';

export function LoginForm({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    
    setLoading(true);
    setError(null);
    try {
      await onLogin({ username, password });
    } catch (err) {
      setError(err.message || 'Error de autenticación. Verifica tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <h2 className="auth-title">Terminal Access</h2>
      <p className="auth-subtitle">Identifícate para abrir el canal de comunicación con el agente.</p>
      
      {error ? <div className="auth-error">{error}</div> : null}
      
      <form className="auth-form" onSubmit={handleSubmit}>
        <div>
          <label className="auth-label" htmlFor="username">Username</label>
          <Input 
            id="username"
            type="text" 
            placeholder="Introduce tu identificador..." 
            value={username} 
            onChange={e => setUsername(e.target.value)} 
            required 
            disabled={loading}
          />
        </div>
        <div>
          <label className="auth-label" htmlFor="password">Password</label>
          <Input 
            id="password"
            type="password" 
            placeholder="Clave de acceso..." 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            required 
            disabled={loading}
          />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? 'Verificando...' : 'Autenticar'}
        </Button>
      </form>
    </AuthLayout>
  );
}
