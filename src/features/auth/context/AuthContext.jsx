import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    // Recuperar el usuario de localStorage al cargar la aplicación
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const navigate = useNavigate();

  const login = async ({ email, password }) => {
    try {
      const response = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ correo: email, contrasena: password }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Obtener permisos desde la API rol_permiso_privilegio
        const permissionsSet = new Set();
        
        try {
          const rolPermisoResponse = await fetch(`http://localhost:3000/api/rol_permiso_privilegio?rolId=${data.usuario.rol._id}`);
          const rolPermisoData = await rolPermisoResponse.json();
          
          // Mapeo de módulos del backend a permisos del frontend
          const moduloToPermission = {
            'beneficiarios': 'venta-servicios-beneficiarios',
            'asistencia': 'venta-servicios-asistencia',
            'pagos': 'venta-servicios-pagos',
            'programacion_de_clases': 'servicios-musicales-programacion-clases',
            'profesores': 'servicios-musicales-profesores',
            'programacion_de_profesores': 'servicios-musicales-programacion-profesores',
            'cursos_matriculas': 'servicios-musicales-cursos-matriculas',
            'aulas': 'servicios-musicales-aulas',
            'clases': 'servicios-musicales-clases',
            'clientes': 'venta-servicios-clientes',
            'venta_matriculas': 'venta-servicios-venta-matriculas',
            'venta_cursos': 'venta-servicios-venta-cursos',
            'roles': 'configuracion-roles',
            'usuarios': 'configuracion-usuarios',
            'dashboard': 'dashboard'
          };
          
          // Procesar permisos desde la API
          if (rolPermisoData && Array.isArray(rolPermisoData)) {
            rolPermisoData.forEach(relacion => {
              const permisoNombre = relacion.permisoId?.nombre || relacion.permiso?.nombre;
              if (permisoNombre && moduloToPermission[permisoNombre]) {
                permissionsSet.add(moduloToPermission[permisoNombre]);
              }
            });
          }
        } catch (error) {
          console.error('Error al obtener permisos desde API:', error);
          // Fallback a permisos por defecto según el rol
        }
        
        // Agregar permisos específicos según el rol como fallback
        const rolNombre = data.usuario.rol.nombre.toLowerCase();
        
        if (rolNombre === 'administrador') {
          // Administradores tienen acceso a todo
          permissionsSet.add('*');
          permissionsSet.add('dashboard');
        } else if (rolNombre === 'profesor') {
          // Profesores pueden ver módulos relacionados con servicios musicales (excepto cursos-matriculas)
          permissionsSet.add('servicios-musicales-profesores');
          permissionsSet.add('servicios-musicales-programacion-profesores');
          permissionsSet.add('servicios-musicales-aulas');
          permissionsSet.add('servicios-musicales-clases');
          permissionsSet.add('venta-servicios-asistencia');
        } else if (rolNombre === 'beneficiario') {
          // Beneficiarios solo pueden ver programación de clases
          permissionsSet.add('servicios-musicales-programacion-clases');
        } else if (rolNombre === 'cliente') {
          // Clientes solo pueden ver pagos y beneficiarios
          permissionsSet.add('venta-servicios-pagos');
          permissionsSet.add('venta-servicios-beneficiarios');
        }
        
        const permissions = Array.from(permissionsSet);
        
        const userData = {
          id: data.usuario.id,
          name: `${data.usuario.nombre} ${data.usuario.apellido}`,
          email: data.usuario.correo,
          documento: data.usuario.documento,
          tipo_de_documento: data.usuario.tipo_de_documento,
          role: data.usuario.rol.nombre.toLowerCase(),
          currentRole: data.usuario.rol, // Rol actual completo
          allRoles: data.usuario.todosLosRoles || [data.usuario.rol], // Todos los roles disponibles
          permissions: permissions,
          permisos: data.usuario.permisos, // Guardar permisos originales del backend
          token: data.token
        };
        
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', data.token);
        
        // Redirigir según los permisos del usuario
        const getDefaultRoute = (permissions, role) => {
          if (role === 'cliente') {
            return '/venta-servicios/beneficiarios';
          } else if (role === 'profesor') {
            return '/servicios-musicales/programacion-profesores';
          } else if (role === 'beneficiario') {
            return '/servicios-musicales/programacion-clases';
          } else if (permissions.includes('dashboard') || permissions.includes('*')) {
            return '/dashboard';
          } else {
            return '/servicios-musicales/programacion-clases'; // Ruta por defecto
          }
        };
        
        navigate(getDefaultRoute(permissions, rolNombre));
      } else {
        alert(data.message || 'Credenciales incorrectas');
      }
    } catch (error) {
       console.error('Error en login:', error);
       alert('Error de conexión. Verifique que el servidor esté funcionando.');
     }
   };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user'); // Eliminar el usuario de localStorage
    navigate('/'); // Redirigir al Home después del logout
  };

  const updateUser = (userData) => {
    try {
      // Mantener los permisos y roles existentes si no se proporcionan nuevos
      const existingUser = JSON.parse(localStorage.getItem('user')) || user;
      const updatedData = {
        ...existingUser,
        ...userData,
        // Mantener la contraseña existente si no se modifica
        password: userData.password === '****' ? existingUser.password : userData.password,
        // Asegurar que se mantengan los permisos y roles
        permissions: userData.permissions || existingUser.permissions,
        role: userData.role || existingUser.role
      };

      // Actualizar el usuario en el estado y localStorage
      setUser(updatedData);
      localStorage.setItem('user', JSON.stringify(updatedData));
      alert('Datos guardados exitosamente'); // Agregar alerta de éxito
      
      // Redirigir según los permisos del usuario
      const getDefaultRoute = (permissions, role) => {
        if (role === 'cliente') {
          return '/venta-servicios/beneficiarios';
        } else if (role === 'profesor') {
          return '/servicios-musicales/programacion-profesores';
        } else if (role === 'beneficiario') {
          return '/servicios-musicales/programacion-clases';
        } else if (permissions.includes('dashboard') || permissions.includes('*')) {
          return '/dashboard';
        } else {
          return '/servicios-musicales/programacion-clases'; // Ruta por defecto
        }
      };
      
      navigate(getDefaultRoute(updatedData.permissions, updatedData.role));
      return true;
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      throw new Error('Error al actualizar los datos del usuario');
    }
  };

  const changeRole = async (newRoleId) => {
    try {
      const response = await fetch('http://localhost:3000/api/login/cambiar-rol', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ 
          usuarioId: user.id, 
          nuevoRolId: newRoleId 
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Obtener permisos desde la API rol_permiso_privilegio
        const permissionsSet = new Set();
        
        try {
          const rolPermisoResponse = await fetch(`http://localhost:3000/api/rol_permiso_privilegio?rolId=${data.usuario.rol._id}`);
          const rolPermisoData = await rolPermisoResponse.json();
          
          // Mapeo de módulos del backend a permisos del frontend
          const moduloToPermission = {
            'beneficiarios': 'venta-servicios-beneficiarios',
            'asistencia': 'venta-servicios-asistencia',
            'pagos': 'venta-servicios-pagos',
            'programacion_de_clases': 'servicios-musicales-programacion-clases',
            'profesores': 'servicios-musicales-profesores',
            'programacion_de_profesores': 'servicios-musicales-programacion-profesores',
            'cursos_matriculas': 'servicios-musicales-cursos-matriculas',
            'aulas': 'servicios-musicales-aulas',
            'clases': 'servicios-musicales-clases',
            'clientes': 'venta-servicios-clientes',
            'venta_matriculas': 'venta-servicios-venta-matriculas',
            'venta_cursos': 'venta-servicios-venta-cursos',
            'roles': 'configuracion-roles',
            'usuarios': 'configuracion-usuarios',
            'dashboard': 'dashboard'
          };
          
          // Procesar permisos desde la API
          if (rolPermisoData && Array.isArray(rolPermisoData)) {
            rolPermisoData.forEach(relacion => {
              const permisoNombre = relacion.permisoId?.nombre || relacion.permiso?.nombre;
              if (permisoNombre && moduloToPermission[permisoNombre]) {
                permissionsSet.add(moduloToPermission[permisoNombre]);
              }
            });
          }
        } catch (error) {
          console.error('Error al obtener permisos desde API:', error);
          // Fallback a permisos por defecto según el rol
        }
        
        // Agregar permisos específicos según el rol como fallback
        const rolNombre = data.usuario.rol.nombre.toLowerCase();
        
        if (rolNombre === 'administrador') {
          // Administradores tienen acceso a todo
          permissionsSet.add('*');
          permissionsSet.add('dashboard');
        } else if (rolNombre === 'profesor') {
          // Profesores pueden ver módulos relacionados con servicios musicales (excepto cursos-matriculas)
          permissionsSet.add('servicios-musicales-profesores');
          permissionsSet.add('servicios-musicales-programacion-profesores');
          permissionsSet.add('servicios-musicales-aulas');
          permissionsSet.add('servicios-musicales-clases');
          permissionsSet.add('venta-servicios-asistencia');
        } else if (rolNombre === 'beneficiario') {
          // Beneficiarios solo pueden ver programación de clases
          permissionsSet.add('servicios-musicales-programacion-clases');
        } else if (rolNombre === 'cliente') {
          // Clientes solo pueden ver pagos y beneficiarios
          permissionsSet.add('venta-servicios-pagos');
          permissionsSet.add('venta-servicios-beneficiarios');
        }
        
        const permissions = Array.from(permissionsSet);
        
        const updatedUserData = {
          ...user,
          role: data.usuario.rol.nombre.toLowerCase(),
          currentRole: data.usuario.rol,
          allRoles: data.usuario.todosLosRoles,
          permissions: permissions,
          permisos: data.usuario.permisos,
          token: data.token
        };
        
        setUser(updatedUserData);
        localStorage.setItem('user', JSON.stringify(updatedUserData));
        localStorage.setItem('token', data.token);
        
        // Redirigir según los permisos del nuevo rol
        const getDefaultRoute = (permissions, role) => {
          if (role === 'cliente') {
            return '/venta-servicios/beneficiarios';
          } else if (role === 'profesor') {
            return '/servicios-musicales/programacion-profesores';
          } else if (role === 'beneficiario') {
            return '/servicios-musicales/programacion-clases';
          } else if (permissions.includes('dashboard') || permissions.includes('*')) {
            return '/dashboard';
          } else {
            return '/servicios-musicales/programacion-clases'; // Ruta por defecto
          }
        };
        
        navigate(getDefaultRoute(permissions, rolNombre));
        
        return { success: true, message: 'Rol cambiado exitosamente' };
      } else {
        return { success: false, message: data.message || 'Error al cambiar de rol' };
      }
    } catch (error) {
      console.error('Error en cambio de rol:', error);
      return { success: false, message: 'Error de conexión al cambiar de rol' };
    }
  };

  useEffect(() => {
    // Sincronizar el estado del usuario con localStorage solo al montar el componente
    const storedUser = localStorage.getItem('user');
    if (storedUser && !user) {
      setUser(JSON.parse(storedUser));
    }
  }, []); // Remover 'user' de las dependencias para evitar bucle infinito

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, changeRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}