import { useState } from 'react';
import { useKeycloak } from '@react-keycloak/web';

export function useAuth() {
  const { keycloak, initialized } = useKeycloak();
  const [nonStudentToken, setNonStudentToken] = useState<string | null>(() => localStorage.getItem('non-student-auth-token'));
  const [nonStudentEmail, setNonStudentEmail] = useState<string | null>(() => localStorage.getItem('non-student-auth-email'));

  const isAuthenticated = !!keycloak.authenticated || !!nonStudentToken;
  const userEmail = keycloak.authenticated ? (keycloak.tokenParsed?.email || keycloak.tokenParsed?.preferred_username) : nonStudentEmail;
  const userName = keycloak.authenticated ? (keycloak.tokenParsed?.given_name || keycloak.tokenParsed?.preferred_username) : nonStudentEmail?.split('@')[0];
  const token = keycloak.authenticated ? keycloak.token : nonStudentToken;

  const logout = () => {
    if (keycloak.authenticated) {
      keycloak.logout();
    } else {
      localStorage.removeItem('non-student-auth-token');
      localStorage.removeItem('non-student-auth-email');
      setNonStudentToken(null);
      setNonStudentEmail(null);
    }
  };

  const loginNonStudent = (token: string, email: string) => {
    localStorage.setItem('non-student-auth-token', token);
    localStorage.setItem('non-student-auth-email', email);
    setNonStudentToken(token);
    setNonStudentEmail(email);
  };

  return { isAuthenticated, userEmail, userName, token, logout, loginNonStudent, isKeycloak: !!keycloak.authenticated, initialized };
}
