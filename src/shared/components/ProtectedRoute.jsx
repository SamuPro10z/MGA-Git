import { useAuth } from '../../features/auth/context/AuthContext';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, requiredPermissions = [] }) => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Si no hay permisos requeridos, permitir acceso
  if (requiredPermissions.length === 0) {
    return children;
  }

  // Para administradores, permitir acceso a todo
  if (user.role === 'administrador') {
    return children;
  }

  // Verificar permisos del usuario
  const userPermissions = user?.permissions || [];
  
  const hasAllPermissions = requiredPermissions.every(permission =>
    userPermissions.includes(permission) || userPermissions.includes('*')
  );

  if (!hasAllPermissions) {
    // Redirigir según el rol del usuario
    let redirectPath = '/';
    
    if (user.role === 'cliente') {
      redirectPath = '/venta-servicios/beneficiarios';
    } else if (user.role === 'profesor') {
      redirectPath = '/servicios-musicales/programacion-profesores';
    } else if (user.role === 'beneficiario') {
      redirectPath = '/servicios-musicales/programacion-clases';
    }
    
    return <Navigate to={redirectPath} replace state={{ error: 'Acceso no autorizado' }} />;
  }

  return children;
};

export default ProtectedRoute;