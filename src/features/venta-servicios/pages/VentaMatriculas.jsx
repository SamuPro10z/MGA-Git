"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { GenericList } from "../../../shared/components/GenericList"
import { DetailModal } from "../../../shared/components/DetailModal"
import { VentaMatriculasForm } from "../components/VentaMatriculasForm"
import {
  Box,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
} from "@mui/material"
import { ConfirmationDialog } from "../../../shared/components/ConfirmationDialog"
import { createBeneficiarioUser } from "../../../shared/services/beneficiarioService"
import { useAlertVentas } from "../context/AlertVentasContext"

const API_BASE_URL = "http://localhost:3000/api"

const VentaMatriculas = () => {
  const { showSuccess, showError } = useAlertVentas();
  const [ventas, setVentas] = useState([])
  const [ventasOriginales, setVentasOriginales] = useState([])
  const [clientes, setClientes] = useState([])
  const [beneficiarios, setBeneficiarios] = useState([])
  const [matriculas, setMatriculas] = useState([])
  const [cursosDisponibles, setCursosDisponibles] = useState([])
  const [selectedVenta, setSelectedVenta] = useState(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)

  // Estados para modales de confirmación
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [anularModalOpen, setAnularModalOpen] = useState(false)
  const [ventaToDelete, setVentaToDelete] = useState(null)
  const [ventaToAnular, setVentaToAnular] = useState(null)
  const [motivoAnulacion, setMotivoAnulacion] = useState("")

  // Cargar datos iniciales
  useEffect(() => {
    const loadData = async () => {
      await fetchBeneficiarios() // Esto ahora carga beneficiarios Y matrículas
      await fetchMatriculasData()
      await fetchCursos()
    }
    loadData()
  }, [])

  // Filtrar ventas por estado
  useEffect(() => {
    setVentas(ventasOriginales)
  }, [ventasOriginales])

  // Traer beneficiarios y clientes
  const fetchBeneficiarios = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/beneficiarios`)
      const beneficiariosData = response.data
      setBeneficiarios(beneficiariosData)

      // Clientes: los que tienen "cliente" en clienteId o clienteId === _id
      const clientesFiltrados = beneficiariosData.filter(
        (b) =>
          (typeof b.clienteId === "string" && b.clienteId.toLowerCase().includes("cliente")) ||
          String(b.clienteId) === String(b._id),
      )
      setClientes(clientesFiltrados)

      // Cargar matrículas después de tener los beneficiarios
      await fetchMatriculas(beneficiariosData)
    } catch (error) {
      console.error("Error al cargar los beneficiarios:", error)
    }
  }

  // Traer datos de matrículas disponibles
  const fetchMatriculasData = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/matriculas`)
      setMatriculas(response.data)
    } catch (error) {
      console.error("Error al cargar las matrículas:", error)
    }
  }

  // Traer solo ventas tipo matricula (actualizada para usar beneficiarios)
  const fetchMatriculas = async (beneficiariosData = null) => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_BASE_URL}/ventas`)

      // Solo matriculas con populate
      const soloMatriculas = response.data.filter((v) => v.tipo === "matricula")

      console.log("Matrículas filtradas:", soloMatriculas.length)

      // Usar los beneficiarios pasados como parámetro o los del estado
      const beneficiariosParaUsar = beneficiariosData || beneficiarios
      console.log("Beneficiarios disponibles:", beneficiariosParaUsar.length)

      // Formatear datos para la tabla usando la función de formato
      const matriculasFormateadas = soloMatriculas.map((venta) => {
        // Obtener beneficiario (ya viene populado)
        const beneficiario = venta.beneficiarioId

        // Determinar cliente y beneficiario
        let clienteNombre = "No especificado"
        let beneficiarioNombre = "No especificado"

        if (beneficiario) {
          beneficiarioNombre = `${beneficiario.nombre || ""} ${beneficiario.apellido || ""}`.trim()

          // Lógica para determinar el cliente
          const clienteId = beneficiario.clienteId
          const beneficiarioId = beneficiario._id

          console.log(`Procesando venta ${venta.codigoVenta}:`, {
            beneficiarioId,
            clienteId,
            beneficiarioNombre,
          })

          if (String(clienteId) === String(beneficiarioId)) {
            // El beneficiario es su propio cliente
            clienteNombre = beneficiarioNombre
            console.log(`${venta.codigoVenta}: Beneficiario es su propio cliente`)
          } else {
            // Buscar el cliente real en la lista de beneficiarios usando el clienteId
            const clienteObj = beneficiariosParaUsar.find((b) => String(b._id) === String(clienteId))
            if (clienteObj) {
              clienteNombre = `${clienteObj.nombre || ""} ${clienteObj.apellido || ""}`.trim()
              console.log(`${venta.codigoVenta}: Cliente encontrado:`, clienteNombre)
            } else {
              // Si no se encuentra el cliente, mostrar el ID
              clienteNombre = `Cliente ID: ${clienteId}`
              console.log(`${venta.codigoVenta}: Cliente no encontrado con ID:`, clienteId)
            }
          }
        }

        return {
          id: venta.codigoVenta || venta._id,
          codigoVenta: venta.codigoVenta || "",
          beneficiario: beneficiarioNombre,
          cliente: clienteNombre,
          fechaInicio: new Date(venta.fechaInicio).toLocaleDateString(),
          fechaFin: new Date(venta.fechaFin).toLocaleDateString(),
          valorTotal: venta.valor_total || 0,
          estado: venta.estado,
          motivoAnulacion: venta.motivoAnulacion,
          fechaCreacion: venta.createdAt ? new Date(venta.createdAt).toLocaleDateString() : "",
          _original: venta,
          beneficiarioObj: beneficiario,
        }
      })

      console.log("Matrículas formateadas:", matriculasFormateadas)

      setVentasOriginales(matriculasFormateadas)
      setVentas(matriculasFormateadas)
    } catch (error) {
      console.error("Error al cargar las matrículas:", error)
    } finally {
      setLoading(false)
    }
  }

  // Traer cursos
  const fetchCursos = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/cursos`)
      setCursosDisponibles(response.data)
    } catch (error) {
      console.error("Error al cargar los cursos:", error)
    }
  }

  // Columnas para la tabla (igual que VentaCursos)
  const columns = [
    { id: "codigoVenta", label: "Código Venta" },
    { id: "beneficiario", label: "Beneficiario" },
    { id: "cliente", label: "Cliente" },
    { id: "fechaInicio", label: "Fecha Inicio" },
    { id: "fechaFin", label: "Fecha Fin" },
    {
      id: "valorTotal",
      label: "Valor Total",
      render: (value) => `$${value?.toLocaleString() || 0}`,
    },
    {
      id: "estado",
      label: "Estado",
      filterOptions: [
        { value: "vigente", label: "Vigente" },
        { value: "anulada", label: "Anulada" },
      ],
      render: (value, row) => (
        <Chip
          label={value === "vigente" ? "Vigente" : "Anulada"}
          color={value === "vigente" ? "success" : "error"}
          variant="outlined"
          size="small"
        />
      ),
    },
  ]

  // Campos para el modal de detalle
  const detailFields = [
    { id: "cliente", label: "Cliente" },
    { id: "beneficiario", label: "Beneficiario" },
    { id: "fechaInicio", label: "Fecha Inicio" },
    { id: "fechaFin", label: "Fecha Fin" },
    {
      id: "valorTotal",
      label: "Valor Total",
      render: (value) => `$${value?.toLocaleString() || 0}`,
    },
    {
      id: "estado",
      label: "Estado",
      render: (value) => (
        <Chip
          label={value === "vigente" ? "Vigente" : "Anulada"}
          color={value === "vigente" ? "success" : "error"}
          variant="filled"
          size="small"
        />
      ),
    },
    { id: "codigoVenta", label: "Código Venta" },
    { id: "motivoAnulacion", label: "Motivo Anulación" },
    { id: "fechaCreacion", label: "Fecha Creación" },
  ]

  // Handlers
  const handleCreate = () => {
    setIsEditing(false)
    setSelectedVenta(null)
    setFormModalOpen(true)
  }

  const handleEdit = async (venta) => {
    try {
      console.log("=== INICIANDO EDICIÓN ===")
      console.log("Venta recibida:", venta)

      // Buscar la venta original que corresponde al registro formateado
      const ventaOriginal = ventasOriginales.find((v) => v.id === venta.id)
      console.log("Venta original encontrada:", ventaOriginal)

      if (!ventaOriginal) {
        console.error("No se encontró la venta original")
        return
      }

      // Obtener los datos sin populate para edición
      console.log("Obteniendo datos de la API para ID:", ventaOriginal._original._id)
      const response = await axios.get(`${API_BASE_URL}/ventas/${ventaOriginal._original._id}`)
      const ventaData = response.data
      console.log("Datos de venta desde API:", ventaData)

      // Buscar beneficiario completo usando el beneficiarioId de la venta
      const beneficiarioCompleto = beneficiarios.find((b) => String(b._id) === String(ventaData.beneficiarioId))
      console.log("Beneficiario completo encontrado:", beneficiarioCompleto)

      // Si no se encuentra en beneficiarios, intentar con la data populada original
      const beneficiarioFallback =
        ventaOriginal.beneficiarioObj ||
        (ventaData.beneficiarioId
          ? {
              _id: ventaData.beneficiarioId,
              nombre: ventaOriginal.beneficiario.split(" ")[0] || "",
              apellido: ventaOriginal.beneficiario.split(" ").slice(1).join(" ") || "",
            }
          : null)

      const beneficiarioParaEditar = beneficiarioCompleto || beneficiarioFallback
      console.log("Beneficiario para editar:", beneficiarioParaEditar)

      const matriculaAsociada = matriculas.find((m) => String(m._id) === String(ventaData.matriculaId))
      console.log("Matrícula asociada encontrada:", matriculaAsociada)

      const ventaParaEditar = {
        ...ventaOriginal,
        _original: ventaData,
        beneficiarioObj: beneficiarioParaEditar,
        matriculaObj: matriculaAsociada,
        // Convertir fechas al formato correcto
        fechaInicio: ventaData.fechaInicio,
        fechaFin: ventaData.fechaFin,
        valorTotal: ventaData.valor_total,
        descuento: ventaData.descuento || 0,
      }

      console.log("=== DATOS FINALES PARA EDITAR ===")
      console.log("ventaParaEditar:", ventaParaEditar)

      setIsEditing(true)
      setSelectedVenta(ventaParaEditar)
      setFormModalOpen(true)
    } catch (error) {
      console.error("Error al cargar datos para editar:", error)
      showError("Error al cargar los datos para editar")
    }
  }

  const handleDelete = (venta) => {
    // Buscar la venta original
    const ventaOriginal = ventasOriginales.find((v) => v.id === venta.id)
    setVentaToDelete(ventaOriginal)
    setDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (ventaToDelete) {
      try {
        await axios.delete(`${API_BASE_URL}/ventas/${ventaToDelete._original._id}`)
        fetchMatriculas()
        setDeleteModalOpen(false)
        setVentaToDelete(null)
        showSuccess("Matrícula eliminada exitosamente")
      } catch (error) {
        console.error("Error al eliminar la matrícula:", error)
        showError("Error al eliminar la matrícula")
      }
    }
  }

  const handleView = (venta) => {
    // Buscar la venta original que corresponde al registro formateado
    const ventaOriginal = ventasOriginales.find((v) => v.id === venta.id)
    setSelectedVenta(ventaOriginal)
    setDetailModalOpen(true)
  }

  const handleCloseDetail = () => {
    setDetailModalOpen(false)
    setSelectedVenta(null)
  }

  const handleCloseForm = () => {
    setFormModalOpen(false)
    setSelectedVenta(null)
    setIsEditing(false)
  }

  // NUEVA LÓGICA COMPLETA PARA handleSubmit
  const handleSubmit = async (formData) => {
    try {
      const { matricula, beneficiario, usuarioBeneficiario, cliente, clienteEsBeneficiario, curso, isEditing } =
        formData
      
      console.log("=== DATOS DEL FORMULARIO ===");
      console.log("Matricula del form:", JSON.stringify(matricula, null, 2));
      console.log("============================");
      let usuarioId = null
      let beneficiarioId = null
      let clienteId = null

      console.log("Iniciando proceso de creación/edición:", { isEditing, clienteEsBeneficiario })

      // 1. Si estamos editando, usar IDs existentes y actualizar
      if (isEditing && selectedVenta?.beneficiarioObj?._id) {
        beneficiarioId = selectedVenta.beneficiarioObj._id
        console.log("Modo edición - usando beneficiario existente:", beneficiarioId)

        // Actualizar beneficiario existente
        await axios.put(`${API_BASE_URL}/beneficiarios/${beneficiarioId}`, {
          nombre: beneficiario.nombre,
          apellido: beneficiario.apellido,
          tipo_de_documento: beneficiario.tipoDocumento,
          numero_de_documento: beneficiario.numeroDocumento,
          telefono: beneficiario.telefono,
          direccion: beneficiario.direccion,
          fechaDeNacimiento: beneficiario.fechaNacimiento,
          correo: beneficiario.correo,
          estado: beneficiario.estado,
        })
        console.log("Beneficiario actualizado")
      } else {
        // 2. MODO CREACIÓN - Buscar si ya existen o crear nuevos

        // 2.1 Buscar cliente existente sin matrícula activa
        let clienteExistente = null
        if (!clienteEsBeneficiario) {
          clienteExistente = clientes.find(
            (c) =>
              c.numero_de_documento === cliente.numeroDocumento &&
              !ventasOriginales.some((venta) => {
                if (venta._original.tipo !== "matricula" || venta._original.estado !== "vigente") return false
                const beneficiarioVenta = beneficiarios.find(
                  (b) => String(b._id) === String(venta._original.beneficiarioId),
                )
                if (!beneficiarioVenta) return false
                const clienteIdStr = String(beneficiarioVenta.clienteId)
                return clienteIdStr === String(c._id)
              }),
          )

          if (clienteExistente) {
            console.log("Cliente existente encontrado:", clienteExistente._id)
            clienteId = clienteExistente._id
          } else {
            // Crear nuevo cliente
            console.log("Creando nuevo cliente")
            console.log("Creando nuevo cliente con datos:", {
              nombre: cliente.nombre,
              apellido: cliente.apellido,
              numero_de_documento: cliente.numeroDocumento,
              clienteId: "cliente"
            });
            const clienteResponse = await axios.post(`${API_BASE_URL}/beneficiarios`, {
              nombre: cliente.nombre,
              apellido: cliente.apellido,
              tipo_de_documento: cliente.tipoDocumento,
              numero_de_documento: cliente.numeroDocumento,
              telefono: cliente.telefono,
              direccion: cliente.direccion,
              fechaDeNacimiento: cliente.fechaNacimiento,
              estado: cliente.estado,
              clienteId: "cliente", // Marcador para identificar como cliente
            })
            clienteId = clienteResponse.data._id
            console.log("Cliente creado exitosamente con ID:", clienteId)
          }
        }

        // 2.2 Buscar beneficiario existente sin matrícula activa
        const beneficiarioExistente = beneficiarios.find(
          (b) =>
            b.numero_de_documento === beneficiario.numeroDocumento &&
            !ventasOriginales.some((venta) => {
              return (
                venta._original.tipo === "matricula" &&
                venta._original.estado === "vigente" &&
                String(venta._original.beneficiarioId) === String(b._id)
              )
            }),
        )

        if (beneficiarioExistente) {
          console.log("Beneficiario existente encontrado:", beneficiarioExistente._id)
          beneficiarioId = beneficiarioExistente._id

          // Si el cliente quiere ser su propio beneficiario, actualizar clienteId
          if (clienteEsBeneficiario) {
            await axios.put(`${API_BASE_URL}/beneficiarios/${beneficiarioId}`, {
              ...beneficiarioExistente,
              clienteId: beneficiarioId, // El beneficiario es su propio cliente
            })
            console.log("Beneficiario configurado como su propio cliente")
          } else if (clienteId) {
            // Actualizar con el clienteId correcto
            await axios.put(`${API_BASE_URL}/beneficiarios/${beneficiarioId}`, {
              ...beneficiarioExistente,
              clienteId: clienteId,
            })
            console.log("Beneficiario actualizado con clienteId:", clienteId)
          }
        } else {
          // 2.3 Crear nuevo usuario para el beneficiario y asociar rol Beneficiario
          console.log("Creando nuevo usuario:", usuarioBeneficiario);
          let usuarioId = null;
          let usuarioHasRolId = null;
          try {
            // 1. Crear usuario
            const usuarioResponse = await axios.post(`${API_BASE_URL}/usuarios`, {
              nombre: usuarioBeneficiario.nombre,
              apellido: usuarioBeneficiario.apellido,
              correo: usuarioBeneficiario.email,
              contrasena: usuarioBeneficiario.contrasena,
              documento: usuarioBeneficiario.documento,
              tipo_de_documento: beneficiario.tipoDocumento,
              rol: 'usuario', // Rol por defecto válido según el modelo
              estado: true,
            });
            usuarioId = usuarioResponse.data._id;
            console.log("Usuario creado exitosamente:", usuarioId);

            // 2. Obtener el rol 'Beneficiario'
            const rolesResponse = await axios.get(`${API_BASE_URL}/roles`);
            const roles = Array.isArray(rolesResponse.data.roles)
              ? rolesResponse.data.roles
              : rolesResponse.data;
            const beneficiarioRol = roles.find((rol) => rol.nombre.toLowerCase() === "beneficiario");
            if (!beneficiarioRol) throw new Error('Rol "Beneficiario" no encontrado');

            // 3. Crear relación usuario-rol
            const usuarioHasRolResponse = await axios.post(`${API_BASE_URL}/usuarios_has_rol`, {
              usuarioId: usuarioId,
              rolId: beneficiarioRol._id,
            });
            // La respuesta es un array, tomamos el primero
            usuarioHasRolId = Array.isArray(usuarioHasRolResponse.data)
              ? usuarioHasRolResponse.data[0]._id
              : usuarioHasRolResponse.data._id;
            console.log("usuario_has_rolId:", usuarioHasRolId);

            // 4. Crear beneficiario
            let beneficiarioPayload = {
              nombre: beneficiario.nombre,
              apellido: beneficiario.apellido,
              tipo_de_documento: beneficiario.tipoDocumento,
              numero_de_documento: beneficiario.numeroDocumento,
              telefono: beneficiario.telefono,
              direccion: beneficiario.direccion,
              fechaDeNacimiento: beneficiario.fechaNacimiento,
              correo: beneficiario.correo,
              estado: beneficiario.estado,
              usuario_has_rolId: usuarioHasRolId,
              clienteId: clienteEsBeneficiario ? "cliente" : clienteId, // Usar el clienteId real del cliente creado
            };
            
            console.log("=== PAYLOAD PARA CREAR BENEFICIARIO ===");
            console.log("BeneficiarioPayload:", JSON.stringify(beneficiarioPayload, null, 2));
            console.log("clienteEsBeneficiario:", clienteEsBeneficiario);
            console.log("clienteId:", clienteId);
            console.log("usuarioHasRolId:", usuarioHasRolId);
            console.log("=======================================");
            
            const beneficiarioResponse = await axios.post(`${API_BASE_URL}/beneficiarios`, beneficiarioPayload);
            beneficiarioId = beneficiarioResponse.data._id;
            console.log("Beneficiario creado:", beneficiarioId);

            // Si el beneficiario es su propio cliente, actualizar clienteId a su propio _id
            if (clienteEsBeneficiario) {
              await axios.put(`${API_BASE_URL}/beneficiarios/${beneficiarioId}`, {
                clienteId: beneficiarioId,
              });
              console.log("Beneficiario configurado como su propio cliente");
            } else {
              console.log("Beneficiario vinculado al cliente:", clienteId);
              console.log("=== RELACIÓN CLIENTE-BENEFICIARIO ===");
              console.log("Cliente ID:", clienteId, "(solo cliente)");
              console.log("Beneficiario ID:", beneficiarioId, "(beneficiario del cliente)");
              console.log("=====================================");
            }
          } catch (error) {
            console.error("Error al crear usuario/beneficiario:", error.response?.data);
            console.error("Error completo:", error);
            console.error("Response data:", error.response?.data);
            console.error("Response status:", error.response?.status);
            throw new Error("Error al crear el usuario/beneficiario: " + (error.response?.data?.message || "Error desconocido"));
          }
        }
      }

      // 3. Usar la matrícula seleccionada
      const matriculaSeleccionada = matriculas.find((m) => m._id === matricula.matriculaId)
      if (!matriculaSeleccionada) {
        throw new Error("No se encontró la matrícula seleccionada")
      }
      
      console.log("=== MATRÍCULA SELECCIONADA ===");
      console.log("MatriculaSeleccionada:", JSON.stringify(matriculaSeleccionada, null, 2));
      console.log("FechaInicio:", matriculaSeleccionada.fechaInicio);
      console.log("FechaFin:", matriculaSeleccionada.fechaFin);
      console.log("ValorMatricula:", matriculaSeleccionada.valorMatricula);
      console.log("==============================");

      // 4. Crear o actualizar venta tipo "matricula" con contador
      const fechaInicio = new Date(); // Hoy
      const fechaFin = new Date();
      fechaFin.setFullYear(fechaFin.getFullYear() + 1); // Un año después
      
      const ventaMatricula = {
        tipo: "matricula",
        fechaInicio: fechaInicio,
        fechaFin: fechaFin,
        estado: matricula.estado || "vigente",
        valor_total: Number.parseFloat(matriculaSeleccionada.valorMatricula || matricula.valorFinal || 0),
        beneficiarioId: beneficiarioId,
        matriculaId: matriculaSeleccionada._id,
        observaciones: matricula.observaciones,
        descuento: Number.parseFloat(matricula.descuento || 0),
      };
      
      console.log("=== FECHAS DE MATRÍCULA ===");
      console.log("Fecha Inicio:", fechaInicio.toISOString());
      console.log("Fecha Fin:", fechaFin.toISOString());
      console.log("===========================");

      if (isEditing && selectedVenta?._original?._id) {
        console.log("Actualizando venta existente:", selectedVenta._original._id);
        await axios.put(`${API_BASE_URL}/ventas/${selectedVenta._original._id}`, ventaMatricula);
      } else {
        console.log("Creando nueva venta de matrícula");
        // Obtener y aumentar contador de matrículas
        const contadorMatriculaResponse = await axios.patch(`${API_BASE_URL}/contador/matricula/incrementar`);
        const consecutivoMatricula = contadorMatriculaResponse.data.contador.seq;
        const codigoMatricula = `MA${consecutivoMatricula.toString().padStart(4, "0")}`;
        ventaMatricula.consecutivo = consecutivoMatricula;
        ventaMatricula.codigoVenta = codigoMatricula;
        
        console.log("=== DATOS A ENVIAR PARA VENTA MATRÍCULA ===");
        console.log("VentaMatricula:", JSON.stringify(ventaMatricula, null, 2));
        console.log("Consecutivo:", consecutivoMatricula);
        console.log("Código:", codigoMatricula);
        console.log("===========================================");
        
        const matriculaVentaResponse = await axios.post(`${API_BASE_URL}/ventas`, ventaMatricula);
        console.log("Venta de matrícula creada:", matriculaVentaResponse.data._id);

        // 5. Crear venta tipo "curso" si hay curso seleccionado
        if (curso && curso.curso) {
          console.log("Creando venta de curso");
          const cursoObj = cursosDisponibles.find((c) => c.nombre === curso.curso);
          // Obtener y aumentar contador de cursos
          const contadorCursoResponse = await axios.patch(`${API_BASE_URL}/contador/curso/incrementar`);
          const consecutivoCurso = contadorCursoResponse.data.contador.seq;
          const codigoCurso = `CU${consecutivoCurso.toString().padStart(4, "0")}`;
          const ventaCurso = {
            tipo: "curso",
            fechaInicio: matricula.fechaInicio,
            fechaFin: matricula.fechaFin,
            beneficiarioId: beneficiarioId,
            cursoId: cursoObj ? cursoObj._id : undefined,
            matriculaId: matriculaSeleccionada._id,
            numero_de_clases: Number.parseInt(curso.clases),
            valor_total: Number.parseFloat(curso.valorTotal),
            estado: "vigente",
            consecutivo: consecutivoCurso,
            codigoVenta: codigoCurso,
          };
          const cursoVentaResponse = await axios.post(`${API_BASE_URL}/ventas`, ventaCurso);
          console.log("Venta de curso creada:", cursoVentaResponse.data._id);
        }
      }

      // Actualizar listas locales
      await fetchBeneficiarios()
      await fetchMatriculas()
      handleCloseForm()
      showSuccess("Matrícula guardada exitosamente")
    } catch (error) {
      console.error("Error al guardar la matrícula:", error)

      let errorMessage = "Error desconocido"
      if (error.message) {
        errorMessage = error.message
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message
      }

      showError("Error al guardar la matrícula: " + errorMessage)
    }
  }

  const handleAnular = (venta) => {
    // Buscar la venta original
    const ventaOriginal = ventasOriginales.find((v) => v.id === venta.id)
    setVentaToAnular(ventaOriginal)
    setMotivoAnulacion("")
    setAnularModalOpen(true)
  }

  const confirmAnular = async () => {
    if (!motivoAnulacion.trim()) {
      showError("Se requiere un motivo para anular la matrícula")
      return
    }

    if (ventaToAnular) {
      try {
        console.log("ID de la venta a anular:", ventaToAnular._original._id)
        console.log("Motivo de anulación:", motivoAnulacion.trim())

        // Obtener la venta completa primero para tener todos los datos
        const ventaResponse = await axios.get(`${API_BASE_URL}/ventas/${ventaToAnular._original._id}`)
        const ventaCompleta = ventaResponse.data
        
        // Actualizar solo los campos necesarios manteniendo el resto
        const datosActualizados = {
          ...ventaCompleta,
          estado: "anulada",
          motivoAnulacion: motivoAnulacion.trim()
        }
        
        console.log("Datos a enviar para actualización:", datosActualizados)
        
        // Usar PUT con todos los datos para evitar validaciones
        await axios.put(`${API_BASE_URL}/ventas/${ventaToAnular._original._id}`, datosActualizados)

        fetchMatriculas()
        setAnularModalOpen(false)
        setVentaToAnular(null)
        setMotivoAnulacion("")
        showSuccess("Matrícula anulada exitosamente")
      } catch (error) {
        console.error("Error al anular la matrícula:", error)
        console.error("Detalles del error:", error.response?.data)
        console.error("Error completo:", error)
        console.error("Response status:", error.response?.status)
        console.error("Response headers:", error.response?.headers)
        showError("Error al anular la matrícula: " + (error.response?.data?.message || "Error desconocido"))
      }
    }
  }

  return (
    <>
      <GenericList
        data={ventas}
        columns={columns}
        
        onDelete={handleDelete}
        onCreate={handleCreate}
        onView={handleView}
        title="Gestión de Matrículas"
        loading={loading}
        onCancel={handleAnular}
      />

      <DetailModal
        title={`Detalle de Matrícula: ${selectedVenta?.beneficiario}`}
        data={selectedVenta}
        fields={detailFields}
        open={detailModalOpen}
        onClose={handleCloseDetail}
        extraContent={
          selectedVenta?.beneficiarioObj && (
            <Box sx={{ mt: 2 }}>
              <strong>Datos del Beneficiario:</strong>
              <div>
                Nombre: {selectedVenta.beneficiarioObj.nombre} {selectedVenta.beneficiarioObj.apellido}
              </div>
              <div>
                Documento: {selectedVenta.beneficiarioObj.tipo_de_documento}{" "}
                {selectedVenta.beneficiarioObj.numero_de_documento}
              </div>
              <div>Teléfono: {selectedVenta.beneficiarioObj.telefono}</div>
              <div>Dirección: {selectedVenta.beneficiarioObj.direccion}</div>
              <div>
                Fecha de Nacimiento: {new Date(selectedVenta.beneficiarioObj.fechaDeNacimiento).toLocaleDateString()}
              </div>
            </Box>
          )
        }
      />

      <VentaMatriculasForm
        open={formModalOpen}
        onClose={handleCloseForm}
        onSubmit={handleSubmit}
        isEditing={isEditing}
        clientes={clientes}
        beneficiarios={beneficiarios}
        matriculas={matriculas}
        cursosDisponibles={cursosDisponibles}
        setClientes={setClientes}
        setBeneficiarios={setBeneficiarios}
        initialData={selectedVenta}
        ventasOriginales={ventasOriginales}
      />

      {/* Modal de confirmación para eliminar */}
      <ConfirmationDialog
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Confirmar Eliminación"
        content={`¿Está seguro de que desea eliminar la matrícula de ${ventaToDelete?.beneficiario}? Esta acción no se puede deshacer.`}
        confirmButtonText="Eliminar"
        confirmButtonColor="#f44336"
        cancelButtonText="Cancelar"
      />

      {/* Modal de confirmación para anular */}
      <Dialog open={anularModalOpen} onClose={() => setAnularModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Anular Matrícula</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            ¿Está seguro de que desea anular la matrícula de {ventaToAnular?.beneficiario}?
          </Typography>
          <TextField
            fullWidth
            label="Motivo de anulación"
            multiline
            rows={3}
            value={motivoAnulacion}
            onChange={(e) => setMotivoAnulacion(e.target.value)}
            placeholder="Ingrese el motivo por el cual se anula esta matrícula..."
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAnularModalOpen(false)}>Cancelar</Button>
          <Button onClick={confirmAnular} color="warning" variant="contained" disabled={!motivoAnulacion.trim()}>
            Anular Matrícula
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default VentaMatriculas
