import { useState, useEffect } from 'react';
import axios from 'axios';
import { GenericList2 } from "../../../shared/components/genericlist2";
import { DetailModal } from '../../../shared/components/DetailModal';
import { StatusButton } from '../../../shared/components/StatusButton';
import { FormModal } from '../../../shared/components/formModal2';
import { SuccessAlert } from '../../../shared/components/SuccessAlert';
import { ConfirmationDialog } from '../../../shared/components/ConfirmationDialog';
import { useAuth } from '../../../features/auth/context/AuthContext';

const Aulas = () => {
  const { user } = useAuth(); // Obtener el usuario autenticado
  const [aulas, setAulas] = useState([]);
  const [selectedAula, setSelectedAula] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [alert, setAlert] = useState({
    open: false,
    message: ''
  });
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [aulaToDelete, setAulaToDelete] = useState(null);
  
  // Verificar si el usuario es profesor
  const isProfesor = user?.role === 'profesor';

  const columns = [
    { id: 'numeroAula', label: 'Número de Aula' },
    { id: 'capacidad', label: 'Capacidad' },
    { 
      id: 'estado', 
      label: 'Estado',
      render: (value, row) => (
        <StatusButton 
          active={value === 'Activo'} 
          onClick={() => handleToggleStatus(row._id)}
        />
      ),
      // Configuración del filtro para esta columna CORREGIDA
      filter: {
        type: 'select',
        options: [
          { value: 'Todos', label: 'Todos' },
          { value: 'Activo', label: 'Activos' },
          { value: 'Inactivo', label: 'Inactivos' }
        ],
        defaultValue: 'Todos'
      }
    }
  ];

  const detailFields = [
    { id: 'numeroAula', label: 'Número de Aula' },
    { id: 'capacidad', label: 'Capacidad', render: (value) => `${value} beneficiarios` },
    { id: 'estado', label: 'Estado', render: (value) => <StatusButton active={value === 'Activo'} /> }
  ];

  const formFields = [
    { 
      id: 'numeroAula', 
      label: 'Número de Aula', 
      type: 'text',
      required: true,
      disabled: isEditing
    },
    { 
      id: 'capacidad', 
      label: 'Capacidad', 
      type: 'number',
      required: true,
      min: 1
    },
    { 
      id: 'estado', 
      label: 'Estado', 
      type: 'switch',
      defaultValue: 'Activo'
    }
  ];

  const fetchAulas = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/aulas');
      setAulas(response.data);
    } catch (error) {
      console.error('Error fetching aulas:', error);
      setAlert({
        open: true,
        message: 'Error al cargar las aulas'
      });
    }
  };

  useEffect(() => {
    fetchAulas();
  }, []);

  const handleToggleStatus = async (aulaId) => {
    try {
      const aula = aulas.find(a => a._id === aulaId);
      if (!aula) return;

      const nuevoEstado = aula.estado === 'Activo' ? 'Inactivo' : 'Activo';
      
      // Actualizar primero en el frontend
      setAulas(prevAulas => prevAulas.map(a => 
        a._id === aulaId ? { ...a, estado: nuevoEstado } : a
      ));

      // Luego actualizar en la API
      await axios.put(`http://localhost:3000/api/aulas/${aulaId}`, { 
        ...aula,
        estado: nuevoEstado 
      });

      setAlert({
        open: true,
        message: 'Estado actualizado correctamente'
      });
    } catch (error) {
      // Si hay error, revertimos el cambio en el frontend
      setAulas(prevAulas => prevAulas.map(a => 
        a._id === aulaId ? { ...a, estado: aula.estado } : a
      ));
      
      console.error('Error updating aula status:', error);
      setAlert({
        open: true,
        message: 'Error al actualizar el estado'
      });
    }
  };

  const handleDelete = (aula) => {
    // Profesores no pueden eliminar aulas
    if (isProfesor) {
      setAlert({
        open: true,
        message: 'Los profesores no pueden eliminar aulas'
      });
      return;
    }
    
    setAulaToDelete(aula);
    setConfirmDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!aulaToDelete) return;

    try {
      await axios.delete(`http://localhost:3000/api/aulas/${aulaToDelete._id}`);
      await fetchAulas(); // Recargar los datos después de eliminar
      setAlert({
        open: true,
        message: 'Aula eliminada correctamente'
      });
    } catch (error) {
      console.error('Error deleting aula:', error);
      setAlert({
        open: true,
        message: 'Error al eliminar el aula'
      });
    } finally {
      setConfirmDialogOpen(false);
      setAulaToDelete(null);
    }
  };

  const handleSubmit = async (formData) => {
    try {
      const dataToSend = {
        numeroAula: formData.numeroAula,
        capacidad: parseInt(formData.capacidad),
        estado: formData.estado || 'Activo'
      };

      if (isEditing && selectedAula?._id) {
        await axios.put(`http://localhost:3000/api/aulas/${selectedAula._id}`, dataToSend);
        setAlert({
          open: true,
          message: 'Aula editada correctamente'
        });
      } else {
        await axios.post('http://localhost:3000/api/aulas', dataToSend);
        setAlert({
          open: true,
          message: 'Aula creada correctamente'
        });
      }
      await fetchAulas(); // Recargar los datos después de crear/editar
      handleCloseForm();
    } catch (error) {
      console.error('Error saving aula:', error);
      setAlert({
        open: true,
        message: 'Error al guardar el aula'
      });
    }
  };

  const handleCreate = () => {
    // Profesores no pueden crear aulas
    if (isProfesor) {
      setAlert({
        open: true,
        message: 'Los profesores no pueden crear aulas'
      });
      return;
    }
    
    setIsEditing(false);
    setSelectedAula(null);
    setFormModalOpen(true);
  };

  const handleEdit = (aula) => {
    // Profesores no pueden editar aulas
    if (isProfesor) {
      setAlert({
        open: true,
        message: 'Los profesores no pueden editar aulas'
      });
      return;
    }
    
    setIsEditing(true);
    setSelectedAula(aula);
    setFormModalOpen(true);
  };

  const handleView = (aula) => {
    setSelectedAula(aula);
    setDetailModalOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailModalOpen(false);
    setSelectedAula(null);
  };

  const handleCloseForm = () => {
    setFormModalOpen(false);
    setSelectedAula(null);
    setIsEditing(false);
  };

  const handleCloseAlert = () => {
    setAlert({
      ...alert,
      open: false
    });
  };

  return (
    <>
      <GenericList2
        data={aulas}
        columns={columns}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreate={isProfesor ? null : handleCreate}
        onView={handleView}
        title="Gestión de Aulas"
        enableFilters={true}
        showEditButton={!isProfesor}
        showDeleteButton={!isProfesor}
        showViewButton={true}
      />
      
      <DetailModal
        title={`Detalle del Aula ${selectedAula?.numeroAula}`}
        data={selectedAula}
        fields={detailFields}
        open={detailModalOpen}
        onClose={handleCloseDetail}
        sx={{
          borderRadius: "8px",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
          overflow: "hidden",
          width: "40%", // Reducir el ancho
          height: "50%", // Reducir la altura
          maxHeight: "50vh" // Ajustar la altura máxima
        }}
      />

      <FormModal
        title={isEditing ? 'Editar Aula' : 'Crear Nueva Aula'}
        fields={formFields}
        initialData={selectedAula}
        open={formModalOpen}
        onClose={handleCloseForm}
        onSubmit={handleSubmit}
      />
      
      <ConfirmationDialog
        open={confirmDialogOpen}
        title="Confirmar Eliminación"
        content={`¿Está seguro que desea eliminar el aula ${aulaToDelete?.numeroAula}?`}
        onConfirm={handleConfirmDelete}
        onClose={() => setConfirmDialogOpen(false)}
        confirmButtonColor="#f44336"
        confirmButtonText="Eliminar"
      />
      
      <SuccessAlert
        open={alert.open}
        message={alert.message}
        onClose={handleCloseAlert}
      />
    </>
  );
};

export default Aulas;